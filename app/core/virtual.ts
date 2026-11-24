// 가상 종목 밭 (게임 구성 2026-11-20): the 과수원 is the field of virtual stocks. They are bought with coins (원) at the
// stock's price (real closes when they are loaded, the mock walk otherwise, and the screen says which), grow as trees
// there, and when sold the coins come back with the gain or the loss. Real stocks never earn coins by their returns;
// this field is where returns are played with. Nothing here touches a real account.
import {KOSDAQ_STOCKS,lastConfirmed,barOnOrBefore,isReal,stockOf} from './jigi/stocks';
import type {Holding} from './model';

export type VirtualLot={id:number;code:string;name:string;qty:number;cost:number/* 원 a share */;plot:number;day:string};
// tree ids of virtual stocks stay apart from my holdings' ids
export const VIRTUAL_ID=800000;
// 피드백 2026-11-23 "코스피 종목이 나와": the virtual field trades the KOSDAQ120 list only
export const VIRTUAL_STOCKS=KOSDAQ_STOCKS;
// the price a virtual stock trades at today: the last close before today (today's is not final yet)
export function quote(code:string,today:string):{price:number;day:string;real:boolean}|null{
  const b=lastConfirmed(code,today)??barOnOrBefore(code,today);return b?{price:b.c,day:b.d,real:isReal(code)}:null;
}
type O={currency:number;virtual:VirtualLot[]};
export type Buy={ok:true;currency:number;virtual:VirtualLot[];lot:VirtualLot}|{ok:false;why:'qty'|'coins'|'room'|'unknown';need?:number};
// buying: whole shares, enough coins, a free plot (a second buy of the same stock adds to its tree at the average price)
export function buyVirtual(o:O,code:string,qty:number,price:number,plots:number[],day:string):Buy{
  const st=stockOf(code);if(!st||!(price>0))return {ok:false,why:'unknown'};
  if(!Number.isInteger(qty)||qty<1)return {ok:false,why:'qty'};
  const cost=price*qty;if(o.currency<cost)return {ok:false,why:'coins',need:cost-o.currency};
  const have=o.virtual.find(l=>l.code===code);
  if(have){const q=have.qty+qty,lot={...have,qty:q,cost:Math.round((have.cost*have.qty+cost)/q)};
    return {ok:true,currency:o.currency-cost,virtual:o.virtual.map(l=>l.id===have.id?lot:l),lot}}
  const plot=plots.find(i=>!o.virtual.some(l=>l.plot===i));if(plot===undefined)return {ok:false,why:'room'};
  const lot:VirtualLot={id:Math.max(0,...o.virtual.map(l=>l.id))+1,code,name:st.name,qty,cost:price,plot,day};
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
