# Shared Blender helpers for the generated models (rounded primitives, pivots, export). Same as in analysts.py.
import bpy, math
from mathutils import Vector


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



def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=False, export_animations=False)
    print('wrote', path)
