# ux-spec 4장 evening and night pictures (024, Nano Banana). Two steps, nothing redrawn or recoloured here:
#   make: lay the day pictures of each group on one flat magenta sheet (024 inputs) and remember where each one sits.
#   cut:  take a returned sheet, scale it back to the input sheet's size, cut each picture out of its cell and give it
#         the day picture's own outline (its alpha), so the night picture keeps exactly the day picture's shape and place.
#         Saved as public/assets/<folder>/<part>/<same file name> (webp stays webp).
# usage: python3 -I scripts/art/daypart-sheets.py make <out_dir>
#        python3 -I scripts/art/daypart-sheets.py cut <out_dir> <group> <evening|night> <returned sheet>
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','public')
GROUPS={
 'ground':['ground/ground_grass_1.png','ground/ground_grass_2.png','ground/ground_grass_3.png','ground/ground_grass_4.png','ground/ground_path.png','ground/ground_stepping_stone.png','ground/ground_edge_left.png','ground/ground_edge_right.png'],
 'yard':['assets/house/yard_flower_patch_1.png','assets/house/yard_flower_patch_2.png','assets/house/yard_mailbox.png','assets/house/yard_seedbox.png','assets/house/yard_shovel.png','assets/house/farm_sign.png'],
 'farm':['assets/house/farm_plot.png','assets/house/farm_plot_empty.png','assets/house/farm_fence_a.png','assets/house/farm_fence_b.png','assets/house/farm_gate.png','assets/house/farm_well.png','assets/house/farm_shed.png','assets/house/farm_cart.png','assets/house/farm_compost.png','assets/house/farm_fertilizer.png','assets/house/farm_scarecrow.png'],
 'house_small':['assets/house9/house_exterior.webp'],
 'house_small_rose':['assets/house9/house_exterior_rose.webp'],
 'house_grown':['assets/house9/house_exterior_grown.webp'],
 'house_grown_rose':['assets/house9/house_exterior_grown_rose.webp'],
}
GROUPS['ground']=['assets/'+p for p in GROUPS['ground']]
# 024-v2: the ground came back unevenly lit on one sheet, so it goes one tile per run. Every grass variant takes the
# one relit grass tile (they differ only by a few tufts), so the yard has one even brightness at night.
for n in ['grass_1','path','stepping_stone','edge_left','edge_right']:GROUPS['tile_'+n]=['assets/ground/ground_'+n+'.png']
GRASS_SHARE={'assets/ground/ground_grass_1.png':['assets/ground/ground_grass_2.png','assets/ground/ground_grass_3.png','assets/ground/ground_grass_4.png']}
MAGENTA=(255,0,255,255);PAD=24;COLS={'ground':4,'yard':3,'farm':4}

