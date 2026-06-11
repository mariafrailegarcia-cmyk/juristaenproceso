// ============================================================
// PRODUCIR — el director de producción del canal.
// Un solo comando convierte un guion.json en un mp4 terminado:
//
//   npm run producir -- guiones/0000-presuncion-de-inocencia.json
//
// Pasos que automatiza:
//   1. Lee y valida el guion.
//   2. Genera la voz de cada escena con edge-tts (con caché: si el
//      texto no cambió, no vuelve a pedir esa voz).
//   3. Mide la duración exacta de cada mp3 → duración de la escena.
//   4. Escribe public/audio/<expediente>/datos.json (guion + tiempos).
//   5. Renderiza el video con Remotion → out/expediente-<nº>.mp4
//
// Opciones:
//   --sin-voz     no llama a edge-tts; estima la duración por el texto
//                 (útil para borradores visuales sin conexión).
//   --sin-render  prepara voces y datos pero no renderiza.
// ============================================================
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFile} from 'music-metadata';
import {FPS, PALABRAS_POR_SEGUNDO, VELOCIDAD, VOZ} from './config.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

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

// ---------- 2 y 3. Voz y duración de cada escena ----------
const carpetaAudio = join(RAIZ, 'public', 'audio', guion.expediente);
mkdirSync(carpetaAudio, {recursive: true});

const escenasConTiempos = [];
for (let i = 0; i < guion.escenas.length; i++) {
  const escena = guion.escenas[i];
  const nombre = `escena-${String(i + 1).padStart(2, '0')}`;

  if (sinVoz) {
    // Modo borrador: estimamos la duración contando palabras.
    const palabras = escena.voz.trim().split(/\s+/).length;
    const segundos = palabras / PALABRAS_POR_SEGUNDO + 0.4;
    escenasConTiempos.push({...escena, duracionFrames: Math.round(segundos * FPS)});
    console.log(`  ${nombre}: ~${segundos.toFixed(1)}s (estimado, sin voz)`);
    continue;
  }

  const mp3 = join(carpetaAudio, `${nombre}.mp3`);
  const archivoHuella = join(carpetaAudio, `${nombre}.huella`);
  // La "huella" resume texto+voz+velocidad: si no cambió, reutilizamos
  // el mp3 ya generado en lugar de pedirlo otra vez.
  const huella = createHash('sha256').update(`${VOZ}|${VELOCIDAD}|${escena.voz}`).digest('hex');
  const yaGenerado =
    existsSync(mp3) && existsSync(archivoHuella) && readFileSync(archivoHuella, 'utf8') === huella;

  if (!yaGenerado) {
    process.stdout.write(`  ${nombre}: generando voz… `);
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
    process.stdout.write(`  ${nombre}: voz en caché. `);
  }

  // Medimos el mp3: su duración ES la duración de la escena.
  const metadatos = await parseFile(mp3);
  const segundos = metadatos.format.duration ?? 0;
  console.log(`${segundos.toFixed(2)}s`);
  escenasConTiempos.push({
    ...escena,
    duracionFrames: Math.round(segundos * FPS),
    audio: `audio/${guion.expediente}/${nombre}.mp3`,
  });
}

// ---------- 4. Escribir los datos que recibirá la plantilla ----------
const datos = {expediente: guion.expediente, titulo: guion.titulo, escenas: escenasConTiempos};
const rutaDatos = join(carpetaAudio, 'datos.json');
writeFileSync(rutaDatos, JSON.stringify(datos, null, 2));

const totalFrames =
  150 + escenasConTiempos.reduce((s, e) => s + e.duracionFrames + 14, 0) + 195;
console.log(`\n⏱  Duración total: ${(totalFrames / FPS).toFixed(1)}s (intro + escenas + outro)`);

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
