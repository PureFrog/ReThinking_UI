'use client';
// Fishing with 나루 at the pond (feedback 11-17, docs/mockups/otter-fishing.html; rules core/fishing.ts, fish
// content/fish.ts). 나루 talks in the same dialogue box as 보리 (rethink.css .rt-talk, a blue name tag); a cast waits,
// the float dips (Scene3D Bobber), a tap in time lands a fish: a card, then the log. The garden's top bar and tabs step
// back meanwhile. e2e: window.__fishBite (ms to the dip), __fishWindow (ms the dip lasts) and __fishPick (fish id) fix
// what happens.
import {won} from '../../core/won';
import {useEffect,useRef,useState} from 'react';
import {FISH,fishById,type Fish} from '../../content/fish';
import {FISHING,biteAfter,judgeTap,pickFish,type Fishing} from '../../core/fishing';
import {Sheet} from './Sheet';

type Hooks={__fishBite?:number;__fishPick?:string;__fishWindow?:number;__proto3d?:{fishing?:string}};
const hook=()=>window as unknown as Hooks;
export function FishIcon({color,size=1}:{color:string;size?:number}){
  return <svg viewBox="0 0 120 60" width={120*size} height={60*size} aria-hidden><path fill={color} d="M12 30 C 30 6, 78 4, 96 30 C 78 56, 30 54, 12 30 Z M96 30 L116 12 L112 30 L116 48 Z"/><circle cx="32" cy="26" r="4" fill="#1d1f24"/></svg>;
}

// 나루's greeting with the day's casts left
// intro: the first walk's first visit, 나루 says who it is in the same breath (피드백 2026-11-24 "소개하면서 같이 한 번에")
export function NaruTalk({left,onFish,onLog,onClose,intro=false}:{left:number;onFish:()=>void;onLog:()=>void;onClose:()=>void;intro?:boolean}){
  const text=intro&&left>0?`어? 아, 안 잤어 안 잤어. 나는 나루야. 이 연못에서 같이 낚시해. 잡은 물고기만큼 코인이 들어와. 오늘 ${left}번 던질 수 있어. 한 번 해 볼래?`:left>0?`어? 아, 안 잤어 안 잤어. 오늘 물 살랑살랑 좋다. 저 바위 밑에 대물 나온다던데, 해 볼래? 오늘은 ${left}번 남았어.`:'오늘은 다 던졌어. 꾸벅꾸벅… 내일 또 와, 대물은 내일 나올지도? 도감은 볼래?';
  return <div className="rt-talk" role="dialog" aria-label="나루와 대화">
    <button type="button" className="rt-talk-leave" onClick={onClose}>나중에</button>
    <div className="rt-talk-choices" role="group" aria-label="대답">
      {left>0&&<button type="button" className="rt-talk-choice first" onClick={onFish}>낚시하기</button>}
      <button type="button" className={'rt-talk-choice'+(left>0?'':' first')} onClick={onLog}>물고기 도감</button></div>
    <div className="rt-talk-box"><span className="rt-talk-name n-naru" data-who="naru">나루<small className="rt-talk-role">낚시터 · 코인 벌기</small></span><p className="rt-talk-line">{text}</p></div>
  </div>;
}

