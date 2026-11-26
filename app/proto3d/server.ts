// R5 the server seam. Everything that needs other players or real data goes through these interfaces, so swapping the
// local mock for the real backend (schema in db/schema.sql, plan in docs/server.md) is one file.
// Nothing here holds keys; a real adapter reads its endpoint from the environment at build time.
import {ranked,tierOf,weekOf,LEAGUE,type Row} from '../core/league';
import {liveLeague,livePlanets,publishPlanet} from './social';

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
// the real table (app/proto3d/social.ts, every invited player) when signed in with an invite code, else the examples
export const leagueRepo:LeagueRepo={
  async week(day,me){return (await liveLeague(weekOf(day),me))??localLeague.week(day,me)},
  async push(){},
};
// the table and whether it is the examples (the sheet says so)
export async function leagueWeek(day:string,me:{name:string;points:number}){
  const live=await liveLeague(weekOf(day),me);return live?{rows:live,sample:false}:{rows:await localLeague.week(day,me),sample:true};
}
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

// 다른 정원들 (docs/planets.md): the neighbours' planets for my league group, and where my own planet summary goes.
// Only core/planets.ts wireOf(...) ever leaves the device. Local: example neighbours, always labelled.
import {examplePlanets,demoNeighbours,wireOf,type Planet} from '../core/planets';
export type PlanetRepo={neighbours(week:string):Promise<{planets:Planet[];sample:boolean}>;publish(me:Planet|null):Promise<void>};
export const localPlanets:PlanetRepo={async neighbours(week){return {planets:examplePlanets(week),sample:true}},async publish(){}};
export function supabasePlanets(url:string,anonKey:string,token:()=>string|null):PlanetRepo{
  const h=()=>({apikey:anonKey,authorization:`Bearer ${token()??anonKey}`,'content-type':'application/json'});
  return {
    async neighbours(week){const r=await fetch(`${url}/rest/v1/planet_neighbours?week=eq.${week}`,{headers:h()}).catch(()=>null);
      if(!r?.ok)return {planets:examplePlanets(week),sample:true};
      const rows=(await r.json()) as {player:string;body:ReturnType<typeof wireOf>}[];return {planets:rows.map(x=>({id:x.player,...x.body})),sample:false}},
    async publish(me){await fetch(`${url}/rest/v1/planets`,{method:'POST',headers:{...h(),prefer:'resolution=merge-duplicates'},body:JSON.stringify(me?{body:wireOf(me)}:{body:null})}).catch(()=>{})},
  };
}
// the real neighbours (every invited player who shares a planet) when signed in with an invite code, else the examples
export const planetRepo:PlanetRepo={
  async neighbours(week){
    // ?skydemo: example players in the real-player look (online/offline, a closed planet), no server needed
    if(typeof location!=='undefined'&&new URLSearchParams(location.search).has('skydemo'))return {planets:demoNeighbours(Date.now()),sample:false};
    const p=await livePlanets();return p?{planets:p,sample:false}:localPlanets.neighbours(week)},
  async publish(me){await publishPlanet(me)},
};

// Accounts (core/auth.ts): sign up, log in, who is signed in. Local: one account kept on this device only, and never
// its password (the local check only matches the e-mail; the real check is the server's). Kakao and Google need the
// server. Supabase Auth replaces this with email + Kakao + Google when the project keys are set (docs/server.md).
import {checkSignUp,checkLogIn,type Account,type SignUp} from '../core/auth';
export type AuthResult={ok:true;account:Account}|{ok:false;error:string};
export type AuthRepo={
  current():Account|null;
  signUp(f:SignUp):Promise<AuthResult>;
  logIn(email:string,password:string):Promise<AuthResult>;
  social(provider:'kakao'|'google'):Promise<AuthResult>;
  // a Kakao or Google sign-in never saw the sign-up form: its nickname and consents are asked once, then saved
  saveConsents(nickname:string,consents:import('../core/auth').ConsentId[]):Promise<AuthResult>;
  // who is signed in changes outside our calls too (coming back from Kakao or Google, a token running out)
  onChange(f:(a:Account|null)=>void):()=>void;
  // a saved sign-in may still be loading (the server's session is read after the first paint): hold the landing until
  // onChange has said who it is, so a signed-in player does not see it flash
  maybeSignedIn():boolean;
  logOut():Promise<void>;
  local:boolean;
};
const ACCOUNT_KEY='rethink-account-v1';
const read=():Account|null=>{try{const v=localStorage.getItem(ACCOUNT_KEY);return v?JSON.parse(v) as Account:null}catch{return null}};
export const localAuth:AuthRepo={
  local:true,
  current:read,
  async signUp(f){const e=checkSignUp(f);const first=Object.values(e)[0];if(first)return {ok:false,error:first};
    const account:Account={email:f.email.trim().toLowerCase(),nickname:f.nickname.trim(),createdAt:new Date().toISOString(),consents:f.consents,provider:'email'};
    try{localStorage.setItem(ACCOUNT_KEY,JSON.stringify(account))}catch{/* private mode: signed in for this visit only */}
    return {ok:true,account}},
  async logIn(email,password){const e=checkLogIn(email,password);if(e)return {ok:false,error:e};
    const a=read();if(!a||a.email!==email.trim().toLowerCase())return {ok:false,error:'이 기기에 가입한 계정이 아니에요. 서버를 연결하면 어디서든 로그인돼요'};
    return {ok:true,account:a}},
  async social(){return {ok:false,error:'카카오·구글 로그인은 서버를 연결하면 쓸 수 있어요'}},
  async saveConsents(nickname,consents){const a=read();if(!a)return {ok:false,error:'로그인이 필요해요'};
    const next={...a,nickname:nickname.trim()||a.nickname,consents};try{localStorage.setItem(ACCOUNT_KEY,JSON.stringify(next))}catch{/* this visit only */}
    return {ok:true,account:next}},
  onChange(){return()=>{}},
  maybeSignedIn:()=>!!read(),
  async logOut(){try{localStorage.removeItem(ACCOUNT_KEY)}catch{/* nothing kept */}},
};
// Supabase when the project keys are in .env.local (supabase.ts), the device-only one otherwise
import {supabaseReady,supabaseAuth} from './supabase';
// e2e pages use the device-only one (tests/e2e/fixtures.ts sets __localAuth) so they never reach the real project
const testLocal=typeof window!=='undefined'&&!!(window as {__localAuth?:boolean}).__localAuth;
export const authRepo:AuthRepo=supabaseReady&&!testLocal?supabaseAuth:localAuth;
