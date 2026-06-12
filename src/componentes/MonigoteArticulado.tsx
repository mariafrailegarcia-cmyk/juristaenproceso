// ============================================================
// MONIGOTE ARTICULADO — el personaje del canal, ahora con
// esqueleto: cabeza, tronco, brazos con codo y piernas con
// rodilla. Cada "verbo" (caminar, señalar, cargar…) define una
// postura, y entre verbos se interpola suavemente para que el
// muñeco se MUEVA en vez de cambiar de foto.
//
// La estética sigue siendo rough.js: cuando la postura cambia,
// el trazo se vuelve a generar y "hierve" ligeramente, como en
// la animación doodle clásica; cuando está quieto, el trazo es
// estable (misma semilla, misma geometría).
//
// Variantes reconocibles: Marcos lleva gafas de sol, el juez
// peluca y el Estado gorra.
// ============================================================
import React, {useMemo} from 'react';
import {COLORES} from '../tema';
import {Trazo, lapiz, relleno, tinta} from './Rough';

export type VarianteMonigote = 'gafas' | 'peluca' | 'gorra' | undefined;

// Una postura son ángulos de articulación, en grados.
// Convención: 0° = colgando recto hacia abajo; positivo = hacia
// el frente del personaje (que mira hacia la derecha del lienzo).
type Postura = {
  tronco: number; // inclinación del tronco
  cabeza: number; // inclinación extra de la cabeza
  hombroI: number;
  codoI: number;
  hombroD: number;
  codoD: number;
  caderaI: number;
  rodillaI: number;
  caderaD: number;
  rodillaD: number;
  caderaY: number; // descenso de la cadera (sentarse, agacharse)
  rotacion: number; // giro del cuerpo entero sobre los pies (caerse)
};

const PARADO: Postura = {
  tronco: 0,
  cabeza: 0,
  hombroI: -8,
  codoI: -4,
  hombroD: 9,
  codoD: 5,
  caderaI: -6,
  rodillaI: 4,
  caderaD: 7,
  rodillaD: -3,
  caderaY: 0,
  rotacion: 0,
};

const rad = (g: number) => (g * Math.PI) / 180;
const mezcla = (a: number, b: number, p: number) => a + (b - a) * p;
const mezclaPostura = (a: Postura, b: Postura, p: number): Postura => {
  const r = {} as Postura;
  (Object.keys(a) as (keyof Postura)[]).forEach((k) => {
    r[k] = mezcla(a[k], b[k], p);
  });
  return r;
};
const suaviza = (p: number) => p * p * (3 - 2 * p);

// ---------- La postura de cada verbo ----------
// Algunos verbos son fijos; otros (caminar, tambalearse) oscilan
// con el tiempo, y caerse evoluciona con su propio progreso.
export const posturaDeVerbo = (
  verbo: string,
  p: number, // progreso 0→1 dentro del verbo
  fotograma: number, // para oscilaciones continuas
  fase: number // fase del ciclo de pasos (solo caminar)
): Postura => {
  switch (verbo) {
    case 'caminar': {
      const s = Math.sin(fase);
      const doblaI = Math.max(0, -s);
      const doblaD = Math.max(0, s);
      return {
        ...PARADO,
        tronco: 4,
        caderaI: s * 26,
        rodillaI: -doblaI * 48,
        caderaD: -s * 26,
        rodillaD: -doblaD * 48,
        hombroI: -s * 18 - 4,
        codoI: -8,
        hombroD: s * 18 + 4,
        codoD: 8,
        caderaY: -Math.abs(Math.cos(fase)) * 4,
      };
    }
    case 'mirar_movil':
      return {...PARADO, cabeza: 26, tronco: 5, hombroD: 40, codoD: 100};
    case 'senalar':
      return {...PARADO, tronco: 6, cabeza: 4, hombroD: 86, codoD: 4, hombroI: -12};
    case 'cargar':
      return {...PARADO, tronco: -8, hombroI: 50, codoI: 46, hombroD: 66, codoD: 28};
    case 'entregar':
      return {...PARADO, tronco: 10, hombroD: 74, codoD: 14, hombroI: 38, codoI: 26};
    case 'celebrar':
      return {...PARADO, cabeza: -6, hombroI: -152, codoI: -10, hombroD: 160, codoD: 8};
    case 'encogerse':
      return {
        ...PARADO,
        cabeza: 6,
        tronco: -3,
        caderaY: 4,
        hombroI: -40,
        codoI: -96,
        hombroD: 44,
        codoD: 98,
      };
    case 'tambalearse': {
      const s = Math.sin(fotograma / 3.1);
      return {
        ...PARADO,
        tronco: s * 13,
        cabeza: -s * 7,
        hombroI: -70 + s * 28,
        hombroD: 76 - s * 28,
        codoI: -10,
        codoD: 10,
      };
    }
    case 'caerse': {
      const caida = suaviza(Math.min(1, p * 1.15));
      return {
        ...PARADO,
        rotacion: -84 * caida,
        hombroI: -90 * caida,
        hombroD: 110 * caida,
        rodillaI: -30 * caida,
        rodillaD: -22 * caida,
        cabeza: -14 * caida,
      };
    }
    case 'sentarse': {
      const baja = suaviza(Math.min(1, p * 1.3));
      return {
        ...PARADO,
        caderaY: 38 * baja,
        tronco: -4 * baja,
        caderaI: 80 * baja,
        rodillaI: -82 * baja,
        caderaD: 86 * baja,
        rodillaD: -88 * baja,
        hombroI: mezcla(PARADO.hombroI, 24, baja),
        hombroD: mezcla(PARADO.hombroD, 30, baja),
      };
    }
    default:
      return PARADO;
  }
};

