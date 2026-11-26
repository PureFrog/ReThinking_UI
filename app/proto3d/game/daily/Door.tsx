'use client';
// The observatory door (feedback 2026-11-19): today's one request and the past records — nothing else. The course, its
// order and what comes next live on the server only, so there is no list, no locked card and no course progress here.
// Signed in, quest-play `today` hands out the request (and the day's pack); on a device with no server the sample
// request arrives every day (content/daily/request.ts). A request finished today offers 결과 보기 and 연습으로 다시 하기;
// the next one arrives tomorrow. The old weekly challenge is read-only under 지난 기록.
import {useEffect,useState} from 'react';
import {Sheet} from '../../ui/Sheet';
import {activeRun,defOf,kstDay,titleOf,type DailyRun,type QuestDef} from '../../../core/game/daily/model';
import type {ObservatoryServer} from '../../supabase';
import {packOfDay} from '../../../content/daily/packs';
import {localToday} from '../../../content/daily/request';
import {Mono,ProgressBar} from './DailyQuest';
import type {useGarden} from '../../state';
type G=ReturnType<typeof useGarden>;

// today's request where it stands: the definition, the run being played and the one finished today (this device)
export function todayOf(g:G,server:ObservatoryServer|null,srvToday:Awaited<ReturnType<ObservatoryServer['today']>>){
  const runs=g.s.observatory?.runs??[],day=kstDay(g.clock.now);
  if(!server){const l=localToday(runs,day);return {def:l.def as QuestDef|null,open:l.open,done:l.done,day}}
  const def=srvToday?.request?.def??null,mine=def?runs.filter(r=>r.day===day&&r.quest===def.id):[];
  return {def,open:[...mine].reverse().find(r=>r.finishedAt===null)??null,done:[...mine].reverse().find(r=>r.finishedAt!==null)??null,day};
}

