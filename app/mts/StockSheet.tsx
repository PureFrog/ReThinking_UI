'use client';
// The answer in place (멘토링 2026-11-22 1.7: going into a game and back to the MTS is extra work): tapping a stock
// or its badge on the balance opens this sheet over the MTS. The books and the price path side by side
// (content/broker/two-views.ts), one line on whether they agree, what the models cannot see. The garden is one
// button away for the long version, never on the way to the answer.
import {useEffect,useMemo} from 'react';
import {TIMING} from '../core/timing';
import {rateOf} from '../core/holdings-in';
import {twoViews,type Card} from '../content/broker/two-views';
import type {DemoLine} from '../content/broker/demo-account';

const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const pct=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`;
const tone=(n:number)=>n>0?'up':n<0?'down':'flat';

function Spark({pts}:{pts:number[]}){
  if(pts.length<2)return null;
  const W=200,H=44,lo=Math.min(...pts),hi=Math.max(...pts),y=(v:number)=>H-2-(hi>lo?(v-lo)/(hi-lo):.5)*(H-4),x=(i:number)=>i/(pts.length-1)*W;
  const avg=pts.reduce((a,b)=>a+b,0)/pts.length,end=pts[pts.length-1];
  return <svg className="mts-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="최근 60거래일 종가">
    <line x1={0} x2={W} y1={y(avg)} y2={y(avg)} className="avg"/>
    <polyline points={pts.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} className={end>=pts[0]?'up':'down'}/>
  </svg>;
}

function View({c,spark}:{c:Card;spark?:number[]}){
  return <section className={`mts-view t-${c.tone}`} aria-label={c.label}>
    <div className="mts-view-h"><strong>{c.label}</strong><span className="mts-chip">{c.chip}</span></div>
    <div className="mts-view-who">{c.who}</div>
    {spark&&<Spark pts={spark}/>}
    <dl>{c.facts.map(f=><div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}</dl>
    <div className="mts-view-foot">{c.foot}</div>
  </section>;
}

export function StockSheet({line,today,more,onMore,onClose}:{line:DemoLine;today:string;more:string;onMore:()=>void;onClose:()=>void}){
  const v=useMemo(()=>twoViews(line.code,today),[line.code,today]),r=rateOf(line);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[onClose]);
  return <div className="mts-sheet-back" onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{['--open' as string]:`${TIMING.panelOpen}ms`}}>
    <div className="mts-sheet" role="dialog" aria-label={`${line.name} 분석`} data-together={v.together}>
      <div className="mts-sheet-grab" aria-hidden/>
      <header className="mts-sheet-top">
        <div className="mts-name"><strong>{line.name}</strong><span className="mts-mkt">{line.market==='KOSPI'?'코스피':'코스닥'}</span></div>
        <div className="mts-sheet-px"><span>{won(line.lastPrice)}</span><span className={tone(r)}>{pct(r)}</span></div>
      </header>
      <div className={`mts-sum-line${v.split?' split':''}`} role="status">
        {v.split&&<span className="mts-split">엇갈림</span>}<strong>{v.title}</strong><p>{v.line}</p>
      </div>
      <div className="mts-views">
        {v.book&&<View c={v.book}/>}
        {v.path&&<View c={v.path} spark={v.spark}/>}
      </div>
      <p className="mts-blind">{v.blind}</p>
      <div className="mts-sheet-act">
        <button type="button" className="mts-sheet-more" onClick={onMore}>{more}<span aria-hidden>›</span></button>
        <button type="button" className="mts-sheet-close" onClick={onClose}>닫기</button>
      </div>
    </div>
  </div>;
}
