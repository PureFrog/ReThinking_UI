'use client';
// The reveal (docs/game.md 4-3 · 4-4 · 4-5 · 5): the ink comes off the names, the period is stamped, each decision is
// graded against its opposite (and can open what came after it), the chips turn into the score, the crash model's calls
// are shown hit or miss alike, the three paths, the past me, whose notes I went with, a scene in my own garden that looks
// alike, and the week's ranking (example rows until the server).
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {maskTitle,type GamePack} from '../../core/game/pack';
import {scoreRun,holdReturn} from '../../core/game/grade';
import {paths,type RunRecord} from '../../core/game/run';
import {afterwards,followsOf,rankBy,sampleRanking,similarOf,trustOf,type GardenSignal,type RankRow,type Who} from '../../core/game/meta';
import {expeditionRepo} from '../server';
import type {Play} from '../../core/game/play';
import {revealReads} from '../../content/game-lines';
import {weekStart} from '../../core/weekly';
import {TIMING} from '../../core/timing';
import {still} from '../still';
import {FACE} from './Moment';
import {fx} from './fx';
const pct=(x:number,d=1)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(d)}%`;
const cls=(x:number)=>x>0?'rt-up':x<0?'rt-down':'';
const RN={hit:'적중',miss:'빗나감',tie:'비김'} as const;
const NAME:Record<Who,string>={tori:'토리',moa:'모아',luon:'루온'};

export function RevealView({pack,play,today,history,ghost,garden,onSimilar,onDone,onAgain}:{pack:GamePack;play:Play;today:string;history:RunRecord[];ghost:RunRecord|null;garden:GardenSignal[];
  onSimilar?:(holdingId:number)=>void;onDone:()=>void;onAgain:()=>void}){
  const score=useMemo(()=>scoreRun(pack,play.decisions),[pack,play.decisions]);
  const p3=useMemo(()=>paths(pack,play.orders),[pack,play.orders]);
  const models=useMemo(()=>play.decisions.flatMap(d=>{const e=pack.events.find(x=>x.kind==='crash'&&x.d===pack.days[d.tick]&&x.code===d.code);
    return e&&e.kind==='crash'&&e.verdict?[{d,verdict:e.verdict,hold:holdReturn(pack,d.code,d.tick)}]:[]}),[pack,play.decisions]);
  const trust=useMemo(()=>trustOf([...history.filter(r=>r.at!==history[history.length-1]?.at||r.pack!==pack.id),{follow:followsOf(pack,score.items)}]),[history,pack,score.items]);
  const like=useMemo(()=>similarOf(pack,play.decisions,garden),[pack,play.decisions,garden]);
  const used=new Set([...pack.companies.filter(c=>c.start==='held').map(c=>c.code),...play.swaps.map(s=>s.in)]);
  const names=pack.companies.filter(c=>used.has(c.code));
  const nameOf=(code:string)=>pack.companies.find(c=>c.code===code)?.name??code;
  const [step,setStep]=useState(still()?99:0),[count,setCount]=useState(still()?score.total:0),[open,setOpen]=useState<number|null>(null),[rank,setRank]=useState(false);
  useEffect(()=>{if(still())return;const ts:ReturnType<typeof setTimeout>[]=[];
    for(let i=1;i<=8+score.items.length;i++)ts.push(setTimeout(()=>{setStep(i);
      if(i===1)fx('panel-open');if(i===2)fx('game-reveal',24);const it=score.items[i-3];if(it)fx(it.result==='miss'?'game-miss':'game-hit')},300+i*TIMING.gameReveal));
    return()=>ts.forEach(clearTimeout)},[score.items]);
  const totalAt=2+score.items.length;
  useEffect(()=>{if(step<totalAt||still())return;const t0=performance.now();let id=0,last=-1;const f=(n:number)=>{const k=Math.min(1,(n-t0)/700),v=Math.round(score.total*(1-Math.pow(1-k,3)));
    if(v!==last&&v%10===0)fx('game-count');last=v;setCount(v);if(k<1)id=requestAnimationFrame(f)};id=requestAnimationFrame(f);return()=>cancelAnimationFrame(id)},[step>=totalAt]);// eslint-disable-line react-hooks/exhaustive-deps
  const left=10-play.decisions.reduce((s,d)=>s+d.chips,0);
  if(rank)return <Ranking pack={pack} week={weekStart(today)} me={{score:score.total,ret:Math.round(p3.me*10)/10}} onBack={()=>setRank(false)}/>;
  return <div style={{display:'flex',flexDirection:'column',gap:10,flex:1,minHeight:0}} data-testid="gx-reveal">
    <div className="gx-top"><div><div className="gx-kick">주간 챌린지 · 결과</div><div className="gx-title">사건 파일의 정체</div></div>
      <div className="gx-pill"><span className="gx-chip"/><span className="gx-mono">{left} 남음</span></div></div>
    <div className="gx-scroll">
      <div className="gx-names">{names.map((c,i)=><div key={c.code}><span>회사 {c.slot}</span><span className={`gx-rev${step>=1?' open':''}`}>
        <span className={`gx-ink${step>=1?' off':''}`} style={{['--w' as string]:`${c.name.length*.95}em`,transitionDelay:`${i*120}ms`}}/><b>{c.name}</b></span></div>)}</div>
      {step>=2&&<div className="gx-era-box gx-in" style={{textAlign:'center',padding:'6px 0'}}><span className="gx-era gx-stamp" data-testid="gx-era">{pack.titleRevealed}</span><p className="gx-note" style={{marginTop:8}}>{pack.summaryRevealed}</p></div>}
      {score.items.map((g,i)=>step>=3+i&&<div key={i} className="gx-panel gx-score gx-in" data-testid="gx-score">
        <div><strong>D+{g.tick} · {nameOf(g.code)} · {g.choice}</strong><br/>
          <small>{g.kind==='crash'?'급락 순간':'실적 발표'} · 칩 {g.chips}개 · 이후 20거래일<br/>지켰으면 <b className={`gx-mono ${cls(g.hold)}`}>{pct(g.hold)}</b> · 내 결정 <b className={`gx-mono ${cls(g.mine)}`}>{pct(g.mine)}</b></small></div>
        <span className={`r ${g.result}`}>{RN[g.result]}</span><b className="gx-mono" style={{justifySelf:'end',fontSize:15}}>{g.points>0?'+':''}{g.points}</b>
        <button type="button" className="gx-note" style={{gridColumn:'1/-1',justifySelf:'start',textDecoration:'underline',textUnderlineOffset:3}} aria-expanded={open===i} onClick={()=>setOpen(o=>o===i?null:i)}>그때 몰랐던 것 {open===i?'접기':'보기'}</button>
        {open===i&&<After pack={pack} d={g}/>}
      </div>)}
      {step>=totalAt&&<div className="gx-panel gx-total gx-in"><div><div className="gx-kick">판단 점수</div><small className="gx-note">칩 {10-left}개를 걸었어{score.bonus?` · 보정 보너스 +${score.bonus}`:''}</small></div><b className="gx-mono" data-testid="gx-total">{count>0?'+':''}{count}</b></div>}
      {step>=totalAt&&ghost&&<div className="gx-panel gx-ghost gx-in" data-testid="gx-ghost"><span className="gp">나</span><div>지난번 같은 판 <b className="gx-mono">{ghost.total>0?'+':''}{ghost.total}</b> → 이번 <b className="gx-mono">{score.total>0?'+':''}{score.total}</b>
        <br/><span className="gx-note">{(()=>{const same=score.items.find(x=>ghost.decisions.some(o=>o.tick===x.tick&&o.code===x.code&&o.choice!==x.choice));const o=same&&ghost.decisions.find(z=>z.tick===same.tick&&z.code===same.code);return same&&o?`D+${same.tick} 지난번엔 ${o.choice}, 이번엔 ${same.choice}`:'같은 날 같은 선택을 했어'})()}</span></div></div>}
      {step>=totalAt+1&&models.length>0&&<div className="gx-panel gx-in" style={{padding:12,display:'grid',gap:6}}><div className="gx-kick">급락 모델은 어떻게 봤나</div>
        {models.map((x,i)=>{const right=x.verdict==='가치훼손'?x.hold<-2:x.verdict==='비가치'?x.hold>-2:null;
          return <div key={i} style={{fontSize:12.5}}>D+{x.d.tick} <b>{x.verdict}</b> · 20거래일 뒤 <b className={`gx-mono ${cls(x.hold)}`}>{pct(x.hold)}</b> <span className="gx-note">{right===null?'판단 보류':right?'모델 쪽이 맞았어':'모델이 빗나갔어'}</span></div>})}
        <p className="gx-note">맞든 틀리든 같은 형식으로 보여줘.</p></div>}
      {step>=totalAt+2&&<div className="gx-panel gx-bars gx-in"><p className="gx-kick">수익 · 같은 판, 세 가지 길</p>
        {([['내 결과',p3.me],['아무것도 안 했을 때',p3.none],['모델 신호만 따랐을 때',p3.model]] as const).map(([l,v],k)=><div key={l}><span>{l}</span><i className={k?'dim':''} style={{width:`${4+Math.abs(v)/Math.max(1,Math.abs(p3.me),Math.abs(p3.none),Math.abs(p3.model))*92}%`,animationDelay:`${k*120}ms`}}/><b className={`gx-mono ${cls(v)}`}>{pct(v)}</b></div>)}
        <p className="gx-note">판단 점수는 결정마다 매기고, 수익에는 새로 들어온 회사와 내 주문까지 들어가. 수수료 0.1% 포함 · 실제 일봉</p></div>}
      {step>=totalAt+3&&<div className="gx-panel gx-trust gx-in" data-testid="gx-trust"><p className="gx-kick">누구 쪽으로 갔나 · 그때 적중 · 누적</p>
        {(Object.keys(trust) as Who[]).map(w=>{const t=trust[w];return <div key={w}><span className="gx-face" style={{width:24,height:24,backgroundImage:`url(${FACE(w)})`}}/><span>{NAME[w]}</span><i><b style={{width:`${t.n?t.hit/t.n*100:0}%`}}/></i><span className="gx-mono" style={{textAlign:'right'}}>{t.hit}/{t.n}</span></div>})}
        <p className="gx-note">결정이 그 분석가의 근거와 같은 쪽이었을 때만 세. 비김은 빼.</p></div>}
      {step>=totalAt+3&&<div className="gx-panel gx-in" style={{padding:12,display:'grid',gap:10}}>{revealReads(score.hits,score.items.length,score.total).map(r=>
        <div key={r.who} className="gx-said"><span className="gx-face" style={{backgroundImage:`url(${FACE(r.who)})`}}/><div><b>{NAME[r.who]}</b>{r.text}</div></div>)}</div>}
      {step>=totalAt+4&&like&&<button type="button" className="gx-panel gx-link gx-in" data-testid="gx-similar" onClick={()=>onSimilar?.(like.signal.holdingId)}><strong>내 정원과 닮은 장면</strong><em>›</em>
        <small>D+{like.decision.tick}의 {nameOf(like.decision.code)}와 내 정원의 {like.signal.name}: {like.why.join(' · ')}. 닮은 점만 보여줘.</small></button>}
      {step>=totalAt+4&&<button type="button" className="gx-panel gx-link gx-in" onClick={()=>setRank(true)}><strong>이번 주 순위</strong><em>›</em><small>판단 점수 순 · 예시 순위 · 서버 연결 전</small></button>}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:8}}><button type="button" className="gx-btn ghost" onClick={onAgain}>다시 하기</button><button type="button" className="gx-btn" onClick={onDone}>나가기</button></div>
  </div>;
}

// 그때 몰랐던 것: the headlines and later crash or report days in the 20 trading days after a decision
function After({pack,d}:{pack:GamePack;d:Play['decisions'][number]}){
  const a=afterwards(pack,d);
  const lines=[...a.events.map(e=>({at:e.d,text:e.kind==='crash'?`급락 ${pct(e.ret)} · 시장 ${pct(e.idx)}`:`실적 발표 · F-score ${e.prevF??'—'}→${e.f}`,ev:true})),
    ...a.news.map(n=>({at:n.d,text:`${n.t} · ${n.p}`,ev:false}))].sort((x,y)=>x.at<y.at?-1:1).slice(0,8);
  return <ul className="gx-after" data-testid="gx-after">{lines.length?lines.map((l,i)=><li key={i}><small className="gx-mono">D+{pack.days.indexOf(l.at)}</small> {l.ev?<b>{l.text}</b>:maskTitle({...pack,companies:[]},l.text)}</li>)
    :<li className="gx-note">이후 20거래일 동안 잡힌 소식이 없어. 가격만 움직였어.</li>}</ul>;
}

// the week's ranking: sample rows (always labelled), my row rises into its place
function Ranking({pack,week,me,onBack}:{pack:GamePack;week:string;me:{score:number;ret:number};onBack:()=>void}){
  const [by,setBy]=useState<'score'|'ret'>('score');
  // the repo answers (local: example rows); until it does, the same example rows stand in
  const [data,setData]=useState<{rows:RankRow[];sample:boolean}>(()=>sampleRanking(pack.id,week,me));
  useEffect(()=>{let on=true;expeditionRepo.week(pack.id,week,me).then(d=>{if(on)setData(d)});return()=>{on=false}},[pack.id,week,me.score,me.ret]);// eslint-disable-line react-hooks/exhaustive-deps
  const rows=useMemo(()=>rankBy(data.rows,by),[data,by]);
  const list=useRef<HTMLOListElement>(null);
  useLayoutEffect(()=>{const el=list.current?.querySelector('.me') as HTMLElement|null;if(!el||still())return;
    const from=(list.current!.lastElementChild as HTMLElement).offsetTop-el.offsetTop;
    el.animate([{transform:`translateY(${from}px)`},{transform:'none'}],{duration:520,easing:'cubic-bezier(.32,.72,0,1)',delay:200,fill:'backwards'});
    el.scrollIntoView({block:'center'});fx('game-deal')},[by,data]);
  return <div style={{display:'flex',flexDirection:'column',gap:10,flex:1,minHeight:0}} data-testid="gx-ranking">
    <div className="gx-top"><div><div className="gx-kick">주간 챌린지 · 이번 주 공통 판</div><div className="gx-title">순위</div></div></div>
    <div className="gx-tabs"><button type="button" aria-pressed={by==='score'} onClick={()=>setBy('score')}>판단 점수</button><button type="button" aria-pressed={by==='ret'} onClick={()=>setBy('ret')}>수익</button></div>
    <div className="gx-sample"><span>{data.sample?'예시 순위 · 서버 연결 전':'이번 주 순위'}</span><span className="gx-mono">참가 {rows.length}</span></div>
    <div style={{flex:1,minHeight:0,overflow:'auto'}}><ol className="gx-rank" ref={list}>{rows.map((r,i)=><li key={r.name} className={r.me?'me':''}><span className="n gx-mono">{i+1}</span><span>{r.name}</span>
      <b className={`gx-mono ${by==='ret'?cls(r.ret):''}`}>{by==='score'?r.score:pct(r.ret)}</b></li>)}</ol></div>
    <button type="button" className="gx-btn ghost" onClick={onBack}>공개로 돌아가기</button>
  </div>;
}
