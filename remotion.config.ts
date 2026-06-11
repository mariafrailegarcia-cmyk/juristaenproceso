// Configuración de Remotion (el programa que convierte nuestro código React en un video).
import {existsSync} from 'node:fs';
import {Config} from '@remotion/cli/config';

// Remotion renderiza usando un navegador Chrome sin ventana. Normalmente lo
// descarga él solo de remotion.media, pero en entornos con red restringida
// ese dominio puede estar bloqueado; por eso lo bajamos nosotros de los
// servidores de Google con `npm run navegador` y se lo señalamos aquí.
const navegadorLocal =
  '.navegador/chrome-headless-shell/linux-149.0.7790.0/chrome-headless-shell-linux64/chrome-headless-shell';
if (existsSync(navegadorLocal)) {
  Config.setBrowserExecutable(navegadorLocal);
}

// El "punto de entrada": el archivo donde Remotion empieza a leer nuestro video.
Config.setEntryPoint('src/index.ts');

// Si ya existe un mp4 con el mismo nombre, lo sobrescribe sin preguntar.
Config.setOverwriteOutput(true);

// Cada fotograma se captura como JPEG (más rápido que PNG y suficiente
// para un fondo claro sin transparencias).
Config.setVideoImageFormat('jpeg');