// Medidas del esqueleto (unidades locales; de pie mide ~280 de alto,
// con los pies en y=0 y la cabeza arriba en negativo).
const TRONCO = 92;
const CUELLO_CABEZA = 36;
const RADIO_CABEZA = 33;
const BRAZO = 46;
const ANTEBRAZO = 42;
const MUSLO = 56;
const ESPINILLA = 56;
const CADERA_SUELO = MUSLO + ESPINILLA; // 112

type Punto = [number, number];
// Avanza desde un punto en una dirección medida desde "hacia abajo".
const haz = (desde: Punto, angulo: number, largo: number): Punto => [
  desde[0] + Math.sin(rad(angulo)) * largo,
  desde[1] + Math.cos(rad(angulo)) * largo,
];

// Calcula las articulaciones de una postura. Exportado para que la
// coreografía sepa dónde están las manos (cargar objetos, móvil…).
export const esqueleto = (post: Postura) => {
  const cadera: Punto = [0, -CADERA_SUELO + post.caderaY];
  const cuello = haz(cadera, 180 + post.tronco, TRONCO);
  // ojo: 180° = hacia arriba; sumar tronco inclina hacia el frente.
  const centroCabeza = haz(cuello, 180 + post.tronco + post.cabeza, CUELLO_CABEZA);
  const hombro = mezclaPunto(cuello, cadera, 0.08);
  const codoI = haz(hombro, post.tronco + post.hombroI, BRAZO);
  const manoI = haz(codoI, post.tronco + post.hombroI + post.codoI, ANTEBRAZO);
  const codoD = haz(hombro, post.tronco + post.hombroD, BRAZO);
  const manoD = haz(codoD, post.tronco + post.hombroD + post.codoD, ANTEBRAZO);
  const rodillaI = haz(cadera, post.caderaI, MUSLO);
  const pieI = haz(rodillaI, post.caderaI + post.rodillaI, ESPINILLA);
  const rodillaD = haz(cadera, post.caderaD, MUSLO);
  const pieD = haz(rodillaD, post.caderaD + post.rodillaD, ESPINILLA);
  return {cadera, cuello, centroCabeza, hombro, codoI, manoI, codoD, manoD, rodillaI, pieI, rodillaD, pieD};
};
const mezclaPunto = (a: Punto, b: Punto, p: number): Punto => [mezcla(a[0], b[0], p), mezcla(a[1], b[1], p)];

// Redondeo de la postura: si nada cambia más de ~1°, el dibujo no se
// regenera y el trazo queda quieto. En movimiento, cada cambio de
// ángulo regenera el rough y el trazo "hierve" — efecto buscado.
const cuantiza = (post: Postura): Postura => {
  const r = {} as Postura;
  (Object.keys(post) as (keyof Postura)[]).forEach((k) => {
    r[k] = Math.round(post[k] * 1.2) / 1.2;
  });
  return r;
};

