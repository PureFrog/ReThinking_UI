// 1번 LLM engine — the everyday turn (port of 정균 fds_llm1/engine.py: open_session, start_visit, handle_message,
// spontaneous, _run_turn in daily mode and its helpers). One player has one conversation with 보리.
// Pure: the caller loads the conversation and profile documents, passes the model call in, and saves what comes back
// (the Supabase function db/functions/bori-talk does that; tests pass a scripted model).
// Not ported yet (phase 2): the detection talk after a stop-loss signal (elicitation), the delivery packet, ops log.
import {FieldRegistry,type RegistryData} from './registry';
import {MessageIndex,checkDaily,semanticErrors,repairMessage,type Msg,type Reply,type StateUpdate} from './validate';
import {ProfileUpdater,type Applied} from './profile';
import {buildMessages} from './prompt';

// config.json of the source (conversation part)
export const LLM1={recentMessageLimit:12,bufferInactiveHours:24,moodTtlHours:6,maxMessageChars:2000,spontaneousPerVisit:1,newsPerCall:2,newsMaxAgeDays:30,
  processedClientIdLimit:50,dialogueExamplesPerCall:2,maxFormatRepairs:1,
  clientEmotions:['neutral','curious','concerned','happy','thinking','playful','tired','surprised']};
export const FALLBACK_REPLY={text:'어… 잠깐 말이 꼬였네. 방금 거 다시 한 번 말해줄래?',emotion:'thinking'};

export type Conv={session_id:string;user_id:string;character_id:string;persona_version:string;turn_seq:number;msg_seq:number;
  state:{last_topic:string|null;open_question:string|null;mood:string|null;mood_expires_at:string|null;paused_topics:string[]};
  recent_messages:Msg[];mentioned_news_ids:string[];processed_client_ids:Record<string,TurnResult>;visit:{visit_id:number;spontaneous_count:number};
  last_active_at:string;expires_at:string;strategy_seq?:number};
export type ProfileDoc={user_id:string;revision:number;updated_at:string|null;json:Record<string,unknown>};
export type Persona={character_id:string;persona_version:string;json:{system_state:{allowed_emotions:string[]}}&Record<string,unknown>};
export type Holding={company_id:string;name:string|null;industry?:string|null;status?:string|null;as_of?:string|null};
export type News={news_id:string;company_id:string;published_at:string;importance?:string;event_key?:string;verified?:boolean}&Record<string,unknown>;
export type Example={topic:string;dialogue:unknown;update_candidate:unknown;caution:unknown;keywords:string[]};
export type TurnResult={session_id:string;mode:'daily';reply:({message_id:string}&Reply)|null;profile_applied:Applied[];profile_rejected:Applied[];notes:string[]};
export type Model=(messages:{role:'system'|'user'|'assistant';content:string}[])=>Promise<string>;
export type World={persona:Persona;registry:RegistryData;strategyTemplate:Record<string,unknown>;userTemplate:Record<string,unknown>;
  holdings:Holding[];news:News[];examples:Example[];now:()=>number};

const iso=(ms:number)=>new Date(ms+9*3600e3).toISOString().replace(/\.\d{3}Z$/,'+09:00');
const plus=(ms:number,h:number)=>iso(ms+h*3600e3);
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));

export function openSession(userId:string,persona:Persona,now:number):Conv{
  return {session_id:'s1',user_id:userId,character_id:persona.character_id,persona_version:persona.persona_version,turn_seq:0,msg_seq:0,
    state:{last_topic:null,open_question:null,mood:null,mood_expires_at:null,paused_topics:[]},recent_messages:[],mentioned_news_ids:[],processed_client_ids:{},
    visit:{visit_id:0,spontaneous_count:0},last_active_at:iso(now),expires_at:plus(now,LLM1.bufferInactiveHours)};
}
export function newProfile(userId:string,template:Record<string,unknown>):ProfileDoc{const uj=clone(template);uj.user_id=userId;return {user_id:userId,revision:0,updated_at:null,json:uj}}
export const startVisit=(c:Conv):Conv=>({...c,visit:{visit_id:c.visit.visit_id+1,spontaneous_count:0}});

