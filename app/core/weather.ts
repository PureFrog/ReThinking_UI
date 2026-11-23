// redesign 4-1: the sky over the garden is today's market. The player cannot change it; it only tells the mood of the
// day before any number is read. Four kinds, picked from the index move and how jumpy the day was.
// Market numbers are mock (app/content/market.ts) until the server feeds real ones (R5).
export const WEATHERS=['clear','cloudy','storm','heat'] as const;
export type Weather=typeof WEATHERS[number];
export const WEATHER_LABEL:Record<Weather,string>={clear:'맑음',cloudy:'흐림',storm:'비바람',heat:'과열 땡볕'};
// one dry line under the label (redesign 2장 tone: facts, short)
export const WEATHER_NOTE:Record<Weather,string>={
  clear:'지수 무난. 오늘은 종목 얘기만 하면 돼.',
  cloudy:'방향 없음. 거래량도 얇아.',
  storm:'지수가 크게 빠졌어. 첫 헤드라인에 반응하지 마.',
  heat:'너무 뜨거워. 추격 매수 버릇 있으면 오늘 조심.',
};
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
