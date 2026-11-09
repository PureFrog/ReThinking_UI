# Mechanical intake for a Nano Banana sheet: key out the flat background, cut each cell,
# scale it uniformly and place it on the 512 tree canvas with the trunk foot at (256, 451).
# The picture itself is not redrawn, warped or repainted.
# usage: python3 -I scripts/art/cut-nb-sheet.py <sheet> <out_dir> <kind> <stage> cond:x0,y0,x1,y1 ...
import sys
import numpy as np
from PIL import Image
sheet,out,kind,stage=sys.argv[1:5];cells=sys.argv[5:]
HEIGHT={'seed':48,'sprout':96,'sapling':160,'young':250,'grand':340}[stage]
FOOT=(256,451)
src=np.asarray(Image.open(sheet).convert('RGB')).astype(float)
key=src[2,2]  # flat background colour from the corner
dist=np.sqrt(((src-key)**2).sum(-1))
alpha=np.clip((dist-60)/90,0,1)
# the key's two bright channels (magenta: red+blue, cyan: green+blue) leak into edges; take the leak back out
hi=[i for i in range(3) if key[i]>150];lo=[i for i in range(3) if key[i]<=150][0]
rgb=src.copy();spill=np.clip(np.minimum(rgb[...,hi[0]],rgb[...,hi[1]])-rgb[...,lo],0,None)
for i in hi:rgb[...,i]-=spill
rgb=np.clip(rgb,0,255)
# drop specks: background gradients and stray marks smaller than a leaf
from scipy import ndimage
lab,n=ndimage.label(alpha>.5);sizes=ndimage.sum(np.ones_like(alpha),lab,range(1,n+1))
small=np.isin(lab,np.nonzero(sizes<400)[0]+1);alpha[small]=0
rgba=np.dstack([rgb,alpha*255]).astype(np.uint8)
parts={}
for c in cells:
  name,box=c.split(':');x0,y0,x1,y1=map(int,box.split(','))
  cut=rgba[y0:y1,x0:x1];m=cut[...,3]>128;ys,xs=np.nonzero(m)
  top,bot=ys.min(),ys.max()
  # trunk centre: middle of the solid run in a band just above the ground
  band=m[int(bot-(bot-top)*.22):int(bot-(bot-top)*.12)]
  cols=np.nonzero(band.sum(0)>band.shape[0]*.5)[0];cx=(cols.min()+cols.max())/2 if len(cols) else xs.mean()
  parts[name]=(cut,top,bot,cx)
# one scale per sheet, taken from the living trees, so stump and tree keep their relative size
living=[p for n,p in parts.items() if n!='dead']
scale=np.median([HEIGHT/(p[2]-p[1]) for p in living])
for name,(cut,top,bot,cx) in parts.items():
  im=Image.fromarray(cut);w,h=im.size;im=im.resize((max(1,round(w*scale)),max(1,round(h*scale))),Image.LANCZOS)
  canvas=Image.new('RGBA',(512,512),(0,0,0,0));canvas.alpha_composite(im,(round(FOOT[0]-cx*scale),round(FOOT[1]-bot*scale)))
  canvas.save(f'{out}/tree_{kind}_{stage}_{name}.png');print(name,'scale %.3f'%scale,canvas.getbbox())
