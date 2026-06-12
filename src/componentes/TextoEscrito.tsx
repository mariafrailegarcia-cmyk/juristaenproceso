// ============================================================
// TEXTO ESCRITO — texto que aparece letra a letra, como si
// alguien lo escribiera en directo.
// ============================================================
import React from 'react';
import {useCurrentFrame} from 'remotion';

export const TextoEscrito: React.FC<{
  texto: string;
  inicio?: number; // fotograma en el que empieza a escribirse
  letrasPorFotograma?: number; // velocidad de escritura
  estilo?: React.CSSProperties; // tipografía, tamaño, color…
}> = ({texto, inicio = 0, letrasPorFotograma = 1.1, estilo}) => {
  const fotograma = useCurrentFrame();
  // ¿Cuántas letras tocan ya en este fotograma?
  const visibles = Math.max(0, Math.floor((fotograma - inicio) * letrasPorFotograma));

  // Truco de maquetación: el texto completo SIEMPRE está en pantalla,
  // pero las letras que aún no tocan van transparentes. Así el párrafo
  // ocupa su sitio definitivo desde el principio y nada "salta".
  return (
    <span style={estilo}>
      {[...texto].map((letra, i) => (
        <span key={i} style={{opacity: i < visibles ? 1 : 0}}>
          {letra}
        </span>
      ))}
    </span>
  );
};
