// R5 the server seam. Everything that needs other players or real data goes through these interfaces, so swapping the
// local mock for the real backend (schema in db/schema.sql, plan in docs/server.md) is one file.
// Nothing here holds keys; a real adapter reads its endpoint from the environment at build time.
import {ranked,tierOf,weekOf,LEAGUE,type Row} from '../core/league';

export type LeagueRepo={
  // my group's table for the week of `day`, with my points in it
  week(day:string,me:{name:string;points:number}):Promise<ReturnType<typeof ranked>>;
  // where my judgments, grades and case answers would be sent (no-op locally)
  push(kind:'judgment'|'grade'|'case',payload:unknown):Promise<void>;
};

// Local mock: eleven steady rivals per week, their points spread around a typical week so the table reads true.
const NAMES=['북쪽창','오후3시','저점관찰','느린복기','현금비중','분기노트','반대매매','추세선','공시러','PER12','적자탈출'];
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
export const localLeague:LeagueRepo={
  async week(day,me){
    const w=weekOf(day);
    const rows:Row[]=NAMES.slice(0,LEAGUE.size-1).map((name,i)=>({id:'p'+i,name,points:hash(w+name)%46-6}));
    rows.push({id:'me',name:me.name,points:me.points,me:true});
    return ranked(rows);
  },
  async push(){},
};
export const leagueRepo:LeagueRepo=localLeague;
export {tierOf};
