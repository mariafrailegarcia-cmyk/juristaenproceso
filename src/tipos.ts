// ============================================================
// TIPOS — el "contrato" entre el guion.json y el código.
// Aquí se define qué puede aparecer en un guion. Si un guion
// no respeta estas formas, TypeScript o el pipeline avisarán.
// ============================================================

// Cada escena elige UN tipo de visual. Para añadir un tipo nuevo al canal
// se amplía esta lista y se crea su dibujo en src/escenas/Escena.tsx;
// los guiones antiguos siguen funcionando igual.
export type Visual =
  // Título grande en serif que se escribe solo, con subrayado a mano.
  | {tipo: 'titulo'; texto: string; subtitulo?: string}
  // Un término y su definición, enmarcados en una pizarra dibujada.
  | {tipo: 'definicion'; termino: string; definicion: string}
  // Lista de puntos que aparecen uno a uno.
  | {tipo: 'lista'; titulo?: string; puntos: string[]}
  // La balanza de la justicia con una etiqueta bajo cada platillo.
  | {tipo: 'balanza'; etiquetas: [string, string]; texto?: string}
  // Monigote de palitos con un bocadillo de diálogo.
  | {tipo: 'monigote'; texto: string; pose?: 'neutral' | 'duda' | 'celebra'}
  // Un sello que cae y estampa una palabra (rojo teja, solo para esto).
  | {tipo: 'sello'; texto: string; apoyo?: string};

// Una escena del guion. "duracionFrames" y "audio" no los escribe nadie a
// mano: los añade automáticamente el pipeline midiendo el mp3 de la voz.
export type Escena = {
  voz: string; // lo que dice la locutora
  visual: Visual; // lo que se dibuja mientras tanto
  duracionFrames: number; // duración del audio, en fotogramas
  audio?: string; // ruta del mp3 dentro de public/ (opcional en previsualización)
};

// El video completo: esto es lo que recibe la plantilla.
export type Guion = {
  expediente: string; // ej. "0000" → se muestra como "Expediente nº 0000"
  titulo: string;
  escenas: Escena[];
};
