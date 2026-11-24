// Holdings coming in (멘토링 2026-11-22): inside a brokerage's MTS the balance should arrive by itself, not be captured
// and uploaded inside the same app. Every way holdings come in goes through this one adapter and leaves as the same
// standard line (StdHolding). Sources today: 'mts' (the made-up broker demo, app/mts/, sent over postMessage),
// 'manual' (RealEntry's typed lines) and 'capture' (a read screenshot matched to a stock code). A real brokerage feed
// (embedding contract, 마이데이터, broker API) becomes one more source here; the garden side stays as it is.
// Nothing here buys or sells: the garden only shows what the account holds.
import type {Holding} from './model';
import type {ReadHolding} from './capture';
import type {RealDraft} from './portfolio';
import {HELD,type HeldId} from './portfolio';

export type Market='KOSPI'|'KOSDAQ';
// the standard line. buyDate: real broker balances usually do not give it, but the gradual model works on
// (stock, buying day, day of reading) and the crash model looks only at events inside the holding period, so a line
// without one is asked about once (ui/BuyDates.tsx). lastPrice: the broker's current price, when it sends one.
export type StdHolding={code:string;name:string;market:Market;quantity:number;avgPrice:number;buyDate?:string|null;lastPrice?:number|null};
export type InputSource='manual'|'capture'|'mts';
export type HoldingsInput={source:InputSource;broker?:string;holdings:StdHolding[];focus?:string|null};

const DAY=864e5;
const isDay=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
const pos=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<1e12?v:null;
export const MAX_LINES=50;

// A balance from outside (a message from another window) is untrusted: only well-formed lines are kept, one per code.
export function cleanStd(raw:unknown):StdHolding[]{
  if(!Array.isArray(raw))return [];
  const out:StdHolding[]=[],seen=new Set<string>();
  for(const x of raw as Record<string,unknown>[]){
    if(!x||typeof x!=='object')continue;
    const code=typeof x.code==='string'?x.code.trim():'',name=typeof x.name==='string'?x.name.replace(/\s+/g,' ').trim().slice(0,30):'';
    const market=x.market==='KOSPI'||x.market==='KOSDAQ'?x.market:null;
    const quantity=pos(x.quantity),avgPrice=pos(x.avgPrice);
    if(!/^\d{6}$/.test(code)||!name||!market||!quantity||!avgPrice||seen.has(code))continue;
    seen.add(code);
    out.push({code,name,market,quantity:Math.floor(quantity),avgPrice:Math.round(avgPrice),buyDate:isDay(x.buyDate)?x.buyDate:null,...(pos(x.lastPrice)?{lastPrice:Math.round(x.lastPrice as number)}:{})});
    if(out.length>=MAX_LINES)break}
  return out;
}
export function cleanInput(raw:unknown):HoldingsInput|null{
  if(!raw||typeof raw!=='object')return null;const r=raw as Record<string,unknown>;
  const source=r.source==='mts'||r.source==='manual'||r.source==='capture'?r.source:null;if(!source)return null;
  const holdings=cleanStd(r.holdings);
  return {source,holdings,broker:typeof r.broker==='string'?r.broker.slice(0,20):undefined,focus:typeof r.focus==='string'&&holdings.some(h=>h.code===r.focus)?r.focus:null};
}

// the other two sources, so a later screen can send them through here too
export const fromManual=(rows:RealDraft[],market:(code:string)=>Market):StdHolding[]=>
  cleanStd(rows.map(r=>({code:r.code,name:r.name,market:market(r.code),quantity:r.quantity,avgPrice:r.price,buyDate:r.date})));
// a capture shows names, not codes: only lines whose name was found among the stocks come through
export const fromCapture=(read:ReadHolding[],find:(name:string)=>{code:string;name:string;market:Market}|null):StdHolding[]=>
  cleanStd(read.flatMap(r=>{const s=find(r.name);if(!s)return [];
    const avg=r.price??0,last=avg>0?Math.round(avg*(1+r.rate/100)):null;
    return [{code:s.code,name:s.name,market:s.market,quantity:r.quantity??1,avgPrice:avg,buyDate:null,lastPrice:last}]}));

// lines still missing a buying day (asked once). known: days answered before, by code
export const needsDate=(list:StdHolding[],known:Record<string,string>={})=>list.filter(h=>!h.buyDate&&!known[h.code]);
export const heldBack=(held:HeldId,today:string)=>new Date(Date.parse(today)-HELD.find(x=>x.id===held)!.days*DAY).toISOString().slice(0,10);
export const withDates=(list:StdHolding[],known:Record<string,string>):StdHolding[]=>list.map(h=>h.buyDate||!known[h.code]?h:{...h,buyDate:known[h.code]});

const round1=(x:number)=>Math.round(x*10)/10;
export const rateOf=(h:StdHolding)=>h.lastPrice&&h.avgPrice>0?round1((h.lastPrice/h.avgPrice-1)*100):0;

// The broker's balance becomes the garden's list: the account is the source of truth, so a stock it no longer holds
// leaves the garden and one it holds again keeps its tree (same id and plot, so earlier judgments stay on it).
// free: the open plots in order; a line without a plot left waits (left).
export function stdToHoldings(prev:Holding[],list:StdHolding[],free:number[],kind:(name:string)=>number,today:string,now=Date.now()){
  const plots=free.filter(p=>!prev.some(h=>h.plot===p&&list.some(l=>l.code===h.code)));
  const holdings:Holding[]=[],planted:Holding[]=[],left:StdHolding[]=[];
  for(const [i,l] of list.entries()){
    const date=l.buyDate??today,rate=rateOf(l),held=Math.max(0,Math.round((Date.parse(today)-Date.parse(date))/DAY));
    const lossDays=rate<=-8?Math.min(held,60):0;
    const ex=prev.find(h=>h.code===l.code);
    if(ex){holdings.push({...ex,name:l.name,price:l.avgPrice,quantity:l.quantity,date,rate,lossDays});continue}
    const plot=plots.shift();if(plot===undefined){left.push(l);continue}
    const h:Holding={id:now+i,name:l.name,code:l.code,kind:kind(l.name),price:l.avgPrice,quantity:l.quantity,date,rate,plot,lossDays};
    holdings.push(h);planted.push(h)}
  return {holdings,planted,left};
}
