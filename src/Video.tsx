// ============================================================
// VIDEO — la mesa de montaje.
// Coloca en la línea de tiempo: INTRO → escena 1 → escena 2 → …
// → OUTRO, cada escena con su audio, y la marca de agua SIEMPRE
// visible por encima de todo.
// ============================================================
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {COLORES, INTRO_FRAMES, OUTRO_FRAMES, RESPIRO_FRAMES} from './tema';
import type {Guion} from './tipos';
import {Escena} from './escenas/Escena';
import {Intro} from './escenas/Intro';
import {Outro} from './escenas/Outro';
import {MarcaDeAgua} from './componentes/MarcaDeAgua';

export const Video: React.FC<Guion> = ({expediente, escenas}) => {
  // "cursor" lleva la cuenta de en qué fotograma empieza cada pieza,
  // como quien va apilando clips en una línea de tiempo.
  let cursor = INTRO_FRAMES;

  return (
    <AbsoluteFill style={{backgroundColor: COLORES.fondo}}>
      {/* La intro, con el número de expediente de ESTE video. */}
      <Sequence durationInFrames={INTRO_FRAMES} name="Intro">
        <Intro expediente={expediente} />
      </Sequence>

      {/* Cada escena dura lo que dura su voz + un pequeño respiro. */}
      {escenas.map((escena, i) => {
        const desde = cursor;
        const duracion = escena.duracionFrames + RESPIRO_FRAMES;
        cursor += duracion;
        return (
          <Sequence key={i} from={desde} durationInFrames={duracion} name={`Escena ${i + 1}`}>
            <Escena escena={escena} />
            {/* La voz en off de esta escena (si ya está generada). */}
            {escena.audio ? <Audio src={staticFile(escena.audio)} /> : null}
          </Sequence>
        );
      })}

      <Sequence from={cursor} durationInFrames={OUTRO_FRAMES} name="Outro">
        <Outro />
      </Sequence>

      {/* La marca de agua va FUERA de las secuencias: presente del
          primer al último fotograma. */}
      <MarcaDeAgua />
    </AbsoluteFill>
  );
};
