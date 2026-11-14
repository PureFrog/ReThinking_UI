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

// 관측소 원정 (docs/server.md): the week's ranking for a 판 and where a finished run goes. The client sends what it did
// (decisions, orders, swaps); the server replays it with app/core/game/verify.ts and keeps the score it computes.
import {sampleRanking,type RankRow} from '../core/game/meta';
import type {Submission} from '../core/game/verify';
export type ExpeditionRepo={
  week(pack:string,week:string,me:{score:number;ret:number}):Promise<{rows:RankRow[];sample:boolean}>;
  submit(run:Submission&{handle:string}):Promise<void>;
};
// local: example rows, always labelled as examples; nothing is sent
export const localExpeditions:ExpeditionRepo={
  async week(pack,week,me){return sampleRanking(pack,week,me)},
  async submit(){},
};
// Supabase over plain fetch (no client package): the edge function `expedition-submit` checks and stores a run, the
// view `expedition_week` ranks the week. Not wired: set expeditionRepo to this with the project URL and the public
// anon key when the team picks the server (keys never go in the code; pass them in from the build environment).
export function supabaseExpeditions(url:string,anonKey:string):ExpeditionRepo{
  const h={apikey:anonKey,authorization:`Bearer ${anonKey}`,'content-type':'application/json'};
  return {
    async week(pack,week,me){
      const r=await fetch(`${url}/rest/v1/expedition_week?pack_id=eq.${encodeURIComponent(pack)}&week=eq.${week}&order=total.desc&limit=50`,{headers:h});
      if(!r.ok)return sampleRanking(pack,week,me);
      const rows=(await r.json()) as {handle:string;total:number;ret:number}[];
      return {rows:[...rows.map(x=>({name:x.handle,score:x.total,ret:x.ret})),{name:'나',score:me.score,ret:me.ret,me:true}],sample:false};
    },
    async submit(run){await fetch(`${url}/functions/v1/expedition-submit`,{method:'POST',headers:h,body:JSON.stringify(run)}).catch(()=>{})},
  };
}
export const expeditionRepo:ExpeditionRepo=localExpeditions;
