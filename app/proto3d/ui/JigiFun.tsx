'use client';
// 일지를 재미있게 (피드백 C "투자 일지와 분석을 카드·캡슐로, 백엔드 모델은 그대로"):
//   capsuleOf    where a journal's time capsule stands: sealed till its hypotheses' end date (D-n), arrived (a
//                verdict is in and not yet looked back on), opened (looked back on), or just a record (nothing to grade)
//   PaperCard    a journal in the list as a taped paper card: the date stamp, the stock, what I did, my hypothesis in
//                my own words, and the capsule's state. No verdict on it (docs/jigi.md 9-5): the result is in the capsule.
//   CapsuleShelf the capsules that have arrived, glowing at the top of the book
//   CapsuleOpen  opening one: it shakes, pops, and shows each hypothesis with its stamp (적중/빗나감) and 1–3 stars for
//                the share that came true; from there to the journal's page to look back (회고)
//   SignalCard   an analyst's note (토리·모아·루온, from the models) as a card that flips: the analyst and the stock on the
//                front, what the model saw and "일지로 적기" on the back
// The verdicts come from core/jigi/hypothesis.ts verdict (the price on the end date against the base): nothing new
// is graded here.
import {useEffect,useState} from 'react';
import '../jigi-fun.css';
import {verdict} from '../../core/jigi/hypothesis';
import type {Journal} from '../../core/jigi/journal';
import type {BookSignal} from './JigiBook';
import {cue} from '../../core/sound';

