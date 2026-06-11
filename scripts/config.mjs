// ============================================================
// CONFIGURACIÓN DE PRODUCCIÓN — un solo sitio para ajustar la voz.
//
// Otras voces femeninas de España disponibles en edge-tts:
//   es-ES-ElviraNeural  (la actual: clara y alegre)
//   es-ES-XimenaNeural  (algo más suave)
// Para ver todas:  python3 -m edge_tts --list-voices | grep es-ES
// ============================================================

export const VOZ = 'es-ES-ElviraNeural';

// Velocidad de locución. '+0%' es la natural; un pelín más rápida
// suena más alegre sin perder claridad.
export const VELOCIDAD = '+4%';

// Fotogramas por segundo del video (debe coincidir con src/tema.ts).
export const FPS = 30;

// Para el modo --sin-voz: estimación de palabras por segundo de la
// locutora, usada para calcular duraciones provisionales.
export const PALABRAS_POR_SEGUNDO = 2.6;
