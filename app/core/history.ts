// W5 정원 타임랩스 (docs/brief-wow.md): the garden from a year ago to today. Each holding's past return is made up
// deterministically from its name (the server's real price history replaces it later): it starts at 0 on the day it was
// bought, ends at today's return, and wanders in between (a bridge of a few slow waves). A tree is not there before it
// was bought. Called "타임랩스" so it is never confused with 되감기 (the practice rounds, core/rewind.ts).
import {heldDays,type Holding} from './model';
import type {Judgment} from './judgment';
export const LAPSE={days:365,step:7/* one frame a week */,ruin:-20/* a return at or below this counts toward lossDays */};
const hash=(t:string)=>{let h=2166136261;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// the return `back` days ago (0 = today), or null before the holding was bought
export function rateAt(h:Holding,back:number):number|null{
  const held=heldDays(h.date);if(back>held)return null;if(back<=0)return h.rate;
  const t=(held-back)/held,r=hash(h.name),vol=6+Math.abs(h.rate)*0.45;
  // slow waves pinned to 0 at both ends (sin(pi t) envelope), so the line runs from 0 to today's return
  const wave=Math.sin(t*Math.PI*(1+r%3)+(r%628)/100)*0.6+Math.sin(t*Math.PI*(4+(r>>>3)%4)+((r>>>7)%628)/100)*0.4;
  return Math.round((h.rate*t+wave*vol*Math.sin(Math.PI*t))*10)/10;
}
// how long it had been at a deep loss by then (the trees use it to tell rotting from wilting)
export function lossDaysAt(h:Holding,back:number):number{
  let n=0;for(let b=back;;b++){const v=rateAt(h,b);if(v===null||v>LAPSE.ruin)break;n++;if(n>400)break}
  return n;
}
// the holding as it stood `back` days ago: younger (its date moves forward), its return and loss run then
export function holdingAt(h:Holding,back:number):Holding|null{
  const v=rateAt(h,back);if(v===null)return null;
  const d=new Date(Date.parse(h.date)+back*86400000).toISOString().slice(0,10);
  return {...h,date:d,rate:v,lossDays:lossDaysAt(h,back)};
}
export const dayBack=(today:string,back:number)=>new Date(Date.parse(today)-back*86400000).toISOString().slice(0,10);
// the frames, oldest first: how many days back each one is
export function lapseFrames(){const n=Math.round(LAPSE.days/LAPSE.step);return Array.from({length:n+1},(_,i)=>Math.round(LAPSE.days*(n-i)/n))}
// the capsules already in the ground by that day: one pin per tree that had a judgment by then
export const pinsAt=(list:Judgment[],day:string,holdingIds:number[])=>[...new Set(list.filter(j=>j.day<=day&&holdingIds.includes(j.holdingId)).map(j=>j.holdingId))];
