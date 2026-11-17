# The three analysts (redesign 3장), generated in Blender. Re-run to change them.
#
#   blender -b --factory-startup --python tools/blender/analysts.py -- public/models/analysts
#
# Writes tori.glb (auditor: glasses, clipboard), moa.glb (tracker: long ears, scarf, telescope),
# luon.glb (rebutter: hood, one raised brow) and bori.glb (the guinea pig friend who comes over to talk: a squat loaf
# of a body, small round ears, a patch over one eye, a white blaze, two front teeth, a mint scarf, a sprout leaf). Node names the scene animates (app/proto3d/Analyst3D.tsx):
#   body          hips pivot, the whole figure bobs and turns on it
#   head          neck pivot, looks around and nods
#   arm_l, arm_r  shoulder pivots, swing and gesture
#   eye_l, eye_r  blink (scaled flat)
# Colours live in the materials; the scene reads them and swaps in the shared soft material. Faces look down -Y in
# Blender, which is +Z in glTF (towards the camera).
import bpy, math, os, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'public/models/analysts'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, hexcol):
    h = hexcol.lstrip('#')
    rgb = tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    return m


def smooth(obj, level=2):
    for p in obj.data.polygons:
        p.use_smooth = True
    if level:
        obj.modifiers.new('sub', 'SUBSURF').levels = level


def ball(name, at, size, mat, segs=(32, 16)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs[0], ring_count=segs[1], radius=1, location=at)
    o = bpy.context.active_object
    o.name = name
    o.scale = size if isinstance(size, tuple) else (size, size, size)
    o.data.materials.append(mat)
    smooth(o, 0)
    return o


