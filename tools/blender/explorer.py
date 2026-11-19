# The player's own figure (the garden observer) and everything it can wear, generated in Blender. Re-run to change.
#
#   blender -b --factory-startup --python tools/blender/explorer.py -- public/models/explorer
#
# explorer.glb: the figure. Node names the scene uses (app/proto3d/Explorer3D.tsx):
#   body (hips pivot) · head (neck pivot) · arm_l, arm_r (shoulders) · eye_l, eye_r (blink)
#   hat, back, hand: empty sockets where a hat, a bag and a held tool are put on
# Items, one file each, built round their socket (origin = the socket):
#   coat_*  over the body (put on the body pivot) · hat_* on the head · bag_* on the back · tool_* in the right hand
# Material names the scene tints from the player's colours: primary (top/coat), secondary (trousers/bag), accent.
# Faces look down -Y in Blender (+Z in glTF, towards the camera).
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import reset, material, smooth, ball, rbox, capsule, ring, pivot, attach, attach_new, export  # noqa: E402

OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'public/models/explorer')


def cyl(name, at, r, h, mat, verts=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=at, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    smooth(o, 0)
    return o


def figure():
    skin, hair, dark = material('skin', '#f2d3b5'), material('hair', '#3b2f2a'), material('eye', '#1d1f24')
    top, legs, boots, cheek = material('primary', '#4b6638'), material('secondary', '#d8ccae'), material('boots', '#6f5040'), material('cheek', '#f0a99a')
    root = pivot('body', (0, 0, 0.42))
    s = set(bpy.data.objects)
    for x in (-0.13, 0.13):
        ball('boot', (x, -0.05, 0.08), (0.12, 0.17, 0.09), boots)
        capsule('leg', (x, 0, 0.14), (x, 0, 0.36), 0.085, legs)
    ball('hips', (0, 0, 0.42), (0.26, 0.22, 0.14), legs)
    ball('torso', (0, 0, 0.62), (0.3, 0.25, 0.3), top)
    pivot('back', (0, 0.27, 0.62), None)
    attach_new(root, s | {root})
    head = pivot('head', (0, 0, 0.88), root)
    s = set(bpy.data.objects)
    ball('skull', (0, 0, 1.18), (0.33, 0.31, 0.32), skin)
    # hair: a soft cap with a fringe, a small tuft at the back
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0.03, 1.24))
    h = bpy.context.active_object
    h.name = 'hair'
    h.scale = (0.345, 0.33, 0.31)
    h.data.materials.append(hair)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for v in h.data.vertices:
        v.select = v.co.z < 0.05 and v.co.y < 0.3
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')
    smooth(h, 1)
    ball('tuft', (0.04, 0.24, 1.44), (0.09, 0.07, 0.08), hair)
    for x in (-0.15, 0.15):
        ball('cheek', (x, -0.27, 1.1), (0.05, 0.02, 0.035), cheek, (16, 8))
    ball('nose', (0, -0.31, 1.15), (0.03, 0.025, 0.025), skin, (16, 8))
    pivot('hat', (0, 0.0, 1.47), None)
    attach_new(head, s | {head})
    for side, x in (('l', -0.11), ('r', 0.11)):
        e = ball('eye_' + side, (x, -0.29, 1.2), (0.04, 0.025, 0.05), dark, (16, 8))
        attach(e, head)
    for side, x in (('l', -1), ('r', 1)):
        a = pivot('arm_' + side, (x * 0.27, 0, 0.8), root)
        s = set(bpy.data.objects)
        capsule('sleeve_' + side, (x * 0.3, -0.01, 0.78), (x * 0.36, -0.06, 0.55), 0.07, top)
        ball('hand_' + side, (x * 0.37, -0.08, 0.5), 0.065, skin, (16, 8))
        if side == 'r':
            pivot('hand', (x * 0.37, -0.1, 0.5), None)
        attach_new(a, s | {a})


# ---------- coats (over the torso; built round the body pivot at z=0.42) ----------
def coat_vest():
    c, t = material('primary', '#4b6638'), material('accent', '#d8b25a')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0, 0.21))
    v = bpy.context.active_object
    v.name = 'vest'
    v.scale = (0.315, 0.27, 0.29)
    v.data.materials.append(c)
    smooth(v, 0)
    for x in (-0.13, 0.13):
        rbox('pocket', (x, -0.24, 0.12), (0.12, 0.04, 0.1), t, bevel=0.2)


def coat_lab():
    c, t = material('primary', '#f4f1e8'), material('accent', '#5c5447')
    cyl('coat', (0, 0, 0.12), 0.31, 0.5, c)
    ball('coat_top', (0, 0, 0.32), (0.31, 0.27, 0.16), c)
    for x in (-0.05, 0.05):
        ball('button', (0, -0.3, 0.05 + abs(x) * 2), 0.02, t, (12, 6))
    rbox('pocket', (0.15, -0.28, 0.0), (0.1, 0.03, 0.09), c, bevel=0.2)


def coat_rain():
    c, t = material('primary', '#e6b93a'), material('accent', '#3b3128')
    # a flared cape: a cone, smooth-shaded only (a subdivision crumples its open hem)
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.4, radius2=0.28, depth=0.6, location=(0, 0, 0.1), end_fill_type='NOTHING')
    o = bpy.context.active_object
    o.name = 'raincoat'
    o.data.materials.append(c)
    smooth(o, 0)
    o.modifiers.new('t', 'SOLIDIFY').thickness = 0.02
    ball('raincoat_top', (0, 0, 0.36), (0.29, 0.25, 0.12), c)
    for z in (0.25, 0.1, -0.05):
        ball('toggle', (0, -0.31, z), (0.025, 0.015, 0.012), t, (12, 6))


