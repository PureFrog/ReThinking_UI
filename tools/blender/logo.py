# The rethinking logo as a game title: chunky extruded letters (Luckiest Guy, Apache 2.0, tools/blender/fonts/), a
# round bevel, a glossy top-to-bottom gradient on the faces, darker sides, a dark outline (inverted hull), letters that
# bounce off the baseline, a sprout on the first i, and the ? / ! mark in seal red. Re-run to change it.
#
#   blender -b --factory-startup --python tools/blender/logo.py -- <out dir>
#
# Writes, all 1800x640 with a transparent background, from one camera so the layers stack exactly:
#   logo.png          rethinking!      (the end state)
#   logo-q.png        rethinking?
#   layer-<k>.png     one layer each: the letters r0 e1 t2 h3 i4 n5 k6 i7 n8 g9, q (?), bang (!), sprout
#   layers.json       each layer's box in pixels (for the animation: rt? → rethinking → !)
import bpy, bmesh, json, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGV[0] if ARGV else 'docs/mockups/landing/logo3d')
FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'LuckiestGuy-Regular.ttf')
W, H = 1800, 640

# colours (sRGB hex): face top → face bottom, side
GREEN = ('#d6f57a', '#3faa3c', '#1f6a2a')
GOLD = ('#fff07a', '#ff9419', '#b4520c')
RED = ('#ff8a6a', '#d0301f', '#7c1a12')
LEAF = ('#b9ee6a', '#3f9e33', '#24622a')
OUTLINE = '#2a1509'


