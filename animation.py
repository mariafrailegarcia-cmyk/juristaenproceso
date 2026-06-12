"""
Monigote en blanco y negro — 30s, 24fps
  - Fondo blanco, suelo gris, desierto
  - Monigote con cara (ojos + boca preocupada)
  - Saco con silueta real (hinchado, cuello, alambre)
  - Al saltar el saco se infla en paracaidas con paneles y cuerdas
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, Polygon, Rectangle
from matplotlib.animation import FuncAnimation, FFMpegWriter
from matplotlib.lines import Line2D

# ─── Config ───────────────────────────────────────────────────────────────────
FPS = 24
DURATION = 30
N = FPS * DURATION          # 720 frames

W, H = 16.0, 9.0
GY = 3.2                    # nivel del suelo
CLIFF_X = 33.0              # abismo en coords de mundo
WORLD_W = CLIFF_X + W + 5

# Fases (frames)
PH_ENTER = 2  * FPS         # 48
PH_RUN   = 20 * FPS         # 480
PH_SLOW  = 23 * FPS         # 552
PH_OPEN  = 27 * FPS         # 648
PH_END   = N                # 720

C_BG    = '#ffffff'
C_BLACK = '#111111'
C_WHITE = '#ffffff'
C_LGRAY = '#e4e4e4'
C_MGRAY = '#aaaaaa'
C_DGRAY = '#555555'
LW_BODY = 4.2

# ─── Helpers ─────────────────────────────────────────────────────────────────
def lerp(a, b, t):  return a + (b-a)*float(np.clip(t,0,1))
def ease_out(t):    t=float(np.clip(t,0,1)); return 1-(1-t)**2
def ease_in(t):     t=float(np.clip(t,0,1)); return t**2

# ─── Saco: silueta tipo "saco de patatas" ─────────────────────────────────────
def sack_body_pts(cx, cy, s=1.0):
    """Silueta del cuerpo del saco: hinchado abajo, cuello arriba."""
    return np.array([
        [cx-0.21*s, cy+0.58*s],   # hombro-izq
        [cx+0.21*s, cy+0.58*s],   # hombro-der
        [cx+0.54*s, cy+0.22*s],   # costado-der-alto
        [cx+0.63*s, cy-0.12*s],   # panza-der
        [cx+0.52*s, cy-0.54*s],   # cadera-der
        [cx+0.00*s, cy-0.70*s],   # fondo-centro
        [cx-0.52*s, cy-0.54*s],   # cadera-izq
        [cx-0.63*s, cy-0.12*s],   # panza-izq
        [cx-0.54*s, cy+0.22*s],   # costado-izq-alto
    ])

def sack_neck_pts(cx, cy, s=1.0):
    """El cuello/cierre del saco (estrecho arriba)."""
    return np.array([
        [cx-0.21*s, cy+0.58*s],
        [cx+0.21*s, cy+0.58*s],
        [cx+0.13*s, cy+0.80*s],
        [cx-0.13*s, cy+0.80*s],
    ])

# ─── Paracaidas: semicirculo con paneles ──────────────────────────────────────
def dome_pts(cx, cy, r, n=50):
    """Semicirculo relleno que forma la cupula del paracaidas."""
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
# Cielo: blanco (ya es el fondo)
# Linea de horizonte lejano
ax.add_patch(Rectangle((0, GY+3.2), WORLD_W, 0.06, color=C_LGRAY, linewidth=0, zorder=1))
# Suelo
ax.add_patch(Rectangle((0, 0), WORLD_W, GY, color=C_LGRAY, linewidth=0, zorder=1))
ax.add_patch(Rectangle((0, GY-0.09), WORLD_W, 0.11, color=C_BLACK, linewidth=0, zorder=2))

# Grietas decorativas en el suelo
for gx in [2.5, 5.0, 8.5, 12, 16, 20, 24, 28]:
    ax.plot([gx, gx+0.5, gx+0.25, gx+0.75],
            [GY-0.05, GY-0.05, GY-0.22, GY-0.22],
            color=C_MGRAY, lw=1.2, zorder=3, solid_capstyle='round')

# Cactos en blanco y negro
def add_cactus(x, h=1.4):
    c = C_DGRAY
    ax.add_patch(Rectangle((x-0.11, GY), 0.22, h, color=c, linewidth=0, zorder=3))
    ax.add_patch(Rectangle((x-0.45, GY+h*0.40), 0.34, 0.15, color=c, linewidth=0, zorder=3))
    ax.add_patch(Rectangle((x-0.47, GY+h*0.27), 0.15, h*0.27, color=c, linewidth=0, zorder=3))
    ax.add_patch(Rectangle((x+0.11, GY+h*0.56), 0.32, 0.15, color=c, linewidth=0, zorder=3))
    ax.add_patch(Rectangle((x+0.28, GY+h*0.43), 0.15, h*0.27, color=c, linewidth=0, zorder=3))

for xc in [2.5, 6.2, 10.0, 14.5, 19.0, 23.5, 28.0]:
    add_cactus(xc, h=1.1 + (xc % 3) * 0.13)

# Sol (en esquina superior, eerie)
sun = Circle((2.5, H-1.2), 0.6, facecolor=C_WHITE, edgecolor=C_LGRAY,
             linewidth=2, zorder=2, linestyle='--')
ax.add_patch(sun)

# Abismo: cara del precipicio y el vacio
ax.add_patch(Rectangle((CLIFF_X, 0), WORLD_W-CLIFF_X, GY,
                        color=C_BLACK, linewidth=0, zorder=4))

# ─── Monigote ─────────────────────────────────────────────────────────────────
HEAD_R = 0.32
BODY_H = 1.00
ARM_L  = 0.52
LEG_L  = 0.64

# Cabeza: circulo blanco con borde negro
head_p = Circle((0,0), HEAD_R, facecolor=C_WHITE, edgecolor=C_BLACK,
                linewidth=2.8, zorder=14)
# Ojos: dos circulos negros
eye_l  = Circle((0,0), 0.068, facecolor=C_BLACK, linewidth=0, zorder=15)
eye_r  = Circle((0,0), 0.068, facecolor=C_BLACK, linewidth=0, zorder=15)
# Boca preocupada
mouth, = ax.plot([], [], color=C_BLACK, lw=2.2, zorder=15, solid_capstyle='round')

ax.add_patch(head_p)
ax.add_patch(eye_l)
ax.add_patch(eye_r)

# Cuerpo y extremidades
body_l, = ax.plot([], [], color=C_BLACK, lw=LW_BODY, zorder=13, solid_capstyle='round')
lleg_l, = ax.plot([], [], color=C_BLACK, lw=LW_BODY, zorder=13, solid_capstyle='round')
rleg_l, = ax.plot([], [], color=C_BLACK, lw=LW_BODY, zorder=13, solid_capstyle='round')
larm_l, = ax.plot([], [], color=C_BLACK, lw=LW_BODY, zorder=13, solid_capstyle='round')
rarm_l, = ax.plot([], [], color=C_BLACK, lw=LW_BODY, zorder=13, solid_capstyle='round')

# ─── Saco ─────────────────────────────────────────────────────────────────────
sack_body_p = Polygon(sack_body_pts(0,0), facecolor=C_WHITE,
                      edgecolor=C_BLACK, linewidth=2.5, zorder=12)
sack_neck_p = Polygon(sack_neck_pts(0,0), facecolor=C_WHITE,
                      edgecolor=C_BLACK, linewidth=2.5, zorder=12)
ax.add_patch(sack_body_p)
ax.add_patch(sack_neck_p)

# Arrugas del saco (textura de tela)
sack_wrinkles = []
for _ in range(4):
    wl, = ax.plot([], [], color=C_MGRAY, lw=1.3, zorder=13, solid_capstyle='round')
    sack_wrinkles.append(wl)

# Alambre de cierre (wavy line encima del cuello)
wire_l, = ax.plot([], [], color=C_DGRAY, lw=2.8, zorder=14,
                  solid_capstyle='round', solid_joinstyle='round')

# ─── Paracaidas ───────────────────────────────────────────────────────────────
DOME_N = 51
chute_dome = Polygon(dome_pts(-100, -100, 0.5, DOME_N),
                     facecolor=C_WHITE, edgecolor=C_BLACK,
                     linewidth=2.5, zorder=12, visible=False)
ax.add_patch(chute_dome)

N_PANELS = 6
panel_lines = [ax.plot([], [], color=C_MGRAY, lw=1.2, zorder=13)[0]
               for _ in range(N_PANELS+1)]
chute_strings = [ax.plot([], [], color=C_DGRAY, lw=1.8, zorder=13,
                          solid_capstyle='round')[0]
                 for _ in range(4)]

# ─── Update ───────────────────────────────────────────────────────────────────
def update(frame):
    # ── posicion del monigote en coords de mundo ──────────────────────────────
    if frame < PH_ENTER:
        fig_wx, fig_wy, phase, fall_p = -3.0, GY, 'run', 0.0
    elif frame < PH_RUN:
        prog   = (frame - PH_ENTER) / (PH_RUN - PH_ENTER)
        fig_wx = lerp(-3.0, CLIFF_X - 1.1, ease_out(prog * 0.97))
        fig_wy, phase, fall_p = GY, 'run', 0.0
    elif frame < PH_SLOW:
        prog   = (frame - PH_RUN) / (PH_SLOW - PH_RUN)
        fig_wx = lerp(CLIFF_X - 1.1, CLIFF_X - 0.62, ease_out(prog))
        fig_wy, fall_p = GY, 0.0
        phase  = 'run' if prog < 0.55 else 'stop'
    elif frame < PH_OPEN:
        prog   = (frame - PH_SLOW) / (PH_OPEN - PH_SLOW)
        fig_wx, fig_wy, fall_p = CLIFF_X - 0.62, GY, 0.0
        phase  = 'bend' if prog < 0.42 else 'head_in'
    else:
        prog   = (frame - PH_OPEN) / (PH_END - PH_OPEN)
        fig_wx = lerp(CLIFF_X - 0.62, CLIFF_X + 0.6, ease_in(prog * 1.3))
        fig_wy = GY - ease_in(prog) * (GY + 3.5) * 1.4
        phase, fall_p = 'fall', prog

    # ── camara ────────────────────────────────────────────────────────────────
    cam_x = max(0.0, fig_wx - 5.5)
    ax.set_xlim(cam_x, cam_x + W)

    # ── geometria del monigote ────────────────────────────────────────────────
    torso_y  = fig_wy + BODY_H
    head_cy  = torso_y + HEAD_R
    mid_body = fig_wy + BODY_H * 0.62
    cycle    = 10

    if phase == 'run':
        t_leg     = np.sin(frame / cycle * 2 * np.pi)
        la, ra    = t_leg * 0.65, -t_leg * 0.65
        aa        = -t_leg * 0.50
        bob       = abs(np.sin(frame / cycle * np.pi)) * 0.08
        swing     = t_leg * 0.14
    elif phase == 'stop':
        la = ra = aa = bob = swing = 0.0
    elif phase == 'bend':
        la, ra, aa, bob, swing = 0.18, -0.18, 0.0, 0.0, 0.0
    elif phase == 'head_in':
        la, ra, aa, bob, swing = 0.22, -0.22, 0.40, 0.0, 0.0
    else:  # fall
        la, ra, aa, bob, swing = 0.70, -0.70, 0.92, 0.0, 0.0

    head_cy += bob

    # Cabeza (ocultar en head_in)
    if phase == 'head_in':
        head_p.set_visible(False)
        eye_l.set_visible(False)
        eye_r.set_visible(False)
        mouth.set_data([], [])
    else:
        head_p.set_visible(True)
        head_p.center  = (fig_wx, head_cy)
        eye_l.set_visible(True)
        eye_r.set_visible(True)
        eye_l.center   = (fig_wx - 0.12, head_cy + 0.10)
        eye_r.center   = (fig_wx + 0.12, head_cy + 0.10)
        # Boca: curva hacia abajo (preocupado)
        mx = np.linspace(fig_wx - 0.12, fig_wx + 0.12, 10)
        my = head_cy - 0.09 - 0.05 * np.sin(np.linspace(0, np.pi, 10))
        mouth.set_data(mx, my)

    # Cuerpo
    body_l.set_data([fig_wx, fig_wx], [fig_wy, torso_y])

    # Piernas
    lleg_l.set_data([fig_wx, fig_wx + np.sin(la)*LEG_L],
                    [fig_wy, fig_wy - np.cos(la)*LEG_L])
    rleg_l.set_data([fig_wx, fig_wx + np.sin(ra)*LEG_L],
                    [fig_wy, fig_wy - np.cos(ra)*LEG_L])

    # ── Saco o paracaidas ─────────────────────────────────────────────────────
    if phase in ('run', 'stop', 'bend'):
        # Saco llevado a la izquierda, brazo izquierdo lo agarra
        sx = fig_wx - 0.88 + swing * 0.35
        sy = fig_wy + 0.92
        s  = 1.05

        sack_body_p.set_xy(sack_body_pts(sx, sy, s))
        sack_neck_p.set_xy(sack_neck_pts(sx, sy, s))
        sack_body_p.set_visible(True)
        sack_neck_p.set_visible(True)
        chute_dome.set_visible(False)

        # Arrugas horizontales del saco
        for i, wl in enumerate(sack_wrinkles):
            yo   = -0.30 + i * 0.22
            hw   = (0.55 - abs(yo) * 0.25) * s
            wl.set_data([sx - hw * 0.75, sx + hw * 0.75],
                        [sy + yo,         sy + yo])

        # Alambre: zigzag encima del cuello
        wx = np.linspace(sx - 0.17*s, sx + 0.17*s, 7)
        wy = sy + 0.80*s + 0.04 * np.array([0,1,0,1,0,1,0])
        wire_l.set_data(wx, wy)
        wire_l.set_visible(True)

        # Brazo izquierdo: agarra el alambre del saco
        larm_l.set_data([fig_wx, sx + 0.05],
                        [mid_body, sy + 0.75*s])
        # Brazo derecho: oscila normal (contrapeso)
        rarm_l.set_data([fig_wx, fig_wx + np.cos(aa)*ARM_L*0.85],
                        [mid_body, mid_body - np.sin(aa)*ARM_L*0.40 - 0.05])

        # Ocultar paracaidas
        for pl in panel_lines:  pl.set_data([], [])
        for sl in chute_strings: sl.set_data([], [])

    elif phase == 'head_in':
        # Saco encima de la cabeza (la tapa)
        sx = fig_wx
        sy = head_cy + 0.38
        s  = 1.05
        sack_body_p.set_xy(sack_body_pts(sx, sy, s))
        sack_neck_p.set_xy(sack_neck_pts(sx, sy, s))
        sack_body_p.set_visible(True)
        sack_neck_p.set_visible(True)
        chute_dome.set_visible(False)
        wire_l.set_visible(False)
        for wl in sack_wrinkles: wl.set_data([], [])

        # Brazos agarrando el borde del saco
        larm_l.set_data([fig_wx, fig_wx - np.cos(aa)*ARM_L*0.80],
                        [mid_body, mid_body + np.sin(aa)*ARM_L*0.35])
        rarm_l.set_data([fig_wx, fig_wx + np.cos(aa)*ARM_L*0.80],
                        [mid_body, mid_body + np.sin(aa)*ARM_L*0.35])
        for pl in panel_lines:  pl.set_data([], [])
        for sl in chute_strings: sl.set_data([], [])

    else:  # fall — paracaidas
        sack_body_p.set_visible(False)
        sack_neck_p.set_visible(False)
        wire_l.set_visible(False)
        for wl in sack_wrinkles: wl.set_data([], [])

        # Cupula del paracaidas
        inflate = ease_out(min(fall_p * 2.8, 1.0))
        r = lerp(0.4, 2.0, inflate)
        dome_cx = fig_wx
        dome_cy = fig_wy + BODY_H + HEAD_R * 2.2 + r * 0.35 + 0.3

        chute_dome.set_xy(dome_pts(dome_cx, dome_cy, r, DOME_N))
        chute_dome.set_visible(True)

        # Lineas de panel (costuras radiales)
        for i, pl in enumerate(panel_lines):
            angle = np.pi * i / N_PANELS
            px = dome_cx + r * np.cos(angle)
            py = dome_cy + r * np.sin(angle)
            pl.set_data([dome_cx, px], [dome_cy, py])

        # Cuerdas: desde borde inferior de la cupula hasta cintura del monigote
        attach_angles = [np.pi*0.12, np.pi*0.35, np.pi*0.65, np.pi*0.88]
        for i, ang in enumerate(attach_angles):
            ax_pt = dome_cx + r * np.cos(ang)
            ay_pt = dome_cy + r * np.sin(ang)
            chute_strings[i].set_data([ax_pt, fig_wx], [ay_pt, mid_body])

        # Brazos del monigote abiertos (cayendo dramaticamente)
        larm_l.set_data([fig_wx, fig_wx - np.cos(aa)*ARM_L],
                        [mid_body, mid_body - np.sin(aa)*ARM_L*0.5 + 0.1])
        rarm_l.set_data([fig_wx, fig_wx + np.cos(aa)*ARM_L],
                        [mid_body, mid_body - np.sin(aa)*ARM_L*0.5 + 0.1])

    return []

# ─── Render ───────────────────────────────────────────────────────────────────
print("Renderizando 720 frames…")
anim = FuncAnimation(fig, update, frames=N, blit=False, interval=1000/FPS)
writer = FFMpegWriter(fps=FPS, codec='libx264',
                      extra_args=['-pix_fmt', 'yuv420p', '-crf', '18'])
out = '/home/user/juristaenproceso/monigote_bw.mp4'
anim.save(out, writer=writer, dpi=100)
print(f"✓ Guardado en {out}")
