// ============================================================
// ROUGH — el "lápiz" del canal.
// Convierte formas perfectas (línea, círculo, rectángulo…) en
// trazos imperfectos estilo doodle usando rough.js, y les da el
// efecto de "se dibuja solo" sincronizado con el fotograma actual.
// ============================================================
import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import rough from 'roughjs/bin/rough';
import type {Drawable, Options} from 'roughjs/bin/core';
import {COLORES} from '../tema';

// El "generador" de rough.js calcula los trazos sin necesidad de pantalla.
// Lo creamos una sola vez y lo comparten todos los componentes.
export const lapiz = rough.generator();

// Opciones de trazo por defecto del canal: tinta oscura, trazo fino,
// rugosidad sutil. La SEMILLA (seed) es crucial: rough.js usa azar para
// "temblar" el trazo, y si el azar cambiara en cada fotograma el dibujo
// vibraría sin control. Con una semilla fija, el temblor es siempre el
// mismo y el dibujo queda quieto y elegante.
export const tinta = (semilla: number, extra: Options = {}): Options => ({
  seed: semilla,
  stroke: COLORES.tinta,
  strokeWidth: 2.6,
  roughness: 1.4,
  bowing: 1.2,
  ...extra,
});

// Variante para rellenos a rayitas (hachure), como sombreado a lápiz.
export const relleno = (semilla: number, color: string, extra: Options = {}): Options =>
  tinta(semilla, {
    fill: color,
    fillStyle: 'hachure',
    fillWeight: 1.6,
    hachureGap: 7,
    ...extra,
  });

// ------------------------------------------------------------
// <Trazo> dibuja una forma de rough.js con progreso de 0 a 1.
//
// El truco del "se dibuja solo": un trazo SVG puede mostrarse por
// tramos (stroke-dasharray). Declaramos que el trazo "mide 1"
// (pathLength={1}) y desplazamos el hueco: con progreso 0.3 se ve
// el primer 30% del trazo, como si la mano fuera por ahí.
// ------------------------------------------------------------
export const Trazo: React.FC<{
  forma: Drawable;
  progreso?: number; // 0 = nada dibujado, 1 = completo
}> = ({forma, progreso = 1}) => {
  // useMemo: calcula los caminos del trazo una vez y los reutiliza
  // en los demás fotogramas (más rápido y estable).
  const caminos = useMemo(() => lapiz.toPaths(forma), [forma]);
  const p = Math.min(1, Math.max(0, progreso));
  if (p <= 0) {
    return null;
  }
  return (
    <>
      {caminos.map((camino, i) => (
        <path
          key={i}
          d={camino.d}
          stroke={camino.stroke}
          strokeWidth={camino.strokeWidth}
          fill={camino.fill ?? 'none'}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
};

// ------------------------------------------------------------
// usarBoil: el "hervor" de la animación doodle clásica. Devuelve
// 0, 1 o 2 cambiando unas ~2,7 veces por segundo; sumado a la
// semilla de un trazo, hace que el dibujo se redibuje sutilmente
// como si la mano lo repasara. Quieto pero vivo.
// ------------------------------------------------------------
export const usarBoil = (velocidad = 11): number => {
  const fotograma = useCurrentFrame();
  return Math.floor(fotograma / velocidad) % 3;
};

// ------------------------------------------------------------
// usarProgreso: convierte "del fotograma X al Y" en un valor 0→1.
// Es la pieza que sincroniza TODO: cada dibujo y cada texto
// reciben su progreso a partir del fotograma actual del video.
// ------------------------------------------------------------
export const usarProgreso = (inicio: number, duracion: number): number => {
  const fotograma = useCurrentFrame();
  return interpolate(fotograma, [inicio, inicio + duracion], [0, 1], {
    extrapolateLeft: 'clamp', // antes del inicio: se queda en 0
    extrapolateRight: 'clamp', // después del final: se queda en 1
  });
};