function newMessage(conv:Conv,role:Msg['role'],text:string,now:number):Msg{
  conv.msg_seq+=1;const truncated=text.length>LLM1.maxMessageChars;
  return {message_id:`${conv.session_id}-m${conv.msg_seq}`,seq:conv.msg_seq,role,text:truncated?text.slice(0,LLM1.maxMessageChars):text,truncated,created_at:iso(now)};
}
const pushRecent=(conv:Conv,m:Msg)=>{conv.recent_messages=[...conv.recent_messages,m].slice(-LLM1.recentMessageLimit)};
const strip=(m:Msg)=>({message_id:m.message_id,role:m.role,text:m.text,created_at:m.created_at,...(m.truncated?{truncated:true}:{})});
function expireBuffer(conv:Conv,now:number,notes:string[]){
  const last=Date.parse(conv.last_active_at);
  if(!isNaN(last)&&now-last>LLM1.bufferInactiveHours*3600e3){conv.recent_messages=[];Object.assign(conv.state,{last_topic:null,open_question:null,mood:null,mood_expires_at:null});
    notes.push('대화 버퍼 비활성 만료 — 최근 메시지·임시 상태 초기화 (프로필은 유지)')}
  const me=Date.parse(conv.state.mood_expires_at??'');if(!isNaN(me)&&me<now){conv.state.mood=null;conv.state.mood_expires_at=null}
}
function applyStateUpdate(conv:Conv,u:StateUpdate|null,now:number){
  if(!u||typeof u!=='object')return;const st=conv.state;
  for(const k of ['last_topic','open_question'] as const)if(k in u&&(u[k]==null||typeof u[k]==='string'))st[k]=typeof u[k]==='string'?(u[k] as string).slice(0,200):null;
  if('mood' in u&&(u.mood==null||typeof u.mood==='string')){st.mood=u.mood?u.mood.slice(0,50):null;st.mood_expires_at=u.mood?plus(now,LLM1.moodTtlHours):null}
  if(Array.isArray(u.paused_topics))st.paused_topics=u.paused_topics.filter(x=>typeof x==='string').slice(0,10);
}
// a holding the player's message names (평상시: company context only when a held company is named)
function companyContext(text:string|null,holdings:Holding[]){
  if(!text)return null;for(const h of holdings){const name=(h.name??'').replace('(가상)','').trim();if((name&&text.includes(name))||text.includes(h.company_id))return {...h,context_version:null}}return null;
}
function newsContext(conv:Conv,spontaneous:boolean,company:Holding|null,w:World):News[]{
  if(!(spontaneous||company))return [];
  let ids=new Set(w.holdings.map(h=>h.company_id));if(company)ids=new Set([...ids].filter(i=>i===company.company_id));
  const now=w.now(),rank:Record<string,number>={high:0,medium:1,low:2},seen=new Set<string|undefined>(),out:News[]=[];
  for(const n of w.news){if(!ids.has(n.company_id)||conv.mentioned_news_ids.includes(n.news_id))continue;
    const pub=Date.parse(n.published_at);if(!isNaN(pub)&&now-pub>LLM1.newsMaxAgeDays*864e5)continue;
    if(seen.has(n.event_key))continue;seen.add(n.event_key);out.push(n)}
  out.sort((a,b)=>(rank[a.importance??'']??3)-(rank[b.importance??'']??3)||a.published_at.localeCompare(b.published_at));
  return out.slice(0,LLM1.newsPerCall);
}
function dialogueExamples(text:string|null,w:World){
  if(!text)return [];
  return w.examples.map(ex=>({s:ex.keywords.filter(k=>text.includes(k)).length,ex})).filter(x=>x.s).sort((a,b)=>b.s-a.s).slice(0,LLM1.dialogueExamplesPerCall)
    .map(({ex})=>({topic:ex.topic,dialogue:ex.dialogue,update_candidate:ex.update_candidate,caution:ex.caution}));
}

