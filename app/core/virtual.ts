// 가상 종목 밭 (게임 구성 2026-11-20): the 과수원 is the field of virtual stocks. They are bought with coins (원) at the
// stock's price (real closes when they are loaded, the mock walk otherwise, and the screen says which), grow as trees
// there, and when sold the coins come back with the gain or the loss. Real stocks never earn coins by their returns;
// this field is where returns are played with. Nothing here touches a real account.
// 2026-11-23: a lot keeps the prices it was bought at (src): one bought on the mock walk is valued and sold on the mock
// walk even after real closes come in, one bought on real closes waits for them (no price until they are loaded), so a
// mock cost never meets a real price. The virtual stocks' real bars are kept here (setVirtualReal), apart from the
// journals' bars (jigi/stocks.ts setReal), so loading them does not move a journal's chart or verdict.
import {KOSDAQ_STOCKS,mockBars,isReal,bars,stockOf,type Bar} from './jigi/stocks';
import type {Holding} from './model';

export type Src='real'|'mock';
export type VirtualLot={id:number;code:string;name:string;qty:number;cost:number/* 원 a share */;plot:number;day:string;src?:Src/* absent on lots from before 2026-11-23 */};
// tree ids of virtual stocks stay apart from my holdings' ids
export const VIRTUAL_ID=800000;
// 피드백 2026-11-23 "코스피 종목이 나와": the virtual field trades the KOSDAQ120 list only
export const VIRTUAL_STOCKS=KOSDAQ_STOCKS;
const VREAL=new Map<string,Bar[]>();
export function setVirtualReal(code:string,bs:Bar[]){if(bs.length)VREAL.set(code,bs)}
const realBarsOf=(code:string)=>VREAL.get(code)??(isReal(code)?bars(code):null);
export const hasRealPrice=(code:string)=>!!realBarsOf(code);
const onOrBefore=(a:Bar[],day:string)=>{for(let i=a.length-1;i>=0;i--)if(a[i].d<=day)return a[i];return null};
const before=(a:Bar[],day:string)=>{for(let i=a.length-1;i>=0;i--)if(a[i].d<day)return a[i];return null};
// the price a virtual stock trades at today: the last close before today (today's is not final yet). src: only these
// prices (a lot's own); without it, real closes when loaded, else the mock walk
export function quote(code:string,today:string,src?:Src):{price:number;day:string;real:boolean}|null{
  const rb=realBarsOf(code),use=src==='mock'?mockBars(code):src==='real'?rb:rb??mockBars(code);if(!use)return null;
  const b=before(use,today)??onOrBefore(use,today);return b?{price:b.c,day:b.d,real:!!rb&&use===rb}:null;
}
// a lot's prices: its own src, or for an older lot the source whose close on its buying day is nearer its cost
export function lotSrc(l:Pick<VirtualLot,'code'|'cost'|'day'|'src'>):Src{
  if(l.src)return l.src;const rb=realBarsOf(l.code);if(!rb)return 'mock';
  const r=onOrBefore(rb,l.day),m=onOrBefore(mockBars(l.code),l.day);if(!r)return 'mock';if(!m)return 'real';
  return Math.abs(m.c-l.cost)<Math.abs(r.c-l.cost)?'mock':'real';
}
export const lotQuote=(l:VirtualLot,today:string)=>quote(l.code,today,lotSrc(l));
// what a buy of this stock costs today and on which prices: a second buy adds to the tree on the tree's own prices
export function buyQuote(lots:VirtualLot[],code:string,today:string):{price:number;day:string;real:boolean;src:Src}|null{
  const have=lots.find(l=>l.code===code);
  if(have){const src=lotSrc(have),q=quote(code,today,src);return q?{...q,src}:null}
  const q=quote(code,today);return q?{...q,src:q.real?'real':'mock'}:null;
}
// the first final close on or after a day (the cart's settling), on the given prices
export function closeFrom(code:string,from:string,today:string,src?:Src):Bar|null{
  const rb=realBarsOf(code),a=src==='mock'?mockBars(code):src==='real'?rb:rb??mockBars(code);
  return a?.find(x=>x.d>=from&&x.d<today)??null;
}
type O={currency:number;virtual:VirtualLot[]};
export type Buy={ok:true;currency:number;virtual:VirtualLot[];lot:VirtualLot}|{ok:false;why:'qty'|'coins'|'room'|'unknown';need?:number};
// buying: whole shares, enough coins, a free plot (a second buy of the same stock adds to its tree at the average price)
export function buyVirtual(o:O,code:string,qty:number,price:number,plots:number[],day:string,src?:Src):Buy{
  const st=stockOf(code);if(!st||!(price>0))return {ok:false,why:'unknown'};
  if(!Number.isInteger(qty)||qty<1)return {ok:false,why:'qty'};
  const cost=price*qty;if(o.currency<cost)return {ok:false,why:'coins',need:cost-o.currency};
  const have=o.virtual.find(l=>l.code===code);
  if(have){const q=have.qty+qty,lot={...have,qty:q,cost:Math.round((have.cost*have.qty+cost)/q),...(src?{src}:{})};
    return {ok:true,currency:o.currency-cost,virtual:o.virtual.map(l=>l.id===have.id?lot:l),lot}}
  const plot=plots.find(i=>!o.virtual.some(l=>l.plot===i));if(plot===undefined)return {ok:false,why:'room'};
  const lot:VirtualLot={id:Math.max(0,...o.virtual.map(l=>l.id))+1,code,name:st.name,qty,cost:price,plot,day,...(src?{src}:{})};
  return {ok:true,currency:o.currency-cost,virtual:[...o.virtual,lot],lot};
}
// selling some or all: the coins come back at today's price; the tree goes when nothing is left
export function sellVirtual(o:O,id:number,qty:number,price:number):{ok:true;currency:number;virtual:VirtualLot[];gain:number}|{ok:false}{
  const l=o.virtual.find(x=>x.id===id);if(!l||!Number.isInteger(qty)||qty<1||qty>l.qty||!(price>0))return {ok:false};
  const gain=(price-l.cost)*qty;
  return {ok:true,currency:o.currency+price*qty,virtual:qty===l.qty?o.virtual.filter(x=>x.id!==id):o.virtual.map(x=>x.id===id?{...x,qty:x.qty-qty}:x),gain};
}
export const valueOf=(l:VirtualLot,price:number)=>({value:price*l.qty,gain:(price-l.cost)*l.qty,rate:Math.round((price/l.cost-1)*1000)/10});
// a virtual stock as a tree in the 과수원 (the same tree drawing as a holding; the tag says 가상)
export const virtualTree=(l:VirtualLot,price:number):Holding=>({id:VIRTUAL_ID+l.id,name:l.name,code:l.code,kind:l.id%3,price:l.cost,quantity:l.qty,date:l.day,
  rate:valueOf(l,price).rate,plot:l.plot,lossDays:0,virtual:true});
export const isVirtualTree=(id:number)=>id>=VIRTUAL_ID&&id<VIRTUAL_ID+100000;
// 통신기 현재가 (피드백 2026-11-26 "실제 증권앱처럼"): the closes before today on the stock's prices (real when loaded),
// newest last, at most n; and the day's change against the close before
export function history(code:string,today:string,n=60):Bar[]{const rb=realBarsOf(code),use=rb??mockBars(code);if(!use)return [];
  const upto=use.filter(b=>b.d<today);return upto.slice(-n)}
export function change(code:string,today:string):{price:number;prev:number;rate:number}|null{const h=history(code,today,2);if(h.length<2)return null;
  const [a,b]=h;return {price:b.c,prev:a.c,rate:Math.round((b.c/a.c-1)*10000)/100}}
