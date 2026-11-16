// The map of the garden (one place for where things are, so the 3D world, the walking and the DOM map agree).
// x runs east, z south (toward the usual camera). The middle is the first garden (house, campfire, farm, pond);
// around it: the orchard east (more plots), the case library north up the forest path, the stream south with its
// bridge, and the league square beyond it. A ring of forest closes the edge.
export const WORLD={R:56/* sphere radius: big enough that walking to the edge is not a steep slope */,walk:22/* how far from the middle the player may walk */};
// holding plots: rows of beds in the farm and the orchard, then the land opened with coins (app/core/land.ts; every
// index is fixed, core/portfolio.ts freePlots fills the open ones in order)
import {ALL_PLOTS} from '../core/land';
export const PLOTS:[number,number][]=ALL_PLOTS;
// the stream: its middle line, how wide the water is, and the one bridge across it
export const streamZ=(x:number)=>13.6+1.1*Math.sin(x*0.22);
export const STREAM={half:1.0,bank:0.5,from:-30,to:30};
export const BRIDGE={x:-2,half:1.9/* along the stream's crossing, either side of the middle */};
export const inStream=(x:number,z:number,pad=0)=>Math.abs(z-streamZ(x))<STREAM.half+pad&&Math.abs(x-BRIDGE.x)>0.9;
export const southOfStream=(x:number,z:number)=>z>streamZ(x);
// named places: where they stand (x,z,rot) and where the player stops to use them (walk)
export type PlaceId='home'|'farm'|'orchard'|'library'|'plaza'|'observatory'|'cart'|'pond';
export const PLACES:{id:PlaceId;label:string;x:number;z:number;rot:number;walk:{x:number;z:number}}[]=[
  {id:'home',label:'집',x:-5.5,z:-3,rot:0.5,walk:{x:-4.3,z:-0.8}},
  {id:'farm',label:'밭',x:4.6,z:1,rot:0,walk:{x:3.2,z:3}},
  {id:'orchard',label:'과수원',x:12.2,z:1.4,rot:0,walk:{x:8.8,z:1.2}},
  {id:'library',label:'사례 서고',x:1,z:-16.5,rot:0,walk:{x:1,z:-13.6}},
  {id:'plaza',label:'리그 광장',x:-2,z:19.6,rot:0,walk:{x:-2,z:17.4}},
  {id:'observatory',label:'관측소',x:-9,z:1.2,rot:1.25,walk:{x:-7,z:1.8}},
  {id:'cart',label:'수레',x:-3.6,z:5.3,rot:0.5,walk:{x:-2.6,z:6}},
  {id:'pond',label:'연못',x:0.5,z:8,rot:0,walk:{x:2.6,z:6}},
];
export const place=(id:PlaceId)=>PLACES.find(p=>p.id===id)!;
// the dirt paths between them (polylines), drawn as stepping stones
export const PATHS:[number,number][][]=[
  [[0,1.5],[0.4,-3.5],[0.6,-7.5],[1.2,-10.5],[1,-13.6]],
  [[-0.6,3.6],[-1.6,6],[-2.6,9],[-2,11.2],[-2,16],[-2,17.4]],
  [[1.2,2.6],[3.6,4.3],[8.8,4.1],[8.8,1.2]],
  [[-1.4,1.4],[-4.4,1.6],[-7,1.8]],
];
// Where the player walks when tapping (x,z): clamped to the edge, never into the water; across the stream only by
// the bridge (the walk goes to its near end, over, then on). Returns the stops in order, or null if it cannot go.
export function route(from:{x:number;z:number},to:{x:number;z:number},inPond:(x:number,z:number)=>boolean):{x:number;z:number}[]|null{
  const d=Math.hypot(to.x,to.z),k=d>WORLD.walk?WORLD.walk/d:1,t={x:to.x*k,z:to.z*k};
  if(inPond(t.x,t.z)||inStream(t.x,t.z,0.2))return null;
  if(southOfStream(from.x,from.z)===southOfStream(t.x,t.z))return [t];
  const mid=streamZ(BRIDGE.x),s=southOfStream(from.x,from.z)?1:-1;
  return [{x:BRIDGE.x,z:mid+s*BRIDGE.half},{x:BRIDGE.x,z:mid-s*BRIDGE.half},t];
}
