# Turns the raw logo renders (tools/blender/logo.py → 1800x640 full-frame PNG layers) into what the app ships:
# each layer cropped to its own box and saved as WebP, the boxes in brand.json, and the app icon at the sizes the web
# and Android ask for. Runs inside Blender (it brings numpy and an image writer; this PC has no other Python).
#
#   blender -b --factory-startup --python tools/blender/brand_export.py -- <renders dir> <out dir>
#
# Writes into <out dir> (public/brand):
#   brand.json             {size:[w,h], morph:[...], layers:{k:[x0,y0,x1,y1]}} in the full frame's pixels
#   l-<k>.webp             each layer cropped to its box (alpha kept)
#   logo.webp              the whole end-state logo, cropped to the union of the boxes
#   icon-512.png, icon-192.png, apple-touch-icon.png (180), favicon-32.png, icon-foreground-432.png
import bpy, json, os, sys
import numpy as np

A = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = os.path.abspath(A[0]), os.path.abspath(A[1])
os.makedirs(OUT, exist_ok=True)
# write pixels as they are: no view transform (the factory AgX would wash the colours out)
_vs = bpy.context.scene.view_settings; _vs.view_transform = 'Standard'; _vs.look = 'None'; _vs.exposure = 0; _vs.gamma = 1
meta = json.load(open(os.path.join(SRC, 'layers.json')))
W, H = meta['size']


def load(path):
    im = bpy.data.images.load(path)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)   # rows bottom-up
    bpy.data.images.remove(im)
    return px


def save(px, path, fmt, quality=85):
    h, w = px.shape[:2]
    im = bpy.data.images.new('out', w, h, alpha=True)
    im.pixels[:] = px.ravel()
    s = bpy.context.scene.render.image_settings
    s.file_format = fmt; s.color_mode = 'RGBA'
    if fmt == 'WEBP': s.quality = quality
    if fmt == 'PNG': s.compression = 90
    im.save_render(path); bpy.data.images.remove(im)


def crop(px, box):
    x0, y0, x1, y1 = [max(0, v) for v in box]; x1 = min(W, x1); y1 = min(H, y1)
    # boxes are top-down pixel rows; the array is bottom-up
    return px[H - y1:H - y0, x0:x1]


def tight(px, box):
    """shrink a box to where the layer actually has paint (alpha > 0.01), plus a small margin"""
    sub = crop(px, box); a = sub[:, :, 3] > 0.01
    if not a.any(): return box
    rows = np.where(a.any(axis=1))[0]; cols = np.where(a.any(axis=0))[0]
    x0, y0, x1, y1 = [max(0, v) for v in box]
    m = 4
    nx0 = x0 + cols[0] - m; nx1 = x0 + cols[-1] + 1 + m
    # rows of sub run bottom-up: the last painted row from the bottom is the top edge
    ny1 = min(H, y1) - rows[0] + m; ny0 = min(H, y1) - (rows[-1] + 1) - m
    return [int(max(0, nx0)), int(max(0, ny0)), int(min(W, nx1)), int(min(H, ny1))]


boxes = {}
for k in meta['layers']:
    px = load(os.path.join(SRC, f'layer-{k}.png'))
    b = tight(px, meta['layers'][k]); boxes[k] = b
    save(crop(px, b), os.path.join(OUT, f'l-{k}.webp'), 'WEBP', 82)
end = [k for k in boxes if k not in ('q',) and not k.startswith('m')]
u = [int(v) for v in [min(boxes[k][0] for k in end), min(boxes[k][1] for k in end), max(boxes[k][2] for k in end), max(boxes[k][3] for k in end)]]
save(crop(load(os.path.join(SRC, 'logo.png')), u), os.path.join(OUT, 'logo.webp'), 'WEBP', 85)
json.dump({'size': [W, H], 'morph': meta.get('morph', []), 'union': u, 'layers': boxes}, open(os.path.join(OUT, 'brand.json'), 'w'))


def resized(path, n, out):
    im = bpy.data.images.load(path); im.scale(n, n)
    s = bpy.context.scene.render.image_settings; s.file_format = 'PNG'; s.color_mode = 'RGBA'; s.compression = 90
    im.save_render(out); bpy.data.images.remove(im)


icon = os.path.join(SRC, 'icon-1024.png')
for n, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
    resized(icon, n, os.path.join(OUT, name))
resized(os.path.join(SRC, 'icon-foreground.png'), 432, os.path.join(OUT, 'icon-foreground-432.png'))
print('brand: wrote', OUT)
