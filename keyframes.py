"""
Genera fotogramas clave como PNG para revision antes del video.
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch
import matplotlib.patches as mpatches
import os

OUT = '/home/user/juristaenproceso/frames'
os.makedirs(OUT, exist_ok=True)

# ─── Parametros del dibujo (basados en la referencia) ─────────────────────────
HEAD_R = 0.30
BODY_H = 1.05   # cadera → hombro
ARM_L  = 0.50
LEG_L  = 0.65
LEAN   = 0.28   # radianes de inclinacion hacia delante

SACK_RX = 0.72  # radio horizontal del saco
SACK_RY = 0.68  # radio vertical del saco

C_BLK  = '#1a1a1a'
C_WHT  = '#ffffff'
C_GRY  = '#aaaaaa'
LW     = 2.0     # grosor de linea (fino, como el dibujo)

GY = 1.5         # nivel del suelo en el canvas del keyframe

def new_canvas(title=''):
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.set_xlim(-3.5, 3.5)
    ax.set_ylim(-0.5, 6.0)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.patch.set_facecolor(C_WHT)
    # Suelo
    ax.axhline(GY, color=C_BLK, lw=1.5, zorder=1)
    if title:
        ax.set_title(title, fontsize=13, pad=8, color='#333333')
    return fig, ax

def draw_figure(ax, hip_x, hip_y, lean_angle, la, ra, laa, raa, show_head=True):
    """
    Dibuja el monigote.
    lean_angle: inclinacion del torso (rad)
    la/ra: angulo pierna izq/der desde vertical
    laa/raa: angulo brazo izq/der
    """
    # Torso (inclinado)
    tx = hip_x + np.sin(lean_angle) * BODY_H
    ty = hip_y + np.cos(lean_angle) * BODY_H
    ax.plot([hip_x, tx], [hip_y, ty], color=C_BLK, lw=LW,
            solid_capstyle='round', zorder=10)

    # Cabeza (encima del torso)
    hx = tx + np.sin(lean_angle) * HEAD_R
    hy = ty + np.cos(lean_angle) * HEAD_R
    head = Circle((hx, hy), HEAD_R, facecolor=C_WHT, edgecolor=C_BLK,
                  linewidth=LW, zorder=11)
    ax.add_patch(head)

    if show_head:
        # Ojo: UN punto en el lado derecho de la cara (mirando a la derecha)
        ax.add_patch(Circle((hx + 0.14, hy + 0.06), 0.055,
                            facecolor=C_BLK, linewidth=0, zorder=12))
        # Sonrisa
        sx = np.linspace(hx - 0.09, hx + 0.13, 10)
        sy = hy - 0.09 + 0.05 * np.sin(np.linspace(0, np.pi, 10))
        ax.plot(sx, sy, color=C_BLK, lw=1.5, solid_capstyle='round', zorder=12)

    # Punto medio del torso (para los brazos)
    mx = hip_x + np.sin(lean_angle) * BODY_H * 0.58
    my = hip_y + np.cos(lean_angle) * BODY_H * 0.58

    # Piernas (desde la cadera)
    ax.plot([hip_x, hip_x + np.sin(la)*LEG_L],
            [hip_y, hip_y - np.cos(la)*LEG_L],
            color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)
    ax.plot([hip_x, hip_x + np.sin(ra)*LEG_L],
            [hip_y, hip_y - np.cos(ra)*LEG_L],
            color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)

    # Brazos (desde el punto medio)
    # Brazo izquierdo (va hacia atras, sujetando saco)
    ax.plot([mx, mx - np.cos(laa)*ARM_L],
            [my, my - np.sin(laa)*ARM_L],
            color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)
    # Brazo derecho (oscila hacia delante)
    ax.plot([mx, mx + np.cos(raa)*ARM_L],
            [my, my - np.sin(raa)*ARM_L],
            color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)

    return hx, hy, mx, my, tx, ty

def draw_sack(ax, cx, cy, scale=1.0, knot_side='right'):
    """Saco grande y redondo con nudo."""
    s = scale
    sack = Ellipse((cx, cy), SACK_RX*2*s, SACK_RY*2*s,
                   facecolor=C_WHT, edgecolor=C_BLK,
                   linewidth=LW, zorder=9)
    ax.add_patch(sack)

    # Nudo: lado derecho del saco (donde toca al monigote)
    kx = cx + SACK_RX * s * 0.80
    ky = cy + 0.05

    # Lineas convergentes al nudo (imitando el dibujo de referencia)
    offsets = [(-0.05,  0.40), (0.10,  0.28),
               ( 0.08, -0.25), (-0.10, -0.35)]
    for dx, dy in offsets:
        ax.plot([cx + SACK_RX*s*0.45 + dx, kx],
                [ky + dy, ky],
                color=C_BLK, lw=1.4, solid_capstyle='round', zorder=10)

    # Cola del nudo colgando
    tail_x = np.linspace(kx, kx + 0.06, 12)
    tail_y = (ky - np.linspace(0, 0.38, 12)
               - 0.05 * np.sin(np.linspace(0, np.pi*2.5, 12)))
    ax.plot(tail_x, tail_y, color=C_BLK, lw=1.4,
            solid_capstyle='round', zorder=10)

def draw_parachute(ax, cx, cy, r):
    """Cupula de paracaidas con costuras y cuerdas al monigote."""
    # Semicirculo
    theta = np.linspace(0, np.pi, 60)
    dome_x = np.concatenate([cx + r*np.cos(theta), [cx]])
    dome_y = np.concatenate([cy + r*np.sin(theta), [cy]])
    dome = mpatches.Polygon(list(zip(dome_x, dome_y)),
                            facecolor=C_WHT, edgecolor=C_BLK,
                            linewidth=LW, zorder=9)
    ax.add_patch(dome)

    # Costuras radiales (paneles)
    for i in range(7):
        ang = np.pi * i / 6
        ax.plot([cx, cx + r*np.cos(ang)],
                [cy, cy + r*np.sin(ang)],
                color=C_GRY, lw=1.2, zorder=10)

    return cx, cy  # base del paracaidas

# ─── FOTOGRAMA 1: Corriendo con el saco ───────────────────────────────────────
fig, ax = new_canvas("1 — Corriendo con el saco")
hx = 0.2
# Postura de carrera: pierna izq adelante, der atras
hx, hy = 0.2, GY
draw_figure(ax, hx, hy,
            lean_angle=LEAN,
            la= 0.60, ra=-0.60,   # piernas
            laa=0.35, raa=0.45)   # brazos

# Saco a la espalda (izquierda del torso)
draw_sack(ax, hx - 0.95, hy + 0.72)

# Flecha de movimiento
ax.annotate('', xy=(1.8, GY+0.5), xytext=(1.2, GY+0.5),
            arrowprops=dict(arrowstyle='->', color=C_GRY, lw=1.5))
fig.savefig(f'{OUT}/01_corriendo.png', dpi=120, bbox_inches='tight',
            facecolor=C_WHT)
plt.close()

# ─── FOTOGRAMA 2: Llegando al abismo ──────────────────────────────────────────
fig, ax = new_canvas("2 — Llegando al abismo (para en seco)")
# Suelo con abismo
ax.axhline(GY, xmin=0.0, xmax=0.62, color=C_BLK, lw=1.5, zorder=1)
# Borde del precipicio
ax.plot([1.0, 1.0], [GY, GY-2.5], color=C_BLK, lw=2.0, zorder=1)
ax.fill_between([1.0, 3.5], [GY, GY], [-0.5, -0.5], color='#e8e8e8', zorder=0)
ax.text(1.8, GY-0.6, '∞', fontsize=28, color=C_BLK, ha='center', va='top',
        alpha=0.3)

hx, hy = 0.6, GY
draw_figure(ax, hx, hy,
            lean_angle=0.05,         # casi vertical
            la=0.0, ra=0.0,          # piernas juntas
            laa=0.10, raa=0.10)
draw_sack(ax, hx - 0.88, hy + 0.70)

fig.savefig(f'{OUT}/02_abismo.png', dpi=120, bbox_inches='tight',
            facecolor=C_WHT)
plt.close()

# ─── FOTOGRAMA 3: Mete la cabeza en el saco ───────────────────────────────────
fig, ax = new_canvas("3 — Mete la cabeza en el saco")
ax.axhline(GY, xmin=0.0, xmax=0.62, color=C_BLK, lw=1.5, zorder=1)
ax.plot([1.0, 1.0], [GY, GY-2.5], color=C_BLK, lw=2.0, zorder=1)
ax.fill_between([1.0, 3.5], [GY, GY], [-0.5, -0.5], color='#e8e8e8', zorder=0)

hx, hy = 0.55, GY
# Dibuja el cuerpo sin cabeza (la cabeza esta dentro del saco)
tx = hx + np.sin(0.10) * BODY_H
ty = hy + np.cos(0.10) * BODY_H
ax.plot([hx, tx], [hy, ty], color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)
# Piernas ligeramente dobladas
ax.plot([hx, hx + 0.15], [hy, hy - LEG_L*0.95],
        color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)
ax.plot([hx, hx - 0.12], [hy, hy - LEG_L*0.95],
        color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)
mx = hx + np.sin(0.10)*BODY_H*0.58
my = hy + np.cos(0.10)*BODY_H*0.58
# Brazos levantados sujetando el saco que tienen sobre la cabeza
ax.plot([mx, mx - 0.10], [my, my + 0.52],
        color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)
ax.plot([mx, mx + 0.12], [my, my + 0.52],
        color=C_BLK, lw=LW, solid_capstyle='round', zorder=10)

# Saco encima de la cabeza (cubriendo la cabeza)
draw_sack(ax, hx + np.sin(0.10)*BODY_H, ty + SACK_RY*0.65 + HEAD_R*0.5)

fig.savefig(f'{OUT}/03_cabeza_saco.png', dpi=120, bbox_inches='tight',
            facecolor=C_WHT)
plt.close()

# ─── FOTOGRAMA 4: Saltando, paracaidas abriendose ─────────────────────────────
fig, ax = new_canvas("4 — Saltando al abismo, paracaidas abierto")
# Solo el vacio
ax.axhline(GY, xmin=0.0, xmax=0.30, color=C_BLK, lw=1.5, zorder=1)
ax.plot([-0.2, -0.2], [GY, GY-2.5], color=C_BLK, lw=2.0, zorder=1)
ax.fill_between([-0.2, 3.5], [GY, GY], [-0.5, -0.5], color='#f0f0f0', zorder=0)
ax.text(1.5, GY-0.8, '∞', fontsize=40, color=C_BLK, ha='center', va='top', alpha=0.2)

# Figura cayendo — en el aire, por debajo del nivel del suelo
hx, hy = 0.8, GY - 1.6
draw_figure(ax, hx, hy,
            lean_angle=0.40,         # inclinado por el caida
            la= 0.75, ra=-0.65,
            laa=0.80, raa=0.80,
            show_head=True)

# Paracaidas abierto encima (grande)
r_chute = 1.8
dcx, dcy = hx, hy + BODY_H + HEAD_R*2.5 + 1.2
draw_parachute(ax, dcx, dcy, r_chute)

# Cuerdas del paracaidas al monigote
mid_x = hx + np.sin(0.40)*BODY_H*0.58
mid_y = hy + np.cos(0.40)*BODY_H*0.58
for ang in [np.pi*0.12, np.pi*0.36, np.pi*0.64, np.pi*0.88]:
    ax.plot([dcx + r_chute*np.cos(ang), mid_x],
            [dcy + r_chute*np.sin(ang), mid_y],
            color=C_GRY, lw=1.3, solid_capstyle='round', zorder=8)

fig.savefig(f'{OUT}/04_paracaidas.png', dpi=120, bbox_inches='tight',
            facecolor=C_WHT)
plt.close()

print("Fotogramas generados en", OUT)
for f in sorted(os.listdir(OUT)):
    print(f"  {f}")
