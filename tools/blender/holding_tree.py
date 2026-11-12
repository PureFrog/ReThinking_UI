# Holding trees for the 3D garden, generated in Blender (no hand modelling, re-run to change them).
#
#   blender -b --factory-startup --python tools/blender/holding_tree.py -- public/models/trees
#
# Writes tree_<growth>_<variant>.glb for seed / sprout / sapling / young / grand, plus stump.glb.
# Every file uses the same object and material names, which the scene relies on
# (app/proto3d/models.ts):
#   trunk      bark; the scene gives it the shared soft material
#   leaf_<n>   canopy clumps, ordered from most to least important; a wilting tree hides the later ones
#   blossom    small flowers on the canopy; shown only when the tree is in bloom
#   cut        (stump only) the pale sawn face
# Sizes are final (1 unit = 1 m in the scene), the base sits at the origin, Blender Z-up becomes glTF Y-up.
import bpy, math, os, random, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'public/models/trees'
VARIANTS = 2

# one row per growth stage: trunk height and base radius, branches, clump size, roots, blossoms
STAGES = {
    'seed':    dict(kind='seedling', h=0.32, r=0.03, leaves=2),
    'sprout':  dict(kind='seedling', h=0.62, r=0.04, leaves=5, top=0.2),
    'sapling': dict(kind='tree', h=1.35, r=0.07, branches=2, blen=0.55, clump=0.42, extra=1, roots=0, blossoms=6),
    'young':   dict(kind='tree', h=2.0, r=0.13, branches=3, blen=0.85, clump=0.7, extra=4, roots=3, blossoms=12),
    'grand':   dict(kind='tree', h=2.55, r=0.24, branches=5, blen=1.35, clump=0.9, extra=4, roots=5, blossoms=22),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    return m


def apply_all(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def skin_mesh(name, verts, edges, radii):
    """A branching skeleton (points + links + radius per point) turned into a smooth closed mesh."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], edges, [])
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.modifiers.new('skin', 'SKIN')
    layer = me.skin_vertices[0].data
    for i, r in enumerate(radii):
        layer[i].radius = (r, r)
    layer[0].use_root = True
    sub = obj.modifiers.new('sub', 'SUBSURF')
    sub.levels = 2
    apply_all(obj)
    shade_smooth(obj)
    return obj


def clump(name, at, r, rnd, squash=0.82):
    """One soft, lumpy canopy blob: an icosphere pushed around by cloud noise."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=r, location=tuple(at))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (1, 1, squash)
    tex = bpy.data.textures.new(name + '_n', 'CLOUDS')
    tex.noise_scale = r * 0.9
    tex.noise_depth = 1
    d = obj.modifiers.new('d', 'DISPLACE')
    d.texture = tex
    d.strength = r * 0.32
    d.mid_level = 0.5
    # global coordinates: clumps sit in different places, so each samples different noise
    d.texture_coords = 'GLOBAL'
    apply_all(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(obj)
    return obj


def leaf_blade(name, at, yaw, pitch, size):
    """A single seedling leaf: a flattened, tilted droplet."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size, size * 0.42, size * 0.12)
    bpy.ops.object.transform_apply(scale=True)
    for v in obj.data.vertices:  # pull one end into a point, shift so the stem end is at the origin
        if v.co.x < 0:
            v.co.x *= 0.55
        v.co.x += size * 0.9
    obj.rotation_euler = (0, -pitch, yaw)
    obj.location = tuple(at)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    shade_smooth(obj)
    return obj


def blossoms(clumps, n, rnd):
    """Little five-petal-ish flowers sitting on the outside of the canopy, joined into one object."""
    made = []
    for i in range(n):
        c = rnd.choice(clumps)
        centre = Vector(c['at'])
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.2, 1))).normalized()
        p = centre + d * c['r'] * 0.95
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=c['r'] * 0.12 + 0.03, location=tuple(p))
        made.append(bpy.context.active_object)
    bpy.ops.object.select_all(action='DESELECT')
    for o in made:
        o.select_set(True)
    bpy.context.view_layer.objects.active = made[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = 'blossom'
    shade_smooth(obj)
    return obj


def build_seedling(cfg, rnd, mats):
    h, r = cfg['h'], cfg['r']
    lean = rnd.uniform(-0.06, 0.06)
    pts = [Vector((lean * t * t, 0, h * t)) for t in (0, 0.35, 0.7, 1)]
    trunk = skin_mesh('trunk', pts, [(i, i + 1) for i in range(len(pts) - 1)], [r * 1.2, r, r * 0.85, r * 0.7])
    trunk.data.materials.append(mats['trunk'])
    tip = pts[-1]
    n = cfg['leaves']
    for i in range(n):
        yaw = i / n * math.tau + rnd.uniform(-0.3, 0.3)
        at = tip - Vector((0, 0, (i // 2) * h * 0.22))
        leaf = leaf_blade(f'leaf_{i}', at, yaw, rnd.uniform(0.25, 0.55), h * (0.42 if i < 2 else 0.32))
        leaf.data.materials.append(mats['leaf'])
    if cfg.get('top'):
        top = clump(f'leaf_{n}', tip + Vector((0, 0, cfg['top'] * 0.6)), cfg['top'], rnd)
        top.data.materials.append(mats['leaf'])


def build_tree(cfg, rnd, mats):
    h, r = cfg['h'], cfg['r']
    verts, edges, radii = [], [], []

    def add(p, rad, parent):
        verts.append(Vector(p))
        radii.append(rad)
        if parent is not None:
            edges.append((parent, len(verts) - 1))
        return len(verts) - 1

    # trunk: a gentle S-curve, tapering
    lean = Vector((rnd.uniform(-0.12, 0.12), rnd.uniform(-0.12, 0.12), 0))
    seg = 6
    trunk_ids = [add((0, 0, 0), r * 1.25, None)]
    for i in range(1, seg + 1):
        t = i / seg
        p = Vector((0, 0, h * t)) + lean * math.sin(t * math.pi) * h * 0.5
        trunk_ids.append(add(p, r * (1 - 0.55 * t), trunk_ids[-1]))
    # roots: flares that leave the trunk a little above the ground and taper into it
    for k in range(cfg['roots']):
        a = k / max(1, cfg['roots']) * math.tau + rnd.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), math.sin(a), 0))
        mid = add(d * r * 1.3 + Vector((0, 0, r * 0.35)), r * 0.45, trunk_ids[0])
        add(d * r * 2.6 + Vector((0, 0, -r * 0.1)), r * 0.12, mid)

    ends = [verts[trunk_ids[-1]]]
    nb = cfg['branches']
    for b in range(nb):
        start = trunk_ids[int(seg * rnd.uniform(0.55, 0.85))]
        a = b / nb * math.tau + rnd.uniform(-0.4, 0.4)
        up = rnd.uniform(0.7, 1.1)
        d = Vector((math.cos(a), math.sin(a), up)).normalized()
        L = cfg['blen'] * rnd.uniform(0.8, 1.15)
        prev, base = start, verts[start]
        for s in range(1, 4):
            t = s / 3
            p = base + d * L * t + Vector((0, 0, L * 0.25 * t * t))
            prev = add(p, radii[start] * (0.6 - 0.3 * t), prev)
        ends.append(verts[prev])

    trunk = skin_mesh('trunk', verts, edges, radii)
    trunk.data.materials.append(mats['trunk'])

    # canopy: a clump on every branch end, the biggest on top, a few fillers in between
    c = cfg['clump']
    clumps = [dict(at=ends[0] + Vector((0, 0, c * 0.55)), r=c * 1.15)]
    for e in ends[1:]:
        clumps.append(dict(at=e + Vector((0, 0, c * 0.25)), r=c * rnd.uniform(0.85, 1.05)))
    for _ in range(cfg['extra']):
        a, b = rnd.sample(clumps[:len(ends)], 2) if len(ends) > 1 else (clumps[0], clumps[0])
        mid = (Vector(a['at']) + Vector(b['at'])) / 2 + Vector((0, 0, c * 0.35))
        clumps.append(dict(at=mid, r=c * rnd.uniform(0.7, 0.9)))
    for i, cl in enumerate(clumps):
        obj = clump(f'leaf_{i}', cl['at'], cl['r'], rnd)
        obj.data.materials.append(mats['leaf'])

    fl = blossoms(clumps, cfg['blossoms'], rnd)
    fl.data.materials.append(mats['blossom'])


def build_stump(rnd, mats):
    """A cut stump: bark sides with root flares, a flat pale cut face with growth rings on top."""
    r, top = 0.34, 0.55
    verts, edges, radii = [Vector((0, 0, 0)), Vector((0, 0, top * 0.5)), Vector((0, 0, top + 0.2))], [(0, 1), (1, 2)], [r * 1.15, r, r * 0.95]
    for k in range(4):
        a = k / 4 * math.tau + rnd.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), math.sin(a), 0))
        verts.append(d * r * 1.2 + Vector((0, 0, r * 0.35)))
        edges.append((0, len(verts) - 1))
        radii.append(r * 0.42)
        verts.append(d * r * 2.3 + Vector((0, 0, -0.03)))
        edges.append((len(verts) - 2, len(verts) - 1))
        radii.append(r * 0.1)
    trunk = skin_mesh('trunk', verts, edges, radii)
    # saw it off: everything above the cut is flattened onto it
    for v in trunk.data.vertices:
        if v.co.z > top:
            v.co.z = top
    trunk.data.materials.append(mats['trunk'])
    # the cut face, sitting just above the flattened top
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r * 0.86, depth=0.02, location=(0, 0, top + 0.005))
    cut = bpy.context.active_object
    cut.name = 'cut'
    cut.data.materials.append(mats['cut'])
    for k, rr in enumerate((0.62, 0.38, 0.16)):
        bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.86 * rr, minor_radius=0.008, major_segments=32, minor_segments=4,
                                         location=(0, 0, top + 0.016))
        ring = bpy.context.active_object
        ring.name = f'trunk_ring_{k}'
        ring.data.materials.append(mats['trunk'])


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=False, export_animations=False)
    print('wrote', path)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, cfg in STAGES.items():
        for v in range(VARIANTS):
            reset()
            rnd = random.Random(f'{name}-{v}')
            mats = dict(trunk=material('trunk', (0.42, 0.33, 0.28)), leaf=material('leaf', (0.3, 0.62, 0.27)),
                        blossom=material('blossom', (1.0, 0.84, 0.3)))
            (build_seedling if cfg['kind'] == 'seedling' else build_tree)(cfg, rnd, mats)
            export(os.path.join(OUT, f'tree_{name}_{v}.glb'))
    reset()
    build_stump(random.Random('stump'), dict(trunk=material('trunk', (0.42, 0.33, 0.28)), cut=material('cut', (0.79, 0.65, 0.48))))
    export(os.path.join(OUT, 'stump.glb'))


main()
