// Supabase (docs/server.md): the one client, made only when the project's public URL and anon key are set in
// .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Both are public by design; the service key
// and the OpenAI key never come here (they live in the Supabase project, for its server functions).
import {createClient,type SupabaseClient,type User} from '@supabase/supabase-js';
import {CONSENTS,checkLogIn,checkSignUp,type Account,type ConsentId} from '../core/auth';
import type {AuthRepo,AuthResult} from './server';

const URL_=process.env.NEXT_PUBLIC_SUPABASE_URL??'';
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??'';
export const supabaseReady=!!URL_&&!!KEY;
let client:SupabaseClient|null=null;
export function supabase():SupabaseClient{
  if(!supabaseReady)throw new Error('Supabase is not configured');
  client??=createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  return client;
}

const toAccount=(u:User):Account=>{
  const m=(u.user_metadata??{}) as {nickname?:string;name?:string;full_name?:string;consents?:ConsentId[]};
  const provider=(u.app_metadata?.provider??'email') as Account['provider'];
  return {email:u.email??'',nickname:m.nickname??m.name??m.full_name??(u.email??'').split('@')[0],createdAt:u.created_at,consents:m.consents??[],provider};
};
// Supabase's messages, in our words
const say=(m:string)=>/Invalid login credentials/i.test(m)?'이메일이나 비밀번호가 맞지 않아요':/already registered/i.test(m)?'이미 가입한 이메일이에요':
  /Email not confirmed/i.test(m)?'메일함에서 가입 확인 링크를 먼저 눌러 주세요':/rate limit/i.test(m)?'잠시 뒤에 다시 시도해 주세요':'지금 처리하지 못했어요. 잠시 뒤에 다시 시도해 주세요';

