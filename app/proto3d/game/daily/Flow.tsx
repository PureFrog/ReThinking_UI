'use client';
// The flow between moments (feedback F4, the expedition simulator under the daily quest): trading days pass, the chart
// and the account's value move, headlines arrive on their day; 빠르게 runs days faster and 다음 순간까지 skips ahead —
// either way the clock stops at the next moment the editor set (or the evaluation day after the last decision). No
// order book, no free orders: what was decided fills at the next open on the way. A day lasts TIMING.questDay.
import {useEffect,useRef,useState} from 'react';
import {TIMING} from '../../../core/timing';
import {aliasOf,companiesOf,fillsOf,fractionLabel,fval,targetOf,valueAt,type DailyPack,type DailyRun} from '../../../core/game/daily/model';
import {QuestChart} from './QuestChart';
import type {useGarden} from '../../state';
type G=ReturnType<typeof useGarden>;
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const pct=(x:number)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(2)}`;

export function Flow({g,run,pack,top}:{g:G;run:DailyRun;pack:DailyPack;top:(k:string,t:string,x?:React.ReactNode)=>React.ReactNode}){
  const p=run.play!,[t,setT]=useState(p.at),[on,setOn]=useState(true),[fast,setFast]=useState(false);
  const end=t>=p.to,many=companiesOf(pack).length>1;
  const next=p.next==='scene'?pack.scenes[run.scene]:null;
  const [slot,setSlot]=useState(next?targetOf(next):'A');
  // one day per tick; the clock stops by itself at the moment
  useEffect(()=>{if(!on||end)return;const id=setInterval(()=>setT(x=>Math.min(p.to,x+1)),TIMING.questDay/(fast?TIMING.gameFast:1));return()=>clearInterval(id)},[on,fast,end,p.to]);
  // the day shown is kept now and then (closing and coming back resumes there) and always at the stop
  const last=useRef(p.at);
  useEffect(()=>{if(end||t-last.current>=5){last.current=t;g.ops.questPlayAt(run.id,t)}},[t,end]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const hk=((window as {__proto3d?:{flow?:unknown}}).__proto3d??={} as {flow?:unknown});hk.flow={at:t,from:p.from,to:p.to,next:p.next};return()=>{hk.flow=null}},[t,p.from,p.to,p.next]);
  const {fills}=fillsOf(pack,run.decisions),v0=valueAt(pack,run.decisions,p.from),v=valueAt(pack,run.decisions,t);
  const news=(pack.news??[]).filter(n=>n.tick<=t).slice().reverse().slice(0,6);
  const filled=fills.filter(f=>f.tick>p.from&&f.tick<=t&&fval(f.sold)>0);
  const days=p.to-p.from,done=t-p.from;
  return <>
    {top(`흐름 · ${done}/${days}거래일${next?` · 다음 순간 장면 ${next.no}`:' · 평가일까지'}`,aliasOf(pack,slot))}
    <div className="dq-scroll" data-testid="dq-flow" data-at={t}>
      {end&&<section className="gx-panel dq-sec dq-arrive" data-testid="dq-stop" role="status"><p className="dq-k">시장 시계가 멈췄어요</p>
        <p>{next?`장면 ${next.no} · ${next.title}`:'평가일이에요. 이 날 종가로 계좌를 평가해요.'}</p></section>}
      <section className="gx-panel dq-sec dq-flow-head">
        <div className="dq-three"><div><small>평가액</small><b className="gx-mono">{won(v)}{pack.currency}</b></div>
          <div><small>이번 흐름에서</small><b className={`gx-mono ${v>v0?'rt-up':v<v0?'rt-down':''}`}>{pct((v/v0-1)*100)}%</b></div>
          <div><small>{next?'다음 순간까지':'평가일까지'}</small><b className="gx-mono">{p.to-t}거래일</b></div></div>
        {filled.map(f=><p key={f.scene} className="gx-note" role="status">체결 · {aliasOf(pack,f.slot)} {fractionLabel(f.fraction)} {Math.round(fval(f.sold)*100)/100}주 @ {won(f.price)}{pack.currency} (다음 거래일 시가, 수수료 {Math.round((pack.market?.fee??.001)*1000)/10}%)</p>)}
      </section>
      {many&&<div className="dq-tabs small" role="tablist" aria-label="차트 종목">{companiesOf(pack).map(c=><button key={c.slot} type="button" role="tab" aria-selected={slot===c.slot} onClick={()=>setSlot(c.slot)}>{c.alias}</button>)}</div>}
      <QuestChart pack={pack} upto={t} fills={fills} slot={slot} label="흐름 차트"/>
      <section className="gx-panel dq-sec" data-testid="dq-news"><p className="dq-k">뉴스 · 그날까지 나온 것만</p>
        {news.length?<ul className="dq-news">{news.map(n=><li key={n.tick+n.title} className={n.tick>p.from?'new':''}><small className="gx-note">{n.tick<=p.from?'지난 소식':`${n.tick-p.from}거래일째`} · {n.source}</small><p>{n.title}</p>{n.summary&&<p className="dq-news-sum">{n.summary}</p>}</li>)}</ul>
          :<p className="gx-note">아직 들어온 소식이 없어요.</p>}</section>
    </div>
    {end?<button type="button" className="gx-btn" onClick={()=>g.ops.questPlayEnd(run.id)}>{next?'판단하러 가기':'평가일 결과 보기'}</button>
      :<div className="dq-row three"><button type="button" className="gx-btn ghost" onClick={()=>setOn(!on)}>{on?'멈춤':'재생'}</button>
        <button type="button" className="gx-btn ghost" aria-pressed={fast} onClick={()=>{setFast(!fast);setOn(true)}}>빠르게</button>
        <button type="button" className="gx-btn" onClick={()=>setT(p.to)}>다음 순간까지</button></div>}
  </>;
}
