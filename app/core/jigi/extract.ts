// 지기 J2 (docs/jigi.md): from a saved journal's own words to hypothesis drafts, and confirming one. Until the server
// brings LLM call A this is the prototype's rule-based split: each sentence of 가설 (and of 반대 근거, as a counter-
// scenario) becomes a draft with a field, a form, its place in the chain of reasoning and a direction. Nothing is
// invented: no dates, numbers or confidence that are not in the text. The player edits, confirms or deletes each.
import {lastConfirmed} from './stocks';
import {autoGradable,isRecord} from './hypothesis';
import type {Hypo,Journal} from './journal';

export const DOMAINS=['물가','경기','고용','통화정책','국채금리','금리스프레드','환율','원자재','기업실적','주가','지정학','매매행동'] as const;
export const FORMS=['수치','방향','예상치 비교','사건 발생','추세','인과 주장','행동','반대 시나리오'] as const;
export const ROLES=['최초 전제','중간 전달 과정','자산가격 결과','행동'] as const;
export const DIRS=['상승','하락','없음'] as const;
const DOMRX:[string,RegExp][]=[['물가',/물가|CPI|인플레/],['통화정책',/기준금리|연준|한은|금통위|FOMC/],['금리스프레드',/금리차|스프레드/],['국채금리',/국채|장기금리|단기금리|금리/],
  ['환율',/환율|달러|원화/],['원자재',/유가|원자재|구리|리튬/],['고용',/고용|실업/],['기업실적',/실적|영업이익|매출|이익|수주|가이던스/],['경기',/경기|수출|소비/],['지정학',/전쟁|관세|제재|지정학/]];
const UP=/오를|오른다|오르|상승|반등|회복|증가|늘어|늘고|상회|개선|확대|강세|넘는/,DOWN=/내릴|내린다|내리|하락|떨어|감소|줄어|하회|악화|축소|약세|빠질/,ACT=/공매도|매수|매도|사겠|팔겠|담겠|줄이겠/;

export type Draft=Omit<Hypo,'id'|'status'|'endDate'>&{endDate:string};
export function extractDrafts(j:Journal):Draft[]{
  const out:Draft[]=[],name=j.stock?.name??'';
  const push=(raw:string,src:Draft['src'],counter:boolean)=>{const text=raw.trim();if(text.length<4)return;
    const up=UP.test(text),dn=DOWN.test(text),dir:Draft['dir']=up&&!dn?'상승':dn&&!up?'하락':'없음';
    if(!counter&&ACT.test(text)&&dir==='없음'){out.push({text,src,domain:'매매행동',form:'행동',role:'행동',dir:'없음',endDate:''});return}
    // (the prototype defaults to 주가; only a sentence about the price or naming the stock is graded against its price)
    let domain='경기';for(const [d,rx] of DOMRX)if(rx.test(text)){domain=d;break}
    if(/주가/.test(text)||(name&&text.includes(name)))domain='주가';
    const form=counter?'반대 시나리오':dir!=='없음'?(/\d+(\.\d+)?\s*(%|원|배)/.test(text)?'수치':'방향'):(/면 |때문|라서/.test(text)?'인과 주장':'추세');
    const role=domain==='주가'?'자산가격 결과':['물가','경기','고용','통화정책','지정학'].includes(domain)?'최초 전제':'중간 전달 과정';
    out.push({text:text.endsWith('.')?text:text+'.',src,domain,form,role,dir,endDate:counter?'':j.f.checkDate})};
  j.f.hypo.split(/[.!?\n→]+|(?<=[다요])\s*,\s*|,\s*(?=[^,]*(?:주가|오를|내릴))/).forEach(t=>push(t,'핵심 가설',false));
  (j.f.opt.counter??'').split(/[.!?\n]+/).forEach(t=>push(t,'반대 근거',true));
  return out;
}
// what an auto-graded hypothesis still needs before it can be confirmed
export function missingOf(h:Pick<Hypo,'form'|'domain'|'dir'|'endDate'>){if(isRecord(h as Hypo)||!autoGradable(h as Hypo))return [] as string[];
  const m:string[]=[];if(h.dir==='없음')m.push('방향');if(!h.endDate)m.push('평가 종료일');return m}
// confirm: a stock-direction hypothesis is fixed against the last confirmed close (its base) and needs an end date
// after the next close; anything incomplete waits as 보완 대기. A hypothesis whose result I already know is kept as
// 사후 기록 and never counted. Returns the hypothesis as it is after the try, and what to tell the player.
export function confirmHypo(j:Journal,h:Hypo,today:string,now:number):{h:Hypo;say:string}{
  if(!h.text.trim())return {h,say:'가설 문장이 비어 있어요'};
  if(!isRecord(h)&&autoGradable(h)&&!h.postHoc){
    const m=missingOf(h);if(m.length)return {h:{...h,status:'hold'},say:'빠진 정보가 있어 보완 대기로 뒀어요: '+m.join(', ')};
    const b=j.stock?lastConfirmed(j.stock.code,today):null;if(!b)return {h,say:'가격을 못 불러왔어요. 잠시 뒤에 다시 해 주세요'};
    if(h.endDate<=today)return {h,say:'종료일은 오늘 뒤여야 해요. 더 뒤 날짜를 골라 주세요'};
    return {h:{...h,status:'confirmed',confirmedAt:now,auto:true,base:{date:b.d,close:b.c}},say:'확정했어요. 종료일 종가가 나오면 자동으로 판정해요'};
  }
  return {h:{...h,status:'confirmed',confirmedAt:now,auto:false},say:h.postHoc?'사후 기록으로 남겼어요. 성적에는 넣지 않아요':'확정했어요'};
}
