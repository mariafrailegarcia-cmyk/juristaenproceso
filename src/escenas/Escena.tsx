// ============================================================
// ESCENA — el director de escena. Mira el campo "visual.tipo"
// del guion y monta la plantilla visual correspondiente.
//
// Clave de sincronización: cada escena conoce su duración (la de
// su audio de voz) y reparte las animaciones en proporción. Por
// eso dibujo y locución siempre van a la par.
// ============================================================
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORES, FUENTES} from '../tema';
import type {Escena as DatosEscena, Visual} from '../tipos';
import {Balanza} from '../componentes/Balanza';
import {ListaPuntos} from '../componentes/ListaPuntos';
import {Monigote} from '../componentes/Monigote';
import {Pizarra} from '../componentes/Pizarra';
import {Sello} from '../componentes/Sello';
import {TextoEscrito} from '../componentes/TextoEscrito';
import {Trazo, lapiz, tinta, usarProgreso} from '../componentes/Rough';

// ---------- TITULO: gran título serif que se escribe, con subrayado ----------
const VisualTitulo: React.FC<{visual: Extract<Visual, {tipo: 'titulo'}>; duracion: number}> = ({
  visual,
  duracion,
}) => {
  const fotograma = useCurrentFrame();
  // El subrayado se dibuja cuando el título ya casi está escrito.
  const finEscritura = Math.min(visual.texto.length / 1.1, duracion * 0.45);
  const subrayado = usarProgreso(finEscritura + 6, 20);
  const anchoLinea = Math.min(1500, visual.texto.length * 52);
  const linea = useMemo(
    () => lapiz.line(0, 12, anchoLinea, 16, tinta(163, {stroke: COLORES.ambar, strokeWidth: 5})),
    [anchoLinea]
  );
  const entradaSub = interpolate(fotograma, [finEscritura + 20, finEscritura + 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 36}}>
      <TextoEscrito
        texto={visual.texto}
        letrasPorFotograma={visual.texto.length / Math.max(1, finEscritura)}
        estilo={{
          fontFamily: FUENTES.serif,
          fontWeight: 700,
          fontSize: 110,
          color: COLORES.tinta,
          textAlign: 'center',
          maxWidth: 1600,
        }}
      />
      <svg width={anchoLinea} height={30} style={{overflow: 'visible'}}>
        <Trazo forma={linea} progreso={subrayado} />
      </svg>
      {visual.subtitulo ? (
        <div
          style={{
            fontFamily: FUENTES.sans,
            fontSize: 42,
            color: COLORES.tintaSuave,
            opacity: entradaSub,
          }}
        >
          {visual.subtitulo}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- DEFINICION: término + definición en una pizarra ----------
const VisualDefinicion: React.FC<{
  visual: Extract<Visual, {tipo: 'definicion'}>;
  duracion: number;
}> = ({visual, duracion}) => {
  const marco = usarProgreso(0, Math.min(40, duracion * 0.3));
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <Pizarra ancho={1340} alto={620} progreso={marco}>
        <div
          style={{
            fontFamily: FUENTES.serif,
            fontWeight: 600,
            fontSize: 74,
            color: COLORES.tinta,
            marginBottom: 40,
          }}
        >
          <TextoEscrito texto={visual.termino} inicio={18} letrasPorFotograma={1} />
        </div>
        <div
          style={{
            fontFamily: FUENTES.sans,
            fontSize: 46,
            lineHeight: 1.5,
            color: COLORES.tintaSuave,
          }}
        >
          <TextoEscrito
            texto={visual.definicion}
            inicio={30}
            letrasPorFotograma={visual.definicion.length / Math.max(1, duracion * 0.55)}
          />
        </div>
      </Pizarra>
    </AbsoluteFill>
  );
};

// ---------- LISTA: puntos que aparecen repartidos por la locución ----------
const VisualLista: React.FC<{visual: Extract<Visual, {tipo: 'lista'}>; duracion: number}> = ({
  visual,
  duracion,
}) => {
  // Los puntos se reparten a lo largo del 70% de la voz: el primero
  // pronto, el último antes de que la locutora termine.
  const intervalo = (duracion * 0.7) / Math.max(1, visual.puntos.length);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 70}}>
      {visual.titulo ? (
        <div style={{fontFamily: FUENTES.serif, fontWeight: 600, fontSize: 84, color: COLORES.tinta}}>
          <TextoEscrito texto={visual.titulo} letrasPorFotograma={1.3} />
        </div>
      ) : null}
      <ListaPuntos puntos={visual.puntos} inicio={duracion * 0.12} intervalo={intervalo} />
    </AbsoluteFill>
  );
};

