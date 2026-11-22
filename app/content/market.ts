// Where today's market numbers come from. Mock now: a steady number per day, so the same day always has the same
// weather. The server (R5) replaces marketProvider with real index data without touching the scene or the UI.
import type {Market} from '../core/weather';
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// shaped like a real index: most days move a little, a big drop or a hot rally is a few days a month (a bell curve
// from the day's hash, sd 0.85%), and a jumpy day goes with a big move more often than not
const u=(h:number,shift:number)=>(((h>>>shift)%10007)+0.5)/10007;
export function mockMarket(day:string):Market{
  const h=hash(day),h2=hash(day+'*'),z=Math.sqrt(-2*Math.log(u(h,0)))*Math.cos(2*Math.PI*u(h2,3)),z2=Math.sqrt(-2*Math.log(u(h2,0)))*Math.sin(2*Math.PI*u(h,5));
  const index=Math.round((0.05+z*0.85)*100)/100,swing=Math.round((0.7+Math.abs(z2)*0.55+Math.abs(index)*0.45)*100)/100;
  return {day,index,swing};
}
export type MarketProvider={today(day:string):Market};
export const marketProvider:MarketProvider={today:mockMarket};
