'use client';
// 가상 종목 (게임 구성 2026-11-20, core/virtual.ts): the shop's stock counter. Virtual stocks at their price in 원, bought
// with coins in whole shares and planted in the 과수원; 내 가상 종목 shows what each is worth now and sells it back.
// Every price says where it comes from (실제 종가 when the real bars are loaded, 모의 시세 otherwise).
import {useState} from 'react';
import {Sheet} from './Sheet';
import {VIRTUAL_STOCKS,buyQuote,lotQuote,lotSrc,hasRealPrice,valueOf,type VirtualLot} from '../../core/virtual';
import {won} from '../../core/won';

const pct=(x:number)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(1)}%`;
export function VirtualShop({coins,lots,today,focus,room,onBuy,onSell,onClose}:{coins:number;lots:VirtualLot[];today:string;focus?:number|null;room:number;
  onBuy:(code:string,qty:number)=>string|null;onSell:(id:number,qty:number)=>void;onClose:()=>void}){
  const [tab,setTab]=useState<'buy'|'mine'>(focus!=null||(lots.length&&coins<50000)?'mine':'buy');
  const [qty,setQty]=useState<Record<string,number>>({});
  const [msg,setMsg]=useState<string|null>(null);
  const q=(code:string)=>qty[code]??1;
  return <Sheet kicker="상점 · 가상 종목" title={`코인 ${won(coins)}`} label="가상 종목" onClose={onClose}>
    <div className="rt-seg fs-tabs" role="tablist" aria-label="가상 종목 칸">
      <button type="button" role="tab" aria-selected={tab==='buy'} aria-pressed={tab==='buy'} onClick={()=>setTab('buy')}>사기</button>
      <button type="button" role="tab" aria-selected={tab==='mine'} aria-pressed={tab==='mine'} onClick={()=>setTab('mine')}>내 가상 종목 {lots.length}</button></div>
    <p className="rt-hint vs-note">코인으로만 사고팔아요. 실제 계좌와는 상관없고, 산 종목은 과수원(가상 종목 밭)에 나무로 자라요.</p>
    {msg&&<p className="vs-msg" role="status">{msg}</p>}
    {tab==='buy'&&<ul className="vs-list">{VIRTUAL_STOCKS.map(s=>{const p=buyQuote(lots,s.code,today);if(!p)return null;const n=q(s.code),cost=p.price*n,have=lots.some(l=>l.code===s.code);
      return <li key={s.code} className="vs-row">
        <div className="vs-name"><strong>{s.name}</strong><small>{s.mkt} · {p.real?'실제 종가':'모의 시세'} {p.day.slice(5).replace('-','.')}</small></div>
        <b className="rt-num vs-price">{won(p.price)}</b>
        <div className="vs-qty" role="group" aria-label={`${s.name} 수량`}>
          <button type="button" aria-label="한 주 덜" onClick={()=>setQty(x=>({...x,[s.code]:Math.max(1,n-1)}))}>−</button>
          <span className="rt-num">{n}주</span>
          <button type="button" aria-label="한 주 더" onClick={()=>setQty(x=>({...x,[s.code]:n+1}))}>+</button></div>
        <button type="button" className="rt-btn primary vs-buy" disabled={cost>coins||(!have&&room<=0)} aria-label={`${s.name} ${n}주 사기`}
          onClick={()=>{const r=onBuy(s.code,n);setMsg(r);if(!r)setMsg(`${s.name} ${n}주를 샀어요. 과수원에 심었어요.`)}}>
          {cost>coins?`${won(cost-coins)} 부족`:!have&&room<=0?'빈 자리 없음':`${won(cost)} 사기`}</button>
      </li>})}</ul>}
    {tab==='mine'&&(lots.length?<ul className="vs-list">{lots.map(l=>{const p=lotQuote(l,today);
      if(!p)return <li key={l.id} className="vs-row mine"><div className="vs-name"><strong>{l.name}</strong><small>{l.qty}주 · 평균 {won(l.cost)} · 실제 종가를 불러오는 중이에요</small></div></li>;
      const v=valueOf(l,p.price),oldMock=lotSrc(l)==='mock'&&hasRealPrice(l.code);
      return <li key={l.id} className="vs-row mine" data-focus={focus===l.id}>
        <div className="vs-name"><strong>{l.name}</strong><small>{l.qty}주 · 평균 {won(l.cost)} · 지금 {won(p.price)} · {oldMock?'모의 시세로 산 종목':p.real?'실제 종가':'모의 시세'}</small></div>
        <div className="vs-val"><b className="rt-num">{won(v.value)}</b><small className={v.gain>0?'up':v.gain<0?'down':''}>{v.gain>0?'+':''}{won(v.gain)} ({pct(v.rate)})</small></div>
        <div className="vs-sell"><button type="button" className="rt-btn" onClick={()=>{onSell(l.id,1);setMsg(`${l.name} 1주를 팔았어요. ${won(p.price)}이 들어왔어요.`)}}>1주 팔기</button>
          <button type="button" className="rt-btn" onClick={()=>{onSell(l.id,l.qty);setMsg(`${l.name} ${l.qty}주를 모두 팔았어요. ${won(v.value)}이 들어왔어요.`)}}>모두 팔기</button></div>
      </li>})}</ul>:<p className="rt-empty">아직 산 가상 종목이 없어요</p>)}
    <p className="rt-hint" style={{marginTop:10}}>{room>0?`과수원 빈 자리 ${room}칸`:'과수원이 꽉 찼어요. 넓히면 더 심을 수 있어요.'} · 시세는 하루에 한 번 바뀌어요.</p>
  </Sheet>;
}