// ---------- BALANZA: la balanza con etiquetas y frase opcional ----------
const VisualBalanza: React.FC<{visual: Extract<Visual, {tipo: 'balanza'}>; duracion: number}> = ({
  visual,
  duracion,
}) => {
  const dibujo = usarProgreso(4, Math.min(70, duracion * 0.45));
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 48}}>
      {visual.texto ? (
        <div
          style={{
            fontFamily: FUENTES.serif,
            fontStyle: 'italic',
            fontSize: 56,
            color: COLORES.tinta,
            textAlign: 'center',
            maxWidth: 1500,
          }}
        >
          <TextoEscrito
            texto={visual.texto}
            inicio={duracion * 0.32}
            letrasPorFotograma={visual.texto.length / Math.max(1, duracion * 0.4)}
          />
        </div>
      ) : null}
      <Balanza etiquetas={visual.etiquetas} progreso={dibujo} alto={visual.texto ? 680 : 800} />
    </AbsoluteFill>
  );
};

// ---------- MONIGOTE: el estudiante con un bocadillo de diálogo ----------
const VisualMonigote: React.FC<{visual: Extract<Visual, {tipo: 'monigote'}>; duracion: number}> = ({
  visual,
  duracion,
}) => {
  const dibujoFigura = usarProgreso(2, Math.min(45, duracion * 0.35));
  const dibujoBocadillo = usarProgreso(Math.min(45, duracion * 0.35), 22);
  const bocadillo = useMemo(
    () => ({
      globo: lapiz.ellipse(330, 160, 620, 290, tinta(167, {strokeWidth: 3})),
      rabito: lapiz.path('M 110 270 L 30 360 L 175 295', tinta(173, {strokeWidth: 3})),
    }),
    []
  );
  return (
    <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 70}}>
      <Monigote pose={visual.pose ?? 'neutral'} progreso={dibujoFigura} alto={460} />
      <div style={{position: 'relative', width: 680, height: 380}}>
        <svg viewBox="0 0 680 380" style={{position: 'absolute', width: '100%', height: '100%', overflow: 'visible'}}>
          <Trazo forma={bocadillo.rabito} progreso={dibujoBocadillo} />
          <Trazo forma={bocadillo.globo} progreso={dibujoBocadillo} />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: 60,
            width: 490,
            height: 210,
            display: 'flex',
            alignItems: 'center',
            textAlign: 'center',
            fontFamily: FUENTES.sans,
            fontSize: 42,
            lineHeight: 1.4,
            color: COLORES.tinta,
          }}
        >
          <TextoEscrito
            texto={visual.texto}
            inicio={Math.min(60, duracion * 0.4)}
            letrasPorFotograma={visual.texto.length / Math.max(1, duracion * 0.45)}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- SELLO: frase de apoyo y estampado del veredicto ----------
const VisualSello: React.FC<{visual: Extract<Visual, {tipo: 'sello'}>; duracion: number}> = ({
  visual,
  duracion,
}) => {
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 90}}>
      {visual.apoyo ? (
        <div
          style={{
            fontFamily: FUENTES.serif,
            fontSize: 60,
            color: COLORES.tinta,
            textAlign: 'center',
            maxWidth: 1500,
          }}
        >
          <TextoEscrito
            texto={visual.apoyo}
            inicio={5}
            letrasPorFotograma={visual.apoyo.length / Math.max(1, duracion * 0.35)}
          />
        </div>
      ) : null}
      {/* El sello golpea pasada la mitad de la locución: la voz prepara,
          el sello remata. */}
      <Sello texto={visual.texto} impacto={Math.round(duracion * 0.55)} escala={1.3} />
    </AbsoluteFill>
  );
};

// ---------- El selector ----------
export const Escena: React.FC<{escena: DatosEscena}> = ({escena}) => {
  const {visual, duracionFrames} = escena;
  switch (visual.tipo) {
    case 'titulo':
      return <VisualTitulo visual={visual} duracion={duracionFrames} />;
    case 'definicion':
      return <VisualDefinicion visual={visual} duracion={duracionFrames} />;
    case 'lista':
      return <VisualLista visual={visual} duracion={duracionFrames} />;
    case 'balanza':
      return <VisualBalanza visual={visual} duracion={duracionFrames} />;
    case 'monigote':
      return <VisualMonigote visual={visual} duracion={duracionFrames} />;
    case 'sello':
      return <VisualSello visual={visual} duracion={duracionFrames} />;
  }
};
