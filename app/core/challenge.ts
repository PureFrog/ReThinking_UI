// 주간 챌린지 (피드백 B "가상 투자가 재미있고 현실과 닿게"): this week, my practice account against the KOSDAQ index —
// the market's average, the 벤치마크 every fund is measured against. Mon→now: each practice lot from its value at the
// start of the week (the last close before Monday; its cost if bought this week) to its value now. When the week's
// last session is done (Friday after the close, or the weekend) the result can be claimed once. Taking part pays (a
// fixed sum); beating the index earns a 🏅 for the week, not more coins: like the weekly goals (core/weekly.ts), coins
// never reward returns. No draw.
export const WEEKLY_COINS={joined:5_000,beat:0};// 원 (core/won.ts)
export function mondayOf(day:string):string{const d=new Date(day+'T00:00:00Z'),w=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-w);return d.toISOString().slice(0,10)}
export function weekOver(day:string,hour:number):boolean{const w=new Date(day+'T00:00:00Z').getUTCDay();return w===0||w===6||(w===5&&hour>=16)}
type Lot={code:string;qty:number;cost:number;day:string};
// base: what the lot was worth when the week began; now: what it is worth today (prices from the caller)
export function weekResult(lots:Lot[],monday:string,priceAt:(code:string,before:string)=>number|null,priceNow:(l:Lot)=>number|null,index:number)
  :{joined:boolean;mine:number;index:number;beat:boolean;base:number;now:number}{
  let base=0,now=0;
  for(const l of lots){const p=priceNow(l);if(p==null)continue;const b=l.day>=monday?l.cost:(priceAt(l.code,monday)??l.cost);base+=b*l.qty;now+=p*l.qty}
  const mine=base>0?Math.round((now/base-1)*10000)/100:0;
  return {joined:base>0,mine,index,beat:base>0&&mine>index,base,now};
}
