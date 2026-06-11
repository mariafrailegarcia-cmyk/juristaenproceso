// ============================================================
// MARCA DE AGUA — el § con birrete, pequeño, abajo a la derecha,
// al 50% de opacidad, visible durante TODO el video.
// ============================================================
import React from 'react';
import {SimboloLogo} from './Logo';

export const MarcaDeAgua: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        right: 48,
        bottom: 64,
        opacity: 0.5,
      }}
    >
      <SimboloLogo tam={64} />
    </div>
  );
};
