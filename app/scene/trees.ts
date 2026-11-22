import Phaser from 'phaser';
import {LEAF_IMAGES} from './assets';
import type {Condition,Growth} from '../core/model';
import {TIMING} from '../core/timing';
import {TREE_FIT} from './treeFit';

export {artCondition,treeName,deliveredArt,standInArt} from './tree-art';
import {deliveredArt,standInArt} from './tree-art';
// Leaf pictures by condition (falling and lying around); shapes in LEAF_COLORS when they are missing.
export const LEAF_ART:Record<Condition,(keyof typeof LEAF_IMAGES)[]>={bloom:[],well:[],dull:['yellow'],wilt:['orange','yellow','orange'],rot:['brown','orange','brown'],dead:['brown']};

// Height of the tree on screen (game px), its hotspot, and where leaves fall from.
export const TREE_SIZE:Record<Growth,{h:number;hit:[number,number,number,number]}>={seed:{h:24,hit:[0,-12,56,40]},sprout:{h:48,hit:[0,-22,56,56]},sapling:{h:80,hit:[0,-40,70,88]},young:{h:125,hit:[0,-60,90,120]},grand:{h:170,hit:[0,-85,160,180]}};
export const LEAF_COLORS:Record<Condition,number[]>={bloom:[],well:[],dull:[0xe0c860],wilt:[0xe0a050,0xc98a3e,0xd9b55a],rot:[0x9a7a4e,0x7f6a48,0xb08c58],dead:[0x8a7458]};
// Leaves falling every so many ms; litter = leaves lying around the trunk.
export const FALL:Record<Condition,{every:number;litter:number}>={bloom:{every:0,litter:0},well:{every:0,litter:0},dull:{every:TIMING.leafFallDull,litter:2},wilt:{every:TIMING.leafFallWilt,litter:6},rot:{every:TIMING.leafFallRot,litter:8},dead:{every:0,litter:5}};

