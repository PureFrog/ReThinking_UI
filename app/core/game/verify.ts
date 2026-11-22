// The server's check on a submitted run (docs/server.md 관측소 원정): replay the decisions and orders on the same pack
// with the same engine, and accept only what replays. The client sends what it did, never its score; the server keeps
// the score it computes. Pure, so it runs in an edge function as it runs in the tests.
import {CHIPS,MAX_STAKE,moments,heldAt,type RunRecord,type Swap} from './run';
import {scoreRun} from './grade';
import {simulate,returnOf,type Order} from './engine';
import type {GamePack} from './pack';
export type Submission={pack:string;week:string;decisions:RunRecord['decisions'];orders:Order[];swaps:Swap[]};
export type Verdict={ok:true;total:number;ret:number;hits:number}|{ok:false;reason:string};
export function verifyRun(pack:GamePack,s:Submission):Verdict{
  if(s.pack!==pack.id)return {ok:false,reason:'pack'};
  const chips=s.decisions.reduce((n,d)=>n+d.chips,0);
  if(chips>CHIPS||s.decisions.some(d=>!Number.isInteger(d.chips)||d.chips<1||d.chips>MAX_STAKE))return {ok:false,reason:'chips'};
  // every decision sits on a real moment of a company held right then, once
  const ms=moments(pack,(c,t)=>heldAt(pack,s.swaps,c,t));
  const seen=new Set<string>();
  for(const d of s.decisions){const k=d.tick+':'+d.code;if(seen.has(k))return {ok:false,reason:'twice'};seen.add(k);
    if(!ms.some(m=>m.tick===d.tick&&m.code===d.code&&m.kind===d.kind))return {ok:false,reason:'moment'}}
  // swaps only after a 정리 on that tick, and only to a waiting company
  for(const w of s.swaps){const d=s.decisions.find(x=>x.tick===w.tick&&x.code===w.out&&x.choice==='정리');const c=pack.companies.find(x=>x.code===w.in);
    if(!d||c?.start!=='reserve')return {ok:false,reason:'swap'}}
  if(s.orders.some(o=>o.tick<0||o.tick>=pack.days.length||!pack.companies.some(c=>c.code===o.code)))return {ok:false,reason:'order'};
  const score=scoreRun(pack,s.decisions);
  return {ok:true,total:score.total,ret:Math.round(returnOf(simulate(pack,s.orders))*10)/10,hits:score.hits};
}
