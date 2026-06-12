// ============================================================
// TEMA — la guía de estilo del canal, centralizada.
// Cambiar un color o una fuente aquí lo cambia en TODOS los videos.
// ============================================================

// Las tipografías se instalan con npm (carpeta node_modules), así el render
// nunca depende de internet. Estos "import" cargan los archivos de fuente.
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

// Paleta: tinta oscura sobre papel claro, ámbar para acentos
// y rojo teja RESERVADO para el sello (regla de la casa).
export const COLORES = {
  tinta: '#2b2a26',
  tintaSuave: 'rgba(43, 42, 38, 0.55)',
  fondo: '#ffffff',
  ambar: '#d9a441',
  teja: '#c96f5a',
  azulLavado: '#6f8fa3',
} as const;

export const FUENTES = {
  serif: "'Playfair Display', Georgia, serif", // títulos elegantes
  sans: "'Inter', Helvetica, Arial, sans-serif", // textos de apoyo
} as const;

// Formato del video.
export const FPS = 30;
export const ANCHO = 1920;
export const ALTO = 1080;

// Duraciones fijas de las piezas de marca (en fotogramas: 30 = 1 segundo).
export const INTRO_FRAMES = 150; // 5 segundos de intro
export const OUTRO_FRAMES = 195; // 6,5 segundos de outro
export const RESPIRO_FRAMES = 14; // pausa tras la voz de cada escena
