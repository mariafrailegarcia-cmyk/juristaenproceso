// ============================================================
// COREOGRAFÍA — el intérprete de mini-películas doodle.
//
// Recibe la lista de acciones del guion ({actor/prop/texto,
// accion, t, …}) y, fotograma a fotograma, calcula el estado de
// cada entidad: dónde está, qué postura tiene, cuánto lleva
// dibujado. El código no sabe nada del expediente concreto:
// toda la puesta en escena vive en el JSON.
//
// Reglas de la casa:
//  - El tiempo "t" es fracción de la locución: el audio manda.
//  - Nada se mueve a velocidad constante: anticipación, muelle
//    y rebote en cada movimiento.
//  - La cámara es un personaje más (actor "camara"): zooms,
//    paneos, punch-ins y sacudidas en los golpes.
//  - El texto actúa: cae con peso, se estampa, se tacha.
//  - Cada acción sonora lleva su SFX, bajito, bajo la voz.
// ============================================================
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {COLORES, FPS, FUENTES} from '../tema';
import type {Accion} from '../tipos';
import {MonigoteArticulado, VarianteMonigote} from '../componentes/MonigoteArticulado';
import {PROPS, PropDoodle, tipoDeProp} from '../componentes/PropsDoodle';
import {Sello} from '../componentes/Sello';
import {TextoEscrito} from '../componentes/TextoEscrito';
import {Trazo, lapiz, tinta, usarBoil} from '../componentes/Rough';

// ---------- Física: las curvas de movimiento del canal ----------
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const suaviza = (p: number) => p * p * (3 - 2 * p);
const mezcla = (a: number, b: number, p: number) => a + (b - a) * p;

// Muelle barato: sube, se pasa un poco (overshoot) y se asienta.
const muelle = (p: number) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9 * p));

// Anticipación + muelle: retrocede un pelín, arranca y llega
// pasándose un poco. La curva de los desplazamientos con alma.
const anticipa = (p: number): number => {
  if (p >= 1) {
    return 1;
  }
  if (p < 0.16) {
    return -0.07 * Math.sin((p / 0.16) * Math.PI);
  }
  const q = (p - 0.16) / 0.84;
  return 1 - Math.exp(-5.2 * q) * Math.cos(6.8 * q);
};

// Rebote clásico de "algo que cae": toca el suelo en p≈0.36 y
// rebota dos veces más, cada vez menos.
const rebote = (p: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (p < 1 / d1) {
    return n1 * p * p;
  }
  if (p < 2 / d1) {
    return n1 * (p -= 1.5 / d1) * p + 0.75;
  }
  if (p < 2.5 / d1) {
    return n1 * (p -= 2.25 / d1) * p + 0.9375;
  }
  return n1 * (p -= 2.625 / d1) * p + 0.984375;
};
const P_PRIMER_BOTE = 0.3636; // cuándo toca el suelo por primera vez

// Duración por defecto de cada verbo, en segundos. Una pose sin
// "dur" se mantiene hasta la siguiente acción de esa entidad.
const DUR_DEFECTO: Record<string, number> = {
  aparecer: 0.9,
  desaparecer: 0.6,
  borrarse: 0.8,
  caminar: 2.2,
  moverse: 1.6,
  flotar: 2.6,
  cerrarse_sobre: 0.8,
  cargar: 0.8,
  entregar: 1.0,
  soltar: 0.4,
  caerse: 1.1,
  sentarse: 1.0,
  rotulo: 0.8,
  bocadillo: 0.8,
  sello: 0.4,
  tachar: 0.4,
  zoom: 1.6,
  punch: 0.55,
  seguir: 2.0,
};
const durPorDefecto = (a: Accion): number => {
  if (a.accion === 'rotulo' && a.estilo === 'caer') {
    return 1.0;
  }
  if (a.accion === 'rotulo' && a.estilo === 'estampar') {
    return 0.35;
  }
  return DUR_DEFECTO[a.accion] ?? 0.8;
};

// Verbos que cambian la postura o el sitio: marcan el final de la
// pose anterior cuando esta no declaró duración.
const CAMBIAN_POSTURA = new Set([
  'caminar', 'moverse', 'mirar_movil', 'desinflarse', 'senalar', 'cargar', 'entregar',
  'soltar', 'celebrar', 'encogerse', 'tambalearse', 'caerse', 'sentarse', 'desaparecer', 'parado',
]);
// Poses que se mantienen indefinidamente si no se les da duración.
const POSES_SOSTENIDAS = new Set([
  'mirar_movil', 'desinflarse', 'senalar', 'celebrar', 'encogerse', 'tambalearse',
  'caerse', 'sentarse', 'parado',
]);

