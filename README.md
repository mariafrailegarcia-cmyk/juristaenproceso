# Jurista en Proceso 🎓§

Fábrica de videos para el canal de YouTube **Jurista en Proceso**: videos
educativos de derecho de ~8 minutos, estilo doodle dibujado a mano, con voz
en off. *Se admite a trámite.*

## La idea en una frase

**El código es una plantilla fija que nunca se toca; cada video nuevo es
solo un archivo `guion.json`.** El guion dice qué se cuenta (la voz) y qué
se dibuja (el visual); todo lo demás —voces, tiempos, sincronización,
render— es automático.

## Cómo se hace un video (el flujo completo)

```
guion.json ──► para cada escena:
                 ¿hay grabación tuya en guiones/<exp>/audio/?
                   SÍ → se normaliza su volumen y se usa
                   NO → edge-tts genera una voz de borrador
           ──► se mide la duración exacta de cada audio
           ──► cada escena del video dura lo que dura su voz
           ──► Remotion dibuja los 30 fotogramas de cada segundo
           ──► out/expediente-XXXX.mp4
```

Todo eso lo hace un solo comando:

```bash
npm run producir -- guiones/0000-presuncion-de-inocencia.json
```

Opciones útiles:

- `--sin-voz` — no llama a edge-tts; las escenas sin grabación tuya usan
  una duración estimada por el texto. Para borradores sin conexión.
- `--sin-render` — prepara voces, `locucion.txt` y datos, sin renderizar.

## Para crear un video nuevo

1. Copia un guion de la carpeta `guiones/` y cámbiale el número de
   expediente, el título y las escenas. **No hay que tocar nada más.**
2. Ejecuta `npm run producir -- guiones/tu-guion.json --sin-render`.
   Esto crea `guiones/<expediente>/locucion.txt` con el texto numerado
   de cada escena, listo para leerlo al grabarte.
3. Graba tu voz (ver siguiente sección) o salta este paso para
   previsualizar con la voz sintética de borrador.
4. Ejecuta `npm run producir -- guiones/tu-guion.json`.
5. El video aparece en `out/`.

## Tu voz: cómo grabar y dónde poner los audios

La voz definitiva del canal es la tuya. El sistema funciona así: **si una
escena tiene grabación tuya, la usa; si no, pone una voz sintética de
borrador** (así puedes previsualizar el video completo antes de grabarte).

Reglas de los archivos:

- Un audio por escena, llamado exactamente `escena-01.mp3`,
  `escena-02.mp3`… (siempre dos cifras). También valen `.m4a` (el formato
  típico del móvil) y `.wav`.
- Se guardan en `guiones/<expediente>/audio/`, por ejemplo
  `guiones/0000/audio/escena-01.m4a`.
- No te preocupes por el volumen: el pipeline lo normaliza con ffmpeg
  (sonoridad −16 LUFS, el estándar para voz en YouTube) para que todas
  las escenas suenen parejas aunque las grabes en días distintos.
- Si regrabas una escena, sube el archivo nuevo con el mismo nombre:
  el pipeline detecta el cambio y la reprocesa sola.

### Subir los audios desde la web de GitHub (sin programar nada)

1. Entra en el repositorio en github.com y navega a la carpeta
   `guiones/<expediente>/audio/` (existe desde la primera vez que se
   ejecuta el pipeline; dentro verás también `locucion.txt` un nivel
   arriba, con el texto que leer en cada toma).
2. Pulsa **Add file → Upload files** (arriba a la derecha).
3. Arrastra tus audios a la zona de subida. Comprueba que los nombres
   sean `escena-01.m4a`, `escena-02.m4a`…
4. Abajo, escribe un mensaje tipo "Voces del expediente 0001" y pulsa
   **Commit changes**.
5. Pide en una sesión de Claude Code: «produce el expediente 0001» —
   o ejecuta tú el comando del paso 4 de la sección anterior.

### Anatomía de una escena del guion

