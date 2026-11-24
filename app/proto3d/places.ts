// The map of the garden (one place for where things are, so the 3D world, the walking and the DOM map agree).
// x runs east, z south (toward the usual camera). The middle is the first garden (house, campfire, farm, pond);
// around it: the orchard east (more plots), the case library north up the forest path, the stream south with its
// bridge, and the league square beyond it. A ring of forest closes the edge.
// 2026-11-16 "맵이 조금 더 넓게": the layout is written compact and spread out by core/world.ts (SPREAD), the walk 22 → 32
export const WORLD={R:80/* sphere radius: big enough that walking to the edge is not a steep slope */,walk:32/* how far from the middle the player may walk */};
// holding plots: rows of beds in the farm and the orchard, then the land opened with coins (app/core/land.ts; every
// index is fixed, core/portfolio.ts freePlots fills the open ones in order)
import {ALL_PLOTS,BUILDINGS,CITIES,buildingAt,type Built} from '../core/land';
import {SPREAD,spread} from '../core/world';
import {TAILOR_STALL} from '../content/villagers';
export const PLOTS:[number,number][]=ALL_PLOTS;
// the stream: its middle line, how wide the water is, and the one bridge across it
export const streamZ=(x:number)=>SPREAD*(13.6+1.1*Math.sin(x/SPREAD*0.22));
export const STREAM={half:1.0,bank:0.5,from:-42,to:42};
export const BRIDGE={x:-2*SPREAD,half:1.9/* along the stream's crossing, either side of the middle */};
// 피드백 2026-11-24 "다리가 통과돼": the water is open only between the bridge's rails (its deck), and the rails are walls
export const BRIDGE_DECK=0.42/* half the width walked on, inside the rails at ±0.72 */;
export const inStream=(x:number,z:number,pad=0)=>Math.abs(z-streamZ(x))<STREAM.half+pad&&Math.abs(x-BRIDGE.x)>BRIDGE_DECK;
// on the bridge's length: 'deck' between the rails, 'rail' in a rail (never stood in), else 'off'
export function bridgeZone(x:number,z:number):'deck'|'rail'|'off'{if(Math.abs(z-streamZ(BRIDGE.x))>=BRIDGE.half)return 'off';
  const dx=Math.abs(x-BRIDGE.x);return dx<BRIDGE_DECK?'deck':dx>1.05?'off':'rail'}
// a step that goes through a rail (into it, or from the deck to beside the bridge or back) is not taken
export const bridgeBlocks=(a:{x:number;z:number},b:{x:number;z:number})=>{const za=bridgeZone(a.x,a.z),zb=bridgeZone(b.x,b.z);
  return zb==='rail'||(za==='deck'&&zb==='off'&&Math.abs(b.z-streamZ(BRIDGE.x))<BRIDGE.half)||(za==='off'&&zb==='deck'&&Math.abs(a.z-streamZ(BRIDGE.x))<BRIDGE.half)};
