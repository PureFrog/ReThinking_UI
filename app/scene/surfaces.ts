// 11.9 house surfaces: a room's floor and walls, and the path and flower tiles laid in the yard.
// A room's first style is the house picture as drawn, so nothing is laid over it. The others use the 021 pictures
// once they are here (app/scene/assets.ts SURFACE_ART) and temporary patterns until then.
import type * as Phaser from 'phaser';
import {FLOOR_STYLES,WALL_STYLES,type Surfaces} from '../core/decorate';
import {ROOMS,HOUSE,WALL_H,insideHouse,inLockedLand,type Room} from './layout';
import {iso,pos} from './world';
import {GROUND_TILES,houseArt,surfaceArt,WALL_FIXTURES,HOUSE_ART_SIZE,HOUSE_ART_ANCHOR} from './assets';

const corner=(x:number,y:number,up=0)=>{const p=iso(x,y);return {x:p.x,y:p.y-15-up}};
// the walls a room shows: its back wall, and the left wall when it stands on the house's left edge
export const roomWalls=(r:Room)=>{const H=HOUSE[r.floor];return {back:{x0:r.x0-.5,x1:r.x1+.5,y:H.y0-.5},left:r.x0===H.x0?{y0:r.y0-.5,y1:r.y1+.5,x:H.x0-.5}:null}};
// which room's wall a press in the house lands on: above the back wall line, or left of the left wall
export function wallAt(wx:number,wy:number,floor:number){for(const r of ROOMS.filter(o=>o.floor===floor)){const w=roomWalls(r);
 const inQuad=(pts:{x:number;y:number}[])=>{let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>wy)!==(b.y>wy)&&wx<(b.x-a.x)*(wy-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside};
 if(inQuad([corner(w.back.x0,w.back.y),corner(w.back.x1,w.back.y),corner(w.back.x1,w.back.y,WALL_H),corner(w.back.x0,w.back.y,WALL_H)]))return r;
 if(w.left&&inQuad([corner(w.left.x,w.left.y0),corner(w.left.x,w.left.y1),corner(w.left.x,w.left.y1,WALL_H),corner(w.left.x,w.left.y0,WALL_H)]))return r}return null}
// where a tile may go: the yard's open ground (not the house, the farm, the props, nor land still locked)
export const canTile=(x:number,y:number,blocked:Set<string>,landOpen:boolean,floor1:(x:number,y:number)=>boolean)=>floor1(x,y)&&!insideHouse(x,y)&&!blocked.has(`${x},${y}`)&&(landOpen||!inLockedLand(x,y));

