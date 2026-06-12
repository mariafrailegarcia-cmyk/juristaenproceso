// ============================================================
// FLECHA — una flecha dibujada a mano, con una ligera curva para
// que parezca un gesto rápido de rotulador.
// ============================================================
import React, {useMemo} from 'react';
import {COLORES} from '../tema';
import {Trazo, lapiz, tinta} from './Rough';

export const Flecha: React.FC<{
  largo?: number;
  progreso?: number;
  color?: string;
  semilla?: number; // cambiarla da una flecha con otro temblor
}> = ({largo = 220, progreso = 1, color = COLORES.ambar, semilla = 137}) => {
  const formas = useMemo(() => {
    const opciones = tinta(semilla, {stroke: color, strokeWidth: 4});
    return [
      // El cuerpo: una curva suave en vez de una recta perfecta.
      lapiz.curve(
        [
          [0, 18],
          [largo * 0.5, 4],
          [largo, 14],
        ],
        opciones
      ),
      // La punta: dos rayitas.
      lapiz.line(largo, 14, largo - 34, 0, opciones),
      lapiz.line(largo, 14, largo - 30, 34, opciones),
    ];
  }, [largo, color, semilla]);
  return (
    <svg width={largo + 10} height={44} style={{overflow: 'visible'}}>
      {formas.map((forma, i) => {
        const tramo = 1 / formas.length;
        const propio = Math.min(1, Math.max(0, (progreso - i * tramo) / tramo));
        return <Trazo key={i} forma={forma} progreso={propio} />;
      })}
    </svg>
  );
};
