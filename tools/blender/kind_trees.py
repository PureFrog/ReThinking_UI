# Fruit and flower trees for the 2026-11-16 feedback ("과일 / 꽃 나무로", 꽃·나무 가게). Mockup stage: builds a few
# kinds on top of the holding-tree builder (holding_tree.py) and renders them on a patch of grass, so the team can
# pick a direction before anything goes into public/models.
#
#   blender -b --factory-startup --python tools/blender/kind_trees.py -- <out_dir>
#
# Writes <out_dir>/kinds.png (the line-up), <out_dir>/apple_states.png (one apple tree in good, dull and wilting
# condition: fruit is the signal) and one .glb per kind.
import bpy, math, os, random, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'out'
HERE = os.path.dirname(os.path.abspath(__file__))
# reuse the holding-tree builder (skin trunk, lumpy clumps) without running its export
src = open(os.path.join(HERE, 'holding_tree.py'), encoding='utf-8').read().rsplit('\nmain()', 1)[0]
ns = {'__name__': 'holding_tree', '__file__': os.path.join(HERE, 'holding_tree.py')}
sys.argv = [a for a in sys.argv]  # holding_tree reads OUT from argv; harmless here
exec(src, ns)
skin_mesh, clump, material, shade_smooth = ns['skin_mesh'], ns['clump'], ns['material'], ns['shade_smooth']


def hexrgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


def mat(name, hx, rough=0.85, emit=0.0):
    m = material(f'{name}_{hx}', hexrgb(hx))  # one material per colour: kinds in one scene must not share
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = (*hexrgb(hx), 1)
        p.inputs['Emission Strength'].default_value = emit
    return m


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    shade_smooth(o)
    return o


def trunk_and_ends(h, r, branches, blen, rnd, spread=1.0):
    verts, edges, radii = [], [], []

    def add(p, rad, parent):
        verts.append(Vector(p)); radii.append(rad)
        if parent is not None:
            edges.append((parent, len(verts) - 1))
        return len(verts) - 1
    seg = 6
    ids = [add((0, 0, 0), r * 1.3, None)]
    lean = Vector((rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1), 0))
    for i in range(1, seg + 1):
        t = i / seg
        ids.append(add(Vector((0, 0, h * t)) + lean * math.sin(t * math.pi) * h * 0.5, r * (1 - 0.55 * t), ids[-1]))
    for k in range(4):
        a = k / 4 * math.tau + rnd.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), math.sin(a), 0))
        m = add(d * r * 1.3 + Vector((0, 0, r * 0.35)), r * 0.45, ids[0])
        add(d * r * 2.5 + Vector((0, 0, -r * 0.1)), r * 0.12, m)
    ends = [verts[ids[-1]]]
    for b in range(branches):
        start = ids[int(seg * rnd.uniform(0.5, 0.8))]
        a = b / branches * math.tau + rnd.uniform(-0.4, 0.4)
        d = Vector((math.cos(a) * spread, math.sin(a) * spread, rnd.uniform(0.6, 1.0))).normalized()
        L = blen * rnd.uniform(0.85, 1.15)
        prev, base = start, verts[start]
        for s in range(1, 4):
            t = s / 3
            prev = add(base + d * L * t + Vector((0, 0, L * 0.2 * t * t)), radii[start] * (0.6 - 0.3 * t), prev)
        ends.append(verts[prev])
    return skin_mesh('trunk', verts, edges, radii), ends


def canopy(ends, c, rnd, mt, extra=3, squash=0.82):
    cl = [dict(at=ends[0] + Vector((0, 0, c * 0.5)), r=c * 1.1)]
    for e in ends[1:]:
        cl.append(dict(at=e + Vector((0, 0, c * 0.2)), r=c * rnd.uniform(0.85, 1.05)))
    for _ in range(extra):
        a, b = rnd.sample(cl[:len(ends)], 2)
        cl.append(dict(at=(Vector(a['at']) + Vector(b['at'])) / 2 + Vector((0, 0, c * 0.3)), r=c * rnd.uniform(0.7, 0.9)))
    for i, x in enumerate(cl):
        o = clump(f'leaf_{i}', x['at'], x['r'], rnd, squash)
        o.data.materials.append(mt)
    return cl


