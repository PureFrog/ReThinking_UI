// The garden's time of day, from the same clock as the analysts' day (core/routine.ts). The weather (the market) sets
// the kind of sky; this sets how light it is: a dawn from 5 to 7, full day until 17, a warm dusk to 20, night after 21.
//   day   0 at night … 1 in full day (sun and sky brightness)
//   warm  how much of the low-sun colour is in it (peaks at dawn and dusk)
//   night 0 by day … 1 at night (stars, lit windows)
export type Daylight={day:number;warm:number;night:number};
const ramp=(x:number,a:number,b:number)=>Math.min(1,Math.max(0,(x-a)/(b-a)));
export function daylightOf(minutes:number):Daylight{
  const h=((minutes/60)%24+24)%24;
  const day=h<12?ramp(h,5,7.2):1-ramp(h,17.2,20.5);
  const warm=Math.max(0,1-Math.abs(h-6.2)/1.4,1-Math.abs(h-18.6)/1.8);
  return {day:Math.round(day*1000)/1000,warm:Math.round(warm*1000)/1000,night:Math.round((1-day)*1000)/1000};
}
// two hex colours mixed (k = 0 the first, 1 the second)
export function mixHex(a:string,b:string,k:number){
  const p=(s:string)=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b),t=Math.min(1,Math.max(0,k));
  return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
