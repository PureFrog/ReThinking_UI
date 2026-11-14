// Grading a 판 (docs/game.md 4-3). Each decision is checked against doing the opposite over the next 20 trading days
// (fill at the next open, read the close 20 days later; the epilogue covers the end of the 판). Points come from the
// chips staked on it, so calibration — betting more where you are surer — is what the score rewards, not returns.
import {barAt,type GamePack} from './pack';
export const HORIZON=20,TIE_PP=2,POINT=10;
export type Choice='지킴'|'절반'|'정리';
export type Decision={tick:number;code:string;choice:Choice;chips:number;kind:'crash'|'earnings'};
export type Result='hit'|'miss'|'tie';
export type Graded=Decision&{hold:number;mine:number;other:number;diff:number;result:Result;points:number};

// how holding would have gone: next open → close HORIZON trading days after the decision
export function holdReturn(pack:GamePack,code:string,tick:number){
  const o=barAt(pack,code,tick+1)?.[1],c=barAt(pack,code,tick+HORIZON)?.[4];
  return o&&c?(c/o-1)*100:0;
}
// 지킴 is judged against 정리 and the other way round; 절반 is a partial cut, judged against keeping it all
export function gradeDecision(pack:GamePack,d:Decision):Graded{
  const hold=holdReturn(pack,d.code,d.tick);
  const mine=d.choice==='지킴'?hold:d.choice==='정리'?0:hold/2;
  const other=d.choice==='지킴'?0:hold;
  const diff=mine-other,result:Result=Math.abs(diff)<TIE_PP?'tie':diff>0?'hit':'miss';
  return {...d,hold,mine,other,diff,result,points:result==='hit'?d.chips*POINT:result==='miss'?-d.chips*POINT:0};
}
// a small bonus for honest confidence: every decision with 3+ chips hit (and there was at least one)
export const CALIBRATION_BONUS=10;
export function scoreRun(pack:GamePack,decisions:Decision[]){
  const items=decisions.map(d=>gradeDecision(pack,d));
  const sure=items.filter(i=>i.chips>=3);
  const bonus=sure.length>0&&sure.every(i=>i.result==='hit')?CALIBRATION_BONUS:0;
  const points=items.reduce((s,i)=>s+i.points,0);
  return {items,points,bonus,total:points+bonus,hits:items.filter(i=>i.result==='hit').length};
}
// the garden keeps confidence 1~5; chips map onto it (1 chip = 2 … 4 chips = 5)
export const chipsToConfidence=(n:number)=>Math.max(1,Math.min(5,n+1));
