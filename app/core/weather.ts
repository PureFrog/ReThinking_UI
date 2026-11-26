// redesign 4-1: the sky over the garden is today's market. The player cannot change it; it only tells the mood of the
// day before any number is read. Four kinds, picked from the index move and how jumpy the day was.
// Market numbers are mock (app/content/market.ts) until the server feeds real ones (R5).
export const WEATHERS=['clear','cloudy','storm','heat'] as const;
export type Weather=typeof WEATHERS[number];
// plain words first (feedback 2026-11-25: '과열 땡볕' and '너무 뜨거워' meant nothing at a glance); the sky word stays
// as the reason the garden looks the way it does
export const WEATHER_LABEL:Record<Weather,string>={clear:'조금 오름',cloudy:'거의 그대로',storm:'크게 내림',heat:'크게 오름'};
export const WEATHER_SKY:Record<Weather,string>={clear:'맑음',cloudy:'흐림',storm:'비바람',heat:'쨍한 햇볕'};
// one dry line under the label (redesign 2장 tone: facts, short)
export const WEATHER_NOTE:Record<Weather,string>={
  clear:'코스닥이 1.5% 안쪽으로 올랐어. 그래서 하늘이 맑아.',
  cloudy:'코스닥 움직임이 작은 날이야. 그래서 하늘이 흐려.',
  storm:'코스닥이 1.5% 넘게 빠졌거나 크게 흔들렸어. 그래서 비바람.',
  heat:'코스닥이 하루에 1.5% 넘게 올랐어. 그래서 햇볕이 쨍해.',
};
// '거의 그대로' also holds small drops (down to -1.5%): name a drop as one
export const marketLabel=(w:Weather,index:number)=>w==='cloudy'&&index<=-0.2?'조금 내림':WEATHER_LABEL[w];
// which close the number is: 오늘/어제 장 마감, else the date (a Monday shows Friday's close as 11/21 (금))
const DOW='일월화수목금토';
export function closeWord(asOf:string,today:string){
  if(asOf===today)return '오늘 장 마감';
  const gap=Math.round((Date.parse(today)-Date.parse(asOf))/86400000);
  if(gap===1)return '어제 장 마감';
  const d=new Date(asOf+'T00:00:00Z');return `${d.getUTCMonth()+1}/${d.getUTCDate()} (${DOW[d.getUTCDay()]}) 장 마감`;
}
// today's close lands after the evening refresh (investment-evidence-system daily-refresh, 19:30 KST on weekdays)
export const waitsForToday=(asOf:string,today:string)=>{const d=new Date(today+'T00:00:00Z').getUTCDay();return asOf<today&&d>=1&&d<=5};
// index: the day's index change in %, swing: the intraday range in % (how jumpy it was)
// asOf: the real index bar's date (absent on a mock day)
export type Market={day:string;index:number;swing:number;asOf?:string};
export const WEATHER_RULES={stormDrop:-1.5,stormSwing:3,heatRise:1.5,cloudyBelow:0.2};
export function weatherOf(m:Pick<Market,'index'|'swing'>):Weather{
  const r=WEATHER_RULES;
  if(m.index<=r.stormDrop||(m.swing>=r.stormSwing&&m.index<0))return 'storm';
  if(m.index>=r.heatRise)return 'heat';
  if(m.index<r.cloudyBelow)return 'cloudy';
  return 'clear';
}
export const isWeather=(v:unknown):v is Weather=>typeof v==='string'&&(WEATHERS as readonly string[]).includes(v);
