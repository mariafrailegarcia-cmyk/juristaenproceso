"""
Monigote tetrico en el desierto — 30 segundos, 24fps, 720 frames.
Enfoque: todo en coordenadas de mundo, la camara es ax.set_xlim().
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle
from matplotlib.animation import FuncAnimation, FFMpegWriter
from matplotlib.lines import Line2D

# ─── Parametros ───────────────────────────────────────────────────────────────
FPS      = 24
DURATION = 30
N        = FPS * DURATION   # 720 frames

VIEWPORT_W = 16.0
VIEWPORT_H = 9.0
GY         = 2.8            # nivel del suelo en Y

# Palette tetrica
C_FIG   = '#0d0d0d'
C_SACK  = '#e8e8e5'
C_WIRE  = '#1faa1f'
C_SKULL = '#c8c8b0'
C_CLIFF = '#1a0d05'
C_VOID  = '#030303'

# Posicion del abismo en coordenadas de mundo
CLIFF_X = 30.0

# Phases (en frames)
PH_WAIT  = 3  * FPS    # 72   — plano inicial sin personaje visible
PH_RUN   = 20 * FPS    # 480  — corriendo
PH_STOP  = 24 * FPS    # 576  — frenando/llegando
PH_OPEN  = 27 * FPS    # 648  — abre saco, mete cabeza
PH_FALL  = N            # 720  — salta, paracaidas

def lerp(a, b, t):
    return a + (b - a) * float(np.clip(t, 0, 1))

def ease_out(t):
    t = float(np.clip(t, 0, 1))
    return 1 - (1 - t) ** 2

def ease_in(t):
    t = float(np.clip(t, 0, 1))
    return t ** 2

# ─── Figura ──────────────────────────────────────────────────────────────────
def figure_geom(hip_x, hip_y, frame, phase):
    """Devuelve geometria del monigote."""
    body_h   = 0.90
    head_r   = 0.28
    arm_len  = 0.44
    leg_len  = 0.55
    torso_y  = hip_y + body_h
    head_cy  = torso_y + head_r
    mid_body = hip_y + body_h * 0.6

    if phase == 'run':
        cycle = 10
        a = np.sin(frame / cycle * 2 * np.pi) * 0.55
        la, ra = a, -a
        aa = np.sin(frame / cycle * 2 * np.pi) * 0.45
    elif phase == 'stop':
        la = ra = aa = 0.0
    elif phase == 'bend':
        la, ra, aa = 0.15, -0.15, 0.0
    elif phase == 'head_in':
        la, ra, aa = 0.22, -0.22, 0.35
    else:  # fall
        la, ra, aa = 0.55, -0.55, 0.9

    lleg = [(hip_x, hip_y),
            (hip_x + np.sin(la) * leg_len, hip_y - np.cos(la) * leg_len)]
    rleg = [(hip_x, hip_y),
            (hip_x + np.sin(ra) * leg_len, hip_y - np.cos(ra) * leg_len)]
    larm = [(hip_x, mid_body),
            (hip_x - np.cos(aa) * arm_len, mid_body - np.sin(aa) * arm_len + 0.12)]
    rarm = [(hip_x, mid_body),
            (hip_x + np.cos(aa) * arm_len, mid_body - np.sin(aa) * arm_len + 0.12)]

    return {
        'head_center': (hip_x, head_cy),
        'body': [(hip_x, hip_y), (hip_x, torso_y)],
        'lleg': lleg, 'rleg': rleg,
        'larm': larm, 'rarm': rarm,
        'hip_y': hip_y, 'mid_body': mid_body, 'torso_y': torso_y,
    }

# ─── Canvas ───────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 9), dpi=100)
ax  = fig.add_axes([0, 0, 1, 1])
ax.set_ylim(0, VIEWPORT_H)
ax.set_xlim(0, VIEWPORT_W)
ax.set_aspect('equal')
ax.axis('off')
fig.patch.set_facecolor('#0a0703')

# ─── Fondo (mundo ancho: 0..CLIFF_X+16) ──────────────────────────────────────
WORLD_W = CLIFF_X + VIEWPORT_W

# Cielo — franjas de gradiente
n_sky = 25
for i in range(n_sky):
    t   = i / n_sky
    r   = int(10 + t * 28)
    g   = int(7  + t * 18)
    b   = int(3  + t * 8)
    col = f'#{r:02x}{g:02x}{b:02x}'
    band = Rectangle((0, GY + (VIEWPORT_H - GY) * i / n_sky),
                     WORLD_W, (VIEWPORT_H - GY) / n_sky,
                     color=col, linewidth=0, zorder=0)
    ax.add_patch(band)

# Suelo
ax.add_patch(Rectangle((0, 0), WORLD_W, GY,
                        color='#b0822a', linewidth=0, zorder=1))
# Franja sombra en la superficie
ax.add_patch(Rectangle((0, GY - 0.12), WORLD_W, 0.14,
                        color='#7a5518', linewidth=0, zorder=2))

# Luna
moon = Circle((CLIFF_X * 0.6, 7.0), 0.65, color='#fffce0', zorder=3, linewidth=0)
ax.add_patch(moon)
for cx, cy, cr in [(CLIFF_X*0.6 - 0.18, 7.15, 0.11),
                    (CLIFF_X*0.6 + 0.22, 6.85, 0.08),
                    (CLIFF_X*0.6 + 0.05, 6.78, 0.06)]:
    ax.add_patch(Circle((cx, cy), cr, color='#e8e4c8', zorder=4, linewidth=0))

# ─── Cactos ───────────────────────────────────────────────────────────────────
def add_cactus(x, h=1.4):
    col = '#162a16'
    ax.add_patch(Rectangle((x - 0.09, GY), 0.18, h, color=col, linewidth=0, zorder=5))
    ax.add_patch(Rectangle((x - 0.40, GY + h*0.40), 0.32, 0.13, color=col, linewidth=0, zorder=5))
    ax.add_patch(Rectangle((x - 0.42, GY + h*0.28), 0.13, h*0.24, color=col, linewidth=0, zorder=5))
    ax.add_patch(Rectangle((x + 0.09, GY + h*0.55), 0.30, 0.13, color=col, linewidth=0, zorder=5))
    ax.add_patch(Rectangle((x + 0.26, GY + h*0.43), 0.13, h*0.24, color=col, linewidth=0, zorder=5))

for cx in [2.5, 6.0, 9.5, 13.0, 17.0, 20.5, 24.0, 27.5]:
    add_cactus(cx, h=1.2 + (cx % 3) * 0.12)

# ─── Calaveras en el suelo ────────────────────────────────────────────────────
def add_skull(x):
    ax.add_patch(Circle((x, GY + 0.22), 0.20, color=C_SKULL, linewidth=0, zorder=5))
    ax.add_patch(Rectangle((x-0.13, GY+0.03), 0.26, 0.13, color=C_SKULL, linewidth=0, zorder=5))
    for ex in [x - 0.08, x + 0.08]:
        ax.add_patch(Circle((ex, GY+0.28), 0.05, color='#0a0a0a', linewidth=0, zorder=6))

for sx in [1.8, 5.0, 8.3, 11.7, 15.5, 19.0, 22.8, 26.0]:
    add_skull(sx)

# ─── Piedras ─────────────────────────────────────────────────────────────────
def add_rock(x, w=0.5, h=0.22):
    pts = [(x, GY), (x+w*0.18, GY+h), (x+w*0.82, GY+h*0.88), (x+w, GY)]
    ax.add_patch(Polygon(pts, color='#5a3e18', linewidth=0, zorder=5))

for rx in [3.8, 7.2, 10.6, 14.2, 18.0, 21.5, 25.0, 28.5]:
    add_rock(rx)

# ─── Abismo ───────────────────────────────────────────────────────────────────
# Cara del precipicio
ax.add_patch(Rectangle((CLIFF_X, 0), WORLD_W - CLIFF_X, GY,
                        color=C_CLIFF, linewidth=0, zorder=6))
# Oscuridad del abismo (encima del suelo del cliff, en color void)
ax.add_patch(Rectangle((CLIFF_X, 0), WORLD_W - CLIFF_X, GY - 0.01,
                        color=C_VOID, linewidth=0, zorder=7))

# ─── Monigote (elementos dinamicos) ──────────────────────────────────────────
LW = 3.8

head_p  = Circle((0, 0), 0.28, color=C_FIG, zorder=10, linewidth=0)
ax.add_patch(head_p)

body_l, = ax.plot([], [], color=C_FIG, lw=LW, zorder=10, solid_capstyle='round')
lleg_l, = ax.plot([], [], color=C_FIG, lw=LW, zorder=10, solid_capstyle='round')
rleg_l, = ax.plot([], [], color=C_FIG, lw=LW, zorder=10, solid_capstyle='round')
larm_l, = ax.plot([], [], color=C_FIG, lw=LW, zorder=10, solid_capstyle='round')
rarm_l, = ax.plot([], [], color=C_FIG, lw=LW, zorder=10, solid_capstyle='round')

# Saco
sack_p  = Ellipse((0, 0), 1.0, 1.4, facecolor=C_SACK, edgecolor='#b0b0a0',
                   linewidth=1.5, zorder=9)
ax.add_patch(sack_p)

wire_l, = ax.plot([], [], color=C_WIRE, lw=3.2, zorder=11,
                  solid_capstyle='round', solid_joinstyle='round')
wire_k  = Circle((0, 0), 0.09, color=C_WIRE, zorder=12, linewidth=0)
ax.add_patch(wire_k)

# Paracaidas (saco inflado)
chute_p = Ellipse((0, 0), 3.0, 1.8, facecolor=C_SACK, edgecolor='#a0a090',
                   linewidth=1.8, zorder=9, visible=False)
ax.add_patch(chute_p)

chute_lines = []
for _ in range(4):
    cl, = ax.plot([], [], color='#888880', lw=1.3, zorder=9, solid_capstyle='round')
    chute_lines.append(cl)

# ─── Update ───────────────────────────────────────────────────────────────────
def update(frame):
    # ── posicion del monigote en coordenadas de mundo ─────────────────────────
    if frame < PH_WAIT:
        fig_wx = -3.0           # fuera del plano
        fall_offset = 0.0
        phase = 'run'
    elif frame < PH_RUN:
        prog    = (frame - PH_WAIT) / (PH_RUN - PH_WAIT)
        fig_wx  = lerp(-1.5, CLIFF_X - 1.0, ease_out(prog))
        fall_offset = 0.0
        phase   = 'run'
    elif frame < PH_STOP:
        prog    = (frame - PH_RUN) / (PH_STOP - PH_RUN)
        fig_wx  = lerp(CLIFF_X - 1.0, CLIFF_X - 0.55, ease_out(prog))
        fall_offset = 0.0
        phase   = 'run' if prog < 0.65 else 'stop'
    elif frame < PH_OPEN:
        prog    = (frame - PH_STOP) / (PH_OPEN - PH_STOP)
        fig_wx  = CLIFF_X - 0.55
        fall_offset = 0.0
        phase   = 'bend' if prog < 0.45 else 'head_in'
    else:
        prog    = (frame - PH_OPEN) / (PH_FALL - PH_OPEN)
        fig_wx  = lerp(CLIFF_X - 0.55, CLIFF_X + 0.3, ease_in(prog))
        fall_offset = ease_in(prog) * (GY + 2.5) * 1.4
        phase   = 'fall'

    fig_wy = GY - fall_offset

    # ── camara: sigue al monigote horizontalmente ─────────────────────────────
    cam_x = max(0.0, fig_wx - 5.0)
    ax.set_xlim(cam_x, cam_x + VIEWPORT_W)

    # ── geometria del monigote ────────────────────────────────────────────────
    g = figure_geom(fig_wx, fig_wy, frame, phase)

    head_p.center = g['head_center']
    body_l.set_data([p[0] for p in g['body']], [p[1] for p in g['body']])
    lleg_l.set_data([p[0] for p in g['lleg']], [p[1] for p in g['lleg']])
    rleg_l.set_data([p[0] for p in g['rleg']], [p[1] for p in g['rleg']])
    larm_l.set_data([p[0] for p in g['larm']], [p[1] for p in g['larm']])
    rarm_l.set_data([p[0] for p in g['rarm']], [p[1] for p in g['rarm']])

    # ── saco / paracaidas ─────────────────────────────────────────────────────
    if phase in ('run', 'stop', 'bend'):
        sx   = fig_wx - 0.28
        sy   = fig_wy + 1.15
        sw, sh = 1.0, 1.4
        sack_p.center = (sx, sy)
        sack_p.width  = sw
        sack_p.height = sh
        sack_p.set_visible(True)
        chute_p.set_visible(False)

        top_y = sy + sh / 2
        wire_l.set_data([sx - 0.22, sx, sx + 0.22, sx, sx],
                        [top_y - 0.04, top_y - 0.04, top_y - 0.04, top_y - 0.04, top_y + 0.12])
        wire_k.center = (sx, top_y + 0.10)
        wire_k.set_visible(True)
        for cl in chute_lines:
            cl.set_data([], [])

    elif phase == 'head_in':
        # Saco se pone encima de la cabeza
        head_cx, head_cy = g['head_center']
        sx = head_cx
        sy = head_cy + 0.55
        sack_p.center = (sx, sy)
        sack_p.width  = 1.1
        sack_p.height = 1.5
        sack_p.set_visible(True)
        chute_p.set_visible(False)
        wire_l.set_data([], [])
        wire_k.set_visible(False)
        for cl in chute_lines:
            cl.set_data([], [])

    else:  # fall
        fall_prog = (frame - PH_OPEN) / (PH_FALL - PH_OPEN)
        inflate   = ease_out(min(fall_prog * 2.5, 1.0))
        cw = lerp(1.1, 3.4, inflate)
        ch = lerp(1.5, 1.9, inflate)

        sack_p.set_visible(False)
        wire_l.set_data([], [])
        wire_k.set_visible(False)

        cx = fig_wx
        cy = fig_wy + 2.0
        chute_p.center = (cx, cy)
        chute_p.width  = cw
        chute_p.height = ch
        chute_p.set_visible(True)

        # cuerdas del paracaidas al monigote
        bot_y = cy - ch / 2
        hip_x = fig_wx
        hip_y_val = fig_wy
        offsets = [-cw*0.42, -cw*0.14, cw*0.14, cw*0.42]
        for i, off in enumerate(offsets):
            chute_lines[i].set_data([cx + off, hip_x], [bot_y, hip_y_val])

    return []

# ─── Render ───────────────────────────────────────────────────────────────────
print("Renderizando 720 frames…")
anim = FuncAnimation(fig, update, frames=N, blit=False, interval=1000 / FPS)

writer = FFMpegWriter(fps=FPS, codec='libx264',
                      extra_args=['-pix_fmt', 'yuv420p', '-crf', '18'])

out = '/home/user/juristaenproceso/monigote_video.mp4'
anim.save(out, writer=writer, dpi=100)
print(f"✓ Video guardado en {out}")