// layer: draws one of the house's whole canvases on a floor (game.ts), used for the wall fixtures over wallpaper
export function drawSurfaces(scene:Phaser.Scene,s:Surfaces,layer:(name:string,floor:1|2|3,depth:number)=>Phaser.GameObjects.Image|null):Phaser.GameObjects.GameObject[]{const out:Phaser.GameObjects.GameObject[]=[];const has=(k:string)=>scene.textures.exists(k);
 for(const r of ROOMS){const floor=s.floor?.[r.id],wall=s.wall?.[r.id];
  const fs=FLOOR_STYLES.find(f=>f.id===floor);if(fs&&fs.colors.length){const art=surfaceArt('floor',fs.id);
   const g=scene.add.graphics().setDepth(.6);out.push(g);
   for(let x=r.x0;x<=r.x1;x++)for(let y=r.y0;y<=r.y1;y++){const p=pos(x,y);if(has(art.key)){out.push(scene.add.image(p.x,p.y,art.key).setDisplaySize(88,44).setDepth(.6));continue}
    const c=fs.id==='check'?fs.colors[(x+y)%2]:fs.id==='honey'?fs.colors[x%2]:fs.colors[(x*3+y*5)%2];
    g.fillStyle(c).fillPoints([{x:p.x,y:p.y-21.5},{x:p.x+43,y:p.y},{x:p.x,y:p.y+21.5},{x:p.x-43,y:p.y}],true);
    if(fs.id==='honey'){g.lineStyle(1,0xb88c55,.5).lineBetween(p.x-21.5,p.y-10.75,p.x+21.5,p.y+10.75)}
    if(fs.id==='moss'){g.fillStyle(0xbccb9f,.7).fillCircle(p.x-10,p.y-3,2).fillCircle(p.x+12,p.y+4,1.6)}}}
  const ws=WALL_STYLES.find(w=>w.id===wall);if(ws&&ws.colors.length){const w=roomWalls(r);const g=scene.add.graphics().setDepth(.55);out.push(g);
   // one wall panel per cell along the wall: [from, to] along it, and the point at a place along it and a height
   const panels:[(a:number,up:number)=>{x:number;y:number},number,number,'back'|'left'][]=[[(a,up)=>corner(a,w.back.y,up),w.back.x0,w.back.x1,'back']];
   if(w.left){const L=w.left;panels.push([(a,up)=>corner(L.x,a,up),L.y0,L.y1,'left'])}
   for(const [at,a0,a1,side] of panels){const art=surfaceArt('wall',ws.id,side);
    for(let a=a0;a<a1-.01;a++){const b=Math.min(a1,a+1);
     if(has(art.key)){const bottom=at((a+b)/2,0);out.push(scene.add.image(bottom.x,bottom.y+11,art.key).setOrigin(.5,1).setDisplaySize(44,252)/* 88×504 drawn at 2× */.setDepth(.55));continue}
     g.fillStyle(ws.colors[0]).fillPoints([at(a,0),at(b,0),at(b,WALL_H),at(a,WALL_H)],true);
     if(ws.id==='stripe')for(let t=.25;t<1;t+=.5){const m0=a+(b-a)*t,m1=a+(b-a)*(t+.18);g.fillStyle(ws.colors[1]).fillPoints([at(m0,0),at(m1,0),at(m1,WALL_H),at(m0,WALL_H)],true)}
     if(ws.id==='sprig')for(let k=0;k<4;k++){const q=at(a+(b-a)*(k%2?.7:.3),30+k*48);g.fillStyle(ws.colors[1]).fillCircle(q.x,q.y,3).fillStyle(0x93a97f).fillCircle(q.x+4,q.y+3,1.6)}
     if(ws.id==='plank'){for(let up=38;up<WALL_H;up+=38){g.lineStyle(1.5,ws.colors[1]).lineBetween(at(a,up).x,at(a,up).y,at(b,up).x,at(b,up).y)}}
     // a skirting board along the foot
     g.fillStyle(0xbfa07a).fillPoints([at(a,0),at(b,0),at(b,10),at(a,10)],true)}}}}
 // what hangs on the walls (windows, cabinets) goes back over any wallpaper on that floor
 for(const f of [1,2,3] as const)if(ROOMS.some(r=>r.floor===f&&WALL_STYLES.find(w=>w.id===s.wall?.[r.id])?.colors.length)){const o=layer(WALL_FIXTURES[f],f,.57);if(o)out.push(o)}
 for(const [k,t] of Object.entries(s.tiles??{})){const [x,y]=k.split(',').map(Number);const p=iso(x,y);
  if(t==='flower'){const f=houseArt((x+y)%2?'yard_flower_patch_2':'yard_flower_patch_1');if(has(f.key)){out.push(scene.add.image(p.x,p.y,f.key).setOrigin(.5,HOUSE_ART_ANCHOR).setDisplaySize(HOUSE_ART_SIZE,HOUSE_ART_SIZE).setDepth(p.y));continue}
   const g=scene.add.graphics().setDepth(p.y);out.push(g);g.fillStyle(0x8fab7e).fillEllipse(p.x,p.y,48,18);for(let i=0;i<6;i++)g.fillStyle(i%2?0xf3d7a9:0xe7a99c).fillCircle(p.x-17+(i%3)*16,p.y-7-Math.floor(i/3)*9,5);continue}
  const tile=t==='stone'?GROUND_TILES.stone:GROUND_TILES.path;if(has(tile.key)){out.push(scene.add.image(p.x,p.y,tile.key).setDisplaySize(88,44).setDepth(.3));continue}
  const g=scene.add.graphics().setDepth(.3);out.push(g);g.fillStyle(t==='stone'?0xe8dec6:0xd9c7a4).fillEllipse(p.x,p.y,t==='stone'?56:70,t==='stone'?24:30)}
 return out}
