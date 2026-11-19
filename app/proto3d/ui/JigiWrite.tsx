'use client';
// Writing a 지기 journal (docs/jigi.md 2.3): three pages swiped through in one sheet — 종목과 차트, 가설, 기한과 확신
// (feedback 11-17: 몸·마음·기분 left; a page whose blanks are all filled goes on to the next by itself, 이전 goes back;
// each page starts with one line on how the stock has been moving, core/jigi/flow.ts; saving opens the analysis). Each page reads like the diary of the prototype ("종목은 [ ], 오늘 한 일은 [ ]."); a blank opens its
// chips under the sentence. Everything typed goes straight into the garden save (a draft), so closing, rotating or
// leaving the app keeps it. Saving with something missing jumps to that page and marks it.
import {useEffect,useRef,useState} from 'react';
import {Sheet} from './Sheet';
import {JigiChart} from './JigiChart';
import {GUIDES,EXAMPLES,HORIZONS,OPTS,PICKS,PICK_LABEL,checkDateOf,missing,required,setStock,type Journal,type OptKey,type PickKey,type Horizon} from '../../core/jigi/journal';
import {searchStocks,bars} from '../../core/jigi/stocks';
import {flowLine} from '../../core/jigi/flow';
import {TIMING} from '../../core/timing';
import type {JigiAI} from '../supabase';

