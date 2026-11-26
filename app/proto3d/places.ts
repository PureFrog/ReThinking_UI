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
import {TAILOR_STALL,NEWS_BOARD,MERCHANT_STALL,FARM_CART} from '../content/villagers';
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
  {id:'library',label:'도서관',x:2.571,z:-10.071,rot:0,walk:{x:2.571,z:-8.571}},
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
  // (World3D.tsx ArcadeHouse) on the right, its door turned to the split
  plaza:{x:-9.4,z:27.2,rot:0,walk:{x:-9.4,z:22.6}},
  // 2026-11-26: the capsule-dome arcade (World3D.tsx ArcadeHouse, ARCADE_R 3.0); its walk point 1.0 out from the door
  arcade:{x:4.0,z:27.6,rot:-2.0,walk:{x:0.36,z:25.94}},
};
export const PLACES=PLACES1.map(p=>PLACE_AT[p.id]?{...p,...PLACE_AT[p.id]!,label:p.id==='library'?'도서관':p.label}:p);
export const place=(id:PlaceId)=>PLACES.find(p=>p.id===id)!;
// solid footprints the player walks around, not through (2026-11-16 "캐릭터가 건물을 통과"): circles on the ground.
// Each place's walk point stays outside its circle. Bought buildings and landmarks join when they stand.
const SOLID_R:Partial<Record<PlaceId,number>>={master:2.7,home:2.4,library:2.6,observatory:1.5,cart:2.1,arcade:3.1};
export const BUILDING_R:Record<string,number>={greenhouse:1.7,silo:1.3,windmill:1.4};
// keep: always walked round, even when a goal lies inside it (the fire: a seat by it must not open a way through the flames)
export type Solid={x:number;z:number;r:number;keep?:boolean;live?:string/* a person standing there (NPC_LIVE id) */};
// the rocks (Scene3D ROCKS, x z scale, spread) and the signpost, shared with the scene
export const ROCK_AT=([[-5,4.4,0.7],[-7.2,4.6,0.55],[8.4,6,0.9],[3.4,5.2,0.5]] as number[][]).map(([x,z,sc])=>[...spread(x,z),sc] as [number,number,number]);
export const SIGNPOST_AT=(()=>{const [x,z]=spread(-1.9,3.5);return {x,z}})();
function solids0():Solid[]{return solids(null,false)}
export function solids(built:Built|null|undefined,lamps=true):Solid[]{
  const out:Solid[]=PLACES.flatMap(p=>SOLID_R[p.id]?[{x:p.x,z:p.z,r:SOLID_R[p.id]!}]:[]);
  // 피드백 2026-11-23: the merchant's shop and the clothes shop are houses now (Shop3D.tsx)
  for(const t of [TAILOR_STALL])out.push({x:t.x,z:t.z,r:2.1});
  for(const b of BUILDINGS)if(built?.buildings.includes(b.id)){const [x,z]=buildingAt(b,built);out.push({x,z,r:BUILDING_R[b.id]??1.4})}
  for(const c of CITIES)if(built?.cities.includes(c.id))out.push({x:c.at[0],z:c.at[1],r:1.9});
  // 피드백 2026-11-26 "바위, 푯말 다 통과": the rocks, the boards and stalls, the cart and the stadium's stands are solid too
  for(const [x,z,sc] of ROCK_AT)out.push({x,z,r:sc*0.9});
  out.push({x:NEWS_BOARD.x,z:NEWS_BOARD.z,r:0.95},{...SIGNPOST_AT,r:0.35},{x:MERCHANT_STALL.x,z:MERCHANT_STALL.z,r:1.3},{x:FARM_CART.x,z:FARM_CART.z,r:1.1});
  {const pz=PLACES.find(p=>p.id==='plaza')!;for(let k=0;k<22;k++){const a=-Math.PI/2+0.75+k*(Math.PI*2-1.5)/21;out.push({x:pz.x+Math.cos(a)*3.45,z:pz.z+Math.sin(a)*3.45,r:0.45})}}
  // the lamps, and the campfire: nobody walks through the flames (피드백 2026-11-26). Not while the lamps are being placed
  // (the fire is declared further down)
  // 피드백 2026-11-26 "NPC들이 모닥불에 끼어": the fire covers its whole stone ring (FIRE_R, kept: never dropped as "the
  // goal is inside it", npcStep), and the stumps, lantern and log basket round it (FIRE_DECOR) are solid too
  if(lamps){for(const l of LAMP_AT)out.push({...l,r:0.22});out.push({x:FIRE[0],z:FIRE[1],r:FIRE_R,keep:true});
    for(const [x,z,r] of FIRE_DECOR)out.push({x:FIRE[0]+x,z:FIRE[1]+z,r})}
  return out;
}
// 피드백 2026-11-26 "NPC들이 나무도 바위도 통과": what the village's people walk round (Scene3D sets it: the walls above
// plus the scenery trees). npcStep moves one step toward a goal: straight if clear, else the nearest turn either side
// (keeping the side it chose last, so it does not wobble), and never deeper into anything.
let NPC_WALLS:Solid[]=[];
export const setNpcWalls=(l:Solid[])=>{NPC_WALLS=l};
export const npcWalls=()=>NPC_WALLS;
// where each of the village's people is now (Village3D, Analyst3D write it every frame): they walk round each other too
export const NPC_LIVE:Record<string,{x:number;z:number}>={};
if(typeof window!=='undefined')(window as unknown as {__npcLive?:unknown}).__npcLive=NPC_LIVE;// e2e: where everyone stands
// 피드백 2026-11-26 "NPC들끼리, 나도 서로 몸을 통과": everyone standing or walking (me too, as 'me') is a small circle to go round
export const PERSON_R=0.3;
export const npcAround=(id:string,base:Solid[]=NPC_WALLS):Solid[]=>{const out=[...base];for(const k in NPC_LIVE)if(k!==id)out.push({...NPC_LIVE[k],r:PERSON_R,live:k});return out};
// who a step from (x,z) to (nx,nz) would walk into (going deeper into their circle), if anyone
export const walksInto=(id:string,x:number,z:number,nx:number,nz:number,pad=0.3):string|null=>{for(const k in NPC_LIVE){if(k===id)continue;const o=NPC_LIVE[k],d=Math.hypot(nx-o.x,nz-o.z);
  if(d<PERSON_R+pad&&d<Math.hypot(x-o.x,z-o.z)-1e-4)return k}return null};