export function ObservatoryDoor({g,onPlay,onClose,server=null}:{g:G;onPlay:(runId:string)=>void;onClose:()=>void;server?:ObservatoryServer|null}){
  const [tab,setTab]=useState<'today'|'past'>('today');
  const runs=g.s.observatory?.runs??[],total=g.s.observatory?.progress.total_xp??0,t=titleOf(total);
  useEffect(()=>{if(!server)return;let on=true;void server.progress().then(x=>{if(on&&x){g.ops.questServerState(x.progress,x.finished);g.ops.questGrants(x.grants)}});return()=>{on=false}},[server]);// eslint-disable-line react-hooks/exhaustive-deps
  const [srvToday,setSrvToday]=useState<Awaited<ReturnType<ObservatoryServer['today']>>>(null),[note,setNote]=useState<string|null>(null);
  useEffect(()=>{if(!server)return;let on=true;void server.today().then(x=>{if(on)setSrvToday(x)});return()=>{on=false}},[server]);
  const req=todayOf(g,server,srvToday),act=activeRun(runs);
  const official=!!srvToday?.official,sample=packOfDay(kstDay(g.clock.now),req.def?.level);
  const pack=official&&srvToday?.mentor?{...sample,mentor:srvToday.mentor,sample:false}:sample;
  const start=async(practice=false)=>{if(!req.def)return;
    // an official day: the run lives on the server (quest-play); otherwise the request is played on this device
    if(server&&official){setNote('공식 판을 여는 중…');const r=await server.start(practice);
      if(r&&!('error' in r)){setNote(null);onPlay(g.ops.questAdopt(r));return}
      setNote(r&&'error' in r&&r.error==='done-today'?'오늘 의뢰는 이미 끝냈어요. 다음 의뢰는 내일 도착해요.':'공식 판을 열지 못했어요. 잠시 뒤 다시 눌러 주세요.');return}
    const id=g.ops.questOpen(req.def);if(id)onPlay(id)};
  const waiting=!!server&&!srvToday;
  const main=waiting?<p className="rt-hint">오늘의 의뢰를 받아 오는 중…</p>
    :!req.def?<p className="rt-hint">오늘은 새 의뢰가 없어요. 지난 기록에서 결과를 다시 볼 수 있어요.</p>
    :req.open?<button type="button" className="rt-btn primary wide" onClick={()=>onPlay(req.open!.id)}>이어하기 · {req.def.name}</button>
    :req.done||srvToday?.request?.done?null
    :<button type="button" className="rt-btn primary wide" onClick={()=>void start()}>의뢰 시작 · {req.def.name}</button>;
  return <Sheet kicker="관측소" title="오늘의 관측소" onClose={onClose} label="오늘의 관측소" foot={tab==='today'?main??undefined:undefined}>
    <div className="rt-tabs" role="tablist" style={{marginBottom:14}}>{([['today','오늘의 의뢰'],['past','지난 기록']] as const).map(([k,l])=>
      <button key={k} type="button" role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {tab==='today'&&<div className="dq-door" data-testid="dq-door">
      {req.def&&<div className="dq-request" data-testid="dq-request"><small>오늘 도착한 의뢰</small><strong>{req.def.name}</strong>{req.def.teaches&&<small>{req.def.tier?`${req.def.tier} · `:''}오늘 연습 · {req.def.teaches}</small>}</div>}
      <Mono pack={pack} big/>
      <p className="dq-principle sm">{pack.mentor.principle}</p>
      {pack.sample?<p className="rt-hint">예시 판이에요. 회사와 숫자는 가상이고, 실제 사건 판은 검수를 거쳐 날마다 들어와요.</p>
        :<p className="rt-hint" data-testid="dq-official">오늘의 공식 판 · {srvToday?.company?.alias}. 자료는 장면마다 하나씩 열려요.</p>}
      {server&&srvToday?.practice&&<p className="rt-hint" data-testid="dq-practice-day">오늘은 공식 판이 없어서 예시 판으로 연습해요. 순위와 경험치에는 들어가지 않아요.</p>}
      {note&&<p className="rt-hint" role="status">{note}</p>}
      {req.done&&<div className="dq-today" data-testid="dq-done-today"><div><strong>오늘 의뢰를 끝냈어요</strong><small>일지 {req.done.result?.pending?'평가 중':`${req.done.result?.journal}점`} · {req.done.mode==='ranked'?`+${req.done.result?.xp.xp??0} XP`:'연습'} · 다음 의뢰는 내일 도착해요</small></div>
        <span><button type="button" className="rt-btn" onClick={()=>onPlay(req.done!.id)}>결과 보기</button>
          <button type="button" className="rt-btn" disabled={!!act} onClick={()=>void start(true)}>연습으로 다시 하기</button></span></div>}
      <div className="rt-section">관측소 숙련도</div>
      <p className="rt-hint" data-testid="dq-source">{server?'서버 기록 기준이에요.':'이 기기 기록이에요. 로그인하면 서버에 남아요.'}</p>
      <ProgressBar total={total} t={t}/>
      <Titles g={g}/>
    </div>}
    {tab==='past'&&<Past g={g} onPlay={onPlay}/>}
  </Sheet>;
}

// past records: the requests finished before (newest first, results open again) and the old weekly challenge
function Past({g,onPlay}:{g:G;onPlay:(id:string)=>void}){
  const done=(g.s.observatory?.runs??[]).filter(r=>r.finishedAt!==null).sort((a,b)=>(b.finishedAt??0)-(a.finishedAt??0));
  return <div data-testid="dq-past">
    <div className="rt-section">지난 의뢰</div>
    {done.length?done.slice(0,30).map((r:DailyRun)=><div key={r.id} className="rt-row"><div><strong>{r.day} · {defOf(r).name}</strong>
      <small>{r.mode==='ranked'?'정식':'연습'} · 일지 {r.result?.pending?'평가 중':r.result?.journal??'—'}점</small></div>
      <button type="button" className="rt-btn" onClick={()=>onPlay(r.id)}>결과 보기</button></div>)
      :<p className="rt-empty">아직 끝낸 의뢰가 없어요</p>}
    <div className="rt-section" style={{marginTop:16}}>지난 주간 챌린지</div>
    <p className="rt-hint">예전 주간 챌린지 기록이에요. 보기만 할 수 있어요.</p>
    {(g.s.expeditions??[]).length?[...g.s.expeditions].reverse().map(r=><div key={r.at} className="rt-row"><div><strong>{r.week} 주</strong><small>결정 {r.decisions.length}번{r.hits!=null?` · 적중 ${r.hits}`:''}{r.ret!=null?` · 수익 ${r.ret>0?'+':''}${r.ret}%`:''}</small></div><b className="rt-num">{r.total}</b></div>)
      :<p className="rt-empty">지난 주간 챌린지 기록이 없어요</p>}
  </div>;
}

// the rewards kept so far (core/game/daily/rewards.ts): titles by day, the weekly decoration, the first clear
export function Titles({g}:{g:G}){const gs=g.s.observatory?.grants??[];if(!gs.length)return null;
  return <ul className="dq-titles" data-testid="dq-titles">{gs.slice(-6).reverse().map(x=><li key={x.key}><b>{x.label}</b><small>{x.period}{x.item?' · 꾸미기에 있어요':''}</small></li>)}</ul>}
