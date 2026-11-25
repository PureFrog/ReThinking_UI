// 통신기 (B2C 기본, 2026-11-23): the merchant's communicator becomes the player's practice-account MTS inside the
// garden (app/proto3d/ui/Comm.tsx). One balance for both fields: the real stocks I keep a record of (기록만, no trading)
// and the virtual stocks bought with game coins (core/virtual.ts). Coins are the deposit; nothing reaches a real account.
import type {Holding} from '../core/model';
import {lotQuote,valueOf,type VirtualLot} from '../core/virtual';
import {stockOf} from '../core/jigi/stocks';
import type {DemoLine} from './broker/demo-account';

// kind: real = 기록 종목 (the garden's own trees), virtual = 코인 종목 (the orchard); id: the tree's id in the garden
export type CommLine=DemoLine&{id:number;kind:'real'|'virtual';lotId?:number};
export type CommAccount={lines:CommLine[];worth:number;buy:number;pl:number;rate:number;coins:number;total:number};

const mkt=(code:string|undefined)=>stockOf(code??'')?.mkt??'KOSPI';
export function commAccount(holdings:Holding[],lots:VirtualLot[],coins:number,today:string,virtualId:(lotId:number)=>number):CommAccount{
  const real:CommLine[]=holdings.filter(h=>!h.virtual).map(h=>{const last=Math.round(h.price*(1+h.rate/100));
    return {id:h.id,kind:'real',code:h.code??'',name:h.name,market:mkt(h.code),quantity:h.quantity,avgPrice:h.price,buyDate:h.date,lastPrice:last,prev:last}});
  const virt:CommLine[]=lots.flatMap(l=>{const q=lotQuote(l,today);if(!q)return [];
    return [{id:virtualId(l.id),lotId:l.id,kind:'virtual' as const,code:l.code,name:l.name,market:mkt(l.code),quantity:l.qty,avgPrice:l.cost,buyDate:l.day,lastPrice:q.price,prev:q.price}]});
  const lines=[...real,...virt],buy=lines.reduce((n,l)=>n+l.avgPrice*l.quantity,0),worth=lines.reduce((n,l)=>n+l.lastPrice*l.quantity,0);
  return {lines,worth,buy,pl:worth-buy,rate:buy>0?Math.round((worth/buy-1)*10000)/100:0,coins,total:worth+coins};
}
// a virtual lot's gain at today's price (the order tab's sell side)
export const lotNow=(l:VirtualLot,today:string)=>{const q=lotQuote(l,today);return q?{price:q.price,...valueOf(l,q.price)}:null};