type AccionAbs = Accion & {f0: number; df: number};
type Entidad = {
  id: string;
  clase: 'actor' | 'prop' | 'texto';
  tipo: string; // tipo de prop, o el propio id
  acciones: AccionAbs[];
  semilla: number;
};

// ---------- 1. Agrupar las acciones del guion por entidad ----------
const agruparEntidades = (acciones: Accion[], duracionFrames: number): Entidad[] => {
  const mapa = new Map<string, Entidad>();
  acciones.forEach((a) => {
    const clase: Entidad['clase'] = a.actor ? 'actor' : a.prop ? 'prop' : 'texto';
    const id = a.actor ?? a.prop ?? `txt:${a.texto}`;
    if (!mapa.has(id)) {
      mapa.set(id, {
        id,
        clase,
        tipo: clase === 'prop' ? tipoDeProp(a.prop!, a.tipo) : id,
        acciones: [],
        semilla: mapa.size + 1,
      });
    }
    const f0 = Math.round(a.t * duracionFrames);
    const df = a.dur !== undefined ? Math.round(a.dur * FPS) : -1; // -1: por decidir
    mapa.get(id)!.acciones.push({...a, f0, df});
  });

  // Resolver duraciones pendientes: cada verbo usa su valor por
  // defecto, y las poses sostenidas duran hasta la siguiente acción
  // que cambie la postura (o hasta el final de la escena).
  for (const ent of mapa.values()) {
    ent.acciones.sort((x, y) => x.f0 - y.f0);
    ent.acciones.forEach((a, i) => {
      if (a.df >= 0) {
        return;
      }
      if (POSES_SOSTENIDAS.has(a.accion) || a.accion === 'cargar') {
        const siguiente = ent.acciones
          .slice(i + 1)
          .find((b) => CAMBIAN_POSTURA.has(b.accion));
        a.df = (siguiente ? siguiente.f0 : duracionFrames) - a.f0;
      } else {
        a.df = Math.round(durPorDefecto(a) * FPS);
      }
      a.df = Math.max(a.df, 1);
    });
  }
  return [...mapa.values()];
};

// ---------- 2. Posición "estática" de una entidad ----------
// Para resolver objetivos ("camina hacia marcos") sin recursión:
// la posición que las acciones ya completadas dejan a esa entidad.
const posicionEstatica = (
  entidades: Entidad[],
  id: string | undefined,
  f: number
): [number, number] => {
  const ent = entidades.find((e) => e.id === id);
  if (!ent) {
    return [960, 700];
  }
  let pos: [number, number] = [960, 700];
  for (const a of ent.acciones) {
    if (a.f0 > f) {
      break;
    }
    if (a.en) {
      pos = a.en;
    }
    if (a.a && f >= a.f0 + a.df) {
      pos = a.a;
    }
  }
  return pos;
};

// ---------- 3. Estado de una entidad en un fotograma ----------
type Estado = {
  x: number;
  y: number;
  escala: number;
  voltear: boolean;
  rot: number; // giro (el billete que flota, etc.)
  pop: number; // muelle de entrada (0→sobrepasa→1)
  aplastar: number; // squash de impacto (cerrarse_sobre)
  dibujo: number;
  opacidad: number;
  visible: boolean;
  // solo actores:
  verbo: string;
  verboPrevio: string;
  pVerbo: number;
  framesEnVerbo: number;
  fase: number;
  cargando: boolean;
  // solo textos:
  f0Texto: number;
};

