// ============================================================
// PRODUCIR — el director de producción del canal.
// Un solo comando convierte un guion.json en un mp4 terminado:
//
//   npm run producir -- guiones/0000-presuncion-de-inocencia.json
//
// La voz de cada escena se decide por este orden de prioridad:
//   1. TU GRABACIÓN, si existe en
//      guiones/<expediente>/audio/escena-NN.mp3 (o .m4a o .wav)
//      → se normaliza su volumen con ffmpeg para que todas las
//        escenas suenen parejas, y su duración manda.
//   2. Si no hay grabación y se pasó --sin-voz → duración estimada
//      por el texto (borrador mudo, sin conexión).
//   3. Si no hay grabación → edge-tts (borrador audible para
//      previsualizar el video antes de grabarte).
//
// Además, en cada ejecución se escribe
// guiones/<expediente>/locucion.txt con los textos numerados,
// listo para leerlo mientras te grabas.
//
// Opciones:
//   --sin-voz     no llama a edge-tts (las grabaciones SÍ se usan)
//   --sin-render  prepara audios y datos pero no renderiza
// ============================================================
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFile} from 'music-metadata';
import {FPS, PALABRAS_POR_SEGUNDO, VELOCIDAD, VOZ} from './config.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// Normalización de volumen (estándar de sonoridad para voz en YouTube):
// -16 LUFS de sonoridad media, picos como mucho a -1.5 dB.
const FILTRO_VOLUMEN = 'loudnorm=I=-16:TP=-1.5:LRA=11';

// ---------- 0. Leer argumentos ----------
const argumentos = process.argv.slice(2);
const rutaGuion = argumentos.find((a) => !a.startsWith('--'));
const sinVoz = argumentos.includes('--sin-voz');
const sinRender = argumentos.includes('--sin-render');

if (!rutaGuion) {
  console.error('Uso: npm run producir -- guiones/<archivo>.json [--sin-voz] [--sin-render]');
  process.exit(1);
}

// ---------- 1. Leer y validar el guion ----------
const guion = JSON.parse(readFileSync(resolve(rutaGuion), 'utf8'));
for (const campo of ['expediente', 'titulo', 'escenas']) {
  if (!guion[campo]) {
    console.error(`El guion no tiene el campo obligatorio "${campo}".`);
    process.exit(1);
  }
}
guion.escenas.forEach((escena, i) => {
  if (!escena.voz || !escena.visual?.tipo) {
    console.error(`La escena ${i + 1} necesita "voz" y "visual" con su "tipo".`);
    process.exit(1);
  }
});
console.log(`\n📁 Expediente nº ${guion.expediente} — «${guion.titulo}» (${guion.escenas.length} escenas)\n`);

// Carpetas de trabajo:
//  - guiones/<exp>/audio/  → AQUÍ van tus grabaciones (se sube a git)
//  - public/audio/<exp>/   → audios procesados que usa el video (generado)
const carpetaGrabaciones = join(RAIZ, 'guiones', guion.expediente, 'audio');
const carpetaAudio = join(RAIZ, 'public', 'audio', guion.expediente);
mkdirSync(carpetaGrabaciones, {recursive: true});
mkdirSync(carpetaAudio, {recursive: true});
// El .gitkeep hace que la carpeta de grabaciones exista también en GitHub,
// para poder navegar hasta ella y subir los audios desde la web.
const gitkeep = join(carpetaGrabaciones, '.gitkeep');
if (!existsSync(gitkeep)) {
  writeFileSync(gitkeep, '');
}

// Busca la grabación de una escena, probando las extensiones admitidas.
const buscarGrabacion = (nombre) => {
  for (const extension of ['.mp3', '.m4a', '.wav']) {
    const ruta = join(carpetaGrabaciones, `${nombre}${extension}`);
    if (existsSync(ruta)) {
      return ruta;
    }
  }
  return null;
};

// ---------- 2. Texto de locución para grabarse ----------
// Se escribe SIEMPRE, así al crear un guion nuevo ya tienes el texto
// numerado que leer, con el nombre de archivo que debe llevar cada toma.
const lineasLocucion = [
  `EXPEDIENTE Nº ${guion.expediente} — ${guion.titulo}`,
  '',
  'Graba cada escena en un audio aparte y guárdalo como:',
  `  guiones/${guion.expediente}/audio/escena-NN.mp3   (o .m4a o .wav)`,
  '',
  '────────────────────────────────────────',
];
guion.escenas.forEach((escena, i) => {
  const nombre = `escena-${String(i + 1).padStart(2, '0')}`;
  lineasLocucion.push('', `▶ ${nombre}  (visual: ${escena.visual.tipo})`, '', `  ${escena.voz}`, '', '────────────────────────────────────────');
});
const rutaLocucion = join(RAIZ, 'guiones', guion.expediente, 'locucion.txt');
writeFileSync(rutaLocucion, lineasLocucion.join('\n') + '\n');
console.log(`📝 Texto de locución: guiones/${guion.expediente}/locucion.txt\n`);

