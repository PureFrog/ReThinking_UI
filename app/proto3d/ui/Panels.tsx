'use client';
// Everything around the loop: the track record (R4), the league and the game door (R5), the cart and the drawer
// (R6), and an analyst's profile. Rules in app/core, data in app/content, actions in state.ts.
import {useEffect,useState} from 'react';
import {Lock} from 'lucide-react';
import {trackOf,CHOICE_LABEL,shiftDay,daysBetween,MARKS} from '../../core/judgment';
import {impulseOf} from '../../core/cooldown';
import {weekPoints,TIERS,tierOf} from '../../core/league';
import {shownCount} from '../../core/streak';
import {TRUST_LABEL} from '../../core/ledger';
import {STAGE_POINTS} from '../../core/relationships';
import {formatDay} from '../../core/items';
import {CASES} from '../../content/cases';
import {GAME} from '../../content/game';
import {CART_STOCK,DECOR_SLOTS,itemById} from '../../content/garden-items';
import {ANALYSTS,MODEL_INFO,LINES,CURRENCY,analystById,type AnalystId} from '../../content/analysts';
import type {Signal} from '../../content/signals';
import {leagueRepo} from '../server';
import {Sheet,Face,pct} from './Sheet';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;

const SLOT_LABEL:Record<string,string>={'door-l':'현관 왼쪽','door-r':'현관 오른쪽',fire:'모닥불 옆',pond:'연못 가',path:'뒷길',field:'풀밭'};

