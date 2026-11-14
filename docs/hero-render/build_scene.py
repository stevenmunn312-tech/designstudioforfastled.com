"""Build the electronics workbench hero scene.

Run: blender -b --factory-startup --python build_scene.py -- <out_dir>

Scene units are metres. Every LED that will animate on the web is its own
emissive object in its own Cycles light group, so one render yields a linear
light basis that the compositor can recolour per frame:

  ambient   world fill
  esp       board power LED
  s00..s41  each WS2812B on the strip (seen directly and as light)
  m00..m33  the 32x32 matrix in 4x4 regions, invisible to camera rays
  mdirect   the matrix LEDs as seen by the camera (white, recoloured in post)
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix, Euler
from bpy_extras.object_utils import world_to_camera_view

ASSETS = r"C:\Users\User\Desktop\Blender Assets"
BOARD = ASSETS + r"\Boards\espressif-esp32-s3-devkitc-1\espressif-esp32-s3-devkitc-1.blend"
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()

RES = (1800, 1200)
MAT_TOP = 0.0018          # cutting mat surface height
EMIT = 10.0               # base emission strength for every LED emitter

# --------------------------------------------------------------------------
# reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
coll = scene.collection
vl = scene.view_layers[0]


def sock(coll, ident):
    return next(x for x in coll if x.identifier == ident)


def link(o, c=None):
    (c or coll).objects.link(o)
    return o


def principled(name, color, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m


def mesh_obj(name, verts, faces, mat=None, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    if smooth:
        me.shade_smooth()
    o = bpy.data.objects.new(name, me)
    if mat:
        me.materials.append(mat)
    return link(o)


def box(name, center, size, mat, bevel=0.0, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.location = center
    o.rotation_euler = rot
    me.materials.append(mat)
    if bevel:
        mod = o.modifiers.new("bevel", 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
        o.modifiers.new("wn", 'WEIGHTED_NORMAL')
        me.shade_smooth()
    return o


def lathe(name, profile, mat, segs=48, smooth=True):
    """profile: list of (z, r) along the local Z axis. Returns object."""
    verts, faces = [], []
    for z, r in profile:
        for i in range(segs):
            a = 2 * math.pi * i / segs
            verts.append((r * math.cos(a), r * math.sin(a), z))
    n = len(profile)
    for j in range(n - 1):
        for i in range(segs):
            a, b = j * segs + i, j * segs + (i + 1) % segs
            faces.append((a, b, b + segs, a + segs))
    # caps
    verts.append((0, 0, profile[0][0]))
    verts.append((0, 0, profile[-1][0]))
    c0, c1 = len(verts) - 2, len(verts) - 1
    for i in range(segs):
        faces.append((c0, (i + 1) % segs, i))
        faces.append((c1, (n - 1) * segs + i, (n - 1) * segs + (i + 1) % segs))
    o = mesh_obj(name, verts, faces, mat, smooth)
    o.modifiers.new("wn", 'WEIGHTED_NORMAL')
    return o


def tube(name, pts, radius, mat, res=4, taper=None):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    if taper:
        for p, r in zip(sp.points, taper):
            p.radius = r
    o = link(bpy.data.objects.new(name, cu))
    cu.materials.append(mat)
    return o


def catmull(ctrl, n_per=24):
    """Centripetal-ish Catmull-Rom through ctrl points (list of 3D tuples)."""
    P = [Vector(p) for p in ctrl]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n_per):
            t = k / n_per
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return [tuple(v) for v in out]


def set_group(o, group):
    o.lightgroup = group
    if vl.lightgroups.get(group) is None:
        vl.lightgroups.add(name=group)


# --------------------------------------------------------------------------
# materials
mat_wood = bpy.data.materials.new("Walnut bench top")
mat_wood.use_nodes = True
nt = mat_wood.node_tree
bsdf = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping")
mp.inputs["Scale"].default_value = (1.0, 9.0, 1.0)
wave = nt.nodes.new("ShaderNodeTexWave")
wave.wave_type = 'BANDS'
wave.bands_direction = 'X'
wave.inputs["Scale"].default_value = 3.0
wave.inputs["Distortion"].default_value = 7.0
wave.inputs["Detail"].default_value = 6.0
wave.inputs["Detail Scale"].default_value = 1.5
noise = nt.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 60.0
noise.inputs["Detail"].default_value = 8.0
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.035, 0.016, 0.008, 1)
ramp.color_ramp.elements[1].color = (0.11, 0.055, 0.026, 1)
mix = nt.nodes.new("ShaderNodeMix")
mix.data_type = 'FLOAT'
sock(mix.inputs, "Factor_Float").default_value = 0.25
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.05
bump.inputs["Distance"].default_value = 0.0005
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
nt.links.new(wave.outputs["Fac"], sock(mix.inputs, "A_Float"))
nt.links.new(noise.outputs["Fac"], sock(mix.inputs, "B_Float"))
nt.links.new(sock(mix.outputs, "Result_Float"), ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
nt.links.new(sock(mix.outputs, "Result_Float"), bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
bsdf.inputs["Roughness"].default_value = 0.45
bsdf.inputs["Coat Weight"].default_value = 1.0
bsdf.inputs["Coat Roughness"].default_value = 0.07

# self-healing cutting mat: dark slate with a printed 10 mm grid
mat_mat = bpy.data.materials.new("Cutting mat")
mat_mat.use_nodes = True
nt = mat_mat.node_tree
bsdf = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])


def grid_line(axis_out, period, width):
    m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = 'DIVIDE'; m1.inputs[1].default_value = period
    m2 = nt.nodes.new("ShaderNodeMath"); m2.operation = 'PINGPONG'; m2.inputs[1].default_value = 0.5
    m3 = nt.nodes.new("ShaderNodeMath"); m3.operation = 'LESS_THAN'; m3.inputs[1].default_value = width
    nt.links.new(axis_out, m1.inputs[0]); nt.links.new(m1.outputs[0], m2.inputs[0]); nt.links.new(m2.outputs[0], m3.inputs[0])
    return m3.outputs[0]


lx = grid_line(sep.outputs["X"], 0.01, 0.025)
ly = grid_line(sep.outputs["Y"], 0.01, 0.025)
Lx = grid_line(sep.outputs["X"], 0.05, 0.012)
Ly = grid_line(sep.outputs["Y"], 0.05, 0.012)
mx1 = nt.nodes.new("ShaderNodeMath"); mx1.operation = 'MAXIMUM'
mx2 = nt.nodes.new("ShaderNodeMath"); mx2.operation = 'MAXIMUM'
mx3 = nt.nodes.new("ShaderNodeMath"); mx3.operation = 'MAXIMUM'
nt.links.new(lx, mx1.inputs[0]); nt.links.new(ly, mx1.inputs[1])
nt.links.new(Lx, mx2.inputs[0]); nt.links.new(Ly, mx2.inputs[1])
sc1 = nt.nodes.new("ShaderNodeMath"); sc1.operation = 'MULTIPLY'; sc1.inputs[1].default_value = 0.45
nt.links.new(mx1.outputs[0], sc1.inputs[0])
nt.links.new(sc1.outputs[0], mx3.inputs[0]); nt.links.new(mx2.outputs[0], mx3.inputs[1])
cm = nt.nodes.new("ShaderNodeMix"); cm.data_type = 'RGBA'
sock(cm.inputs, "A_Color").default_value = (0.05, 0.062, 0.064, 1)
sock(cm.inputs, "B_Color").default_value = (0.16, 0.19, 0.19, 1)
nt.links.new(mx3.outputs[0], sock(cm.inputs, "Factor_Float"))
nt.links.new(sock(cm.outputs, "Result_Color"), bsdf.inputs["Base Color"])
mn = nt.nodes.new("ShaderNodeTexNoise"); mn.inputs["Scale"].default_value = 900.0
rb = nt.nodes.new("ShaderNodeMapRange"); rb.inputs["To Min"].default_value = 0.42; rb.inputs["To Max"].default_value = 0.62
nt.links.new(mn.outputs["Fac"], rb.inputs["Value"]); nt.links.new(rb.outputs["Result"], bsdf.inputs["Roughness"])

mat_wall = principled("Pegboard", (0.03, 0.03, 0.032), 0.7)
nt = mat_wall.node_tree
bsdf = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (40, 40, 40)  # 25 mm pitch
vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.feature = 'F1'; vor.distance = 'EUCLIDEAN'
vor.inputs["Randomness"].default_value = 0.0
lt = nt.nodes.new("ShaderNodeMath"); lt.operation = 'GREATER_THAN'; lt.inputs[1].default_value = 0.13
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], vor.inputs["Vector"])
nt.links.new(vor.outputs["Distance"], lt.inputs[0])
cm = nt.nodes.new("ShaderNodeMix"); cm.data_type = 'RGBA'
sock(cm.inputs, "A_Color").default_value = (0.0, 0.0, 0.0, 1); sock(cm.inputs, "B_Color").default_value = (0.05, 0.05, 0.052, 1)
nt.links.new(lt.outputs[0], sock(cm.inputs, "Factor_Float")); nt.links.new(sock(cm.outputs, "Result_Color"), bsdf.inputs["Base Color"])

steel = principled("Brushed steel", (0.6, 0.6, 0.62), 0.28, 1.0)
chrome = principled("Chrome", (0.8, 0.8, 0.82), 0.12, 1.0)
dark_steel = principled("Blued steel", (0.18, 0.19, 0.2), 0.3, 1.0)
black_plastic = principled("Black plastic", (0.012, 0.012, 0.013), 0.42)
matte_black = principled("Matte black", (0.01, 0.01, 0.01), 0.75)
rubber_red = principled("Red dip grip", (0.45, 0.02, 0.018), 0.38, **{"Coat Weight": 0.4, "Coat Roughness": 0.25})
grip_grey = principled("Iron grip", (0.03, 0.035, 0.045), 0.55)
brass = principled("Brass wool", (0.75, 0.52, 0.22), 0.35, 1.0)
solder_m = principled("Solder", (0.78, 0.79, 0.8), 0.18, 1.0)
copper = principled("Copper", (0.9, 0.5, 0.32), 0.25, 1.0)
ins = {
    "red": principled("Wire red", (0.5, 0.012, 0.01), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.1}),
    "green": principled("Wire green", (0.01, 0.25, 0.04), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.1}),
    "white": principled("Wire white", (0.7, 0.7, 0.68), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.1}),
    "black": principled("Wire black", (0.01, 0.01, 0.01), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.1}),
    "yellow": principled("Wire yellow", (0.6, 0.42, 0.01), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.1}),
    "blue": principled("Wire blue", (0.01, 0.07, 0.45), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.1}),
}


def wound(name, color):
    """Wire wound on a spool: glossy colour with fine winding ridges."""
    m = principled(name, color, 0.25, **{"Coat Weight": 0.7, "Coat Roughness": 0.08})
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    w = nt.nodes.new("ShaderNodeTexWave"); w.wave_type = 'BANDS'; w.bands_direction = 'Z'
    w.inputs["Scale"].default_value = 160.0; w.inputs["Distortion"].default_value = 0.4
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6; bp.inputs["Distance"].default_value = 0.0003
    nt.links.new(tc.outputs["Object"], w.inputs["Vector"]); nt.links.new(w.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


# LED emitter: milky encapsulant that glows white; colour is applied per light
# group in the compositor, so every emitter shares this one material.
led_emit = principled("LED emitter", (0.85, 0.85, 0.82), 0.25,
                      **{"Emission Color": (1, 1, 1, 1), "Emission Strength": EMIT})
pure_emit = bpy.data.materials.new("Matrix LED emitter")
pure_emit.use_nodes = True
nt = pure_emit.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = EMIT
# front face only: the back would light the panel face 0.2 mm behind it
geo = nt.nodes.new("ShaderNodeNewGeometry")
tr = nt.nodes.new("ShaderNodeBsdfTransparent")
mxs = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(geo.outputs["Backfacing"], mxs.inputs[0])
nt.links.new(em.outputs[0], mxs.inputs[1]); nt.links.new(tr.outputs[0], mxs.inputs[2])
nt.links.new(mxs.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
pure_emit.cycles.emission_sampling = 'FRONT'

# --------------------------------------------------------------------------
# world: almost black, its own light group
world = bpy.data.worlds.new("Dark room")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.025, 0.035, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.05
world.lightgroup = "ambient"
vl.lightgroups.add(name="ambient")

# --------------------------------------------------------------------------
# camera first: props are placed by where they should land in the frame
LENS = 35.0
CAM_LOC = Vector((0.0, -0.21, 0.078))
PITCH_DEG = 9.4
FWD = Vector((0, math.cos(math.radians(PITCH_DEG)), -math.sin(math.radians(PITCH_DEG))))
RIGHT = FWD.cross(Vector((0, 0, 1))).normalized()
UP = RIGHT.cross(FWD)
TW = 18.0 / LENS
TH = TW * RES[1] / RES[0]


def ray(fx, fy):
    return (FWD + RIGHT * ((2 * fx - 1) * TW) + UP * ((1 - 2 * fy) * TH)).normalized()


def gp(fx, fy, h=MAT_TOP):
    """Point on the horizontal plane z=h seen at frame fraction (fx, fy) (fy from top)."""
    d = ray(fx, fy)
    t = (h - CAM_LOC.z) / d.z
    return CAM_LOC + d * t


def at_depth(fx, y, h):
    """Point at world depth y, height h, appearing at horizontal frame fraction fx."""
    best = None
    for k in range(400):
        fy = k / 399
        d = ray(fx, fy)
        p = CAM_LOC + d * ((y - CAM_LOC.y) / d.y)
        if best is None or abs(p.z - h) < abs(best.z - h):
            best = p
    return Vector((best.x, y, h))


# --------------------------------------------------------------------------
# bench, mat, wall
desk = box("Bench top", (0, 0.1, -0.02), (2.4, 1.6, 0.04), mat_wood)


# --------------------------------------------------------------------------
# ESP32-S3-DevKitC-1 from the asset library (authored in millimetres)
with bpy.data.libraries.load(BOARD, link=False) as (src, dst):
    dst.objects = [n for n in src.objects]
board_root = link(bpy.data.objects.new("ESP32-S3-DevKitC-1", None))
BOARD_ROT = math.radians(48)
BOARD_POS = gp(0.655, 0.80)
BOARD_POS.z = MAT_TOP + 0.0008  # PCB is 1.6 mm thick, centred on the board origin: bottom face on the mat
board_root.location = BOARD_POS
board_root.rotation_euler = (0, 0, BOARD_ROT)
board_root.scale = (0.001, 0.001, 0.001)
esp_group_objs = []
for o in dst.objects:
    if o is None or o.type in ('LIGHT', 'CAMERA'):
        continue
    if o.name == "PCB lower edge":  # product-shot edge band that hangs below the PCB
        continue
    link(o)
    o.parent = board_root
    if o.name.startswith("LED 0 "):
        esp_group_objs.append(o)
# the silkscreen material carries a small emission for flat product shots; kill it
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    for n in m.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED' and n.inputs["Emission Strength"].default_value > 0 and "LED" not in m.name:
            n.inputs["Emission Strength"].default_value = 0.0
for o in esp_group_objs:
    set_group(o, "esp")
rgb_mat = principled("Onboard RGB LED lit", (0.9, 0.9, 0.9), 0.2, **{"Emission Color": (1, 1, 1, 1), "Emission Strength": EMIT})
for o in board_root.children:
    if o.name == "RGB LED lens":
        o.data.materials.clear()
        o.data.materials.append(rgb_mat)
        set_group(o, "rgb")
        print("rgb led", o.name)


def board_point(x_mm, y_mm, z_mm=0.8):
    return board_root.matrix_world @ Vector((x_mm, y_mm, z_mm))


# --------------------------------------------------------------------------
# WS2812B strip, modelled here (60 LED/m, 10 mm white flex PCB, bare IP30).
# One 100.2 mm tile of six pixels is built in strip-local millimetres
# (x along, y across, z up, PCB top at z = 0.3) and laid end to end along the
# path by deform() below, so every vertex - and every emitter - follows the
# bends and the edge-on U-turn exactly.
TILE = 100.2
N_TILES = 4
PITCH = 16.7
N_LED = 6 * N_TILES
STRIP_LEN = TILE * N_TILES / 1000.0
PCB_W = 10.0
PCB_T = 0.3
RAIL_Y = 3.4            # 5V at +y, GND at -y; data runs down the middle

m_mask = principled("WS2812B black solder mask", (0.012, 0.012, 0.014), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.12})
m_copper_mask = principled("Copper under black mask", (0.035, 0.028, 0.022), 0.3, **{"Coat Weight": 0.6, "Coat Roughness": 0.12})
m_tin = principled("Tinned pad", (0.78, 0.77, 0.74), 0.28, 1.0)
m_print = principled("Strip print", (0.75, 0.75, 0.72), 0.5)
m_pkg = principled("5050 package", (0.9, 0.9, 0.88), 0.42)
m_reflector = principled("5050 reflector", (0.95, 0.95, 0.95), 0.2)
m_mlcc = principled("MLCC ceramic", (0.42, 0.33, 0.22), 0.4)
STRIP_MATS = [m_mask, m_copper_mask, m_tin, m_print, m_pkg, m_reflector, m_mlcc]
MI = {m: i for i, m in enumerate(STRIP_MATS)}


def bm_box(bm, c, s, mat, steps_x=1):
    """Axis-aligned box, optionally subdivided along x so it can bend."""
    x0, x1 = c[0] - s[0] / 2, c[0] + s[0] / 2
    y0, y1 = c[1] - s[1] / 2, c[1] + s[1] / 2
    z0, z1 = c[2] - s[2] / 2, c[2] + s[2] / 2
    xs = [x0 + (x1 - x0) * k / steps_x for k in range(steps_x + 1)]
    ring = []
    for x in xs:
        ring.append([bm.verts.new((x, y0, z0)), bm.verts.new((x, y1, z0)), bm.verts.new((x, y1, z1)), bm.verts.new((x, y0, z1))])
    faces = []
    for a, b in zip(ring[:-1], ring[1:]):
        for k in range(4):
            faces.append(bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k])))
    faces.append(bm.faces.new(tuple(reversed(ring[0]))))
    faces.append(bm.faces.new(tuple(ring[-1])))
    for f in faces:
        f.material_index = MI[mat]
    return faces


def bm_flat(bm, x0, x1, y0, y1, z, mat, step=1.0):
    """Thin printed feature on the PCB top, subdivided along x."""
    n = max(1, int(math.ceil((x1 - x0) / step)))
    xs = [x0 + (x1 - x0) * k / n for k in range(n + 1)]
    prev = None
    for x in xs:
        cur = (bm.verts.new((x, y0, z)), bm.verts.new((x, y1, z)))
        if prev:
            f = bm.faces.new((prev[0], cur[0], cur[1], prev[1]))
            f.material_index = MI[mat]
        prev = cur


def bm_disc(bm, c, r, z, mat, segs=32):
    vs = [bm.verts.new((c[0] + r * math.cos(2 * math.pi * k / segs), c[1] + r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)]
    f = bm.faces.new(vs)
    f.material_index = MI[mat]


def bm_text(bm, body, c, size, rot_deg=0.0):
    cu = bpy.data.curves.new("strip label", 'FONT')
    cu.body = body
    cu.size = size
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new("strip label", cu)
    me = bpy.data.meshes.new_from_object(o)
    me.transform(Matrix.Translation((c[0], c[1], PCB_T + 0.004)) @ Matrix.Rotation(math.radians(rot_deg), 4, 'Z'))
    for p in me.polygons:
        p.material_index = MI[m_print]
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    bpy.data.objects.remove(o)
    bpy.data.curves.remove(cu)


def finish(bm, name, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in STRIP_MATS:
        me.materials.append(m)
    if smooth:
        me.shade_smooth()
    return me


# tile: PCB, copper rails, cut pads, cut marks, labels, decoupling caps
bm = bmesh.new()
bm_box(bm, (0, 0, PCB_T / 2), (TILE, PCB_W, PCB_T), m_mask, steps_x=int(TILE))
z_top = PCB_T + 0.002
for sgn in (1, -1):
    bm_flat(bm, -TILE / 2 + 1.2, TILE / 2 - 1.2, sgn * RAIL_Y - 0.55, sgn * RAIL_Y + 0.55, z_top, m_copper_mask)
for k in range(7):
    xc = -TILE / 2 + PITCH * k
    for y in (RAIL_Y, 0.0, -RAIL_Y):
        for side in (-1, 1):
            x0, x1 = (xc - 1.1, xc - 0.1) if side < 0 else (xc + 0.1, xc + 1.1)
            x0, x1 = max(x0, -TILE / 2), min(x1, TILE / 2)
            if x1 - x0 > 0.2:
                bm_box(bm, ((x0 + x1) / 2, y, PCB_T + 0.03), (x1 - x0, 1.6, 0.06), m_tin)
    if 0 < k < 6:
        for y0, y1 in ((-PCB_W / 2 + 0.3, -RAIL_Y - 0.9), (-RAIL_Y + 0.9, -0.9), (0.9, RAIL_Y - 0.9), (RAIL_Y + 0.9, PCB_W / 2 - 0.3)):
            bm_flat(bm, xc - 0.07, xc + 0.07, y0, y1, z_top + 0.001, m_print, step=1.0)
    if k < 6:
        # pad labels just after each cut, data-direction arrow mid-segment
        for y, t in ((RAIL_Y, "+5V"), (0.0, "DIN"), (-RAIL_Y, "GND")):
            bm_text(bm, t, (xc + 2.6, y + 0.0), 0.62)
        bm_text(bm, ">", (xc + PITCH / 2, RAIL_Y + 1.25), 0.9)
for i in range(6):
    x_led = -41.75 + PITCH * i
    # data trace: previous cut pad -> DIN, DOUT -> next cut pad
    bm_flat(bm, x_led - 4.6, x_led - 3.0, -0.3, 0.3, z_top, m_copper_mask)
    bm_flat(bm, x_led + 3.0, x_led + 7.2, -0.3, 0.3, z_top, m_copper_mask)
    # 0603 decoupling cap between the rails
    cx, cy = x_led + 5.3, -1.9
    bm_box(bm, (cx, cy, PCB_T + 0.42), (0.8, 1.0, 0.8), m_mlcc)
    for e in (-1, 1):
        bm_box(bm, (cx, cy + e * 0.65, PCB_T + 0.42), (0.85, 0.3, 0.85), m_tin)
        bm_box(bm, (cx, cy + e * 0.9, PCB_T + 0.06), (0.9, 0.5, 0.12), m_tin)
tile_me = finish(bm, "strip tile")

# 5050 package, centred at the origin, sitting on z = 0 (placed at PCB top)
bm = bmesh.new()
faces = bm_box(bm, (0, 0, 0.75), (5.0, 5.0, 1.5), m_pkg)
bmesh.ops.bevel(bm, geom=list({e for f in faces for e in f.edges}), offset=0.18, offset_type='OFFSET', segments=2, profile=0.5, affect='EDGES')
bm_disc(bm, (0, 0), 2.1, 1.503, m_reflector)
bm_box(bm, (-2.05, -2.05, 1.51), (0.5, 0.5, 0.01), m_print)       # pin-1 corner mark
for sx in (-1, 1):
    for y in (-1.6, 0.0, 1.6):
        bm_box(bm, (sx * 2.72, y, 0.35), (0.55, 0.9, 0.7), m_tin)      # J-lead
        bm_box(bm, (sx * 3.05, y, 0.08), (0.7, 1.1, 0.16), m_tin)      # solder fillet
pkg_me = finish(bm, "ws2812b package")

# emitter: the milky encapsulant window, its own object per pixel
bm = bmesh.new()
bm_disc(bm, (0, 0), 1.85, 1.56, m_mask, 40)
lens_me = finish(bm, "ws2812b lens")
lens_me.materials.clear()
lens_me.materials.append(led_emit)


# strip path on the mat (metres). Starts by the board's J1 header, heads left,
# loops back behind the board and runs right towards the matrix.
bpy.context.view_layer.update()  # board_root.matrix_world must be current
pin_area = board_root.matrix_world @ Vector((-11.43, -20.0, 0.0))
# The strip stands on its edge for its whole length (LEDs facing the camera),
# which lets it snake freely across the mat. It starts behind the board's right
# end, where the data wire from the back header reaches it, and trails off the
# left of the frame.


def to_frame(p):
    v = Vector(p) - CAM_LOC
    z = v.dot(FWD)
    return ((v.dot(RIGHT) / z / TW) + 1) / 2, (1 - v.dot(UP) / z / TH) / 2


path_ctrl = [tuple(gp(fx, fy)) for fx, fy in (
    (0.86, 0.70), (0.72, 0.66), (0.58, 0.695), (0.44, 0.648), (0.31, 0.69), (0.18, 0.645), (0.05, 0.682), (-0.1, 0.66))]
path_ctrl = [(x, y, 0) for x, y, _ in path_ctrl]
while sum((Vector(path_ctrl[k + 1]) - Vector(path_ctrl[k])).length for k in range(len(path_ctrl) - 1)) < STRIP_LEN * 1.1:
    a_, b_ = Vector(path_ctrl[-2]), Vector(path_ctrl[-1])
    path_ctrl.append(tuple(b_ + (b_ - a_).normalized() * 0.06))
path = np.array(catmull(path_ctrl, 60))[:, :2]
seg = np.linalg.norm(np.diff(path, axis=0), axis=1)
arc = np.concatenate([[0], np.cumsum(seg)])


def twist(s):
    """0 flat .. 1 on edge: this strip is on its edge everywhere."""
    return 1.0


mat_y1 = float(path[:, 1].max()) + 0.035
mat_y0 = CAM_LOC.y + 0.05
cmat = box("Cutting mat", (CAM_LOC.x + 0.02, (mat_y0 + mat_y1) / 2, MAT_TOP / 2), (0.75, mat_y1 - mat_y0, MAT_TOP), mat_mat, bevel=0.0008)
MATRIX_Y = max(mat_y1 + 0.25, 0.60)
wall = box("Pegboard wall", (0, MATRIX_Y + 0.13, 0.4), (2.4, 0.006, 0.9), mat_wall)
print("path len", arc[-1], "mat far edge", mat_y1)
assert arc[-1] > STRIP_LEN, f"path {arc[-1]:.3f} m shorter than strip {STRIP_LEN:.3f} m"


def strip_frame(s):
    """position + tangent + left normal at arc length s (metres)."""
    i = int(np.clip(np.searchsorted(arc, s) - 1, 0, len(seg) - 1))
    t = (s - arc[i]) / seg[i]
    p = path[i] * (1 - t) + path[i + 1] * t
    d = (path[i + 1] - path[i]) / seg[i]
    return p, d, np.array([-d[1], d[0]])


HALF_W = PCB_W / 2  # mm


def deform(co_mm, x0_mm):
    """Map strip-local mm coords (x along, y across, z up) to world metres.

    In the U-turn the strip rolls about its length so the LED face points out
    of the loop (left of travel) and it rests on its edge."""
    out = np.empty_like(co_mm)
    for k, (x, y, z) in enumerate(co_mm):
        s = (x + x0_mm + TILE / 2) / 1000.0
        p, d, n = strip_frame(s)
        a = -math.pi / 2 * twist(s)
        ca, sa = math.cos(a), math.sin(a)
        # rotated across (y) and up (z) axes; n is the left normal, world up is z
        ylat, yup = ca, sa
        zlat, zup = -sa, ca
        lat = (y * ylat + z * zlat) / 1000.0
        up = (y * yup + z * zup + HALF_W * abs(sa)) / 1000.0
        q = p + n * lat
        out[k] = (q[0], q[1], MAT_TOP + up)
    return out


def deformed_copy(src_me, name, x0_mm, mat_override=None):
    me = src_me.copy()
    me.name = name
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = deform(co.reshape(-1, 3), x0_mm)
    me.vertices.foreach_set("co", co.ravel())
    me.update()
    return link(bpy.data.objects.new(name, me))


strip_objs = []
for t in range(N_TILES):
    o = deformed_copy(tile_me, f"Strip tile {t}", t * TILE)
    # smooth across the 1 mm bend segments, keep the PCB's square edges crisp
    o.data.shade_smooth()
    o.data.set_sharp_from_angle(angle=math.radians(30))
    strip_objs.append(o)
def strip_matrix(x_mm):
    """Rigid strip-local (mm) -> world (m) transform at one point along the strip,
    matching deform() there. Used for parts that must not bend (LED packages)."""
    sv = (x_mm + TILE / 2) / 1000.0
    p, d, n = strip_frame(sv)
    a = -math.pi / 2 * twist(sv)
    ca, sa = math.cos(a), math.sin(a)
    X = Vector((d[0], d[1], 0))
    N = Vector((n[0], n[1], 0))
    Y = N * ca + Vector((0, 0, sa))
    Z = N * -sa + Vector((0, 0, ca))
    o = Vector((p[0], p[1], MAT_TOP + HALF_W * abs(sa) / 1000.0))
    m = Matrix.Identity(4)
    for r in range(3):
        m[r][0], m[r][1], m[r][2], m[r][3] = X[r] / 1000, Y[r] / 1000, Z[r] / 1000, o[r]
    return m


led_world = []
for i in range(N_LED):
    x_led = -41.75 + PITCH * (i % 6) + TILE * (i // 6)
    M = strip_matrix(x_led) @ Matrix.Translation((0, 0, PCB_T))
    pk = pkg_me.copy()
    pk.name = f"WS2812B {i:02d}"
    pk.transform(M)
    link(bpy.data.objects.new(pk.name, pk))
    lm = lens_me.copy()
    lm.name = f"WS2812B {i:02d} emitter"
    lm.transform(M)
    e = link(bpy.data.objects.new(lm.name, lm))
    set_group(e, f"s{i:02d}")
    led_world.append(M @ Vector((0, 0, 1.6)))

# --------------------------------------------------------------------------
# hookup wires: data from the board to the strip; strip power and board ground run off frame
HEADER_X = 25.40 / 2 - 1.27
FIRST_Y = 62.74 / 2 - 1.27


def pin(index):
    return (-HEADER_X, FIRST_Y - (index - 1) * 2.54)


def pad_world(y_mm):
    return Vector(deform(np.array([[-49.6, y_mm, 0.4]]), 0)[0])


def solder_blob(at, r):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=at, segments=20, ring_count=10)
    j = bpy.context.object
    j.scale = (1, 1, 0.55)
    j.data.materials.append(solder_m)
    j.data.shade_smooth()


p0, d0, n0 = strip_frame(0.0)
d0 = Vector((d0[0], d0[1], 0))
WIRE_Z = MAT_TOP + 0.0008


def pin3(index):
    return (HEADER_X, FIRST_Y - (index - 1) * 2.54)


def off_right(fy, dz=0.0):
    a = gp(1.0, fy)
    return [Vector((a.x, a.y, WIRE_Z + dz)), Vector((a.x + 0.08, a.y + 0.01, WIRE_Z + dz))]


right = -d0                                  # out of the strip's input end
back_dir = Vector((0, 1, 0))


# data: GPIO21 on the back header (J3 pin 18) to the strip's DIN pad
px, py = pin3(18)
a = board_point(px, py, 0.8)
a_up = board_point(px, py, 5.0)
a_out = board_point(px + 5, py, 5.0)
b = pad_world(0.0)
e1 = b + right * 0.008
e2 = b + right * 0.016 - back_dir * 0.006 + Vector((0, 0, -0.001))
tube("Wire green data", catmull([b, e1, e2, (e2 + a_out) / 2 + Vector((0, 0, 0.002)), a_out, a_up], 14), 0.0008, ins["green"], res=3)
tube("Wire green core", [tuple(a + Vector((0, 0, -0.0015))), tuple(a_up)], 0.00035, solder_m, res=2)
solder_blob(a + Vector((0, 0, 0.0004)), 0.0011)
solder_blob(b, 0.0011)

# strip power: 5V and GND trail off the right of the frame, behind the data wire
for pad_y, col, k in ((RAIL_Y, "red", 0), (-RAIL_Y, "white", 1)):
    b = pad_world(pad_y)
    e1 = b + right * 0.008
    e2 = b + right * 0.02 + back_dir * (0.008 + 0.004 * k)
    e3 = Vector((e2.x, e2.y, WIRE_Z)) + right * 0.03 + back_dir * (0.016 + 0.004 * k)
    far = gp(1.0, 0.66)
    e4 = Vector((far.x + 0.02, e3.y + 0.01, WIRE_Z))
    e5 = e4 + Vector((0.08, 0.02, 0))
    tube(f"Wire {col} strip power", catmull([b, e1, e2, e3, e4, e5], 14), 0.0008, ins[col], res=3)
    solder_blob(b, 0.0011)

# board ground (J3 pin 21, G) runs off the right edge in front of everything
px, py = pin3(21)
a = board_point(px, py, 0.8)
a_up = board_point(px, py, 4.5)
a_out = board_point(px + 4, py - 3, 2.5)
far = gp(1.0, 0.80)
g1 = Vector((a_out.x + 0.012, a_out.y - 0.004, WIRE_Z))
g2 = Vector((far.x + 0.02, far.y, WIRE_Z))
tube("Wire black board ground", catmull([a_up, a_out, g1, g2, g2 + Vector((0.08, -0.01, 0))], 14), 0.0008, ins["black"], res=3)
tube("Wire black core", [tuple(a + Vector((0, 0, -0.0015))), tuple(a_up)], 0.00035, solder_m, res=2)
solder_blob(a + Vector((0, 0, 0.0004)), 0.0011)

# USB-C cable plugged into the board's USB (OTG) port, running out of frame
# front-right. Built in board millimetres: the receptacle shell spans
# x 1.18..10.12, y -32.9 (mouth)..-30.28, z 0.8..4.06.
USB_X, USB_Z, MOUTH_Y = 5.65, 2.43, -32.9
plug = box("USB-C plug shell", (USB_X, MOUTH_Y - 2.6, USB_Z), (8.2, 6.0, 2.4), chrome, bevel=0.6)
mould = box("USB-C overmould", (USB_X, MOUTH_Y - 5.4 - 8.5, USB_Z), (11.5, 17.0, 5.8), black_plastic, bevel=1.6)
relief = lathe("USB-C strain relief", [(0, 2.4), (3, 2.3), (8, 1.9)], black_plastic, 24)
relief.location = (USB_X, MOUTH_Y - 22.4, USB_Z)
relief.rotation_euler = (math.pi / 2, 0, 0)
for o in (plug, mould, relief):
    o.parent = board_root
bpy.context.view_layer.update()
fwd = (board_root.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
c0 = board_point(USB_X, MOUTH_Y - 30.0, USB_Z)
cable = catmull([tuple(c0), tuple(c0 + fwd * 0.025 + Vector((0, 0, -0.0012))),
                 (c0.x + 0.09, c0.y - 0.07, MAT_TOP + 0.0018), (0.30, -0.22, MAT_TOP + 0.0018), (0.42, -0.30, MAT_TOP + 0.0018)], 16)
tube("USB cable", cable, 0.0018, black_plastic, res=4)

# --------------------------------------------------------------------------
# 32x32 RGB matrix (P5, 160 mm) on a small easel at the back of the bench
M_N = 32
M_PITCH = 0.005
M_SIZE = M_N * M_PITCH
M_LED = 0.0016
matrix_root = link(bpy.data.objects.new("Matrix 32x32", None))
matrix_root.location = at_depth(0.70, MATRIX_Y, 0.012)
_d = CAM_LOC - matrix_root.location
matrix_root.rotation_euler = (math.radians(-8), 0, math.atan2(_d.x, -_d.y))  # leaning back, facing camera
panel_face = principled("HUB75 face", (0.006, 0.006, 0.007), 0.5)
pkg_m = principled("SMD2121 package", (0.02, 0.02, 0.022), 0.25)
frame = box("Matrix frame", (0, 0.009, M_SIZE / 2), (M_SIZE + 0.003, 0.012, M_SIZE + 0.003), black_plastic, bevel=0.0012)
face = box("Matrix face", (0, 0.0028, M_SIZE / 2), (M_SIZE, 0.0004, M_SIZE), panel_face)
for o in (frame, face):
    o.parent = matrix_root
# easel legs behind
for sx in (-1, 1):
    leg = box(f"Easel leg {sx}", (sx * 0.05, 0.05, 0.05), (0.008, 0.008, 0.13), dark_steel, bevel=0.001,
              rot=(math.radians(32), 0, 0))
    leg.parent = matrix_root
foot = box("Matrix foot rail", (0, 0.0, -0.004), (M_SIZE + 0.01, 0.03, 0.008), dark_steel, bevel=0.001)
foot.parent = matrix_root
# power leads out the back
_m = matrix_root.location
for k, col in enumerate(("red", "black")):
    o = Vector((0.03 + k * 0.006, 0, 0))
    tube("Matrix power " + col, catmull([tuple(_m + o + Vector((0, 0.03, 0.03))), tuple(_m + o + Vector((0.03, 0.08, 0.004))),
                                          tuple(_m + o + Vector((0.2, 0.15, 0.003))), tuple(_m + o + Vector((0.5, 0.2, 0.003)))], 10), 0.0012, ins[col])


def quad_grid(cells, z_off, size):
    verts, faces = [], []
    h = size / 2
    for (cx, cy) in cells:
        b = len(verts)
        verts += [(cx - h, -z_off, cy - h), (cx + h, -z_off, cy - h), (cx + h, -z_off, cy + h), (cx - h, -z_off, cy + h)]
        faces.append((b, b + 1, b + 2, b + 3))  # facing -Y (towards camera)
    return verts, faces


def led_center(col, row):
    # row 0 at top
    return ((col - (M_N - 1) / 2) * M_PITCH, M_SIZE / 2 + ((M_N - 1) / 2 - row) * M_PITCH)


# package bodies (unlit look between pixels)
cells = [led_center(c, r) for r in range(M_N) for c in range(M_N)]
v, f = quad_grid(cells, -0.00252, 0.0021)
pk = mesh_obj("Matrix packages", v, f, pkg_m)
pk.parent = matrix_root
# camera-only direct emitters
v, f = quad_grid(cells, -0.0024, M_LED)
direct = mesh_obj("Matrix direct emitters", v, f, pure_emit)
direct.parent = matrix_root
set_group(direct, "mdirect")
# camera + glossy rays: the matrix as seen directly and in mirror-like reflections
for attr in ("visible_diffuse", "visible_transmission", "visible_volume_scatter", "visible_shadow"):
    setattr(direct, attr, False)
# light-casting region emitters, invisible to camera rays
REG = 4
for ry in range(REG):
    for rx in range(REG):
        cells = [led_center(c, r) for r in range(ry * 8, ry * 8 + 8) for c in range(rx * 8, rx * 8 + 8)]
        v, f = quad_grid(cells, -0.0024, M_LED)
        o = mesh_obj(f"Matrix region {ry}{rx}", v, f, pure_emit)
        o.parent = matrix_root
        o.visible_camera = False
        o.visible_glossy = False
        o.visible_shadow = False
        set_group(o, f"m{ry}{rx}")

# --------------------------------------------------------------------------
# tools
# flush cutters, lying open on the mat front-right
cut_root = link(bpy.data.objects.new("Flush cutters", None))
cut_root.location = gp(0.43, 0.44, 0.0)
cut_root.rotation_euler = (0, 0, math.radians(200))
for side in (-1, 1):
    open_a = math.radians(9) * side
    jaw_bm = bmesh.new()
    bmesh.ops.create_cube(jaw_bm, size=1)
    for vv in jaw_bm.verts:
        x, y, z = vv.co
        t = x + 0.5  # 0 at pivot, 1 at tip
        w = 0.0085 * (1 - 0.72 * t)
        hgt = 0.0075 * (1 - 0.45 * t)
        vv.co = Vector((t * 0.024, y * w + side * w * 0.5, (z + 0.5) * hgt))
    me = bpy.data.meshes.new("jaw")
    jaw_bm.to_mesh(me)
    jaw_bm.free()
    jaw = link(bpy.data.objects.new(f"Cutter jaw {side}", me))
    me.materials.append(steel)
    bv = jaw.modifiers.new("bv", 'BEVEL'); bv.width = 0.0008; bv.segments = 2
    me.shade_smooth()
    jaw.modifiers.new("wn", 'WEIGHTED_NORMAL')
    jaw.parent = cut_root
    jaw.rotation_euler = (0, 0, -open_a)
    # handle: from pivot backwards, bowing outwards
    hp = []
    for k in range(17):
        t = k / 16
        x = -0.004 - t * 0.105
        y = side * (0.006 + 0.026 * math.sin(t * math.pi * 0.55) + t * 0.01)
        hp.append((x, y, 0.0042))
    radii = [0.55 + 0.45 * math.sin(min(1, k / 4) * math.pi / 2) for k in range(17)]
    h = tube(f"Cutter handle {side}", hp, 0.0042, rubber_red, res=4, taper=radii)
    h.parent = cut_root
    h.rotation_euler = (0, 0, -open_a * 0.6)
    s = tube(f"Cutter shank {side}", [(0.004, side * 0.002, 0.004), (-0.012, side * 0.0065, 0.0042)], 0.0034, steel)
    s.parent = cut_root
piv = lathe("Cutter pivot", [(0.0, 0.0045), (0.0085, 0.0045), (0.009, 0.0035)], steel)
piv.parent = cut_root
spr = tube("Cutter spring", catmull([(-0.03, -0.012, 0.0045), (-0.04, 0, 0.0055), (-0.03, 0.012, 0.0045)], 10), 0.0006, chrome)
spr.parent = cut_root

# soldering iron in a coil stand, back-right
stand = link(bpy.data.objects.new("Iron stand", None))
stand.location = at_depth(0.34, MATRIX_Y - 0.02, 0.0)
_u = Vector((-0.75, -1.0, 0)).normalized()
stand.rotation_euler = (0, 0, math.atan2(-_u.y, -_u.x))
base = lathe("Stand base", [(0, 0.0), (0, 0.055), (0.012, 0.055), (0.016, 0.05), (0.018, 0.0)], black_plastic, 64)
base.parent = stand
cup = lathe("Brass wool cup", [(0.016, 0.0), (0.016, 0.026), (0.038, 0.028), (0.038, 0.025), (0.019, 0.023)], chrome, 48)
cup.parent = stand
cup.location = (0.028, 0.022, 0)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=0.022, location=(0, 0, 0))
wool = bpy.context.object
wool.name = "Brass wool"
wool.scale = (1, 1, 0.75)
d = wool.modifiers.new("disp", 'DISPLACE')
tx = bpy.data.textures.new("woolnoise", 'VORONOI'); tx.noise_scale = 0.12
d.texture = tx; d.strength = 0.005
wool.data.materials.append(brass)
wool.parent = cup
wool.location = (0, 0, 0.032)
coil_tilt = math.radians(20)
coil_root = link(bpy.data.objects.new("Coil holder", None))
coil_root.parent = stand
coil_root.location = (-0.02, -0.01, 0.03)
coil_root.rotation_euler = (0, coil_tilt - math.pi / 2, 0)  # axis along local -X, raised
hel = []
for k in range(380):
    t = k / 379
    a = t * 2 * math.pi * 9
    r = 0.011 + 0.006 * t
    hel.append((r * math.cos(a), r * math.sin(a), t * 0.085))
coil = tube("Holder coil", hel, 0.0011, chrome, res=2)
coil.parent = coil_root
post = box("Holder post", (-0.02, -0.01, 0.015), (0.01, 0.01, 0.03), chrome, bevel=0.002)
post.parent = stand
# iron along the coil axis, tip deep in the coil, handle out toward camera
iron_root = link(bpy.data.objects.new("Soldering iron", None))
iron_root.parent = coil_root
iron_root.location = (0, 0, -0.02)
iron_profile = [
    (0.0, 0.0002), (0.006, 0.0009), (0.016, 0.0019), (0.05, 0.0024), (0.052, 0.0034), (0.09, 0.0036),
    (0.094, 0.0055), (0.1, 0.0085), (0.108, 0.0092), (0.16, 0.0094), (0.175, 0.0088), (0.2, 0.0072),
    (0.215, 0.0062), (0.24, 0.0042), (0.25, 0.0035),
]
tip = lathe("Iron tip and barrel", iron_profile[:6], steel, 32)
grip = lathe("Iron grip", iron_profile[5:], grip_grey, 48)
for o in (tip, grip):
    o.parent = iron_root
cable_pts = [(0, 0, 0.25), (0, 0, 0.29), (0.0, 0.02, 0.33)]
ic = tube("Iron cable", cable_pts, 0.0025, black_plastic)
ic.parent = iron_root
# rest of the iron cable falls to the bench and runs off frame (world space)
bpy.context.view_layer.update()
ie = iron_root.matrix_world @ Vector((0.0, 0.02, 0.33))
tube("Iron cable run", catmull([tuple(ie), (ie.x - 0.03, ie.y + 0.02, ie.z * 0.4), (ie.x - 0.06, ie.y + 0.06, 0.003), (ie.x - 0.3, ie.y + 0.1, 0.003)], 12), 0.0025, black_plastic)

# solder spool lying on its side, mid-right
sp_root = link(bpy.data.objects.new("Solder spool", None))
sp_root.location = gp(0.93, 0.60) + Vector((0.035, 0.06, 0.0285 - MAT_TOP))
sp_root.rotation_euler = (math.pi / 2, 0, math.radians(70))
fl = [(0.0, 0.009), (0.0, 0.03), (0.0025, 0.03), (0.0025, 0.009)]
for z0 in (-0.0175, 0.015):
    f = lathe("Solder spool flange", [(z0 + z, r) for z, r in fl], black_plastic, 64)
    f.parent = sp_root
wire_core = lathe("Solder winding", [(-0.015, 0.024), (0.015, 0.024)], wound("Solder winding", (0.72, 0.72, 0.74)), 64)
wire_core.parent = sp_root
mt = wire_core.data.materials[0].node_tree.nodes["Principled BSDF"]
mt.inputs["Metallic"].default_value = 1.0
_s = sp_root.location
tube("Solder strand", catmull([(_s.x - 0.008, _s.y - 0.02, _s.z + 0.022), (_s.x - 0.02, _s.y - 0.045, _s.z), (_s.x - 0.035, _s.y - 0.06, MAT_TOP + 0.0006),
                                (_s.x - 0.06, _s.y - 0.07, MAT_TOP + 0.0006), (_s.x - 0.09, _s.y - 0.062, MAT_TOP + 0.0006)], 10), 0.0004, solder_m)

# hookup wire spools, back-left
for name, pos, rotz, col in (("Wire spool red", at_depth(0.18, MATRIX_Y - 0.13, 0.0), 12, (0.5, 0.012, 0.01)),
                             ("Wire spool yellow", at_depth(0.27, MATRIX_Y - 0.06, 0.0), -8, (0.6, 0.42, 0.01)),
                             ("Wire spool black", at_depth(0.08, MATRIX_Y - 0.02, 0.0), 30, (0.012, 0.012, 0.012))):
    r = link(bpy.data.objects.new(name, None))
    r.location = (pos[0], pos[1], (MAT_TOP if pos[1] < mat_y1 else 0.0) + 0.031)
    r.rotation_euler = (0, math.pi / 2, math.radians(rotz))
    for z0 in (-0.0215, 0.019):
        f = lathe(name + " flange", [(z0 + z, rr) for z, rr in [(0, 0.008), (0, 0.031), (0.0025, 0.031), (0.0025, 0.008)]],
                  principled(name + " flange", (0.45, 0.46, 0.46), 0.35), 64)
        f.parent = r
    w = lathe(name + " winding", [(-0.019, 0.025), (0.019, 0.025)], wound(name + " winding", col), 64)
    w.parent = r
_r = bpy.data.objects["Wire spool red"].location
tube("Loose red wire", catmull([(_r.x + 0.005, _r.y - 0.026, 0.03), (_r.x + 0.006, _r.y - 0.05, 0.004), (_r.x + 0.03, _r.y - 0.07, 0.0035),
                                 (_r.x + 0.07, _r.y - 0.065, 0.0035), (_r.x + 0.09, _r.y - 0.08, 0.0035)], 10), 0.0008, ins["red"])

# --------------------------------------------------------------------------
# camera
cam_data = bpy.data.cameras.new("Hero camera")
cam_data.lens = LENS
cam_data.sensor_width = 36
cam_data.sensor_fit = 'HORIZONTAL'
cam_data.clip_start = 0.005
cam = link(bpy.data.objects.new("Hero camera", cam_data))
cam.location = CAM_LOC
focus = link(bpy.data.objects.new("Focus target", None))
focus.location = board_point(0, 2, 3)
cam.rotation_euler = FWD.to_track_quat('-Z', 'Y').to_euler()
cam_data.dof.use_dof = True
cam_data.dof.focus_object = focus
cam_data.dof.aperture_fstop = 8
cam_data.dof.aperture_blades = 7
scene.camera = cam

# --------------------------------------------------------------------------
# render settings (render_passes.py overrides resolution/samples)
scene.render.engine = 'CYCLES'
scene.render.resolution_x, scene.render.resolution_y = RES
scene.render.resolution_percentage = 100
cy = scene.cycles
cy.device = 'CPU'
cy.samples = 256
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.use_light_tree = True
cy.max_bounces = 8
cy.diffuse_bounces = 3
cy.glossy_bounces = 4
cy.transmission_bounces = 4
cy.transparent_max_bounces = 16
cy.caustics_reflective = False
cy.caustics_refractive = False
cy.blur_glossy = 0.6
cy.sample_clamp_indirect = 20.0
cy.use_denoising = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
vl.cycles.denoising_store_passes = True
vl.use_pass_z = True

# --------------------------------------------------------------------------
# projected LED positions for the compositor
bpy.context.view_layer.update()
W, H = RES


def project(p):
    c = world_to_camera_view(scene, cam, p)
    return [c.x * W, (1 - c.y) * H, c.z]


mat_pts = []
for r in range(M_N):
    row = []
    for c in range(M_N):
        lx, lz = led_center(c, r)
        row.append(project(matrix_root.matrix_world @ Vector((lx, -0.0024, lz))))
    mat_pts.append(row)
strip_pts = [project(p) for p in led_world]
# the same LEDs mirrored in the varnished bench top (z = 0)
mirror_pts = []
for r in range(M_N):
    for c in range(M_N):
        lx, lz = led_center(c, r)
        q = matrix_root.matrix_world @ Vector((lx, -0.0024, lz))
        mirror_pts.append(project(Vector((q.x, q.y, -q.z))))
# defocus of the matrix plane: circle-of-confusion diameter in pixels
f = cam_data.lens / 1000
N = cam_data.dof.aperture_fstop
s = (focus.location - cam.location).length
dm = (matrix_root.matrix_world @ Vector((0, 0, M_SIZE / 2)) - cam.location).length
pitch_px = math.dist(mat_pts[16][15][:2], mat_pts[16][16][:2])
coc1 = abs(dm - s) / dm * f * f / (1.0 * (s - f)) / (cam_data.sensor_width / 1000) * W  # at f/1
N = coc1 / (1.1 * pitch_px)
cam_data.dof.aperture_fstop = N
coc_px = coc1 / N
print("f-stop", round(N, 2), "pitch px", round(pitch_px, 1))
bb = [project(o.matrix_world @ Vector(c)) for o in board_root.children if o.type == 'MESH' for c in o.bound_box]
print("board frame bbox fx %.3f-%.3f fy %.3f-%.3f" % (min(p[0] for p in bb) / W, max(p[0] for p in bb) / W, min(p[1] for p in bb) / H, max(p[1] for p in bb) / H))
info = {"fstop": N, "pitch_px": pitch_px, "res": RES, "matrix": mat_pts, "matrix_mirror": mirror_pts, "strip": strip_pts, "matrix_coc_px": coc_px,
        "focus_dist": s, "matrix_dist": dm, "groups": [g.name for g in vl.lightgroups]}
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "leds.json"), "w") as fh:
    json.dump(info, fh)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "workbench.blend"))
print("BUILD OK groups", len(vl.lightgroups), "coc_px", round(coc_px, 1), "focus", round(s, 3), "matrix", round(dm, 3))