// how high the deck is over the ground at a point on it (the planks' arch, World3D Bridge); 0 off the deck
export function bridgeLift(x:number,z:number){if(bridgeZone(x,z)!=='deck')return 0;const t=(z-streamZ(BRIDGE.x)+BRIDGE.half)/(2*BRIDGE.half);return 0.225+0.42*Math.sin(Math.PI*t)}
export const southOfStream=(x:number,z:number)=>z>streamZ(x);
// named places: where they stand (x,z,rot) and where the player stops to use them (walk)
export type PlaceId='master'|'home'|'farm'|'orchard'|'library'|'plaza'|'arcade'|'observatory'|'cart'|'pond';
const PLACES0:{id:PlaceId;label:string;x:number;z:number;rot:number;walk:{x:number;z:number}}[]=[
  // 2026-11-18 (user): the house is a cottage at the end of a straight stone path north from the middle, past the campfire (door 2.9 in front);
  // the 서고 is a bookshelf with a sign beside it, tapped from outside; the 꽃집 took the old house's grass
  {id:'home',label:'집',x:0,z:-10.5,rot:0,walk:{x:0,z:-7.6}},
  {id:'farm',label:'밭',x:4.6,z:1,rot:0,walk:{x:3.2,z:3}},
  {id:'orchard',label:'과수원',x:12.2,z:1.4,rot:0,walk:{x:8.8,z:1.2}},
  {id:'library',label:'사례 서고',x:2.571,z:-10.071,rot:0,walk:{x:2.571,z:-8.571}},
  {id:'plaza',label:'리그 광장',x:-2,z:19.6,rot:0,walk:{x:-2,z:17.4}},
  {id:'arcade',label:'오락실',x:0,z:0,rot:0,walk:{x:0,z:0}},
  // 2026-11-20: the 관측소 (퀘스트 게시판) is gone; the pond and 나루's fishing spot stand in its place (quests: the HUD)
  // 피드백 2026-11-22: the shop (with the clothes and building clerks) where the pond was, west of the middle
  {id:'cart',label:'건물 상점',x:-9.0,z:0.2,rot:1.2,walk:{x:-7.8,z:0.7}},
  // 2026-11-23: 거장의 집 (a teammate's model): off on its own to the west-north-west (피드백 2026-11-24: not by the cottage, not across the water), clear of the building lots, facing the middle
  {id:'master',label:'거장의 집',x:0,z:0,rot:0,walk:{x:0,z:0}},
  {id:'pond',label:'낚시터',x:5.5/1.4,z:13.6/1.4,rot:0,walk:{x:8.1/1.4,z:12.6/1.4}},// walk: by 나루 the otter (fishing), where the old 관측소 stood
];
// each place moves out with its walk point (the spot in front of it keeps its distance)
const PLACES1=PLACES0.map(p=>{const dx=(SPREAD-1)*p.x,dz=(SPREAD-1)*p.z;return {...p,x:p.x+dx,z:p.z+dz,walk:{x:p.walk.x+dx,z:p.walk.z+dz}}});
// 피드백 2026-11-23 "맵을 넓게": the shop goes out to the far west, the library stands again as a building north-east
// (spread coordinates, written directly)
const PLACE_AT:Partial<Record<PlaceId,{x:number;z:number;rot:number;walk:{x:number;z:number}}>>={
  cart:{x:-19.0,z:0.8,rot:1.2,walk:{x:-16.4,z:1.8}},
  library:{x:11.5,z:-12.5,rot:-0.74,walk:{x:9.3,z:-10.1}},
  // 피드백 2026-11-24 "돌길 일직선으로 볼 때 앞에 보이게, 집처럼": the house stands on the straight path's line, its door facing back down it
  master:{x:-15.8,z:-14.6,rot:0.366,walk:{x:-14.5,z:-11.2}},
  // 피드백 2026-11-24: the fields side by side in the east (core/land.ts FIELD_AT); walk: outside each west gate
  farm:{x:18,z:-4.7,rot:0,walk:{x:11.0,z:-4.7}},
  orchard:{x:18,z:5.0,rot:0,walk:{x:10.8,z:5.0}},
  // 피드백 2026-11-24 "왼쪽 리그광장 오른쪽 오락실": over the bridge the path splits; the plaza on the left, the arcade
  // (a teammate's model, World3D.tsx ArcadeHouse) on the right, its door turned to the split
  plaza:{x:-9.4,z:27.2,rot:0,walk:{x:-6.4,z:25.4}},
  arcade:{x:4.0,z:27.6,rot:-2.0,walk:{x:1.3,z:26.37}},
};
export const PLACES=PLACES1.map(p=>PLACE_AT[p.id]?{...p,...PLACE_AT[p.id]!,label:p.id==='library'?'도서관':p.label}:p);
export const place=(id:PlaceId)=>PLACES.find(p=>p.id===id)!;
// solid footprints the player walks around, not through (2026-11-16 "캐릭터가 건물을 통과"): circles on the ground.
// Each place's walk point stays outside its circle. Bought buildings and landmarks join when they stand.
const SOLID_R:Partial<Record<PlaceId,number>>={master:2.7,home:2.4,library:2.6,observatory:1.5,cart:2.1,arcade:2.3};
export const BUILDING_R:Record<string,number>={greenhouse:1.7,silo:1.3,windmill:1.4};
export type Solid={x:number;z:number;r:number};
export function solids(built:Built|null|undefined):Solid[]{
  const out:Solid[]=PLACES.flatMap(p=>SOLID_R[p.id]?[{x:p.x,z:p.z,r:SOLID_R[p.id]!}]:[]);
  // 피드백 2026-11-23: the merchant's shop and the clothes shop are houses now (Shop3D.tsx)
  for(const t of [TAILOR_STALL])out.push({x:t.x,z:t.z,r:2.1});
  for(const b of BUILDINGS)if(built?.buildings.includes(b.id)){const [x,z]=buildingAt(b,built);out.push({x,z,r:BUILDING_R[b.id]??1.4})}
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
  // along the front of the two fields (2026-11-20: no more cut up between them; each field's gate has its own branch);
  // 2026-11-21: further south, past the fields' 4th row (9 → 12 plots)
  [[1.2,2.6],[3.6,7],[8.8,7],[12.4,7]],
  [[-1.4,1.4],[-4.4,1.6],[-7,1.8]],
];
// the ends meet the places' walk points (moved with them), the stones between spread evenly
const PATHS1:[number,number][][]=PATHS0.map(l=>l.map(([x,z],i)=>i===0||i===l.length-1?spread(x,z):[x*SPREAD,z*SPREAD] as [number,number]));
// 피드백 2026-11-24 "상인한테는 돌길 할필요없어": the path along the old field fronts stops where 가상 종목 밭's gate stones join it
PATHS1[2]=[PATHS1[2][0],PATHS1[2][1],[12.0,9.8]];
// 피드백 2026-11-24 "이 길 없애는 게 깔끔하지 않아?": the old path round the south of the fields (to the rock by 가상 종목 밭)
// is gone; the fields are reached by the T path only (emptied, not removed, so the paths after it keep their places)
PATHS1[2]=[];
// 피드백 2026-11-24 "돌길 이렇게": one straight path from the middle east to the farmer, then a branch to each field's
// west gate (core/land.ts FIELD_AT; the gates' own short paths are gone)
PATHS1.push([[0.6,0.2],[5,0.15],[10.2,0.1]],[[10.2,0.1],[10.2,-2.4],[10.2,-4.7],[11.7,-4.7]],[[10.2,0.1],[10.2,2.6],[10.2,5.0],[11.5,5.0]]);
// 2026-11-18: the north path runs straight from the middle (past the campfire) to the cottage's door (spread coordinates)
const HOME_WALK=PLACES.find(p=>p.id==='home')!.walk;
PATHS1[0]=[[HOME_WALK.x,PATHS1[0][0][1]],[HOME_WALK.x,HOME_WALK.z]];
// 피드백 2026-11-23: the west path runs on to the shop's new corner; a path north-east to the library
{const cw=PLACES.find(p=>p.id==='cart')!.walk,lw=PLACES.find(p=>p.id==='library')!.walk,st=PATHS1[3][0];
  PATHS1[3]=[st,[(st[0]+cw.x)/2,(st[1]+cw.z)/2+0.6],[cw.x,cw.z]];
  PATHS1.push([[1.2*SPREAD,-2*SPREAD],[(1.7+lw.x)/2,(-2.8+lw.z)/2],[lw.x,lw.z]]);
  const mw=PLACES.find(p=>p.id==='master')!.walk;{const st=PATHS1[3][1];PATHS1.push([[st[0],st[1]-0.5],[mw.x,mw.z]])}
  // and on from the building shop's door to the clothes shop's beside it (it stood alone off the paths)
  const td={x:TAILOR_STALL.x+Math.sin(TAILOR_STALL.rot)*2.6,z:TAILOR_STALL.z+Math.cos(TAILOR_STALL.rot)*2.6};
  PATHS1.push([[cw.x,cw.z],[(cw.x+td.x)/2+0.3,(cw.z+td.z)/2],[td.x,td.z]]);}
