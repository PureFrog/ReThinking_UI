// 지기 hypotheses and their verdicts (docs/jigi.md 2.4, 3.2). Only "the stock goes up/down by the end date" is graded
// automatically: the confirmed close on the end date (or the trading day before) against the close the day it was
// confirmed; up is a hit when end > base, down when end < base, equal is a miss. Other hypotheses ("재고가 줄어든다")
// wait for automatic grading from data the server will bring (자료 대기); actions and counter-scenarios are records only.
import {barOnOrBefore,type Bar} from './stocks';
import type {Hypo,Journal} from './journal';

export type Verdict={s:'draft'|'hold'|'rec'|'posthoc'|'data'|'wait'|'void'|'hit'|'fail';end?:Bar;base?:{date:string;close:number}};
export const isRecord=(h:Hypo)=>h.form==='행동'||h.form==='반대 시나리오';
export const autoGradable=(h:Hypo)=>h.domain==='주가'&&h.form==='방향';
export function verdict(j:Journal,h:Hypo,today:string):Verdict{
  if(h.status!=='confirmed')return {s:h.status};
  if(isRecord(h))return {s:'rec'};
  if(h.postHoc)return {s:'posthoc'};
  if(!h.auto||!h.base||!j.stock)return {s:'data'};
  // the end date's close is final only after that day
  if(h.endDate>=today)return {s:'wait',base:h.base};
  const end=barOnOrBefore(j.stock.code,h.endDate);
  if(!end||end.d<=h.base.date)return {s:'void',base:h.base};
  const hit=h.dir==='상승'?end.c>h.base.close:h.dir==='하락'?end.c<h.base.close:false;
  return {s:hit?'hit':'fail',end,base:h.base};
}
export const VERDICT_LABEL:Record<Verdict['s'],string>={draft:'추출 초안',hold:'보완 대기',rec:'기록만',posthoc:'사후 기록',data:'자동 판정 준비 중',wait:'판정 대기',void:'판정불가',hit:'적중',fail:'빗나감'};
// a journal's verdicts counted, for its card on the bookshelf
export function verdictCounts(j:Journal,today:string){const c:Partial<Record<Verdict['s'],number>>={};for(const h of j.hypos){const s=verdict(j,h,today).s;c[s]=(c[s]??0)+1}return c}
// a journal waiting for its review: a verdict came back and the review is not written yet
export const needsReview=(j:Journal,today:string)=>j.status==='saved'&&!j.reflection&&j.hypos.some(h=>{const s=verdict(j,h,today).s;return s==='hit'||s==='fail'});
