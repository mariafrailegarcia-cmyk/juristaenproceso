// ============================================================
// BALANZA — la balanza de la justicia. Primero se dibuja y,
// una vez completa, se balancea suavemente como si acabaran de
// poner peso en un platillo.
// ============================================================
import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORES, FUENTES} from '../tema';
import {Trazo, lapiz, relleno, tinta} from './Rough';

export const Balanza: React.FC<{
  etiquetas: [string, string]; // texto bajo cada platillo
  progreso?: number; // 0→1: la balanza se dibuja
  alto?: number;
}> = ({etiquetas, progreso = 1, alto = 560}) => {
  const fotograma = useCurrentFrame();

  const formas = useMemo(
    () => ({
      base: lapiz.polygon(
        [
          [250, 470],
          [350, 470],
          [318, 440],
          [282, 440],
        ],
        relleno(89, COLORES.ambar)
      ),
      poste: lapiz.line(300, 440, 300, 120, tinta(97, {strokeWidth: 4})),
      // El fiel (la barra horizontal) y los platillos van en un grupo
      // aparte para poder balancearlos juntos.
      fiel: lapiz.line(80, 120, 520, 120, tinta(101, {strokeWidth: 4})),
      cuerdaIzqA: lapiz.line(80, 120, 40, 210, tinta(103, {strokeWidth: 2})),
      cuerdaIzqB: lapiz.line(80, 120, 120, 210, tinta(107, {strokeWidth: 2})),
      platoIzq: lapiz.arc(80, 200, 130, 80, 0, Math.PI, false, tinta(109, {strokeWidth: 3.5})),
      cuerdaDerA: lapiz.line(520, 120, 480, 210, tinta(113, {strokeWidth: 2})),
      cuerdaDerB: lapiz.line(520, 120, 560, 210, tinta(127, {strokeWidth: 2})),
      platoDer: lapiz.arc(520, 200, 130, 80, 0, Math.PI, false, tinta(131, {strokeWidth: 3.5})),
    }),
    []
  );

  // Vaivén: cuando la balanza ya está dibujada, el grupo superior gira
  // unos pocos grados siguiendo una onda (seno), como un péndulo lento.
  const balanceo = progreso >= 1 ? Math.sin(fotograma / 19) * 3.2 : 0;

  const fijas = [formas.base, formas.poste];
  const moviles = [
    formas.fiel,
    formas.cuerdaIzqA,
    formas.cuerdaIzqB,
    formas.platoIzq,
    formas.cuerdaDerA,
    formas.cuerdaDerB,
    formas.platoDer,
  ];
  const total = fijas.length + moviles.length;
  const propio = (i: number) => Math.min(1, Math.max(0, (progreso - i / total) * total));

  return (
    <div style={{position: 'relative', width: (alto * 600) / 560, height: alto}}>
      <svg viewBox="0 0 600 520" style={{width: '100%', height: '100%', overflow: 'visible'}}>
        {fijas.map((forma, i) => (
          <Trazo key={i} forma={forma} progreso={propio(i)} />
        ))}
        {/* transform-origin en el eje: el grupo gira sobre el poste. */}
        <g style={{transform: `rotate(${balanceo}deg)`, transformOrigin: '300px 120px'}}>
          {moviles.map((forma, i) => (
            <Trazo key={i} forma={forma} progreso={propio(fijas.length + i)} />
          ))}
        </g>
      </svg>
      {/* Etiquetas bajo cada platillo. */}
      {[0, 1].map((lado) => (
        <div
          key={lado}
          style={{
            position: 'absolute',
            top: '58%',
            left: lado === 0 ? '-12%' : '62%',
            width: '50%',
            textAlign: 'center',
            fontFamily: FUENTES.sans,
            fontWeight: 500,
            fontSize: 34,
            color: COLORES.tintaSuave,
            opacity: progreso >= 1 ? 1 : 0,
          }}
        >
          {etiquetas[lado]}
        </div>
      ))}
    </div>
  );
};
