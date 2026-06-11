// ============================================================
// MONIGOTE — el estudiante de palitos, protagonista del canal.
// Tres poses: neutral, duda (mano a la cabeza) y celebra (brazos
// arriba). Dibujado sobre un lienzo de 200x320.
// ============================================================
import React, {useMemo} from 'react';
import {Trazo, lapiz, tinta} from './Rough';

type Pose = 'neutral' | 'duda' | 'celebra';

export const Monigote: React.FC<{
  pose?: Pose;
  progreso?: number; // 0→1: el monigote se dibuja
  alto?: number; // altura en píxeles
}> = ({pose = 'neutral', progreso = 1, alto = 320}) => {
  const formas = useMemo(() => {
    // Brazos según la pose (parten del hombro, en 100,150).
    const brazos = {
      neutral: [lapiz.line(100, 150, 52, 215, tinta(41)), lapiz.line(100, 150, 148, 215, tinta(43))],
      duda: [
        lapiz.line(100, 150, 52, 215, tinta(41)),
        // Brazo doblado hasta la sien: gesto de "a ver, repasemos".
        lapiz.path('M 100 150 L 150 120 L 132 78', tinta(47)),
      ],
      celebra: [lapiz.line(100, 150, 48, 92, tinta(53)), lapiz.line(100, 150, 152, 92, tinta(59))],
    }[pose];

    return [
      lapiz.circle(100, 62, 76, tinta(37)), // cabeza
      lapiz.line(100, 100, 100, 218, tinta(39)), // tronco
      ...brazos,
      lapiz.line(100, 218, 58, 305, tinta(61)), // pierna izquierda
      lapiz.line(100, 218, 142, 305, tinta(67)), // pierna derecha
    ];
  }, [pose]);

  // Las partes se dibujan en orden (cabeza → tronco → brazos → piernas):
  // a cada una le corresponde un tramo del progreso total.
  return (
    <svg
      viewBox="0 0 200 320"
      style={{width: (alto * 200) / 320, height: alto, overflow: 'visible'}}
    >
      {formas.map((forma, i) => {
        const tramo = 1 / formas.length;
        const propio = Math.min(1, Math.max(0, (progreso - i * tramo) / tramo));
        return <Trazo key={i} forma={forma} progreso={propio} />;
      })}
    </svg>
  );
};
