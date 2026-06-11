// ============================================================
// OUTRO (6,5 segundos)
// El logo completo se dibuja, se "levanta la sesión" y se invita
// a suscribirse sin perder el tono del canal.
// ============================================================
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORES, FUENTES} from '../tema';
import {LogoCompleto} from '../componentes/Logo';
import {Flecha} from '../componentes/Flecha';
import {Trazo, lapiz, tinta, usarProgreso} from '../componentes/Rough';

export const Outro: React.FC = () => {
  const fotograma = useCurrentFrame();
  const dibujoLogo = usarProgreso(5, 55);
  const entradaSesion = interpolate(fotograma, [75, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entradaBoton = interpolate(fotograma, [105, 122], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dibujoBoton = usarProgreso(108, 22);
  const dibujoFlecha = usarProgreso(128, 18);

  // El "botón" de suscribirse: un rectángulo a mano con acento ámbar.
  const marcoBoton = useMemo(
    () => lapiz.rectangle(0, 0, 420, 96, tinta(151, {stroke: COLORES.ambar, strokeWidth: 4})),
    []
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.fondo,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
      }}
    >
      <LogoCompleto progreso={dibujoLogo} />

      <div
        style={{
          fontFamily: FUENTES.serif,
          fontStyle: 'italic',
          fontSize: 58,
          color: COLORES.tinta,
          opacity: entradaSesion,
        }}
      >
        se levanta la sesión.
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 28, opacity: entradaBoton}}>
        <Flecha largo={170} progreso={dibujoFlecha} />
        <div style={{position: 'relative', width: 420, height: 96}}>
          <svg width={420} height={96} style={{position: 'absolute', overflow: 'visible'}}>
            <Trazo forma={marcoBoton} progreso={dibujoBoton} />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FUENTES.sans,
              fontWeight: 600,
              fontSize: 40,
              letterSpacing: '0.04em',
              color: COLORES.tinta,
            }}
          >
            Suscríbete
          </div>
        </div>
        <div
          style={{
            fontFamily: FUENTES.sans,
            fontSize: 28,
            color: COLORES.tintaSuave,
            maxWidth: 320,
          }}
        >
          el procedimiento continúa
        </div>
      </div>
    </AbsoluteFill>
  );
};
