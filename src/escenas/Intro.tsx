// ============================================================
// INTRO (5 segundos = 150 fotogramas)
// Coreografía:
//   0-55   se dibuja la carpeta de expediente y se rotula el número
//   60-85  aparece "Jurista" en serif
//   88     ¡PLAS! cae el sello "EN PROCESO" (con rebote y golpe seco)
//   115+   entra el lema "se admite a trámite" en cursiva
// ============================================================
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORES, FUENTES} from '../tema';
import {Carpeta} from '../componentes/Carpeta';
import {Sello} from '../componentes/Sello';
import {usarProgreso} from '../componentes/Rough';

export const Intro: React.FC<{expediente: string}> = ({expediente}) => {
  const fotograma = useCurrentFrame();
  const dibujoCarpeta = usarProgreso(0, 50);
  const entradaJurista = interpolate(fotograma, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entradaLema = interpolate(fotograma, [115, 135], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORES.fondo,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
      }}
    >
      <Carpeta
        rotulo={`Expediente nº ${expediente}`}
        progreso={dibujoCarpeta}
        inicioRotulo={28}
        ancho={560}
      />

      {/* "Jurista" y el sello "EN PROCESO" comparten línea: el doble
          sentido del canal, uno al lado del otro. */}
      <div style={{display: 'flex', alignItems: 'center', gap: 40, height: 190}}>
        <span
          style={{
            fontFamily: FUENTES.serif,
            fontWeight: 700,
            fontSize: 140,
            color: COLORES.tinta,
            opacity: entradaJurista,
            // Entra subiendo suavemente desde abajo.
            transform: `translateY(${(1 - entradaJurista) * 26}px)`,
          }}
        >
          Jurista
        </span>
        <Sello texto="EN PROCESO" impacto={88} escala={0.95} />
      </div>

      <div
        style={{
          fontFamily: FUENTES.serif,
          fontStyle: 'italic',
          fontSize: 38,
          color: COLORES.tintaSuave,
          opacity: entradaLema,
        }}
      >
        se admite a trámite
      </div>
    </AbsoluteFill>
  );
};
