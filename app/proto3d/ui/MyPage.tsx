'use client';
// 내 관찰자 (the "my page"): over the stage (Showroom3D.tsx), my name plate and what kind of judge I am, then three tabs:
//   꾸미기  what my observer wears (core/wardrobe.ts): pick a slot, pick a piece; locked ones say how to get them
//   기록    my record in big numbers that count up, my choices and how right I was at each confidence (core/profile.ts)
//   도장첩  the stamps (core/stamps.ts): earned ones as red seals with the day, the rest as outlines with what it takes
// Never returns or amounts: what is shown off here is how well I judged.
import {won} from '../../core/won';
import {still} from '../still';
import {useEffect,useState} from 'react';
import {masterOn} from '../../core/master';
import {WEAR,PALETTES,SLOTS,isOpen,howTo,fitLook,type Slot,type Look,type WearCtx} from '../../core/wardrobe';
import {STAMPS,stampById} from '../../core/stamps';
import {habitOf,byConfidence,choiceShare} from '../../core/profile';
import {trackOf} from '../../core/judgment';
import {rankOf,xpOf,RANKS} from '../../core/rank';
import {analystById,CURRENCY} from '../../content/analysts';
import {formatDay} from '../../core/items';
import {Cross,Lock} from './Icons';
import type {useGarden} from '../state';
import {workOf} from '../state';
import {titleOf} from '../../core/game/daily/model';
import {ProgressBar} from '../game/daily/DailyQuest';
import {Titles} from '../game/daily/Door';
type G=ReturnType<typeof useGarden>;

