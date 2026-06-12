// ============================================================
// CORTINA DE TINTA — la transición de la casa: un brochazo de
// tinta barre la pantalla de izquierda a derecha (cubre justo en
// el cambio de escena y descubre la siguiente). Las cuatro
// franjas van desfasadas, como pasadas de un pincel ancho, y el
// borde delantero ondula: nada de cortes secos ni bordes rectos.
// Dura 20 fotogramas; el pico de cobertura es el fotograma 10.
// ============================================================
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {COLORES} from '../tema';

export const CORTINA_FRAMES = 20;
const FRANJAS = 4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const suaviza = (p: number) => p * p * (3 - 2 * p);

export const CortinaTinta: React.FC = () => {
  const fotograma = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: FRANJAS}, (_, i) => {
        // Cada franja entra y sale con un pequeño desfase: brochazo.
        const desfase = i * 1.4;
        const entra = suaviza(clamp01((fotograma - desfase) / 8));
        const sale = suaviza(clamp01((fotograma - desfase - 9) / 9));
        // El borde delantero avanza con "entra"; el trasero con "sale".
        const frente = entra * 112;
        const cola = sale * 114;
        if (frente <= cola) {
          return null;
        }
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${(i * 100) / FRANJAS - 1}%`,
              height: `${100 / FRANJAS + 2}%`,
              left: `${cola - 6}%`,
              width: `${frente - cola + 6}%`,
              background: COLORES.tinta,
              // Bordes ondulados de pincel, distintos por franja.
              borderRadius: i % 2 === 0 ? '0 46% 38% 0 / 0 52% 44% 0' : '0 38% 50% 0 / 0 44% 56% 0',
              transform: `skewX(${-7 + (i % 2) * 3}deg)`,
            }}
          />
        );
      })}
      <Sequence from={0} durationInFrames={CORTINA_FRAMES}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.22} />
      </Sequence>
    </AbsoluteFill>
  );
};
