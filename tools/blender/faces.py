# Face cuts of the three analysts for the UI (docs/brief-design.md: the faces come from the 3D models, not initials).
#   blender -b --factory-startup --python tools/blender/faces.py -- public/models/analysts public/models/analysts/faces
# One square PNG per analyst, transparent background, head and shoulders, lit like the preview (workbench studio).
import bpy, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = os.path.abspath(args[0]), os.path.abspath(args[1])  # absolute: Blender reads a relative output path from the drive root
os.makedirs(OUT, exist_ok=True)
SIZE = 320

def bbox(objs):
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi

for name in ('tori', 'moa', 'luon'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name + '.glb'))
    bpy.context.view_layer.update()
    objs = list(bpy.data.objects)
    head = bpy.data.objects.get('head')
    # the head pivot and everything under it (ears, glasses, hood)
    parts = [o for o in objs if head and (o == head or o.parent == head or (o.parent and o.parent.parent == head))]
    lo, hi = bbox(parts or objs)
    # the bunny's ears are long: frame the face, not the ear tips
    top = min(hi.z, lo.z + (hi.x - lo.x) * 1.25)
    center = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, (lo.z + top) / 2 - (top - lo.z) * 0.08))
    span = max(hi.x - lo.x, top - lo.z) * 1.35
    scene = bpy.context.scene
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = span
    # a little from the side and above, like the garden camera sees them
    cam.location = center + Vector((0.9, -4.0, 0.7))
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    sh = scene.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'MATERIAL'
    sh.show_shadows = False
    sh.show_cavity = True
    sh.cavity_type = 'BOTH'
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', scene.render.filepath)
