'use client';
// 거장의 집 수업 (피드백 2026-11-26 "책 읽는 게 너무 지루해 … 튜토리얼처럼 애니메이션도 넣고, 쉽게 이해하게"): a book
// taken from the shelf opens a short lesson instead of pages of text. Buffett says one thing at a time (read aloud by a
// recorded voice when there is one: public/audio/master, tools/voice/gen_master_voice.py), a little animated picture
// shows it, and some steps ask me to try it (push a slider, sort chips, pick a day's price). Then his questions
// (content/master-books.ts, from content/master/lessons.json). Nothing here says what to buy or sell.
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Lesson,LessonStep} from '../../content/master-books';
import {voiceVolume,play} from '../../core/sound';

const VOICE_KEY='rethink-master-voice';
export const voiceOn=()=>{try{return localStorage.getItem(VOICE_KEY)!=='0'}catch{return true}};
let manifest:Set<string>|null=null,asked:Promise<Set<string>>|null=null;
function clips(){if(manifest)return Promise.resolve(manifest);
  asked??=fetch('/audio/master/manifest.json').then(r=>r.ok?r.json():[]).catch(()=>[]).then((l:unknown)=>manifest=new Set(Array.isArray(l)?l as string[]:[]));return asked}
export const clipId=(no:number,step:number,ok=false)=>`${String(no).padStart(2,'0')}-${step+1}${ok?'-ok':''}`;
// one line at a time; a new line stops the one before
let now:HTMLAudioElement|null=null;
// onLength: how long the recording runs (s), so the words can type out with the voice
export function sayLine(id:string,on:boolean,onLength?:(s:number)=>void){now?.pause();now=null;if(!on||!voiceVolume())return;
  void clips().then(m=>{if(!m.has(id))return;const a=new Audio(`/audio/master/${id}.mp3`);a.volume=Math.min(1,voiceVolume());now=a;
    a.addEventListener('loadedmetadata',()=>{if(now===a&&isFinite(a.duration))onLength?.(a.duration)},{once:true});void a.play().catch(()=>{})})}
export const hush=()=>{now?.pause();now=null};

const won=(n:number)=>Math.round(n).toLocaleString('ko-KR')+'원';
const fmt=(n:number)=>n>=1e8?`${(n/1e8).toFixed(1)}억`:n>=1e4?`${Math.round(n/1e4).toLocaleString('ko-KR')}만`:Math.round(n).toLocaleString('ko-KR');

// ---------------------------------------------------------------------------------------------------- the pictures
type P=Record<string,any>;// eslint-disable-line @typescript-eslint/no-explicit-any
type W={p:P;done:()=>void};

function Title({p}:W){return <div className="ls-title"><span className="ls-title-i">{p.i}</span><b>{p.t}</b>{p.sub&&<small>{p.sub}</small>}</div>}

// 복리: a curve of 100만 원 growing over the years (and a second one, with costs, beside it); a snowball at the end
function Grow({p,done}:W){
  const [y,setY]=useState<number>(p.years??1),max=p.max??40,start=1_000_000,r=p.rate/100,r2=p.vs?p.vs.rate/100:null;
  const val=(k:number,rr:number)=>start*Math.pow(1+rr,k),top=val(max,r);
  const W=300,H=150,x=(k:number)=>14+k/max*(W-28),yy=(v:number)=>H-12-(v-start)/(top-start)*(H-30);
  const path=(rr:number)=>Array.from({length:y+1},(_,k)=>`${k?'L':'M'}${x(k).toFixed(1)},${yy(val(k,rr)).toFixed(1)}`).join(' ');
  useEffect(()=>{if(!p.goal||y>=p.goal)done()},[y]);// eslint-disable-line react-hooks/exhaustive-deps
  const v=val(y,r),ball=8+Math.sqrt(v/start)*6;
  return <div className="ls-grow">
    <svg viewBox={`0 0 ${W} ${H}`} className="ls-svg" aria-hidden>
      <path d={`M14,${H-12} L${W-14},${H-12}`} className="ls-axis"/>
      {r2!==null&&<path d={path(r2)} className="ls-line2"/>}
      <path d={path(r)} className="ls-line"/>
      <circle cx={Math.min(W-ball-2,x(y))} cy={Math.max(ball+2,yy(v)-ball*0.7)} r={ball} className="ls-ball"/>
      {r2!==null&&<circle cx={x(y)} cy={yy(val(y,r2))} r={4} className="ls-dot2"/>}
    </svg>
    <div className="ls-nums"><span><i className="ls-key"/> {p.vs?'그대로 둔 사람':`해마다 ${p.rate}%`}: <b>{fmt(v)}원</b></span>
      {r2!==null&&<span><i className="ls-key two"/> {p.vs.label}: <b>{fmt(val(y,r2))}원</b></span>}</div>
    {p.slider&&<label className="ls-slider"><span>{y}년</span><input type="range" min={1} max={max} value={y} onChange={e=>setY(+e.target.value)} aria-label="몇 년 굴릴지"/></label>}
  </div>;
}

