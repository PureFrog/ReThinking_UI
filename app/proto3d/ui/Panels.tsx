'use client';
// Everything around the loop: the track record (R4), the league and the game door (R5), the cart and the drawer
// (R6), and an analyst's profile. Rules in app/core, data in app/content, actions in state.ts.
import {won} from '../../core/won';
import {rewindTrack} from '../../core/rewind';
import {nextGrade,type TodayTask,type TaskId} from '../../core/today';
import {rankOf,xpOf} from '../../core/rank';
import {recallOf} from '../../core/recall';
import {useEffect,useState} from 'react';
import {Lock} from './Icons';
import {trackOf,CHOICE_LABEL,shiftDay,daysBetween,MARKS} from '../../core/judgment';
import {impulseOf} from '../../core/cooldown';
import {weekPoints,TIERS,tierOf} from '../../core/league';
import {shownCount} from '../../core/streak';
import {TRUST_LABEL,EARN} from '../../core/ledger';
import {weekGoals,type WeekCtx} from '../../core/weekly';
export const weekCtx=(g:{s:{judgments:WeekCtx['judgments'];graded:WeekCtx['graded'];cases:WeekCtx['cases'];rewinds:WeekCtx['rewinds'];daysDone:string[]}}):WeekCtx=>({judgments:g.s.judgments,graded:g.s.graded,cases:g.s.cases,rewinds:g.s.rewinds,daysDone:g.s.daysDone});
import {STAGE_POINTS} from '../../core/relationships';
import {formatDay} from '../../core/items';
import {CASES} from '../../content/cases';
import {GAME} from '../../content/game';
import {trustOf} from '../../core/game/meta';
import type {RunRecord} from '../../core/game/run';
import {CART_STOCK,DECOR_SLOTS,itemById} from '../../content/garden-items';
import {ANALYSTS,MODEL_INFO,LINES,UI,CURRENCY,analystById,say,line,type AnalystId} from '../../content/analysts';
import type {Signal} from '../../content/signals';
import {leagueRepo} from '../server';
import {Sheet,Face,pct} from './Sheet';
import type {useGarden} from '../state';
import {workOf,weekWorkOf} from '../state';
type G=ReturnType<typeof useGarden>;

const SLOT_LABEL:Record<string,string>={'door-l':'현관 왼쪽','door-r':'현관 오른쪽',fire:'모닥불 옆',pond:'연못 가',path:'뒷길',field:'풀밭','in-corner':'집 안 구석','in-window':'집 안 창가','in-rug':'집 안 깔개'};

