# Mechanical intake for a Nano Banana grid sheet: key out the flat background, find each picture,
# and save it on the 512 tree canvas with the trunk foot at (256, 451), scaled uniformly.
# Pictures are matched to names in reading order (top row left to right, then the next row).
# Nothing is redrawn, recoloured or warped.
# usage: python3 -I scripts/cut-nb-grid.py <sheet> <out_dir> <pictures per row, e.g. 5,5,5> kind:stage:cond ...
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
sheet,out=sys.argv[1:3];grid=[int(x) for x in sys.argv[3].split(',')];names=[a.split(':') for a in sys.argv[4:]]
HEIGHT={'seed':48,'sprout':96,'sapling':160,'young':250,'grand':340};FOOT=(256,451)
src=np.asarray(Image.open(sheet).convert('RGB')).astype(float)
key=np.median(np.concatenate([src[:8,:8].reshape(-1,3),src[:8,-8:].reshape(-1,3)]),0)
alpha=np.clip((np.sqrt(((src-key)**2).sum(-1))-60)/90,0,1)
hi=[i for i in range(3) if key[i]>150];lo=[i for i in range(3) if key[i]<=150][0]
rgb=src.copy();spill=np.clip(np.minimum(rgb[...,hi[0]],rgb[...,hi[1]])-rgb[...,lo],0,None)
for i in hi:rgb[...,i]-=spill
rgb=np.clip(rgb,0,255)
h,w=alpha.shape
# faint pieces count too, so the sparkle's thin outline and stray specks go with them
lab,n=ndimage.label(alpha>.05);sizes=ndimage.sum(np.ones_like(alpha),lab,range(1,n+1));alpha[np.isin(lab,np.nonzero(sizes<400)[0]+1)]=0
# the generator's sparkle mark: a piece lying wholly in the bottom-right corner (not a tree reaching into it)
for i,sl in enumerate(ndimage.find_objects(lab)):
  if sl and sl[0].start>h*.85 and sl[1].start>w*.9:alpha[sl][lab[sl]==i+1]=0
rgba=np.dstack([rgb,alpha*255]).astype(np.uint8)
# cut between pictures: for each boundary of the given grid, the emptiest line near where it should be
def cuts(v,n):
  on=np.nonzero(v>0)[0];lo,hi=on.min(),on.max()+1;step=(hi-lo)/n;out=[lo]
  for i in range(1,n):
    c=lo+step*i;w=int(step*.3);a,b=int(c-w),int(c+w);out.append(a+int(np.argmin(v[a:b])))
  return out+[hi]
solid=alpha>.5;order=[]
ys=cuts(solid.sum(1).astype(float),len(grid))
for r,n in enumerate(grid):
  band=solid[ys[r]:ys[r+1]];xs=cuts(band.sum(0).astype(float),n)
  for c in range(n):order.append((slice(ys[r],ys[r+1]),slice(xs[c],xs[c+1])))
if len(order)!=len(names):sys.exit(f'grid has {len(order)} cells, {len(names)} names given')
parts=[]
for s,(kind,stage,cond) in zip(order,names):
  cut=rgba[s].copy()
  # keep the picture and what lies around its foot; drop slivers of the neighbouring cell
  cl,cn=ndimage.label(cut[...,3]>128)
  if cn>1:
    sz=ndimage.sum(np.ones(cl.shape),cl,range(1,cn+1));main=ndimage.find_objects(cl)[int(np.argmax(sz))];mw=main[1].stop-main[1].start
    for j,sl in enumerate(ndimage.find_objects(cl)):
      cxj=(sl[1].start+sl[1].stop)/2
      if cxj<main[1].start-mw*.3 or cxj>main[1].stop+mw*.3:cut[sl][...,3][cl[sl]==j+1]=0
  solid=cut[...,3]>128
  ys,xs=np.nonzero(solid);top,bot=ys.min(),ys.max()
  band=solid[int(bot-(bot-top)*.22):int(bot-(bot-top)*.12)];cols=np.nonzero(band.sum(0)>band.shape[0]*.5)[0]
  cx=(cols.min()+cols.max())/2 if len(cols) else xs.mean()
  parts.append((kind,stage,cond,cut,top,bot,cx))
# one scale per stage on this sheet, from its living pictures, so a stump keeps its size next to its tree
scale={st:np.median([HEIGHT[st]/(p[5]-p[4]) for p in parts if p[1]==st and p[2]!='dead'] or [1]) for st in {p[1] for p in parts}}
for kind,stage,cond,cut,top,bot,cx in parts:
  k=scale[stage];im=Image.fromarray(cut);im=im.resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.LANCZOS)
  c=Image.new('RGBA',(512,512),(0,0,0,0));c.alpha_composite(im,(round(FOOT[0]-cx*k),round(FOOT[1]-bot*k)))
  c.save(f'{out}/tree_{kind}_{stage}_{cond}.png');print(f'tree_{kind}_{stage}_{cond}','scale %.3f'%k,c.getbbox())