// 피드백 2026-11-24: over the bridge the path ends at a split, one branch west to the plaza, one east to the arcade's door
{const i=PATHS1.findIndex(l=>l.some(([x,z])=>z>22));const pz=place('plaza').walk,ar=place('arcade').walk,J:[number,number]=[BRIDGE.x,24.4];
  if(i>=0){PATHS1[i]=[...PATHS1[i].filter(([,z])=>z<=22.5),J];PATHS1.push([J,[pz.x,pz.z]],[J,[(J[0]+ar.x)/2,(J[1]+ar.z)/2+0.2],[ar.x,ar.z]])}}
export const PATHS:[number,number][][]=PATHS1;
// Where the player walks when tapping (x,z): clamped to the edge, never into the water; across the stream only by
// the bridge (the walk goes to its near end, over, then on). Returns the stops in order, or null if it cannot go.
export function route(from:{x:number;z:number},to:{x:number;z:number},inPond:(x:number,z:number)=>boolean):{x:number;z:number}[]|null{
  const d=Math.hypot(to.x,to.z),k=d>WORLD.walk?WORLD.walk/d:1,t={x:to.x*k,z:to.z*k};
  if(inPond(t.x,t.z)||inStream(t.x,t.z,0.2))return null;
  if(southOfStream(from.x,from.z)===southOfStream(t.x,t.z))return [t];
  const mid=streamZ(BRIDGE.x),s=southOfStream(from.x,from.z)?1:-1,out=BRIDGE.half+0.7;
  // straight on and straight off the deck (a step out from beside the bridge first, never across a rail)
  const pre=bridgeZone(from.x,from.z)==='deck'?[]:[...(Math.abs(from.z-mid)<out?[{x:from.x,z:mid+s*out}]:[]),{x:BRIDGE.x,z:mid+s*out}];
  return [...pre,{x:BRIDGE.x,z:mid+s*BRIDGE.half},{x:BRIDGE.x,z:mid-s*BRIDGE.half},{x:BRIDGE.x,z:mid-s*out},t];
}

