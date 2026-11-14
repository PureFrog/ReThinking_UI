'use client';
// Time stops (docs/game.md 4-1·4-2). Crash: the chart zooms in and each analyst's line brings its note onto it.
// Report day: the F-score turns over, item by item. Then 지킴 · 절반 · 정리 with 1~4 chips, on a 30-second clock.
import {useEffect,useMemo,useState} from 'react';
import {F_ITEMS,barAt,fscoreOn,maskTitle,type GamePack} from '../../core/game/pack';
import {MAX_STAKE} from '../../core/game/run';
import type {Moment as M} from '../../core/game/play';
import type {Choice} from '../../core/game/grade';
import {crashReads,earningsReads,type Read} from '../../content/game-lines';
import {TIMING} from '../../core/timing';
import {still} from '../still';
import {GameChart,type Notes} from './Chart';
import {fx} from './fx';
export const FACE=(id:string)=>`/models/analysts/faces/${id}.png`;
const NAME={tori:'토리',moa:'모아',luon:'루온'} as const;
const pct=(x:number)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(2)}%`;

export function MomentView({pack,m,left,pinned,onDecide}:{pack:GamePack;m:M;left:number;pinned:string[];onDecide:(c:Choice,chips:number)=>void}){
  const slot=pack.companies.find(c=>c.code===m.code)?.slot??'?';
  const day=pack.days[m.tick];
  const reads:Read[]=useMemo(()=>{
    if(m.kind==='crash'){const f=fscoreOn(pack,m.code,day),all=pack.fscore[m.code]??[],i=f?all.indexOf(f):-1;
      const pins=pack.news.filter(n=>pinned.includes(n.u)&&n.codes.includes(m.code)).length;
      return crashReads(m,f?{now:f.f,prev:i>0?all[i-1].f:null}:null,pins)}
    const near=pack.news.filter(n=>n.codes.includes(m.code)&&n.d<=day&&pack.days.indexOf(n.d)>=m.tick-5).length;
    return earningsReads(m,near);
  },[pack,m,day,pinned]);
  const [shown,setShown]=useState(still()?3:0),[hl,setHl]=useState<string|null>(null);
  const [freeze,setFreeze]=useState(false),[choice,setChoice]=useState<Choice|null>(null),[chips,setChips]=useState(0),[done,setDone]=useState<Choice|null>(null);
  // ?gameClock=N sets the clock in seconds (0: no clock, for tests on slow machines)
  const CLOCK=(()=>{try{const v=new URLSearchParams(location.search).get('gameClock');return v===null?TIMING.gameDecide/1000:Number(v)}catch{return TIMING.gameDecide/1000}})();
  const [t,setT]=useState(CLOCK);
  useEffect(()=>{const a=setTimeout(()=>{setFreeze(true);fx('game-halt',14)},60);const ts=[0,1,2].map(k=>setTimeout(()=>{setShown(s=>Math.max(s,k+1));fx('game-read')},TIMING.gameFreeze*.6+k*TIMING.gameRead));return()=>{clearTimeout(a);ts.forEach(clearTimeout)}},[]);
  // the clock: at zero the moment is recorded as 지킴 with one chip
  useEffect(()=>{if(done||!CLOCK)return;if(t<=0){commit('지킴',Math.min(1,left));return}const id=setTimeout(()=>setT(x=>x-1),1000);return()=>clearTimeout(id)},[t,done]);// eslint-disable-line react-hooks/exhaustive-deps
  const commit=(c:Choice,n:number)=>{if(done||n<1)return;setDone(c);fx('game-stamp',18);setTimeout(()=>onDecide(c,n),still()?0:420)};
  const bar=barAt(pack,m.code,m.tick),prev=barAt(pack,m.code,m.tick-1),ch=bar&&prev?(bar[4]/prev[4]-1)*100:0;
  const f=fscoreOn(pack,m.code,day);
  const lastNews=m.kind==='crash'?[...pack.news].reverse().find(n=>n.codes.includes(m.code)&&n.d<=day&&pack.days.indexOf(n.d)>=m.tick-5):null;
  const notes:Notes|null=useMemo(()=>m.kind!=='crash'?null:{on:{moa:shown>=1,tori:shown>=2,luon:shown>=3},hl,
    mark:lastNews?{tick:pack.days.indexOf(lastNews.d),label:`뉴스 · ${lastNews.d.slice(5).replace('-','/')}`}:null,fTag:f?`F-score ${f.f}/9`:'F-score 없음'},[m.kind,shown,hl,lastNews,f,pack.days]);
  const facts=(who:Read['who'])=>{
    if(m.kind==='crash'&&who==='moa')return m.evidence.slice(0,3).map(e=><span key={e.label} className={`gx-fact ${e.dir==='긍정'?'pos':e.dir==='부정'?'neg':''}`}>{e.dir} · {maskTitle(pack,e.label).replace(/^(회사 [A-G])-/,'$1 · ')}</span>);
    if(m.kind==='crash'&&who==='luon')return [<span key="ar" className="gx-fact gx-mono">시장 대비 {pct(m.ar)}p</span>];
    if(who==='tori'&&f)return [<span key="f" className="gx-fact gx-mono">F {f.f}/9</span>];
    return [];
  };
  return <div className={`gx-moment${freeze?' gx-freeze':''}`} style={{display:'flex',flexDirection:'column',gap:8,flex:1,minHeight:0}} data-testid="gx-moment" data-kind={m.kind}>
    <div className="gx-vig"/>
    <div className="gx-top"><div><div className="gx-kick">{m.kind==='crash'?'급락 순간':'실적 발표'} · D+{m.tick}</div>
      <div className="gx-title">회사 {slot} · <span className={`gx-mono ${ch>0?'rt-up':ch<0?'rt-down':''}`}>{pct(ch)}</span></div></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}><span className="gx-halt">정지</span>
        {CLOCK>0&&<div className="gx-ring" aria-label={`남은 시간 ${t}초`}><svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="16" stroke="var(--rt-rule)"/><circle cx="19" cy="19" r="16" stroke="var(--rt-seal)" strokeDasharray="100.5" strokeDashoffset={CLOCK?100.5*(1-t/CLOCK):0} style={{transition:'stroke-dashoffset 1s linear'}}/></svg><span className="gx-mono">{t}</span></div>}</div></div>
    {m.kind==='crash'?<GameChart pack={pack} code={m.code} tick={m.tick} notes={notes}/>:
      <EarningsCard pack={pack} m={m}/>}
    <div className="gx-reads">{reads.map((r,i)=><button type="button" key={r.who} className={`gx-read gx-panel${shown>i?' on':''}${hl===r.who?' hl':''}`} onClick={()=>setHl(h=>h===r.who?null:r.who)}>
      <span className="gx-face" style={{backgroundImage:`url(${FACE(r.who)})`}}/><p><b>{NAME[r.who]}</b>{r.text}</p><div className="gx-facts">{facts(r.who)}</div></button>)}</div>
    <div className="gx-decide gx-panel gx-in" style={{animationDelay:`${TIMING.gameFreeze+TIMING.gameRead*2}ms`}}>
      {done&&<div className="gx-seal gx-stamp">{done}</div>}
      <div className="gx-choices">{(['지킴','절반','정리'] as Choice[]).map(c=><button key={c} type="button" aria-pressed={choice===c} onClick={()=>!done&&setChoice(c)}>{c}</button>)}</div>
      <div className="gx-stake"><span>확신 칩 <b className="gx-mono">{chips}</b>/{Math.min(MAX_STAKE,left)} · 남은 <b className="gx-mono">{left-chips}</b></span>
        <div className="gx-stack" aria-hidden>{Array.from({length:chips},(_,i)=><span key={i} className="gx-chip gx-drop"/>)}</div>
        <div className="gx-step"><button type="button" aria-label="칩 빼기" onClick={()=>setChips(n=>Math.max(0,n-1))}>−</button><button type="button" aria-label="칩 올리기" onClick={()=>{fx('game-chip',chips+1>=MAX_STAKE?8:0);setChips(n=>Math.min(MAX_STAKE,left,n+1))}}>+</button></div></div>
      <button type="button" className="gx-btn" disabled={!choice||chips<1||!!done} onClick={()=>choice&&commit(choice,chips)}>결정 · 다음 날 시가에 주문</button>
      {m.kind==='crash'&&m.verdict===null&&<p className="gx-note">급락 모델이 이날을 판정하지 못했어 · 근거 부족</p>}
    </div>
  </div>;
}

function EarningsCard({pack,m}:{pack:GamePack;m:M&{kind:'earnings'}}){
  const [k,setK]=useState(still()?F_ITEMS.length:0);
  useEffect(()=>{if(still())return;const ts=F_ITEMS.map((_,i)=>setTimeout(()=>setK(i+1),500+i*80));return()=>ts.forEach(clearTimeout)},[]);
  const prev=m.prevItems,shownF=k>=F_ITEMS.length?m.f:(m.prevF??m.f);
  return <div className="gx-fs gx-panel gx-in">
    <div className="gx-kick">실적 발표 · 회사 {pack.companies.find(c=>c.code===m.code)?.slot} · F-score · {m.fy}년치</div>
    <div style={{display:'flex',alignItems:'baseline',gap:10}}><span key={shownF} className="num gx-mono gx-roll">{shownF}</span><span className="gx-mono" style={{color:'var(--rt-mute)'}}>/ 9{m.prevF!==null?` · 작년 ${m.prevF}`:''}</span></div>
    <div className="gx-items">{F_ITEMS.map((l,i)=>{const now=m.items[i],was=prev?.[i];const turned=i<k;
      return <div key={l} className={turned&&prev&&was&&!now?'lost':turned&&prev&&!was&&now?'got':''}><span>{l}</span><b className="gx-mono">{turned?now:(was??'·')}</b></div>})}</div>
  </div>;
}
