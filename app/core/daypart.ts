// ux-spec 4장 the time of day follows real time in Seoul: day, evening, night. The garden switches to that part's
// pictures (when they have come, app/scene/assets.ts DAYPART_ART), friends get sleepy at night, and the header says it.
// '?hour=N' opens the garden as if it were N o'clock (demo and tests).
export type DayPart='day'|'evening'|'night';
// the hour each part starts (Seoul time); night runs on past midnight to day
export const DAYPARTS={day:6,evening:17,night:20};
export const DAYPART_LABEL:Record<DayPart,string>={day:'포근한 낮',evening:'노을 지는 저녁',night:'조용한 밤'};
// how often the garden checks the clock while open (ms)
export const DAYPART_CHECK=60000;
export function seoulHour(d=new Date()){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'numeric',hourCycle:'h23'}).format(d))%24}
export function dayPartAt(hour:number):DayPart{const h=((hour%24)+24)%24;return h>=DAYPARTS.night||h<DAYPARTS.day?'night':h>=DAYPARTS.evening?'evening':'day'}