import {capsuleOf,starsOf,type Capsule} from '../../core/jigi/capsule';
export {capsuleOf,starsOf};
const md=(ms:number)=>{const d=new Date(ms);return `${d.getMonth()+1}.${d.getDate()}`};
const TILT=[-1.6,1.1,-0.6,1.8,-1.1,0.7];
export function CapsuleChip({c}:{c:Capsule}){
  if(c.k==='sealed')return <span className="jf-cap sealed" title={`${c.end}에 열려요`}>💊 봉인 · D-{c.days}</span>;
  if(c.k==='arrived')return <span className="jf-cap arrived">✨ 캡슐 도착!</span>;
  if(c.k==='opened')return <span className="jf-cap opened">📭 열어 봄</span>;
  return <span className="jf-cap record">📝 기록</span>;
}
export function PaperCard({j,today,i,onOpen,demo,practice}:{j:Journal;today:string;i:number;onOpen:()=>void;demo?:boolean;practice?:boolean}){
  const c=capsuleOf(j,today);
  return <button type="button" className="jf-card" data-cap={c.k} style={{'--tilt':`${TILT[i%TILT.length]}deg`} as React.CSSProperties} onClick={onOpen}>
    <i className="jf-tape" aria-hidden/>
    <span className="jf-date rt-num">{md(j.createdAt)}</span>
    <span className="jf-head"><strong>{j.stock?.name??'종목 미정'}</strong>{j.f.action&&<em>{j.f.action}</em>}{demo&&<em className="jf-demo">예시</em>}{practice&&<em className="jf-demo">연습</em>}</span>
    <span className="jf-hypo">“{j.f.hypo||'아직 가설을 적지 않았어요'}”</span>
    <span className="jf-foot">{j.status==='draft'?<span className="jf-cap record">✏️ 이어서 쓰기</span>:<CapsuleChip c={c}/>}{j.f.horizon&&<small>{j.f.horizon}</small>}</span>
  </button>;
}
export function CapsuleShelf({list,onOpen}:{list:Journal[];onOpen:(j:Journal)=>void}){
  if(!list.length)return null;
  return <section className="jf-shelf" aria-label="도착한 캡슐"><h4>✨ 도착한 캡슐 <small>그때의 내 가설, 맞았을까?</small></h4>
    <div className="jf-shelf-row">{list.map(j=><button key={j.id} type="button" className="jf-pill" onClick={()=>onOpen(j)} aria-label={`${j.stock?.name??'일지'} 캡슐 열기`}>
      <span className="jf-pill-cap" aria-hidden><i/><i/></span><b>{j.stock?.name??'일지'}</b><small>{md(j.createdAt)}에 봉인</small></button>)}</div></section>;
}
export function CapsuleOpen({j,today,onSeen,onReview,onClose}:{j:Journal;today:string;onSeen:(hypoIds:string[])=>void;onReview:()=>void;onClose:()=>void}){
  const [phase,setPhase]=useState<'shake'|'pop'|'show'>('shake'),st=starsOf(j,today);
  const rows=j.hypos.map(h=>({h,v:verdict(j,h,today)})).filter(x=>x.v.s==='hit'||x.v.s==='fail');
  useEffect(()=>{cue('capsule-dig');const a=setTimeout(()=>{setPhase('pop');cue('capsule-open')},900),b=setTimeout(()=>{setPhase('show');onSeen(rows.map(r=>r.h.id))},1500);return()=>{clearTimeout(a);clearTimeout(b)}},[]);// eslint-disable-line react-hooks/exhaustive-deps
  const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
  return <div className="jf-open" role="dialog" aria-label="캡슐 열기" onClick={e=>{if(e.target===e.currentTarget&&phase==='show')onClose()}}>
    {phase!=='show'?<div className={`jf-big ${phase}`} aria-hidden><i/><i/>{phase==='pop'&&<span className="jf-burst">{Array.from({length:14},(_,k)=><b key={k} style={{'--a':`${k*360/14}deg`} as React.CSSProperties}/>)}</span>}</div>
    :<div className="jf-res">
      <small className="jf-res-k">{md(j.createdAt)}의 나에게서 온 캡슐</small>
      <h3>{j.stock?.name??'일지'}</h3>
      <div className="jf-stars" aria-label={`별 ${st.stars}개`}>{[0,1,2].map(k=><span key={k} data-on={k<st.stars} style={{animationDelay:`${k*0.18}s`}}>★</span>)}</div>
      <p className="jf-res-sum">가설 {st.n}개 중 {st.hit}개가 맞았어요{st.stars===3?'. 완벽해요!':st.stars===0?'. 왜 빗나갔는지가 다음 판단의 재료예요.':''}</p>
      <ul className="jf-hyps">{rows.map(({h,v})=><li key={h.id}><span className={`jf-stamp ${v.s}`}>{v.s==='hit'?'적중':'빗나감'}</span>
        <p>“{h.text}”</p>{v.base&&v.end&&<small className="rt-num">{v.base.date} {won(v.base.close)}원 → {v.end.d} {won(v.end.c)}원</small>}</li>)}</ul>
      <div className="jf-res-acts"><button type="button" className="rt-btn" onClick={onClose}>닫기</button><button type="button" className="rt-btn primary" onClick={onReview}>돌아보기 쓰기</button></div>
      <p className="jf-res-note">별은 맞힌 비율이에요. 돈은 걸려 있지 않아요.</p>
    </div>}
  </div>;
}
export function SignalCard({x,onWrite}:{x:BookSignal;onWrite:()=>void}){
  const [flip,setFlip]=useState(false);
  return <div className={`jf-sig ${x.who}`} data-flip={flip} data-loss={x.loss}>
    <button type="button" className="jf-sig-in" aria-label={`${x.whoName}의 ${x.name} 신호 ${flip?'접기':'보기'}`} onClick={()=>setFlip(!flip)}>
      <span className="jf-sig-front"><span className={`rt-face ${x.who}`} aria-hidden>{x.whoName[0]}</span><b>{x.name}</b><small>{x.whoName}</small>
        <em>{x.written?'적음 ✓':x.loss?'손실 신호':'참고'}</em><i className="jf-sig-hint">눌러서 뒤집기</i></span>
      <span className="jf-sig-back"><small>{x.whoName}가 본 것</small><p>{x.line}</p></span>
    </button>
    {flip&&!x.written&&<button type="button" className="rt-btn primary jf-sig-go" onClick={onWrite}>일지로 적기</button>}
  </div>;
}
