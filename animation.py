"""
Animacion final basada en el storyboard de referencia:
  1. Entra andando con el saco a la espalda
  2. Corre arrastrando el saco por el suelo (alambre verde)
  3. Llega al abismo, el saco cuelga por el borde
  4. Salta — el saco se infla como paracaidas
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle
from matplotlib.animation import FuncAnimation, FFMpegWriter
from matplotlib.lines import Line2D

FPS    = 24
DUR    = 30
N      = FPS * DUR

W, H   = 16.0, 9.0
GY     = 3.5          # nivel del suelo
CLIFF  = 32.0         # x del abismo en coords de mundo
WORLD  = CLIFF + W + 5

# Fases en frames
F_WALK   = 3  * FPS   # 72   andando
F_RUN    = 18 * FPS   # 432  corriendo
F_SLOW   = 22 * FPS   # 528  frenando
F_CLIFF  = 26 * FPS   # 624  borde del abismo
F_JUMP   = 27 * FPS   # 648  salta
F_END    = N           # 720  caida con paracaidas

C_BLK  = '#1a1a1a'
C_WHT  = '#ffffff'
C_GRY  = '#cccccc'
C_DGRY = '#888888'
C_GRN  = '#2d9e2d'    # alambre verde
LW     = 2.6
LW_TH  = 1.6

def lerp(a, b, t): return a + (b-a)*float(np.clip(t, 0, 1))
def eout(t):       t=float(np.clip(t,0,1)); return 1-(1-t)**2
def ein(t):        t=float(np.clip(t,0,1)); return t**2

# dimensiones del monigote
HR  = 0.32   # radio cabeza
BH  = 1.10   # altura torso
AL  = 0.52   # largo brazo
LL  = 0.68   # largo pierna
# saco
SRX = 0.68   # semi-eje x
SRY = 0.78   # semi-eje y (un poco mas alto que ancho, gota)

# ─── Canvas ───────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 9), dpi=100)
ax  = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W); ax.set_ylim(0, H)
ax.set_aspect('equal'); ax.axis('off')
fig.patch.set_facecolor(C_WHT)

# ─── Fondo fijo ───────────────────────────────────────────────────────────────
# Suelo
ax.add_patch(Rectangle((0,0), WORLD, GY, color='#f0f0f0', linewidth=0, zorder=1))
ax.add_patch(Rectangle((0,GY-0.07), WORLD, 0.09, color=C_BLK, linewidth=0, zorder=2))
# Abismo: precipicio
ax.add_patch(Rectangle((CLIFF,0), WORLD-CLIFF, GY, color=C_BLK, linewidth=0, zorder=3))
ax.plot([CLIFF,CLIFF],[0,GY], color=C_BLK, lw=3, zorder=4)
# Marcas irregulares del borde del precipicio
for dx, dy in [(0.05,0),(0.12,-0.15),(0.20,0),(0.08,-0.10),(0.25,0)]:
    ax.plot([CLIFF+dx, CLIFF+dx],[GY-0.02,GY-dy-0.08],
            color=C_BLK, lw=2, zorder=4)

# ─── Parches dinamicos ────────────────────────────────────────────────────────
# CABEZA
head_p = Circle((0,0), HR, facecolor=C_WHT, edgecolor=C_BLK, lw=LW, zorder=14)
eye_l  = Circle((0,0), 0.07,  facecolor=C_WHT, edgecolor=C_BLK, lw=1.5, zorder=15)
eye_r  = Circle((0,0), 0.07,  facecolor=C_WHT, edgecolor=C_BLK, lw=1.5, zorder=15)
pupil_l= Circle((0,0), 0.035, facecolor=C_BLK, linewidth=0, zorder=16)
pupil_r= Circle((0,0), 0.035, facecolor=C_BLK, linewidth=0, zorder=16)
smile_l,= ax.plot([],[], color=C_BLK, lw=LW_TH+0.3, solid_capstyle='round', zorder=15)
for p in [head_p,eye_l,eye_r,pupil_l,pupil_r]: ax.add_patch(p)

# CUERPO / EXTREMIDADES
body_l, = ax.plot([],[],color=C_BLK,lw=LW,solid_capstyle='round',zorder=13)
lleg_l, = ax.plot([],[],color=C_BLK,lw=LW,solid_capstyle='round',zorder=13)
rleg_l, = ax.plot([],[],color=C_BLK,lw=LW,solid_capstyle='round',zorder=13)
larm_l, = ax.plot([],[],color=C_BLK,lw=LW,solid_capstyle='round',zorder=13)
rarm_l, = ax.plot([],[],color=C_BLK,lw=LW,solid_capstyle='round',zorder=13)

# SACO
sack_p = Ellipse((0,0), SRX*2, SRY*2, facecolor=C_WHT, edgecolor=C_BLK,
                 lw=LW, zorder=10)
ax.add_patch(sack_p)

# Alambre verde (WIRE) — linea ondulada verde en la parte superior del saco
wire_l, = ax.plot([],[],color=C_GRN,lw=2.8,solid_capstyle='round',zorder=12)
wire_knot = Circle((0,0),0.09,facecolor=C_GRN,linewidth=0,zorder=13)
ax.add_patch(wire_knot)

# Linea del brazo al saco (cuerda de sujecion)
grip_l, = ax.plot([],[],color=C_BLK,lw=LW,solid_capstyle='round',zorder=11)

# PARACAIDAS
DOME_N = 55
chute_p = Polygon(np.zeros((DOME_N,2)), facecolor=C_WHT, edgecolor=C_BLK,
                  lw=LW, zorder=10, visible=False)
ax.add_patch(chute_p)
NPAN = 7
pan_ls  = [ax.plot([],[],color=C_DGRY,lw=1.3,zorder=11)[0] for _ in range(NPAN+1)]
str_ls  = [ax.plot([],[],color=C_BLK, lw=LW_TH,solid_capstyle='round',zorder=11)[0]
           for _ in range(4)]

def dome_pts(cx, cy, r, n=DOME_N):
    t  = np.linspace(0, np.pi, n-1)
    xs = np.append(cx + r*np.cos(t), cx)
    ys = np.append(cy + r*np.sin(t), cy)
    return np.column_stack([xs, ys])

def wire_pts(cx, cy, w=0.30, amp=0.06, n=18):
    """Alambre ondulado verde."""
    xs = np.linspace(cx-w, cx+w, n)
    ys = cy + amp*np.sin(np.linspace(0, 4*np.pi, n))
    return xs, ys

# ─── Logica de animacion ──────────────────────────────────────────────────────
def update(frame):
    # posicion mundo
    if frame < F_WALK:
        p = frame / F_WALK
        wx = lerp(-2.5, 1.5, eout(p))
        wy = GY; phase = 'walk'; fp = 0.0
    elif frame < F_RUN:
        p = (frame-F_WALK)/(F_RUN-F_WALK)
        wx = lerp(1.5, CLIFF-1.5, eout(p*0.96))
        wy = GY; phase = 'run'; fp = 0.0
    elif frame < F_SLOW:
        p = (frame-F_RUN)/(F_SLOW-F_RUN)
        wx = lerp(CLIFF-1.5, CLIFF-0.7, eout(p))
        wy = GY; phase = 'run' if p<0.5 else 'slow'; fp = 0.0
    elif frame < F_CLIFF:
        p = (frame-F_SLOW)/(F_CLIFF-F_SLOW)
        wx = CLIFF-0.7; wy = GY; phase = 'cliff'; fp = 0.0
    elif frame < F_JUMP:
        p = (frame-F_CLIFF)/(F_JUMP-F_CLIFF)
        wx = lerp(CLIFF-0.7, CLIFF+0.3, eout(p))
        wy = GY; phase = 'jump'; fp = 0.0
    else:
        fp = (frame-F_JUMP)/(F_END-F_JUMP)
        wx = lerp(CLIFF+0.3, CLIFF+1.2, ein(fp*1.2))
        wy = GY - ein(fp)*(GY+4)*1.4
        phase = 'fall'

    # camara
    cam = max(0.0, wx-5.0)
    ax.set_xlim(cam, cam+W)

    # geometria del torso segun fase
    if phase == 'walk':
        lean = 0.30    # muy inclinado (carga pesada)
    elif phase in ('run','slow'):
        lean = 0.18
    elif phase == 'cliff':
        lean = 0.35
    elif phase == 'jump':
        lean = 0.50
    else:
        lean = 0.20 + fp*0.30

    # extremos del torso
    tx = wx + np.sin(lean)*BH
    ty = wy + np.cos(lean)*BH
    hx = tx + np.sin(lean)*HR
    hy = ty + np.cos(lean)*HR
    mx = wx + np.sin(lean)*BH*0.60
    my = wy + np.cos(lean)*BH*0.60

    # ciclo de carrera
    cyc = 10
    if phase in ('run','slow'):
        t_l  = np.sin(frame/cyc*2*np.pi)
        la   = t_l*0.72;  ra  = -t_l*0.72
        laa  = -t_l*0.55; raa =  t_l*0.55
        bob  = abs(np.sin(frame/cyc*np.pi))*0.07
    elif phase == 'walk':
        t_l  = np.sin(frame/(cyc*1.6)*2*np.pi)*0.6
        la   = t_l*0.45;  ra  = -t_l*0.45
        laa  = -t_l*0.30; raa =  t_l*0.30
        bob  = abs(np.sin(frame/(cyc*1.6)*np.pi))*0.04
    elif phase == 'cliff':
        la = ra = laa = raa = bob = 0.0
    elif phase == 'jump':
        la=0.5; ra=-0.6; laa=0.7; raa=0.7; bob=0.0
    else:  # fall
        la=0.8; ra=-0.8; laa=0.95; raa=0.95; bob=0.0

    hy += bob; hx += np.sin(lean)*bob*0.3

    # ── cabeza ────────────────────────────────────────────────────────────────
    if phase == 'cliff':
        # cabeza mirando hacia abajo
        head_p.center = (hx, hy); head_p.set_visible(True)
        eye_l.center  = (hx+0.08, hy-0.05)
        eye_r.center  = (hx+0.18, hy-0.08)
        pupil_l.center= (hx+0.10, hy-0.06)
        pupil_r.center= (hx+0.20, hy-0.09)
        sx = np.linspace(hx+0.04, hx+0.22, 10)
        sy = hy-0.15 + 0.04*np.sin(np.linspace(0,np.pi,10))
    else:
        head_p.center = (hx, hy); head_p.set_visible(True)
        eye_l.center  = (hx+0.06, hy+0.08)
        eye_r.center  = (hx+0.18, hy+0.08)
        pupil_l.center= (hx+0.08, hy+0.08)
        pupil_r.center= (hx+0.20, hy+0.08)
        sx = np.linspace(hx+0.02, hx+0.22, 10)
        sy = hy-0.08 + 0.06*np.sin(np.linspace(0,np.pi,10))

    smile_l.set_data(sx, sy)

    # ── cuerpo ────────────────────────────────────────────────────────────────
    body_l.set_data([wx,tx],[wy,ty])
    lleg_l.set_data([wx, wx+np.sin(la)*LL], [wy, wy-np.cos(la)*LL])
    rleg_l.set_data([wx, wx+np.sin(ra)*LL], [wy, wy-np.cos(ra)*LL])

    # ── saco ──────────────────────────────────────────────────────────────────
    if phase in ('run','slow','walk'):
        if phase == 'walk':
            # Saco a la espalda, alto
            sx_ = wx - SRX*0.85
            sy_ = wy + BH*0.55
            sack_p.center=(sx_,sy_); sack_p.width=SRX*2; sack_p.height=SRY*2
            sack_p.set_visible(True); chute_p.set_visible(False)
            # alambre en la parte superior del saco
            wx_, wy_ = wire_pts(sx_, sy_+SRY*0.82)
            wire_l.set_data(wx_, wy_); wire_knot.center=(sx_, sy_+SRY*0.88)
            # brazo izquierdo: va hacia atras/abajo hacia el saco
            larm_l.set_data([mx, sx_+SRX*0.5],[my, sy_+SRY*0.7])
            rarm_l.set_data([mx, mx+np.cos(raa)*AL],[my, my-np.sin(raa)*AL*0.4])
            grip_l.set_data([],[]); [pl.set_data([],[]) for pl in pan_ls]
            [sl.set_data([],[]) for sl in str_ls]
        else:
            # Saco arrastrado por el suelo
            t_l2 = np.sin(frame/cyc*2*np.pi)
            swing = t_l2*0.20
            sx_ = wx - 1.0 + swing*0.25
            sy_ = GY + SRY*0.85     # descansando en el suelo
            sack_p.center=(sx_,sy_); sack_p.width=SRX*2; sack_p.height=SRY*2
            sack_p.set_visible(True); chute_p.set_visible(False)
            # alambre verde en la parte superior del saco
            wx_, wy_ = wire_pts(sx_, sy_+SRY*0.82)
            wire_l.set_data(wx_, wy_); wire_knot.center=(sx_, sy_+SRY*0.90)
            # brazo izquierdo: va hacia atras agarrando el alambre
            grab_x = sx_ + SRX*0.75; grab_y = sy_ + SRY*0.75
            larm_l.set_data([mx, grab_x],[my, grab_y])
            # linea de grip
            grip_l.set_data([grab_x, grab_x+0.05],[grab_y, grab_y])
            # brazo derecho: va hacia delante
            rarm_l.set_data([mx, mx+np.cos(raa)*AL],[my, my-np.sin(raa)*AL*0.35])
            [pl.set_data([],[]) for pl in pan_ls]; [sl.set_data([],[]) for sl in str_ls]

    elif phase == 'cliff':
        # Saco CUELGA por el borde del abismo
        cliff_sx = CLIFF-cam        # posicion en pantalla del borde
        sack_cx  = CLIFF + SRX*0.3 # saco cuelga justo detras del borde
        sack_cy  = GY - SRY*0.9    # por debajo del suelo
        sack_p.center=(sack_cx, sack_cy)
        sack_p.width=SRX*2; sack_p.height=SRY*2
        sack_p.set_visible(True); chute_p.set_visible(False)
        # alambre verde arriba del saco (cerca del borde)
        wx_, wy_ = wire_pts(sack_cx, sack_cy+SRY*0.85, w=0.25)
        wire_l.set_data(wx_, wy_); wire_knot.center=(sack_cx, sack_cy+SRY*0.92)
        # brazos: uno hacia el saco (sujetando alambre), otro apoyado en el suelo
        larm_l.set_data([mx, sack_cx-0.1],[my, sack_cy+SRY*0.85])
        rarm_l.set_data([mx, mx+np.cos(0.3)*AL],[my, my-np.sin(0.3)*AL])
        grip_l.set_data([],[])
        [pl.set_data([],[]) for pl in pan_ls]; [sl.set_data([],[]) for sl in str_ls]

    elif phase == 'jump':
        # El saco sube sobre la cabeza mientras salta
        p_j = (frame-F_CLIFF)/(F_JUMP-F_CLIFF)
        sack_cx = lerp(CLIFF+SRX*0.3, wx, eout(p_j))
        sack_cy = lerp(GY-SRY*0.9, hy+SRY*0.8, eout(p_j))
        sack_p.center=(sack_cx,sack_cy); sack_p.set_visible(True)
        chute_p.set_visible(False)
        wx_, wy_ = wire_pts(sack_cx, sack_cy+SRY*0.85)
        wire_l.set_data(wx_,wy_); wire_knot.center=(sack_cx, sack_cy+SRY*0.92)
        larm_l.set_data([mx,sack_cx],[my,sack_cy+SRY*0.6])
        rarm_l.set_data([mx,mx+np.cos(raa)*AL],[my,my-np.sin(raa)*AL*0.5])
        grip_l.set_data([],[])
        [pl.set_data([],[]) for pl in pan_ls]; [sl.set_data([],[]) for sl in str_ls]

    else:  # fall — paracaidas
        sack_p.set_visible(False); wire_l.set_data([],[])
        wire_knot.center=(-200,0); grip_l.set_data([],[])

        inflate = eout(min(fp*2.5, 1.0))
        r = lerp(0.35, 2.2, inflate)
        dcx = wx
        dcy = wy + BH + HR*2.5 + r*0.4 + 0.3
        chute_p.set_xy(dome_pts(dcx,dcy,r))
        chute_p.set_visible(True)

        # Costuras del paracaidas
        for i,pl in enumerate(pan_ls):
            ang = np.pi*i/NPAN
            pl.set_data([dcx, dcx+r*np.cos(ang)],[dcy, dcy+r*np.sin(ang)])

        # Cuerdas al monigote
        for i,ang in enumerate([np.pi*0.10,np.pi*0.33,np.pi*0.67,np.pi*0.90]):
            str_ls[i].set_data([dcx+r*np.cos(ang),wx],[dcy+r*np.sin(ang),my])

        # brazos abiertos cayendo
        larm_l.set_data([mx,mx-np.cos(raa)*AL*1.1],[my,my-np.sin(raa)*AL*0.3])
        rarm_l.set_data([mx,mx+np.cos(raa)*AL*1.1],[my,my-np.sin(raa)*AL*0.3])

    return []

print("Renderizando…")
anim = FuncAnimation(fig, update, frames=N, blit=False, interval=1000/FPS)
writer = FFMpegWriter(fps=FPS, codec='libx264',
                      extra_args=['-pix_fmt','yuv420p','-crf','18'])
out = '/home/user/juristaenproceso/monigote_final.mp4'
anim.save(out, writer=writer, dpi=100)
print(f"✓ {out}")
