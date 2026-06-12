// ============================================================
// PROPS DOODLE — la utilería del canal: billete, móvil, palmera,
// tele, coche, taburete… Cada prop se define con sus trazos
// rough.js en coordenadas locales (centrado en 0,0) y entra en
// escena dibujándose; sale desvaneciéndose o "borrándose"
// (el trazo se des-dibuja).
//
// Para añadir un prop nuevo: una función más en PROPS. Los
// guiones lo usan por nombre: {"prop": "candado", ...}.
// ============================================================
import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import type {Drawable} from 'roughjs/bin/core';
import {COLORES, FUENTES} from '../tema';
import {Trazo, lapiz, relleno, tinta, usarBoil} from './Rough';

// Texto pequeño DENTRO de un dibujo (el "€" del billete, el "✓✓"
// del móvil): cifras y símbolos, nunca frases.
type TextoDeProp = {x: number; y: number; texto: string; tamano: number; color?: string; serif?: boolean};

type Dibujo = {formas: Drawable[]; textos?: TextoDeProp[]};
type Fabrica = (s: (n: number) => number) => Dibujo;

export const PROPS: Record<string, Fabrica> = {
  billete: (s) => ({
    // Billete editorial: rectángulo limpio con medallón central.
    formas: [
      lapiz.rectangle(-88, -46, 176, 92, relleno(s(1), COLORES.ambar, {fillStyle: 'hachure', hachureGap: 14, fillWeight: 0.8, strokeWidth: 2.6})),
      lapiz.rectangle(-72, -32, 144, 64, tinta(s(2), {strokeWidth: 1.6})),
      lapiz.circle(0, 0, 44, tinta(s(3), {strokeWidth: 2})),
    ],
    textos: [{x: 0, y: 0, texto: '€', tamano: 32, serif: true}],
  }),

  movil: (s) => ({
    // Móvil limpio: pantalla con dos burbujas de mensaje (enviado y recibido).
    formas: [
      lapiz.rectangle(-52, -90, 104, 180, tinta(s(1), {strokeWidth: 3.2})),
      lapiz.line(-18, 72, 18, 72, tinta(s(2), {strokeWidth: 2.2})),
      // Burbuja enviada (derecha)
      lapiz.rectangle(-6, -58, 46, 26, tinta(s(3), {strokeWidth: 2})),
      // Burbuja recibida (izquierda)
      lapiz.rectangle(-42, -18, 46, 26, tinta(s(4), {strokeWidth: 2})),
      // Burbuja con "visto" ámbar
      lapiz.rectangle(-6, 20, 46, 26, tinta(s(5), {strokeWidth: 2})),
    ],
    textos: [{x: 18, y: 33, texto: '✓✓', tamano: 22, color: COLORES.ambar}],
  }),

  palmera: (s) => ({
    formas: [
      lapiz.path('M -6 150 C 4 60 8 -20 34 -120', tinta(s(1), {strokeWidth: 5})),
      lapiz.path('M 34 -120 C 80 -150 130 -148 168 -118', tinta(s(2), {strokeWidth: 3})),
      lapiz.path('M 34 -120 C 76 -106 110 -82 128 -48', tinta(s(3), {strokeWidth: 3})),
      lapiz.path('M 34 -120 C -10 -152 -64 -150 -100 -122', tinta(s(4), {strokeWidth: 3})),
      lapiz.path('M 34 -120 C -8 -106 -42 -84 -58 -52', tinta(s(5), {strokeWidth: 3})),
      lapiz.path('M 34 -120 C 30 -160 18 -184 -6 -196', tinta(s(6), {strokeWidth: 3})),
      lapiz.circle(16, -106, 22, tinta(s(7), {strokeWidth: 2})),
      lapiz.circle(44, -98, 20, tinta(s(8), {strokeWidth: 2})),
      lapiz.line(-46, 150, 44, 150, tinta(s(9), {strokeWidth: 2.4})),
    ],
  }),

  tele: (s) => ({
    formas: [
      lapiz.rectangle(-85, -58, 170, 116, tinta(s(1), {strokeWidth: 3.4})),
      lapiz.rectangle(-68, -42, 112, 84, tinta(s(2), {strokeWidth: 2.2})),
      lapiz.circle(64, -20, 16, tinta(s(3), {strokeWidth: 2})),
      lapiz.circle(64, 12, 16, tinta(s(4), {strokeWidth: 2})),
      lapiz.line(-30, -58, -62, -96, tinta(s(5), {strokeWidth: 2.4})),
      lapiz.line(-26, -58, 14, -98, tinta(s(6), {strokeWidth: 2.4})),
    ],
  }),

  coche: (s) => ({
    // Coche editorial: silueta limpia, elegante, ruedas sólidas.
    formas: [
      lapiz.path('M -148 24 L -148 -8 C -100 -18 -88 -54 -36 -60 C 28 -66 58 -32 92 -22 L 148 -12 L 148 24 Z', relleno(s(1), COLORES.tinta, {fillStyle: 'solid', strokeWidth: 2.8, roughness: 0.7})),
      lapiz.circle(-86, 28, 50, relleno(s(2), COLORES.fondo, {fillStyle: 'solid', strokeWidth: 3})),
      lapiz.circle(86, 28, 50, relleno(s(3), COLORES.fondo, {fillStyle: 'solid', strokeWidth: 3})),
      lapiz.circle(-86, 28, 26, relleno(s(6), COLORES.tinta, {fillStyle: 'solid', strokeWidth: 1.6})),
      lapiz.circle(86, 28, 26, relleno(s(7), COLORES.tinta, {fillStyle: 'solid', strokeWidth: 1.6})),
      lapiz.path('M -30 -50 L -28 -24 L 48 -20', tinta(s(4), {strokeWidth: 2})),
    ],
  }),

  taburete: (s) => ({
    formas: [
      lapiz.ellipse(0, -92, 170, 34, tinta(s(1), {strokeWidth: 3.6})),
      lapiz.line(-62, -82, -86, 96, tinta(s(2), {strokeWidth: 3.4})),
      lapiz.line(2, -76, 4, 100, tinta(s(3), {strokeWidth: 3.4})),
      lapiz.line(62, -82, 88, 96, tinta(s(4), {strokeWidth: 3.4})),
    ],
  }),

  // Una pata suelta y un asiento: piezas para montar el taburete
  // por partes (rotular cada pata, borrar una y que todo tiemble).
  pata: (s) => ({formas: [lapiz.line(-12, -90, 12, 90, tinta(s(1), {strokeWidth: 3.4}))]}),
  asiento: (s) => ({formas: [lapiz.ellipse(0, 0, 170, 34, tinta(s(1), {strokeWidth: 3.6}))]}),

  carnet: (s) => ({
    formas: [
      lapiz.rectangle(-90, -58, 180, 116, tinta(s(1), {strokeWidth: 3})),
      lapiz.circle(-48, -10, 36, tinta(s(2), {strokeWidth: 2.2})),
      lapiz.path('M -70 42 C -60 18 -36 18 -26 42', tinta(s(3), {strokeWidth: 2.2})),
      lapiz.line(4, -28, 66, -28, tinta(s(4), {strokeWidth: 2})),
      lapiz.line(4, -4, 72, -4, tinta(s(5), {strokeWidth: 2})),
      lapiz.line(4, 20, 58, 20, tinta(s(6), {strokeWidth: 2})),
    ],
    textos: [{x: 66, y: -44, texto: 'B', tamano: 26, serif: true, color: COLORES.ambar}],
  }),

  carpeta: (s) => ({
    formas: [
      lapiz.rectangle(-95, -60, 190, 125, relleno(s(1), COLORES.ambar, {hachureGap: 12, fillWeight: 0.9, strokeWidth: 3})),
      lapiz.rectangle(-95, -76, 72, 16, tinta(s(2), {strokeWidth: 2.4})),
      lapiz.line(-70, -28, 70, -28, tinta(s(3), {strokeWidth: 2})),
    ],
  }),

  candado: (s) => ({
    formas: [
      lapiz.path('M -34 -12 C -34 -78 34 -78 34 -12', tinta(s(1), {strokeWidth: 5})),
      lapiz.rectangle(-56, -12, 112, 92, relleno(s(2), COLORES.ambar, {hachureGap: 7, strokeWidth: 3.4})),
      lapiz.circle(0, 26, 20, tinta(s(3), {strokeWidth: 2.6})),
      lapiz.line(0, 36, 0, 56, tinta(s(4), {strokeWidth: 2.6})),
    ],
  }),

  casita: (s) => ({
    formas: [
      lapiz.rectangle(-55, -10, 110, 86, tinta(s(1), {strokeWidth: 3})),
      lapiz.polygon([[-70, -10], [0, -68], [70, -10]] as [number, number][], tinta(s(2), {strokeWidth: 3})),
      lapiz.rectangle(-14, 30, 30, 46, tinta(s(3), {strokeWidth: 2.2})),
      lapiz.rectangle(18, 8, 26, 24, tinta(s(4), {strokeWidth: 2})),
    ],
  }),

  anillo: (s) => ({
    formas: [
      lapiz.circle(0, 10, 76, tinta(s(1), {strokeWidth: 4.4})),
      lapiz.polygon([[-12, -28], [0, -46], [12, -28], [0, -14]] as [number, number][], relleno(s(2), COLORES.ambar, {hachureGap: 4, strokeWidth: 2})),
    ],
  }),

  martillo: (s) => ({
    formas: [
      lapiz.line(-4, 64, 16, -36, tinta(s(1), {strokeWidth: 5})),
      lapiz.rectangle(-26, -74, 88, 40, relleno(s(2), COLORES.ambar, {hachureGap: 8, strokeWidth: 3})),
    ],
  }),

  subasta: (s) => ({
    formas: [
      lapiz.line(0, 130, 0, -14, tinta(s(1), {strokeWidth: 4})),
      lapiz.rectangle(-118, -96, 236, 86, tinta(s(2), {strokeWidth: 3.4})),
    ],
    textos: [{x: 0, y: -53, texto: 'SUBASTA', tamano: 36, serif: true}],
  }),

  moneda: (s) => ({
    formas: [lapiz.circle(0, 0, 54, relleno(s(1), COLORES.ambar, {hachureGap: 5, strokeWidth: 3}))],
    textos: [{x: 0, y: 0, texto: '€', tamano: 28, serif: true}],
  }),

  pizarra: (s) => ({
    formas: [
      lapiz.rectangle(-330, -220, 660, 440, tinta(s(1), {strokeWidth: 5})),
      lapiz.rectangle(-316, -206, 632, 412, tinta(s(2), {strokeWidth: 2})),
    ],
  }),

  estanteria: (s) => ({
    formas: [
      lapiz.rectangle(-270, -190, 540, 380, tinta(s(1), {strokeWidth: 4})),
      lapiz.line(-270, -62, 270, -62, tinta(s(2), {strokeWidth: 3})),
      lapiz.line(-270, 64, 270, 64, tinta(s(3), {strokeWidth: 3})),
    ],
  }),

  cruz: (s) => ({
    formas: [
      lapiz.line(-52, -52, 52, 52, tinta(s(1), {strokeWidth: 7})),
      lapiz.line(52, -52, -52, 52, tinta(s(2), {strokeWidth: 7})),
    ],
  }),

  visto: (s) => ({
    formas: [lapiz.path('M -34 2 L -8 28 L 44 -30', tinta(s(1), {stroke: COLORES.ambar, strokeWidth: 8}))],
  }),
};