const resolverEstado = (
  entidades: Entidad[],
  ent: Entidad,
  f: number,
  cargasPorProp: Map<string, {portador: string; desde: number; hasta: number}[]>
): Estado => {
  const e: Estado = {
    x: 960,
    y: ent.clase === 'actor' ? 900 : 640,
    escala: ent.clase === 'actor' ? 1.15 : 1,
    voltear: false,
    rot: 0,
    pop: 1,
    aplastar: 0,
    dibujo: ent.acciones.some((a) => ['aparecer', 'rotulo', 'bocadillo', 'sello'].includes(a.accion)) ? 0 : 1,
    opacidad: 1,
    visible: ent.acciones.length > 0 && f >= ent.acciones[0].f0,
    verbo: 'parado',
    verboPrevio: 'parado',
    pVerbo: 1,
    framesEnVerbo: 999,
    fase: 0,
    cargando: false,
    f0Texto: ent.acciones[0]?.f0 ?? 0,
  };

  let ultimoVerbo = 'parado';
  let finUltimoVerbo = 0;
  let enCursoAlguno = false;

  for (const a of ent.acciones) {
    if (f < a.f0) {
      break;
    }
    const p = clamp01((f - a.f0) / a.df);
    const enCurso = f < a.f0 + a.df;
    if (a.en) {
      e.x = a.en[0];
      e.y = a.en[1];
    }
    if (a.escala !== undefined) {
      e.escala = a.escala;
    }
    if (a.voltear !== undefined) {
      e.voltear = a.voltear;
    }

    switch (a.accion) {
      case 'aparecer':
        e.dibujo = Math.max(e.dibujo, suaviza(p));
        e.pop = muelle(Math.min(1, p * 1.15));
        e.opacidad = 1;
        break;
      case 'desaparecer':
        e.opacidad = 1 - suaviza(p);
        if (p >= 1) {
          e.visible = false;
        }
        break;
      case 'borrarse':
        e.dibujo = 1 - suaviza(p);
        if (p >= 1) {
          e.visible = false;
        }
        break;
      case 'caminar':
      case 'moverse':
      case 'flotar':
      case 'cerrarse_sobre': {
        const desde: [number, number] = [e.x, e.y];
        let hasta: [number, number] = a.a ?? posicionEstatica(entidades, a.objetivo, f);
        if (a.accion === 'cerrarse_sobre' && a.objetivo) {
          hasta = [hasta[0], hasta[1] - 8]; // se posa encima del objetivo
        }
        if (a.accion === 'caminar' && a.objetivo && !a.a) {
          // No pisar al objetivo: frenar un paso antes.
          const lado = hasta[0] > desde[0] ? -1 : 1;
          hasta = [hasta[0] + lado * 170, hasta[1]];
        }
        // Cada movimiento con su física: el paseo arranca con
        // impulso, el desplazamiento anticipa y rebasa, el cierre
        // del candado es un latigazo (acelera hasta el golpe).
        const pm =
          a.accion === 'caminar'
            ? 0.3 * suaviza(p) + 0.7 * p
            : a.accion === 'cerrarse_sobre'
              ? p * p * p
              : a.accion === 'flotar'
                ? suaviza(p)
                : anticipa(p);
        e.x = mezcla(desde[0], hasta[0], pm);
        e.y = mezcla(desde[1], hasta[1], pm);
        if (Math.abs(hasta[0] - desde[0]) > 8) {
          e.voltear = hasta[0] < desde[0];
        }
        if (a.accion === 'caminar') {
          const distancia = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1]);
          const pasos = Math.max(2, Math.round(distancia / 95));
          e.fase = p * pasos * Math.PI * 2;
          if (enCurso) {
            e.verbo = 'caminar';
            e.pVerbo = p;
            e.framesEnVerbo = f - a.f0;
            enCursoAlguno = true;
          } else {
            ultimoVerbo = 'caminar';
            finUltimoVerbo = a.f0 + a.df;
          }
        }
        if (a.accion === 'flotar') {
          // Vaivén de hoja al viento mientras flota.
          e.y += Math.sin(p * Math.PI * 3.2) * 16 * (1 - Math.abs(p * 2 - 1) * 0.4);
          e.rot = Math.sin(p * Math.PI * 4) * 7 * (1 - p * 0.4);
        }
        if (a.accion === 'cerrarse_sobre') {
          const trasGolpe = f - (a.f0 + a.df);
          if (trasGolpe >= 0 && trasGolpe < 10) {
            e.aplastar = (1 - trasGolpe / 10) * Math.abs(Math.cos(trasGolpe * 0.9));
          }
        }
        break;
      }
      case 'cargar':
        if (enCurso) {
          e.verbo = 'cargar';
          e.pVerbo = p;
          e.framesEnVerbo = f - a.f0;
          enCursoAlguno = true;
        } else {
          ultimoVerbo = 'cargar';
          finUltimoVerbo = a.f0 + a.df;
        }
        e.cargando = true;
        break;
      case 'entregar':
        if (enCurso) {
          e.verbo = 'entregar';
          e.pVerbo = p;
          e.framesEnVerbo = f - a.f0;
          enCursoAlguno = true;
        } else {
          e.cargando = false;
          ultimoVerbo = 'entregar';
          finUltimoVerbo = a.f0 + a.df;
        }
        if (a.objetivo) {
          const obj = posicionEstatica(entidades, a.objetivo, f);
          e.voltear = obj[0] < e.x;
        }
        break;
      case 'soltar':
        e.cargando = false;
        break;
      case 'rotulo':
      case 'bocadillo':
      case 'sello':
        e.dibujo = Math.max(e.dibujo, suaviza(p));
        e.pop = muelle(Math.min(1, p * 1.2));
        break;
      case 'tachar':
        break; // el tachado se dibuja en la capa de texto
      default:
        // Poses sostenidas (mirar_movil, senalar, celebrar…).
        if (POSES_SOSTENIDAS.has(a.accion)) {
          if (enCurso) {
            e.verbo = a.accion;
            e.pVerbo = p;
            e.framesEnVerbo = f - a.f0;
            enCursoAlguno = true;
          } else {
            ultimoVerbo = a.accion;
            finUltimoVerbo = a.f0 + a.df;
          }
          if (a.objetivo) {
            const obj = posicionEstatica(entidades, a.objetivo, f);
            e.voltear = obj[0] < e.x;
          }
        }
        break;
    }
  }

  if (!enCursoAlguno) {
    // Sin verbo en curso: el actor vuelve a "parado" fundiendo desde
    // su última postura.
    e.verbo = 'parado';
    e.verboPrevio = ultimoVerbo;
    e.framesEnVerbo = f - finUltimoVerbo;
  } else {
    e.verboPrevio = ultimoVerbo;
  }

  // ¿Está este prop siendo cargado por alguien? Su sitio es las manos.
  const cargas = cargasPorProp.get(ent.id);
  if (cargas) {
    for (const c of cargas) {
      if (f >= c.desde && f < c.hasta) {
        const portador = entidades.find((x) => x.id === c.portador)!;
        const ep = resolverEstado(entidades, portador, f, new Map());
        e.x = ep.x + (ep.voltear ? -58 : 58) * ep.escala;
        e.y = ep.y - 150 * ep.escala;
      }
    }
  }
  return e;
};