// 잃고 되찾기: a bar falls by drop% (× lev with borrowed money), then shows what it takes to get back
function Loss({p,done}:W){
  const [go,setGo]=useState(false),lev=p.lev??1,lost=Math.min(100,p.drop*lev),left=100-lost,back=left>0?Math.round((100/left-1)*100):Infinity;
  return <div className="ls-loss">
    <div className="ls-bars">
      <div className="ls-bar"><i style={{height:'100%'}}/><small>처음 100</small></div>
      <div className="ls-bar"><i className="down" style={{height:go?`${left}%`:'100%'}}/><small>{go?`남은 ${left}`:'?'}</small></div>
      <div className="ls-bar"><i className="up" style={{height:go?'100%':`${left}%`,transitionDelay:go?'.9s':'0s'}}/><small>{go?'다시 100':'?'}</small></div>
    </div>
    {go?<p className="ls-say-b">{lev>1?`시장은 ${p.drop}% 떨어졌는데 내 돈은 ${lost}% 줄었어요. `:''}{left>0?<>다시 100이 되려면 <b>+{back}%</b>가 필요해요.</>:<>내 돈이 다 사라졌어요.</>}</p>
      :<button type="button" className="ls-go" onClick={()=>{setGo(true);play('thud');setTimeout(done,1400)}}>{lev>1?`빌린 돈까지 ${p.drop}% 떨어지면?`:`${p.drop}% 잃으면?`}</button>}
  </div>;
}

// 미스터 마켓: day by day he names a price with his mood; I buy, let it go, or sell; the value line stays put
function Quote({p,done}:W){
  const days=p.days as {p:number;m:string}[],[d,setD]=useState(0),[said,setSaid]=useState<string|null>(null),cur=days[Math.min(d,days.length-1)],value=p.value as number;
  const pick=(k:'buy'|'pass'|'sell')=>{const cheap=cur.p<value*0.8,dear=cur.p>value*1.2;
    setSaid(k==='buy'?cheap?'싸게 부른 날 샀군. 가치를 아니까 할 수 있는 일이지.':dear?'들뜬 날 비싸게 샀네. 그의 기분을 따라간 거야.':'값이 가치와 비슷하군. 서두를 이유는 없지.'
      :k==='sell'?dear?'들뜬 날 비싸게 팔았군. 그의 기분을 이용한 거야.':cheap?'겁먹은 날 싸게 팔았네. 그의 기분을 따라간 거야.':'값이 가치와 비슷한 날이군.'
      :'그냥 보냈군. 그것도 훌륭한 선택이야. 내일 또 오니까.');play('tap')};
  const next=()=>{setSaid(null);if(d+1>=days.length){setD(days.length);done()}else setD(d+1)};
  const pct=(v:number)=>Math.max(4,Math.min(96,v/(value*1.8)*100));
  return <div className="ls-quote">
    <div className="ls-mm"><span className="ls-mm-face" key={d}>{cur.m}</span><div className="ls-mm-say">{d<days.length?<>“오늘은 <b>{won(cur.p)}</b>에 사고팔래?”</>:'“내일 또 올게!”'}</div></div>
    <div className="ls-track"><i className="ls-value" style={{left:`${pct(value)}%`}}><small>가치 {won(value)}</small></i><i className="ls-price" style={{left:`${pct(cur.p)}%`}}/></div>
    <div className="ls-days">{days.map((_,i)=><i key={i} data-on={i<=d||undefined}/>)}</div>
    {d<days.length&&(said?<><p className="ls-say-b">{said}</p><button type="button" className="ls-go" onClick={next}>{d+1>=days.length?'끝':'다음 날'}</button></>
      :<div className="ls-acts"><button type="button" onClick={()=>pick('buy')}>산다</button><button type="button" onClick={()=>pick('pass')}>그냥 보낸다</button><button type="button" onClick={()=>pick('sell')}>판다</button></div>)}
  </div>;
}

