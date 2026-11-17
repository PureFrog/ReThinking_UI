'use client';
// 주간 챌린지 (docs/game.md): a blind window of the real past, played through the observatory door. This keeps the run
// (core/game/play.ts) and the clock; Moment.tsx stops time, Reveal.tsx opens the file. ?game=<id> opens a 판 directly,
// ?gameSpeed=N runs the days N times faster (tests). window.__proto3d.game reports where the run is.
import './game.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {maskTitle,marketName,type GamePack,type PackIndex} from '../../core/game/pack';
import {simulate} from '../../core/game/engine';
import {orderBook} from '../../core/game/book';
import {chipsLeft,ghostOf,paths,weeklyPack,type RunRecord} from '../../core/game/run';
import {followsOf,type GardenSignal} from '../../core/game/meta';
import {fx,flyPin} from './fx';
import {expeditionRepo} from '../server';
import {scoreRun} from '../../core/game/grade';
import {begin,decide,dayChange,heldCodes,roomOf,seedOf,skipToMoment,startPlay,step,togglePin,trade,ROOMS,MAX_PINS,type Play} from '../../core/game/play';
import {weekStart} from '../../core/weekly';
import {TIMING} from '../../core/timing';
import {still} from '../still';
import {GameChart} from './Chart';
import {MomentView,FACE} from './Moment';
import {RevealView} from './Reveal';
import {Coach} from './Coach';
import {COACH} from '../../content/game-lines';
import {Cross} from '../ui/Icons';
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const pct=(x:number,d=2)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(d)}%`;
const cls=(x:number)=>x>0?'rt-up':x<0?'rt-down':'';
const PIN=<svg viewBox="0 0 24 24" aria-hidden><path d="M15 4l5 5-3 1-4 4 1 4-2 2-4-4-4 4M9 13l-4-4 2-2 4 1 4-4 1-3z"/></svg>;
const param=(k:string)=>{try{return new URLSearchParams(location.search).get(k)}catch{return null}};

export function useGamePacks(){
  const [idx,setIdx]=useState<PackIndex|null>(null);
  useEffect(()=>{let on=true;fetch('/game/packs/index.json').then(r=>r.json()).then(j=>{if(on)setIdx(j as PackIndex)}).catch(()=>{});return()=>{on=false}},[]);
  return idx;
}

// garden: my garden's open signals, for the scene that looks like a decision; onMarket: the 판's index move each day, so
// the garden behind (desktop) can wear that day's weather (G5)
export function Expedition({packId,today,history,garden=[],handle='',onFinish,onClose,onSimilar,onMarket}:{packId:string|null;today:string;history:RunRecord[];handle?:string;garden?:GardenSignal[];onFinish:(r:RunRecord)=>void;onClose:()=>void;onSimilar?:(holdingId:number)=>void;onMarket?:(index:number|null)=>void}){
  const idx=useGamePacks();
  const id=packId??(idx?weeklyPack(idx.packs.map(p=>p.id),today):null);
  // feedback 11-17: a plain 게임 끝내기 during the flow (a confirm first: the run is dropped, not scored)
  const [quit,setQuit]=useState(false);
  const [pack,setPack]=useState<GamePack|null>(null),[err,setErr]=useState(false);
  useEffect(()=>{if(!id)return;let on=true;fetch(`/game/packs/${id}.json`).then(r=>r.json()).then(p=>{if(on)setPack(p as GamePack)}).catch(()=>on&&setErr(true));return()=>{on=false}},[id]);
  const runs=history.filter(r=>r.pack===id).length;
  const [play,setPlay]=useState<Play|null>(null),[fast,setFast]=useState(false),[sel,setSel]=useState<string|null>(null),[swap,setSwap]=useState<{out:string;in:string}|null>(null);
  useEffect(()=>{if(pack){setPlay(startPlay(pack,seedOf(pack.id,runs)));fx('game-open')}},[pack]);// eslint-disable-line react-hooks/exhaustive-deps
  // the past me: the last run of this 판 as it stood when the 판 opened (this run, once saved, is not its own ghost)
  const [round,setRound]=useState(0);
  const ghost=useMemo(()=>pack?ghostOf(history,pack.id):null,[pack,round]);// eslint-disable-line react-hooks/exhaustive-deps
  // the 판's market each day, for the garden behind
  useEffect(()=>{if(!pack||!play||play.tick<1||!onMarket)return;const d=pack.days[play.tick],p=pack.days[play.tick-1];const a=pack.index.find(r=>r[0]===d)?.[1],b=pack.index.find(r=>r[0]===p)?.[1];if(a&&b)onMarket((a/b-1)*100)},[pack,play?.tick]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>onMarket?.(null),[]);// eslint-disable-line react-hooks/exhaustive-deps
  const speed=(Number(param('gameSpeed'))||1)*(fast?TIMING.gameFast:1);
  // the first run is coached, a part at a time (?gameTutorial=0 turns it off for tests)
  type Part=keyof typeof COACH;
  const [coached,setCoached]=useState<Part[]|null>(()=>history.length===0&&param('gameTutorial')!=='0'?[]:null);
  const [revealReady,setRevealReady]=useState(false);
  useEffect(()=>{if(play?.phase!=='reveal'){setRevealReady(false);return}const t=setTimeout(()=>setRevealReady(true),3200);return()=>clearTimeout(t)},[play?.phase]);
  const part:Part|null=!coached||!play?null:play.phase==='brief'?'brief':play.phase==='flow'?'flow':play.phase==='moment'?'moment':revealReady?'reveal':null;
  const coachUp=!!part&&!!coached&&!coached.includes(part);
  // the clock: a trading day per tick while the flow runs (paused behind the swap card)
  useEffect(()=>{if(!pack||!play||play.phase!=='flow'||swap||coachUp||quit)return;const t=setTimeout(()=>setPlay(p=>p&&step(pack,p)),TIMING.gameDay/speed);return()=>clearTimeout(t)},[pack,play,speed,swap,coachUp,quit]);
  // the reveal is saved once
  const saved=useRef(false);
  useEffect(()=>{if(!pack||play?.phase!=='reveal'||saved.current)return;saved.current=true;const s=scoreRun(pack,play.decisions);
    onFinish({pack:pack.id,week:weekStart(today),decisions:play.decisions,total:s.total,at:new Date().toISOString(),hits:s.hits,results:s.items.map(i=>i.result),ret:Math.round(paths(pack,play.orders).me*10)/10,follow:followsOf(pack,s.items),orders:play.orders,swaps:play.swaps});
    expeditionRepo.submit({pack:pack.id,week:weekStart(today),decisions:play.decisions,orders:play.orders,swaps:play.swaps,handle:handle||'익명'})},[pack,play,today,onFinish,handle]);
  useEffect(()=>{const hk=((window as {__proto3d?:{game?:unknown}}).__proto3d??={} as {game?:unknown});
    hk.game=play&&pack?{pack:pack.id,phase:play.phase,coach:coachUp?part:null,tick:play.tick,chips:chipsLeft(play.decisions),decisions:play.decisions.length,pins:play.pins.length,moment:play.moment?{kind:play.moment.kind,code:play.moment.code}:null,swap:!!swap}:{phase:'loading'};
    return()=>{hk.game=null}},[play,pack,swap,coachUp,part]);
  if(err||(!pack&&idx&&!id))return <div className="gx"><p>판을 불러오지 못했어.</p><button type="button" className="gx-btn" onClick={onClose}>닫기</button></div>;
  if(!pack||!play)return <div className="gx" aria-busy><p className="gx-kick">사건 파일을 펼치는 중</p></div>;
  const held=heldCodes(pack,play,Math.max(0,play.tick)),cur=sel&&held.includes(sel)?sel:held[0];
  const left=chipsLeft(play.decisions);
  const onDecide=(c:'지킴'|'절반'|'정리',n:number)=>{const next=decide(pack,play,c,n);
    const sw=next.swaps.length>play.swaps.length?next.swaps[next.swaps.length-1]:null;
    if(sw&&!still()){setSwap({out:sw.out,in:sw.in});fx('game-tear',20);setTimeout(()=>setSwap(null),TIMING.gameSwap)}
    setPlay(next)};
  const close=<button type="button" className="gx-x" aria-label="챌린지 닫기" onClick={onClose}><Cross size={16}/></button>;
  return <div className="gx" role="dialog" aria-label="주간 챌린지" data-testid="expedition">
    {play.phase==='brief'&&<Brief pack={pack} weekly={!packId} runs={runs} close={close} onStart={()=>setPlay(begin(play))}/>}
    {play.phase==='flow'&&<>
      <div className="gx-top"><div><div className="gx-kick">주간 챌린지{!packId?' · 이번 주 공통 판':''}</div><div className="gx-title">{pack.titleHidden}</div></div>
        <div style={{display:'flex',gap:6}}><span className="gx-pill" data-pins aria-label={`핀 ${play.pins.length}/${MAX_PINS}`}>{PIN}<span className="gx-mono">{play.pins.length}/{MAX_PINS}</span></span><span className="gx-pill"><span className="gx-chip"/><span className="gx-mono">{left}</span></span>
          <button type="button" className="gx-end" onClick={()=>setQuit(true)}>게임 끝내기</button></div></div>
      <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'var(--rt-mute)'}}>
        <span>방 <b className="gx-mono">{roomOf(pack,play.tick)+1}</b> / {ROOMS} · <b className="gx-mono" data-testid="gx-day">D+{play.tick}</b></span>
        <span className="gx-speed"><button type="button" aria-pressed={fast} onClick={()=>setFast(f=>!f)}>▸▸ 빠르게</button><button type="button" onClick={()=>setPlay(skipToMoment(pack,play))}>다음 순간까지</button></span></div>
        <div className="gx-prog">{Array.from({length:ROOMS},(_,k)=>{const r=roomOf(pack,play.tick),per=Math.ceil(pack.days.length/ROOMS);return <i key={k}><b style={{transform:`scaleX(${k<r?1:k>r?0:(play.tick-r*per)/per})`}}/></i>})}</div></div>
      <div className="gx-strip">{held.map(c=>{const co=pack.companies.find(x=>x.code===c)!,x=dayChange(pack,c,play.tick);
        return <button key={c} type="button" className={co.start==='reserve'?'new':''} aria-pressed={c===cur} onClick={()=>setSel(c)}><b>회사 {co.slot}</b><span className={`gx-mono ${cls(x)}`}>{pct(x)}</span></button>})}</div>
      <div className="gx-flow" style={{display:'flex',flexDirection:'column',gap:8,flex:1,minHeight:0}}>
        <GameChart pack={pack} code={cur} tick={play.tick} label={<Price pack={pack} code={cur} tick={play.tick}/>} ghost={ghost?.decisions.filter(d=>d.code===cur).map(d=>({tick:d.tick,label:'지난번 '+d.choice}))}/>
        <div className="gx-split"><Book pack={pack} play={play} code={cur} onTrade={(side,qty)=>setPlay(p=>p&&trade(pack,p,cur,side,qty))}/><Feed pack={pack} play={play} held={held} onPin={(u,el)=>{if(!play.pins.includes(u)&&play.pins.length<MAX_PINS){fx('game-pin');flyPin(el,document.querySelector('[data-pins]'))}setPlay(p=>p&&togglePin(p,u))}}/></div>
      </div>
      {swap&&<SwapCard pack={pack} out={swap.out} inn={swap.in}/>}
      {quit&&<div className="gx-quit" role="dialog" aria-label="게임 끝내기"><div className="gx-quit-card">
        <strong>여기서 끝낼까?</strong><p>지금 끝내면 이번 판은 채점하지 않고 기록도 남기지 않아요.</p>
        <div className="gx-quit-row"><button type="button" className="gx-btn" onClick={()=>setQuit(false)}>계속하기</button>
          <button type="button" className="gx-btn gx-btn-ink" onClick={onClose}>끝내기</button></div></div></div>}
    </>}
    {play.phase==='moment'&&play.moment&&<MomentView key={`${play.moment.tick}-${play.moment.code}`} pack={pack} m={play.moment} left={left} pinned={play.pins} hold={coachUp} onDecide={onDecide}/>}
    {play.phase==='reveal'&&<RevealView pack={pack} play={play} today={today} history={history} ghost={ghost} garden={garden} onSimilar={onSimilar} onDone={onClose} onAgain={()=>{saved.current=false;setRound(r=>r+1);setPlay(startPlay(pack,seedOf(pack.id,runs)))}}/>}
    {coachUp&&part&&<Coach key={part} steps={COACH[part]} onDone={()=>setCoached(c=>c&&[...c,part])} onSkip={()=>setCoached(null)}/>}
  </div>;
}

function Brief({pack,weekly,runs,close,onStart}:{pack:GamePack;weekly:boolean;runs:number;close:React.ReactNode;onStart:()=>void}){
  const held=pack.companies.filter(c=>c.start==='held');
  return <>
    <div className="gx-top"><div><div className="gx-kick">주간 챌린지{weekly?' · 이번 주 공통 판':''}{runs?` · ${runs+1}번째`:''}</div><div className="gx-title big">{pack.titleHidden}</div></div>{close}</div>
    <div className="gx-brief" style={{display:'grid',gap:10}}>
      <div className="gx-panel" style={{padding:12,transformOrigin:'50% 0',animation:'gx-open .64s var(--in) both'}}>
        <div className="gx-kick" style={{marginBottom:8}}>{marketName(pack)} · 회사 이름과 날짜는 끝에 공개</div>
        <div style={{display:'grid',gap:8}}>{held.map((c,k)=><div key={c.code} className="gx-co gx-panel gx-in" style={{animationDelay:`${280+k*80}ms`}}><span className="gx-tag">{c.slot}</span>
          <div><strong><span className="gx-ink draw" style={{['--w' as string]:`${3+(k%3)*.8}em`,animationDelay:`${420+k*90}ms`}}/></strong><small className="gx-mono">{won(c.qty)}주 · {won(c.qty*(pack.prices[c.code][pack.preDays-1]?.[4]??0))}원</small></div><small>보유</small></div>)}</div>
      </div>
      <div style={{display:'grid',gap:10}}>
        <div className="gx-panel gx-in" style={{padding:12,display:'grid',gap:8,animationDelay:'640ms'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><span className="gx-kick">확신 칩</span><span className="gx-mono" style={{fontSize:12}}>10개 · 결정마다 1~4개</span></div>
          <div className="gx-chips">{Array.from({length:10},(_,k)=><span key={k} className="gx-chip gx-drop" style={{animationDelay:`${760+k*45}ms`}}/>)}</div>
        </div>
        <div className="gx-panel gx-in" style={{padding:12,display:'grid',gap:10,animationDelay:'900ms'}}>
          {([['tori','토리','회사 넷, 칩 열 개. 기록은 내가 셀게.'],['moa','모아','뉴스 지나가면 핀 꽂아 둬! 결정할 때 다시 꺼내 줄게.'],['luon','루온','끝에 연도가 나와. 그 전에 언제인지 맞혀 볼래?']] as const).map(([id,n,t])=>
            <div key={id} className="gx-said"><span className="gx-face" style={{backgroundImage:`url(${FACE(id)})`}}/><div><b>{n}</b>{t}</div></div>)}
        </div>
      </div>
    </div>
    <button type="button" className="gx-btn gx-in" style={{marginTop:'auto',animationDelay:'1100ms'}} onClick={onStart}>시작 · 방 1 / {ROOMS}</button>
  </>;
}

function Price({pack,code,tick}:{pack:GamePack;code:string;tick:number}){
  const b=pack.prices[code][pack.preDays+tick],x=dayChange(pack,code,tick);
  return <><span key={tick} className="p gx-mono gx-roll">{won(b?.[4]??0)}</span><span className={`gx-mono ${cls(x)}`} style={{fontSize:12}}>{pct(x)}</span></>;
}

function Book({pack,play,code,onTrade}:{pack:GamePack;play:Play;code:string;onTrade:(side:'buy'|'sell',qty:number)=>void}){
  const b=orderBook(pack,code,play.tick);
  const sim=useMemo(()=>simulate(pack,play.orders,play.tick),[pack,play.orders,play.tick]);
  const pos=sim.positions[code];
  // today's fills (orders from yesterday, at today's open): stamped in the book
  const fills=sim.fills.filter(f=>f.tick===play.tick);
  useEffect(()=>{if(fills.length)fx('game-fill',10)},[play.tick,fills.length]);// eslint-disable-line react-hooks/exhaustive-deps
  const pending=play.orders.filter(o=>o.tick===play.tick&&o.code===code);
  if(!b)return <div className="gx-book gx-panel"/>;
  const q=(n:number)=>Math.min(100,n/b.volume*1800);
  const ret=pos?(b.last/pos.avg-1)*100:0;
  return <div className="gx-book gx-panel" aria-label="호가">
    <div className="gx-book-h"><span>잔량</span><span>호가</span></div>
    {b.asks.map(l=><div key={'a'+l.price} className="row ask"><i style={{['--q' as string]:`${q(l.qty)}%`}}/><span className="gx-mono">{won(l.qty)}</span><span className="gx-mono">{won(l.price)}</span></div>)}
    <div key={'c'+play.tick} className="row cur"><span className="gx-mono">{won(b.volume)}</span><span className={`gx-mono ${cls(b.last-b.prev)}`}>{won(b.last)}</span></div>
    {b.bids.slice(0,4).map(l=><div key={'b'+l.price} className="row bid"><i style={{['--q' as string]:`${q(l.qty)}%`}}/><span className="gx-mono">{won(l.qty)}</span><span className="gx-mono">{won(l.price)}</span></div>)}
    <dl><dt>보유</dt><dd className="gx-mono">{won(pos?.qty??0)}주</dd><dt>평가</dt><dd className="gx-mono">{won((pos?.qty??0)*b.last)}</dd><dt>매입 대비</dt><dd className={`gx-mono ${cls(ret)}`}>{pct(ret,1)}</dd></dl>
    <div className="gx-trade"><button type="button" className="buy" onClick={()=>onTrade('buy',Math.floor(sim.cash*.25/b.last))}>매수 ¼</button><button type="button" className="sell" disabled={!pos||pending.filter(o=>o.side==='sell').reduce((s,o)=>s+o.qty,0)>=(pos?.qty??0)} onClick={()=>onTrade('sell',Math.max(1,Math.floor((pos?.qty??0)/4)))}>매도 ¼</button></div>
    {pending.length>0&&<p className="gx-note" style={{marginTop:4}}>주문 예약 · 다음 날 시가에 체결</p>}
    <p className="gx-note" style={{marginTop:6}}>일봉으로 재구성한 호가 · 단위 {b.unit}원</p>
    {fills.map(f=><div key={f.seq+'-'+f.tick} className="gx-fill" role="status"><b>체결</b><span>회사 {pack.companies.find(c=>c.code===f.code)?.slot} · {f.side==='buy'?'매수':'매도'} <span className="gx-mono">{won(f.qty)}주 @ {won(f.price)}</span></span></div>)}
  </div>;
}

function Feed({pack,play,held,onPin}:{pack:GamePack;play:Play;held:string[];onPin:(u:string,el:Element)=>void}){
  const day=pack.days[play.tick];
  const items=useMemo(()=>pack.news.filter(n=>n.d<=day&&n.codes.some(c=>held.includes(c))).slice(-30).reverse(),[pack,day,held]);
  const pinned=items.filter(n=>play.pins.includes(n.u)),rest=items.filter(n=>!play.pins.includes(n.u));
  return <div className="gx-feed gx-panel" aria-label="그날의 뉴스">
    {!items.length&&<p className="gx-note">아직 이 회사들 소식이 없어. 조용한 날.</p>}
    {[...pinned,...rest].slice(0,8).map(n=><div key={n.u} className="gx-news" data-pinned={play.pins.includes(n.u)}>
      <small>{n.p} · D+{pack.days.indexOf(n.d)} {n.at.slice(11,16)}</small>{maskTitle(pack,n.t)}
      <button type="button" className="pin" aria-label={play.pins.includes(n.u)?'핀 빼기':'핀 꽂기'} onClick={e=>onPin(n.u,e.currentTarget)}>{PIN}</button></div>)}
  </div>;
}

function SwapCard({pack,out,inn}:{pack:GamePack;out:string;inn:string}){
  const o=pack.companies.find(c=>c.code===out)!,n=pack.companies.find(c=>c.code===inn)!;
  const [st,setSt]=useState<''|'torn'|'torn dealt'>('');
  useEffect(()=>{const a=setTimeout(()=>setSt('torn'),60),b=setTimeout(()=>{setSt('torn dealt');fx('game-deal')},560);return()=>{clearTimeout(a);clearTimeout(b)}},[]);
  const card=(c:typeof o,tag:string)=><div className="gx-co gx-panel"><span className="gx-tag" style={c===n?{borderColor:'var(--rt-seal)',color:'var(--rt-seal)'}:undefined}>{c.slot}</span><div><strong>회사 {c.slot}</strong><small>{tag}</small></div><small/></div>;
  return <div className={`gx-swap ${st}`} data-testid="gx-swap" aria-live="polite">
    <div className="half l">{card(o,'정리')}</div><div className="half r">{card(o,'정리')}</div>
    <div className="newco"><div>{card(n,'새로 들어옴 · 다음 날 시가에 매수')}</div></div>
  </div>;
}
