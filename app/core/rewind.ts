// 되감기 (rewind): practice rounds that don't wait 30 days. A past moment is shown (a holding's return then and the
// analyst's note), the player makes the same call as in the real loop (choice + confidence), and what happened in the
// 30 days after opens at once, graded by the same rules (core/judgment.ts hitOf, pointsOf). The cases come from
// content/rewind.ts (made-up companies today, the team's real past cases once the server has them).
// Practice pays a little for the first few rounds a day and never enters the league.
import {hitOf,pointsOf,probOf,type Choice,type Confidence} from './judgment';
export const REWIND={paidPerDay:3,mark:30 as const};
export type RewindRound={caseId:string;day:string;choice:Choice;confidence:Confidence;after:number;hit:boolean;points:number;signalRight:boolean|null;paid:boolean};
export function playRewind(c:{id:string;after:number;loss:boolean},choice:Choice,confidence:Confidence,day:string,rounds:RewindRound[]):RewindRound{
  const hit=hitOf(choice,c.after),paidToday=rounds.filter(r=>r.day===day&&r.paid).length;
  return {caseId:c.id,day,choice,confidence,after:c.after,hit,points:pointsOf(hit,confidence),signalRight:c.loss?c.after<=-5:null,paid:paidToday<REWIND.paidPerDay};
}
export const paidLeft=(rounds:RewindRound[],day:string)=>Math.max(0,REWIND.paidPerDay-rounds.filter(r=>r.day===day&&r.paid).length);
// the practice record: hit rate and how well the confidence matched (same measure as the real track record)
export function rewindTrack(rounds:RewindRound[]){
  const n=rounds.length,hits=rounds.filter(r=>r.hit).length;
  const brier=rounds.reduce((s,r)=>s+(probOf(r.confidence)-(r.hit?1:0))**2,0);
  return {rounds:n,hits,hitRate:n?Math.round(hits/n*100):null,calibration:n?Math.round((1-brier/n)*100):null};
}