// Índice de cargas: qué actor lleva qué prop y entre qué fotogramas.
const indiceDeCargas = (entidades: Entidad[], duracionFrames: number) => {
  const indice = new Map<string, {portador: string; desde: number; hasta: number}[]>();
  for (const ent of entidades) {
    if (ent.clase !== 'actor') {
      continue;
    }
    for (const a of ent.acciones) {
      if (a.accion !== 'cargar' || !a.objetivo) {
        continue;
      }
      const fin = ent.acciones.find(
        (b) => b.f0 > a.f0 && (b.accion === 'soltar' || b.accion === 'entregar')
      );
      const lista = indice.get(a.objetivo) ?? [];
      lista.push({
        portador: ent.id,
        desde: a.f0 + Math.round(a.df * 0.5),
        hasta: fin ? fin.f0 + fin.df : duracionFrames + 99,
      });
      indice.set(a.objetivo, lista);
    }
  }
  return indice;
};

// ---------- 4. La cámara ----------
// El actor "camara" no se dibuja: sus verbos (zoom, punch, seguir)
// mueven el mundo entero. Siempre hay una deriva mínima (nada de
// plano congelado) y los golpes la sacuden.
type Camara = {cx: number; cy: number; esc: number};

const resolverCamara = (
  entidades: Entidad[],
  f: number,
  cargas: Map<string, {portador: string; desde: number; hasta: number}[]>
): Camara => {
  const cam: Camara = {cx: 960, cy: 540, esc: 1};
  const ent = entidades.find((x) => x.id === 'camara');
  if (ent) {
    for (const a of ent.acciones) {
      if (f < a.f0) {
        break;
      }
      const p = clamp01((f - a.f0) / a.df);
      if (a.accion === 'zoom') {
        const destino = a.a ?? (a.objetivo ? posicionEstatica(entidades, a.objetivo, f) : [cam.cx, cam.cy]);
        const esc = a.escala ?? cam.esc;
        const pm = suaviza(p);
        cam.cx = mezcla(cam.cx, destino[0], pm);
        cam.cy = mezcla(cam.cy, destino[1], pm);
        cam.esc = mezcla(cam.esc, esc, pm);
      } else if (a.accion === 'punch') {
        // Zoom rápido de chiste: entra y vuelve, como un golpe de cejas.
        const destino = a.a ?? (a.objetivo ? posicionEstatica(entidades, a.objetivo, f) : [cam.cx, cam.cy]);
        const env = Math.sin(Math.PI * p) * (p >= 1 ? 0 : 1);
        const fuerza = (a.escala ?? 1.18) - 1;
        cam.cx = mezcla(cam.cx, destino[0], env * 0.5);
        cam.cy = mezcla(cam.cy, destino[1], env * 0.4);
        cam.esc = cam.esc * (1 + fuerza * env);
      } else if (a.accion === 'seguir' && a.objetivo) {
        // Paneo siguiendo a quien camina, con un punto de adelanto.
        const objetivo = entidades.find((x) => x.id === a.objetivo);
        if (objetivo) {
          const eo = resolverEstado(entidades, objetivo, f, cargas);
          const adelanto = eo.voltear ? -110 : 110;
          const pm = suaviza(Math.min(1, p * 3)); // engancha rápido
          cam.cx = mezcla(cam.cx, eo.x + adelanto, pm);
        }
      }
    }
  }
  // Deriva de documental: la cámara nunca está clavada.
  cam.cx += Math.sin(f / 95) * 7;
  cam.cy += Math.sin(f / 118 + 2) * 5;
  cam.esc *= 1 + Math.sin(f / 140) * 0.005;
  return cam;
};

