// ============================================================
// GENERADOR DEL GOLPE SECO DEL SELLO
// En lugar de descargar un sonido (con sus líos de licencias),
// lo fabricamos matemáticamente: un tono grave (el "cuerpo" del
// golpe) + una ráfaga de ruido (el "chasquido" del impacto),
// ambos apagándose muy rápido. Total: 0,22 segundos.
//
// Se ejecuta una sola vez:  npm run sfx
// ============================================================
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const FRECUENCIA_MUESTREO = 44100; // muestras de sonido por segundo (calidad CD)
const DURACION = 0.22; // segundos
const totalMuestras = Math.floor(FRECUENCIA_MUESTREO * DURACION);

// Calculamos el valor de la onda sonora en cada instante.
const muestras = new Float64Array(totalMuestras);
for (let i = 0; i < totalMuestras; i++) {
  const t = i / FRECUENCIA_MUESTREO; // tiempo en segundos
  // Cuerpo del golpe: onda grave de 65 Hz que se apaga deprisa.
  const golpe = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-t * 22) * 0.9;
  // Chasquido: ruido aleatorio que se apaga MUY deprisa.
  const chasquido = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.45;
  muestras[i] = golpe + chasquido;
}

// Empaquetamos las muestras en un archivo WAV (el formato de sonido
// sin comprimir: una cabecera de 44 bytes + los números de la onda).
const datos = Buffer.alloc(44 + totalMuestras * 2);
datos.write('RIFF', 0);
datos.writeUInt32LE(36 + totalMuestras * 2, 4);
datos.write('WAVE', 8);
datos.write('fmt ', 12);
datos.writeUInt32LE(16, 16); // tamaño del bloque de formato
datos.writeUInt16LE(1, 20); // formato PCM (sin compresión)
datos.writeUInt16LE(1, 22); // 1 canal (mono)
datos.writeUInt32LE(FRECUENCIA_MUESTREO, 24);
datos.writeUInt32LE(FRECUENCIA_MUESTREO * 2, 28); // bytes por segundo
datos.writeUInt16LE(2, 32); // bytes por muestra
datos.writeUInt16LE(16, 34); // bits por muestra
datos.write('data', 36);
datos.writeUInt32LE(totalMuestras * 2, 40);
for (let i = 0; i < totalMuestras; i++) {
  // Convertimos cada valor (-1 a 1) al rango de enteros de 16 bits.
  const valor = Math.max(-1, Math.min(1, muestras[i]));
  datos.writeInt16LE(Math.round(valor * 32767), 44 + i * 2);
}

const destino = join(RAIZ, 'public', 'sfx');
mkdirSync(destino, {recursive: true});
writeFileSync(join(destino, 'sello.wav'), datos);
console.log('✓ Golpe seco generado en public/sfx/sello.wav');