let cached:Account|null=null;
// what came back from Kakao or Google when the sign-in did not finish (shown on the first screen, then cleared)
let notice:string|null=null;
export const authNotice=()=>notice;
function readReturn(){try{
  const q=new URLSearchParams(location.search),hsh=new URLSearchParams(location.hash.replace(/^#/,''));
  const err=q.get('error_description')??hsh.get('error_description')??q.get('error')??hsh.get('error');
  if(err)notice='로그인이 끝나지 않았어요: '+err.split('+').join(' ');
  return q.has('code')}catch{return false}}
const listeners=new Set<(a:Account|null)=>void>();
let watching=false;
function watch(){if(watching||!supabaseReady)return;watching=true;
  const sb=supabase();
  const hadCode=readReturn();
  sb.auth.getSession().then(({data,error})=>{cached=data.session?toAccount(data.session.user):null;
    // came back with a code but no session: the code could not be swapped (opened on another address, or expired)
    if(hadCode&&!cached&&!notice)notice='로그인이 끝나지 않았어요. 처음 연 주소(localhost/127.0.0.1)와 돌아온 주소가 같은지 확인해 주세요'+(error?' ('+error.message+')':'');
    if(hadCode||notice){try{history.replaceState(null,'',location.pathname)}catch{/* keep the address */}}
    listeners.forEach(f=>f(cached))});
  sb.auth.onAuthStateChange((_e,session)=>{cached=session?toAccount(session.user):null;listeners.forEach(f=>f(cached))});
}

export const supabaseAuth:AuthRepo={
  local:false,
  current(){watch();return cached},
  onChange(f){watch();listeners.add(f);return()=>{listeners.delete(f)}},
  async signUp(f){const e=checkSignUp(f);const first=Object.values(e)[0];if(first)return {ok:false,error:first};
    const {data,error}=await supabase().auth.signUp({email:f.email.trim(),password:f.password,
      options:{data:{nickname:f.nickname.trim(),consents:f.consents},emailRedirectTo:location.origin}});
    if(error)return {ok:false,error:say(error.message)};
    if(!data.session)return {ok:false,error:'가입 확인 메일을 보냈어요. 메일의 링크를 누르면 바로 시작돼요'};
    return {ok:true,account:toAccount(data.session.user)}},
  async logIn(email,password){const e=checkLogIn(email,password);if(e)return {ok:false,error:e};
    const {data,error}=await supabase().auth.signInWithPassword({email:email.trim(),password});
    return error||!data.user?{ok:false,error:say(error?.message??'')}:{ok:true,account:toAccount(data.user)}},
  async social(provider){const {error}=await supabase().auth.signInWithOAuth({provider,options:{redirectTo:location.origin+'/'}});
    // on success the page leaves for Kakao or Google and comes back signed in
    return error?{ok:false,error:say(error.message)}:{ok:false,error:''}},
  async saveConsents(nickname,consents){
    const {data,error}=await supabase().auth.updateUser({data:{nickname:nickname.trim(),consents}});
    return error||!data.user?{ok:false,error:say(error?.message??'')}:{ok:true,account:toAccount(data.user)}},
  async logOut(){await supabase().auth.signOut()},
};
// the required consents an account still owes (a Kakao or Google sign-in never saw the sign-up form)
export const missingConsents=(a:Account)=>CONSENTS.filter(c=>c.required&&!a.consents.includes(c.id)).map(c=>c.id);
export type {AuthResult};

// free talk with 보리 (db/functions/friend-chat): the answer, or a line that says it could not answer now
import type {FriendCtx,TalkLine} from '../core/friend';
export async function friendTalk(ctx:FriendCtx,history:TalkLine[],message:string):Promise<string>{
  try{const {data,error}=await supabase().functions.invoke('friend-chat',{body:{ctx,history,message}});
    if(error||typeof data?.text!=='string')return '지금은 대답을 못 하겠어. 이따 다시 말 걸어 줘.';
    return data.text}catch{return '지금은 대답을 못 하겠어. 이따 다시 말 걸어 줘.'}}

// 지기 LLM calls (db/functions/jigi-llm): null whenever the server cannot answer, so the caller keeps its rule-based text
import type {Journal as JigiJournal} from '../core/jigi/journal';
import type {Draft} from '../core/jigi/extract';
export type JigiAI={extract(j:JigiJournal):Promise<Draft[]|null>;assist(j:JigiJournal,block:string,title:string):Promise<string[]|null>;explain(topic:string,facts:unknown):Promise<string|null>};
const callJigi=async(body:Record<string,unknown>)=>{try{const {data,error}=await supabase().functions.invoke('jigi-llm',{body});return error||!data||data.fallback?null:data as Record<string,unknown>}catch{return null}};
// the journal sent is only what the call needs (no amounts, no account details)
const slim=(j:JigiJournal)=>({stock:j.stock,f:{hypo:j.f.hypo,reason:j.f.reason,action:j.f.action,checkDate:j.f.checkDate,opt:{counter:j.f.opt.counter??''}}});
export const jigiAI:JigiAI={
  async extract(j){const r=await callJigi({mode:'extract',journal:slim(j)});return Array.isArray(r?.drafts)?r!.drafts as Draft[]:null},
  async assist(j,block,title){const r=await callJigi({mode:'assist',journal:slim(j),block,title});return Array.isArray(r?.questions)?r!.questions as string[]:null},
  async explain(topic,facts){const r=await callJigi({mode:'explain',topic,facts});return typeof r?.text==='string'?r.text:null},
};

// reading a brokerage screenshot (db/functions/portfolio-read): shrunk in the browser first, sent once, not stored
import {CAPTURE,type ReadHolding} from '../core/capture';
async function shrink(file:Blob):Promise<string>{
  const img=await createImageBitmap(file),k=Math.min(1,CAPTURE.maxSide/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);
  for(const q of [.85,.7,.55]){const u=c.toDataURL('image/jpeg',q);if(u.length<CAPTURE.maxBytes*1.3)return u}
  return c.toDataURL('image/jpeg',.45);
}
export async function readCapture(file:Blob):Promise<ReadHolding[]|string>{
  try{const image=await shrink(file);const {data,error}=await supabase().functions.invoke('portfolio-read',{body:{image}});
    if(!error&&Array.isArray(data?.holdings))return data.holdings.length?data.holdings as ReadHolding[]:'종목을 찾지 못했어요. 보유 종목 목록이 보이는 화면으로 다시 올려 주세요';
    const status=(error as {context?:{status?:number}}|null)?.context?.status;
    return status===429?'오늘은 사진 읽기를 많이 했어요. 내일 다시 하거나 직접 입력해 주세요':status===422?'사진에서 종목을 읽지 못했어요. 더 선명한 캡처로 다시 올려 주세요':'지금 사진을 읽지 못했어요. 잠시 뒤에 다시 하거나 직접 입력해 주세요'}
  catch{return '지금 사진을 읽지 못했어요. 잠시 뒤에 다시 하거나 직접 입력해 주세요'}
}

// 보리 through 정균's 1번 LLM (db/functions/bori-talk): the server keeps the conversation and what 보리 learns; the app
// sends the message and the garden's holdings (code + name, the only companies 보리 may write about)
export type BoriHolding={company_id:string;name:string};
let boriSeq=0;
export async function boriTalk(holdings:BoriHolding[],message:string):Promise<string>{
  const fallback='지금은 대답을 못 하겠어. 이따 다시 말 걸어 줘.';
  try{const {data,error}=await supabase().functions.invoke('bori-talk',{body:{action:'message',text:message,holdings,client_message_id:`c${Date.now().toString(36)}${++boriSeq}`}});
    return !error&&typeof data?.reply?.text==='string'?data.reply.text:fallback}catch{return fallback}
}