// 안전마진 / 가격과 가치: two bars, the gap between them named; a slider for the price
function Gap({p,done}:W){
  const [price,setPrice]=useState<number>(p.price),value=p.value as number,top=Math.max(value,p.price)*1.25;
  const margin=Math.round((1-price/value)*100),ok=p.goal?margin>=p.goal:true;
  useEffect(()=>{if(ok)done()},[ok]);// eslint-disable-line react-hooks/exhaustive-deps
  return <div className="ls-gap">
    <div className="ls-gbars">
      <div className="ls-gbar"><i className="val" style={{height:`${value/top*100}%`}}>{p.range&&<em style={{bottom:`${(p.range[0]/value)*100}%`,height:`${(p.range[1]-p.range[0])/value*100}%`}}/>}</i><small>가치<br/>{won(value)}{p.range&&<><br/>({fmt(p.range[0])}~{fmt(p.range[1])})</>}</small></div>
      <div className="ls-gbar"><i className="pri" style={{height:`${price/top*100}%`}}/><small>가격<br/>{won(price)}</small></div>
    </div>
    <p className={'ls-margin'+(margin>=(p.goal??25)?' good':margin<0?' bad':'')}>{margin>=0?<>안전마진 <b>{margin}%</b></>:<>가치보다 <b>{-margin}%</b> 비싸요</>}</p>
    {p.drag&&<label className="ls-slider"><span>가격</span><input type="range" min={Math.round(value*0.4)} max={Math.round(top/1.05)} step={100} value={price} onChange={e=>setPrice(+e.target.value)} aria-label="가격"/></label>}
  </div>;
}

// 동그라미에 넣기: tap a chip to put it in the circle (or take it out); right ones in, the rest out
function Sort({p,done}:W){
  const chips=p.chips as {t:string;ok:boolean}[],[inside,setIn]=useState<Set<number>>(new Set()),[shake,setShake]=useState<number|null>(null);
  const right=chips.every((c,i)=>c.ok===inside.has(i));
  useEffect(()=>{if(right&&inside.size)done()},[right,inside.size]);// eslint-disable-line react-hooks/exhaustive-deps
  const tap=(i:number)=>{const n=new Set(inside);if(n.has(i))n.delete(i);else{if(!chips[i].ok){setShake(i);play('close');setTimeout(()=>setShake(null),500);return}n.add(i);play('pickup')}setIn(n)};
  return <div className="ls-sort">
    <div className="ls-ring" data-full={right||undefined}><small>{p.label}</small>{chips.map((c,i)=>inside.has(i)&&<button key={i} type="button" className="ls-chip in" onClick={()=>tap(i)}>{c.t}</button>)}</div>
    <div className="ls-pool">{chips.map((c,i)=>!inside.has(i)&&<button key={i} type="button" className={'ls-chip'+(shake===i?' no':'')} onClick={()=>tap(i)}>{c.t}</button>)}</div>
  </div>;
}

