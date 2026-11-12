# A front picture of the three analysts, to check them without opening the app.
#   blender -b --factory-startup --python tools/blender/preview_analysts.py -- public/models/analysts out.png
import bpy, math, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
for i, name in enumerate(('tori', 'moa', 'luon')):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name + '.glb'))
    for o in set(bpy.data.objects) - before:
        if o.parent is None:
            o.location.x += (i - 1) * 1.5
scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.location = (0.6, -5.2, 1.9)
cam.rotation_euler = (math.radians(80), 0, math.radians(6))
cam.data.lens = 40
scene.camera = cam
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
sh.light = 'STUDIO'
sh.color_type = 'MATERIAL'
sh.show_shadows = True
sh.show_cavity = True
scene.render.resolution_x, scene.render.resolution_y = 1200, 700
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('rendered', OUT)
