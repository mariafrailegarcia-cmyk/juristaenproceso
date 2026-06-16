// ============================================================
// MONIGOTE ARTICULADO — el personaje del canal.
// Monigote sencillo: cabeza, tronco, brazos y piernas en líneas.
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
    case 'desinflarse':
      return {...PARADO, cabeza: 38, tronco: 9, caderaY: 7, hombroD: 32, codoD: 92, hombroI: -2, codoI: -2};
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
  r.tronco += Math.sin(f / 52) * 1.7 * peso;
  r.cabeza += Math.sin(f / 43 + 1.2) * 1.5 * peso;
  r.caderaY += (Math.sin(f / 64) * 0.5 + 0.5) * 2.2 * peso;
  r.caderaI += Math.sin(f / 64) * 2.4 * peso;
  r.caderaD -= Math.sin(f / 64) * 2.4 * peso;
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
      r.hombroD = mezcla(r.hombroD, 36, sube);
      r.codoD = mezcla(r.codoD, 118, sube);
      r.cabeza += sube * -4;
    }
  }
  return r;
};

const TRONCO = 92;
const CUELLO_CABEZA = 36;
const RADIO_CABEZA = 33;
const BRAZO = 46;
const ANTEBRAZO = 42;
const MUSLO = 56;
const ESPINILLA = 56;
const CADERA_SUELO = MUSLO + ESPINILLA; // 112

type Punto = [number, number];
const haz = (desde: Punto, angulo: number, largo: number): Punto => [
  desde[0] + Math.sin(rad(angulo)) * largo,
  desde[1] + Math.cos(rad(angulo)) * largo,
];

export const esqueleto = (post: Postura) => {
  const cadera: Punto = [0, -CADERA_SUELO + post.caderaY];
  const cuello = haz(cadera, 180 + post.tronco, TRONCO);
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

const cuantiza = (post: Postura): Postura => {
  const r = {} as Postura;
  (Object.keys(post) as (keyof Postura)[]).forEach((k) => {
    r[k] = Math.round(post[k] * 1.2) / 1.2;
  });
  return r;
};

const CON_MOVIL_EN_MANO = new Set(['mirar_movil', 'desinflarse']);

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
    post = {...post, hombroI: brazos.hombroI, codoI: brazos.codoI, hombroD: brazos.hombroD, codoD: brazos.codoD, tronco: post.tronco + brazos.tronco * 0.5};
  }
  post = cuantiza(post);

  const cicloParpadeo = (fotograma + semilla * 61) % 104;
  const ojosCerrados = cicloParpadeo < 4;

  const clave = JSON.stringify(post) + verbo + (variante ?? '') + boil + (ojosCerrados ? 'X' : '');
  const piezas = useMemo(() => {
    const e = esqueleto(post);
    const s = (n: number) => semilla * 13 + n + boil * 1013;
    const formas = [
      lapiz.circle(e.centroCabeza[0], e.centroCabeza[1], RADIO_CABEZA * 2, tinta(s(37))),
      lapiz.line(e.cuello[0], e.cuello[1], e.cadera[0], e.cadera[1], tinta(s(39))),
      lapiz.linearPath([e.hombro, e.codoI, e.manoI] as [number, number][], tinta(s(41))),
      lapiz.linearPath([e.hombro, e.codoD, e.manoD] as [number, number][], tinta(s(43))),
      lapiz.linearPath([e.cadera, e.rodillaI, e.pieI] as [number, number][], tinta(s(61))),
      lapiz.linearPath([e.cadera, e.rodillaD, e.pieD] as [number, number][], tinta(s(67))),
    ];

    const [cx, cy] = e.centroCabeza;
    const giroCabeza = post.tronco + post.cabeza;
    if (variante !== 'gafas') {
      const ojoY = cy - 4 + giroCabeza * 0.35;
      if (ojosCerrados) {
        formas.push(
          lapiz.line(6 + cx, ojoY, 13 + cx, ojoY + 1, tinta(s(33), {strokeWidth: 2.2})),
          lapiz.line(20 + cx, ojoY, 27 + cx, ojoY + 1, tinta(s(34), {strokeWidth: 2.2}))
        );
      } else {
        formas.push(
          lapiz.circle(cx + 10, ojoY, 5, tinta(s(33), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.6})),
          lapiz.circle(cx + 24, ojoY, 5, tinta(s(34), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 1.6}))
        );
      }
    }

    if (variante === 'gafas') {
      formas.push(
        lapiz.circle(cx + 8, cy - 2, 17, tinta(s(71), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.circle(cx + 26, cy - 4, 15, tinta(s(73), {fill: COLORES.tinta, fillStyle: 'solid', strokeWidth: 2})),
        lapiz.line(cx + 8, cy - 8, cx - 26, cy - 12, tinta(s(79), {strokeWidth: 2}))
      );
    } else if (variante === 'peluca') {
      // Peluca de juez, en azul tinta lavada (acuarela desvaída).
      const rulo = (sd: number) => relleno(sd, COLORES.azulLavado, {fillStyle: 'hachure', hachureGap: 5, fillWeight: 0.9, strokeWidth: 2});
      formas.push(
        lapiz.circle(cx - 16, cy - RADIO_CABEZA + 2, 20, rulo(s(81))),
        lapiz.circle(cx + 2, cy - RADIO_CABEZA - 4, 20, rulo(s(83))),
        lapiz.circle(cx + 20, cy - RADIO_CABEZA + 2, 20, rulo(s(87))),
        lapiz.circle(cx - 30, cy - 8, 16, rulo(s(89))),
        lapiz.circle(cx - 32, cy + 8, 14, rulo(s(91)))
      );
    } else if (variante === 'gorra') {
      formas.push(
        lapiz.arc(cx, cy - 10, RADIO_CABEZA * 2 + 10, RADIO_CABEZA * 2 + 6, Math.PI, Math.PI * 2, true, relleno(s(93), COLORES.ambar, {strokeWidth: 2.4})),
        lapiz.line(cx + 2, cy - 24, cx + 46, cy - 22, tinta(s(97), {strokeWidth: 3}))
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
