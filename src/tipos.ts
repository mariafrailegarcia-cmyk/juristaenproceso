// ============================================================
// TIPOS — el "contrato" entre el guion.json y el código.
// Aquí se define qué puede aparecer en un guion. Si un guion
// no respeta estas formas, TypeScript o el pipeline avisarán.
// ============================================================

// ------------------------------------------------------------
// COREOGRAFÍA — una escena como secuencia de acciones de dibujo.
// Regla de oro del canal: la voz cuenta, el dibujo muestra y el
// texto solo aparece cuando aporta (rótulos de pocas palabras,
// cifras, términos legales como sello).
//
// Cada acción dice QUIÉN (actor, prop o texto), QUÉ hace y CUÁNDO:
// "t" es la fracción de la locución (0 = empieza la voz, 1 = acaba).
// Así los tiempos los manda siempre el audio grabado.
// ------------------------------------------------------------
export type Accion = {
  // Quién actúa: un monigote ("tu", "marcos"…), un prop ("billete",
  // "candado2"…) o un texto en pantalla. Exactamente uno de los tres.
  actor?: string;
  prop?: string;
  texto?: string;

  // Qué hace. Verbos de actor: aparecer, caminar, mirar_movil, senalar,
  // cargar, entregar, soltar, celebrar, encogerse, tambalearse, caerse,
  // sentarse, desaparecer. Verbos de prop: aparecer, moverse, flotar,
  // cerrarse_sobre, borrarse, desaparecer. Verbos de texto: rotulo,
  // bocadillo, sello, desaparecer.
  accion: string;

  // Cuándo: inicio como fracción de la locución (0→1) y duración
  // opcional en SEGUNDOS (cada verbo tiene una duración por defecto).
  t: number;
  dur?: number;

  // Dónde: posición en el lienzo de 1920x1080. "en" coloca; "a" es el
  // destino de un movimiento; "objetivo" apunta a otra entidad por id.
  en?: [number, number];
  a?: [number, number];
  objetivo?: string;

  // Detalles: el tipo de dibujo de un prop si su id lleva sufijo
  // ("carpeta2" → tipo "carpeta"), la variante de un actor, etc.
  tipo?: string;
  variante?: 'gafas' | 'peluca' | 'gorra';
  escala?: number;
  voltear?: boolean;
  // Carácter de un texto: cómo entra en escena. 'caer' (con peso y
  // polvillo), 'estampar' (sello con sacudida), 'pluma' (se escribe
  // despacio), 'espera' (bocadillo que rebota y se queda esperando).
  estilo?: 'caer' | 'estampar' | 'pluma' | 'espera';
};

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
  // Mini-película doodle: actores, props y rótulos coreografiados.
  | {tipo: 'coreografia'; acciones: Accion[]}
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
