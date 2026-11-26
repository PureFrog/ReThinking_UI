// 실제 유저끼리 (db/migrations/017_social.sql, 2026-11-26 "리그 들어가면 사람들 못 만남"): the league table, the
// planets in the sky, cheers and 방명록 between real players. During the private test every player who entered an
// invite code is one league group. Signed out, no invite, or no server → null, and the caller keeps its examples.
// What leaves the device: my week's points, my planet as core/planets.ts wireOf (never amounts), a cheer, a note.
import {supabase,supabaseReady,hasInvite} from './supabase';
import {wireOf,planetOfRow,type Planet} from '../core/planets';
import {ranked,type Row} from '../core/league';

let gate:Promise<boolean>|null=null,gateAt=0;
// signed in with an invite code (asked again after a minute, so signing in later takes effect)
export function socialOn():Promise<boolean>{
  if(!supabaseReady)return Promise.resolve(false);
  if(!gate||Date.now()-gateAt>60e3){gateAt=Date.now();gate=(async()=>{try{const {data}=await supabase().auth.getSession();if(!data.session)return false;return (await hasInvite())===true}catch{return false}})()}
  return gate;
}

// the week's table with every invited player; my own points are written first so the table has my latest
export async function liveLeague(week:string,me:{name:string;points:number}){
  if(!await socialOn())return null;
  try{
    await supabase().from('league_scores').upsert({week,points:Math.round(me.points),updated_at:new Date().toISOString()},{onConflict:'player_id,week'});
    const {data,error}=await supabase().rpc('league_table',{w:week});
    if(error||!Array.isArray(data)||!data.length)return null;
    const rows:Row[]=(data as {player:string;handle:string;points:number;me:boolean}[]).map(r=>({id:r.player,name:r.me?me.name:r.handle,points:r.me?me.points:r.points,...(r.me?{me:true}:{})}));
    return ranked(rows);
  }catch{return null}
}

// the others' shared planets; a planet's name is its owner's nickname (the same one the league shows)
export async function livePlanets():Promise<Planet[]|null>{
  if(!await socialOn())return null;
  try{const {data,error}=await supabase().rpc('social_planets');if(error||!Array.isArray(data))return null;
    return (data as Parameters<typeof planetOfRow>[0][]).map(planetOfRow)}catch{return null}
}
export async function publishPlanet(me:Planet|null){
  if(!await socialOn())return;
  try{await supabase().from('planets').upsert({body:me?wireOf(me):null,updated_at:new Date().toISOString()},{onConflict:'player_id'})}catch{/* next change sends it again */}
}

// cheers: one per neighbour per week (planet_cheers' primary key); a second press is simply already done
export async function myCheers(week:string):Promise<{received:number;given:string[]}|null>{
  if(!await socialOn())return null;
  try{const {data,error}=await supabase().rpc('my_cheers',{w:week});const r=(data as {received:number;given:string[]}[]|null)?.[0];
    return error||!r?null:{received:r.received,given:r.given??[]}}catch{return null}
}
export async function cheer(to:string,week:string):Promise<boolean>{
  if(!await socialOn())return false;
  try{const {error}=await supabase().from('planet_cheers').insert({to_player:to,week});return !error||error.code==='23505'}catch{return false}
}

// 방명록: short notes on a planet (80 characters), newest first
export type Note={id:number;handle:string;body:string;at:string;mine:boolean};
export const NOTE_MAX=80;
export const cleanNote=(s:string)=>s.replace(/\s+/g,' ').trim().slice(0,NOTE_MAX);
export async function notesOf(owner:string):Promise<Note[]|null>{
  if(!await socialOn())return null;
  try{const {data,error}=await supabase().rpc('planet_notes_of',{owner});if(error||!Array.isArray(data))return null;
    return (data as {id:number;handle:string;body:string;created_at:string;mine:boolean}[]).map(n=>({id:n.id,handle:n.handle,body:n.body,at:n.created_at,mine:n.mine}))}catch{return null}
}
export async function addNote(to:string,body:string):Promise<boolean>{
  const b=cleanNote(body);if(!b||!await socialOn())return false;
  try{const {error}=await supabase().from('planet_notes').insert({to_player:to,body:b});return !error}catch{return false}
}
export async function deleteNote(id:number):Promise<boolean>{
  if(!await socialOn())return false;
  try{const {error}=await supabase().from('planet_notes').delete().eq('id',id);return !error}catch{return false}
}
// my own id, to read the notes left on my planet
export async function myId():Promise<string|null>{
  if(!supabaseReady)return null;try{const {data}=await supabase().auth.getSession();return data.session?.user.id??null}catch{return null}
}

// 접속 신호 (db/migrations/018_presence.sql): every minute while the app is open and in front, "I'm here"; a hidden
// tab sends nothing, so it turns 오프라인 two minutes later. Returns a stop function.
export const PRESENCE_MS=60e3;
export function startPresence():()=>void{
  if(!supabaseReady||typeof document==='undefined')return ()=>{};
  let stop=false;
  const beat=async()=>{if(stop||document.visibilityState!=='visible'||!await socialOn())return;
    try{await supabase().from('player_presence').upsert({seen_at:new Date().toISOString()},{onConflict:'player_id'})}catch{/* next beat */}};
  void beat();const t=setInterval(()=>void beat(),PRESENCE_MS);
  const vis=()=>{if(document.visibilityState==='visible')void beat()};document.addEventListener('visibilitychange',vis);
  return ()=>{stop=true;clearInterval(t);document.removeEventListener('visibilitychange',vis)};
}
