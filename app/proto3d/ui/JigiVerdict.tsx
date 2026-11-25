'use client';
// A hypothesis capsule dug up (지기 J2): what I wrote that day, the close then and at the end date, the move, and the
// stamp — 적중 in the logo green, 빗나감 in graphite (prices stay red up / blue down). 토리 says one plain line about
// the numbers only. No score: grading is the hypothesis's, the league counts the work (J3).
import {Sheet,Said} from './Sheet';
import {Pill} from './JigiBook';
import {verdict} from '../../core/jigi/hypothesis';
import {priceLegal} from '../../core/jigi/stocks';
import type {Hypo,Journal} from '../../core/jigi/journal';

const won=(n:number)=>n.toLocaleString('ko-KR')+'원';
export const VERDICT_LINE={hit:'적어 둔 방향대로 갔어. 이유도 맞았는지는 복기에서 같이 보자.',fail:'이번엔 반대로 갔어. 어디서 갈렸는지 같이 보자.',void:'그 기간엔 비교할 종가가 없어서 판정을 못 했어.'} as const;
export function JigiVerdict({j,h,today,onReview,onClose}:{j:Journal;h:Hypo;today:string;onReview:()=>void;onClose:()=>void}){
  const v=verdict(j,h,today),s=v.s==='hit'||v.s==='fail'||v.s==='void'?v.s:null;
  const move=v.end&&h.base?(v.end.c/h.base.close-1)*100:null;
  return <Sheet kicker={`${j.stock?.name??''} · 가설 판정`} title="판정이 나왔어요" label="가설 판정" onClose={onClose}>
    <p className="rt-hint rt-num">{new Date(j.createdAt).toISOString().slice(0,10)}{j.practice?' 기준으로 쓴 연습 일지':'에 쓴 일지'} · 기간 {j.f.horizon}</p>
    <blockquote className="jg-quote">{h.text}</blockquote>
    {h.base&&<div className="jg-verdict">
      <div><small>기준</small><b className="rt-num">{won(h.base.close)}</b><small className="rt-num">{h.base.date}</small></div>
      <div className="jg-arrow" aria-hidden>→</div>
      <div><small>종료</small><b className="rt-num">{v.end?won(v.end.c):'—'}</b><small className="rt-num">{v.end?.d??h.endDate}</small></div>
      {move!=null&&<div className={`jg-move rt-num ${move>0?'rt-up':move<0?'rt-down':''}`}>{move>0?'+':''}{move.toFixed(2)}%</div>}
    </div>}
    {s&&<div className={`jg-stamp ${s}`} role="status"><Pill s={s}/></div>}
    {s&&<Said id="tori" name="토리">{VERDICT_LINE[s]}</Said>}
    {j.f.reason&&<p className="rt-hint" style={{marginTop:10}}>그때 이유: <span className="jg-orig">{j.f.reason}</span></p>}
    <div className="jg-row" style={{marginTop:14}}><button type="button" className="rt-btn primary" onClick={onReview}>복기하기</button><button type="button" className="rt-btn" onClick={onClose}>닫기</button></div>
    {j.practice&&<p className="rt-hint">되돌아보기 연습이라 내 성적에는 들어가지 않아요. 이제 오늘 생각으로 일지를 써 보세요.</p>}
    <p className="jg-legal">{priceLegal([j.stock?.code])}</p>
  </Sheet>;
}