// 해자: a castle with a moat; competitors walk in; a wide moat turns them back
function Moat({p,done}:W){
  const [w,setW]=useState<number>(p.width??10),safe=w>=(p.goal??70);
  useEffect(()=>{if(safe)done()},[safe]);// eslint-disable-line react-hooks/exhaustive-deps
  const R=34+w*0.55;
  return <div className="ls-moat">
    <svg viewBox="0 0 300 170" className="ls-svg" aria-hidden>
      <circle cx="150" cy="88" r={R+8} className="ls-bank"/><circle cx="150" cy="88" r={R} className="ls-water"/><circle cx="150" cy="88" r="32" className="ls-isle"/>
      <g className="ls-castle"><rect x="132" y="72" width="36" height="28" rx="2"/><rect x="128" y="64" width="10" height="14"/><rect x="162" y="64" width="10" height="14"/><rect x="145" y="58" width="10" height="18"/><path d="M146,100 v-9 a4,4 0 0 1 8,0 v9z" className="ls-door"/></g>
      {[0,1,2,3].map(i=><g key={i} transform={`rotate(${i*90+20} 150 88)`}><g className={'ls-raider'+(safe?' back':'')} style={{animationDelay:`${i*0.55}s`}}><text x="150" y="8" textAnchor="middle" fontSize="16">🏃</text></g></g>)}
    </svg>
    <p className={'ls-margin'+(safe?' good':'')}>{safe?'경쟁자가 물길 앞에서 돌아가요':'경쟁자가 성까지 들어와요'}</p>
    <label className="ls-slider"><span>물길</span><input type="range" min={0} max={100} value={w} onChange={e=>setW(+e.target.value)} aria-label="물길 너비"/></label>
  </div>;
}

// 카드 뒤집기: a story told card by card
function Story({p,done}:W){
  const cards=p.cards as {i:string;t:string;d:string}[],[open,setOpen]=useState<Set<number>>(new Set());
  useEffect(()=>{if(open.size===cards.length)done()},[open.size]);// eslint-disable-line react-hooks/exhaustive-deps
  return <div className="ls-cards" data-n={cards.length}>{cards.map((c,i)=><button key={i} type="button" className="ls-card" data-open={open.has(i)||undefined}
    onClick={()=>{if(!open.has(i)){setOpen(new Set(open).add(i));play('open')}}} aria-label={open.has(i)?`${c.t}: ${c.d}`:`${i+1}번 카드 뒤집기`}>
    <span className="ls-card-in"><span className="ls-face front"><b>{i+1}</b></span><span className="ls-face back"><span className="ls-card-i">{c.i}</span><b>{c.t}</b><small>{c.d}</small></span></span></button>)}</div>;
}

// 플로트: premiums drop in now, claims go out later; the pile in the middle is what is held meanwhile
function Flow({done}:W){
  useEffect(()=>{const t=setTimeout(done,4200);return()=>clearTimeout(t)},[]);// eslint-disable-line react-hooks/exhaustive-deps
  return <div className="ls-flow">
    <div className="ls-flow-row"><span className="ls-flow-lab">보험료<br/><small>먼저 들어와요</small></span>
      <div className="ls-pipe">{[0,1,2,3,4,5].map(i=><i key={i} className="ls-coin in" style={{animationDelay:`${i*0.5}s`}}>🪙</i>)}</div>
      <span className="ls-pile"><i className="ls-pile-fill"/><small>맡아 둔 돈</small></span>
      <div className="ls-pipe">{[0,1,2].map(i=><i key={i} className="ls-coin out" style={{animationDelay:`${1.6+i*1}s`}}>🪙</i>)}</div>
      <span className="ls-flow-lab">보험금<br/><small>나중에 나가요</small></span></div>
  </div>;
}

// 하나 고르기: each answer says why
function Choose({p,done}:W){
  const opts=p.opts as {t:string;ok:boolean;d:string}[],[k,setK]=useState<number|null>(null);
  return <div className="ls-choose">{opts.map((o,i)=><button key={i} type="button" className="ls-opt" data-pick={k===i?(o.ok?'ok':'no'):undefined}
    onClick={()=>{setK(i);play(o.ok?'pickup':'tap');if(o.ok)done()}}>{o.t}{k===i&&<small>{o.d}</small>}</button>)}</div>;
}