def coat_knit():
    c, t = material('primary', '#b8372b'), material('accent', '#f4eedf')
    ball('knit', (0, 0, 0.2), (0.33, 0.28, 0.32), c)
    for z in (0.16, 0.24):
        ring('stripe', (0, 0, z), 0.32, 0.018, t, rot=(0, 0, 0))
    ring('collar', (0, 0, 0.44), 0.16, 0.04, c, rot=(0, 0, 0))


# ---------- hats (origin = top of the head) ----------
def hat_explorer():
    c, t = material('secondary', '#c9a77a'), material('accent', '#5b3d2e')
    cyl('brim', (0, 0, -0.04), 0.46, 0.03, c)
    ball('crown', (0, 0, 0.05), (0.27, 0.27, 0.17), c)
    ring('band', (0, 0, 0.0), 0.26, 0.025, t, rot=(0, 0, 0))


def hat_beret():
    c, t = material('primary', '#2c5c92'), material('accent', '#2c5c92')
    ball('beret', (0.03, 0, -0.01), (0.34, 0.33, 0.1), c)
    capsule('stem', (0.03, 0, 0.08), (0.04, 0, 0.13), 0.02, t)


def hat_straw():
    c, t = material('secondary', '#e8cf8a'), material('accent', '#b8372b')
    cyl('brim', (0, 0, -0.05), 0.58, 0.025, c)
    cyl('crown', (0, 0, 0.04), 0.25, 0.16, c)
    ring('ribbon', (0, 0, -0.01), 0.255, 0.028, t, rot=(0, 0, 0))


def hat_lamp():
    c, lamp = material('secondary', '#3b3128'), material('lamp', '#fff1c4')
    ring('band', (0, 0, -0.12), 0.32, 0.035, c, rot=(0, 0, 0))
    rbox('lamp_box', (0, -0.33, -0.1), (0.12, 0.08, 0.1), c, bevel=0.3)
    ball('lamp_glass', (0, -0.38, -0.1), (0.045, 0.02, 0.045), lamp, (16, 8))


# ---------- bags (origin = the middle of the back) ----------
def bag_specimen():
    c, t = material('secondary', '#6f5040'), material('accent', '#d8b25a')
    rbox('box', (0, 0.1, 0), (0.36, 0.18, 0.3), c, bevel=0.2)
    rbox('flap', (0, 0.05, 0.12), (0.37, 0.1, 0.08), t, bevel=0.3)
    for x in (-0.12, 0.12):
        capsule('strap', (x, -0.02, 0.18), (x, -0.02, -0.14), 0.02, c)


def bag_brief():
    c, t = material('secondary', '#3b3128'), material('accent', '#c99a3e')
    rbox('case', (0, 0.08, -0.02), (0.38, 0.12, 0.28), c, bevel=0.15)
    ring('handle', (0, 0.08, 0.15), 0.07, 0.015, t)


def bag_tube():
    c, t = material('secondary', '#4b6638'), material('accent', '#c99a3e')
    cyl('tube', (0.05, 0.1, 0), 0.09, 0.62, c, rot=(0, 0.5, 0))
    for d in (-0.29, 0.29):
        cyl('cap', (0.05 + d * math.sin(0.5), 0.1, d * math.cos(0.5)), 0.095, 0.05, t, rot=(0, 0.5, 0))


# ---------- tools (origin = the right hand) ----------
def tool_loupe():
    c, g = material('accent', '#c99a3e'), material('glass', '#bfe2ff')
    capsule('handle', (0, -0.02, -0.02), (0.02, -0.04, 0.16), 0.022, material('secondary', '#5b3d2e'))
    ring('rim', (0.03, -0.06, 0.26), 0.1, 0.018, c, rot=(math.pi / 2, 0, 0))
    cyl('lens', (0.03, -0.06, 0.26), 0.092, 0.01, g, rot=(math.pi / 2, 0, 0))


def tool_notebook():
    c, p = material('primary', '#7a4a3a'), material('paper', '#f4eedf')
    rbox('cover', (0.02, -0.08, 0.02), (0.2, 0.05, 0.26), c, bevel=0.15, rot=(0.3, 0, 0))
    rbox('pages', (0.025, -0.11, 0.02), (0.18, 0.02, 0.24), p, bevel=0.1, rot=(0.3, 0, 0))


def tool_staff():
    c, t = material('secondary', '#a77d58'), material('accent', '#b8372b')
    capsule('staff', (0, -0.02, -0.45), (0, -0.02, 0.5), 0.022, c)
    for z in (0.1, 0.3):
        cyl('mark', (0, -0.02, z), 0.026, 0.06, t)


def tool_trowel():
    c, m = material('secondary', '#6f5040'), material('metal', '#c3ccd4')
    capsule('grip', (0, -0.02, -0.06), (0, -0.02, 0.08), 0.025, c)
    rbox('blade', (0, -0.03, 0.2), (0.11, 0.02, 0.18), m, bevel=0.4)


ITEMS = {name: fn for name, fn in globals().items() if name.split('_')[0] in ('coat', 'hat', 'bag', 'tool') and callable(fn)}


def main():
    os.makedirs(OUT, exist_ok=True)
    reset()
    figure()
    export(os.path.join(OUT, 'explorer.glb'))
    for name, build in ITEMS.items():
        reset()
        build()
        export(os.path.join(OUT, name + '.glb'))


main()
