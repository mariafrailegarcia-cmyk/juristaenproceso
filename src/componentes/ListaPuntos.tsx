// ============================================================
// LISTA DE PUNTOS — aparecen uno a uno, cada punto con una marca
// de visto dibujada a mano en ámbar.
// ============================================================
import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORES, FUENTES} from '../tema';
import {Trazo, lapiz, tinta, usarProgreso} from './Rough';

// La marca de visto (✓) dibujada con rough.js. Cada punto usa una
// semilla distinta para que no haya dos vistos idénticos.
const Visto: React.FC<{progreso: number; semilla: number}> = ({progreso, semilla}) => {
  const forma = useMemo(
    () => lapiz.path('M 6 22 L 16 34 L 38 8', tinta(semilla, {stroke: COLORES.ambar, strokeWidth: 5})),
    [semilla]
  );
  return (
    <svg width={44} height={42} style={{overflow: 'visible', flexShrink: 0}}>
      <Trazo forma={forma} progreso={progreso} />
    </svg>
  );
};

export const ListaPuntos: React.FC<{
  puntos: string[];
  inicio?: number; // fotograma del primer punto
  intervalo?: number; // fotogramas entre un punto y el siguiente
}> = ({puntos, inicio = 0, intervalo = 35}) => {
  const fotograma = useCurrentFrame();
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 44}}>
      {puntos.map((punto, i) => {
        const arranque = inicio + i * intervalo;
        // Cada punto entra deslizándose un poco desde la izquierda.
        const entrada = interpolate(fotograma, [arranque, arranque + 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              opacity: entrada,
              transform: `translateX(${(1 - entrada) * -30}px)`,
            }}
          >
            <VistoConProgreso arranque={arranque} semilla={31 + i * 7} />
            <span
              style={{
                fontFamily: FUENTES.sans,
                fontWeight: 400,
                fontSize: 44,
                color: COLORES.tinta,
                lineHeight: 1.35,
              }}
            >
              {punto}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Pequeño envoltorio para poder usar el hook de progreso por cada punto.
const VistoConProgreso: React.FC<{arranque: number; semilla: number}> = ({arranque, semilla}) => {
  const progreso = usarProgreso(arranque + 4, 14);
  return <Visto progreso={progreso} semilla={semilla} />;
};
