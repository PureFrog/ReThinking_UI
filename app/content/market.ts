// Where today's market numbers come from. Mock now: a steady number per day, so the same day always has the same
// weather. The server (R5) replaces marketProvider with real index data without touching the scene or the UI.
import type {Market} from '../core/weather';
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
export function mockMarket(day:string):Market{
  const h=hash(day),a=(h%1000)/1000,b=((h>>>10)%1000)/1000;
  return {day,index:Math.round((a*5-2.4)*100)/100,swing:Math.round((0.6+b*3)*100)/100};
}
export type MarketProvider={today(day:string):Market};
export const marketProvider:MarketProvider={today:mockMarket};