const PAGES=['종목과 차트','가설','기한과 확신'] as const;
const LAST=PAGES.length-1;
const WEEK='일월화수목금토';
// tasks: the study tasks I took from the analysis, shown on the last page as this journal's checklist
export function JigiWrite({j,today,marks,edit,onSave,onClose,onSaved,tasks=[],ai}:{onSaved?:()=>void;ai?:JigiAI|null;j:Journal;today:string;marks:{date:string;price:number;id:string}[];tasks?:{id:string;text:string}[];
  edit:(fn:(j:Journal)=>Journal)=>void;onSave:()=>{missing:{key:string;page:number}[]}|{version:number};onClose:()=>void}){
  const [page,setPage]=useState(()=>{const m=missing(j)[0];return m?m.page-1:0});
  // auto-advance: armed by a pick or by leaving a text field; once this page has nothing missing, on to the next
  const armed=useRef(false),[tick,setTick]=useState(0);
  const arm=()=>{armed.current=true;setTick(n=>n+1)};
  const [slot,setSlot]=useState<PickKey|'stock'|null>(null),[q,setQ]=useState(''),[miss,setMiss]=useState<string|null>(null),[saved,setSaved]=useState<string|null>(null);
  const [guide,setGuide]=useState<OptKey|null>(null),[asked,setAsked]=useState<Partial<Record<OptKey,string[]|'busy'>>>({});
  // 작성 도움: the general question at once, then (signed in) two questions fitted to this journal from the server (call B)
  const help=(k:OptKey,title:string)=>{if(guide===k){setGuide(null);return}setGuide(k);if(ai&&!asked[k]){setAsked(a=>({...a,[k]:'busy'}));void ai.assist(j,k,title).then(q=>setAsked(a=>({...a,[k]:q??[]})))}};
  useEffect(()=>{setSlot(null);setGuide(null)},[page]);
  const f=j.f,req=required(j),done=req.filter(r=>r.ok).length;
  useEffect(()=>{if(!armed.current)return;armed.current=false;const p=page;if(p>=LAST)return;
    if(req.filter(r=>r.page===p+1).every(r=>r.ok)){const t=setTimeout(()=>setPage(x=>x===p?p+1:x),TIMING.jigiNext);return()=>clearTimeout(t)}},[j,tick]);// eslint-disable-line react-hooks/exhaustive-deps
  const flow=j.stock?flowLine(bars(j.stock.code),today):null;
  const set=(p:Partial<Journal['f']>)=>{setMiss(null);edit(x=>({...x,f:{...x.f,...p}}))};
  const d=new Date(j.createdAt);
  // a blank in the diary sentence: filled (green underline) or empty (dashed)
  const blank=(k:PickKey|'stock')=>{const v=k==='stock'?j.stock?.name:f[k];return <button type="button" className={`jg-slot${v?'':' empty'}${slot===k?' on':''}${miss===k?' miss':''}`}
    aria-expanded={slot===k} aria-label={`${PICK_LABEL[k]}${v?': '+v:' 고르기'}`} onClick={()=>setSlot(slot===k?null:k)}>{v||PICK_LABEL[k]}</button>};
  const picks=(keys:(PickKey|'stock')[])=>{if(!slot||!keys.includes(slot))return null;
    if(slot==='stock')return <div className="jg-pick"><input className="rt-input" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="종목명 또는 종목코드" aria-label="종목 검색" autoFocus/>
      <div className="jg-results">{searchStocks(q).map(s=><button key={s.code} type="button" className="rt-row" onClick={()=>{edit(x=>{const y={...x};setStock(y,s.code,today);return y});setSlot(null);setQ('');arm()}}>
        <div><strong>{s.name}</strong><small>{s.code} · {s.mkt}</small></div></button>)}
        {q&&!searchStocks(q).length&&<p className="rt-hint">찾는 종목이 없어요. 지금은 12개 종목만 돼요. 예: 삼성전자, 000660</p>}</div></div>;
    const k=slot;return <div className="jg-pick rt-seg" role="group" aria-label={PICK_LABEL[k]}>{PICKS[k].map(v=><button key={v} type="button" aria-pressed={f[k]===v}
      onClick={()=>{set({[k]:f[k]===v&&(k==='mood'||k==='conf')?'':v} as Partial<Journal['f']>);setSlot(null);arm()}}>{v}</button>)}</div>};
  const save=()=>{const r=onSave();if('missing' in r){const m=r.missing[0];setPage(m.page-1);setMiss(m.key);return}setSaved(`저장했어요 · 버전 ${r.version}`);setTimeout(onSaved??onClose,700)};
  const missOn=(p:number)=>req.some(r=>!r.ok&&r.page===p+1);
  const area=(k:'hypo'|'reason'|'recheck',label:string)=><label className={`jg-q${miss===k?' miss':''}`}><span className="jg-prompt">{label}</span>
    <textarea className="jg-lined" value={f[k]} onChange={e=>set({[k]:e.target.value})} onBlur={arm} placeholder={'예: '+EXAMPLES[k]} rows={2}/></label>;

  return <Sheet kicker="투자일지 쓰기" title={`${d.getMonth()+1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`} label="일지 쓰기" onClose={onClose}
    foot={<div className="jg-foot">
      <span className="jg-count" aria-label={`필수 ${req.length}개 중 ${done}개`}><b className="rt-num">{done}/{req.length}</b><i><span style={{width:`${done/req.length*100}%`}}/></i></span>
      <span className="rt-hint jg-saved" role="status">{saved??(j.status==='saved'?'저장한 일지 · 고치면 새 버전':'임시저장됨')}</span>
      {page>0&&<button type="button" className="rt-btn" onClick={()=>setPage(page-1)}>이전</button>}
      {page<LAST?<button type="button" className="rt-btn primary" onClick={()=>setPage(page+1)}>다음</button>
        :<button type="button" className="rt-btn primary" onClick={save}>일지 저장</button>}</div>}>
    <nav className="jg-pages" aria-label="일지 쪽">{PAGES.map((p,i)=><button key={p} type="button" aria-current={i===page?'step':undefined} onClick={()=>setPage(i)}>
      <span className="rt-num">{i+1}</span>{p}{missOn(i)&&<i className="jg-dot" aria-label="빠진 칸 있음"/>}</button>)}</nav>
    {flow&&<p className="jg-flow" role="note" aria-label="종목 흐름"><b>{j.stock!.name}</b> {flow}</p>}
    <div className="jg-paper">
      {page===0&&<>
        <p className="jg-diary">종목은 {blank('stock')}, 오늘 한 일은 {blank('action')}.</p>{picks(['stock','action'])}
        <p className="jg-diary">이 종목은 {blank('understand')}.</p>{picks(['understand'])}
        {j.stock&&<JigiChart code={j.stock.code} name={j.stock.name} today={today} marks={[...marks.filter(m=>m.id!==j.id).map(m=>({date:m.date,price:m.price})),...(j.anchor?[{date:j.anchor.date,price:j.anchor.close,main:true}]:[])]}/>}
        {j.anchor&&<p className="rt-hint">기록 기준: {j.anchor.date} 종가 <span className="rt-num">{j.anchor.close.toLocaleString('ko-KR')}</span>원</p>}</>}
      {page===1&&<>
        {area('hypo','앞으로 어떻게 될 것 같나요?')}
        {area('reason','왜 그렇게 생각하나요?')}
        <div className={`jg-q${miss==='recheck'?' miss':''}`}><div className="jg-q-head"><span className="jg-prompt">어떤 일이 생기면 다시 생각해 볼까요?</span>
          <button type="button" className="jg-chip" aria-pressed={f.recheckUnknown} onClick={()=>{set({recheckUnknown:!f.recheckUnknown});arm()}}>아직 모르겠음</button></div>
          {!f.recheckUnknown&&<textarea className="jg-lined" value={f.recheck} onChange={e=>set({recheck:e.target.value})} onBlur={arm} placeholder={'예: '+EXAMPLES.recheck} rows={2} aria-label="다시 볼 조건"/>}</div></>}
      {page===2&&<>
        <div className={`jg-q${miss==='horizon'?' miss':''}`}><span className="jg-prompt">얼마 동안 보는 생각인가요?</span>
          <div className="rt-seg jg-hz" role="group" aria-label="기간">{([...Object.keys(HORIZONS),'아직 모르겠음'] as Horizon[]).map(h=><button key={h} type="button" aria-pressed={f.horizon===h}
            onClick={()=>set({horizon:h,checkDate:checkDateOf(h,today)})}>{h}</button>)}</div>
          {f.checkDate&&<p className="rt-hint">다시 볼 날 <span className="rt-num">{f.checkDate}</span></p>}</div>
        <p className="jg-diary soft">확신은 {blank('conf')}.</p>{picks(['conf'])}
        {tasks.length>0&&<p className="jg-check-list" aria-label="이번에 챙길 것">이번에 챙길 것 · {tasks.map(t=>t.text).join(' · ')}</p>}
        {OPTS.filter(([k])=>j.open[k]).map(([k,l,qn])=><div key={k} className="jg-opt">
          <div className="jg-q-head"><span className="jg-prompt">{l} · {qn}</span><span>
            <button type="button" className="jg-chip" onClick={()=>help(k,l)}>작성 도움</button>
            <button type="button" className="jg-chip" onClick={()=>edit(x=>({...x,open:{...x.open,[k]:false}}))}>접기</button></span></div>
          {guide===k&&<div className="jg-guide" role="note"><p style={{margin:0}}>{GUIDES[k]}</p>
            {asked[k]==='busy'&&<p className="rt-hint" style={{margin:'4px 0 0'}}>이 일지에 맞는 질문을 찾는 중…</p>}
            {Array.isArray(asked[k])&&(asked[k] as string[]).map(q=><p key={q} style={{margin:'4px 0 0'}}>· {q}</p>)}</div>}
          {k==='exit'?<>
            <textarea className="jg-lined" value={f.exit.stop} onChange={e=>set({exit:{...f.exit,stop:e.target.value}})} placeholder="일찍 정리할 조건. 예: 가설이 틀렸다는 공시가 나오면" aria-label="손절 조건" rows={2}/>
            <textarea className="jg-lined" value={f.exit.target} onChange={e=>set({exit:{...f.exit,target:e.target.value}})} placeholder="정리할 목표나 시점. 예: 다음 실적 발표 뒤" aria-label="청산 조건" rows={2}/>
            <div className="rt-seg" role="group" aria-label="기간이 끝났는데 목표에 못 미치면">{(['재검토','일부 청산','전량 청산','미정'] as const).map(v=><button key={v} type="button" aria-pressed={f.exit.expire===v} onClick={()=>set({exit:{...f.exit,expire:v}})}>{v}</button>)}</div></>
          :<textarea className="jg-lined" value={f.opt[k]??''} onChange={e=>set({opt:{...f.opt,[k]:e.target.value}})} placeholder={'예: '+(EXAMPLES[k]??'')} aria-label={l} rows={2}/>}
        </div>)}
        <div className="jg-more">{OPTS.filter(([k])=>!j.open[k]).map(([k,l])=><button key={k} type="button" className="jg-chip add" onClick={()=>edit(x=>({...x,open:{...x.open,[k]:true}}))}>+ {l}</button>)}</div></>}
    </div>
  </Sheet>;
}
