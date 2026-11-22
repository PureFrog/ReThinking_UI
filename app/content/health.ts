// What is under a holding's tree (W2 뿌리 단면, docs/brief-wow.md): the company's books in three numbers. Today a
// mock: read off the research note when there is one (content/signals.ts), otherwise made from the holding's return
// and a hash of its name. The server (R5) swaps healthProvider for the team's model output.
//   fscore: Piotroski F-score 0–9 (재무 체력) · ohlson: Ohlson O-score bankruptcy probability % (부도 위험)
//   debt: debt ratio % (빚 부담)
import type {Holding} from '../core/model';
import type {Signal} from './signals';
export type Health={fscore:number;ohlson:number;debt:number};
const hash=(t:string)=>{let h=2166136261;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// the last number in a note's value, e.g. '9% → 17%' → 17, '1.6배 → 2.1배' → 2.1
const lastNum=(v:string)=>{const m=v.match(/-?\d+(\.\d+)?/g);return m?Number(m[m.length-1]):null};
export function mockHealth(h:Holding,sig:Signal|null):Health{
  const r=hash(h.name),pick=(lo:number,hi:number,salt=0)=>lo+((r>>>salt)%(hi-lo+1));
  // without a note: a company in the red leans weaker, one in the black healthier (made-up, steady per name)
  const weak=h.rate<=-20,soft=h.rate<0;
  let fscore=weak?pick(2,4):soft?pick(4,6):pick(6,8);
  let ohlson=weak?pick(8,14,3):soft?pick(4,8,3):pick(1,4,3);
  let debt=weak?pick(150,210,5):soft?pick(90,150,5):pick(45,95,5);
  if(sig){
    if(sig.deep)fscore=sig.deep.items.filter(i=>i.ok).length;
    else{const m=sig.headline.match(/9점 중 (\d)점/);if(m)fscore=Number(m[1])}
    for(const e of sig.evidence){const n=lastNum(e.v);if(n===null)continue;
      if(/O-score/.test(e.k))ohlson=n;
      else if(/부채비율/.test(e.k))debt=n;
      else if(/레버리지/.test(e.k))debt=Math.round((n-1)*100)}
  }
  return {fscore,ohlson,debt};
}
export type HealthProvider={of(h:Holding,sig:Signal|null):Health};
export const healthProvider:HealthProvider={of:mockHealth};
