// ============================================================
// SELLO — el sello rectangular rojo teja que cae y estampa una
// palabra inclinada, con un pequeño rebote y un golpe seco.
// Es el ÚNICO sitio del canal donde se usa el rojo teja.
// ============================================================
import React, {useMemo} from 'react';
import {Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORES, FUENTES} from '../tema';
import {Trazo, lapiz, tinta} from './Rough';

export const Sello: React.FC<{
  texto: string;
  impacto: number; // fotograma (dentro de la escena) en que golpea
  escala?: number; // tamaño general del sello
  conSonido?: boolean;
}> = ({texto, impacto, escala = 1, conSonido = true}) => {
  const fotograma = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Medidas del sello según la longitud del texto.
  const ancho = Math.max(380, texto.length * 52) * escala;
  const alto = 150 * escala;

  // Doble borde dibujado a mano, en rojo teja.
  const bordes = useMemo(
    () => ({
      exterior: lapiz.rectangle(0, 0, ancho, alto, tinta(23, {stroke: COLORES.teja, strokeWidth: 5})),
      interior: lapiz.rectangle(10, 10, ancho - 20, alto - 20, tinta(29, {stroke: COLORES.teja, strokeWidth: 2.5})),
    }),
    [ancho, alto]
  );

  // El muelle (spring) simula la física del golpe: el sello "viene
  // hacia el papel" (escala grande → escala 1) y rebota ligeramente.
  const muelle = spring({
    frame: fotograma - impacto,
    fps,
    config: {damping: 11, stiffness: 230, mass: 0.7},
  });
  // Antes del impacto no se ve nada; en el impacto aparece de golpe.
  const visible = fotograma >= impacto;
  const tamano = interpolate(muelle, [0, 1], [2.4, 1]);
  const opacidad = interpolate(muelle, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <>
      {visible ? (
        <div
          style={{
            display: 'inline-block',
            transform: `rotate(-7deg) scale(${tamano})`,
            opacity: opacidad,
          }}
        >
          <div style={{position: 'relative', width: ancho, height: alto}}>
            <svg width={ancho} height={alto} style={{position: 'absolute', overflow: 'visible'}}>
              <Trazo forma={bordes.exterior} />
              <Trazo forma={bordes.interior} />
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
                fontSize: 64 * escala,
                letterSpacing: '0.12em',
                color: COLORES.teja,
              }}
            >
              {texto}
            </div>
          </div>
        </div>
      ) : null}
      {/* El golpe seco suena justo en el fotograma del impacto. */}
      {conSonido ? (
        <Sequence from={impacto} durationInFrames={20}>
          <Audio src={staticFile('sfx/sello.wav')} volume={0.8} />
        </Sequence>
      ) : null}
    </>
  );
};
