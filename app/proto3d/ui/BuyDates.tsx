'use client';
// The buying day, asked once (가상 MTS, core/holdings-in.ts): a broker's balance usually leaves it out, but the gradual
// model reads (stock, buying day, day of reading) and the crash model only looks inside the holding period. Lines the
// broker sent without one are asked here, all on one sheet; the answers are kept (save.buyDates) and never asked again.
// A place-holder for now: roughly how long, or the exact day.
import {useState} from 'react';
import {HELD,type HeldId} from '../../core/portfolio';
import {heldBack,type StdHolding} from '../../core/holdings-in';
import {Sheet} from './Sheet';

export function BuyDates({lines,today,broker,onDone}:{lines:StdHolding[];today:string;broker?:string;onDone:(days:Record<string,string>)=>void}){
  const [held,setHeld]=useState<Record<string,HeldId>>(()=>Object.fromEntries(lines.map(l=>[l.code,'quarter' as HeldId])));
  const [exact,setExact]=useState<Record<string,string>>({});
  const done=()=>onDone(Object.fromEntries(lines.map(l=>[l.code,exact[l.code]||heldBack(held[l.code],today)])));
  return <Sheet kicker={broker?`${broker} 잔고`:'잔고'} title="산 날짜 한 번만" label="산 날짜" onClose={done}
    foot={<button type="button" className="rt-btn primary wide" onClick={done}>정원에 넣기</button>}>
    <p className="rt-hint" style={{marginTop:0}}>증권사 잔고에는 산 날짜가 없어서 {lines.length}종목만 물어봐요. 서서히·급락 모델이 보유 기간 안에서만 봐요. 다음부터는 안 물어요.</p>
    <ul className="rt-drafts">{lines.map(l=><li key={l.code}>
      <div className="rt-draft-top"><strong style={{flex:1}}>{l.name}</strong><small className="rt-hint">{l.code} · {l.market}</small></div>
      <div className="rt-draft-bottom" style={{flexWrap:'wrap'}}>
        <select className="rt-input" value={held[l.code]} aria-label={`${l.name} 보유 기간`} disabled={!!exact[l.code]} onChange={e=>setHeld(h=>({...h,[l.code]:e.target.value as HeldId}))}>
          {HELD.map(h=><option key={h.id} value={h.id}>{h.label}</option>)}</select>
        <label>또는 날짜<input className="rt-input" type="date" max={today} value={exact[l.code]??''} aria-label={`${l.name} 산 날짜`} style={{width:150}}
          onChange={e=>setExact(x=>({...x,[l.code]:e.target.value}))}/></label>
      </div></li>)}</ul>
  </Sheet>;
}
