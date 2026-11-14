// Deterministic fills for a 판, carried over from sonjeol-game packages/engine (v0.2.0): an order placed on a tick fills at
// the next trading day's open, 0.1% fee each way, a tiny daily rate on cash, no buying into an upper-limit open and no
// selling into a lower-limit open. Same pack + same orders → same result, so a run can be replayed and re-checked.
import {barAt,closeBefore,limits,type GamePack} from './pack';
export const ENGINE={fee:.001,cashDaily:.000034};
export type Side='buy'|'sell';
export type Order={seq:number;tick:number;code:string;side:Side;qty:number};
export type Fill={seq:number;tick:number;d:string;code:string;side:Side;qty:number;price:number;fee:number};
export type Unfilled={seq:number;tick:number;code:string;side:Side;qty:number;reason:'after_last_tick'|'upper_limit_buy'|'lower_limit_sell'|'insufficient_cash'|'insufficient_qty'};
export type Position={qty:number;avg:number};
export type SimResult={values:number[];cash:number;positions:Record<string,Position>;fills:Fill[];unfilled:Unfilled[];start:number};

export function startPositions(pack:GamePack){
  const pos:Record<string,Position>={};
  for(const c of pack.companies)if(c.start==='held'&&c.qty>0)pos[c.code]={qty:c.qty,avg:closeBefore(pack,c.code)};
  return pos;
}
export const startValue=(pack:GamePack)=>pack.cash+pack.companies.reduce((s,c)=>s+(c.start==='held'?c.qty*closeBefore(pack,c.code):0),0);

// play up to and including tick `upto` (default: the whole 판)
export function simulate(pack:GamePack,orders:Order[],upto=pack.days.length-1):SimResult{
  const n=pack.days.length,end=Math.min(n-1,upto);
  const positions=startPositions(pack);let cash=pack.cash;
  const fills:Fill[]=[],unfilled:Unfilled[]=[],values:number[]=[];
  const due=new Map<number,Order[]>();
  for(const o of [...orders].sort((a,b)=>a.seq-b.seq)){
    const t=o.tick+1;
    if(t>=n){unfilled.push({...o,tick:t,reason:'after_last_tick'});continue}
    due.set(t,[...(due.get(t)??[]),o]);
  }
  for(let t=0;t<=end;t++){
    cash*=1+ENGINE.cashDaily;
    for(const o of due.get(t)??[]){
      const bar=barAt(pack,o.code,t),prev=barAt(pack,o.code,t-1);if(!bar||!prev)continue;
      const price=bar[1],{upper,lower}=limits(prev[4]);
      const no=(reason:Unfilled['reason'])=>unfilled.push({...o,tick:t,reason});
      if(o.side==='buy'){
        if(price>=upper){no('upper_limit_buy');continue}
        const qty=Math.min(o.qty,Math.floor(cash/(price*(1+ENGINE.fee))));
        if(qty<=0){no('insufficient_cash');continue}
        const fee=qty*price*ENGINE.fee;cash-=qty*price+fee;
        const p=positions[o.code];
        positions[o.code]=p?{qty:p.qty+qty,avg:(p.avg*p.qty+price*qty)/(p.qty+qty)}:{qty,avg:price};
        fills.push({seq:o.seq,tick:t,d:bar[0],code:o.code,side:'buy',qty,price,fee});
      }else{
        if(price<=lower){no('lower_limit_sell');continue}
        const p=positions[o.code];
        if(!p||p.qty<o.qty){no('insufficient_qty');continue}
        const fee=o.qty*price*ENGINE.fee;cash+=o.qty*price-fee;
        p.qty-=o.qty;if(p.qty===0)delete positions[o.code];
        fills.push({seq:o.seq,tick:t,d:bar[0],code:o.code,side:'sell',qty:o.qty,price,fee});
      }
    }
    let v=cash;for(const [code,p] of Object.entries(positions))v+=p.qty*(barAt(pack,code,t)?.[4]??0);
    values.push(v);
  }
  return {values,cash,positions,fills,unfilled,start:startValue(pack)};
}
export const returnOf=(r:SimResult)=>r.values.length?(r.values[r.values.length-1]/r.start-1)*100:0;
