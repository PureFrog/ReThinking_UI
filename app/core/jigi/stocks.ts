// 지기 (docs/jigi.md): the stocks a journal can be about and their daily bars. Until the KRX collector is connected
// (price_daily on the server) these are MOCK bars: the prototype's synthetic walk, anchored so each stock's close on
// 2026-11-13 is near its real level. Every screen that shows them says "모의 시세". Same code, same bars, every time.
export type Stock={code:string;name:string;mkt:'KOSPI'|'KOSDAQ';anchor:number;vol:number;listed?:string};
export const STOCKS:Stock[]=[
  {code:'005930',name:'삼성전자',mkt:'KOSPI',anchor:71200,vol:.030},
  {code:'000660',name:'SK하이닉스',mkt:'KOSPI',anchor:186500,vol:.040},
  {code:'373220',name:'LG에너지솔루션',mkt:'KOSPI',anchor:402000,vol:.040,listed:'2022-01-27'},
  {code:'005380',name:'현대차',mkt:'KOSPI',anchor:231000,vol:.032},
  {code:'035420',name:'NAVER',mkt:'KOSPI',anchor:198400,vol:.036},
  {code:'035720',name:'카카오',mkt:'KOSPI',anchor:41250,vol:.040},
  {code:'068270',name:'셀트리온',mkt:'KOSPI',anchor:178300,vol:.036},
  {code:'105560',name:'KB금융',mkt:'KOSPI',anchor:92800,vol:.028},
  {code:'012450',name:'한화에어로스페이스',mkt:'KOSPI',anchor:356500,vol:.044},
  {code:'005490',name:'POSCO홀딩스',mkt:'KOSPI',anchor:318000,vol:.034},
  {code:'247540',name:'에코프로비엠',mkt:'KOSDAQ',anchor:152700,vol:.050},
  {code:'196170',name:'알테오젠',mkt:'KOSDAQ',anchor:327500,vol:.050},
];
// mock stocks for trees outside the twelve (registerMock below)
const STOCKS_EXTRA:Stock[]=[];
export const stockOf=(code:string)=>STOCKS.find(s=>s.code===code)??STOCKS_EXTRA.find(s=>s.code===code)??null;
export const stockByName=(name:string)=>STOCKS.find(s=>s.name===name)??null;
export function searchStocks(q:string){const t=q.trim().toLowerCase();if(!t)return [];return STOCKS.filter(s=>s.name.toLowerCase().includes(t)||s.code.includes(t))}

export type Bar={d:string;o:number;h:number;l:number;c:number};
const DAY=864e5,EPOCH=Date.UTC(2014,0,1),REF='2026-11-13',END=Date.UTC(2029,0,1);
function rng(seed:number){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const cache=new Map<string,Bar[]>();
// every weekday from 2014 to 2028 (no holidays in the mock), prices on the KRX tick
export function bars(code:string):Bar[]{
  const hit=cache.get(code);if(hit)return hit;
  const st=stockOf(code);if(!st)return [];
  const r=rng((/^\d+$/.test(code)?parseInt(code,10):parseInt(code.slice(1),10)+31)*7+13);let p=100,ref:Bar|null=null;const raw:Bar[]=[];
  for(let t=EPOCH;t<=END;t+=DAY){const wd=new Date(t).getUTCDay();if(wd===0||wd===6)continue;
    const o=p*(1+(r()-.5)*.006),c=o*(1+(r()+r()+r()-1.5)*st.vol+.0002),h=Math.max(o,c)*(1+r()*.008),l=Math.min(o,c)*(1-r()*.008);
    const b={d:new Date(t).toISOString().slice(0,10),o,h,l,c};raw.push(b);p=c;if(b.d<=REF)ref=b}
  const k=st.anchor/(ref??raw[raw.length-1]).c,tick=st.anchor>=200000?500:st.anchor>=50000?100:50,q=(x:number)=>Math.max(tick,Math.round(x*k/tick)*tick);
  let out=raw.map(b=>({d:b.d,o:q(b.o),h:q(b.h),l:q(b.l),c:q(b.c)})).map(b=>({...b,h:Math.max(b.h,b.o,b.c),l:Math.min(b.l,b.o,b.c)}));
  if(st.listed)out=out.filter(b=>b.d>=st.listed!);
  cache.set(code,out);return out;
}
// the last bar on or before a day (a holiday or weekend falls back to the trading day before)
export function barOnOrBefore(code:string,day:string):Bar|null{const a=bars(code);for(let i=a.length-1;i>=0;i--)if(a[i].d<=day)return a[i];return null}
// the last CONFIRMED close as of today: strictly before today (today's close is not final yet)
export function lastConfirmed(code:string,today:string):Bar|null{const a=bars(code);for(let i=a.length-1;i>=0;i--)if(a[i].d<today)return a[i];return null}
// the bars a chart shows: from `days` back up to (not including) today
export function window_(code:string,today:string,days:number):Bar[]{const from=new Date(Date.parse(today+'T00:00:00Z')-days*DAY).toISOString().slice(0,10);return bars(code).filter(b=>b.d>=from&&b.d<today)}
export const RANGES={'3개월':92,'6개월':183,'1년':366,'5년':1827} as const;
export type Range=keyof typeof RANGES;

// A tree whose name is not one of the twelve (typed in the onboarding, e.g. "한빛전자") still gets mock bars so its
// journals have a chart and a verdict: a code made from its name ("M" + hash), anchored at its own price. Registered
// whenever the garden is shown (registerMock is idempotent); every screen labels the bars 모의 시세 anyway.
const hashOf=(s:string)=>{let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return h};
export function registerMock(name:string,price:number):string{
  const code='M'+String(hashOf(name)%1e6).padStart(6,'0');
  if(!stockOf(code)){const anchor=Math.max(1000,Math.round(price||10000));STOCKS_EXTRA.push({code,name,mkt:'KOSDAQ',anchor,vol:.04})}
  return code;
}
// a holding's code: its own, one of the twelve by name, or a mock one
export const codeOf=(h:{code?:string;name:string;price:number})=>h.code??stockByName(h.name)?.code??registerMock(h.name,h.price);
