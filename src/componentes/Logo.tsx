// ============================================================
// LOGO — el símbolo de párrafo legal § con un birrete de
// graduación torcido encima. Es la identidad del canal y se usa
// en tres sitios: marca de agua, intro y outro.
// ============================================================
import React, {useMemo} from 'react';
import {COLORES, FUENTES} from '../tema';
import {Trazo, lapiz, relleno, tinta} from './Rough';

// El birrete se dibuja con rough.js sobre un lienzo de 100x70 que luego
// colocamos, girado, encima del §. Coordenadas pensadas a mano:
// un rombo (la tabla del birrete), el casquete debajo y la borla colgando.
const Birrete: React.FC<{progreso?: number}> = ({progreso = 1}) => {
  const formas = useMemo(
    () => ({
      // La tabla cuadrada vista en perspectiva = un rombo.
      tabla: lapiz.polygon(
        [
          [50, 8],
          [96, 26],
          [50, 44],
          [4, 26],
        ],
        relleno(7, COLORES.ambar)
      ),
      // El casquete que se apoya en la cabeza.
      casquete: lapiz.path('M 28 36 L 28 52 Q 50 62 72 52 L 72 36', tinta(11)),
      // La borla: un hilo desde el centro y su pompón.
      hilo: lapiz.line(50, 26, 88, 56, tinta(13, {strokeWidth: 2})),
      pompon: lapiz.circle(90, 60, 11, relleno(17, COLORES.ambar)),
    }),
    []
  );
  return (
    <svg viewBox="0 0 100 70" style={{overflow: 'visible', width: '100%', height: '100%'}}>
      <Trazo forma={formas.tabla} progreso={progreso} />
      <Trazo forma={formas.casquete} progreso={progreso} />
      <Trazo forma={formas.hilo} progreso={progreso} />
      <Trazo forma={formas.pompon} progreso={progreso} />
    </svg>
  );
};

// El símbolo completo. "tam" es la altura total en píxeles, y todo lo
// demás (birrete, posición) se escala en proporción.
export const SimboloLogo: React.FC<{
  tam: number;
  progreso?: number; // permite que se dibuje poco a poco en el outro
}> = ({tam, progreso = 1}) => {
  return (
    <div style={{position: 'relative', width: tam, height: tam * 1.15}}>
      {/* El § es tipografía, no dibujo: contraste elegante con el doodle. */}
      <div
        style={{
          fontFamily: FUENTES.serif,
          fontWeight: 700,
          fontSize: tam,
          color: COLORES.tinta,
          lineHeight: 1.1,
          textAlign: 'center',
          opacity: progreso >= 1 ? 1 : progreso * 0.9,
        }}
      >
        §
      </div>
      {/* El birrete, torcido 14 grados, apoyado en la cabeza del §. */}
      <div
        style={{
          position: 'absolute',
          top: -tam * 0.32,
          left: tam * 0.08,
          width: tam * 0.8,
          height: tam * 0.56,
          transform: 'rotate(-14deg)',
        }}
      >
        <Birrete progreso={progreso} />
      </div>
    </div>
  );
};

// Logo completo con nombre y lema, para intro/outro.
export const LogoCompleto: React.FC<{progreso?: number}> = ({progreso = 1}) => {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 48}}>
      <SimboloLogo tam={170} progreso={progreso} />
      <div>
        <div
          style={{
            fontFamily: FUENTES.serif,
            fontWeight: 600,
            fontSize: 88,
            color: COLORES.tinta,
            opacity: progreso,
          }}
        >
          Jurista en Proceso
        </div>
        <div
          style={{
            fontFamily: FUENTES.serif,
            fontStyle: 'italic',
            fontSize: 34,
            color: COLORES.tintaSuave,
            marginTop: 6,
            opacity: progreso,
          }}
        >
          se admite a trámite
        </div>
      </div>
    </div>
  );
};
