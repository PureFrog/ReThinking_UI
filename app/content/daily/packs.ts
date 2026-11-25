// The sample packs the app may hold and play whole on the device (both made up, both public): 단풍식품 for 입문·기초
// (판매량 to check, feedback F2) and 솔빛산업 from 중급 on. Signed in, an official day's pack comes from the server scene by
// scene instead; the level-4·5 samples never ship in the app (content/daily/server-packs.ts).
import {DANPUNG} from './danpung';
import {SOLBIT} from './solbit';
export const SAMPLE_PACKS=[DANPUNG,SOLBIT];
// the sample for a request's level (the local request is 입문 every day)
export const packOfDay=(_day:string,level=1)=>level>=3?SOLBIT:DANPUNG;
export const packById=(id:string)=>SAMPLE_PACKS.find(p=>p.id===id)??null;
