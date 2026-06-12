// ============================================================
// ROOT — el registro del video.
// Aquí se declara la composición "JuristaEnProceso" (1920x1080,
// 30fps) y, lo más importante, calculateMetadata: la función que
// suma la duración de todos los audios para decidir cuántos
// fotogramas dura el video. La voz manda; el video obedece.
// ============================================================
import React from 'react';
import {Composition} from 'remotion';
import {ALTO, ANCHO, FPS, INTRO_FRAMES, OUTRO_FRAMES, RESPIRO_FRAMES} from './tema';
import type {Guion} from './tipos';
import {Video} from './Video';

// Un guion de muestra para poder previsualizar en Remotion Studio
// sin haber generado audios. El pipeline real lo sustituye con
// --props=...datos.json (el guion con las duraciones medidas).
const guionDeMuestra: Guion = {
  expediente: '0000',
  titulo: 'Vista previa',
  escenas: [
    {
      voz: 'Escena de muestra para previsualizar la plantilla.',
      visual: {tipo: 'titulo', texto: 'Vista previa', subtitulo: 'guion de muestra'},
      duracionFrames: 120,
    },
    {
      voz: 'La balanza de muestra.',
      visual: {tipo: 'balanza', etiquetas: ['una parte', 'la otra'], texto: 'Todo en equilibrio'},
      duracionFrames: 150,
    },
  ],
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="JuristaEnProceso"
      component={Video}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={600} // valor provisional; lo recalcula calculateMetadata
      defaultProps={guionDeMuestra}
      calculateMetadata={({props}) => {
        // Duración total = intro + Σ(voz de cada escena + respiro) + outro.
        const escenas = props.escenas.reduce(
          (suma, escena) => suma + escena.duracionFrames + RESPIRO_FRAMES,
          0
        );
        return {
          durationInFrames: INTRO_FRAMES + escenas + OUTRO_FRAMES,
          props,
        };
      }}
    />
  );
};
