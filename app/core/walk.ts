// 유저 워크플로우 (PM 2026-11-21, docs/user-workflow.md): the first walk round the village after the first lesson in the
// room, and the rules the stations use. Pure logic: Proto3D keeps the save under 'rethink-walk-v1'.
//   2장  the order: 광장 → 실제 밭(농부) → 가상 밭(상인, 그다음 농부에게 매도) → 도서관(사서) → 뉴스 표지판(신문 배달)
//        → 연못(낚시꾼) → 건물 상점·옷 상점(점원) → 자유 활동. Only the current station's person opens; the rest wait.
//   4장  the merchant stands 08:00–20:00 KST, five candidates a day (the same all day); selling goes through the farmer
//        any time: the harvest waits in the cart and is paid once at the next trading day's close.
//   3장  a tree's size follows what the holding is worth now (continuously), its leaves follow the return.

// 피드백 2026-11-22: the librarian moved into the house (the room after the first lesson), so the first walk has no library stop
// 유저 워크플로우 (2026-11-23): 실제 밭 → 가상 밭 → 도서관 → 뉴스 표지판 → 낚시 → 상점
export const WALK_STEPS=['square','farmer','merchant','sell','librarian','news','fisher','shop-build','shop-wear'] as const;
export type WalkStep=typeof WALK_STEPS[number];
export type WalkSave={v:1;
  // how far the first walk has come (WALK_STEPS.length = done: everything is open)
  step:number;
  // the real holdings went into the field with the farmer (until then they are kept, not drawn)
  planted:boolean;
  // the merchant's free sapling has been given (once per account), and its lot
  freeTree:number|null;
  // the first walk reached the merchant outside its hours: 상인 만나기 waits for the next opening
  merchantWait:boolean;
  // the first purchase of each kind of thing (wear, decor, building) has had its 'where it goes' guide
  firstBuy:string[]};
export const WALK0:WalkSave={v:1,step:0,planted:false,freeTree:null,merchantWait:false,firstBuy:[]};
export function readWalk(x:unknown):WalkSave{
  if(!x||typeof x!=='object'||(x as {v?:number}).v!==1)return WALK0;const w=x as Partial<WalkSave>;
  return {v:1,step:Math.max(0,Math.min(WALK_STEPS.length,Number(w.step)||0)),planted:!!w.planted,freeTree:typeof w.freeTree==='number'?w.freeTree:null,
    merchantWait:!!w.merchantWait,firstBuy:Array.isArray(w.firstBuy)?w.firstBuy.filter(s=>typeof s==='string'):[]};
}
export const walkDone=(w:WalkSave)=>w.step>=WALK_STEPS.length;
export const stepOf=(w:WalkSave):WalkStep|null=>walkDone(w)?null:WALK_STEPS[w.step];
// a station finished: on to the next (finishing one that is not the current is ignored, so a retry never skips one)
export function passStep(w:WalkSave,id:WalkStep):WalkSave{return stepOf(w)===id?{...w,step:w.step+1,merchantWait:id==='merchant'?false:w.merchantWait}:w}
// who may be talked to now: during the first walk only the current station's person (and the next one after a
// station whose person is the same, the farmer for selling); afterwards everyone
export const PERSON_OF:Record<WalkStep,string|null>={square:null,farmer:'farmer',merchant:'merchant',sell:'farmer',librarian:'librarian',news:'paperboy',fisher:'naru','shop-build':'builder','shop-wear':'tailor'};
export function mayTalk(w:WalkSave,person:string):boolean{const s=stepOf(w);return s===null||PERSON_OF[s]===person}

// 4장 the merchant's hours, by the minutes of the day in Korea (KST)
export const MERCHANT={open:8*60,close:20*60};
export const merchantHere=(kstMinutes:number)=>kstMinutes>=MERCHANT.open&&kstMinutes<MERCHANT.close;
export const nextOpenLabel=(kstMinutes:number)=>kstMinutes<MERCHANT.open?'오늘 오전 8시':'내일 오전 8시';
export const kstMinutes=(now:Date)=>{const m=(now.getUTCHours()+9)*60+now.getUTCMinutes();return m%(24*60)};

// five candidates for the day: the same five all day (seeded by the date), different from day to day
export function candidates<T>(pool:T[],day:string,n=5):T[]{
  let s=0;for(const ch of day)s=(s*31+ch.charCodeAt(0))>>>0;
  const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/2**32};
  const a=pool.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a.slice(0,Math.min(n,a.length));
}

// the next trading day after a day (weekends skipped; a holiday is skipped when the close simply is not there yet)
export function tradingDayAfter(day:string):string{const d=new Date(day+'T00:00:00Z');do d.setUTCDate(d.getUTCDate()+1);while(d.getUTCDay()===0||d.getUTCDay()===6);return d.toISOString().slice(0,10)}

// 4장 the farmer's cart: what was harvested waits here (no longer sellable, coins unchanged) and is paid once at the
// close of the next trading day. practice: the first walk's harvest (paid as a number only, the free tree is kept)
export type CartLoad={id:number;lotId:number;code:string;name:string;qty:number;day:string/* loaded on */;settleDay:string;
  practice?:boolean;paid?:number|null/* coins paid once settled */;close?:number|null;src?:'real'|'mock'/* the lot's prices (core/virtual.ts) */};
export function loadCart(cart:CartLoad[],l:{lotId:number;code:string;name:string;src?:'real'|'mock'},qty:number,day:string,practice=false):CartLoad[]|null{
  if(!Number.isInteger(qty)||qty<1)return null;
  return [...cart,{id:Math.max(0,...cart.map(c=>c.id))+1,lotId:l.lotId,code:l.code,name:l.name,qty,day,settleDay:tradingDayAfter(day),practice,paid:null,close:null,...(l.src?{src:l.src}:{})}];
}
// paid once: when a close on or after the settle day is final (closeFrom gives the first such close, or null)
export function settleCart(cart:CartLoad[],closeFrom:(code:string,from:string,src?:'real'|'mock')=>{d:string;c:number}|null):{cart:CartLoad[];coins:number;settled:CartLoad[]}{
  let coins=0;const settled:CartLoad[]=[];
  const next=cart.map(c=>{if(c.paid!=null)return c;const b=closeFrom(c.code,c.settleDay,c.src);if(!b)return c;
    const paid=Math.round(b.c*c.qty),done={...c,paid,close:b.c,settleDay:b.d};if(!c.practice)coins+=paid;settled.push(done);return done});
  return {cart:next,coins,settled};
}
// the pile on the cart: the loads still waiting
export const waiting=(cart:CartLoad[])=>cart.filter(c=>c.paid==null);
export const waitingQty=(cart:CartLoad[],lotId:number)=>waiting(cart).filter(c=>c.lotId===lotId&&!c.practice).reduce((n,c)=>n+c.qty,0);

// 3장 how big a tree stands: by what the holding is worth now, continuously (the same worth, the same size, whatever
// else is bought); 1 is the usual tree, from a small sapling-sized one up to a big one
export const SIZE={min:0.5,max:1.45,at1m:0.8,perDecade:0.28};
export function treeSize(value:number):number{if(!(value>0))return SIZE.min;
  const s=SIZE.at1m+SIZE.perDecade*Math.log10(value/1_000_000);return Math.round(Math.min(SIZE.max,Math.max(SIZE.min,s))*1000)/1000}
// what a holding is worth now: the average price moved by the return, times the shares
export const worthOf=(h:{price:number;rate:number;quantity:number})=>Math.round(h.price*(1+h.rate/100)*h.quantity);
