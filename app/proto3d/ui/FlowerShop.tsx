'use client';
// The 꽃집 (the cart in the garden, content/flower-shop.ts; feedback 11-17 "상점/꽃집 없음"; direction B of
// docs/mockups/garden-b/shop.png): decor trees and flowers for coins, planted on open grass by a tap (Proto3D planting
// mode). 소품 is the old cart (ui/Panels.tsx CartView). 내 정원 lists what is planted and puts one back (no refund).
import {won} from '../../core/won';
import {useState} from 'react';
import {Sheet} from './Sheet';
import {FLOWER_SHOP,shopPlant,type FlowerKind} from '../../content/flower-shop';
import {MODELS} from '../models';
import type {Plant} from '../../core/plants';
import {BUILDINGS,type Built} from '../../core/land';

type Tab=FlowerKind|'goods'|'mine'|'stocks'|'build';
// 피드백 2026-11-24: the 건물 상인 sells the buildings too; a chosen one is set down in the village (Proto3D placing),
// paid when it is
const PIC:Record<string,string>={greenhouse:'🌿',silo:'🌾',windmill:'🌬️'};
export function FlowerShop({coins,plants,onPick,onGoods,onRemove,onClose,onStocks,built,onBuilding}:{built?:Built;onBuilding?:(id:string)=>void;onStocks?:()=>void;coins:number;plants:Plant[];onPick:(id:string)=>void;onGoods:()=>void;onRemove:(id:string)=>void;onClose:()=>void}){
  const [tab,setTab]=useState<Tab>('tree'),[sel,setSel]=useState<string|null>(null);
  const bld=tab==='build'&&sel?BUILDINGS.find(b=>b.id===sel)??null:null;
  const item=sel&&tab!=='build'?shopPlant(sel):null,short=bld?bld.price-coins:item?item.price-coins:0;
  const tabs:[Tab,string][]=[...(onStocks?[['stocks','가상 종목'] as [Tab,string]]:[]),['tree','나무'],['flower','꽃'],['goods','소품'],...(onBuilding?[['build','건물'] as [Tab,string]]:[]),['mine',`내 정원 ${plants.length}`]];
  return <Sheet kicker="상점" title="뭘 살까?" label="상점" onClose={onClose}
    foot={tab==='tree'||tab==='flower'?<div className="fs-foot">
      <span className="rt-coins-inline"><span className="rt-coin" aria-hidden>C</span><span className="rt-num">{won(coins)}</span></span>
      <button type="button" className="rt-btn primary" disabled={!item||short>0} onClick={()=>item&&onPick(item.id)}>
        {!item?'하나 골라요':short>0?`코인이 ${won(short)} 모자라요`:`심을 곳 고르기 · ${won(item.price)}`}</button></div>
      :tab==='build'?<div className="fs-foot">
      <span className="rt-coins-inline"><span className="rt-coin" aria-hidden>C</span><span className="rt-num">{won(coins)}</span></span>
      <button type="button" className="rt-btn primary" disabled={!bld||short>0} onClick={()=>bld&&onBuilding?.(bld.id)}>
        {!bld?'하나 골라요':short>0?`코인이 ${won(short)} 모자라요`:`놓을 자리 고르기 · ${won(bld.price)}`}</button></div>:undefined}>
    <div className="rt-seg fs-tabs" role="tablist" aria-label="꽃집 칸">{tabs.map(([k,l])=>
      <button key={k} type="button" role="tab" aria-selected={tab===k} aria-pressed={tab===k} onClick={()=>{if(k==='stocks'&&onStocks){onStocks();return}setTab(k);setSel(null)}}>{l}</button>)}</div>
    {(tab==='tree'||tab==='flower')&&<div className="fs-grid">{FLOWER_SHOP.filter(p=>p.kind===tab).map(p=>
      <button key={p.id} type="button" className="fs-card" aria-pressed={sel===p.id} aria-label={`${p.name} ${won(p.price)}`} onClick={()=>setSel(p.id)}>
        <span className="fs-pic" style={{backgroundImage:`url(${MODELS.decorPic(p.id)})`}}/>
        <strong>{p.name}</strong><small>{p.desc}</small>
        <span className="fs-price">{won(p.price)}</span></button>)}</div>}
    {(tab==='tree'||tab==='flower')&&<p className="rt-hint" style={{marginTop:10}}>종목 나무와 상관없는 꾸미기예요. 빈 풀밭 어디든 심을 수 있어요.</p>}
    {tab==='build'&&<div className="fs-grid">{BUILDINGS.map(b=>{const has=!!built?.buildings.includes(b.id);return <button key={b.id} type="button" className="fs-card" disabled={has}
      aria-pressed={sel===b.id} aria-label={`${b.name} ${won(b.price)}`} onClick={()=>setSel(b.id)}>
      <span className="fs-pic fs-emoji" aria-hidden>{PIC[b.id]??'🏠'}</span><strong>{b.name}</strong><small>{b.desc}</small>
      <span className="fs-price">{has?'마을에 있어요':won(b.price)}</span></button>})}</div>}
    {tab==='build'&&<p className="rt-hint" style={{marginTop:10}}>고르면 마을이 보여요. 놓을 자리를 누르면 그때 지어지고 코인이 나가요.</p>}
    {tab==='goods'&&<div className="fs-goods"><p className="rt-hint">집 안팎을 꾸미는 소품은 하루에 몇 개씩 바뀌어요.</p>
      <button type="button" className="rt-btn wide" onClick={onGoods}>소품 보러 가기</button></div>}
    {tab==='mine'&&(plants.length?<ul className="fs-mine">{plants.map(p=>{const it=shopPlant(p.item);return <li key={p.id}>
      <span className="fs-pic sm" style={{backgroundImage:`url(${MODELS.decorPic(p.item)})`}}/><span>{it?.name??p.item}</span>
      <button type="button" className="rt-btn" onClick={()=>onRemove(p.id)}>뽑기</button></li>})}</ul>
      :<p className="rt-empty">아직 심은 게 없어요</p>)}
    {tab==='mine'&&plants.length>0&&<p className="rt-hint" style={{marginTop:8}}>뽑으면 그 자리가 비어요. 코인은 돌려받지 않아요.</p>}
  </Sheet>;
}
