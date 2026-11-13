# A front picture of the player's figure dressed four ways, to check the items sit on their sockets.
#   blender -b --factory-startup --python tools/blender/preview_explorer.py -- public/models/explorer out.png
import bpy, math, os, sys
args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = os.path.abspath(args[0]), os.path.abspath(args[1])
bpy.ops.wm.read_factory_settings(use_empty=True)
LOOKS = [('coat_vest', 'hat_explorer', 'bag_specimen', 'tool_loupe'), ('coat_lab', 'hat_beret', 'bag_brief', 'tool_notebook'),
         ('coat_rain', 'hat_straw', 'bag_tube', 'tool_staff'), ('coat_knit', 'hat_lamp', None, 'tool_trowel')]
def load(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name + '.glb'))
    return [o for o in set(bpy.data.objects) - before]
for i, (coat, hat, bag, tool) in enumerate(LOOKS):
    objs = load('explorer')
    root = [o for o in objs if o.parent is None][0]
    root.location.x += (i - 1.5) * 1.2
    bpy.context.view_layer.update()
    sock = {o.name.split('.')[0]: o for o in objs}
    for item, at in ((coat, 'body'), (hat, 'hat'), (bag, 'back'), (tool, 'hand')):
        if not item: continue
        parts = load(item)
        for p in parts:
            if p.parent is None:
                p.parent = sock[at]
bpy.context.view_layer.update()
scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
cam.location = (0.3, -6.2, 1.6); cam.rotation_euler = (math.radians(84), 0, math.radians(3)); cam.data.lens = 40
scene.camera = cam
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = True
scene.render.resolution_x, scene.render.resolution_y = 1200, 600
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('rendered', OUT)
