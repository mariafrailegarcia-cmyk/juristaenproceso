// ============================================================
// CARPETA DE EXPEDIENTE — la carpeta clásica con pestaña y una
// etiqueta rotulada (ej. "Expediente nº 0000"). Protagonista de
// la intro de cada video.
// ============================================================
import React, {useMemo} from 'react';
import {COLORES, FUENTES} from '../tema';
import {TextoEscrito} from './TextoEscrito';
import {Trazo, lapiz, tinta} from './Rough';

export const Carpeta: React.FC<{
  rotulo: string;
  progreso?: number; // 0→1: la carpeta se dibuja
  inicioRotulo?: number; // fotograma en que empieza a escribirse la etiqueta
  ancho?: number;
}> = ({rotulo, progreso = 1, inicioRotulo = 0, ancho = 640}) => {
  const alto = (ancho * 440) / 640;
  const formas = useMemo(
    () => ({
      // La pestaña superior izquierda, como las carpetas de archivo.
      pestana: lapiz.path('M 30 70 L 30 28 L 215 28 L 245 70', tinta(71)),
      cuerpo: lapiz.rectangle(30, 70, 580, 340, tinta(73, {strokeWidth: 3})),
      // La etiqueta donde va rotulado el número de expediente.
      etiqueta: lapiz.rectangle(150, 180, 340, 92, tinta(79, {stroke: COLORES.ambar, strokeWidth: 3})),
      // Dos "papeles" asomando por arriba, para que se note que hay caso.
      papeles: lapiz.line(70, 70, 86, 48, tinta(83, {strokeWidth: 2})),
    }),
    []
  );
  // Orden de dibujo: pestaña → cuerpo → papeles → etiqueta.
  const partes = [formas.pestana, formas.cuerpo, formas.papeles, formas.etiqueta];
  return (
    <div style={{position: 'relative', width: ancho, height: alto}}>
      <svg viewBox="0 0 640 440" style={{width: '100%', height: '100%', overflow: 'visible'}}>
        {partes.map((forma, i) => {
          const tramo = 1 / partes.length;
          const propio = Math.min(1, Math.max(0, (progreso - i * tramo) / tramo));
          return <Trazo key={i} forma={forma} progreso={propio} />;
        })}
      </svg>
      {/* El rótulo se escribe a mano dentro de la etiqueta. */}
      <div
        style={{
          position: 'absolute',
          left: '23%',
          top: '41%',
          width: '54%',
          height: '21%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextoEscrito
          texto={rotulo}
          inicio={inicioRotulo}
          letrasPorFotograma={0.8}
          estilo={{
            fontFamily: FUENTES.sans,
            fontWeight: 500,
            fontSize: ancho * 0.042,
            letterSpacing: '0.05em',
            color: COLORES.tinta,
            whiteSpace: 'nowrap', // el rótulo siempre en una sola línea
          }}
        />
      </div>
    </div>
  );
};