const WIDGETS:Record<string,(w:W)=>React.ReactNode>={title:Title,grow:Grow,loss:Loss,quote:Quote,gap:Gap,sort:Sort,moat:Moat,story:Story,flow:Flow,choose:Choose};

// ---------------------------------------------------------------------------------------------------- the player
export function LessonPlayer({lesson,onClose,onFinish}:{lesson:Lesson;onClose:()=>void;onFinish:()=>void}){
  const [i,setI]=useState(0),[did,setDid]=useState(false),[voice,setVoice]=useState(voiceOn),st:LessonStep=lesson.steps[i],last=i===lesson.steps.length-1;
  const needs=!!st.t,ready=!needs||did,box=useRef<HTMLDivElement>(null);
  // the line types out; read aloud when there is a recording
  // (as fast as reading; with the voice on, paced to the recording so the words and the voice end together)
  const [shown,setShown]=useState(0),per=useRef(2);
  useEffect(()=>{setShown(0);setDid(false);per.current=2;sayLine(clipId(lesson.no,i),voice,sec=>{per.current=Math.max(0.3,st.say.length/(sec*0.92)*0.028)});
    const id=setInterval(()=>setShown(n=>{if(n>=st.say.length){clearInterval(id);return n}return n+per.current}),28);
    box.current?.focus();return()=>clearInterval(id)},[i]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(did&&st.ok)sayLine(clipId(lesson.no,i,true),voice)},[did]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>hush(),[]);
  const toggle=()=>{const n=!voice;setVoice(n);try{localStorage.setItem(VOICE_KEY,n?'1':'0')}catch{/* this visit */}if(!n)hush();else sayLine(clipId(lesson.no,i,did&&!!st.ok),true)};
  const Wd=st.w?WIDGETS[st.w]:null,done=useMemo(()=>()=>setDid(true),[]);
  const hooks=window as unknown as {__proto3d?:Record<string,unknown>};(hooks.__proto3d??={}).lesson={no:lesson.no,step:i,steps:lesson.steps.length,ready,next:()=>{setDid(true)}};
  return <div className="ls" role="dialog" aria-label={`제 ${lesson.no}권 수업: ${lesson.title}`} ref={box} tabIndex={-1}
    onKeyDown={e=>{if(e.key==='Escape'){hush();onClose()}}}>
    <header className="ls-head">
      <span className="ls-book">제 {lesson.no}권</span><b className="ls-name">{lesson.icon} {lesson.title}</b>
      <button type="button" className="ls-voice" aria-pressed={voice} onClick={toggle} aria-label={voice?'버핏 목소리 끄기':'버핏 목소리 켜기'}>{voice?'🔊':'🔇'}</button>
      <button type="button" className="ls-x" onClick={()=>{hush();onClose()}} aria-label="수업 닫기">✕</button>
    </header>
    <div className="ls-steps" aria-label={`${i+1} / ${lesson.steps.length}단계`}>{lesson.steps.map((_,k)=><i key={k} data-on={k<=i||undefined}/>)}</div>
    <div className="ls-stage" key={i}>{Wd&&<Wd p={st.p??{}} done={done}/>}</div>
    <div className="ls-talk">
      <span className="ls-who" aria-hidden>👴</span>
      <p className="ls-line" aria-live="polite">{did&&st.ok?st.ok:st.say.slice(0,Math.floor(shown))}</p>
    </div>
    <footer className="ls-foot">
      {needs&&!did?<span className="ls-try">👉 {st.t}</span>:<span/>}
      {i>0&&<button type="button" className="ls-back" onClick={()=>setI(i-1)}>이전</button>}
      <button type="button" className="ls-next" disabled={!ready} onClick={()=>{play('click');if(last){hush();onFinish()}else setI(i+1)}}>{last?'수업 마치기':'다음'}</button>
    </footer>
  </div>;
}
