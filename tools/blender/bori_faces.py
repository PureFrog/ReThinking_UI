# 보리's seven faces (tools/blender/analysts.py bori_faces), one picture each, for checking them side by side and for
# the talk box (docs/mockups/bori-faces.html).
#   blender -b --factory-startup --python tools/blender/bori_faces.py -- <folder with bori.glb> <output folder>
# The same rule as the scene (app/proto3d/Analyst3D.tsx): only the emotion's x_<emotion>_ pieces show, and an emotion
# with its own eyes hides the round ones.
import bpy, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = os.path.abspath(args[0]), os.path.abspath(args[1])
os.makedirs(OUT, exist_ok=True)
EMOTIONS = ('neutral', 'curious', 'concerned', 'happy', 'thinking', 'playful', 'tired')
SIZE = 420

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'bori.glb'))
bpy.context.view_layer.update()
objs = list(bpy.data.objects)
head = bpy.data.objects.get('head')
center = head.matrix_world.translation + Vector((0, 0, 0.32))
scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 1.05
cam.location = center + Vector((0.55, -4.0, 0.35))
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

for e in EMOTIONS:
    own_eyes = any(o.name.startswith(f'x_{e}_eye') for o in objs)
    for o in objs:
        if o.name.startswith('x_'):
            o.hide_render = not o.name.startswith(f'x_{e}_')
        elif o.name in ('eye_l', 'eye_r'):
            o.hide_render = own_eyes
    scene.render.filepath = os.path.join(OUT, f'bori_{e}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', scene.render.filepath)
