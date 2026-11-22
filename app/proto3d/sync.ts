// The garden kept on the server for a signed-in player (Supabase garden_saves, db/migrations/002_saves_and_delete.sql).
// On sign-in: pull the server's copy and let core/sync.ts pick; after that, every change goes up after a quiet moment.
// Device-only accounts, guests and the ?demo garden never sync.
import {supabase,supabaseReady} from './supabase';
import type {Kept} from '../core/sync';
import {journalRows} from '../core/jigi/llm';
import type {Journal} from '../core/jigi/journal';

export const SAVED_AT_KEY='rethink-garden-at';
export const localAt=()=>{try{return localStorage.getItem(SAVED_AT_KEY)}catch{return null}};
// read before the garden first writes itself, so opening the app never counts as a change
export const openedAt=localAt();
export const markLocal=(at=new Date().toISOString())=>{try{localStorage.setItem(SAVED_AT_KEY,at)}catch{/* this visit only */}};

export type SaveRepo={pull():Promise<Kept|'error'>;push(body:unknown):Promise<string|null>;deleteMe():Promise<string|null>;
  // 지기 rows (db/migrations/003_jigi.sql): each journal and hypothesis as its own row; quietly skipped if the tables are not there yet
  pushJigi(js:Journal[]):Promise<void>};
export const supabaseSaves:SaveRepo={
  async pull(){const {data,error}=await supabase().from('garden_saves').select('body,updated_at').maybeSingle();
    if(error)return 'error';return data?{body:data.body,at:data.updated_at as string}:null},
  async push(body){const at=new Date().toISOString();
    const {error}=await supabase().from('garden_saves').upsert({body,updated_at:at});
    return error?null:at},
  async pushJigi(js){const r=journalRows(js);if(!r.journals.length)return;
    const a=await supabase().from('journals').upsert(r.journals,{onConflict:'player_id,id'});if(a.error)return;
    if(r.hypotheses.length)await supabase().from('hypotheses').upsert(r.hypotheses,{onConflict:'player_id,id'})},
  // the rpc removes every row of mine and the sign-in itself (Play Store: deletion inside the app)
  async deleteMe(){const {error}=await supabase().rpc('delete_me');if(error)return '지금 삭제하지 못했어요. 잠시 뒤에 다시 시도해 주세요';
    await supabase().auth.signOut().catch(()=>{});return null},
};
export const saveRepo:SaveRepo|null=supabaseReady?supabaseSaves:null;