// Shapes standing in for missing art. kind picks the atlas tree for sapling and up.
export function paintTree(s:Phaser.Scene,c:Phaser.GameObjects.Container,kind:number,g:Growth,cond:Condition,old:boolean){
 const art=deliveredArt(kind,g,cond),stand=standInArt(kind,g,cond);const gr=s.add.graphics();c.add(gr);
 const litter=(n:number,spread:number)=>{for(let j=0;j<n;j++){const x=-spread+j*(spread*2/Math.max(1,n-1)),y=4+((j*7)%3)*3,leaf=LEAF_ART[cond][j%Math.max(1,LEAF_ART[cond].length)],img=leaf&&LEAF_IMAGES[leaf];
  if(img&&s.textures.exists(img.key))c.add(s.add.image(x,y,img.key).setDisplaySize(10,10).setAngle((j*67)%360));else gr.fillStyle(LEAF_COLORS[cond][j%Math.max(1,LEAF_COLORS[cond].length)]??0xb5a17b).fillEllipse(x,y,8,3.5)}};
 // drawn at 2×: the picture's ground footprint (TREE_FIT, measured by scripts/art/fit-trees.py) on the plot centre,
 // shrunk evenly when roots or fallen leaves would spill off the soil
 const picture=(a:{key:string;url:string})=>{const [fx,fy,k]=TREE_FIT[a.url.split('/').pop()!.replace('.png','')]??[256,451,1];return s.add.image(k*(128-fx/2),k*(256-fy/2),a.key).setOrigin(.5,1).setDisplaySize(256*k,256*k)};
 if(art&&s.textures.exists(art.key)){c.add(picture(art));return}
 // the healthy picture as it is, never recoloured or bent; its condition picture replaces it when delivered
 if(stand&&s.textures.exists(stand.key)){c.add(picture(stand));return}
 const soil=cond==='dead'||cond==='rot'?0x8b7a63:cond==='wilt'?0x9a7e5c:0x8b6a48;
 if(g==='seed'){gr.fillStyle(soil).fillEllipse(0,0,46,16).fillStyle(0x000000,.08).fillEllipse(0,3,46,8);
  if(cond==='dead'){gr.lineStyle(1.5,0x6d5c48).lineBetween(-14,0,-4,-2).lineBetween(-4,-2,2,2).lineBetween(6,-1,15,1);gr.fillStyle(0x7b6a55).fillEllipse(0,-4,9,6)}
  else{gr.fillStyle(0x7a5532).fillEllipse(0,-5,10,8).fillStyle(0xa77b4c).fillEllipse(-1,-6,4,3);if(cond==='wilt')gr.lineStyle(1.5,0x7a6448).lineBetween(-16,1,-7,-1).lineBetween(8,1,16,-1);else gr.fillStyle(0x9cc46e).fillEllipse(3,-10,5,7)}
  return}
 if(g==='sprout'){gr.fillStyle(soil).fillEllipse(0,0,44,14);const stem=cond==='dead'?0x8a7458:cond==='wilt'?0xa79457:0x6f9b4c,leaf=cond==='dead'?0x9b8364:cond==='wilt'?0xc7a35a:cond==='dull'?0xc8c46a:0x8fc463;
  const droop=cond==='wilt'||cond==='dead'?1:0;gr.lineStyle(3,stem).lineBetween(0,0,droop?6:0,droop?-24:-30);
  const top={x:droop?6:0,y:droop?-24:-30};gr.fillStyle(leaf).fillEllipse(top.x-9,top.y+(droop?8:2),16,8).fillEllipse(top.x+9,top.y+(droop?10:0),16,8);
  if(cond!=='dead')gr.fillStyle(0xffffff,.25).fillEllipse(top.x-11,top.y+(droop?7:1),6,2);litter(FALL[cond].litter>0?2:0,16);return}
 if(cond==='dead'){// a dry, rotting stump: bark peeling, a hollow, mushrooms, fallen twigs
  const h=g==='grand'?52:g==='young'?40:28,w=g==='grand'?40:g==='young'?30:22;
  gr.fillStyle(0x000000,.1).fillEllipse(0,4,w*2.4,14);gr.fillStyle(0x7d6a54).fillRect(-w/2,-h,w,h).fillEllipse(0,0,w,10);
  gr.fillStyle(0x6a5946).fillTriangle(-w/2,-h,-w/2+8,-h-12,-w/2+14,-h).fillTriangle(w/2-12,-h,w/2-4,-h-7,w/2,-h);gr.fillStyle(0x9b876c).fillEllipse(0,-h,w,9).fillStyle(0x7f6c55).fillEllipse(0,-h,w*.6,5);
  gr.fillStyle(0x4f4236).fillEllipse(-2,-h*.45,w*.32,h*.3);gr.lineStyle(2,0x5f4f3e).lineBetween(-w/2+5,-h+8,-w/2+7,-6).lineBetween(w/2-6,-h+12,w/2-8,-10);
  for(const [x,y,r] of [[-w/2-3,-6,6],[w/2+2,-10,5],[w/2+8,-2,4]] as const){gr.fillStyle(0xe7dcc4).fillRect(x-1,y,2,5).fillStyle(0xc9785a).fillEllipse(x,y,r*2,r*1.1).fillStyle(0xf3e3cf).fillCircle(x-r*.3,y-1,1.2)}
  gr.fillStyle(0x8c9c68,.85).fillEllipse(-w/2+4,-3,12,5);gr.lineStyle(2.5,0x76634e).lineBetween(-w-8,6,-w+12,0).lineBetween(w+2,8,w+18,3);litter(FALL.dead.litter,w+6);return}
 const size=TREE_SIZE[g].h;
 if(old&&g==='grand')gr.fillStyle(0x947454).fillTriangle(-46,7,0,-30,43,7).fillEllipse(0,3,75,16).fillStyle(0x8c9c68).fillEllipse(-23,4,22,8).fillEllipse(20,8,17,7);
 const im=s.add.image(0,0,'atlas','item'+(kind+3)).setOrigin(.5,1).setDisplaySize(size*(g==='grand'?1.12:g==='sapling'?.85:1),size);
 if(cond==='wilt')im.setAngle(-5).setScale(im.scaleX,im.scaleY*.94);if(cond==='rot')im.setAngle(-9).setScale(im.scaleX*.96,im.scaleY*.88);c.add(im);
 if(cond==='rot')rotting(s,c,size);
 if(cond==='dull')gr.fillStyle(0xd8c16a).fillEllipse(-14,5,7,3);
 litter(FALL[cond].litter,size*.28);
}
// bark going soft: dark patches on the trunk, a snapped branch, mushrooms at the foot
function rotting(s:Phaser.Scene,c:Phaser.GameObjects.Container,size:number){
 const ov=s.add.graphics();c.add(ov);ov.fillStyle(0x4f3f30,.55).fillEllipse(-3,-size*.18,9,14).fillEllipse(5,-size*.3,6,9);
 ov.lineStyle(4,0x6b5642).lineBetween(8,-size*.42,24,-size*.36).lineStyle(3,0x6b5642).lineBetween(24,-size*.36,30,-size*.24);
 for(const [x,y,r] of [[-14,-2,5],[12,0,4],[-20,3,3.5]] as const){ov.fillStyle(0xe7dcc4).fillRect(x-1,y-4,2,5).fillStyle(0xb9694c).fillEllipse(x,y-4,r*2,r*1.1)}}
