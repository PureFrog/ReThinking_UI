// Real prices from Supabase (private test, db/migrations/007; uploaded daily by tools/prices/push_prices.py): daily bars
// for the stocks in my garden (and the journal's twelve), and the KRX names for the stock search. Readable only after
// an invite code. Loaded bars go into app/core/jigi/stocks.ts, so charts, verdicts and the trees all use them.
import {supabase,supabaseReady} from './supabase';
import {setReal,type Bar} from '../core/jigi/stocks';
import {setMarketBars} from '../content/market';

export type StockName={code:string;name:string;mkt:string;close:number|null};
const FROM='2024-01-01';
const loaded=new Set<string>();

// bars for these codes (each once per visit); returns how many codes now have real bars
export async function loadRealBars(codes:{code:string;name:string}[]):Promise<number>{
  if(!supabaseReady)return 0;
  const todo=codes.filter(c=>/^\d{6}$/.test(c.code)&&!loaded.has(c.code));
  await Promise.all(todo.map(async({code,name})=>{
    // a code's history is ~700 rows: two pages of 1000 at most
    const out:Bar[]=[];
    for(let page=0;page<3;page++){
      const {data,error}=await supabase().from('price_daily').select('d,o,h,l,c,v').eq('code',code).gte('d',FROM).order('d').range(page*1000,page*1000+999);
      if(error||!data)return;
      out.push(...data.map(r=>({d:r.d as string,o:+r.o,h:+r.h,l:+r.l,c:+r.c,v:r.v==null?undefined:+r.v})));
      if(data.length<1000)break}
    if(out.length){setReal(code,name,out);loaded.add(code)}
  }));
  return codes.filter(c=>loaded.has(c.code)).length;
}

// the KOSDAQ index bars for the market weather (content/market.ts); once per visit; returns how many bars
export const MARKET_CODE='KOSDAQ';
let marketBars=0;
export async function loadMarket():Promise<number>{
  if(!supabaseReady||marketBars)return marketBars;
  const out:Bar[]=[];
  for(let page=0;page<3;page++){
    const {data,error}=await supabase().from('price_daily').select('d,o,h,l,c').eq('code',MARKET_CODE).gte('d',FROM).order('d').range(page*1000,page*1000+999);
    if(error||!data)return 0;
    out.push(...data.map(r=>({d:r.d as string,o:+r.o,h:+r.h,l:+r.l,c:+r.c})));
    if(data.length<1000)break}
  if(out.length>1){setMarketBars(out);marketBars=out.length}
  return marketBars;
}

// the stock search: by name (or code), most valuable first
export async function searchNames(q:string):Promise<StockName[]>{
  const t=q.trim();if(!supabaseReady||!t)return [];
  const col=/^\d+$/.test(t)?'code':'name';
  const {data,error}=await supabase().from('stock_names').select('code,name,mkt,close').ilike(col,`%${t.replace(/[%_]/g,'')}%`).order('mktcap',{ascending:false}).limit(12);
  return error||!data?[]:data.map(r=>({code:r.code,name:r.name,mkt:r.mkt,close:r.close==null?null:+r.close}));
}

// e2e (tests/e2e/proto3d-real.spec.ts): a page can stand in for the server with window.__priceFixture
export type PriceFixture={names:StockName[];bars:Record<string,Bar[]>};
export const fixturePrices=(f:PriceFixture)=>({
  async search(q:string){const t=q.trim();return t?f.names.filter(n=>n.name.includes(t)||n.code.includes(t)):[]},
  async load(codes:{code:string;name:string}[]){let n=0;for(const c of codes){const b=f.bars[c.code];if(b?.length){setReal(c.code,c.name,b);n++}}return n},
  async market(){const b=f.bars[MARKET_CODE]??[];if(b.length>1)setMarketBars(b);return b.length>1?b.length:0},
});
