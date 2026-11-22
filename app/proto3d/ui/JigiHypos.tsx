'use client';
// A saved journal's hypotheses (지기 J2, docs/jigi.md 2.4): pull drafts from my own words (rule-based until the server
// brings LLM call A) or add one by hand; fix each draft's field, form, direction and end date; confirm it (a stock
// direction is fixed against the last confirmed close and graded by itself at the end date) or delete it. Confirmed
// ones are locked and show their verdict; no manual 적중/실패 buttons. Then, once a verdict is in, the review.
import {useState} from 'react';
import {DOMAINS,DIRS,FORMS,ROLES,extractDrafts,missingOf} from '../../core/jigi/extract';
import {autoGradable,verdict} from '../../core/jigi/hypothesis';
import {lastConfirmed} from '../../core/jigi/stocks';
import type {Hypo,Journal,Reflection} from '../../core/jigi/journal';
import {Pill} from './JigiBook';
import type {JigiAI} from '../supabase';

const won=(n:number)=>n.toLocaleString('ko-KR')+'원';
const ymd=(ms:number)=>new Date(ms).toISOString().slice(0,10);
export function JigiHypos({j,today,newId,onHypos,onConfirm,onReflect,ai}:{ai?:JigiAI|null;j:Journal;today:string;newId:()=>string;onHypos:(h:Hypo[])=>void;
  onConfirm:(hypoId:string)=>string;onReflect:(r:Reflection)=>void}){
  const [msg,setMsg]=useState<string|null>(null);
  const set=(id:string,p:Partial<Hypo>)=>onHypos(j.hypos.map(h=>h.id===id?{...h,...p}:h));
  // the server's LLM first (call A, my words only); the rule-based split when it cannot answer
  const [busy,setBusy]=useState(false);
  const pull=async()=>{const keep=j.hypos.filter(h=>h.status==='confirmed');let via='규칙 기반';let raw=null as ReturnType<typeof extractDrafts>|null;
    if(ai){setBusy(true);setMsg('원문에서 가설을 찾는 중…');raw=await ai.extract(j);setBusy(false);if(raw)via='AI 구조화'}
    const d=(raw??extractDrafts(j)).map(x=>({...x,id:newId(),status:'draft' as const}));
    onHypos([...keep,...d]);setMsg(d.length?`가설 ${d.length}개를 뽑았어요(${via}). 고치고 확정해 주세요`:'뽑을 문장을 찾지 못했어요. 직접 추가해 주세요')};
  const add=()=>onHypos([...j.hypos,{id:newId(),text:'',src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir:'없음',endDate:j.f.checkDate,status:'draft'}]);
  const sel=(h:Hypo,k:'domain'|'form'|'role'|'dir',list:readonly string[],label:string)=><label>{label}
    <select value={h[k]} onChange={e=>set(h.id,{[k]:e.target.value} as Partial<Hypo>)}>{list.map(v=><option key={v}>{v}</option>)}</select></label>;
  const judged=j.hypos.some(h=>{const s=verdict(j,h,today).s;return s==='hit'||s==='fail'});
  const r=j.reflection??{plan:'',missed:'',change:'',at:0};
  return <>
    {j.hypos.map(h=>{const v=verdict(j,h,today);
      if(h.status==='confirmed')return <div key={h.id} className="jg-hypo">
        <div className="jg-row"><span className="jg-orig">{h.text}</span><Pill s={v.s}/></div>
        <small className="rt-hint">{h.domain} · {h.form} · {h.role}{h.dir!=='없음'?' · '+h.dir:''}{h.confirmedAt?' · 확정 '+ymd(h.confirmedAt):''}</small>
        {h.auto&&h.base&&<p className="jg-rule rt-num">기준 {h.base.date} 종가 {won(h.base.close)} → 종료 {h.endDate}
          {v.end?<> ({v.end.d} 종가 {won(v.end.c)}, <span className={v.end.c>h.base.close?'rt-up':v.end.c<h.base.close?'rt-down':''}>{((v.end.c/h.base.close-1)*100).toFixed(2)}%</span>)</>:v.s==='wait'?' · 종가가 확정되면 자동 판정':''}</p>}
        {v.s==='data'&&<p className="rt-hint">이 가설은 서버 자료가 붙으면 자동으로 판정해요</p>}</div>;
      const miss=missingOf(h),b=autoGradable(h)&&j.stock?lastConfirmed(j.stock.code,today):null;
      return <div key={h.id} className="jg-hypo edit" role="group" aria-label="가설 초안">
        <div className="jg-row"><small className="rt-hint">{h.src}에서</small><Pill s={v.s}/></div>
        <textarea className="jg-lined" rows={2} value={h.text} onChange={e=>set(h.id,{text:e.target.value})} aria-label="가설 문장" placeholder="예: 삼성전자 주가가 석 달 안에 오를 것이다."/>
        <div className="jg-hgrid">{sel(h,'domain',DOMAINS,'분야')}{sel(h,'form',FORMS,'형태')}{sel(h,'role',ROLES,'논리 단계')}{sel(h,'dir',DIRS,'방향')}
          <label>평가 종료일<input type="date" value={h.endDate} min={today} onChange={e=>set(h.id,{endDate:e.target.value})}/></label></div>
        {miss.length>0&&<p className="jg-warn">빠진 정보: {miss.join(', ')}. 채우면 자동 판정에 올릴 수 있어요</p>}
        {b&&h.endDate&&h.dir!=='없음'&&<p className="jg-rule rt-num">판정 기준 · {b.d} 종가 {won(b.c)} · {h.endDate} 종가(휴장일이면 직전 거래일) · {h.dir==='상승'?'종료 > 기준이면 적중':'종료 < 기준이면 적중'}, 같으면 빗나감</p>}
        <label className="jg-check"><input type="checkbox" checked={!!h.postHoc} onChange={e=>set(h.id,{postHoc:e.target.checked})}/> 결과를 이미 아는 예측이에요(사후 기록, 성적에서 빠져요)</label>
        <div className="jg-row"><button type="button" className="rt-btn primary" onClick={()=>setMsg(onConfirm(h.id))}>{autoGradable(h)&&!h.postHoc?'확정하고 판정 등록':'확정'}</button>
          <button type="button" className="rt-btn" onClick={()=>onHypos(j.hypos.filter(x=>x.id!==h.id))}>삭제</button></div></div>})}
    {msg&&<p className="rt-hint" role="status">{msg}</p>}
    {j.status==='saved'&&<div className="jg-row" style={{justifyContent:'flex-start'}}>
      <button type="button" className={`rt-btn${j.hypos.length?'':' primary'}`} disabled={busy} onClick={()=>void pull()}>{j.hypos.some(h=>h.status!=='confirmed')?'다시 뽑기(초안만 바뀜)':j.hypos.length?'원문에서 더 뽑기':'가설 뽑기'}</button>
      <button type="button" className="rt-btn" onClick={add}>직접 추가</button></div>}
    {judged&&<div className="jg-review" role="group" aria-label="복기">
      <div className="jg-prompt">계획대로 행동했나요?</div>
      <div className="rt-seg" role="group" aria-label="계획대로 행동했나요">{(['예','일부만','아니오','거래 없음'] as const).map(p=><button key={p} type="button" aria-pressed={r.plan===p} onClick={()=>onReflect({...r,plan:p,at:Date.now()})}>{p}</button>)}</div>
      <label className="jg-q"><span className="jg-prompt">놓친 정보가 있었나요?</span><textarea className="jg-lined" rows={2} value={r.missed} onChange={e=>onReflect({...r,missed:e.target.value,at:Date.now()})}/></label>
      <label className="jg-q"><span className="jg-prompt">다음에는 무엇을 바꿀까요?</span><textarea className="jg-lined" rows={2} value={r.change} onChange={e=>onReflect({...r,change:e.target.value,at:Date.now()})}/></label></div>}
  </>;
}