def layout(group):
 ims=[Image.open(os.path.join(ROOT,p)).convert('RGBA') for p in GROUPS[group]]
 if len(ims)==1:return ims,[(0,0,0,0,*ims[0].size)],ims[0].size,1
 boxes=[im.getbbox() or (0,0,*im.size) for im in ims]
 cw=max(b[2]-b[0] for b in boxes)+PAD;ch=max(b[3]-b[1] for b in boxes)+PAD;cols=COLS[group];rows=-(-len(ims)//cols)
 # small tiles go on the sheet at twice their size so the model has pixels to work with
 k=2 if group in ('ground','yard') else 1
 cells=[];W,H=(cols*cw+PAD)*k,(rows*ch+PAD)*k
 for i,(im,b) in enumerate(zip(ims,boxes)):
  x=(PAD+(i%cols)*cw+(cw-PAD-(b[2]-b[0]))//2)*k;y=(PAD+(i//cols)*ch+(ch-PAD-(b[3]-b[1]))//2)*k
  cells.append((x,y,*b))
 return ims,cells,(W,H),k

def make(out):
 os.makedirs(out,exist_ok=True);plan={}
 for g in GROUPS:
  ims,cells,(W,H),k=layout(g);sheet=Image.new('RGBA',(W,H),MAGENTA)
  for im,(x,y,x0,y0,x1,y1) in zip(ims,cells):
   piece=im.crop((x0,y0,x1,y1));piece=piece.resize((piece.width*k,piece.height*k),Image.LANCZOS) if k!=1 else piece
   sheet.alpha_composite(piece,(x,y))
  sheet.convert('RGB').save(os.path.join(out,f'in_{g}.png'));plan[g]={'size':[W,H],'scale':k,'cells':cells,'files':GROUPS[g]}
 json.dump(plan,open(os.path.join(out,'plan.json'),'w'),indent=1)

def fg(rgb):
 # what is not the flat background: the background is read from the sheet's border (a night sheet comes back shaded)
 border=np.concatenate([rgb[:6].reshape(-1,3),rgb[-6:].reshape(-1,3),rgb[:,:6].reshape(-1,3),rgb[:,-6:].reshape(-1,3)])
 m=np.sqrt(((rgb-np.median(border,0))**2).sum(-1))>70
 m&=~((rgb[...,0]-rgb[...,1]>90)&(rgb[...,2]-rgb[...,1]>90))
 return ndimage.binary_opening(m,iterations=2)

def big_box(m):
 lab,n=ndimage.label(m);areas=ndimage.sum(m,lab,range(1,n+1));keep=[i+1 for i,a in enumerate(areas) if a>m.size*.003]
 ys,xs=np.nonzero(np.isin(lab,keep));return xs.min(),ys.min(),xs.max()+1,ys.max()+1

def cut(out,group,part,returned):
 # The model may reframe the sheet a little: the pictures are found again by where they sit among the big pieces,
 # each one's own outline is measured, and that box is fitted onto the day picture's box.
 plan=json.load(open(os.path.join(out,'plan.json')))[group];k=plan['scale']
 src=np.asarray(Image.open(os.path.join(out,f'in_{group}.png')).convert('RGB')).astype(float)
 got_img=Image.open(returned).convert('RGB');got=np.asarray(got_img).astype(float)
 a=big_box(fg(src));b=big_box(fg(got));sx=(b[2]-b[0])/(a[2]-a[0]);sy=(b[3]-b[1])/(a[3]-a[1])
 m=fg(got);lab,n=ndimage.label(m);objs=ndimage.find_objects(lab)
 for f,(x,y,x0,y0,x1,y1) in zip(plan['files'],plan['cells']):
  w,h=x1-x0,y1-y0;cx0=b[0]+(x-a[0])*sx;cy0=b[1]+(y-a[1])*sy;cx1=cx0+w*k*sx;cy1=cy0+h*k*sy;pw,ph=(cx1-cx0)*.15,(cy1-cy0)*.15
  box=None;near=[]
  for i,sl in enumerate(objs):
   if sl is None:continue
   oy,ox=(sl[0].start+sl[0].stop)/2,(sl[1].start+sl[1].stop)/2
   if cx0-pw<=ox<=cx1+pw and cy0-ph<=oy<=cy1+ph:near.append((int((lab[sl]==i+1).sum()),sl))
  # specks next to a picture (the model's watermark star) are not part of it
  top=max((a for a,_ in near),default=0)
  for a_,sl in near:
   if a_<top*.02:continue
   bb=(sl[1].start,sl[0].start,sl[1].stop,sl[0].stop);box=bb if box is None else (min(box[0],bb[0]),min(box[1],bb[1]),max(box[2],bb[2]),max(box[3],bb[3]))
  if box is None:print('missing',f);continue
  # the found outline fits onto the day picture's own solid outline (faint edge pixels and empty canvas left out)
  day=Image.open(os.path.join(ROOT,f)).convert('RGBA');t=day.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox()
  piece=got_img.crop(box).resize((t[2]-t[0],t[3]-t[1]),Image.LANCZOS).convert('RGBA')
  lit=Image.new('RGBA',day.size,(0,0,0,0));lit.paste(piece,(t[0],t[1]));lit.putalpha(day.getchannel('A'))
  # background colour caught along the outline is replaced by the nearest picture pixel (key spill, like cut-nb-grid)
  px=np.asarray(lit).copy();rgb=px[...,:3].astype(int);al=px[...,3]>0
  bad=al&(rgb[...,0]-rgb[...,1]>70)&(rgb[...,2]-rgb[...,1]>70)
  if bad.any()and (al&~bad).any():
   good=al&~bad
   _,(gy,gx)=ndimage.distance_transform_edt(~good,return_indices=True);px[bad,:3]=px[gy[bad],gx[bad],:3];lit=Image.fromarray(px)
  d,name=os.path.split(os.path.join(ROOT,f));os.makedirs(os.path.join(d,part),exist_ok=True)
  dest=os.path.join(d,part,name);lit.save(dest,**({'quality':92} if name.endswith('.webp') else {}));print(dest)
  for other in GRASS_SHARE.get(f,[]):
   o=os.path.join(ROOT,other);od,on=os.path.split(o);lit.save(os.path.join(od,part,on));print(os.path.join(od,part,on))

if __name__=='__main__':
 if sys.argv[1]=='make':make(sys.argv[2])
 else:cut(*sys.argv[2:6])