// a player's message (text) or 보리 speaking first (text null, spontaneous)
export async function runTurn(convIn:Conv,profileIn:ProfileDoc,w:World,model:Model,o:{text:string|null;spontaneous?:boolean;clientMessageId?:string|null}):
  Promise<{conv:Conv;profile:ProfileDoc;result:TurnResult;skipped?:boolean}>{
  const conv=clone(convIn),now=w.now(),spontaneous=!!o.spontaneous,notes:string[]=[];
  const empty=(n:string[]):TurnResult=>({session_id:conv.session_id,mode:'daily',reply:null,profile_applied:[],profile_rejected:[],notes:n});
  if(o.clientMessageId&&conv.processed_client_ids[o.clientMessageId]){const r=conv.processed_client_ids[o.clientMessageId];
    return {conv,profile:profileIn,result:{...r,notes:[...r.notes,'중복 client_message_id — 이전 결과 재사용(대사 재생성·재전송 없음)']},skipped:true}}
  if(spontaneous&&conv.visit.spontaneous_count>=LLM1.spontaneousPerVisit)return {conv,profile:profileIn,result:empty([`방문당 자발 발화 한도(${LLM1.spontaneousPerVisit}) 도달 — 호출 안 함`]),skipped:true};
  if(conv.persona_version!==w.persona.persona_version)throw new Error(`세션에 고정된 persona_version(${conv.persona_version})과 저장소 버전(${w.persona.persona_version})이 다름 — 새 세션 필요`);
  expireBuffer(conv,now,notes);
  // (1) 발언을 먼저 버퍼에 저장 — LLM 실패로 원래 발언을 잃지 않도록
  let current:Msg|null=null;
  if(!spontaneous&&o.text!=null){current=newMessage(conv,'user',o.text,now);pushRecent(conv,current)}
  conv.last_active_at=iso(now);
  // (2) 입력 준비
  const uj=profileIn.json,allowed=w.persona.json.system_state.allowed_emotions.filter(e=>LLM1.clientEmotions.includes(e));
  const company=companyContext(current?.text??null,w.holdings),news=newsContext(conv,spontaneous,company,w);
  const view=conv.recent_messages.filter(m=>m.message_id!==current?.message_id);
  const builtAt=iso(now),turnSeq=conv.turn_seq;
  const ci={mode:'daily' as const,character_persona:w.persona.json,user_json:uj,current_message:current?strip(current):null,recent_messages:view.map(strip),
    conversation_state:{last_topic:conv.state.last_topic,open_question:conv.state.open_question,mood:conv.state.mood,paused_topics:conv.state.paused_topics},
    company_context:company,holdings_context:w.holdings,news_context:news,detection_context:null,elicitation_state:null,
    conversation_policy:{may_speak:true,spontaneous_event:spontaneous,max_questions_per_turn:1,paused_topics:conv.state.paused_topics,already_mentioned_news_ids:conv.mentioned_news_ids.slice(-20),consecutive_question_turns:0},
    investor_background:null,dialogue_examples:dialogueExamples(current?.text??null,w),
    server_meta:{user_id:conv.user_id,turn_id:`${conv.session_id}-t${turnSeq+1}`,turn_seq:turnSeq+1,profile_revision:(uj.revision as number)??0,collection_revision:null,now:builtAt,persona_version:w.persona.persona_version,company_context_version:null}};
  const messages:Parameters<Model>[0]=buildMessages(ci,w.registry,allowed);
  // (3) 생성 + 형식 검증 (수정 생성 최대 1회)
  const errors:string[]=[];let out=null as ReturnType<typeof checkDaily>['out'];
  for(let attempt=0;attempt<=LLM1.maxFormatRepairs&&!out;attempt++){
    let raw:string;try{raw=await model(messages)}catch(e){errors.push(`llm_error: ${(e as Error).message}`);break}
    const c=checkDaily(raw||'{}');let errs=c.errors;
    if(c.out){errs=semanticErrors(c.out,spontaneous);if(!errs.length){out=c.out;break}}
    errors.push(...errs);messages.push({role:'assistant',content:raw||'(빈 응답)'},repairMessage(errs));
  }
  const result:TurnResult={session_id:conv.session_id,mode:'daily',reply:null,profile_applied:[],profile_rejected:[],notes};
  if(!out){
    notes.push(`LLM 출력 실패 → 복구 안내만, 변경 없음: ${JSON.stringify(errors).slice(0,400)}`);
    if(!spontaneous){const m=newMessage(conv,'character',FALLBACK_REPLY.text,now);pushRecent(conv,m);result.reply={message_id:m.message_id,...FALLBACK_REPLY,mentioned_news_ids:[]}}
    conv.turn_seq+=1;remember(conv,o.clientMessageId,result);return {conv,profile:profileIn,result};
  }
  // 대사 검증: 표정은 페르소나 허용 ∩ 클라이언트 지원, 뉴스는 입력에 있던 것만
  let reply=out.reply;
  if(reply){if(!allowed.includes(reply.emotion)){notes.push(`허용되지 않은 표정 ${reply.emotion} → neutral`);reply={...reply,emotion:allowed.includes('neutral')?'neutral':allowed[0]}}
    const valid=new Set(news.map(n=>n.news_id));reply={text:reply.text.trim(),emotion:reply.emotion,mentioned_news_ids:reply.mentioned_news_ids.filter(n=>valid.has(n))}}
  const index=new MessageIndex([...view,current]);
  // (4)(5) 프로필 반영 (대사가 유효하면 프로필 오류와 무관하게 대사는 보냄)
  let seq=conv.strategy_seq??0;
  const reg=new FieldRegistry(w.registry,()=>w.holdings.map(h=>h.company_id));
  const upd=new ProfileUpdater(reg,w.strategyTemplate,()=>`st${String(++seq).padStart(3,'0')}`,()=>iso(w.now()));
  const p=upd.apply(profileIn.json,out.profile_update,index,{inputRevision:(uj.revision as number)??0,inputBuiltAt:builtAt});
  conv.strategy_seq=seq;
  result.profile_applied=p.applied;result.profile_rejected=p.rejected;
  const profile=p.applied.length?{...profileIn,json:p.json,revision:p.json.revision as number,updated_at:p.json.updated_at as string}:profileIn;
  if(reply){const m=newMessage(conv,'character',reply.text,now);pushRecent(conv,m);result.reply={message_id:m.message_id,...reply};
    for(const n of reply.mentioned_news_ids)if(!conv.mentioned_news_ids.includes(n))conv.mentioned_news_ids.push(n)}
  applyStateUpdate(conv,out.conversation_state_update,now);
  if(spontaneous&&reply)conv.visit.spontaneous_count+=1;
  conv.turn_seq+=1;conv.last_active_at=iso(now);conv.expires_at=plus(now,LLM1.bufferInactiveHours);
  remember(conv,o.clientMessageId,result);
  return {conv,profile,result};
}
function remember(conv:Conv,cid:string|null|undefined,r:TurnResult){
  if(!cid)return;conv.processed_client_ids[cid]=r;const ks=Object.keys(conv.processed_client_ids);
  for(const k of ks.slice(0,Math.max(0,ks.length-LLM1.processedClientIdLimit)))delete conv.processed_client_ids[k];
}