def on_canopy(cl, n, rnd, low=-0.5, high=0.9):
    """Points on the outside of the canopy (fruit hangs on the sides and under, flowers sit on top)."""
    out = []
    for _ in range(n):
        c = rnd.choice(cl)
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(low, high))).normalized()
        out.append(Vector(c['at']) + d * c['r'] * 1.0)
    return out


def fruits(points, size, mt, stem_mt, name='fruit'):
    made = []
    for p in points:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=9, radius=size, location=tuple(p))
        o = bpy.context.active_object
        o.scale = (1, 1, 0.92)
        made.append(o)
    f = join(made, name)
    f.data.materials.append(mt)
    leaves = []
    for p in points[::2]:  # a little leaf on every other fruit
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=size * 0.5, location=tuple(p + Vector((size * 0.35, 0, size * 0.95))))
        o = bpy.context.active_object
        o.scale = (1, 0.45, 0.18)
        leaves.append(o)
    if leaves:
        l = join(leaves, name + '_leaf')
        l.data.materials.append(stem_mt)
    return f


def flowers(points, size, petal_mt, heart_mt, petals=5, name='blossom'):
    ps, hs = [], []
    for p in points:
        for k in range(petals):
            a = k / petals * math.tau
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=size, location=tuple(p + Vector((math.cos(a) * size * 0.9, math.sin(a) * size * 0.9, 0))))
            o = bpy.context.active_object
            o.scale = (1, 1, 0.35)
            ps.append(o)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=size * 0.45, location=tuple(p + Vector((0, 0, size * 0.2))))
        hs.append(bpy.context.active_object)
    a = join(ps, name)
    a.data.materials.append(petal_mt)
    b = join(hs, name + '_heart')
    b.data.materials.append(heart_mt)
    return a


def ground_fruit(n, size, mt, rnd, rad=1.2):
    pts = []
    for _ in range(n):
        a, d = rnd.uniform(0, math.tau), rnd.uniform(0.5, rad)
        pts.append(Vector((math.cos(a) * d, math.sin(a) * d, size * 0.8)))
    made = []
    for p in pts:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=size, location=tuple(p))
        made.append(bpy.context.active_object)
    j = join(made, 'fallen')
    j.data.materials.append(mt)


BARK = '#6c5b53'


# ---- kinds ----

def apple(rnd, state='well'):
    leaf = {'well': '#4d9d45', 'dull': '#a9b14c', 'wilt': '#bc9c58'}[state]
    t, ends = trunk_and_ends(2.3, 0.2, 4, 1.15, rnd, 1.2)
    t.data.materials.append(mat('trunk', BARK))
    cl = canopy(ends, 0.92, rnd, mat('leaf', leaf), extra=3)
    n = {'well': 22, 'dull': 7, 'wilt': 2}[state]
    fruits(on_canopy(cl, n, rnd, -0.4, 0.7), 0.16, mat('fruit', '#d63b2c', 0.45), mat('fleaf', '#3f8a3a'))
    if state == 'wilt':
        ground_fruit(5, 0.12, mat('fallen_m', '#9a4a2c', 0.7), rnd)


def mandarin(rnd):
    t, ends = trunk_and_ends(1.7, 0.16, 5, 0.9, rnd, 1.4)
    t.data.materials.append(mat('trunk', BARK))
    cl = canopy(ends, 0.86, rnd, mat('leaf', '#2f7d3b'), extra=4, squash=0.9)
    fruits(on_canopy(cl, 26, rnd, -0.3, 0.8), 0.13, mat('fruit', '#f39a1e', 0.4), mat('fleaf', '#2f6e33'))


