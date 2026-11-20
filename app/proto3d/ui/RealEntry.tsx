'use client';
// 실제 시세로 넣기 (private test, core/real.ts): my made-up portfolio on real prices. Each line: find the stock (KRX
// names, Supabase stock_names), the day I "bought" it, how many. The buying price is that day's real close; if the
// stock's bars are not uploaded yet (tools/prices/push_prices.py adds every garden stock on its next run) the player
// types it, and the return fills in from the real close once they are. Nothing is bought or sold anywhere.
import {useEffect,useState} from 'react';
import {Plus,Strike} from './Icons';
import {plantReal,realDraftOk,freePlots,type RealDraft} from '../../core/portfolio';
import {buyClose,refreshed} from '../../core/real';
import {bars,isReal} from '../../core/jigi/stocks';
import {realToday} from '../../core/model';
import {kindOf} from '../../content/portfolio';
import {fieldPlots} from '../../core/land';
import {UI,line} from '../../content/analysts';
import {Sheet} from './Sheet';
import type {StockName} from '../prices';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;
export type RealPrices={search:(q:string)=>Promise<StockName[]>;load:(c:{code:string;name:string}[])=>Promise<number>};

type Row=RealDraft&{q:string;found:boolean;auto:boolean};
const blank=():Row=>({code:'',name:'',date:'',quantity:1,price:0,q:'',found:false,auto:false});

export function RealEntry({g,prices,onClose,onPlanted}:{g:G;prices:RealPrices;onClose:()=>void;onPlanted?:(ids:number[],first:boolean)=>void}){
  const first=!g.s.onboarded,today=realToday();
  const [rows,setRows]=useState<Row[]>([blank()]);
  const [hits,setHits]=useState<{i:number;list:StockName[]}|null>(null);
  const edit=(i:number,p:Partial<Row>)=>setRows(rs=>rs.map((r,j)=>j===i?{...r,...p}:r));
  // search as the name is typed (a short pause first)
  const active=hits?.i??-1;
  useEffect(()=>{const i=rows.findIndex(r=>r.q&&!r.code);if(i<0){setHits(null);return}const q=rows[i].q;
    const t=setTimeout(()=>{void prices.search(q).then(list=>setHits({i,list}))},250);return()=>clearTimeout(t)},[rows.map(r=>r.q+r.code).join('|')]);// eslint-disable-line react-hooks/exhaustive-deps
  // a stock and a day: the buying close from the real bars, when they are there
  const fill=async(i:number,r:Row)=>{if(!r.code||!r.date)return;await prices.load([{code:r.code,name:r.name}]);
    const b=isReal(r.code)?buyClose(bars(r.code),r.date):null;
    setRows(rs=>rs.map((x,j)=>j!==i||x.code!==r.code||x.date!==r.date?x:b?{...x,price:b.c,found:true,auto:true}:{...x,found:false,auto:false,price:x.auto?0:x.price}))};
  const pick=(i:number,s:StockName)=>{const r={...rows[i],code:s.code,name:s.name,q:s.name};edit(i,{code:s.code,name:s.name,q:s.name,found:false});setHits(null);void fill(i,r)};
  const ok=rows.filter(r=>realDraftOk(r,today));
  const open=fieldPlots(g.s.built?.land??[],'farm')/* real stocks go in the 밭 only */,free=freePlots(g.s.holdings,open);
  const plant=()=>{
    const out=plantReal(g.s.holdings,ok,free,kindOf);
    // the return from the latest real close, for the stocks whose bars are loaded
    const next=out.holdings.map(h=>h.real&&h.code&&isReal(h.code)?refreshed(h,bars(h.code)):h);
    g.ops.setHoldings(next);
    g.say(first?line(UI.planted,{n:next.length}):line(UI.replanted,{n:next.length}));
    if(onPlanted)onPlanted(out.planted.map(h=>h.id),first);else onClose()};
  return <Sheet kicker="실제 시세로" title={`${ok.length}종목`} label="실제 시세로 넣기" onClose={onClose}
    foot={<button type="button" className="rt-btn primary wide" disabled={!ok.length||ok.length>free.length+g.s.holdings.filter(h=>ok.some(r=>r.code===h.code)).length} onClick={plant}>{first?`정원에 넣기 · ${ok.length}종목`:'정원에 반영'}</button>}>
    <p className="rt-hint">종목, 산 날짜, 수량만 넣으면 산 가격은 그날 실제 종가로 채워요. 수익률은 최근 종가로 계산해요. 포트폴리오만 가상이에요.</p>
    <ul className="rt-drafts">{rows.map((r,i)=><li key={i}>
      <div className="rt-draft-top" style={{flexWrap:"wrap"}}>
        <input className="rt-input" style={{flex:"1 1 0",minWidth:0}} value={r.q} placeholder="종목 이름이나 코드" maxLength={20} aria-label={`${i+1}번 종목 찾기`}
          onChange={e=>edit(i,{q:e.target.value,code:'',name:'',found:false,auto:false,price:0})}/>
        <button type="button" className="rt-icon-btn" aria-label={`${r.name||i+1+'번'} 빼기`} onClick={()=>setRows(rs=>rs.length>1?rs.filter((_,j)=>j!==i):[blank()])}><Strike size={16}/></button>
        {active===i&&hits&&hits.list.length>0&&<ul className="rt-suggest" role="listbox" aria-label="종목 찾기 결과">{hits.list.map(s=>
          <li key={s.code}><button type="button" role="option" aria-selected={false} onClick={()=>pick(i,s)}><strong>{s.name}</strong><small>{s.code} · {s.mkt}{s.close!=null?` · ${s.close.toLocaleString()}원`:''}</small></button></li>)}</ul>}
        {active===i&&hits&&hits.list.length===0&&<p className="rt-hint rt-suggest-none">찾는 종목이 없어요</p>}
      </div>
      {r.code&&<div className="rt-draft-bottom" style={{flexWrap:'wrap'}}>
        <label>산 날짜<input className="rt-input" type="date" min="2024-01-01" max={today} value={r.date} aria-label={`${r.name} 산 날짜`} style={{width:150}}
          onChange={e=>{const d=e.target.value;edit(i,{date:d});void fill(i,{...r,date:d})}}/></label>
        <label>수량<input className="rt-input rt-num" type="number" min={1} step={1} inputMode="numeric" value={r.quantity||''} aria-label={`${r.name} 수량`} style={{width:70}}
          onChange={e=>edit(i,{quantity:Math.max(0,Math.floor(Number(e.target.value)||0))})}/></label>
        <label>산 가격<input className="rt-input rt-num" type="number" min={1} inputMode="numeric" value={r.price||''} aria-label={`${r.name} 산 가격`} style={{width:96}} readOnly={r.auto}
          onChange={e=>edit(i,{price:Math.max(0,Number(e.target.value)||0),auto:false})}/>원</label>
        {r.date&&<small style={{flexBasis:'100%'}}>{r.auto?'그날 실제 종가예요':'이 종목 시세는 내일 올라와요. 산 가격을 직접 넣어 주세요'}</small>}
      </div>}
    </li>)}</ul>
    <div style={{display:'flex',gap:8,marginTop:10}}>
      <button type="button" className="rt-btn" onClick={()=>setRows(rs=>[...rs,blank()])}><Plus size={16}/>종목 추가</button>
    </div>
  </Sheet>;
}