// Sacudidas: cada golpe (sello, estampado, candado, texto que cae)
// agita la cámara durante unos fotogramas.
const sacudidaDeCamara = (entidades: Entidad[], f: number): [number, number] => {
  let dx = 0;
  let dy = 0;
  for (const ent of entidades) {
    for (const a of ent.acciones) {
      let impacto = -1;
      let fuerza = 0;
      if (a.accion === 'sello') {
        impacto = a.f0;
        fuerza = 10;
      } else if (a.accion === 'rotulo' && a.estilo === 'estampar') {
        impacto = a.f0 + 3;
        fuerza = 9;
      } else if (a.accion === 'rotulo' && a.estilo === 'caer') {
        impacto = a.f0 + Math.round(a.df * P_PRIMER_BOTE);
        fuerza = 7;
      } else if (a.accion === 'cerrarse_sobre') {
        impacto = a.f0 + a.df;
        fuerza = 11;
      }
      if (impacto < 0) {
        continue;
      }
      const dt = f - impacto;
      if (dt >= 0 && dt < 9) {
        const amp = fuerza * (1 - dt / 9);
        dx += Math.sin(dt * 2.7 + ent.semilla) * amp;
        dy += Math.cos(dt * 3.3 + ent.semilla) * amp * 0.6;
      }
    }
  }
  return [dx, dy];
};

// ---------- 5. SFX: cada acción con su sonido, bajo la voz ----------
const cuesDeSonido = (entidades: Entidad[]): {src: string; f0: number; vol: number}[] => {
  const cues: {src: string; f0: number; vol: number}[] = [];
  for (const ent of entidades) {
    for (const a of ent.acciones) {
      if (a.accion === 'aparecer' && ent.clase === 'prop') {
        cues.push({src: ent.tipo === 'moneda' ? 'monedas.wav' : 'plop.wav', f0: a.f0, vol: ent.tipo === 'moneda' ? 0.3 : 0.22});
      } else if (a.accion === 'aparecer' && ent.clase === 'actor' && ent.id !== 'camara') {
        cues.push({src: 'scribble.wav', f0: a.f0, vol: 0.16});
      } else if (a.accion === 'bocadillo') {
        cues.push({src: 'plop.wav', f0: a.f0, vol: 0.2});
      } else if (a.accion === 'tachar') {
        cues.push({src: 'tachon.wav', f0: a.f0, vol: 0.3});
      } else if (a.accion === 'cerrarse_sobre') {
        cues.push({src: 'golpe.wav', f0: a.f0 + a.df, vol: 0.38});
      } else if (a.accion === 'rotulo') {
        if (a.estilo === 'caer') {
          cues.push({src: 'golpe.wav', f0: a.f0 + Math.round(a.df * P_PRIMER_BOTE), vol: 0.3});
        } else if (a.estilo === 'estampar') {
          cues.push({src: 'sello.wav', f0: a.f0, vol: 0.24});
        } else {
          cues.push({src: 'scribble.wav', f0: a.f0, vol: 0.12});
        }
      } else if (ent.id === 'camara' && (a.accion === 'zoom' || a.accion === 'punch') && a.f0 > 4) {
        cues.push({src: 'whoosh.wav', f0: a.f0, vol: 0.15});
      } else if (a.accion === 'flotar') {
        cues.push({src: 'whoosh.wav', f0: a.f0, vol: 0.12});
      }
    }
  }
  return cues;
};