def lin(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)) + (1,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    s.render.resolution_x, s.render.resolution_y = W, H
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'Medium High Contrast'
    try:
        s.eevee.taa_render_samples = 64
    except Exception:
        pass
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.55, 0.6, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6


def face_material(name, top, bottom):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links
    p = n['Principled BSDF']
    p.inputs['Roughness'].default_value = 0.28
    for k in ('Coat Weight', 'Clearcoat'):
        if k in p.inputs: p.inputs[k].default_value = 0.7
    for k in ('Coat Roughness', 'Clearcoat Roughness'):
        if k in p.inputs: p.inputs[k].default_value = 0.06
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.08; ramp.color_ramp.elements[0].color = lin(bottom)
    ramp.color_ramp.elements[1].position = 0.92; ramp.color_ramp.elements[1].color = lin(top)
    l.new(tc.outputs['Generated'], sep.inputs[0]); l.new(sep.outputs['Y'], ramp.inputs[0]); l.new(ramp.outputs['Color'], p.inputs['Base Color'])
    return m


def flat_material(name, col, rough=0.4):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = lin(col); p.inputs['Roughness'].default_value = rough
    return m


def outline_material():
    m = bpy.data.materials.new('outline'); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes
    for x in list(n): n.remove(x)
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = lin(OUTLINE); e.inputs['Strength'].default_value = 1
    o = n.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
    m.use_backface_culling = True
    return m


def to_mesh(obj, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    ob = bpy.data.objects.new(name, me); ob.matrix_world = obj.matrix_world.copy()
    bpy.context.collection.objects.link(ob); bpy.data.objects.remove(obj)
    return ob


def dress(ob, cols, shell=True):
    """faces towards the camera get the gradient, the rest the side colour; then an outline shell"""
    face, side = face_material(ob.name + '-face', cols[0], cols[1]), flat_material(ob.name + '-side', cols[2], 0.45)
    ob.data.materials.append(face); ob.data.materials.append(side); ob.data.materials.append(OUT_MAT)
    for poly in ob.data.polygons:
        poly.material_index = 0 if poly.normal.z > 0.55 else 1
    for poly in ob.data.polygons: poly.use_smooth = True
    if shell:
        sol = ob.modifiers.new('outline', 'SOLIDIFY')
        sol.thickness = -0.045; sol.offset = 1; sol.use_flip_normals = True; sol.use_rim = False; sol.material_offset = 2
    return ob


def outlined(ch, name, size, cols):
    """a letter with its outline as the same glyph grown outwards (the curve offset) laid just behind it: it follows
    the counters exactly, where an inverted-hull shell tore the small hole of the R"""
    ob = to_mesh(letter(ch, name, size), name)
    dress(ob, cols, shell=False)
    back = letter(ch, name + '-o', size); back.data.offset = 0.045; back.data.extrude = 0.2 * size + 0.02; back.data.bevel_depth = 0
    bpy.context.view_layer.update(); back = to_mesh(back, name + '-o')
    for v in back.data.vertices: v.co.z -= 0.035
    back.data.materials.append(OUT_FLAT)
    bpy.ops.object.select_all(action='DESELECT'); back.select_set(True); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join(); ob = bpy.context.object; ob.name = name
    return ob


def letter(ch, name, size=1.0):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = ch; cu.font = FONTD; cu.size = size
    cu.extrude = 0.2 * size; cu.bevel_depth = 0.016 * size; cu.bevel_resolution = 3; cu.align_x = 'LEFT'
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    return ob


# The mark as a thick rod that bends: the ? is a straight stem, then a hook that first kinks right, then turns left
# over the top and down; ! is the same rod with no bend. Frames scale the bend by (1 - t), so the length stays and the
# hook visibly unbends (t past 1 bends it slightly the other way, a little spring). A glyph from the font cannot morph.
MARK_LEN = 1.0       # rod length (set from the cap height below)
MR = 0.135           # rod radius (as stout as the letters' strokes)


def mark(name, t, length=None):
    L = length or MARK_LEN; stem = 0.22 * L; arc = L - stem; n = 48
    pts, x, y, head = [], 0.0, 0.0, math.pi / 2
    for i in range(n + 1):
        s = L * i / n
        pts.append(Vector((x, y, 0)))
        ds = L / n
        if s >= stem:
            u = (s - stem) / arc
            turn = (-math.radians(30) / 0.12) if u < 0.12 else (math.radians(196) / 0.88)
            head += turn * (ds / arc) * (1 - t)
        x += math.cos(head) * ds; y += math.sin(head) * ds
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = MR; cu.bevel_resolution = 6; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts): p.co = (co.x, co.y, 0, 1)
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.update(); ob = to_mesh(ob, name)
    for v in ob.data.vertices: v.co.y += MR * 2.2 + 0.11      # the rod starts above the dot
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=MR * 1.15, location=(0, MR * 1.15, 0))
    dot = bpy.context.object
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); dot.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join(); ob = bpy.context.object; ob.name = name
    ob.scale = (1, 1, 0.8); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in ob.data.polygons: poly.use_smooth = True
    ob.data.materials.clear()
    return ob


def sprout(at):
    """two leaves on a short stem"""
    objs = []
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.05, depth=0.26, location=(at.x, at.y + 0.08, at.z), rotation=(math.radians(90), 0, 0))
    stem = bpy.context.object; stem.name = 'stem'
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); objs.append(stem)
    # (rotated 90° about X above, so the stem already stands along +Y, the screen's up)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(at.x + side * 0.17, at.y + 0.24, at.z + 0.05))
        lf = bpy.context.object; lf.scale = (1.0, 0.5, 0.35); lf.rotation_euler = (0, 0, math.radians(32 * side)); objs.append(lf)
    for o in objs: bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.join(); sp = bpy.context.object; sp.name = 'sprout'
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    sp.data.materials.clear()
    return dress(sp, LEAF)


reset()
FONTD = bpy.data.fonts.load(FONT)
OUT_MAT = outline_material()
OUT_FLAT = outline_material(); OUT_FLAT.name = 'outline-flat'; OUT_FLAT.use_backface_culling = False