export const MonigoteArticulado: React.FC<{
  verbo?: string;
  pVerbo?: number; // progreso dentro del verbo
  verboPrevio?: string; // para fundir una postura con la siguiente
  fotogramasEnVerbo?: number;
  fotograma?: number;
  fase?: number; // fase del ciclo de pasos
  variante?: VarianteMonigote;
  cargando?: boolean; // los brazos sostienen algo, haga lo que haga
  dibujo?: number; // 0→1: el personaje se dibuja
  opacidad?: number;
  semilla?: number; // distinta por personaje: trazos distintos
}> = ({
  verbo = 'parado',
  pVerbo = 1,
  verboPrevio = 'parado',
  fotogramasEnVerbo = 99,
  fotograma = 0,
  fase = 0,
  variante,
  cargando = false,
  dibujo = 1,
  opacidad = 1,
  semilla = 0,
}) => {
  // Postura actual, fundida con la anterior durante los primeros
  // fotogramas del verbo para que no haya saltos de "foto a foto".
  const fusion = Math.min(1, fotogramasEnVerbo / 10);
  let post = mezclaPostura(
    posturaDeVerbo(verboPrevio, 1, fotograma, fase),
    posturaDeVerbo(verbo, pVerbo, fotograma, fase),
    suaviza(fusion)
  );
  if (cargando) {
    const brazos = posturaDeVerbo('cargar', 1, fotograma, fase);
    post = {...post, hombroI: brazos.hombroI, codoI: brazos.codoI, hombroD: brazos.hombroD, codoD: brazos.codoD, tronco: post.tronco + brazos.tronco * 0.5};
  }
  post = cuantiza(post);

  const clave = JSON.stringify(post) + verbo + (variante ?? '');
  const piezas = useMemo(() => {
    const e = esqueleto(post);
    const s = (n: number) => semilla * 13 + n;
    const formas = [
      lapiz.circle(e.centroCabeza[0], e.centroCabeza[1], RADIO_CABEZA * 2, tinta(s(37))),
      lapiz.line(e.cuello[0], e.cuello[1], e.cadera[0], e.cadera[1], tinta(s(39))),
      lapiz.linearPath([e.hombro, e.codoI, e.manoI] as [number, number][], tinta(s(41))),
      lapiz.linearPath([e.hombro, e.codoD, e.manoD] as [number, number][], tinta(s(43))),
      lapiz.linearPath([e.cadera, e.rodillaI, e.pieI] as [number, number][], tinta(s(61))),
      lapiz.linearPath([e.cadera, e.rodillaD, e.pieD] as [number, number][], tinta(s(67))),
    ];

    // Accesorios de la variante, dibujados sobre la cabeza.
    const [cx, cy] = e.centroCabeza;
    const lado = 1; // el personaje "mira" hacia +x; voltear lo hace el grupo
    if (variante === 'gafas') {
      formas.push(
        lapiz.circle(cx + 8 * lado, cy - 2, 17, tinta(s(71), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx + 26 * lado, cy - 4, 15, tinta(s(73), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.line(cx + 8 * lado, cy - 8, cx - 26 * lado, cy - 12, tinta(s(79), {strokeWidth: 2}))
      );
    } else if (variante === 'peluca') {
      // Peluca de juez: rulos arriba y dos tiras de bucles a los lados.
      formas.push(
        lapiz.circle(cx - 16, cy - RADIO_CABEZA + 2, 20, tinta(s(81), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx + 2, cy - RADIO_CABEZA - 4, 20, tinta(s(83), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx + 20, cy - RADIO_CABEZA + 2, 20, tinta(s(87), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx - 30, cy - 8, 16, tinta(s(89), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx - 32, cy + 8, 14, tinta(s(91), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2}))
      );
    } else if (variante === 'gorra') {
      formas.push(
        lapiz.arc(cx, cy - 10, RADIO_CABEZA * 2 + 10, RADIO_CABEZA * 2 + 6, Math.PI, Math.PI * 2, true, relleno(s(93), COLORES.ambar, {strokeWidth: 2.4})),
        lapiz.line(cx + 2, cy - 24, cx + 46 * lado, cy - 22, tinta(s(97), {strokeWidth: 3}))
      );
    }

    // El móvil en la mano cuando el verbo lo pide.
    if (verbo === 'mirar_movil') {
      formas.push(lapiz.rectangle(e.manoD[0] - 8, e.manoD[1] - 16, 18, 30, tinta(s(101), {strokeWidth: 2})));
    }
    return formas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, semilla]);

  // El personaje se dibuja por partes, como el monigote clásico.
  const tramo = 1 / piezas.length;
  return (
    <g
      style={{opacity: opacidad}}
      transform={post.rotacion !== 0 ? `rotate(${post.rotacion})` : undefined}
    >
      {piezas.map((forma, i) => {
        const propio = Math.min(1, Math.max(0, (dibujo - i * tramo) / tramo));
        return <Trazo key={i} forma={forma} progreso={propio} />;
      })}
    </g>
  );
};
