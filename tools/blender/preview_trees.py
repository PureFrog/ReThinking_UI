# A side-by-side picture of the generated trees, to check shapes without opening the app.
#   blender -b --factory-startup --python tools/blender/preview_trees.py -- public/models/trees out.png
import bpy, math, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
FILES = [f'tree_{g}_{v}.glb' for v in (0, 1) for g in ('seed', 'sprout', 'sapling', 'young', 'grand')] + ['stump.glb']
COLORS = {'trunk': (0.42, 0.33, 0.28, 1), 'leaf': (0.3, 0.62, 0.27, 1), 'blossom': (1, 0.84, 0.3, 1)}

bpy.ops.wm.read_factory_settings(use_empty=True)
for i, f in enumerate(FILES):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f))
    row, col = divmod(i, 5) if i < 10 else (0.5, 5.3)
    for o in set(bpy.data.objects) - before:
        if o.parent is None:
            o.location.x += col * 3.6 - 8
            o.location.y += row * 4.5
        if o.type == 'MESH':
            o.color = next((c for k, c in COLORS.items() if o.name.startswith(k)), (0.5, 0.5, 0.5, 1))

scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.location = (2, -16, 7.5)
cam.rotation_euler = (math.radians(70), 0, 0)
cam.data.lens = 28
scene.camera = cam
scene.render.engine = 'BLENDER_WORKBENCH'
shading = scene.display.shading
shading.light = 'STUDIO'
shading.color_type = 'OBJECT'
shading.show_shadows = True
shading.show_cavity = True
scene.render.resolution_x, scene.render.resolution_y = 1600, 800
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('rendered', OUT)
