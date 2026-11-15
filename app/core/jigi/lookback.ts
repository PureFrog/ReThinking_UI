// The first visit's 되돌아보기, the 지기 way (docs/jigi.md): an analyst's note from 30 days ago, and a one-page journal
// written as of then — which way the stock would go over the month and why. Its stock-direction hypothesis is fixed
// at the close of that day and graded at once against the last confirmed close, so the first "내 판단이 맞았나" comes
// in the first minute. It is a practice page: marked practice, shown as such, and kept out of the statistics (J3).
import {lastConfirmed} from './stocks';
import {blankFields,type Journal} from './journal';
import {verdict} from './hypothesis';

export const LOOKBACK_DAYS=30;
const shift=(day:string,n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
export function lookbackJournal(o:{id:string;hypoId:string;holdingId:number;code:string;name:string;today:string;now:number;dir:'상승'|'하락';reason:string;conf:string;signalId?:string|null}):Journal|null{
  const then=shift(o.today,-LOOKBACK_DAYS),base=lastConfirmed(o.code,then),end=lastConfirmed(o.code,o.today);
  if(!base||!end||end.d<=base.d)return null;
  const text=`${o.name} 주가가 한 달 안에 ${o.dir==='상승'?'오를':'내릴'} 것이다.`,at=o.now-LOOKBACK_DAYS*864e5;
  return {id:o.id,practice:true,status:'saved',createdAt:at,savedAt:o.now,tz:'Asia/Seoul',holdingId:o.holdingId,stock:{code:o.code,name:o.name},anchor:{date:base.d,close:base.c},signalId:o.signalId??null,
    f:{...blankFields(),action:'관찰',hypo:text,reason:o.reason.trim(),recheckUnknown:true,horizon:'1개월',checkDate:end.d,conf:o.conf},open:{},reflection:null,archivedAt:null,deletedAt:null,
    versions:[{at:o.now,label:'되돌아보기 연습'}],
    hypos:[{id:o.hypoId,text,src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir:o.dir,endDate:end.d,status:'confirmed',confirmedAt:at,auto:true,base:{date:base.d,close:base.c}}]};
}
// sanity for the caller: the practice verdict is in at once
export const lookbackReady=(j:Journal,today:string)=>{const v=verdict(j,j.hypos[0],today).s;return v==='hit'||v==='fail'};