def cherry(rnd):
    t, ends = trunk_and_ends(2.2, 0.19, 5, 1.4, rnd, 1.6)
    t.data.materials.append(mat('trunk', '#5a4a48'))
    cl = canopy(ends, 0.85, rnd, mat('leaf', '#f39bb8', 0.9), extra=4, squash=0.72)
    flowers(on_canopy(cl, 40, rnd, -0.1, 1.0), 0.05, mat('petal', '#fde3ea', 0.8), mat('heart', '#e0587a'))
    ground_fruit(14, 0.035, mat('fallen_m', '#f7c4d2', 0.9), rnd, 1.8)


def magnolia(rnd):
    t, ends = trunk_and_ends(2.0, 0.15, 4, 0.9, rnd, 0.9)
    t.data.materials.append(mat('trunk', '#7a6b62'))
    cl = canopy(ends, 0.62, rnd, mat('leaf', '#7fb35a'), extra=2, squash=0.95)
    flowers(on_canopy(cl, 16, rnd, 0.1, 1.0), 0.11, mat('petal', '#fbf6ee', 0.7), mat('heart', '#e9c9b6'), petals=6)


def lemon(rnd):
    t, ends = trunk_and_ends(1.6, 0.14, 4, 0.8, rnd, 1.3)
    t.data.materials.append(mat('trunk', BARK))
    cl = canopy(ends, 0.78, rnd, mat('leaf', '#3d8a3f'), extra=3)
    fruits(on_canopy(cl, 18, rnd, -0.3, 0.8), 0.12, mat('fruit', '#f6d532', 0.4), mat('fleaf', '#2f6e33'))


def hydrangea(rnd):
    """a flowering bush: a low mound of leaves with big round flower heads"""
    cl = []
    for i in range(5):
        a = i / 5 * math.tau + rnd.uniform(-0.3, 0.3)
        at = Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, 0.45))
        cl.append(dict(at=at, r=0.5))
        o = clump(f'leaf_{i}', at, 0.5, rnd, 0.8)
        o.data.materials.append(mat('leaf', '#4f9a4a'))
    heads = []
    for k, c in enumerate(cl):
        p = Vector(c['at']) + Vector((0, 0, 0.35))
        o = clump(f'head_{k}', p, 0.32, rnd, 0.9)
        heads.append(o)
    h = join(heads, 'blossom')
    h.data.materials.append(mat('petal', '#8f8fe0', 0.75))


def sunflowers(rnd):
    for i in range(3):
        a = i / 3 * math.tau
        base = Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 0))
        h = 1.6 + i * 0.25
        st = skin_mesh(f'trunk_{i}', [base, base + Vector((0, 0, h * 0.5)), base + Vector((0.05, 0, h))], [(0, 1), (1, 2)], [0.05, 0.045, 0.04])
        st.data.materials.append(mat('stem', '#4a8a36'))
        top = base + Vector((0.05, 0, h))
        flowers([top + Vector((0.06, -0.04, 0))], 0.14, mat('petal', '#ffcc1f', 0.6), mat('heart', '#5a3a1e'), petals=12, name=f'blossom_{i}')
        for j in range(2):
            o = ns['leaf_blade'](f'leaf_{i}_{j}', base + Vector((0, 0, h * (0.35 + j * 0.25))), a + j * 2.5, 0.3, 0.32)
            o.data.materials.append(mat('leaf', '#4f9a3c'))


