// ============================================================
// GENERADOR DE EFECTOS DE SONIDO DEL CANAL
// En lugar de descargar sonidos (con sus líos de licencias), los
// fabricamos matemáticamente. Todos son cortos, suaves y pensados
// para sonar POR DEBAJO de la voz.
//
//   sello.wav    golpe seco del sello (tono grave + chasquido)
//   golpe.wav    golpe blando (algo cae con peso)
//   plop.wav     burbuja al aparecer un prop
//   scribble.wav rasgueo de lápiz mientras algo se dibuja
//   whoosh.wav   barrido de aire para paneos y zooms
//   tachon.wav   trazo rápido que tacha una palabra
//   monedas.wav  tintineo metálico de monedas
//
// Se ejecuta una sola vez:  npm run sfx
// ============================================================
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FM = 44100; // muestras por segundo (calidad CD)

// Un generador de azar con semilla: los SFX salen IGUALES en cada
// ejecución (mismo video, mismo sonido).
const crearAzar = (semilla) => () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296 - 0.5;
};

// Sintetiza "duracion" segundos llamando a onda(t) muestra a muestra.
const sintetizar = (duracion, onda) => {
  const total = Math.floor(FM * duracion);
  const muestras = new Float64Array(total);
  for (let i = 0; i < total; i++) {
    muestras[i] = onda(i / FM, i);
  }
  return muestras;
};

// Empaqueta muestras (-1..1) en un WAV mono de 16 bits.
const escribirWav = (nombre, muestras) => {
  const datos = Buffer.alloc(44 + muestras.length * 2);
  datos.write('RIFF', 0);
  datos.writeUInt32LE(36 + muestras.length * 2, 4);
  datos.write('WAVE', 8);
  datos.write('fmt ', 12);
  datos.writeUInt32LE(16, 16);
  datos.writeUInt16LE(1, 20);
  datos.writeUInt16LE(1, 22);
  datos.writeUInt32LE(FM, 24);
  datos.writeUInt32LE(FM * 2, 28);
  datos.writeUInt16LE(2, 32);
  datos.writeUInt16LE(16, 34);
  datos.write('data', 36);
  datos.writeUInt32LE(muestras.length * 2, 40);
  for (let i = 0; i < muestras.length; i++) {
    const v = Math.max(-1, Math.min(1, muestras[i]));
    datos.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  const destino = join(RAIZ, 'public', 'sfx');
  mkdirSync(destino, {recursive: true});
  writeFileSync(join(destino, nombre), datos);
  console.log(`✓ public/sfx/${nombre}`);
};

// ---------- sello: tono grave + chasquido, apagándose rápido ----------
{
  const azar = crearAzar(7);
  escribirWav('sello.wav', sintetizar(0.22, (t) => {
    const golpe = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-t * 22) * 0.9;
    const chasquido = azar() * 2 * Math.exp(-t * 70) * 0.45;
    return golpe + chasquido;
  }));
}

// ---------- golpe: caída blanda, más sorda que el sello ----------
{
  const azar = crearAzar(11);
  escribirWav('golpe.wav', sintetizar(0.3, (t) => {
    const cuerpo = Math.sin(2 * Math.PI * (95 - t * 120) * t) * Math.exp(-t * 16) * 0.7;
    const polvo = azar() * 2 * Math.exp(-t * 26) * 0.18;
    return cuerpo + polvo;
  }));
}

// ---------- plop: burbuja con barrido de tono descendente ----------
escribirWav('plop.wav', sintetizar(0.14, (t) => {
  const frecuencia = 420 - 240 * (t / 0.14);
  return Math.sin(2 * Math.PI * frecuencia * t) * Math.exp(-t * 30) * 0.65;
}));

// ---------- scribble: ráfagas de ruido como trazos de lápiz ----------
{
  const azar = crearAzar(13);
  let previa = 0;
  escribirWav('scribble.wav', sintetizar(0.55, (t) => {
    // Ruido "aclarado" (diferencia de muestras = más agudo, más papel).
    const blanco = azar() * 2;
    const claro = blanco - previa * 0.6;
    previa = blanco;
    // Seis pasadas de lápiz: la amplitud sube y baja como la mano.
    const pasada = Math.pow(Math.abs(Math.sin(2 * Math.PI * 5.5 * t)), 1.6);
    const final = Math.exp(-Math.max(0, t - 0.42) * 24);
    return claro * pasada * final * 0.32;
  }));
}

// ---------- whoosh: ruido grave que se hincha y se deshincha ----------
{
  const azar = crearAzar(17);
  let suave = 0;
  escribirWav('whoosh.wav', sintetizar(0.6, (t) => {
    // Filtro paso-bajo de un polo cuyo corte sigue la envolvente:
    // el aire "se abre" en el centro del barrido.
    const envolvente = Math.pow(Math.sin(Math.PI * (t / 0.6)), 2);
    const alfa = 0.04 + envolvente * 0.22;
    suave += (azar() * 2 - suave) * alfa;
    return suave * envolvente * 0.8;
  }));
}

// ---------- tachón: un solo trazo rápido y decidido ----------
{
  const azar = crearAzar(19);
  let previa = 0;
  escribirWav('tachon.wav', sintetizar(0.2, (t) => {
    const blanco = azar() * 2;
    const claro = blanco - previa * 0.55;
    previa = blanco;
    const golpe = Math.pow(Math.sin(Math.PI * (t / 0.2)), 1.2);
    return claro * golpe * 0.4;
  }));
}

// ---------- monedas: tres campanitas metálicas desfasadas ----------
{
  const campana = (t, inicio, frecuencia) => {
    const tt = t - inicio;
    if (tt < 0) {
      return 0;
    }
    return (
      (Math.sin(2 * Math.PI * frecuencia * tt) * 0.6 +
        Math.sin(2 * Math.PI * frecuencia * 2.756 * tt) * 0.3) *
      Math.exp(-tt * 18)
    );
  };
  escribirWav('monedas.wav', sintetizar(0.5, (t) => {
    return (campana(t, 0, 2350) + campana(t, 0.09, 3050) + campana(t, 0.2, 2680)) * 0.3;
  }));
}
