// What a stock did after a judgment, for grading (app/core/judgment.ts). Mock now: a fixed drift per demo holding (so
// the flagged ones mostly kept falling, and one flag turns out wrong) plus a small steady wobble. A company the player
// planted gets a made-up drift from a hash of its id. The server (R5)
// replaces outcomeProvider with real prices; the grading rules do not change.
import type {Mark} from '../core/judgment';
const DRIFT:Record<number,[number,number]>={1:[6,11],2:[2,4],3:[-8,-17],4:[-6,-12],5:[3,-4],6:[1,-3],7:[-11,-24]};
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
export function mockAfter(holdingId:number,fromDay:string,mark:Mark){
  const [a,b]=DRIFT[holdingId]??[hash('d'+holdingId)%17-9,hash('e'+holdingId)%25-14],base=mark===30?a:b,wobble=(hash(holdingId+fromDay+mark)%41-20)/10;
  return Math.round((base+wobble)*10)/10;
}
export type OutcomeProvider={after(holdingId:number,fromDay:string,mark:Mark):number};
export const outcomeProvider:OutcomeProvider={after:mockAfter};
