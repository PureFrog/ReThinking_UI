// The map of the garden (one place for where things are, so the 3D world, the walking and the DOM map agree).
// x runs east, z south (toward the usual camera). The middle is the first garden (house, campfire, farm, pond);
// around it: the orchard east (more plots), the case library north up the forest path, the stream south with its
// bridge, and the league square beyond it. A ring of forest closes the edge.
// 2026-11-16 "맵이 조금 더 넓게": the layout is written compact and spread out by core/world.ts (SPREAD), the walk 22 → 32
export const WORLD={R:80/* sphere radius: big enough that walking to the edge is not a steep slope */,walk:32/* how far from the middle the player may walk */};
// holding plots: rows of beds in the farm and the orchard, then the land opened with coins (app/core/land.ts; every
// index is fixed, core/portfolio.ts freePlots fills the open ones in order)
import {ALL_PLOTS,BUILDINGS,CITIES,type Built} from '../core/land';
import {SPREAD,spread} from '../core/world';
export const PLOTS:[number,number][]=ALL_PLOTS;
// the stream: its middle line, how wide the water is, and the one bridge across it
export const streamZ=(x:number)=>SPREAD*(13.6+1.1*Math.sin(x/SPREAD*0.22));
export const STREAM={half:1.0,bank:0.5,from:-42,to:42};
export const BRIDGE={x:-2*SPREAD,half:1.9/* along the stream's crossing, either side of the middle */};
export const inStream=(x:number,z:number,pad=0)=>Math.abs(z-streamZ(x))<STREAM.half+pad&&Math.abs(x-BRIDGE.x)>0.9;
export const southOfStream=(x:number,z:number)=>z>streamZ(x);
// named places: where they stand (x,z,rot) and where the player stops to use them (walk)
export type PlaceId='home'|'farm'|'orchard'|'library'|'plaza'|'observatory'|'cart'|'pond';
const PLACES0:{id:PlaceId;label:string;x:number;z:number;rot:number;walk:{x:number;z:number}}[]=[
  {id:'home',label:'집',x:-5.5,z:-3,rot:0.5,walk:{x:-4.3,z:-0.8}},
  {id:'farm',label:'밭',x:4.6,z:1,rot:0,walk:{x:3.2,z:3}},
  {id:'orchard',label:'과수원',x:12.2,z:1.4,rot:0,walk:{x:8.8,z:1.2}},
  {id:'library',label:'사례 서고',x:1,z:-16.5,rot:0,walk:{x:1,z:-13.6}},
  {id:'plaza',label:'리그 광장',x:-2,z:19.6,rot:0,walk:{x:-2,z:17.4}},
  {id:'observatory',label:'관측소',x:-9,z:1.2,rot:1.25,walk:{x:-7,z:1.8}},
  {id:'cart',label:'꽃집',x:-3.6,z:5.3,rot:0.5,walk:{x:-2.6,z:6}},
  {id:'pond',label:'연못',x:0.5,z:8,rot:0,walk:{x:2.6,z:6}},
];
// each place moves out with its walk point (the spot in front of it keeps its distance)
export const PLACES=PLACES0.map(p=>{const dx=(SPREAD-1)*p.x,dz=(SPREAD-1)*p.z;return {...p,x:p.x+dx,z:p.z+dz,walk:{x:p.walk.x+dx,z:p.walk.z+dz}}});
export const place=(id:PlaceId)=>PLACES.find(p=>p.id===id)!;
// solid footprints the player walks around, not through (2026-11-16 "캐릭터가 건물을 통과"): circles on the ground.
// Each place's walk point stays outside its circle. Bought buildings and landmarks join when they stand.
const SOLID_R:Partial<Record<PlaceId,number>>={home:2.1,library:2.4,observatory:1.5,cart:0.8};
const BUILDING_R:Record<string,number>={greenhouse:1.7,silo:1.3,windmill:1.4};
export type Solid={x:number;z:number;r:number};
export function solids(built:Built|null|undefined):Solid[]{
  const out:Solid[]=PLACES.flatMap(p=>SOLID_R[p.id]?[{x:p.x,z:p.z,r:SOLID_R[p.id]!}]:[]);
  for(const b of BUILDINGS)if(built?.buildings.includes(b.id))out.push({x:b.at[0],z:b.at[1],r:BUILDING_R[b.id]??1.4});
  for(const c of CITIES)if(built?.cities.includes(c.id))out.push({x:c.at[0],z:c.at[1],r:1.9});
  return out;
}
// moves a point out to the edge of any solid it is inside (pad: the player's own width); true if it moved
export function pushOut(p:{x:number;z:number},list:Solid[],pad=0.35){let moved=false;
  for(const s of list){const dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),r=s.r+pad;if(d>=r)continue;
    const k=d<1e-4?0:r/d;p.x=d<1e-4?s.x+r:s.x+dx*k;p.z=d<1e-4?s.z:s.z+dz*k;moved=true}
  return moved;
}
// the dirt paths between them (polylines), drawn as stepping stones
const PATHS0:[number,number][][]=[
  [[0,1.5],[0.4,-3.5],[0.6,-7.5],[1.2,-10.5],[1,-13.6]],
  [[-0.6,3.6],[-1.6,6],[-2.6,9],[-2,11.2],[-2,16],[-2,17.4]],
  [[1.2,2.6],[3.6,4.3],[8.8,4.1],[8.8,1.2]],
  [[-1.4,1.4],[-4.4,1.6],[-7,1.8]],
];
// the ends meet the places' walk points (moved with them), the stones between spread evenly
export const PATHS:[number,number][][]=PATHS0.map(l=>l.map(([x,z],i)=>i===0||i===l.length-1?spread(x,z):[x*SPREAD,z*SPREAD] as [number,number]));
// Where the player walks when tapping (x,z): clamped to the edge, never into the water; across the stream only by
// the bridge (the walk goes to its near end, over, then on). Returns the stops in order, or null if it cannot go.
export function route(from:{x:number;z:number},to:{x:number;z:number},inPond:(x:number,z:number)=>boolean):{x:number;z:number}[]|null{
  const d=Math.hypot(to.x,to.z),k=d>WORLD.walk?WORLD.walk/d:1,t={x:to.x*k,z:to.z*k};
  if(inPond(t.x,t.z)||inStream(t.x,t.z,0.2))return null;
  if(southOfStream(from.x,from.z)===southOfStream(t.x,t.z))return [t];
  const mid=streamZ(BRIDGE.x),s=southOfStream(from.x,from.z)?1:-1;
  return [{x:BRIDGE.x,z:mid+s*BRIDGE.half},{x:BRIDGE.x,z:mid-s*BRIDGE.half},t];
}