# lay the word out: each letter its own object, a little overlap, each with its own bounce, tilt and size
WORD = 'RETHINKING'  # the font's lowercase are small caps; all caps keeps one height
BOUNCE = [0.06, -0.02, 0.08, 0.0, 0.05, -0.03, 0.04, 0.0, -0.02, 0.05]
TILT = [-6, 4, -3, 3, -4, 2, -5, 3, -2, 5]
SIZE = [1.12, 0.98, 1.06, 1.02, 0.96, 1.0, 1.04, 0.96, 1.0, 1.06]
layers, x = {}, 0.0
for i, ch in enumerate(WORD):
    ob = outlined(ch, f'L{i}', SIZE[i], GREEN if i < 2 else GOLD)
    xs = [v.co.x for v in ob.data.vertices]; w = max(xs) - min(xs)
    for v in ob.data.vertices: v.co.x -= min(xs)
    ob.location = (x, BOUNCE[i], 0); ob.rotation_euler = (0, 0, math.radians(TILT[i]))
    layers[f'{i}'] = ob
    x += w * 0.93
# the mark after the word, a bit bigger, leaning
# the ? → ! morph: t per frame, with a little overshoot past straight and back (layers m0..m7); q and bang are its ends
MORPH = [0, 0.18, 0.4, 0.62, 0.82, 1.0, 1.1, 0.97]
bpy.context.view_layer.update()
CAP = max(v.co.y for v in layers['2'].data.vertices)
MARK_LEN = CAP * 1.18   # the rod's length; bent into a ? it stands about cap high, straight as ! a bit taller
for kind, t in [('q', 0), ('bang', 1)] + [(f'm{i}', t) for i, t in enumerate(MORPH)]:
    ob = mark(kind, t)
    ob.location = (x + 0.2, 0.0, 0); ob.rotation_euler = (0, 0, math.radians(-7))
    dress(ob, RED); layers[kind] = ob
# a sprout on the first i (index 4), sitting on its dot
bpy.context.view_layer.update()
i4 = layers['4']; top = max((i4.matrix_world @ v.co) for v in i4.data.vertices[:]) if False else None
ys = [(i4.matrix_world @ v.co) for v in i4.data.vertices]
peak = max(ys, key=lambda p: p.y)
layers['sprout'] = sprout(Vector((sum(p.x for p in ys) / len(ys), peak.y - 0.03, 0.12)))

# centre everything
allobs = list(layers.values())
bpy.context.view_layer.update()
pts = [o.matrix_world @ v.co for o in allobs for v in o.data.vertices]
cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2; cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
for o in allobs: o.location.x -= cx; o.location.y -= cy

