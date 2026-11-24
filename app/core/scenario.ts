// 시나리오 퀘스트 (PM 설계 "시나리오 퀘스트 상세 설계" 2026-11-22): 과거 한 분기를 재생하며 세 번 판단한다.
// 오늘의 거장 → 포트폴리오 → (신문 → 수첩 → 통신기) × 3 → 내 성과 → 거장의 결과 → 내 일지 피드백.
// Pure: the bookmark, the market (orders fill at the next trading day's open, fee 0.1%), the scores (12장) and the
// feedback. 일지 채점은 서버 LLM 채점(10장)이 붙기 전까지 같은 항목(E 자료 읽기 · W 논리 연결)을 낱말로 보는 임시 채점이다.
import type {SqPack} from '../content/scenario-practice';

export type SqDir='up'|'flat'|'down';
export const DIR_LABEL:Record<SqDir,string>={up:'늘어날 것이다',flat:'비슷할 것이다',down:'줄어들 것이다'};
// 4장: keep, or sell 1/8 · 1/4 · 1/2 of what is left
export const SELLS:[number,string][]=[[0,'유지'],[1/8,'1/8 매도'],[1/4,'1/4 매도'],[1/2,'1/2 매도']];
export type SqNote={dir:SqDir;reason:string};
export type SqStep='mentor'|'portfolio'|'run'|'turn'|'result'|'reveal'|'feedback';
export type SqBook={v:1;packId:string;day:string;step:SqStep;turn:number;tick:number;
  sub:'desk'|'note'|'device';       // inside a turn: the desk, the open notebook, the device after 작성 완료
  draft:SqNote|null;draftDir:SqDir|null;draftReason:string;
  notes:SqNote[];                   // saved with 작성 완료
  orders:number[];                  // the sell fraction confirmed on each turn
  sell:number|null;ended:boolean};
export const newBook=(packId:string,day:string):SqBook=>({v:1,packId,day,step:'mentor',turn:0,tick:0,sub:'desk',draft:null,draftDir:null,draftReason:'',notes:[],orders:[],sell:null,ended:false});

// the market: the holding, cash and the fills, as of the close of a day
export type SqFill={turn:number;day:number;qty:number;price:number;cash:number};
export function position(p:SqPack,orders:number[],tick:number){
  let qty=p.holding.qty,cash=0;const fills:SqFill[]=[];
  orders.forEach((f,i)=>{const t=p.turns[i];if(!t)return;const d=t.day+1;if(d>tick||d>=p.market.days.length)return;
    const q=Math.floor(qty*f);if(q<=0)return;const px=p.market.open[d],c=q*px*(1-p.market.fee);qty-=q;cash+=c;fills.push({turn:i,day:d,qty:q,price:px,cash:c})});
  return {qty,cash,fills,value:qty*p.market.close[Math.min(tick,p.market.days.length-1)]+cash};
}
export const lastDay=(p:SqPack)=>p.market.days.length-1;
export const startValue=(p:SqPack)=>p.holding.qty*p.market.close[0];
// the day the market runs to next: the next turn's decision day, or the evaluation day after the last
export const nextStop=(p:SqPack,b:SqBook)=>b.turn<p.turns.length?p.turns[b.turn].day:lastDay(p);
// what the sell would leave (the screen shows it before 확정)
export const leftAfter=(qty:number,f:number)=>qty-Math.floor(qty*f);

// 일지 임시 채점 (10장, 1회차: E 40 · W 60). Each item: first check 0.5, both 1, else 0
const CAUSE=/때문|니까|아서|어서|해서|라서|므로|그래서|으면|다면|라면|봐서|보니|덕분|탓/;
const DIRWORD:Record<SqDir,RegExp>={up:/늘|증가|오르|많아|커질/,flat:/비슷|유지|버티|그대로|변함없|비슷할/,down:/줄|감소|떨어|빠지|적어|떠나/};
export type SqGrade={e:number;w:number;score:number;fix:string[];quoteFact:string|null};
export function gradeNote(p:SqPack,turn:number,n:SqNote):SqGrade{
  const t=p.turns[turn],r=n.reason.replace(/\s+/g,' ').trim();
  const fact=t.facts.find(f=>r.includes(f))??null,num=t.numbers.some(x=>r.includes(x));
  const otherDir=(Object.keys(DIRWORD) as SqDir[]).filter(k=>k!==n.dir).some(k=>DIRWORD[k].test(r))&&!DIRWORD[n.dir].test(r);
  const e1=!!fact,e2=e1&&(num||DIRWORD[n.dir].test(r)||t.facts.filter(f=>r.includes(f)).length>=2);
  const w1=CAUSE.test(r)||r.length>=18,w2=w1&&CAUSE.test(r)&&r.length>=20&&!otherDir;
  const part=(a:boolean,b:boolean)=>a?(b?1:0.5):0;
  const e=part(e1,e2),w=part(w1,w2);
  const fix:string[]=[];
  if(!e1)fix.push('오늘 자료에 나온 사실(숫자나 사건)을 하나 짚어 봐.');else if(!e2)fix.push('그 사실의 숫자나 방향도 같이 적으면 더 정확해.');
  if(!w1)fix.push('그 사실이 왜 네 예상으로 이어지는지 한 줄 더 이어 봐.');else if(!w2)fix.push(otherDir?'고른 방향과 문장의 방향이 달라 보여. 하나로 맞춰 봐.':'왜 그 방향인지 “~라서”처럼 이유를 이어 써 봐.');
  return {e,w,score:Math.round(e*40+w*60),fix,quoteFact:fact};
}
// a prediction against what was measured (1장 '비슷' = ±similar%), or held back when there is no measure yet
export function verdict(p:SqPack,turn:number,n:SqNote):'hit'|'miss'|'hold'{
  const v=p.turns[turn].actual.value;if(v===null)return 'hold';
  const got:SqDir=Math.abs(v)<=p.similar?'flat':v>0?'up':'down';return got===n.dir?'hit':'miss';
}
// 12장: J = the three scenes' mean; R = 50 + 5 × (my return − holding on), 0..100; total = 0.7 J + 0.3 R
export function result(p:SqPack,b:SqBook){
  const end=position(p,b.orders,lastDay(p)),s0=startValue(p);
  const me=(end.value/s0-1)*100,hold=(p.holding.qty*p.market.close[lastDay(p)]/s0-1)*100,delta=me-hold;
  const grades=b.notes.map((n,i)=>gradeNote(p,i,n));
  const J=grades.length?grades.reduce((a,g)=>a+g.score,0)/grades.length:0;
  const R=Math.max(0,Math.min(100,50+5*delta));
  return {me,hold,delta,J:Math.round(J),R:Math.round(R),total:Math.round((0.7*J+0.3*R)*10)/10,grades,end};
}
// 7장: the filing pair as words
export function filingWord(before:number,after:number){return after>before?'공시상 보유 증가':after===before?'분기 말 신고 수량 유지':after>0?'공시상 보유 감소':'대상 분기 공시에서 보유 미확인'}
// 1장 검수 3: what may be kept of a bookmark (a day's own only; an unconfirmed order is never sent by itself)
// a run cut short ends at its stop: the next turn's desk, or the results
export function readBook(raw:unknown,p:SqPack,day:string):SqBook|null{
  const b=raw as SqBook|null;if(!b||b.v!==1||b.packId!==p.id||b.day!==day||!Array.isArray(b.notes)||!Array.isArray(b.orders))return null;
  if(b.step==='run')return {...b,tick:nextStop(p,b),step:b.turn<p.turns.length?'turn':'result',sub:'desk',sell:null};
  return {...b,sell:null};
}