// onLapse: the garden's year as a timelapse (W5)
export function Records({g,onClose,onHoldings,onLapse}:{g:G;onClose:()=>void;onHoldings:()=>void;onLapse?:()=>void}){
  const [tab,setTab]=useState<'stats'|'list'|'cases'>('stats');
  const t=trackOf(g.s.judgments,g.s.graded),rw=rewindTrack(g.s.rewinds),rk=rankOf(xpOf({graded:g.s.graded.length,cases:g.s.cases.length,rewinds:g.s.rewinds.length,work:workOf(g.s)})),imp=impulseOf(g.s.cooldowns),week=weekPoints(g.s.graded,g.s.cases,g.clock.today,weekWorkOf(g.s,g.clock.today));
  const solved=g.s.cases.map(a=>({a,c:CASES.find(c=>c.id===a.caseId)})).filter(x=>x.c);
  return <Sheet kicker="트랙 레코드" title="내 판단의 질" onClose={onClose}
    foot={<><button type="button" className="rt-btn wide" onClick={onHoldings}>내 종목 고치기 · {g.s.holdings.length}종목</button>
      {onLapse&&<button type="button" className="rt-btn" onClick={onLapse}>1년 돌려보기</button>}</>}>
    <div className="rt-tabs" role="tablist">{([['stats','스탯'],['list','판단'],['cases','케이스 도감']] as const).map(([k,l])=>
      <button key={k} type="button" role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {tab==='stats'&&<><div className="rt-grid">
      <div className="rt-cell"><span>판단 적중</span><b className="rt-num">{t.hitRate===null?'–':t.hitRate+'%'}</b><small>{t.graded}건 채점 · {t.hits}건 적중</small></div>
      <div className="rt-cell"><span>확신 보정</span><b className="rt-num">{t.calibration===null?'–':t.calibration}</b><small>100이면 확신이 결과와 딱 맞음</small></div>
      <div className="rt-cell"><span>충동 억제</span><b className="rt-num">{imp.rate===null?'–':imp.rate+'%'}</b><small>쿨다운 {imp.done}번 중 {imp.waited}번 기다림</small></div>
      <div className="rt-cell"><span>이번 주 점수</span><b className="rt-num">{week}</b><small>리그에 들어가는 점수</small></div>
      <div className="rt-cell"><span>판단 기록</span><b className="rt-num">{t.judged}</b><small>모델 신호 {t.signalsGraded}건 중 {t.signalsRight}건 맞음</small></div>
      <div className="rt-cell"><span>등급</span><b style={{fontSize:18}}>{rk.name}</b><small>{rk.next?`${rk.next.name}까지 ${rk.next.left}`:'최고 등급'}</small></div>
      <div className="rt-cell"><span>되감기 연습</span><b className="rt-num">{rw.hitRate===null?'–':rw.hitRate+'%'}</b><small>{rw.rounds}판 · 확신 보정 {rw.calibration??'–'}</small></div>
      <div className="rt-cell"><span>케이스 연속</span><b className="rt-num">{shownCount(g.s.streak,g.clock.today)}일</b><small>최고 {g.s.streak.best}일</small></div>
    </div>
    <p className="rt-hint" style={{marginTop:14}}>수익률은 보지 않아요. 판단과 확신이 맞았는지만 봐요</p></>}
    {tab==='list'&&(g.s.judgments.length===0?<p className="rt-empty">아직 기록한 판단이 없어요</p>:
      [...g.s.judgments].sort((a,b)=>b.day.localeCompare(a.day)).map(j=>{const gs=g.s.graded.filter(x=>x.judgmentId===j.id);const last=gs.at(-1);
        const nextMark=MARKS.find(m=>!gs.some(x=>x.mark===m));const dleft=nextMark?daysBetween(g.clock.today,shiftDay(j.day,nextMark)):0;
        return <div key={j.id} className="rt-row"><div><strong>{j.name} · {CHOICE_LABEL[j.choice]} · 확신 {j.confidence}</strong><small>{formatDay(j.day,g.clock.today)} · {j.reason}</small></div>
          {last?<b className={`rt-num ${last.hit?'rt-hit':'rt-miss'}`}>{last.mark}일 {pct(last.after)}</b>:<span className="rt-tag">{dleft>0?`D-${dleft}`:'채점 완료'}</span>}</div>}))}
    {tab==='cases'&&<>{solved.length===0&&<p className="rt-empty">푼 케이스가 여기 쌓여요</p>}
      {solved.map(({a,c})=><div key={a.caseId} className="rt-row"><div><strong>{c!.reveal.name} · {c!.reveal.year}</strong><small>먼저 잡은 모델: {MODEL_INFO[c!.reveal.firstCaught as keyof typeof MODEL_INFO].name}</small></div>
        <span className={`rt-tag ${a.correct?'ok':'signal'}`}>{a.correct?'맞음':'틀림'}</span></div>)}
      <p className="rt-hint" style={{marginTop:12}}>{solved.length} / {CASES.length}장</p></>}
  </Sheet>;
}

export function League({g,onClose}:{g:G;onClose:()=>void}){
  const pts=weekPoints(g.s.graded,g.s.cases,g.clock.today,weekWorkOf(g.s,g.clock.today));
  const [rows,setRows]=useState<Awaited<ReturnType<typeof leagueRepo.week>>|null>(null);
  useEffect(()=>{let live=true;leagueRepo.week(g.clock.today,{name:'나',points:pts}).then(r=>{if(live)setRows(r)});return()=>{live=false}},[g.clock.today,pts]);
  const total=trackOf(g.s.judgments,g.s.graded).points,tier=TIERS.find(t=>t.id===tierOf(total))!;
  return <Sheet kicker="주간 리그 · 기록 점수" title={`${tier.label} 리그`} onClose={onClose}>
    <p className="rt-hint">맞힌 개수가 아니라 한 일로 점수가 쌓여요: 일지 저장 3 · 가설 확정 2 · 복기 3 · 과제 실천 2 · 케이스. 상위 3명 승급 · 일요일 자정 마감</p>
    <div style={{marginTop:12}}>{rows?rows.map(r=><div key={r.id} className="rt-row" style={r.me?{background:'var(--rt-accent-soft)',borderRadius:10,padding:'12px 8px'}:undefined}>
      <b className="rt-num" style={{width:24,color:r.promote?'var(--rt-accent)':'var(--rt-mute)'}}>{r.rank}</b>
      <div><strong>{r.name}{r.me?' (나)':''}</strong></div><b className="rt-num">{r.points}</b></div>):<p className="rt-empty">불러오는 중</p>}</div>
    <p className="rt-hint" style={{marginTop:12}}>지금은 예시 리그예요. 서버를 연결하면 실제 유저와 겨뤄요</p>
  </Sheet>;
}

export function GameDoor({runs,week,onEnter,onClose}:{runs:RunRecord[];week:string;onEnter:()=>void;onClose:()=>void}){
  const mine=runs.filter(r=>r.week===week),best=runs.length?Math.max(...runs.map(r=>r.total)):null,trust=trustOf(runs);
  return <Sheet kicker="주간 챌린지" title={GAME.name} onClose={onClose}
    foot={<button type="button" className="rt-btn primary wide" onClick={onEnter}>{mine.length?'이번 주 판 다시 하기':'이번 주 판 시작'} · 약 {GAME.minutes}분</button>}>
    {runs.length>0&&<div className="rt-grid" style={{marginBottom:14}}><div className="rt-cell"><span>플레이</span><b className="rt-num">{runs.length}</b></div><div className="rt-cell"><span>최고 판단 점수</span><b className="rt-num">{best}</b></div></div>}
    {runs.some(r=>r.follow?.length)&&<><div className="rt-section">누구 쪽으로 갔을 때 적중</div><div className="rt-grid" style={{marginBottom:14}}>{([['tori','토리'],['moa','모아'],['luon','루온']] as const).map(([w,n])=><div key={w} className="rt-cell"><span>{n}</span><b className="rt-num">{trust[w].hit}/{trust[w].n}</b></div>)}</div></>}
    <ul className="rt-evidence">{GAME.rules.map(r=><li key={r}><span>{r}</span></li>)}</ul>
    <div className="rt-section" style={{marginTop:20}}>판에서 쓰는 모델 카드</div>
    <div className="rt-grid">{GAME.cards.map(m=>{const info=MODEL_INFO[m],a=analystById(info.analyst);return <div key={m} className="rt-cell">
      <span style={{display:'flex',alignItems:'center',gap:6}}><Face id={a.id} name={a.name} sm/>{a.name}</span><b style={{fontSize:17}}>{info.name}</b><small>{info.what}</small></div>})}</div>
    <p className="rt-hint" style={{marginTop:14}}>모두 같은 판을 일주일 동안 플레이해요. 점수는 수익이 아닌 판단으로 매겨요</p>
  </Sheet>;
}

export function CartView({g,onClose}:{g:G;onClose:()=>void}){
  return <Sheet kicker="상점" title={`${CURRENCY} ${won(g.s.currency)}`} onClose={onClose}>
    <p className="rt-hint">코인은 일지를 쓰고 퀘스트를 마치면 쌓여요. 같은 물건은 하루에 하나씩 살 수 있어요</p>
    {CART_STOCK.map(i=>{const sold=g.s.bought.some(b=>b.itemId===i.id&&b.day===g.clock.today);return <div key={i.id} className="rt-row">
      <div><strong>{i.name}</strong><small>{i.desc}</small></div>
      <button type="button" className="rt-btn" disabled={sold||g.s.currency<i.price!} aria-label={`${i.name} 사기`} onClick={()=>{if(g.ops.buy(i))g.say(`${i.name}. 꾸미기에 넣었어요`)}}>
        {sold?'오늘 구매함':<span className="rt-num">{won(i.price!)}</span>}</button></div>})}
  </Sheet>;
}

export function Drawer({g,onClose,onCart}:{g:G;onClose:()=>void;onCart:()=>void}){
  return <Sheet kicker="꾸미기" title={`물건 ${g.s.owned.length}개`} onClose={onClose}
    foot={<button type="button" className="rt-btn wide" onClick={onCart}>상점</button>}>
    {g.s.owned.length===0&&<p className="rt-empty">상점에서 사거나 분석가 신뢰가 오르면 여기 생겨요</p>}
    {g.s.owned.map(o=>{const it=itemById(o.itemId)!;return <div key={o.uid} className="rt-row">
      <div><strong>{it.name}{it.from?` · ${analystById(it.from).name}`:''}</strong><small>{it.note??it.desc}</small></div>
      <select className="rt-input" style={{width:120,padding:'9px 8px',fontSize:13}} aria-label={`${it.name} 놓을 곳`} value={o.slot??''} onChange={e=>g.ops.place(o.uid,e.target.value||null)}>
        <option value="">보관</option>{DECOR_SLOTS.map(s=><option key={s.id} value={s.id}>{SLOT_LABEL[s.id]}</option>)}</select></div>})}
  </Sheet>;
}

export function AnalystCard({g,id,signal,onBrief,onClose}:{g:G;id:AnalystId;signal:Signal|null;onBrief:()=>void;onClose:()=>void}){
  const a=ANALYSTS.find(x=>x.id===id)!,r=g.s.trust[id],next=STAGE_POINTS[r.stage+1],rec=recallOf(id,g.s.judgments,g.s.graded,g.clock.today);
  return <Sheet kicker={a.role} title={a.name} onClose={onClose} label={`${a.name} 프로필`}
    foot={signal?<button type="button" className="rt-btn primary wide" onClick={onBrief}>신호 보기</button>:undefined}>
    <div className="rt-note-head"><Face id={a.id} name={a.name}/><div><strong>{a.tagline}</strong><small>{rec?say(LINES.remember[id][rec.kind],g.clock.today+id,rec):signal?say(LINES.greet[id],g.clock.today+id,{name:g.s.holdings.find(x=>x.id===signal.holdingId)?.name??''}):say(LINES.idle[id],g.clock.today+id)}</small></div></div>
    <div className="rt-section" style={{marginTop:20}}>맡은 모델</div>
    {a.models.map(m=><div key={m} className="rt-row"><div><strong>{MODEL_INFO[m].name}</strong><small>{MODEL_INFO[m].what}</small></div></div>)}
    <div className="rt-section">신뢰도</div>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><b>{TRUST_LABEL[r.stage]}</b><span className="rt-num rt-hint">{next?`${r.points} / ${next}`:'최고'}</span></div>
    <div className="rt-bar"><i style={{width:`${next?Math.min(100,r.points/next*100):100}%`}}/></div>
    <p className="rt-hint" style={{marginTop:8}}>이 분석가의 신호에 판단을 기록하고 그 신호가 맞으면 올라가요</p>
  </Sheet>;
}

// Today's three (core/today.ts) and where the player stands: the title (core/rank.ts) and the next grade to come back for.
export function TodaySheet({g,tasks,onGo,onClose}:{g:G;tasks:TodayTask[];onGo:(t:TaskId)=>void;onClose:()=>void}){
  const done=tasks.filter(t=>t.done).length,closed=g.s.daysDone.includes(g.clock.today);
  const r=rankOf(xpOf({graded:g.s.graded.length,cases:g.s.cases.length,rewinds:g.s.rewinds.length,work:workOf(g.s)}));
  const nx=nextGrade(g.s.judgments,g.s.graded,g.clock.today);
  return <Sheet kicker="오늘 퀘스트" title={closed?'오늘 퀘스트 완료':`오늘 퀘스트 ${done}/${tasks.length}`} label="퀘스트 게시판" onClose={onClose}>
    {tasks.map((t,i)=><div key={t.id+i} className="rt-row rt-task" data-done={t.done}>
      <span className="rt-check" aria-hidden>{t.done?'✓':i+1}</span>
      <div><strong>{UI.today[t.id]}</strong></div>
      {t.done?<span className="rt-tag ok">완료</span>:<button type="button" className="rt-btn" onClick={()=>onGo(t.id)}>하기</button>}</div>)}
    <p className="rt-hint" style={{marginTop:12}}>{closed?line(UI.dayDone,{n:won(EARN.dayDone)}):`3개 모두 하면 +${won(EARN.dayDone)}`}</p>
    {(()=>{const w=weekGoals(g.clock.today,weekCtx(g));return <><div className="rt-section">이번 주 목표</div>
      {w.goals.map(x=><div key={x.id} className="rt-row rt-task" data-done={x.done}><span className="rt-check" aria-hidden>{x.done?'✓':''}</span>
        <div><strong>{x.text}</strong></div><b className="rt-num">{x.have}/{x.need}</b></div>)}
      <p className="rt-hint" style={{marginTop:8}}>{w.done?`이번 주 완료 · +${won(EARN.weekDone)}`:`3개 모두 하면 +${won(EARN.weekDone)} · 일요일 자정까지`}</p></>})()}
    <div className="rt-section">다음 일정</div>
    <p className="rt-say-plain">{nx?line(UI.nextGrade,{name:nx.name,mark:nx.mark,d:nx.inDays}):UI.noNext}</p>
    <div className="rt-section">내 등급</div>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><b>{r.name}</b>
      <span className="rt-num rt-hint">{r.next?`${r.next.name}까지 ${r.next.left}`:'최고 등급'}</span></div>
    <div className="rt-bar"><i style={{width:`${Math.round(r.progress*100)}%`}}/></div>
    <p className="rt-hint" style={{marginTop:8}}>일지 쓰기, 가설 확정, 복기, 케이스, 되감기로 올라가요. 수익률이나 적중률과는 상관없어요</p>
  </Sheet>;
}

// 사례 서고 (the library up the north path, World3D.tsx): the two ways to practise reading past cases
export function LibrarySheet({caseDone,rewindLeft,onCase,onRewind,onClose}:{caseDone:boolean;rewindLeft:number;onCase:()=>void;onRewind:()=>void;onClose:()=>void}){
  return <Sheet kicker="사례 서고" title="과거 사례" label="사례 서고" onClose={onClose}>
    <button type="button" className="rt-row" onClick={onCase}><div><strong>오늘의 케이스</strong><small>실제 과거 사례 · 30초 · 하루 1개</small></div>
      <span className={`rt-tag ${caseDone?'ok':'signal'}`}>{caseDone?'완료':'새 케이스'}</span></button>
    <button type="button" className="rt-row" onClick={onRewind}><div><strong>되감기</strong><small>가상 회사 · 30일 뒤 결과를 바로 확인</small></div>
      <span className="rt-tag">{rewindLeft?`보상 ${rewindLeft}판`:'연습'}</span></button>
  </Sheet>;
}