function Count({to,suffix=''}:{to:number|null;suffix?:string}){
  const [v,setV]=useState(0);
  useEffect(()=>{if(to===null)return;if(still()){setV(to);return}
    const t0=performance.now();let id=0;const f=(n:number)=>{const k=Math.min(1,(n-t0)/900);setV(Math.round(to*(1-Math.pow(1-k,3))));if(k<1)id=requestAnimationFrame(f)};id=requestAnimationFrame(f);return()=>cancelAnimationFrame(id)},[to]);
  return <>{to===null?'—':v}{to===null?'':<span className="rt-unit">{suffix}</span>}</>;
}
// what putting each piece on is called: a hat is worn on the head (쓰다), a bag on the back (메다), a tool in the hand (들다)
const VERB:Record<string,[string,string]>={coat:['입기','입는 중'],hat:['쓰기','쓰는 중'],bag:['메기','메는 중'],tool:['들기','드는 중']};
export function wearCtx(g:G):WearCtx{
  const rank=rankOf(xpOf({graded:g.s.graded.length,cases:g.s.cases.length,rewinds:g.s.rewinds.length,work:workOf(g.s)})).index;
  return {rank,stamps:g.s.stamps.map(s=>s.id),trust:{tori:g.s.trust.tori.stage,moa:g.s.trust.moa.stage,luon:g.s.trust.luon.stage},bought:g.s.wardrobe,all:masterOn()};
}
// 피드백 11-25: mode 'shop' (옷 가게) picks a piece, then 구매 and 입기 are two buttons, so buying feels like buying;
// mode 'closet' (the wardrobe in my room, the only other place to change) wears what I have, and names the shop for the rest
export function MyPage({g,onClose,onRecords,onSettings,onLetter,wearOnly,mode='closet'}:{wearOnly?:boolean;mode?:'shop'|'closet';g:G;onClose:()=>void;onRecords:()=>void;onSettings?:()=>void;onLetter?:()=>void}){
  const [tab,setTab]=useState<'wear'|'record'|'stamps'>('wear'),[slot,setSlot]=useState<Slot|'color'>('coat'),[naming,setNaming]=useState(false),[name,setName]=useState(g.s.name);
  const ctx=wearCtx(g),look=fitLook(g.s.look,ctx),rk=rankOf(xpOf({graded:g.s.graded.length,cases:g.s.cases.length,rewinds:g.s.rewinds.length,work:workOf(g.s)}));
  const habit=habitOf(g.s.judgments,g.s.graded),t=trackOf(g.s.judgments,g.s.graded);
  const names={rank:(i:number)=>RANKS[i].name,stamp:(id:Parameters<typeof stampById>[0])=>stampById(id).name,who:(w:'tori'|'moa'|'luon')=>analystById(w).name};
  const wear=(l:Look)=>g.ops.setLook(l);
  const pieces=slot==='color'?[]:WEAR.filter(w=>w.slot===slot);
  const [sel,setSel]=useState<string|null>(null),[got,setGot]=useState<string|null>(null);
  const shop=mode==='shop',chosen=shop&&sel?WEAR.find(w=>w.id===sel&&w.slot===slot)??null:null;
  return <div className="rt-me" role="dialog" aria-label="내 프로필">
    <header className="rt-me-plate">
      {!wearOnly&&<div className="rt-me-rank">{rk.name}</div>}
      {naming?<form onSubmit={e=>{e.preventDefault();g.ops.setName(name.trim()||'나');setNaming(false)}}><input className="rt-input" value={name} maxLength={12} autoFocus aria-label="내 이름" onChange={e=>setName(e.target.value)}/></form>
        :<button type="button" className="rt-me-name" onClick={()=>setNaming(true)} aria-label="이름 바꾸기">{g.s.name||'이름 정하기'}</button>}
      {!wearOnly&&<div className="rt-me-habit"><strong>{habit.name}</strong><small>{habit.why}</small></div>}
      {!wearOnly&&rk.next&&<div className="rt-me-xp" aria-label={`${rk.next.name}까지 ${rk.next.left}`}><i style={{width:`${Math.round(rk.progress*100)}%`}}/><span>{rk.next.name}까지 {rk.next.left}XP</span></div>}
    </header>
    <div className="rt-me-top">{onSettings&&<button type="button" className="rt-btn" onClick={onSettings}>설정</button>}<button type="button" className="rt-btn" onClick={onClose}><Cross size={18}/>닫기</button></div>
    <section className="rt-me-panel">
      {/* the clothes shop opens the wardrobe alone: a title, not a row of one tab */}
      {wearOnly?<h2 className="rt-me-only">{shop?'옷 가게':'옷장'}</h2>:<div className="rt-tabs" role="tablist">{([['wear','꾸미기'],['record','기록'],['stamps','업적']] as const).map(([k,l])=>
        <button key={k} type="button" role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l}</button>)}</div>}
      {tab==='wear'&&<>
        <div className="rt-me-slots">{[...SLOTS,{id:'color' as const,label:'색'}].map(s=><button key={s.id} type="button" aria-pressed={slot===s.id} onClick={()=>setSlot(s.id)}>{s.label}</button>)}</div>
        <div className="rt-me-grid">
          {slot!=='color'&&slot!=='coat'&&<button type="button" className="rt-me-tile" aria-pressed={!look[slot]} onClick={()=>wear({...look,[slot]:null})}><strong>없음</strong></button>}
          {pieces.map(w=>{const open=isOpen(w.unlock,ctx,w.id),on=look[w.slot]===w.id,price=w.unlock.kind==='buy'?w.unlock.price:0;
            if(shop)return <button key={w.id} type="button" className="rt-me-tile" data-locked={!open&&!price} aria-pressed={sel===w.id}
              onClick={()=>{setSel(w.id);setGot(null)}}>
              <strong>{w.name}</strong><small>{open?(on?(VERB[w.slot]??VERB.coat)[1]:'가지고 있어요'):price?`${won(price)} 코인`:<><Lock size={12}/> {howTo(w.unlock,names)}</>}</small></button>;
            return <button key={w.id} type="button" className="rt-me-tile" data-locked={!open} aria-pressed={on}
              onClick={()=>{if(open)wear({...look,[w.slot]:w.id})}}>
              <strong>{w.name}</strong>{open?<small>{(VERB[w.slot]??VERB.coat)[on?1:0]}</small>:<small><Lock size={12}/> {price?'옷 가게에서 사요':howTo(w.unlock,names)}</small>}</button>})}
          {slot==='color'&&PALETTES.map(p=>{const open=isOpen(p.unlock,ctx,p.id);return <button key={p.id} type="button" className="rt-me-tile" data-locked={!open} aria-pressed={look.palette===p.id} onClick={()=>open&&wear({...look,palette:p.id})}>
            <span className="rt-me-swatch">{[p.primary,p.secondary,p.accent].map(c=><i key={c} style={{background:c}}/>)}</span><strong>{p.name}</strong>{!open&&<small><Lock size={12}/> {howTo(p.unlock,names)}</small>}</button>})}
        </div>
        {shop&&chosen&&(()=>{const w=chosen,open=isOpen(w.unlock,ctx,w.id),on=look[w.slot]===w.id,price=w.unlock.kind==='buy'?w.unlock.price:0,v=VERB[w.slot]??VERB.coat;
          return <div className="rt-me-buy" data-testid="wear-buy">
            <div className="rt-me-buy-t"><strong>{w.name}</strong><small>{got===w.id?'샀어요! 입어 볼래요?':open?'가지고 있는 옷이에요':price?`${won(price)} 코인 · 지금 ${won(g.s.currency)}`:howTo(w.unlock,names)}</small></div>
            {!open&&price>0&&<button type="button" className="rt-btn primary" disabled={g.s.currency<price} onClick={()=>{if(g.ops.buyWear(w.id,price))setGot(w.id)}}>{g.s.currency<price?'코인 부족':'구매'}</button>}
            {open&&<button type="button" className="rt-btn primary" disabled={on} onClick={()=>wear({...look,[w.slot]:w.id})}>{on?v[1]:v[0]}</button>}
          </div>})()}</>}
      {tab==='record'&&<div className="rt-me-record">
        {/* 관측소 숙련도 (game/daily): investor_progress — title, level, the bar to the next, the quests opened */}
        <div className="rt-section">관측소 숙련도</div>
        {/* no course list here (feedback 2026-11-19): what comes next stays on the server */}
        {(()=>{const total=g.s.observatory?.progress.total_xp??0;
          return <div data-testid="me-observatory" style={{marginBottom:14}}><ProgressBar total={total} t={titleOf(total)}/><Titles g={g}/></div>})()}
        <div className="rt-me-big"><div><span>판단 적중</span><b className="rt-num"><Count to={t.hitRate} suffix="%"/></b></div><div><span>확신 보정</span><b className="rt-num"><Count to={t.calibration}/></b></div>
          <div><span>기록한 판단</span><b className="rt-num"><Count to={t.judged}/></b></div><div><span>최고 연속</span><b className="rt-num"><Count to={g.s.streak.best} suffix="일"/></b></div></div>
        <div className="rt-section">고른 판단</div>
        {(()=>{const s=choiceShare(g.s.judgments);return <div className="rt-me-bars">{([['hold','홀드'],['review','손절 검토'],['watch','더 지켜봄']] as const).map(([k,l])=>
          <div key={k}><span>{l}</span><i style={{width:`${Math.round(s[k]*100)}%`}}/><b className="rt-num">{Math.round(s[k]*100)}%</b></div>)}</div>})()}
        <div className="rt-section">확신도별 실제 적중</div>
        <div className="rt-me-bars">{byConfidence(g.s.judgments,g.s.graded).map(x=><div key={x.c}><span>확신 {x.c}</span><i style={{width:`${x.rate??0}%`}}/><b className="rt-num">{x.rate===null?'—':`${x.rate}%`}</b></div>)}</div>
        <button type="button" className="rt-btn" style={{width:'100%',marginTop:12}} onClick={onRecords}>판단 목록과 케이스 도감</button>
        {onLetter&&<button type="button" className="rt-btn" style={{width:'100%',marginTop:8}} onClick={onLetter}>이번 달 리포트 미리 보기</button>}
      </div>}
      {tab==='stamps'&&<div className="rt-me-stamps">{STAMPS.map(s=>{const got=g.s.stamps.find(x=>x.id===s.id);
        return <div key={s.id} className="rt-me-stamp" data-got={!!got}><i aria-hidden>{got?s.name[0]:''}</i><strong>{s.name}</strong><small>{got?formatDay(got.day,g.clock.today):s.how}</small></div>})}
        <p className="rt-hint" style={{gridColumn:'1/-1'}}>{g.s.stamps.length} / {STAMPS.length}개 · {CURRENCY} {won(g.s.currency)}</p></div>}
    </section>
  </div>;
}
