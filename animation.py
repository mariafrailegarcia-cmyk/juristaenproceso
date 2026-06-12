"""
Monigote segun el dibujo de referencia:
  - Lineas finas, estilo boceto
  - Cabeza circular con UN ojo y sonrisa curva
  - Saco grande y redondo a la ESPALDA, nudo con cola
  - Cuerpo inclinado hacia delante cargando el peso
  - Paracaidas al saltar al abismo
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle, FancyArrowPatch
from matplotlib.animation import FuncAnimation, FFMpegWriter
from matplotlib.lines import Line2D

FPS = 24
DURATION = 30
N = FPS * DURATION

W, H = 16.0, 9.0
GY = 3.2
CLIFF_X = 33.0
WORLD_W = CLIFF_X + W + 5

PH_ENTER = 2  * FPS
PH_RUN   = 20 * FPS
PH_SLOW  = 23 * FPS
PH_OPEN  = 27 * FPS
PH_END   = N

C_BG    = '#ffffff'
C_BLACK = '#1a1a1a'
C_WHITE = '#ffffff'
C_LGRAY = '#ebebeb'
C_MGRAY = '#bbbbbb'
C_DGRAY = '#666666'

# Lineas finas como en el dibujo
LW = 2.2
LW_THIN = 1.5

def lerp(a, b, t):  return a + (b-a)*float(np.clip(t,0,1))
def ease_out(t):    t=float(np.clip(t,0,1)); return 1-(1-t)**2
def ease_in(t):     t=float(np.clip(t,0,1)); return t**2

HEAD_R = 0.30
BODY_H = 1.05
ARM_L  = 0.48
LEG_L  = 0.68
LEAN   = 0.22   # inclinacion hacia delante (radianes)

def figure_geom(hip_x, hip_y, frame, phase):
    """
    Geometria del monigote inclinado, como en la referencia.
    Torso inclinado hacia delante (LEAN radianes).
    """
    cycle = 11
    if phase == 'run':
        t      = np.sin(frame / cycle * 2 * np.pi)
        la, ra = t * 0.70, -t * 0.70
        laa    = -t * 0.52   # brazo izquierdo (el que va atras sujetando el saco)
        raa    =  t * 0.52   # brazo derecho (oscila libre)
        bob    = abs(np.sin(frame / cycle * np.pi)) * 0.07
        swing  = t * 0.10
    elif phase == 'slow':
        la, ra, laa, raa, bob, swing = 0.25, -0.25, -0.20, 0.20, 0.0, 0.0
    elif phase == 'stop':
        la = ra = laa = raa = bob = swing = 0.0
    elif phase == 'lift':
        la, ra, laa, raa, bob, swing = 0.10, -0.10, 0.40, 0.40, 0.0, 0.0
    elif phase == 'head_in':
        la, ra, laa, raa, bob, swing = 0.12, -0.12, 0.70, 0.70, 0.0, 0.0
    else:  # fall
        la, ra, laa, raa, bob, swing = 0.75, -0.75, 0.88, 0.88, 0.0, 0.0

    # Torso inclinado: la cadera es el punto base
    lean_x = np.sin(LEAN) * BODY_H
    lean_y = np.cos(LEAN) * BODY_H
    torso_x = hip_x + lean_x
    torso_y = hip_y + lean_y + bob
    head_cx = torso_x
    head_cy = torso_y + HEAD_R

    mid_x = hip_x + lean_x * 0.55
    mid_y = hip_y + lean_y * 0.55 + bob

    # Piernas desde la cadera
    lleg_end = (hip_x + np.sin(la)*LEG_L, hip_y - np.cos(la)*LEG_L)
    rleg_end = (hip_x + np.sin(ra)*LEG_L, hip_y - np.cos(ra)*LEG_L)

    # Brazo izquierdo: va hacia atras/abajo (sujetando el saco)
    larm_end = (mid_x - np.cos(laa)*ARM_L*0.9,
                mid_y - np.sin(laa)*ARM_L*0.55)
    # Brazo derecho: oscila libre hacia delante
    rarm_end = (mid_x + np.cos(raa)*ARM_L*0.85,
                mid_y - np.sin(raa)*ARM_L*0.45)

    return {
        'head'    : (head_cx, head_cy),
        'torso'   : [(hip_x, hip_y), (torso_x, torso_y)],
        'lleg'    : [(hip_x, hip_y), lleg_end],
        'rleg'    : [(hip_x, hip_y), rleg_end],
        'larm'    : [(mid_x, mid_y), larm_end],
        'rarm'    : [(mid_x, mid_y), rarm_end],
        'mid'     : (mid_x, mid_y),
        'hip'     : (hip_x, hip_y),
        'swing'   : swing,
    }

def dome_pts(cx, cy, r, n=52):
    theta = np.linspace(0, np.pi, n)
    xs = np.concatenate([cx + r*np.cos(theta), [cx]])
    ys = np.concatenate([cy + r*np.sin(theta), [cy]])
    return np.column_stack([xs, ys])

# ─── Canvas ───────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 9), dpi=100)
ax  = fig.add_axes([0, 0, 1, 1])
ax.set_ylim(0, H)
ax.set_xlim(0, W)
ax.set_aspect('equal')
ax.axis('off')
fig.patch.set_facecolor(C_BG)

# ─── Fondo ────────────────────────────────────────────────────────────────────
ax.add_patch(Rectangle((0, 0), WORLD_W, GY, color=C_LGRAY, linewidth=0, zorder=1))
ax.add_patch(Rectangle((0, GY-0.08), WORLD_W, 0.10, color=C_BLACK, linewidth=0, zorder=2))

# Grietas en el suelo
for gx in np.arange(1.5, WORLD_W, 3.5):
    pts = [(gx, GY-0.05), (gx+0.45, GY-0.05),
           (gx+0.25, GY-0.20), (gx+0.70, GY-0.20)]
    ax.plot([p[0] for p in pts[:2]], [p[1] for p in pts[:2]],
            color=C_MGRAY, lw=LW_THIN, zorder=2)
    ax.plot([p[0] for p in pts[2:]], [p[1] for p in pts[2:]],
            color=C_MGRAY, lw=LW_THIN, zorder=2)

# Cactos (lineas finas)
def add_cactus(x, h=1.3):
    ax.add_patch(Rectangle((x-0.09, GY), 0.18, h, facecolor=C_LGRAY,
                            edgecolor=C_DGRAY, linewidth=LW_THIN, zorder=3))
    ax.add_patch(Rectangle((x-0.40, GY+h*0.42), 0.31, 0.13, facecolor=C_LGRAY,
                            edgecolor=C_DGRAY, linewidth=LW_THIN, zorder=3))
    ax.add_patch(Rectangle((x-0.42, GY+h*0.30), 0.13, h*0.25, facecolor=C_LGRAY,
                            edgecolor=C_DGRAY, linewidth=LW_THIN, zorder=3))
    ax.add_patch(Rectangle((x+0.09, GY+h*0.58), 0.28, 0.13, facecolor=C_LGRAY,
                            edgecolor=C_DGRAY, linewidth=LW_THIN, zorder=3))
    ax.add_patch(Rectangle((x+0.25, GY+h*0.46), 0.13, h*0.25, facecolor=C_LGRAY,
                            edgecolor=C_DGRAY, linewidth=LW_THIN, zorder=3))

for xc in [2.8, 6.5, 10.2, 14.8, 19.3, 23.7, 28.2]:
    add_cactus(xc, h=1.05 + (int(xc) % 4)*0.14)

# Abismo
ax.add_patch(Rectangle((CLIFF_X, 0), WORLD_W-CLIFF_X, GY,
                        color=C_BLACK, linewidth=0, zorder=4))
# Borde del precipicio (linea gruesa)
ax.plot([CLIFF_X, CLIFF_X], [0, GY], color=C_BLACK, lw=3, zorder=5)

# ─── Monigote — parches dinamicos ─────────────────────────────────────────────
# Cabeza: circulo con borde, relleno blanco (como en el dibujo)
head_p = Circle((0,0), HEAD_R, facecolor=C_WHITE, edgecolor=C_BLACK,
                linewidth=LW, zorder=14)
# UN ojo (punto) en el lado derecho de la cara
eye_p  = Circle((0,0), 0.055, facecolor=C_BLACK, linewidth=0, zorder=15)
# Sonrisa
smile_l, = ax.plot([], [], color=C_BLACK, lw=LW_THIN+0.3, zorder=15,
                   solid_capstyle='round')

ax.add_patch(head_p)
ax.add_patch(eye_p)

body_l,  = ax.plot([], [], color=C_BLACK, lw=LW, zorder=13, solid_capstyle='round')
lleg_l,  = ax.plot([], [], color=C_BLACK, lw=LW, zorder=13, solid_capstyle='round')
rleg_l,  = ax.plot([], [], color=C_BLACK, lw=LW, zorder=13, solid_capstyle='round')
larm_l,  = ax.plot([], [], color=C_BLACK, lw=LW, zorder=13, solid_capstyle='round')
rarm_l,  = ax.plot([], [], color=C_BLACK, lw=LW, zorder=13, solid_capstyle='round')

# ─── Saco grande y redondo a la espalda ───────────────────────────────────────
# El saco es casi una esfera — Ellipse grande
SACK_A = 0.75   # semi-eje horizontal
SACK_B = 0.72   # semi-eje vertical

sack_p = Ellipse((0,0), SACK_A*2, SACK_B*2,
                 facecolor=C_WHITE, edgecolor=C_BLACK,
                 linewidth=LW, zorder=10)
ax.add_patch(sack_p)

# Nudo/lazo: lineas convergentes + cola
# Usamos 4 line2D para el nudo y 1 para la cola
knot_lines = [ax.plot([], [], color=C_BLACK, lw=LW_THIN, zorder=12,
                       solid_capstyle='round')[0] for _ in range(4)]
knot_tail,  = ax.plot([], [], color=C_BLACK, lw=LW_THIN, zorder=12,
                       solid_capstyle='round')

# ─── Paracaidas ───────────────────────────────────────────────────────────────
DOME_PTS = 53
chute_dome = Polygon(dome_pts(-100, -100, 1.0, DOME_PTS),
                     facecolor=C_WHITE, edgecolor=C_BLACK,
                     linewidth=LW, zorder=10, visible=False)
ax.add_patch(chute_dome)

N_PANELS = 6
panel_ls = [ax.plot([], [], color=C_MGRAY, lw=LW_THIN, zorder=11)[0]
            for _ in range(N_PANELS+1)]
string_ls = [ax.plot([], [], color=C_DGRAY, lw=LW_THIN+0.2, zorder=11,
                      solid_capstyle='round')[0] for _ in range(4)]

# ─── Update ───────────────────────────────────────────────────────────────────
def update(frame):
    # Posicion mundo del monigote
    if frame < PH_ENTER:
        wx, wy, phase, fall_p = -3.5, GY, 'run', 0.0
    elif frame < PH_RUN:
        p   = (frame-PH_ENTER)/(PH_RUN-PH_ENTER)
        wx  = lerp(-3.5, CLIFF_X-1.15, ease_out(p*0.97))
        wy, phase, fall_p = GY, 'run', 0.0
    elif frame < PH_SLOW:
        p   = (frame-PH_RUN)/(PH_SLOW-PH_RUN)
        wx  = lerp(CLIFF_X-1.15, CLIFF_X-0.65, ease_out(p))
        wy, fall_p = GY, 0.0
        phase = 'slow' if p < 0.6 else 'stop'
    elif frame < PH_OPEN:
        p   = (frame-PH_SLOW)/(PH_OPEN-PH_SLOW)
        wx, wy, fall_p = CLIFF_X-0.65, GY, 0.0
        phase = 'lift' if p < 0.45 else 'head_in'
    else:
        p   = (frame-PH_OPEN)/(PH_END-PH_OPEN)
        wx  = lerp(CLIFF_X-0.65, CLIFF_X+0.7, ease_in(p*1.35))
        wy  = GY - ease_in(p)*(GY+3.8)*1.35
        phase, fall_p = 'fall', p

    # Camara
    ax.set_xlim(max(0, wx-5.5), max(0, wx-5.5)+W)

    g = figure_geom(wx, wy, frame, phase)
    hx, hy = g['head']

    # ── Cabeza ────────────────────────────────────────────────────────────────
    if phase == 'head_in':
        head_p.set_visible(False)
        eye_p.set_visible(False)
        smile_l.set_data([], [])
    else:
        head_p.set_visible(True)
        head_p.center = (hx, hy)
        # Ojo en el lado derecho de la cara (mirando a la derecha)
        eye_p.set_visible(True)
        eye_p.center  = (hx + 0.14, hy + 0.06)
        # Sonrisa
        sx = np.linspace(hx - 0.10, hx + 0.12, 10)
        sy = hy - 0.09 + 0.05*np.sin(np.linspace(0, np.pi, 10))
        smile_l.set_data(sx, sy)

    # ── Cuerpo ────────────────────────────────────────────────────────────────
    body_l.set_data([p[0] for p in g['torso']], [p[1] for p in g['torso']])
    lleg_l.set_data([p[0] for p in g['lleg']], [p[1] for p in g['lleg']])
    rleg_l.set_data([p[0] for p in g['rleg']], [p[1] for p in g['rleg']])
    larm_l.set_data([p[0] for p in g['larm']], [p[1] for p in g['larm']])
    rarm_l.set_data([p[0] for p in g['rarm']], [p[1] for p in g['rarm']])

    # ── Saco / Paracaidas ─────────────────────────────────────────────────────
    if phase in ('run', 'slow', 'stop'):
        sack_p.set_visible(True)
        chute_dome.set_visible(False)

        # Saco a la ESPALDA: centro a la izquierda del torso del monigote
        # (izquierda porque el monigote va hacia la derecha)
        sw = g['swing']
        sx = wx - SACK_A * 0.92 - sw * 0.18
        sy = wy + BODY_H * 0.52 + abs(sw) * 0.05

        sack_p.center = (sx, sy)
        sack_p.width  = SACK_A * 2
        sack_p.height = SACK_B * 2

        # Nudo: punto de contacto en el lado DERECHO del saco (donde toca al monigote)
        kx = sx + SACK_A * 0.78
        ky = sy + 0.08

        # 4 lineas convergentes desde el borde del saco hacia el nudo
        offsets = [(-0.05, 0.38), (0.08, 0.30), (0.05, -0.28), (-0.08, -0.22)]
        for i, (dx, dy) in enumerate(offsets):
            knot_lines[i].set_data([sx + SACK_A*0.55 + dx, kx],
                                   [ky + dy, ky])

        # Cola del nudo: curva hacia abajo
        tail_x = np.linspace(kx, kx+0.08, 8)
        tail_y = ky - np.linspace(0, 0.35, 8) - 0.04*np.sin(np.linspace(0,np.pi*2,8))
        knot_tail.set_data(tail_x, tail_y)

        for pl in panel_ls:   pl.set_data([], [])
        for sl in string_ls:  sl.set_data([], [])

    elif phase in ('lift', 'head_in'):
        # Saco se levanta sobre la cabeza
        p_prog = (frame - PH_SLOW) / (PH_OPEN - PH_SLOW)
        lift   = ease_out(p_prog)

        sx = lerp(wx - SACK_A*0.92, wx, lift)
        sy = lerp(wy + BODY_H*0.52, hy + 0.38, lift)

        sack_p.set_visible(True)
        sack_p.center = (sx, sy)
        sack_p.width  = SACK_A*2
        sack_p.height = SACK_B*2
        chute_dome.set_visible(False)

        for kl in knot_lines: kl.set_data([], [])
        knot_tail.set_data([], [])
        for pl in panel_ls:   pl.set_data([], [])
        for sl in string_ls:  sl.set_data([], [])

    else:  # fall — paracaidas
        sack_p.set_visible(False)
        for kl in knot_lines: kl.set_data([], [])
        knot_tail.set_data([], [])

        inflate = ease_out(min(fall_p*2.8, 1.0))
        r = lerp(0.38, 2.1, inflate)

        mid_x, mid_y = g['mid']
        dcx = wx
        dcy = wy + BODY_H + HEAD_R*2.5 + r*0.38

        chute_dome.set_xy(dome_pts(dcx, dcy, r, DOME_PTS))
        chute_dome.set_visible(True)

        # Costuras del paracaidas
        for i, pl in enumerate(panel_ls):
            ang = np.pi * i / N_PANELS
            pl.set_data([dcx, dcx + r*np.cos(ang)],
                        [dcy, dcy + r*np.sin(ang)])

        # Cuerdas
        for i, ang in enumerate([np.pi*0.12, np.pi*0.36, np.pi*0.64, np.pi*0.88]):
            string_ls[i].set_data(
                [dcx + r*np.cos(ang), wx],
                [dcy + r*np.sin(ang), mid_y])

    return []

# ─── Render ───────────────────────────────────────────────────────────────────
print("Renderizando 720 frames…")
anim = FuncAnimation(fig, update, frames=N, blit=False, interval=1000/FPS)
writer = FFMpegWriter(fps=FPS, codec='libx264',
                      extra_args=['-pix_fmt', 'yuv420p', '-crf', '18'])
out = '/home/user/juristaenproceso/monigote_bw.mp4'
anim.save(out, writer=writer, dpi=100)
print(f"✓ {out}")
