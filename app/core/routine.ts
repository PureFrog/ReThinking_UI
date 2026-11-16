// Where each analyst is when nothing calls them (the analysts' day). Priority:
//   1. signals of theirs today → stand at one of those trees, looking it over; with several they move between them
//      every few minutes (the bubble says why; this is how the player finds a signal)
//   2. luon, when a grade has arrived → wait beside that tree's capsule marker
//   3. otherwise their day: each has a few spots of their own (spots below), picked by the part of the day and moved
//      between every few minutes, doing what fits there (read, look through the scope, tap the board, …)
//   4. at night they are home (inside the house; Interior3D shows them resting)
// When two are at the same spot they talk (content/routine-lines.ts). The time is the real clock, so the garden
// changes through the day. Pure: the scene walks them, Analyst3D animates the act.
import {spreadXZ} from './world';
export type Who='tori'|'moa'|'luon';
export type Act='read'|'scope'|'board'|'arms'|'look'|'note'|'stand';
export type Part='morning'|'day'|'evening'|'night';
export type Spot={id:string;x:number;z:number;act:Act;face:number/* radians, which way they look while doing it */};
export const ROUTINE={swapMinutes:4/* how often they move between their spots */,meetEvery:3/* one swap in this many brings two to the same spot */};
// each analyst's own places (x,z in garden coordinates, app/proto3d/places.ts): what they do there says who they are
const SPOTS0:Record<Who,Spot[]>={
  tori:[{id:'library',x:2.6,z:-13.4,act:'read',face:Math.PI},{id:'desk-log',x:-2.2,z:-2.4,act:'read',face:0.6},{id:'farm-edge',x:1.4,z:-0.6,act:'note',face:-1.2}],
  moa:[{id:'scope',x:-7.2,z:3.2,act:'scope',face:2.4},{id:'orchard',x:9,z:0.6,act:'look',face:-1.6},{id:'pond',x:2.8,z:6.4,act:'look',face:0.4}],
  luon:[{id:'board',x:-2,z:18.2,act:'board',face:Math.PI},{id:'fire',x:-1,z:-2.9,act:'arms',face:0.3},{id:'bridge',x:-0.6,z:11.2,act:'arms',face:-0.6}],
};
// written in the compact layout, moved out with the place each belongs to (core/world.ts)
export const SPOTS:Record<Who,Spot[]>={tori:SPOTS0.tori.map(spreadXZ),moa:SPOTS0.moa.map(spreadXZ),luon:SPOTS0.luon.map(spreadXZ)};
// the shared spot two of them meet at for a talk (the campfire)
export const MEET:Spot=spreadXZ({id:'meet',x:-0.6,z:-0.2,act:'stand',face:0});
// which spots each part of the day favours (indices into SPOTS[who]); night is home
const PLAN:Record<Exclude<Part,'night'>,Record<Who,number[]>>={
  morning:{tori:[0,0,2],moa:[1,2,1],luon:[1,2]},
  day:{tori:[2,0,1],moa:[0,1,2],luon:[0,2,1]},
  evening:{tori:[1,1,0],moa:[2,0],luon:[1,0]},
};
export const partOf=(hour:number):Part=>hour>=5&&hour<11?'morning':hour<17&&hour>=11?'day':hour>=17&&hour<22?'evening':'night';
export type Where={kind:'signal';holdingId:number}|{kind:'grade';holdingId:number}|{kind:'spot';spot:Spot;with:Who|null}|{kind:'home'};
const ORDER:Who[]=['tori','moa','luon'];
// minutes: minutes since midnight (local). flagged: the trees each one's signals are on. due: a tree whose grade arrived.
export function routineOf(minutes:number,flagged:Record<Who,number[]>,due:number|null):Record<Who,Where>{
  const part=partOf(Math.floor(minutes/60)%24),slot=Math.floor(minutes/ROUTINE.swapMinutes);
  const out={} as Record<Who,Where>;
  for(const w of ORDER){
    const f=flagged[w];
    if(f.length){out[w]={kind:'signal',holdingId:f[(slot+ORDER.indexOf(w))%f.length]};continue}
    if(w==='luon'&&due!==null){out[w]={kind:'grade',holdingId:due};continue}
    if(part==='night'){out[w]={kind:'home'};continue}
    const list=PLAN[part][w],i=list[(slot+ORDER.indexOf(w))%list.length];out[w]={kind:'spot',spot:SPOTS[w][i],with:null};
  }
  // every few swaps the two free ones meet at the campfire for a word
  if(part!=='night'&&slot%ROUTINE.meetEvery===0){
    const free=ORDER.filter(w=>out[w].kind==='spot');
    if(free.length>=2){const k=Math.floor(slot/ROUTINE.meetEvery)%free.length,a=free[k],b=free[(k+1)%free.length];
      out[a]={kind:'spot',spot:MEET,with:b};out[b]={kind:'spot',spot:{...MEET,x:MEET.x+2.2,z:MEET.z+0.6,face:-2.6},with:a}}
  }
  return out;
}