// ---------- 3. Audio y duración de cada escena ----------
const escenasConTiempos = [];
let conVozPropia = 0;
for (let i = 0; i < guion.escenas.length; i++) {
  const escena = guion.escenas[i];
  const nombre = `escena-${String(i + 1).padStart(2, '0')}`;
  const grabacion = buscarGrabacion(nombre);

  if (grabacion) {
    // --- Tu voz: normalizar volumen y medir ---
    conVozPropia++;
    const destino = join(carpetaAudio, `${nombre}.wav`);
    const archivoHuella = join(carpetaAudio, `${nombre}.huella`);
    // La huella resume el CONTENIDO de la grabación: si vuelves a subir
    // el mismo archivo no se reprocesa; si lo cambias, sí.
    const huella = createHash('sha256')
      .update(FILTRO_VOLUMEN)
      .update(readFileSync(grabacion))
      .digest('hex');
    const yaProcesado =
      existsSync(destino) && existsSync(archivoHuella) && readFileSync(archivoHuella, 'utf8') === huella;
    if (!yaProcesado) {
      process.stdout.write(`  ${nombre}: tu voz, normalizando volumen… `);
      execFileSync(
        'npx',
        ['remotion', 'ffmpeg', '-i', grabacion, '-af', FILTRO_VOLUMEN, '-ar', '48000', '-y', destino],
        {cwd: RAIZ, stdio: ['ignore', 'ignore', 'ignore']}
      );
      writeFileSync(archivoHuella, huella);
    } else {
      process.stdout.write(`  ${nombre}: tu voz (ya procesada). `);
    }
    const metadatos = await parseFile(destino);
    const segundos = metadatos.format.duration ?? 0;
    console.log(`${segundos.toFixed(2)}s`);
    escenasConTiempos.push({
      ...escena,
      duracionFrames: Math.round(segundos * FPS),
      audio: `audio/${guion.expediente}/${nombre}.wav`,
    });
    continue;
  }

  if (sinVoz) {
    // --- Borrador mudo: estimamos la duración contando palabras ---
    const palabras = escena.voz.trim().split(/\s+/).length;
    const segundos = palabras / PALABRAS_POR_SEGUNDO + 0.4;
    escenasConTiempos.push({...escena, duracionFrames: Math.round(segundos * FPS)});
    console.log(`  ${nombre}: ~${segundos.toFixed(1)}s (estimado, sin voz)`);
    continue;
  }

  // --- Borrador con voz sintética (edge-tts) ---
  const mp3 = join(carpetaAudio, `${nombre}.mp3`);
  const archivoHuella = join(carpetaAudio, `${nombre}.huella`);
  const huella = createHash('sha256').update(`${VOZ}|${VELOCIDAD}|${escena.voz}`).digest('hex');
  const yaGenerado =
    existsSync(mp3) && existsSync(archivoHuella) && readFileSync(archivoHuella, 'utf8') === huella;
  if (!yaGenerado) {
    process.stdout.write(`  ${nombre}: voz de borrador (edge-tts)… `);
    execFileSync('python3', [
      '-m',
      'edge_tts',
      `--voice=${VOZ}`,
      `--rate=${VELOCIDAD}`,
      `--text=${escena.voz}`,
      `--write-media=${mp3}`,
    ]);
    writeFileSync(archivoHuella, huella);
  } else {
    process.stdout.write(`  ${nombre}: voz de borrador en caché. `);
  }
  const metadatos = await parseFile(mp3);
  const segundos = metadatos.format.duration ?? 0;
  console.log(`${segundos.toFixed(2)}s`);
  escenasConTiempos.push({
    ...escena,
    duracionFrames: Math.round(segundos * FPS),
    audio: `audio/${guion.expediente}/${nombre}.mp3`,
  });
}

// Resumen: qué escenas llevan ya tu voz y cuáles siguen en borrador.
if (conVozPropia < guion.escenas.length) {
  console.log(
    `\n🎙  Voz propia en ${conVozPropia}/${guion.escenas.length} escenas. ` +
      `Las demás usan ${sinVoz ? 'duración estimada' : 'voz de borrador'}.`
  );
} else {
  console.log(`\n🎙  Las ${conVozPropia} escenas llevan tu voz, normalizada.`);
}

// ---------- 4. Escribir los datos que recibirá la plantilla ----------
const datos = {expediente: guion.expediente, titulo: guion.titulo, escenas: escenasConTiempos};
const rutaDatos = join(carpetaAudio, 'datos.json');
writeFileSync(rutaDatos, JSON.stringify(datos, null, 2));

const totalFrames =
  150 + escenasConTiempos.reduce((s, e) => s + e.duracionFrames + 14, 0) + 195;
console.log(`⏱  Duración total: ${(totalFrames / FPS).toFixed(1)}s (intro + escenas + outro)`);

// ---------- 5. Renderizar ----------
if (sinRender) {
  console.log('Listo (sin render). Datos en', rutaDatos);
  process.exit(0);
}
const salida = join('out', `expediente-${guion.expediente}${sinVoz ? '-sin-voz' : ''}.mp4`);
console.log(`\n🎬 Renderizando ${salida}…\n`);
execFileSync('npx', ['remotion', 'render', 'JuristaEnProceso', salida, `--props=${rutaDatos}`], {
  cwd: RAIZ,
  stdio: 'inherit',
});
console.log(`\n✓ Video listo: ${salida}`);