// El id de un prop puede llevar sufijo para repetir el mismo dibujo
// ("moneda2", "moneda3"); el tipo es el nombre sin el sufijo.
export const tipoDeProp = (id: string, explicito?: string): string => {
  if (explicito) {
    return explicito;
  }
  const limpio = id.replace(/[_\d]+$/, '');
  return PROPS[limpio] ? limpio : id;
};

// Respiración de cada prop: nada se queda como una pegatina.
// La palmera se mece desde la base, el billete ondea, y el resto
// late apenas un 1%. El desfase por semilla evita que respiren
// todos a la vez.
const respiracion = (tipo: string, f: number): string => {
  switch (tipo) {
    case 'palmera':
      return `translate(0 150) rotate(${Math.sin(f / 42) * 2.2}) translate(0 -150)`;
    case 'billete':
      return `translate(0 ${Math.sin(f / 26) * 4}) rotate(${Math.sin(f / 21) * 3.2})`;
    case 'movil':
      return `translate(0 ${Math.sin(f / 30) * 5})`;
    default:
      return `scale(${1 + Math.sin(f / 34) * 0.012})`;
  }
};

export const PropDoodle: React.FC<{
  tipo: string;
  semilla?: number;
  dibujo?: number; // 0→1 se dibuja; al borrarse vuelve hacia 0
  opacidad?: number;
}> = ({tipo, semilla = 0, dibujo = 1, opacidad = 1}) => {
  const fotograma = useCurrentFrame();
  const boil = usarBoil();
  const fabrica = PROPS[tipo];
  const pieza = useMemo(() => {
    if (!fabrica) {
      return null;
    }
    return fabrica((n) => semilla * 31 + n * 7 + 11 + boil * 997);
  }, [fabrica, semilla, boil]);

  if (!pieza) {
    // Prop desconocido: mejor un hueco que un render roto.
    return null;
  }
  const tramo = 1 / pieza.formas.length;
  return (
    <g style={{opacity: opacidad}} transform={respiracion(tipo, fotograma + semilla * 29)}>
      {pieza.formas.map((forma, i) => {
        const propio = Math.min(1, Math.max(0, (dibujo - i * tramo) / tramo));
        return <Trazo key={i} forma={forma} progreso={propio} />;
      })}
      {(pieza.textos ?? []).map((t, i) => (
        <text
          key={`t${i}`}
          x={t.x}
          y={t.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={t.color ?? COLORES.tinta}
          opacity={dibujo >= 0.98 ? opacidad : 0}
          style={{
            fontFamily: t.serif ? FUENTES.serif : FUENTES.sans,
            fontWeight: 600,
            fontSize: t.tamano,
          }}
        >
          {t.texto}
        </text>
      ))}
    </g>
  );
};