export function Records({g,onClose,onHoldings}:{g:G;onClose:()=>void;onHoldings:()=>void}){
  const [tab,setTab]=useState<'stats'|'list'|'cases'>('stats');
  const t=trackOf(g.s.judgments,g.s.graded),imp=impulseOf(g.s.cooldowns),week=weekPoints(g.s.graded,g.s.cases,g.clock.today);
  const solved=g.s.cases.map(a=>({a,c:CASES.find(c=>c.id===a.caseId)})).filter(x=>x.c);
  return <Sheet kicker="트랙 레코드" title="내 판단의 질" onClose={onClose}
    foot={<button type="button" className="rt-btn wide" onClick={onHoldings}>내 종목 고치기 · {g.s.holdings.length}종목</button>}>
    <div className="rt-tabs" role="tablist">{([['stats','스탯'],['list','판단'],['cases','케이스 도감']] as const).map(([k,l])=>
      <button key={k} type="button" role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {tab==='stats'&&<><div className="rt-grid">
      <div className="rt-cell"><span>판단 적중</span><b className="rt-num">{t.hitRate===null?'–':t.hitRate+'%'}</b><small>{t.graded}건 채점 · {t.hits}건 적중</small></div>
      <div className="rt-cell"><span>확신 보정</span><b className="rt-num">{t.calibration===null?'–':t.calibration}</b><small>100이면 확신이 결과와 딱 맞음</small></div>
      <div className="rt-cell"><span>충동 억제</span><b className="rt-num">{imp.rate===null?'–':imp.rate+'%'}</b><small>냉각 {imp.done}번 중 {imp.waited}번 기다림</small></div>
      <div className="rt-cell"><span>이번 주 점수</span><b className="rt-num">{week}</b><small>리그에 들어가는 점수</small></div>
      <div className="rt-cell"><span>판단 기록</span><b className="rt-num">{t.judged}</b><small>모델 신호 {t.signalsGraded}건 중 {t.signalsRight}건 맞음</small></div>
      <div className="rt-cell"><span>케이스 연속</span><b className="rt-num">{shownCount(g.s.streak,g.clock.today)}일</b><small>최고 {g.s.streak.best}일</small></div>
    </div>
    <p className="rt-hint" style={{marginTop:14}}>수익률은 여기 없어. 판단이 맞았는지, 확신이 맞았는지만 봐.</p></>}
    {tab==='list'&&(g.s.judgments.length===0?<p className="rt-empty">아직 기록한 판단 없음.</p>:
      [...g.s.judgments].sort((a,b)=>b.day.localeCompare(a.day)).map(j=>{const gs=g.s.graded.filter(x=>x.judgmentId===j.id);const last=gs.at(-1);
        const nextMark=MARKS.find(m=>!gs.some(x=>x.mark===m));const dleft=nextMark?daysBetween(g.clock.today,shiftDay(j.day,nextMark)):0;
        return <div key={j.id} className="rt-row"><div><strong>{j.name} · {CHOICE_LABEL[j.choice]} · 확신 {j.confidence}</strong><small>{formatDay(j.day,g.clock.today)} · {j.reason}</small></div>
          {last?<b className={`rt-num ${last.hit?'rt-up':'rt-down'}`}>{last.mark}일 {pct(last.after)}</b>:<span className="rt-tag">{dleft>0?`D-${dleft}`:'판정 도착'}</span>}</div>}))}
    {tab==='cases'&&<>{solved.length===0&&<p className="rt-empty">푼 케이스가 여기 카드로 쌓여.</p>}
      {solved.map(({a,c})=><div key={a.caseId} className="rt-row"><div><strong>{c!.reveal.name} · {c!.reveal.year}</strong><small>먼저 잡은 모델: {MODEL_INFO[c!.reveal.firstCaught as keyof typeof MODEL_INFO].name}</small></div>
        <span className={`rt-tag ${a.correct?'ok':'signal'}`}>{a.correct?'맞음':'틀림'}</span></div>)}
      <p className="rt-hint" style={{marginTop:12}}>{solved.length} / {CASES.length}장</p></>}
  </Sheet>;
}

export function League({g,onClose}:{g:G;onClose:()=>void}){
  const pts=weekPoints(g.s.graded,g.s.cases,g.clock.today);
  const [rows,setRows]=useState<Awaited<ReturnType<typeof leagueRepo.week>>|null>(null);
  useEffect(()=>{let live=true;leagueRepo.week(g.clock.today,{name:'나',points:pts}).then(r=>{if(live)setRows(r)});return()=>{live=false}},[g.clock.today,pts]);
  const total=trackOf(g.s.judgments,g.s.graded).points,tier=TIERS.find(t=>t.id===tierOf(total))!;
  return <Sheet kicker="주간 리그 · 판단 점수" title={`${tier.label} 리그`} onClose={onClose}>
    <p className="rt-hint">수익률이 아니라 판단 점수로 올라가. 상위 3명 승급. 일요일 자정에 마감.</p>
    <div style={{marginTop:12}}>{rows?rows.map(r=><div key={r.id} className="rt-row" style={r.me?{background:'var(--rt-accent-soft)',borderRadius:10,padding:'12px 8px'}:undefined}>
      <b className="rt-num" style={{width:24,color:r.promote?'var(--rt-accent)':'var(--rt-mute)'}}>{r.rank}</b>
      <div><strong>{r.name}{r.me?' (나)':''}</strong></div><b className="rt-num">{r.points}</b></div>):<p className="rt-empty">불러오는 중</p>}</div>
    <p className="rt-hint" style={{marginTop:12}}>지금은 로컬 모의 리그야. 서버를 붙이면 진짜 사람들과 겨뤄.</p>
  </Sheet>;
}

export function GameDoor({onClose}:{onClose:()=>void}){
  return <Sheet kicker="관측소" title={GAME.name} onClose={onClose}
    foot={GAME.url?<a className="rt-btn primary wide" href={GAME.url}>입장 · 약 {GAME.minutes}분</a>:<button type="button" className="rt-btn primary wide" disabled><Lock size={16}/>준비 중</button>}>
    <ul className="rt-evidence">{GAME.rules.map(r=><li key={r}><span>{r}</span></li>)}</ul>
    <div className="rt-section" style={{marginTop:20}}>판에서 쓰는 모델 카드</div>
    <div className="rt-grid">{GAME.cards.map(m=>{const info=MODEL_INFO[m],a=analystById(info.analyst);return <div key={m} className="rt-cell">
      <span style={{display:'flex',alignItems:'center',gap:6}}><Face id={a.id} name={a.name} sm/>{a.name}</span><b style={{fontSize:17}}>{info.name}</b><small>{info.what}</small></div>})}</div>
    {!GAME.url&&<p className="rt-hint" style={{marginTop:14}}>팀원 프로토타입을 붙이면 여기서 바로 들어가. 판이 끝나면 복기 결과가 신뢰도로 돌아와.</p>}
  </Sheet>;
}

export function CartView({g,onClose}:{g:G;onClose:()=>void}){
  return <Sheet kicker="행상 수레" title={`${CURRENCY} ${g.s.currency}`} onClose={onClose}>
    <p className="rt-hint">{CURRENCY}는 판단하고 복기할 때만 쌓여. 수익률로는 안 들어와. 하루에 같은 물건은 하나씩.</p>
    {CART_STOCK.map(i=>{const sold=g.s.bought.some(b=>b.itemId===i.id&&b.day===g.clock.today);return <div key={i.id} className="rt-row">
      <div><strong>{i.name}</strong><small>{i.desc}</small></div>
      <button type="button" className="rt-btn" disabled={sold||g.s.currency<i.price!} aria-label={`${i.name} 사기`} onClick={()=>{if(g.ops.buy(i))g.say(`${i.name}. 서랍에 넣었어.`)}}>
        {sold?'오늘 삼':<span className="rt-num">{i.price}</span>}</button></div>})}
  </Sheet>;
}

export function Drawer({g,onClose,onCart}:{g:G;onClose:()=>void;onCart:()=>void}){
  return <Sheet kicker="서랍" title={`물건 ${g.s.owned.length}개`} onClose={onClose}
    foot={<button type="button" className="rt-btn wide" onClick={onCart}>행상 수레 열기</button>}>
    {g.s.owned.length===0&&<p className="rt-empty">수레에서 사거나, 분석가 신뢰가 오르면 여기 들어와.</p>}
    {g.s.owned.map(o=>{const it=itemById(o.itemId)!;return <div key={o.uid} className="rt-row">
      <div><strong>{it.name}{it.from?` · ${analystById(it.from).name}`:''}</strong><small>{it.note??it.desc}</small></div>
      <select className="rt-input" style={{width:120,padding:'9px 8px',fontSize:13}} aria-label={`${it.name} 놓을 곳`} value={o.slot??''} onChange={e=>g.ops.place(o.uid,e.target.value||null)}>
        <option value="">보관</option>{DECOR_SLOTS.map(s=><option key={s.id} value={s.id}>{SLOT_LABEL[s.id]}</option>)}</select></div>})}
  </Sheet>;
}

export function AnalystCard({g,id,signal,onBrief,onClose}:{g:G;id:AnalystId;signal:Signal|null;onBrief:()=>void;onClose:()=>void}){
  const a=ANALYSTS.find(x=>x.id===id)!,r=g.s.trust[id],next=STAGE_POINTS[r.stage+1];
  return <Sheet kicker={a.role} title={a.name} onClose={onClose} label={`${a.name} 프로필`}
    foot={signal?<button type="button" className="rt-btn primary wide" onClick={onBrief}>신호 보기</button>:undefined}>
    <div className="rt-note-head"><Face id={a.id} name={a.name}/><div><strong>{a.tagline}</strong><small>{signal?LINES.greet[id]:LINES.idle[id]}</small></div></div>
    <div className="rt-section" style={{marginTop:20}}>맡은 모델</div>
    {a.models.map(m=><div key={m} className="rt-row"><div><strong>{MODEL_INFO[m].name}</strong><small>{MODEL_INFO[m].what}</small></div></div>)}
    <div className="rt-section">신뢰도</div>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><b>{TRUST_LABEL[r.stage]}</b><span className="rt-num rt-hint">{next?`${r.points} / ${next}`:'최고'}</span></div>
    <div className="rt-bar"><i style={{width:`${next?Math.min(100,r.points/next*100):100}%`}}/></div>
    <p className="rt-hint" style={{marginTop:8}}>이 분석가 신호에 판단을 남기고, 그 신호가 맞으면 올라가.</p>
  </Sheet>;
}
