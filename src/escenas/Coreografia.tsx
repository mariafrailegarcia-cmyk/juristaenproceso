// ============================================================
// COREOGRAFÍA — el intérprete de mini-películas doodle.
//
// Recibe la lista de acciones del guion ({actor/prop/texto,
// accion, t, …}) y, fotograma a fotograma, calcula el estado de
// cada entidad: dónde está, qué postura tiene, cuánto lleva
// dibujado. El código no sabe nada del expediente concreto:
// toda la puesta en escena vive en el JSON.
//
// El tiempo "t" de cada acción es una fracción de la locución
// (0 → empieza la voz, 1 → termina): los audios grabados mandan.
// ============================================================
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORES, FPS, FUENTES} from '../tema';
import type {Accion} from '../tipos';
import {MonigoteArticulado, VarianteMonigote} from '../componentes/MonigoteArticulado';
import {PROPS, PropDoodle, tipoDeProp} from '../componentes/PropsDoodle';
import {Sello} from '../componentes/Sello';
import {TextoEscrito} from '../componentes/TextoEscrito';
import {Trazo, lapiz, tinta} from '../componentes/Rough';

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
};

// Verbos que cambian la postura o el sitio: marcan el final de la
// pose anterior cuando esta no declaró duración.
const CAMBIAN_POSTURA = new Set([
  'caminar', 'moverse', 'mirar_movil', 'senalar', 'cargar', 'entregar', 'soltar',
  'celebrar', 'encogerse', 'tambalearse', 'caerse', 'sentarse', 'desaparecer', 'parado',
]);
// Poses que se mantienen indefinidamente si no se les da duración.
const POSES_SOSTENIDAS = new Set([
  'mirar_movil', 'senalar', 'celebrar', 'encogerse', 'tambalearse', 'caerse', 'sentarse', 'parado',
]);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const suaviza = (p: number) => p * p * (3 - 2 * p);
const mezcla = (a: number, b: number, p: number) => a + (b - a) * p;

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
  acciones.forEach((a, i) => {
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
        a.df = Math.round((DUR_DEFECTO[a.accion] ?? 0.8) * FPS);
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
    dibujo: ent.acciones.some((a) => a.accion === 'aparecer' || a.accion === 'rotulo' || a.accion === 'bocadillo' || a.accion === 'sello') ? 0 : 1,
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
        const pm = a.accion === 'caminar' ? p : suaviza(p);
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
        }
        if (a.accion === 'cerrarse_sobre') {
          e.escala = e.escala * (1 + 0.35 * (1 - suaviza(p)));
          const trasGolpe = f - (a.f0 + a.df);
          if (trasGolpe >= 0 && trasGolpe < 9) {
            e.x += Math.sin(trasGolpe * 2.4) * 5 * (1 - trasGolpe / 9);
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
        break;
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

// ---------- 4. El componente de escena ----------
export const VisualCoreografia: React.FC<{
  acciones: Accion[];
  duracion: number; // frames de la escena (los manda el audio)
}> = ({acciones, duracion}) => {
  const fotograma = useCurrentFrame();

  const entidades = useMemo(() => agruparEntidades(acciones, duracion), [acciones, duracion]);
  const cargas = useMemo(() => indiceDeCargas(entidades, duracion), [entidades, duracion]);
  const suelo = useMemo(
    () => lapiz.line(140, 906, 1780, 906, tinta(7, {stroke: COLORES.tintaSuave, strokeWidth: 2})),
    []
  );

  const estados = entidades.map((ent) => ({
    ent,
    estado: resolverEstado(entidades, ent, fotograma, cargas),
  }));
  const hayActores = entidades.some((e) => e.clase === 'actor');

  return (
    <AbsoluteFill>
      <svg
        viewBox="0 0 1920 1080"
        style={{position: 'absolute', width: '100%', height: '100%', overflow: 'visible'}}
      >
        {hayActores ? <Trazo forma={suelo} progreso={clamp01(fotograma / 22)} /> : null}

        {/* Props primero (quedan detrás de los actores). */}
        {estados
          .filter(({ent}) => ent.clase === 'prop')
          .map(({ent, estado: e}) =>
            e.visible ? (
              <g
                key={ent.id}
                transform={`translate(${e.x} ${e.y}) scale(${e.voltear ? -e.escala : e.escala} ${e.escala})`}
              >
                <PropDoodle tipo={ent.tipo} semilla={ent.semilla} dibujo={e.dibujo} opacidad={e.opacidad} />
              </g>
            ) : null
          )}

        {estados
          .filter(({ent}) => ent.clase === 'actor')
          .map(({ent, estado: e}) =>
            e.visible ? (
              <g
                key={ent.id}
                transform={`translate(${e.x} ${e.y}) scale(${e.voltear ? -e.escala : e.escala} ${e.escala})`}
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
            ) : null
          )}

        {/* Globos de los bocadillos (el texto va encima, en HTML). */}
        {estados
          .filter(({ent}) => ent.clase === 'texto')
          .map(({ent, estado: e}) => {
            const accion = ent.acciones[0];
            if (accion.accion !== 'bocadillo' || !e.visible) {
              return null;
            }
            return (
              <Globo
                key={ent.id}
                texto={accion.texto ?? ''}
                x={e.x}
                y={e.y}
                hablanteX={posicionEstatica(entidades, accion.objetivo, fotograma)[0]}
                dibujo={e.dibujo}
                opacidad={e.opacidad}
                semilla={ent.semilla}
              />
            );
          })}
      </svg>

      {/* Capa de texto: rótulos cortos, bocadillos y sellos. */}
      {estados
        .filter(({ent}) => ent.clase === 'texto')
        .map(({ent, estado: e}) => {
          const accion = ent.acciones[0];
          const texto = accion.texto ?? '';
          if (!e.visible) {
            return null;
          }
          if (accion.accion === 'sello') {
            return (
              <div key={ent.id} style={{position: 'absolute', left: e.x, top: e.y, transform: 'translate(-50%, -50%)', opacity: e.opacidad}}>
                <Sello texto={texto} impacto={e.f0Texto} escala={0.85} />
              </div>
            );
          }
          // Rótulo (y texto del bocadillo): pocas palabras, a mano.
          const esBocadillo = accion.accion === 'bocadillo';
          return (
            <div
              key={ent.id}
              style={{
                position: 'absolute',
                left: e.x,
                top: esBocadillo ? e.y : e.y,
                transform: 'translate(-50%, -50%)',
                opacity: e.opacidad,
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              <TextoEscrito
                texto={texto}
                inicio={e.f0Texto + (esBocadillo ? 8 : 2)}
                letrasPorFotograma={1.4}
                estilo={{
                  fontFamily: FUENTES.sans,
                  fontWeight: 600,
                  fontSize: esBocadillo ? 36 : 46,
                  letterSpacing: esBocadillo ? undefined : '0.06em',
                  color: COLORES.tinta,
                }}
              />
            </div>
          );
        })}
    </AbsoluteFill>
  );
};

// El globo de diálogo: elipse rough con rabito hacia quien habla.
const Globo: React.FC<{
  texto: string;
  x: number;
  y: number;
  hablanteX: number;
  dibujo: number;
  opacidad: number;
  semilla: number;
}> = ({texto, x, y, hablanteX, dibujo, opacidad, semilla}) => {
  const rx = Math.min(330, texto.length * 9 + 60);
  const haciaIzquierda = hablanteX < x;
  const formas = useMemo(
    () => ({
      globo: lapiz.ellipse(x, y, rx * 2, 120, tinta(semilla * 17 + 3, {strokeWidth: 2.6})),
      rabito: lapiz.path(
        haciaIzquierda
          ? `M ${x - rx * 0.55} ${y + 44} L ${x - rx - 40} ${y + 110} L ${x - rx * 0.25} ${y + 56}`
          : `M ${x + rx * 0.25} ${y + 56} L ${x + rx + 40} ${y + 110} L ${x + rx * 0.55} ${y + 44}`,
        tinta(semilla * 17 + 5, {strokeWidth: 2.6})
      ),
    }),
    [x, y, rx, haciaIzquierda, semilla]
  );
  return (
    <g style={{opacity: opacidad}}>
      <Trazo forma={formas.rabito} progreso={dibujo} />
      <Trazo forma={formas.globo} progreso={dibujo} />
    </g>
  );
};

// Aviso amistoso si un prop del guion no existe (en desarrollo se ve
// en la consola del estudio; en render no rompe nada).
export const propExiste = (tipo: string) => tipo in PROPS;