```json
{
  "voz": "Lo que dice la locutora en esta escena.",
  "visual": {"tipo": "lista", "titulo": "Tres claves", "puntos": ["…", "…"]}
}
```

Tipos de visual disponibles (y qué dibuja cada uno):

| tipo | qué se ve | campos |
|---|---|---|
| `titulo` | gran título serif que se escribe solo, con subrayado ámbar | `texto`, `subtitulo` (opcional) |
| `definicion` | un término y su definición enmarcados en una pizarra | `termino`, `definicion` |
| `lista` | puntos que aparecen uno a uno con su visto a mano | `titulo` (opcional), `puntos` |
| `balanza` | la balanza de la justicia, con etiqueta bajo cada platillo | `etiquetas` (2), `texto` (opcional) |
| `monigote` | el estudiante de palitos con bocadillo de diálogo | `texto`, `pose` (`neutral`/`duda`/`celebra`) |
| `sello` | un sello rojo teja cae y estampa una palabra | `texto`, `apoyo` (opcional) |

Para ampliar el catálogo se añade el tipo en `src/tipos.ts` y su dibujo en
`src/escenas/Escena.tsx`; los guiones antiguos no se ven afectados.

## Mapa del proyecto

```
guiones/        ← los guiones: AQUÍ se crean los videos nuevos
  <expediente>/
    locucion.txt ← el texto numerado para leer al grabarte (lo crea el pipeline)
    audio/       ← TUS grabaciones: escena-01.mp3, escena-02.m4a…
scripts/
  config.mjs    ← la voz y su velocidad (un solo sitio para cambiarla)
  producir.mjs  ← el pipeline completo guion → mp4
  generar-sfx.mjs ← fabrica el golpe seco del sello (npm run sfx)
public/
  sfx/          ← el sonido del sello
  audio/        ← las voces generadas (no se suben a git; se regeneran)
src/
  tema.ts       ← paleta de colores, tipografías, formato (30fps, 1920x1080)
  tipos.ts      ← el "contrato" de lo que puede contener un guion
  Root.tsx      ← registra el video y calcula su duración total
  Video.tsx     ← la mesa de montaje: intro → escenas → outro + marca de agua
  componentes/  ← las piezas doodle reutilizables (rough.js)
  escenas/      ← Intro, Outro y el selector de escenas
```

## Identidad visual (resumen de reglas)

- Tinta `#2b2a26` sobre papel `#faf7f1`, mucho espacio en blanco.
- Acentos en ámbar `#d9a441`. El rojo teja `#c96f5a` está **reservado al
  sello**: no se usa para nada más.
- Serif (Playfair Display) para títulos; sans (Inter) para apoyo.
- Trazo fino estilo doodle con rough.js. Cada forma usa una **semilla
  fija** para que el temblor del trazo no parpadee entre fotogramas.
- Marca de agua (§ con birrete) siempre visible abajo a la derecha al 50%.

## La voz sintética de borrador

Para las escenas que aún no tienen grabación tuya se usa
`es-ES-ElviraNeural` (femenina, español de España) a velocidad `+4%`.
Se cambia en `scripts/config.mjs`. Para escuchar otras:

```bash
python3 -m edge_tts --list-voices | grep es-ES
```

> ⚠️ edge-tts necesita conexión con `speech.platform.bing.com`. Si se
> trabaja en un entorno con red restringida, ese dominio debe estar
> permitido; mientras tanto se puede usar `--sin-voz` para borradores.

## Puesta en marcha desde cero

```bash
npm install            # las librerías de video
pip3 install edge-tts  # la voz
npm run sfx            # genera el sonido del sello (una vez)
npm run producir -- guiones/0000-presuncion-de-inocencia.json
```

Para previsualizar y retocar en vivo (abre un editor en el navegador):

```bash
npm run estudio
```

---
*Nota: Remotion tiene licencia propia — gratuita para personas físicas y
equipos de hasta 3; ver [remotion.dev/license](https://remotion.dev/license).*
