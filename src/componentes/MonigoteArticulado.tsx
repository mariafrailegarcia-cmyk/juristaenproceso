// ============================================================
// MONIGOTE ARTICULADO — personaje editorial del canal.
//
// Estética: ilustración editorial monocroma. Cuerpo holgado y
// redondeado con masa negra sólida, cabeza pequeña, cuello largo,
// zapatos, manos y detalle de solapa/cuello de prenda.
// ============================================================
import React, {useMemo} from 'react';
import {COLORES} from '../tema';
import {Trazo, lapiz, relleno, tinta, usarBoil} from './Rough';

export type VarianteMonigote = 'gafas' | 'peluca' | 'gorra' | undefined;

type Postura = {
  tronco: number;
  cabeza: number;
  hombroI: number;
  codoI: number;
  hombroD: number;
  codoD: number;
  caderaI: number;
  rodillaI: number;
  caderaD: number;
  rodillaD: number;
  caderaY: number;
  rotacion: number;
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

export const posturaDeVerbo = (
  verbo: string,
  p: number,
  fotograma: number,
  fase: number
): Postura => {
  switch (verbo) {
    case 'caminar': {
      const s = Math.sin(fase);
      const doblaI = Math.max(0, -s);
      const doblaD = Math.max(0, s);
      return {
        ...PARADO,
        tronco: 5,
        caderaI: s * 28,
        rodillaI: -doblaI * 52,
        caderaD: -s * 28,
        rodillaD: -doblaD * 52,
        hombroI: -s * 22 - 4,
        codoI: -10,
        hombroD: s * 22 + 4,
        codoD: 10,
        caderaY: -Math.abs(Math.cos(fase)) * 5,
      };
    }
    case 'mirar_movil':
      return {...PARADO, cabeza: 28, tronco: 6, hombroD: 42, codoD: 104};
    case 'desinflarse':
      return {...PARADO, cabeza: 40, tronco: 10, caderaY: 8, hombroD: 34, codoD: 96, hombroI: -3, codoI: -3};
    case 'senalar':
      return {...PARADO, tronco: 7, cabeza: 5, hombroD: 90, codoD: 2, hombroI: -14};
    case 'cargar':
      return {...PARADO, tronco: -10, hombroI: 52, codoI: 48, hombroD: 68, codoD: 30};
    case 'entregar':
      return {...PARADO, tronco: 12, hombroD: 78, codoD: 12, hombroI: 40, codoI: 28};
    case 'celebrar':
      return {...PARADO, cabeza: -8, hombroI: -156, codoI: -8, hombroD: 164, codoD: 6};
    case 'encogerse':
      return {
        ...PARADO,
        cabeza: 8,
        tronco: -4,
        caderaY: 5,
        hombroI: -42,
        codoI: -100,
        hombroD: 46,
        codoD: 102,
      };
    case 'tambalearse': {
      const s = Math.sin(fotograma / 3.1);
      return {
        ...PARADO,
        tronco: s * 14,
        cabeza: -s * 8,
        hombroI: -72 + s * 30,
        hombroD: 78 - s * 30,
        codoI: -12,
        codoD: 12,
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
        caderaY: 42 * baja,
        tronco: -5 * baja,
        caderaI: 84 * baja,
        rodillaI: -86 * baja,
        caderaD: 90 * baja,
        rodillaD: -92 * baja,
        hombroI: mezcla(PARADO.hombroI, 26, baja),
        hombroD: mezcla(PARADO.hombroD, 32, baja),
      };
    }
    default:
      return PARADO;
  }
};

const VERBOS_CON_IDLE = new Set(['parado', 'mirar_movil', 'desinflarse', 'senalar', 'encogerse']);
const aplicarIdle = (
  post: Postura,
  verbo: string,
  fotograma: number,
  semilla: number,
  variante: VarianteMonigote,
  peso: number
): Postura => {
  if (!VERBOS_CON_IDLE.has(verbo) || peso <= 0) return post;
  const f = fotograma + semilla * 37;
  const r = {...post};
  r.tronco += Math.sin(f / 52) * 1.8 * peso;
  r.cabeza += Math.sin(f / 43 + 1.2) * 1.6 * peso;
  r.caderaY += (Math.sin(f / 64) * 0.5 + 0.5) * 2.4 * peso;
  r.caderaI += Math.sin(f / 64) * 2.6 * peso;
  r.caderaD -= Math.sin(f / 64) * 2.6 * peso;
  const tap = (f + 40) % 160;
  if (tap < 28 && verbo === 'parado') {
    const golpe = Math.abs(Math.sin((tap / 28) * Math.PI * 3));
    r.caderaD += golpe * 5 * peso;
    r.rodillaD -= golpe * 7 * peso;
  }
  if (variante === 'gafas' && (verbo === 'parado' || verbo === 'encogerse')) {
    const ciclo = (f + 90) % 230;
    if (ciclo < 34) {
      const sube = Math.sin((ciclo / 34) * Math.PI) * peso;
      r.hombroD = mezcla(r.hombroD, 38, sube);
      r.codoD = mezcla(r.codoD, 122, sube);
      r.cabeza += sube * -4;
    }
  }
  return r;
};

// Proporciones editoriales: figura alta, cuello largo, cabeza pequeña.
const TRONCO = 114;
const CUELLO_CABEZA = 50;
const RADIO_CABEZA = 26;
const BRAZO = 62;
const ANTEBRAZO = 56;
const MUSLO = 78;
const ESPINILLA = 74;
const CADERA_SUELO = MUSLO + ESPINILLA; // 152

type Punto = [number, number];
const haz = (desde: Punto, angulo: number, largo: number): Punto => [
  desde[0] + Math.sin(rad(angulo)) * largo,
  desde[1] + Math.cos(rad(angulo)) * largo,
];

export const esqueleto = (post: Postura) => {
  const cadera: Punto = [0, -CADERA_SUELO + post.caderaY];
  const cuello = haz(cadera, 180 + post.tronco, TRONCO);
  const centroCabeza = haz(cuello, 180 + post.tronco + post.cabeza, CUELLO_CABEZA);
  const hombro = mezclaPunto(cuello, cadera, 0.07);
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

const cuantiza = (post: Postura): Postura => {
  const r = {} as Postura;
  (Object.keys(post) as (keyof Postura)[]).forEach((k) => {
    r[k] = Math.round(post[k] * 1.2) / 1.2;
  });
  return r;
};

const CON_MOVIL_EN_MANO = new Set(['mirar_movil', 'desinflarse']);

// Torso holgado: contorno curvo con Q-bezier para un silhouette
// orgánico, no un rectángulo rígido. Forma de chaqueta suelta.
const torsoSVGPath = (e: ReturnType<typeof esqueleto>): string => {
  const dx = e.hombro[0] - e.cadera[0];
  const dy = e.hombro[1] - e.cadera[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // perpendicular al eje del tronco
  const ny = dx / len;

  // Cuatro esquinas: hombros anchos, caderas algo más estrechas.
  const wTop = 50;   // ancho medio hombros (lado a lado: 100u)
  const wMid = 54;   // pecho: ligeramente más ancho por el vuelo
  const wBot = 32;   // cadera: más estrecho que hombros

  const f = (n: number) => n.toFixed(1);
  // Esquinas
  const tlx = e.hombro[0] + nx * wTop; const tly = e.hombro[1] + ny * wTop;
  const trx = e.hombro[0] - nx * wTop; const try_ = e.hombro[1] - ny * wTop;
  const blx = e.cadera[0] + nx * wBot; const bly = e.cadera[1] + ny * wBot;
  const brx = e.cadera[0] - nx * wBot; const bry = e.cadera[1] - ny * wBot;
  // Control points para las curvas laterales (zona pecho, 35% del tronco)
  const midX = e.hombro[0] + (e.cadera[0] - e.hombro[0]) * 0.35;
  const midY = e.hombro[1] + (e.cadera[1] - e.hombro[1]) * 0.35;
  const mlx = midX + nx * wMid; const mly = midY + ny * wMid;
  const mrx = midX - nx * wMid; const mry = midY - ny * wMid;

  // Q cx cy x y = bezier cuadrático: el punto de control (cx,cy) hace que
  // el lado se curve ligeramente hacia afuera, dando aire de ropa holgada.
  return (
    `M ${f(tlx)} ${f(tly)} ` +
    `Q ${f(mlx)} ${f(mly)} ${f(blx)} ${f(bly)} ` +
    `L ${f(brx)} ${f(bry)} ` +
    `Q ${f(mrx)} ${f(mry)} ${f(trx)} ${f(try_)} ` +
    `Z`
  );
};

// Zapato: barra corta perpendicular a la pierna en el extremo del pie.
const zapato = (pie: Punto, rodilla: Punto, s: (n: number) => number, seed: number) => {
  const dx = pie[0] - rodilla[0];
  const dy = pie[1] - rodilla[1];
  const dist = Math.hypot(dx, dy) || 1;
  // Perpendicular apuntando "hacia delante" del personaje
  const nx = dy / dist;
  const ny = -dx / dist;
  const heel: Punto = [pie[0] - nx * 7, pie[1] - ny * 7];
  const toe: Punto  = [pie[0] + nx * 22, pie[1] + ny * 22];
  return lapiz.linearPath([heel, toe] as [number, number][], tinta(s(seed), {strokeWidth: 6.5}));
};

export const MonigoteArticulado: React.FC<{
  verbo?: string;
  pVerbo?: number;
  verboPrevio?: string;
  fotogramasEnVerbo?: number;
  fotograma?: number;
  fase?: number;
  variante?: VarianteMonigote;
  cargando?: boolean;
  dibujo?: number;
  opacidad?: number;
  semilla?: number;
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
  const boil = usarBoil();

  const fusion = suaviza(Math.min(1, fotogramasEnVerbo / 10));
  let post = mezclaPostura(
    posturaDeVerbo(verboPrevio, 1, fotograma, fase),
    posturaDeVerbo(verbo, pVerbo, fotograma, fase),
    fusion
  );
  post = aplicarIdle(post, verbo, fotograma, semilla, variante, fusion);
  if (cargando) {
    const brazos = posturaDeVerbo('cargar', 1, fotograma, fase);
    post = {
      ...post,
      hombroI: brazos.hombroI, codoI: brazos.codoI,
      hombroD: brazos.hombroD, codoD: brazos.codoD,
      tronco: post.tronco + brazos.tronco * 0.5,
    };
  }
  post = cuantiza(post);

  const cicloParpadeo = (fotograma + semilla * 61) % 104;
  const ojosCerrados = cicloParpadeo < 4;

  const clave = JSON.stringify(post) + verbo + (variante ?? '') + boil + (ojosCerrados ? 'X' : '');
  const piezas = useMemo(() => {
    const e = esqueleto(post);
    const s = (n: number) => semilla * 13 + n + boil * 1013;

    // Orden SVG: piernas y zapatos detrás → cuerpo → brazos →
    // manos → cuello/solapa → cabeza → ojos → accesorios.
    const formas = [
      // Piernas (detrás del cuerpo)
      lapiz.linearPath([e.cadera, e.rodillaI, e.pieI] as [number, number][], tinta(s(61), {strokeWidth: 5.5})),
      lapiz.linearPath([e.cadera, e.rodillaD, e.pieD] as [number, number][], tinta(s(67), {strokeWidth: 5.5})),
      // Zapatos: barra perpendicular al pie
      zapato(e.pieI, e.rodillaI, s, 63),
      zapato(e.pieD, e.rodillaD, s, 69),
      // Cuerpo holgado con path curvo (Q-bezier)
      lapiz.path(
        torsoSVGPath(e),
        relleno(s(38), COLORES.tinta, {fillStyle: 'solid', strokeWidth: 1.4, roughness: 0.9})
      ),
      // Brazos (sobre el cuerpo)
      lapiz.linearPath([e.hombro, e.codoI, e.manoI] as [number, number][], tinta(s(41), {strokeWidth: 4.2})),
      lapiz.linearPath([e.hombro, e.codoD, e.manoD] as [number, number][], tinta(s(43), {strokeWidth: 4.2})),
      // Manos: pequeño círculo relleno en cada extremo de brazo
      lapiz.circle(e.manoI[0], e.manoI[1], 9, tinta(s(45), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.4})),
      lapiz.circle(e.manoD[0], e.manoD[1], 9, tinta(s(47), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.4})),
      // Detalle de solapa/cuello: V marfil sobre el torso
      (() => {
        const dx = e.hombro[0] - e.cadera[0];
        const dy = e.hombro[1] - e.cadera[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len; const ny = dx / len;
        const vx = e.hombro[0] + (e.cadera[0] - e.hombro[0]) * 0.16;
        const vy = e.hombro[1] + (e.cadera[1] - e.hombro[1]) * 0.16;
        const f = (n: number) => n.toFixed(1);
        return lapiz.path(
          `M ${f(e.hombro[0] + nx * 17)} ${f(e.hombro[1] + ny * 17)} L ${f(vx)} ${f(vy)} L ${f(e.hombro[0] - nx * 17)} ${f(e.hombro[1] - ny * 17)}`,
          tinta(s(44), {stroke: COLORES.fondo, strokeWidth: 2.4, roughness: 0.7})
        );
      })(),
      // Cabeza — encima de todo
      lapiz.circle(e.centroCabeza[0], e.centroCabeza[1], RADIO_CABEZA * 2, tinta(s(37), {strokeWidth: 2.4})),
    ];

    const [cx, cy] = e.centroCabeza;
    const giroCabeza = post.tronco + post.cabeza;

    if (variante !== 'gafas') {
      const ojoY = cy - 3 + giroCabeza * 0.35;
      if (ojosCerrados) {
        formas.push(
          lapiz.line(5 + cx, ojoY, 11 + cx, ojoY + 1, tinta(s(33), {strokeWidth: 2})),
          lapiz.line(17 + cx, ojoY, 23 + cx, ojoY + 1, tinta(s(34), {strokeWidth: 2}))
        );
      } else {
        formas.push(
          lapiz.circle(cx + 8, ojoY, 4.5, tinta(s(33), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.4})),
          lapiz.circle(cx + 20, ojoY, 4.5, tinta(s(34), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.4}))
        );
      }
    }

    if (variante === 'gafas') {
      formas.push(
        lapiz.circle(cx + 7, cy - 1, 16, tinta(s(71), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.8})),
        lapiz.circle(cx + 23, cy - 3, 14, tinta(s(73), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.8})),
        lapiz.line(cx + 7, cy - 7, cx - 22, cy - 11, tinta(s(79), {strokeWidth: 1.8}))
      );
    } else if (variante === 'peluca') {
      formas.push(
        lapiz.circle(cx - 16, cy - RADIO_CABEZA + 2, 20, tinta(s(81), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx + 2, cy - RADIO_CABEZA - 4, 20, tinta(s(83), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx + 20, cy - RADIO_CABEZA + 2, 20, tinta(s(87), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx - 28, cy - 6, 15, tinta(s(89), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx - 30, cy + 8, 13, tinta(s(91), {fill: COLORES.fondo, fillStyle: 'solid', strokeWidth: 2}))
      );
    } else if (variante === 'gorra') {
      formas.push(
        lapiz.arc(cx, cy - 8, RADIO_CABEZA * 2 + 10, RADIO_CABEZA * 2 + 6, Math.PI, Math.PI * 2, true,
          relleno(s(93), COLORES.ambar, {strokeWidth: 2.2})),
        lapiz.line(cx + 2, cy - 22, cx + 44, cy - 20, tinta(s(97), {strokeWidth: 3}))
      );
    }

    if (CON_MOVIL_EN_MANO.has(verbo)) {
      formas.push(lapiz.rectangle(e.manoD[0] - 8, e.manoD[1] - 16, 18, 30, tinta(s(101), {strokeWidth: 2})));
    }
    return formas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, semilla]);

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