// Variante por nombre del personaje, salvo que el guion la indique.
const varianteDe = (ent: Entidad): VarianteMonigote => {
  const explicita = ent.acciones.find((a) => a.variante)?.variante;
  if (explicita) {
    return explicita;
  }
  if (ent.id.startsWith('marcos')) {
    return 'gafas';
  }
  if (ent.id.startsWith('juez')) {
    return 'peluca';
  }
  if (ent.id.startsWith('estado')) {
    return 'gorra';
  }
  return undefined;
};

// ---------- 6. El componente de escena ----------
export const VisualCoreografia: React.FC<{
  acciones: Accion[];
  duracion: number; // frames de la escena (los manda el audio)
}> = ({acciones, duracion}) => {
  const fotograma = useCurrentFrame();
  const boil = usarBoil();

  const entidades = useMemo(() => agruparEntidades(acciones, duracion), [acciones, duracion]);
  const cargas = useMemo(() => indiceDeCargas(entidades, duracion), [entidades, duracion]);
  const cues = useMemo(() => cuesDeSonido(entidades), [entidades]);
  const suelo = useMemo(
    () => lapiz.line(40, 906, 1880, 906, tinta(7 + boil * 911, {stroke: COLORES.tintaSuave, strokeWidth: 2})),
    [boil]
  );

  const visibles = entidades.filter((e) => e.id !== 'camara');
  const estados = visibles.map((ent) => ({
    ent,
    estado: resolverEstado(entidades, ent, fotograma, cargas),
  }));
  const hayActores = visibles.some((e) => e.clase === 'actor');

  const cam = resolverCamara(entidades, fotograma, cargas);
  const [sacudidaX, sacudidaY] = sacudidaDeCamara(entidades, fotograma);

  // La transformación de cámara mueve EL MUNDO entero (dibujos y
  // textos): el lienzo es un lugar, no una diapositiva.
  const transformaMundo: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translate(${960 - cam.cx * cam.esc + sacudidaX}px, ${540 - cam.cy * cam.esc + sacudidaY}px) scale(${cam.esc})`,
    transformOrigin: '0 0',
  };

  return (
    <AbsoluteFill>
      <div style={transformaMundo}>
        <svg
          viewBox="0 0 1920 1080"
          style={{position: 'absolute', width: 1920, height: 1080, overflow: 'visible'}}
        >
          {hayActores ? <Trazo forma={suelo} progreso={clamp01(fotograma / 22)} /> : null}

          {/* Props primero (quedan detrás de los actores). */}
          {estados
            .filter(({ent}) => ent.clase === 'prop')
            .map(({ent, estado: e}) => {
              if (!e.visible) {
                return null;
              }
              const pop = 0.7 + 0.3 * e.pop;
              const sx = e.escala * pop * (1 + 0.3 * e.aplastar) * (e.voltear ? -1 : 1);
              const sy = e.escala * pop * (1 - 0.24 * e.aplastar);
              return (
                <g key={ent.id} transform={`translate(${e.x} ${e.y}) rotate(${e.rot}) scale(${sx} ${sy})`}>
                  <PropDoodle tipo={ent.tipo} semilla={ent.semilla} dibujo={e.dibujo} opacidad={e.opacidad} />
                </g>
              );
            })}

          {estados
            .filter(({ent}) => ent.clase === 'actor')
            .map(({ent, estado: e}) => {
              if (!e.visible) {
                return null;
              }
              const pop = 0.88 + 0.12 * e.pop;
              return (
                <g
                  key={ent.id}
                  transform={`translate(${e.x} ${e.y}) scale(${e.voltear ? -e.escala * pop : e.escala * pop} ${e.escala * pop})`}
                >
                  <MonigoteArticulado
                    verbo={e.verbo}
                    pVerbo={e.pVerbo}
                    verboPrevio={e.verboPrevio}
                    fotogramasEnVerbo={e.framesEnVerbo}
                    fotograma={fotograma}
                    fase={e.fase}
                    variante={varianteDe(ent)}
                    cargando={e.cargando}
                    dibujo={e.dibujo}
                    opacidad={e.opacidad}
                    semilla={ent.semilla}
                  />
                </g>
              );
            })}

          {/* Globos, tachados y polvillo (el texto va encima, en HTML). */}
          {estados
            .filter(({ent}) => ent.clase === 'texto')
            .map(({ent, estado: e}) => {
              if (!e.visible) {
                return null;
              }
              const principal = ent.acciones[0];
              return (
                <ExtrasDeTexto
                  key={ent.id}
                  ent={ent}
                  estado={e}
                  fotograma={fotograma}
                  boil={boil}
                  hablanteX={
                    principal.accion === 'bocadillo'
                      ? posicionEstatica(entidades, principal.objetivo, fotograma)[0]
                      : 0
                  }
                />
              );
            })}
        </svg>

        {/* Capa de texto cinético: rótulos, bocadillos y sellos. */}
        {estados
          .filter(({ent}) => ent.clase === 'texto')
          .map(({ent, estado: e}) =>
            e.visible ? <TextoCinetico key={ent.id} ent={ent} estado={e} fotograma={fotograma} /> : null
          )}
      </div>

      {/* SFX: bajitos, debajo de la voz. */}
      {cues.map((cue, i) => (
        <Sequence key={i} from={cue.f0} durationInFrames={45}>
          <Audio src={staticFile(`sfx/${cue.src}`)} volume={cue.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ---------- Texto cinético ----------
const TextoCinetico: React.FC<{ent: Entidad; estado: Estado; fotograma: number}> = ({
  ent,
  estado: e,
  fotograma,
}) => {
  const principal = ent.acciones[0];
  const texto = principal.texto ?? '';
  const f0 = principal.f0;
  const df = principal.df;
  const p = clamp01((fotograma - f0) / df);

  if (principal.accion === 'sello') {
    return (
      <div style={{position: 'absolute', left: e.x, top: e.y, transform: 'translate(-50%, -50%)', opacity: e.opacidad}}>
        <Sello texto={texto} impacto={f0} escala={0.85} />
      </div>
    );
  }

  const estilo = principal.estilo;
  let transform = 'translate(-50%, -50%)';
  let fuente: React.CSSProperties = {
    fontFamily: FUENTES.sans,
    fontWeight: 600,
    fontSize: 46,
    letterSpacing: '0.06em',
    color: COLORES.tinta,
  };
  let contenido: React.ReactNode;

  if (principal.accion === 'bocadillo') {
    // El globo rebota al llegar (lo dibuja el SVG); el texto se
    // escribe dentro y, si es de los que esperan, deja tres puntos
    // de "escribiendo…" dando vueltas para siempre.
    fuente = {...fuente, fontSize: 36, letterSpacing: undefined};
    const finEscritura = f0 + 8 + Math.ceil(texto.length / 1.4);
    const esperando = estilo === 'espera' && fotograma > finEscritura + 14;
    const puntoActivo = Math.floor(fotograma / 7) % 3;
    contenido = (
      <>
        <TextoEscrito texto={texto} inicio={f0 + 8} letrasPorFotograma={1.4} estilo={fuente} />
        {esperando ? (
          <span style={{...fuente, letterSpacing: '0.2em', marginLeft: 14}}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{opacity: i === puntoActivo ? 1 : 0.25}}>
                ·
              </span>
            ))}
          </span>
        ) : null}
      </>
    );
  } else if (estilo === 'caer') {
    // Cae con peso: rebota en el sitio y levanta polvillo (SVG).
    const caida = (1 - rebote(p)) * -270;
    transform = `translate(-50%, -50%) translateY(${caida}px)`;
    fuente = {...fuente, fontSize: 56, fontWeight: 700};
    contenido = <span style={fuente}>{texto}</span>;
  } else if (estilo === 'estampar') {
    // Se estampa como un sello de goma: grande → su sitio, con
    // un punto de giro y la sacudida de cámara que lo acompaña.
    const golpe = muelle(clamp01((fotograma - f0) / 9));
    transform = `translate(-50%, -50%) rotate(-2.5deg) scale(${mezcla(2.3, 1, golpe)})`;
    fuente = {...fuente, fontSize: 54, fontWeight: 700, letterSpacing: '0.12em'};
    contenido = <span style={{...fuente, opacity: fotograma >= f0 ? 1 : 0}}>{texto}</span>;
  } else if (estilo === 'titulo') {
    // Título grande en serif, se escribe solo. Para cabeceras de escena.
    fuente = {...fuente, fontFamily: FUENTES.serif, fontWeight: 700, fontSize: 82, letterSpacing: undefined};
    contenido = (
      <TextoEscrito
        texto={texto}
        inicio={f0 + 2}
        letrasPorFotograma={Math.max(0.8, texto.length / Math.max(1, df * 0.7))}
        estilo={fuente}
      />
    );
  } else if (estilo === 'pluma') {
    // A pluma: despacio, en serif, con su rasgueo de fondo.
    fuente = {...fuente, fontFamily: FUENTES.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 50};
    contenido = <TextoEscrito texto={texto} inicio={f0 + 2} letrasPorFotograma={0.55} estilo={fuente} />;
  } else {
    contenido = <TextoEscrito texto={texto} inicio={f0 + 2} letrasPorFotograma={1.4} estilo={fuente} />;
  }

  // ¿Hay un tachado pendiente? Atenúa la palabra cuando llega.
  const tachado = ent.acciones.find((a) => a.accion === 'tachar');
  const opacidadTachado = tachado && fotograma >= tachado.f0 + 6 ? 0.55 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: e.x,
        top: e.y,
        transform,
        opacity: e.opacidad * opacidadTachado,
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      {contenido}
    </div>
  );
};

// ---------- Extras SVG de los textos: globo, tachón y polvillo ----------
const ExtrasDeTexto: React.FC<{
  ent: Entidad;
  estado: Estado;
  fotograma: number;
  boil: number;
  hablanteX: number;
}> = ({ent, estado: e, fotograma, boil, hablanteX}) => {
  const principal = ent.acciones[0];
  const texto = principal.texto ?? '';
  const tachado = ent.acciones.find((a) => a.accion === 'tachar');

  const formas = useMemo(() => {
    const piezas: {forma: ReturnType<typeof lapiz.line>; progreso: number; opacidad: number}[] = [];
    const s = (n: number) => ent.semilla * 17 + n + boil * 1019;

    if (principal.accion === 'bocadillo') {
      const rx = Math.min(330, texto.length * 9 + 60);
      const rebota = muelle(clamp01((fotograma - principal.f0) / 11));
      const haciaIzquierda = hablanteX < e.x;
      // El rebote escala el globo "a mano": variando rx/ry.
      const f = 0.75 + 0.25 * rebota;
      piezas.push({
        forma: lapiz.ellipse(e.x, e.y, rx * 2 * f, 120 * f, tinta(s(3), {strokeWidth: 2.6})),
        progreso: e.dibujo,
        opacidad: e.opacidad,
      });
      piezas.push({
        forma: lapiz.path(
          haciaIzquierda
            ? `M ${e.x - rx * 0.55} ${e.y + 44} L ${e.x - rx - 40} ${e.y + 110} L ${e.x - rx * 0.25} ${e.y + 56}`
            : `M ${e.x + rx * 0.25} ${e.y + 56} L ${e.x + rx + 40} ${e.y + 110} L ${e.x + rx * 0.55} ${e.y + 44}`,
          tinta(s(5), {strokeWidth: 2.6})
        ),
        progreso: e.dibujo,
        opacidad: e.opacidad,
      });
    }

    // El tachón: un trazo decidido cruza la palabra.
    if (tachado && fotograma >= tachado.f0) {
      const ancho = texto.length * 17 + 30;
      const pT = clamp01((fotograma - tachado.f0) / 9);
      piezas.push({
        forma: lapiz.line(e.x - ancho / 2, e.y + 4, e.x + ancho / 2, e.y - 6, tinta(s(7), {strokeWidth: 6})),
        progreso: pT,
        opacidad: e.opacidad,
      });
    }

    // Polvillo del texto que cae: tres nubecitas que se abren.
    if (principal.accion === 'rotulo' && principal.estilo === 'caer') {
      const impacto = principal.f0 + Math.round(principal.df * P_PRIMER_BOTE);
      const dt = fotograma - impacto;
      if (dt >= 0 && dt < 16) {
        const abre = dt / 16;
        const radio = 10 + abre * 26;
        [-1, 0, 1].forEach((lado, i) => {
          piezas.push({
            forma: lapiz.arc(
              e.x + lado * (40 + abre * 38),
              e.y + 34,
              radio * 2,
              radio,
              Math.PI,
              Math.PI * 2,
              false,
              tinta(s(11 + i), {stroke: COLORES.tintaSuave, strokeWidth: 2.2})
            ),
            progreso: 1,
            opacidad: (1 - abre) * 0.7,
          });
        });
      }
    }
    return piezas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ent, e.x, e.y, e.dibujo, e.opacidad, fotograma, boil, hablanteX, tachado]);

  return (
    <>
      {formas.map((pieza, i) => (
        <g key={i} style={{opacity: pieza.opacidad}}>
          <Trazo forma={pieza.forma} progreso={pieza.progreso} />
        </g>
      ))}
    </>
  );
};

// Aviso amistoso si un prop del guion no existe (en desarrollo se ve
// en la consola del estudio; en render no rompe nada).
export const propExiste = (tipo: string) => tipo in PROPS;