def tulips(rnd):
    cols = ['#e8473a', '#ffcf3a', '#f29ac0', '#ffffff', '#e8473a', '#f29ac0', '#ffcf3a']
    for i in range(14):
        x, y = (i % 5 - 2) * 0.32 + rnd.uniform(-0.06, 0.06), (i // 5 - 1) * 0.36 + rnd.uniform(-0.06, 0.06)
        base = Vector((x, y, 0))
        h = rnd.uniform(0.38, 0.5)
        st = skin_mesh(f'trunk_{i}', [base, base + Vector((0, 0, h))], [(0, 1)], [0.025, 0.02])
        st.data.materials.append(mat('stem', '#4a8a36'))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.08, location=tuple(base + Vector((0, 0, h + 0.06))))
        o = bpy.context.active_object
        o.scale = (1, 1, 1.35)
        o.name = f'blossom_{i}'
        o.data.materials.append(mat(f'tulip{i % 7}', cols[i % 7], 0.6))
        shade_smooth(o)


KINDS = [('apple', '사과', apple), ('mandarin', '귤', mandarin), ('lemon', '레몬', lemon), ('cherry', '벚꽃', cherry),
         ('magnolia', '목련', magnolia), ('hydrangea', '수국', hydrangea), ('sunflowers', '해바라기', sunflowers), ('tulips', '튤립', tulips)]


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_texcoords=False, export_animations=False)


def stage(objs_by_slot, path, cam_loc, cam_rot, lens, res, grass=True, look=None):
    """Grass, sun, sky and an EEVEE render of what is in the scene (grass=False: a see-through shop picture)."""
    scene = bpy.context.scene
    if grass:
        bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
        bpy.context.active_object.data.materials.append(mat('grass', '#7db650', 0.95))
    for x, y in objs_by_slot:  # a soil disc under every tree, like the garden's plots
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.05, depth=0.04, location=(x, y, 0.0))
        bpy.context.active_object.data.materials.append(mat('soil', '#9a7a52', 0.95))
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)
    world = bpy.data.worlds.new('w')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*hexrgb('#cfe9ff'), 1)
    bg.inputs['Strength'].default_value = 0.9
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    cam.location = cam_loc
    cam.rotation_euler = (Vector(look) - Vector(cam_loc)).to_track_quat('-Z', 'Y').to_euler() if look else cam_rot
    cam.data.lens = lens
    scene.camera = cam
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.film_transparent = not grass
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


def place_last(before, x, y):
    for o in set(bpy.data.objects) - before:
        o.location.x += x
        o.location.y += y


def main():
    os.makedirs(OUT, exist_ok=True)
    # one file per kind
    for key, _, fn in KINDS:
        ns['reset']()
        fn(random.Random(key))
        export(os.path.join(OUT, f'{key}.glb'))
        loc, look = {'hydrangea': ((0, -4.2, 2.3), (0, 0, 0.45)), 'tulips': ((0, -3.9, 2.3), (0, 0, 0.2)),
                     'sunflowers': ((0, -5.4, 2.4), (0, 0, 0.95)), 'cherry': ((0, -9.4, 3.6), (0, 0, 1.5))
                     }.get(key, ((0, -8.2, 3.3), (0, 0, 1.45)))
        stage([(0, 0)], os.path.join(OUT, f'{key}.png'), loc, None, 52, (360, 360), grass=False, look=look)
    # the line-up: two rows of four
    ns['reset']()
    slots = []
    for i, (key, _, fn) in enumerate(KINDS):
        x, y = (i % 4) * 4.3 - 6.45, (0 if i >= 4 else 5.2)  # small ones in front
        before = set(bpy.data.objects)
        fn(random.Random(key))
        place_last(before, x, y)
        slots.append((x, y))
    stage(slots, os.path.join(OUT, 'kinds.png'), (0, -11.5, 11.5), (math.radians(50), 0, 0), 32, (1600, 1000))
    # one apple tree in three conditions
    ns['reset']()
    slots = []
    for i, st in enumerate(('well', 'dull', 'wilt')):
        x = (i - 1) * 4.4
        before = set(bpy.data.objects)
        apple(random.Random('apple'), st)
        place_last(before, x, 0)
        slots.append((x, 0))
    stage(slots, os.path.join(OUT, 'apple_states.png'), (0, -13, 6.4), (math.radians(68), 0, 0), 32, (1500, 760))


main()
