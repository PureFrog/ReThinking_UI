// ux-spec 4장 realtime mode: the day's first friend comes for a reason. A tree newly in loss → moa, a tree with the mock
// event not talked through → tori, a tree whose journal has not been touched for a while → luon; none of these →
// closeness and chance. A reason whose friend is not on the roster is skipped. More friends may come after, up to
// MAX_VISITORS (13.7-4), the same as in demo mode.
import type {Holding} from './model';
import type {JournalEntry} from './care';
import {daysBetween} from './streak';
export const REASON_FRIEND={loss:'moa',event:'tori',stale:'luon'} as const;
// a tree's journal untouched this many days counts as stale
export const STALE_DAYS=14;
export type ReasonKind=keyof typeof REASON_FRIEND|'pick';
export type VisitReason={friend:string;kind:ReasonKind;holdingId:number|null};
// lossSeen: the trees in loss when the garden was last opened (null: never opened, so every loss is new)
export const newLosses=(holdings:Holding[],lossSeen:number[]|null)=>holdings.filter(h=>h.rate<0&&!(lossSeen??[]).includes(h.id));
export function staleTree(holdings:Holding[],journal:JournalEntry[],today:string){
 return holdings.find(h=>{const last=journal.filter(e=>e.holdingId===h.id).map(e=>e.day).sort().at(-1);return !!last&&daysBetween(last,today)>=STALE_DAYS})??null}
// roll: a number in [0,1) for the chance pick, weighted by closeness + 1
export function firstFriend(o:{friends:string[];holdings:Holding[];lossSeen:number[]|null;eventTree:number|null;journal:JournalEntry[];today:string;closeness:Record<string,number>;roll:number}):VisitReason{
 const has=(id:string)=>o.friends.includes(id);
 const loss=newLosses(o.holdings,o.lossSeen)[0];if(loss&&has(REASON_FRIEND.loss))return {friend:REASON_FRIEND.loss,kind:'loss',holdingId:loss.id};
 if(o.eventTree!==null&&o.holdings.some(h=>h.id===o.eventTree)&&has(REASON_FRIEND.event))return {friend:REASON_FRIEND.event,kind:'event',holdingId:o.eventTree};
 const stale=staleTree(o.holdings,o.journal,o.today);if(stale&&has(REASON_FRIEND.stale))return {friend:REASON_FRIEND.stale,kind:'stale',holdingId:stale.id};
 return {friend:weighted(o.friends,o.closeness,o.roll),kind:'pick',holdingId:null}}
export function weighted(ids:string[],closeness:Record<string,number>,roll:number){
 const w=ids.map(id=>(closeness[id]??0)+1),total=w.reduce((a,b)=>a+b,0);let r=roll*total;
 for(let i=0;i<ids.length;i++){r-=w[i];if(r<0)return ids[i]}return ids[ids.length-1]}
