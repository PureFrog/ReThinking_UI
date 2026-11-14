// The order book on screen. The packs only have daily bars, so the 10 levels are rebuilt from that day's price and volume:
// real tick size and price limits, made-up but steady depth (same pack, code and tick → same book). The screen always says
// "일봉으로 재구성한 호가".
import {barAt,limits,tickOf,type GamePack} from './pack';
export type Level={price:number;qty:number};
export type Book={last:number;prev:number;unit:number;upper:number;lower:number;asks:Level[];bids:Level[];volume:number};
function seeded(code:string,tick:number){let h=2166136261;for(const ch of code+':'+tick){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return ()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return (h>>>0)/4294967296}}
export function orderBook(pack:GamePack,code:string,tick:number,depth=5):Book|null{
  const bar=barAt(pack,code,tick),pb=barAt(pack,code,tick-1);if(!bar)return null;
  const r=pack.ticks,last=bar[4],prev=pb?pb[4]:bar[1],unit=tickOf(last,r),{upper,lower}=limits(prev,r),v=bar[5],rnd=seeded(code,tick);
  const size=()=>Math.max(1,Math.round(v*(.004+rnd()*.02)));
  const asks:Level[]=[],bids:Level[]=[];
  // each step uses the tick size of the price it steps from (10 below 10,000, 50 from 10,000 up)
  for(let k=0,a=last;k<depth;k++){a+=tickOf(a,r);if(a>upper)break;asks.push({price:a,qty:size()})}
  for(let k=0,b=last;k<depth;k++){b-=tickOf(b-1,r);if(b<lower)break;bids.push({price:b,qty:size()})}
  return {last,prev,unit,upper,lower,asks:asks.reverse(),bids,volume:v};
}