def rbox(name, at, size, mat, bevel=0.3, rot=(0, 0, 0)):
    """A rounded box: a cube with a bevel and a subdivision, so it reads soft but square."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=at, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new('b', 'BEVEL')
    b.width = min(size) * bevel
    b.segments = 3
    smooth(o, 1)
    o.data.materials.append(mat)
    return o


def capsule(name, a, b, r, mat):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.materials.append(mat)
    for end, nm in ((a, name + '_a'), (b, name + '_b')):
        e = ball(nm, tuple(end), r, mat, (20, 10))
        e.parent = None
    smooth(o, 0)
    return o


def ring(name, at, r, thick, mat, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thick, major_segments=32, minor_segments=8, location=at, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    smooth(o, 0)
    return o


def pivot(name, at, parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.location = at
    if parent:
        attach(e, parent)
    return e


def attach(child, parent):
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = mw


def attach_new(parent, before):
    """Parent every object made since `before` to `parent` (keeping where it is)."""
    for o in set(bpy.data.objects) - before:
        if o is not parent and o.parent is None:
            attach(o, parent)


def base(c):
    """The shared figure: feet, round body, big head with eyes, short arms. Returns the pivots."""
    fur, dark, belly = material('fur', c['fur']), material('eye', '#1d1f24'), material('belly', c['belly'])
    root = pivot('body', (0, 0, 0.42))
    s = set(bpy.data.objects)
    for x in (-0.15, 0.15):
        ball('foot', (x, -0.04, 0.07), (0.12, 0.16, 0.08), fur)
    ball('torso', (0, 0, 0.5), (0.38, 0.33, 0.42), fur)
    ball('belly', (0, -0.2, 0.46), (0.25, 0.16, 0.28), belly)
    attach_new(root, s | {root})

    head = pivot('head', (0, 0, 0.86), root)
    s = set(bpy.data.objects)
    hs = c.get('head_shape', 'round')
    if hs == 'square':
        rbox('skull', (0, 0, 1.2), (0.7, 0.62, 0.6), fur, bevel=0.42)
    else:
        ball('skull', (0, 0, 1.2), (0.37, 0.34, 0.34), fur)
    ball('muzzle', (0, -0.3, 1.11), (0.13, 0.08, 0.09), belly)
    ball('nose', (0, -0.38, 1.15), (0.035, 0.03, 0.028), dark, (16, 8))
    attach_new(head, s | {head})
    eyes = []
    for side, x in (('l', -0.13), ('r', 0.13)):
        e = ball('eye_' + side, (x, -0.31, 1.24), (0.045, 0.03, 0.055), dark, (16, 8))
        attach(e, head)
        eyes.append(e)

    arms = {}
    for side, x in (('l', -1), ('r', 1)):
        a = pivot('arm_' + side, (x * 0.33, 0, 0.74), root)
        s = set(bpy.data.objects)
        capsule('sleeve_' + side, (x * 0.36, -0.02, 0.72), (x * 0.43, -0.08, 0.47), 0.075, fur)
        attach_new(a, s | {a})
        arms[side] = a
    return dict(root=root, head=head, arms=arms, mats=dict(fur=fur, dark=dark, belly=belly))


def tori():
    c = dict(fur='#b98559', belly='#ead2b2', head_shape='square')
    p = base(c)
    vest, glass, board, paper = material('vest', '#36557e'), material('frame', '#23262d'), material('board', '#a9774a'), material('paper', '#f4f1e8')
    s = set(bpy.data.objects)
    # a navy vest over the body, and a tidy collar line
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0.02, 0.6))
    v = bpy.context.active_object
    v.name = 'vest'
    v.scale = (0.392, 0.342, 0.3)
    v.data.materials.append(vest)
    smooth(v, 0)
    attach_new(p['root'], s | {p['root']})
    # round ears, glasses
    s = set(bpy.data.objects)
    for x in (-0.25, 0.25):
        ball('ear', (x, 0.02, 1.5), (0.11, 0.06, 0.11), p['mats']['fur'])
    for x in (-0.13, 0.13):
        ring('lens', (x, -0.345, 1.24), 0.085, 0.014, glass)
    capsule('bridge', (-0.05, -0.36, 1.25), (0.05, -0.36, 1.25), 0.012, glass)
    attach_new(p['head'], s | {p['head']})
    # clipboard in the right hand
    s = set(bpy.data.objects)
    rbox('clipboard', (0.36, -0.36, 0.5), (0.3, 0.035, 0.38), board, bevel=0.2, rot=(0.25, 0, -0.35))
    rbox('paper', (0.35, -0.385, 0.49), (0.25, 0.012, 0.3), paper, bevel=0.1, rot=(0.25, 0, -0.35))
    attach_new(p['arms']['r'], s | {p['arms']['r']})


def moa():
    c = dict(fur='#f0e3cc', belly='#fbf4e6')
    p = base(c)
    scarf, brass, lens, inner = material('scarf', '#d06a2f'), material('brass', '#c99a3e'), material('glass', '#2b3d52'), material('ear_in', '#efb59c')
    s = set(bpy.data.objects)
    # long ears that lean back, a little pink inside
    for x, tilt in ((-0.14, -0.25), (0.14, 0.32)):
        capsule('ear', (x, 0.06, 1.42), (x * 2.1, 0.2 + abs(tilt) * 0.2, 1.92), 0.075, p['mats']['fur'])
        capsule('ear_in', (x, 0.0, 1.46), (x * 2.0, 0.13 + abs(tilt) * 0.2, 1.86), 0.04, inner)
    attach_new(p['head'], s | {p['head']})
    s = set(bpy.data.objects)
    ring('scarf', (0, 0, 0.86), 0.27, 0.07, scarf, rot=(0, 0, 0))
    capsule('scarf_tail', (0.12, -0.22, 0.84), (0.2, -0.28, 0.55), 0.06, scarf)
    attach_new(p['root'], s | {p['root']})
    # a brass telescope in the left hand
    s = set(bpy.data.objects)
    capsule('scope', (-0.44, -0.12, 0.5), (-0.5, -0.55, 0.7), 0.06, brass)
    ring('scope_rim', (-0.5, -0.55, 0.7), 0.065, 0.02, lens, rot=(math.radians(66), 0, math.radians(-8)))
    attach_new(p['arms']['l'], s | {p['arms']['l']})


def luon():
    c = dict(fur='#9ba7b8', belly='#dfe4ec')
    p = base(c)
    hood, cord, brow = material('hood', '#6a5aa8'), material('cord', '#efe9ff'), material('brow', '#2b2d35')
    s = set(bpy.data.objects)
    # a hood behind and over the head, open at the front
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0.07, 1.24))
    h = bpy.context.active_object
    h.name = 'hood'
    h.scale = (0.41, 0.36, 0.39)
    h.data.materials.append(hood)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for v in h.data.vertices:
        v.select = v.co.y < -0.45 and v.co.z > -0.75
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')
    sol = h.modifiers.new('s', 'SOLIDIFY')
    sol.thickness = 0.05
    smooth(h, 1)
    # one raised brow, one flat
    capsule('brow_l', (-0.19, -0.33, 1.33), (-0.08, -0.34, 1.33), 0.014, brow)
    capsule('brow_r', (0.08, -0.34, 1.37), (0.19, -0.32, 1.41), 0.014, brow)
    attach_new(p['head'], s | {p['head']})
    s = set(bpy.data.objects)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0.01, 0.52))
    b = bpy.context.active_object
    b.name = 'hoodie'
    b.scale = (0.4, 0.35, 0.4)
    b.data.materials.append(hood)
    smooth(b, 0)
    for x in (-0.07, 0.07):
        capsule('cord', (x, -0.33, 0.86), (x * 1.2, -0.36, 0.66), 0.012, cord)
    attach_new(p['root'], s | {p['root']})
    # hands in the pocket: arms lean in
    p['arms']['l'].rotation_euler = (0.2, 0, -0.35)
    p['arms']['r'].rotation_euler = (0.2, 0, 0.35)


def bori():
    c = dict(fur='#e3b47a', belly='#fff3e1')
    p = base(c)
    patch, blaze, inner, tooth, scarf, leaf = (material('patch', '#8a5a34'), material('blaze', '#fffaf2'), material('ear_in', '#f2b8a4'),
                                               material('tooth', '#ffffff'), material('scarf', '#3fa98a'), material('leaf', '#6cc04a'))
    # a guinea pig is a loaf: wider, lower, rounder than the others
    for o in bpy.data.objects:
        # (sizes only: these are parented to the pivots, so their locations are not world positions)
        if o.name.startswith('torso'): o.scale = (0.45, 0.38, 0.38)
        if o.name.startswith('belly'): o.scale = (0.3, 0.17, 0.27); o.location.y -= 0.05   # pivots do not rotate: a shift is a shift
        if o.name.startswith('skull'): o.scale = (0.41, 0.34, 0.33)
    s = set(bpy.data.objects)
    # small round ears that flop out, pink inside
    for x, rz in ((-0.3, 0.5), (0.3, -0.5)):
        e = ball('ear', (x, 0.04, 1.4), (0.12, 0.045, 0.085), p['mats']['fur'])
        e.rotation_euler = (0, rz, 0)
        e2 = ball('ear_in', (x * 0.98, 0.0, 1.4), (0.08, 0.03, 0.055), inner)
        e2.rotation_euler = (0, rz, 0)
    # a brown patch around the right eye, a white blaze down the forehead, two front teeth under the nose
    ball('patch', (0.16, -0.23, 1.26), (0.16, 0.08, 0.15), patch)
    ball('blaze', (0, -0.29, 1.31), (0.05, 0.04, 0.1), blaze)
    for x in (-0.018, 0.018):
        rbox('tooth', (x, -0.37, 1.05), (0.03, 0.012, 0.045), tooth, bevel=0.3)
    attach_new(p['head'], s | {p['head']})
    s = set(bpy.data.objects)
    ring('scarf', (0, 0, 0.86), 0.31, 0.065, scarf, rot=(0, 0, 0))
    capsule('scarf_tail', (-0.15, -0.27, 0.84), (-0.23, -0.33, 0.62), 0.055, scarf)
    attach_new(p['root'], s | {p['root']})
    # a sprout leaf in the right hand, the garden's sign
    s = set(bpy.data.objects)
    capsule('stem', (0.42, -0.14, 0.46), (0.46, -0.2, 0.72), 0.014, leaf)
    lf = ball('leaf', (0.5, -0.22, 0.78), (0.1, 0.03, 0.06), leaf)
    lf.rotation_euler = (0, -0.6, 0.2)
    attach_new(p['arms']['r'], s | {p['arms']['r']})
    s = set(bpy.data.objects)
    bori_faces()
    attach_new(p['head'], s | {p['head']})


def naru():
    """나루, the otter of the pond (feedback 11-17 "연못에 수달 추가, 낚시"): sleek dark-brown fur, a pale face and
    chest, tiny low ears, a big dark nose with whiskers, a long thick tail, a straw hat and a little rod."""
    c = dict(fur='#7a4e32', belly='#efdcc0')
    p = base(c)
    hat, band, rod, line, whisk = (material('hat', '#e4c27a'), material('band', '#3f7fae'), material('rod', '#8a5a34'),
                                   material('line', '#f4f1e8'), material('whisker', '#fbf6ec'))
    for o in bpy.data.objects:
        if o.name.startswith('torso'): o.scale = (0.34, 0.31, 0.46)
        if o.name.startswith('skull'): o.scale = (0.36, 0.32, 0.31)
        if o.name.startswith('muzzle'): o.scale = (0.17, 0.1, 0.1)
        if o.name.startswith('nose'): o.scale = (0.055, 0.04, 0.038)
    s = set(bpy.data.objects)
    # a pale face mask round the muzzle and the eyes' lower half
    ball('face', (0, -0.22, 1.13), (0.27, 0.13, 0.16), p['mats']['belly'])
    for x in (-0.27, 0.27):
        ball('ear', (x, 0.02, 1.36), (0.07, 0.04, 0.06), p['mats']['fur'])
    for side in (-1, 1):
        for k, dz in enumerate((0.0, -0.03, -0.06)):
            capsule(f'whisker_{side}_{k}', (side * 0.1, -0.37, 1.12 + dz), (side * 0.32, -0.33, 1.14 + dz * 1.6), 0.006, whisk)
    # a straw hat with a blue band
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.36, depth=0.03, location=(0, 0.02, 1.48))
    brim = bpy.context.active_object; brim.name = 'hat_brim'; brim.data.materials.append(hat); smooth(brim, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.2, depth=0.16, location=(0, 0.02, 1.57))
    crown = bpy.context.active_object; crown.name = 'hat_crown'; crown.data.materials.append(hat); smooth(crown, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.205, depth=0.04, location=(0, 0.02, 1.51))
    b = bpy.context.active_object; b.name = 'hat_band'; b.data.materials.append(band); smooth(b, 0)
    attach_new(p['head'], s | {p['head']})
    # the long tail behind, resting on the ground
    s = set(bpy.data.objects)
    capsule('tail', (0, 0.28, 0.32), (0, 0.72, 0.1), 0.11, p['mats']['fur'])
    capsule('tail_tip', (0, 0.72, 0.1), (0, 0.95, 0.06), 0.07, p['mats']['fur'])
    attach_new(p['root'], s | {p['root']})
    # a little rod in the right hand, its line hanging
    s = set(bpy.data.objects)
    capsule('rod', (0.42, -0.2, 0.42), (0.62, -0.7, 1.15), 0.018, rod)
    capsule('rod_line', (0.62, -0.7, 1.15), (0.66, -0.8, 0.55), 0.004, line)
    ball('rod_float', (0.66, -0.8, 0.52), (0.04, 0.04, 0.05), material('float', '#e2566b'))
    attach_new(p['arms']['r'], s | {p['arms']['r']})


# 보리's faces (feedback 11-17, B): one set of pieces per emotion the talk server sends (persona_bori.json
# allowed_emotions). Every piece is named x_<emotion>_<part>; the scene shows only the current emotion's pieces
# (app/proto3d/Analyst3D.tsx), and an emotion with its own eyes (x_<emotion>_eye...) hides the round eyes meanwhile.
EMOTIONS = ('neutral', 'curious', 'concerned', 'happy', 'thinking', 'playful', 'tired')


def arc(name, cx, cz, y, r, a0, a1, thick, mat, n=5):
    """A curved stroke on the face (an eye shut in a smile, a mouth): capsules along a circle in the x-z plane."""
    pts = [(cx + r * math.cos(a0 + (a1 - a0) * i / n), y, cz + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    for i in range(n):
        capsule(f'{name}{i}', pts[i], pts[i + 1], thick, mat)


def bori_faces():
    brow, mouth, tongue, blush, dark = (material('brow', '#5a3a22'), material('mouth', '#3a2420'), material('tongue', '#e98c8c'),
                                        material('blush', '#f4a3a3'), material('eye', '#1d1f24'))
    EY, EZ, BY, BZ, MY, MZ = -0.345, 1.24, -0.326, 1.32, -0.377, 1.085
    def brows(e, lz, rz, tilt):  # tilt > 0: inner ends up (worried); < 0: inner ends down (cross)
        capsule(f'x_{e}_brow_l', (-0.2, BY, BZ + lz - tilt), (-0.08, BY - 0.01, BZ + lz + tilt), 0.013, brow)
        capsule(f'x_{e}_brow_r', (0.08, BY - 0.01, BZ + rz + tilt), (0.2, BY, BZ + rz - tilt), 0.013, brow)
    def lip(e):  # the guinea pig's split lip over the teeth: a small ㅅ
        capsule(f'x_{e}_mouth_l', (0, MY, MZ + 0.012), (-0.035, MY + 0.004, MZ - 0.012), 0.008, mouth)
        capsule(f'x_{e}_mouth_r', (0, MY, MZ + 0.012), (0.035, MY + 0.004, MZ - 0.012), 0.008, mouth)
    def cheeks(e):
        for side, x in (('l', -0.22), ('r', 0.22)):
            ball(f'x_{e}_blush_{side}', (x, -0.3, 1.14), (0.055, 0.02, 0.032), blush)
    def shut(e, side, x, up=True):  # an eye closed in a smile (∩) or tired (a flat line)
        if up:
            arc(f'x_{e}_eye_{side}', x, EZ - 0.025, EY, 0.042, math.radians(20), math.radians(160), 0.011, dark)
        else:
            capsule(f'x_{e}_eye_{side}', (x - 0.045, EY, EZ - 0.012), (x + 0.045, EY, EZ - 0.018), 0.011, dark)
    # neutral: the round eyes, calm brows, the small lip
    brows('neutral', 0, 0, 0); lip('neutral')
    # curious: brows up, eyes a bit bigger, a small round mouth
    brows('curious', 0.035, 0.05, 0)
    for side, x in (('l', -0.13), ('r', 0.13)):
        ball(f'x_curious_eye_{side}', (x, -0.312, EZ + 0.005), (0.055, 0.032, 0.066), dark, (16, 8))
        ball(f'x_curious_eye_{side}_hi', (x + 0.018, -0.345, EZ + 0.03), (0.014, 0.008, 0.014), material('shine', '#ffffff'), (12, 6))
    ball('x_curious_mouth', (0, MY + 0.003, MZ - 0.025), (0.022, 0.012, 0.026), mouth, (16, 8))
    # concerned: brows up in the middle, a small frown
    brows('concerned', 0.0, 0.0, 0.03)
    arc('x_concerned_mouth', 0, MZ - 0.055, MY, 0.04, math.radians(45), math.radians(135), 0.008, mouth)
    # happy: eyes shut in a smile, open mouth with the teeth on top, pink cheeks
    for side, x in (('l', -0.13), ('r', 0.13)):
        shut('happy', side, x)
    brows('happy', 0.02, 0.02, 0)
    ball('x_happy_mouth', (0, MY + 0.012, MZ - 0.03), (0.05, 0.02, 0.04), mouth, (24, 12))
    ball('x_happy_mouth_tongue', (0, MY + 0.002, MZ - 0.05), (0.03, 0.014, 0.018), tongue, (16, 8))
    cheeks('happy')
    # thinking: eyes up and to the side, one brow up, the mouth pulled to one side
    for side, x in (('l', -0.13), ('r', 0.13)):
        ball(f'x_thinking_eye_{side}', (x + 0.02, -0.33, EZ + 0.022), (0.036, 0.024, 0.044), dark, (16, 8))
    brows('thinking', 0.0, 0.05, 0)
    capsule('x_thinking_mouth', (-0.005, MY, MZ - 0.025), (0.045, MY + 0.004, MZ - 0.012), 0.008, mouth)
    # playful: a wink, the tongue out, cheeks
    shut('playful', 'l', -0.13)
    brows('playful', 0.0, 0.035, 0)
    lip('playful')
    ball('x_playful_tongue', (0.012, MY - 0.004, MZ - 0.05), (0.026, 0.014, 0.032), tongue, (16, 8))
    cheeks('playful')
    # tired: eyes half shut (a lid line), brows down at the ends, a small flat mouth
    for side, x in (('l', -0.13), ('r', 0.13)):
        shut('tired', side, x, up=False)
    brows('tired', -0.012, -0.012, 0.02)
    capsule('x_tired_mouth', (-0.025, MY, MZ - 0.03), (0.025, MY, MZ - 0.03), 0.008, mouth)


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=False, export_animations=False)
    print('wrote', path)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, build in (('tori', tori), ('moa', moa), ('luon', luon), ('bori', bori), ('naru', naru)):
        reset()
        build()
        export(os.path.join(OUT, name + '.glb'))


main()
