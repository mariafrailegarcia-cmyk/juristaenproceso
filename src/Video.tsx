// ============================================================
// VIDEO — la mesa de montaje.
// Coloca en la línea de tiempo: INTRO → escena 1 → escena 2 → …
// → OUTRO, cada escena con su audio, y la marca de agua SIEMPRE
// visible por encima de todo.
// ============================================================
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {COLORES, INTRO_FRAMES, OUTRO_FRAMES, RESPIRO_FRAMES} from './tema';
import type {Guion} from './tipos';
import {Escena} from './escenas/Escena';
import {Intro} from './escenas/Intro';
import {Outro} from './escenas/Outro';
import {MarcaDeAgua} from './componentes/MarcaDeAgua';

// Cruce suave entre piezas: las transiciones son metamorfosis y
// match cuts (nunca cortina de tinta ni corte seco). Para que el
// salto entre escenas no chirríe, cada escena entra con un breve
// fundido de apertura sobre el fondo blanco continuo.
const FUNDIDO_FRAMES = 9;

const ConFundido: React.FC<{children: React.ReactNode}> = ({children}) => {
  const opacidad = useFundidoEntrada(FUNDIDO_FRAMES);
  return <AbsoluteFill style={{opacity: opacidad}}>{children}</AbsoluteFill>;
};

const useFundidoEntrada = (frames: number): number => {
  const f = useCurrentFrame();
  return Math.min(1, Math.max(0, f / frames));
};

export const Video: React.FC<Guion> = ({expediente, escenas}) => {
  // "cursor" lleva la cuenta de en qué fotograma empieza cada pieza,
  // como quien va apilando clips en una línea de tiempo.
  let cursor = INTRO_FRAMES;

  const secuencias = escenas.map((escena, i) => {
    const desde = cursor;
    const duracion = escena.duracionFrames + RESPIRO_FRAMES;
    cursor += duracion;
    return (
      <Sequence key={i} from={desde} durationInFrames={duracion} name={`Escena ${i + 1}`}>
        <ConFundido>
          <Escena escena={escena} />
        </ConFundido>
        {/* La voz en off de esta escena (si ya está generada). */}
        {escena.audio ? <Audio src={staticFile(escena.audio)} /> : null}
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{backgroundColor: COLORES.fondo}}>
      {/* La intro, con el número de expediente de ESTE video. */}
      <Sequence durationInFrames={INTRO_FRAMES} name="Intro">
        <Intro expediente={expediente} />
      </Sequence>

      {/* Cada escena dura lo que dura su voz + un pequeño respiro. */}
      {secuencias}

      <Sequence from={cursor} durationInFrames={OUTRO_FRAMES} name="Outro">
        <Outro />
      </Sequence>

      {/* La marca de agua va FUERA de las secuencias: presente del
          primer al último fotograma. */}
      <MarcaDeAgua />
    </AbsoluteFill>
  );
};
