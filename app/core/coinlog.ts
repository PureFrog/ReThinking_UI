// 피드백 2026-11-23 "오늘 획득한 코인량 달력에 적어주기 (달력은 코인 옆에 누르면 나옴)": the coins earned each day,
// kept by the save as {day: coins}. Only gains are counted (spending is not a loss of the day's earning); the master
// top-up and a save taken from the server are not earnings. Pure: proto3d/state.ts writes it, ui/CoinCalendar.tsx shows it.
export type CoinLog=Record<string,number>;
export const COINLOG={keepDays:400};
export function addCoins(log:CoinLog|undefined,day:string,n:number):CoinLog{
  const l={...(log??{})};if(!(n>0))return l;l[day]=(l[day]??0)+Math.round(n);
  const days=Object.keys(l).sort();for(const d of days.slice(0,Math.max(0,days.length-COINLOG.keepDays)))delete l[d];
  return l;
}
// a month as weeks of days (Sunday first), null where the week runs outside the month
export function monthGrid(month:string/* YYYY-MM */):(string|null)[][]{
  const [y,m]=month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),n=new Date(Date.UTC(y,m,0)).getUTCDate();
  const cells:(string|null)[]=[...Array(first).fill(null),...Array.from({length:n},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)];
  while(cells.length%7)cells.push(null);
  return Array.from({length:cells.length/7},(_,w)=>cells.slice(w*7,w*7+7));
}
export const monthTotal=(log:CoinLog|undefined,month:string)=>Object.entries(log??{}).filter(([d])=>d.startsWith(month+'-')).reduce((a,[,v])=>a+v,0);
export function shiftMonth(month:string,by:number){const [y,m]=month.split('-').map(Number),t=y*12+(m-1)+by;return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,'0')}`}

// "코인 결제창": the coin packs (UI only — no payment is connected; the purchase screen ends on a notice, nothing is charged
// and no coins are given until a real payment is wired in here)
export type CoinPack={id:string;coins:number;bonus:number;price:number/* 원, real money */;tag?:string};
export const COIN_PACKS:CoinPack[]=[
  {id:'p1',coins:100_000,bonus:0,price:1_100},
  {id:'p2',coins:500_000,bonus:50_000,price:5_500,tag:'인기'},
  {id:'p3',coins:1_000_000,bonus:150_000,price:11_000},
  {id:'p4',coins:3_000_000,bonus:600_000,price:33_000,tag:'최대 보너스'},
];
export const PAY_METHODS=[{id:'card',label:'신용·체크카드'},{id:'kakao',label:'간편결제'},{id:'phone',label:'휴대폰 결제'}] as const;