export type Landed={fish:Fish;size:number;coins:number;first:boolean;best:boolean};
// one fishing session: cast → wait → bite → tap; onPhase drives the float in the scene
export function FishingPlay({left,onCast,onLand,onPhase,onLog,onClose}:{left:number;onCast:()=>void;onLand:(id:string,size:number)=>Omit<Landed,'fish'|'size'>;
  onPhase:(p:'wait'|'bite'|null)=>void;onLog:()=>void;onClose:()=>void}){
  const [phase,setPhase]=useState<'ready'|'wait'|'bite'|'result'>('ready'),[result,setResult]=useState<{k:'early'|'late'}|({k:'caught'}&Landed)|null>(null);
  const t0=useRef(0),bite=useRef(0),timers=useRef<number[]>([]);
  const win=()=>hook().__fishWindow??FISHING.window;
  const clear=()=>{for(const t of timers.current)clearTimeout(t);timers.current=[]};
  useEffect(()=>{onPhase(phase==='wait'||phase==='bite'?phase:null);const h=hook();(h.__proto3d??={}).fishing=phase},[phase]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>{clear();onPhase(null)},[]);// eslint-disable-line react-hooks/exhaustive-deps
  const cast=()=>{if(left<=0)return;onCast();setResult(null);t0.current=performance.now();bite.current=hook().__fishBite??biteAfter(Math.random);setPhase('wait');
    timers.current.push(window.setTimeout(()=>setPhase(p=>p==='wait'?'bite':p),bite.current));
    timers.current.push(window.setTimeout(()=>{setPhase(p=>{if(p!=='bite')return p;setResult({k:'late'});return 'result'})},bite.current+win()))};
  const tap=()=>{if(phase!=='wait'&&phase!=='bite')return;clear();const at=performance.now()-t0.current,j=judgeTap(at,bite.current,win());
    if(j!=='caught'){setResult({k:j});setPhase('result');return}
    const forced=hook().__fishPick,f=forced?fishById(forced):null;
    const c=f?{fish:f,size:Math.round((f.min+f.max)/2)}:pickFish(Math.random);
    setResult({k:'caught',fish:c.fish,size:c.size,...onLand(c.fish.id,c.size)});setPhase('result')};
  const leftNow=left;
  return <div className="rt-talk rt-fish" role="dialog" aria-label="낚시">
    <span className="rt-fish-left" aria-label={`남은 낚시 ${leftNow}`}>{Array.from({length:FISHING.perDay},(_,i)=><i key={i} className={i<Math.min(leftNow,FISHING.perDay)?'':'off'}/>)} 남은 낚시 {leftNow>FISHING.perDay?'∞':leftNow}</span>
    <button type="button" className="rt-talk-leave" onClick={onClose}>그만하기</button>
    {(phase==='ready')&&<div className="rt-fish-hint"><p>{left>0?'물결 살랑살랑하는 데로 휙! 찌가 꼼지락 쑥 들어가면 바로 탭!':'오늘은 다 던졌어'}</p></div>}
    {(phase==='wait'||phase==='bite')&&<div className="rt-fish-hint"><p>{phase==='bite'?'지금! 쭈욱 당겨!':'쉿, 아직이야~ 찌가 쑥 들어가면 바로 탭!'}</p></div>}
    {phase!=='result'&&<button type="button" className={'rt-fish-tap'+(phase==='bite'?' hot':'')} disabled={phase==='ready'&&left<=0}
      onClick={phase==='ready'?cast:tap}>{phase==='ready'?'던지기':'탭!'}</button>}
    {phase==='result'&&result&&(result.k==='caught'
      ?<div className="rt-fish-card" role="status">
        <span className={'rt-fish-tag r-'+result.fish.rarity}>{result.fish.rarity}</span>
        <FishIcon color={result.fish.color} size={1.7}/>
        <h2>{result.fish.name}</h2><p className="rt-fish-size">{result.size}cm{result.best&&!result.first?' · 내 기록!':''}</p>
        {result.first&&<p className="rt-fish-new">처음 잡았어요! 도감에 올렸어요</p>}
        <p className="rt-fish-coins"><span className="rt-coin" aria-hidden>C</span>+{won(result.coins)}</p>
        <div className="rt-fish-row">{left>0?<button type="button" className="rt-btn primary" onClick={cast}>한 번 더</button>:<button type="button" className="rt-btn primary" onClick={onLog}>도감 보기</button>}
          <button type="button" className="rt-btn" onClick={onClose}>그만하기</button></div></div>
      :<div className="rt-talk-box" role="status"><span className="rt-talk-name n-naru" data-who="naru">나루</span>
        <p className="rt-talk-line">{result.k==='early'?'첨벙~ 아직이었는데! 물고기가 놀라서 도망갔네? 다시 던져, 다시!':'첨벙~ 도망갔네? 하하. 걔가 좀 빠르거든. 다시 던져!'}</p>
        <div className="rt-fish-row">{left>0?<button type="button" className="rt-btn primary" onClick={cast}>다시 던지기</button>:null}
          <button type="button" className="rt-btn" onClick={onClose}>그만하기</button></div></div>)}
  </div>;
}

// the fish log: twelve, the ones not caught yet as shadows
export function FishLog({fishing,onClose}:{fishing:Fishing|undefined;onClose:()=>void}){
  const log=fishing?.log??{},n=Object.keys(log).length;
  return <Sheet kicker="나루의 연못" title={`물고기 도감 ${n} / ${FISH.length}`} label="물고기 도감" onClose={onClose}>
    <div className="rt-fish-grid">{FISH.map(f=>{const c=log[f.id];return <div key={f.id} className={'rt-fish-cell'+(c?'':' no')} aria-label={c?`${f.name} ${c.n}마리, 최고 ${c.best}cm`:'아직 못 잡은 물고기'}>
      <FishIcon color={c?f.color:'#1d1f24'} size={0.62}/><b>{c?f.name:'???'}</b><small>{c?`${c.n}마리 · 최고 ${c.best}cm`:f.rarity}</small></div>})}</div>
    <p className="rt-hint" style={{marginTop:10}}>하루 {FISHING.perDay}번 낚시할 수 있어요. 보통 {won(FISHING.coins['보통'])} · 희귀 {won(FISHING.coins['희귀'])} · 전설 {won(FISHING.coins['전설'])}, 처음 잡은 물고기는 {won(FISHING.firstBonus)} 더.</p>
  </Sheet>;
}