# camera a little below, looking up, so the thick sides show under the letters; lights for a glossy top
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
cam.data.lens = 85; cam.location = (0, -2.4, 30); bpy.context.scene.camera = cam
d = Vector((0, 0, 0)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
span = max(p.x for p in pts) - min(p.x for p in pts)
cam.data.sensor_width = 36; cam.data.lens = 36 * 30 / (span * 1.12)
def light(name, kind, loc, energy, size=4, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, kind); l.energy = energy; l.color = color
    if kind == 'AREA': l.size = size
    o = bpy.data.objects.new(name, l); o.location = loc; bpy.context.collection.objects.link(o)
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
light('key', 'AREA', (-6, 8, 14), 3200, 8)
light('fill', 'AREA', (8, -6, 12), 900, 10, (1, .95, .9))
light('rim', 'AREA', (0, 10, -4), 1500, 10)

os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene


def render(path, show):
    for k, o in layers.items(): o.hide_render = k not in show
    scene.render.filepath = path; bpy.ops.render.render(write_still=True)


def box(o):
    corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    vs = [world_to_camera_view(scene, cam, c) for c in corners]
    pad = 10
    return [round(min(v.x for v in vs) * W) - pad, round((1 - max(v.y for v in vs)) * H) - pad, round(max(v.x for v in vs) * W) + pad, round((1 - min(v.y for v in vs)) * H) + pad]


letters = [str(i) for i in range(len(WORD))]
render(os.path.join(OUT, 'logo.png'), letters + ['bang', 'sprout'])
render(os.path.join(OUT, 'logo-q.png'), letters + ['q', 'sprout'])
for k in layers:
    render(os.path.join(OUT, f'layer-{k}.png'), [k])
json.dump({'size': [W, H], 'morph': [f'm{i}' for i in range(len(MORPH))], 'layers': {k: box(o) for k, o in layers.items()}},
          open(os.path.join(OUT, 'layers.json'), 'w'), indent=1)

# ── the app icon: RT! with the sprout on the T, on a full-bleed paper ground (store icon), and the same letters alone,
# smaller, for Android's adaptive icon foreground (it must sit inside the middle 66%)
for o in layers.values(): o.hide_render = True
icon = {}
ix = 0.0
for i, (ch, cols, tilt, bounce) in enumerate([('R', GREEN, -6, 0.04), ('T', GOLD, 4, -0.02)]):
    ob = outlined(ch, f'I{i}', 1.0, cols)
    xs = [v.co.x for v in ob.data.vertices]; wv = max(xs) - min(xs)
    for v in ob.data.vertices: v.co.x -= min(xs)
    ob.location = (ix, bounce, 0); ob.rotation_euler = (0, 0, math.radians(tilt)); icon[f'I{i}'] = ob
    ix += wv * 0.9
ob = mark('Ibang', 1.0); ob.location = (ix + 0.2, 0, 0); ob.rotation_euler = (0, 0, math.radians(-8)); dress(ob, RED); icon['Ibang'] = ob
bpy.context.view_layer.update()
tv = [(icon['I1'].matrix_world @ v.co) for v in icon['I1'].data.vertices]; tp = max(tv, key=lambda p: p.y)
icon['Isprout'] = sprout(Vector((sum(p.x for p in tv) / len(tv), tp.y - 0.03, 0.12)))
bpy.context.view_layer.update()
ip = [o.matrix_world @ v.co for o in icon.values() for v in o.data.vertices]
icx = (min(p.x for p in ip) + max(p.x for p in ip)) / 2; icy = (min(p.y for p in ip) + max(p.y for p in ip)) / 2
for o in icon.values(): o.location.x -= icx; o.location.y -= icy
ispan = max(max(p.x for p in ip) - min(p.x for p in ip), max(p.y for p in ip) - min(p.y for p in ip))
# the paper ground: an unlit plane behind, warm at the top, a touch deeper below
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -1.5)); ground = bpy.context.object
gm = bpy.data.materials.new('ground'); gm.use_nodes = True; gn = gm.node_tree.nodes
for nd in list(gn): gn.remove(nd)
tc = gn.new('ShaderNodeTexCoord'); sepg = gn.new('ShaderNodeSeparateXYZ'); rg = gn.new('ShaderNodeValToRGB'); em = gn.new('ShaderNodeEmission'); outn = gn.new('ShaderNodeOutputMaterial')
rg.color_ramp.elements[0].position = 0.47; rg.color_ramp.elements[0].color = lin('#ead9b4'); rg.color_ramp.elements[1].position = 0.53; rg.color_ramp.elements[1].color = lin('#fbf3e2')
gl = gm.node_tree.links; gl.new(tc.outputs['Generated'], sepg.inputs[0]); gl.new(sepg.outputs['Y'], rg.inputs[0]); gl.new(rg.outputs['Color'], em.inputs['Color']); gl.new(em.outputs[0], outn.inputs[0])
ground.data.materials.append(gm)
scene.render.resolution_x = scene.render.resolution_y = 1024
cam.data.lens = 36 * 30 / (ispan * 1.45)
scene.render.film_transparent = False
scene.render.filepath = os.path.join(OUT, 'icon-1024.png'); bpy.ops.render.render(write_still=True)
ground.hide_render = True; scene.render.film_transparent = True
cam.data.lens = 36 * 30 / (ispan * 1.45 / 0.62)
scene.render.filepath = os.path.join(OUT, 'icon-foreground.png'); bpy.ops.render.render(write_still=True)
print('logo: wrote', OUT)
