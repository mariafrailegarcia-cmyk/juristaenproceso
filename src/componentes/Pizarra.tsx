// ============================================================
// PIZARRA — un marco de doble trazo, ligeramente torcido, que
// encuadra contenido importante (definiciones, citas de artículos).
// ============================================================
import React, {useMemo} from 'react';
import {Trazo, lapiz, tinta} from './Rough';

export const Pizarra: React.FC<{
  ancho: number;
  alto: number;
  progreso?: number;
  children?: React.ReactNode;
}> = ({ancho, alto, progreso = 1, children}) => {
  const formas = useMemo(
    () => ({
      exterior: lapiz.rectangle(0, 0, ancho, alto, tinta(139, {strokeWidth: 3.2})),
      interior: lapiz.rectangle(14, 14, ancho - 28, alto - 28, tinta(149, {strokeWidth: 1.8})),
    }),
    [ancho, alto]
  );
  return (
    <div style={{position: 'relative', width: ancho, height: alto, transform: 'rotate(-0.6deg)'}}>
      <svg width={ancho} height={alto} style={{position: 'absolute', overflow: 'visible'}}>
        <Trazo forma={formas.exterior} progreso={Math.min(1, progreso * 2)} />
        <Trazo forma={formas.interior} progreso={Math.min(1, Math.max(0, progreso * 2 - 1))} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 40,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
};
