// Where today's market numbers come from: the real KOSDAQ index (daily bars in Supabase price_daily under the code
// 'KOSDAQ', uploaded by investment-evidence-system push_prices) once they are loaded (proto3d/prices.ts), else a mock:
// a steady number per day, so the same day always has the same weather. A real day carries asOf (the bar's date: the
// last session on or before the day asked); a mock day has none, and the chip says 예시.
import type {Market} from '../core/weather';
import type {Bar} from '../core/jigi/stocks';
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// shaped like a real index: most days move a little, a big drop or a hot rally is a few days a month (a bell curve
// from the day's hash, sd 0.85%), and a jumpy day goes with a big move more often than not
const u=(h:number,shift:number)=>(((h>>>shift)%10007)+0.5)/10007;
export function mockMarket(day:string):Market{
  const h=hash(day),h2=hash(day+'*'),z=Math.sqrt(-2*Math.log(u(h,0)))*Math.cos(2*Math.PI*u(h2,3)),z2=Math.sqrt(-2*Math.log(u(h2,0)))*Math.sin(2*Math.PI*u(h,5));
  const index=Math.round((0.05+z*0.85)*100)/100,swing=Math.round((0.7+Math.abs(z2)*0.55+Math.abs(index)*0.45)*100)/100;
  return {day,index,swing};
}
const r2=(x:number)=>Math.round(x*100)/100;
// the day's index move against the previous close, and the day's range (high − low) against it, in %
export function realMarket(bs:Bar[],day:string):Market|null{
  let i=bs.length-1;while(i>=0&&bs[i].d>day)i--;if(i<1)return null;
  const b=bs[i],p=bs[i-1].c;if(!(p>0))return null;
  return {day,index:r2((b.c/p-1)*100),swing:r2((b.h-b.l)/p*100),asOf:b.d};
}
let INDEX:Bar[]=[];
export function setMarketBars(bs:Bar[]){INDEX=[...bs].sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0)}
export type MarketProvider={today(day:string):Market};
export const marketProvider:MarketProvider={today:day=>realMarket(INDEX,day)??mockMarket(day)};