const deeper=(x:number,z:number,fx:number,fz:number,list:Solid[],pad:number)=>list.some(w=>{const d=Math.hypot(x-w.x,z-w.z);return d<w.r+pad&&d<Math.hypot(fx-w.x,fz-w.z)-1e-4});
// 피드백 2026-11-26 "막히면 돌아가지 못하고 랙 걸리듯 난리": the way round keeps to one side while it is needed (no flipping
// side to side each frame), and a walk that has not got closer for a while gives up (returns false: the caller stops
// and waits for its next goal)
type Walker={x:number;z:number;side?:number;hold?:number;best?:number;since?:number;gx?:number;gz?:number};
export function npcStep(p:Walker,gx:number,gz:number,m:number,list:Solid[]=NPC_WALLS,pad=0.3):boolean{
  const dx=gx-p.x,dz=gz-p.z,d=Math.hypot(dx,dz);if(d<1e-4)return false;const s=Math.min(d,m),base=Math.atan2(dx,dz);
  if(p.gx!==gx||p.gz!==gz){p.gx=gx;p.gz=gz;p.best=d;p.since=0;p.hold=0}
  if(d<(p.best??Infinity)-0.05){p.best=d;p.since=0}else p.since=(p.since??0)+1;
  if((p.since??0)>200)return false;
  // a goal inside something (a seat, the cart, a spot by a tree): that one is not in the way
  // (a person standing on the goal, or the fire, is still gone round: one waits beside them rather than walking through)
  if(list.some(w=>!w.live&&!w.keep&&Math.hypot(gx-w.x,gz-w.z)<w.r+pad))list=list.filter(w=>w.live||w.keep||Math.hypot(gx-w.x,gz-w.z)>=w.r+pad);
  const free=(a:number)=>{const nx=p.x+Math.sin(a)*s,nz=p.z+Math.cos(a)*s;return deeper(nx,nz,p.x,p.z,list,pad)?null:[nx,nz]};
  const go=(xz:number[])=>{p.x=xz[0];p.z=xz[1];return true};
  // straight on when clear and not in the middle of going round
  if(!(p.hold&&p.hold>0)){const st=free(base);if(st)return go(st)}
  else p.hold--;
  // going round: the side chosen keeps until clear of the obstacle (hold); first time, the side that turns least
  const OFF=[0.4,0.8,1.2,1.6,2.0,2.4,2.8];
  const first=(k:number)=>{for(const o of OFF){const xz=free(base+o*k);if(xz)return {o,xz}}return null};
  let sd=p.side;
  if(!sd||!(p.hold&&p.hold>0)){const L=first(1),R=first(-1);if(!L&&!R)return false;sd=!R||(L&&L.o<=R.o)?1:-1}
  const r=first(sd)??first(-sd);if(!r)return false;
  if(free(base)&&r.o<=0.4){p.hold=0}else{p.side=sd;p.hold=Math.max(p.hold??0,25)}
  return go(r.xz);
}
// a walker that gave up (npcStep false) may push straight on through the small things, never into a kept one (the
// fire); true if it moved
export function straightOn(p:{x:number;z:number},gx:number,gz:number,m:number,list:Solid[]=NPC_WALLS,pad=0.3):boolean{
  const dx=gx-p.x,dz=gz-p.z,d=Math.hypot(dx,dz);if(d<1e-4)return false;const s=Math.min(d,m),nx=p.x+dx/d*s,nz=p.z+dz/d*s;
  // the fire (keep) and people standing about (live) are never walked through, even when blocked a long while
  if(deeper(nx,nz,p.x,p.z,list.filter(w=>w.keep||w.live),pad))return false;p.x=nx;p.z=nz;return true;
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
// 피드백 2026-11-26 "밤에 너무 어두운 공간, 모동숲 느낌 램프": a little lamp post by a few doors (then "너무 많아": the ones
// along the paths are gone). Never in the water or on a wall; solid like the posts.
export const LAMP_AT:{x:number;z:number}[]=(()=>{const out:{x:number;z:number}[]=[];const walls=solids0();
  const ok=(x:number,z:number)=>!inStream(x,z,1.2)&&Math.hypot(x-BRIDGE.x,z-streamZ(BRIDGE.x))>3.2&&Math.hypot(x,z)<WORLD.walk-1&&
    !walls.some(w=>Math.hypot(x-w.x,z-w.z)<w.r+0.9)&&!out.some(o=>Math.hypot(x-o.x,z-o.z)<5.5)&&!PATHS1.some(l=>l.some(([a,b])=>Math.hypot(a-x,b-z)<0.75));
  const put=(x:number,z:number)=>{if(ok(x,z))out.push({x,z})};
  // 피드백 2026-11-26 "가로수가 너무 많아, 꼭 필요한 곳만": one lamp beside each door that is dark at night
  for(const id of ['master','arcade','plaza','library','home'] as PlaceId[]){const p=PLACES.find(q=>q.id===id);if(!p)continue;
    const dx=p.walk.x-p.x,dz=p.walk.z-p.z,d=Math.hypot(dx,dz)||1,nx=-dz/d,nz=dx/d;for(const sd of [1,-1]){const n=out.length;put(p.walk.x+nx*1.5*sd,p.walk.z+nz*1.5*sd);if(out.length>n)break}}
  return out})();
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
// the fire's stone ring (VillageNature.tsx CampfireDecor: stones at 0.66, ~0.14 across), and what stands round it,
// from the fire (x, z, solid radius): three stumps (one with the lantern) and the basket of logs
export const FIRE_R=0.85;
export const FIRE_DECOR:[number,number,number][]=[[1.4,0.6,0.3],[-1.3,0.8,0.3],[-0.4,1.5,0.3],[-1.6,-0.6,0.32]];
// the fallen log beside it (a seat): its middle, and the way one sitting on it faces (toward the fire)
export const FIRE_LOG={x:FIRE[0]+0.6,z:FIRE[1]-1.3};
export const FIRE_SEAT={...FIRE_LOG,face:Math.atan2(FIRE[0]-FIRE_LOG.x,FIRE[1]-FIRE_LOG.z)};
// 피드백 2026-11-26 "NPC들도 모닥불에 앉아 있고": the far end of the log and two stumps round the fire, where the village's
// people sit a while on their rounds (facing the fire)
export const NPC_FIRE_SEATS=([[FIRE_LOG.x+0.92*0.8,FIRE_LOG.z-0.39*0.8],[FIRE[0]-1.35,FIRE[1]+0.55],[FIRE[0]+0.75,FIRE[1]+1.25]] as [number,number][])
  .map(([x,z])=>({x,z,face:Math.atan2(FIRE[0]-x,FIRE[1]-z)}));