// 나루 the otter by the pond (feedback 11-17, docs/mockups/otter-fishing.html): where it stands, where the player stands
// to fish, and where the float lands (the middle of the big pond piece, Scene3D POND)
const at=(x:number,z:number)=>{const [a,b]=spread(x,z);return {x:a,z:b}};
// 피드백 2026-11-21: fishing moved to the stream bank east of the bridge (the open lawn right of the square's south side):
// 나루 and the player on the north bank, the float in the stream. The old pond stays as scenery.
// 피드백 2026-11-22 (village_layout.jpg "낚시터 연못"): a pond east of the middle path, near the stream; 나루 on its east bank
export const POND_AT={x:5.5,z:13.6};
// 피드백 2026-11-23: the player fishes a step apart from 나루 (they stood on top of each other)
export const NARU={x:POND_AT.x+2.9,z:POND_AT.z+0.4},FISH_STAND={x:POND_AT.x+1.9,z:POND_AT.z-1.9},FISH_AT={x:POND_AT.x+0.6,z:POND_AT.z};
void at;


// 피드백 2026-11-24 "모닥불 왼쪽으로 조금만": the campfire sits a step west of its old spot, clear of the home path and 보리
export const FIRE:[number,number]=(([x,z])=>[x-1.5,z])(spread(-1.6,-1.2));
// the fallen log beside it (a seat): its middle, and the way one sitting on it faces (toward the fire)
export const FIRE_LOG={x:FIRE[0]+0.6,z:FIRE[1]-1.3};
export const FIRE_SEAT={...FIRE_LOG,face:Math.atan2(FIRE[0]-FIRE_LOG.x,FIRE[1]-FIRE_LOG.z)};
