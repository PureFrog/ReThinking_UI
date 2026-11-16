// 1번 LLM engine (port of 정균 fds_llm1/engine.py). One player has one conversation with 보리 and a small store:
//   conv     recent messages, temporary state, visit count, the active detection talk and the queue of signals
//   profile  the user JSON 보리 learns from the player's own words (design 5)
//   events   stop-loss signals received (detection_events) · sessions: evidence-collection sessions · jobs: delivery jobs
// Pure: the caller loads the store, passes the model call (and the receiver for delivery) in, and saves what comes back
// (db/functions/bori-talk does that; tests pass a scripted model).
// Flow: receiveStopLossSignal → startNextPendingDetection (보리 opens the talk) → runTurn in elicitation mode until
// finish (checked by rules) → a delivery job with the packet → runDeliveryWorker hands it to the analysis receiver,
// and only its "persisted" receipt lets the raw quotes go.
import {FieldRegistry,type RegistryData} from './registry';
import {MessageIndex,checkTurn,semanticErrors,repairMessage,type Msg,type Reply,type StateUpdate,type TurnOut} from './validate';
import {ProfileUpdater,type Applied} from './profile';
import {buildMessages} from './prompt';
import {newSession,stateForPrompt,applyEvidenceChanges,validateFinish,buildPacket,isStopRequest,consecutiveQuestionTurns,
  type Session,type DetectionEvent,type ElicitationBlock,type EvApplied,type Packet} from './elicitation';

// config.json of the source
export const LLM1={recentMessageLimit:12,bufferInactiveHours:24,moodTtlHours:6,maxMessageChars:2000,spontaneousPerVisit:1,newsPerCall:2,newsMaxAgeDays:30,
  processedClientIdLimit:50,dialogueExamplesPerCall:2,maxFormatRepairs:1,
  maxPendingDays:7,maxSessionChars:20000,limitedMoreMinUserTurns:3,
  receiverSupportsNoBasis:true,maxAttempts:5,retryBackoffSeconds:[5,30,120,600,1800],jobMetaRetentionDays:30,
  clientEmotions:['neutral','curious','concerned','happy','thinking','playful','tired','surprised']};
export const FALLBACK_REPLY={text:'어… 잠깐 말이 꼬였네. 방금 거 다시 한 번 말해줄래?',emotion:'thinking'};

export type Conv={session_id:string;user_id:string;character_id:string;persona_version:string;turn_seq:number;msg_seq:number;
  state:{last_topic:string|null;open_question:string|null;mood:string|null;mood_expires_at:string|null;paused_topics:string[]};
  recent_messages:Msg[];mentioned_news_ids:string[];processed_client_ids:Record<string,TurnResult>;visit:{visit_id:number;spontaneous_count:number};
  last_active_at:string;expires_at:string;strategy_seq?:number;
  active_elicitation_id?:string|null;pending_detection_events?:string[];seen_detection_event_ids?:string[];counters?:Record<string,number>};
export type ProfileDoc={user_id:string;revision:number;updated_at:string|null;json:Record<string,unknown>};
export type Persona={character_id:string;persona_version:string;json:{system_state:{allowed_emotions:string[]}}&Record<string,unknown>};
export type Holding={company_id:string;name:string|null;industry?:string|null;status?:string|null;as_of?:string|null};
export type News={news_id:string;company_id:string;published_at:string;importance?:string;event_key?:string;verified?:boolean}&Record<string,unknown>;
export type Example={topic:string;dialogue:unknown;update_candidate:unknown;caution:unknown;keywords:string[]};
export type Job={request_id:string;elicitation_id:string;payload_hash:string;payload:Packet|null;route:'argument_analysis'|'insufficient_input';
  status:'ready'|'queued'|'delivered'|'failed_conflict'|'expired';receipt:unknown;attempts:number;next_retry_at:string;last_error:string|null;created_at:string;updated_at:string};
export type Store={conv:Conv;profile:ProfileDoc;events:DetectionEvent[];sessions:Session[];jobs:Job[]};
export type Mode='daily'|'elicitation';
export type TurnResult={session_id:string;mode:Mode;reply:({message_id:string}&Reply)|null;profile_applied:Applied[];profile_rejected:Applied[];notes:string[];
  evidence_applied?:EvApplied[];evidence_rejected?:EvApplied[];elicitation_status?:string|null;finish_check?:string|null;delivery_request_id?:string|null};
export type Model=(messages:{role:'system'|'user'|'assistant';content:string}[],mode:Mode)=>Promise<string>;
export type World={persona:Persona;registry:RegistryData;strategyTemplate:Record<string,unknown>;userTemplate:Record<string,unknown>;
  holdings:Holding[];news:News[];examples:Example[];now:()=>number};

const iso=(ms:number)=>new Date(ms+9*3600e3).toISOString().replace(/\.\d{3}Z$/,'+09:00');
const plus=(ms:number,h:number)=>iso(ms+h*3600e3);
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const nextId=(conv:Conv,kind:string,prefix:string)=>{const c=(conv.counters??={});c[kind]=(c[kind]??0)+1;return prefix+String(c[kind]).padStart(3,'0')};

export function openSession(userId:string,persona:Persona,now:number):Conv{
  return {session_id:'s1',user_id:userId,character_id:persona.character_id,persona_version:persona.persona_version,turn_seq:0,msg_seq:0,
    state:{last_topic:null,open_question:null,mood:null,mood_expires_at:null,paused_topics:[]},recent_messages:[],mentioned_news_ids:[],processed_client_ids:{},
    visit:{visit_id:0,spontaneous_count:0},last_active_at:iso(now),expires_at:plus(now,LLM1.bufferInactiveHours),
    active_elicitation_id:null,pending_detection_events:[],seen_detection_event_ids:[],counters:{}};
}
export function newProfile(userId:string,template:Record<string,unknown>):ProfileDoc{const uj=clone(template);uj.user_id=userId;return {user_id:userId,revision:0,updated_at:null,json:uj}}
export const newStore=(userId:string,persona:Persona,template:Record<string,unknown>,now:number):Store=>({conv:openSession(userId,persona,now),profile:newProfile(userId,template),events:[],sessions:[],jobs:[]});
export const startVisit=(c:Conv):Conv=>({...c,visit:{visit_id:c.visit.visit_id+1,spontaneous_count:0}});
const activeSession=(s:Store)=>s.conv.active_elicitation_id?s.sessions.find(x=>x.elicitation_id===s.conv.active_elicitation_id)??null:null;

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
const holdingOf=(w:World,id:string|null)=>w.holdings.find(h=>h.company_id===id)??null;
function companyContext(text:string|null,w:World,es:Session|null){
  if(es){const h=holdingOf(w,es.company_id);return h?{...h,context_version:null}:null}
  if(!text)return null;for(const h of w.holdings){const name=(h.name??'').replace('(가상)','').trim();if((name&&text.includes(name))||text.includes(h.company_id))return {...h,context_version:null}}return null;
}
function newsContext(conv:Conv,mode:Mode,spontaneous:boolean,company:Holding|null,w:World):News[]{
  if(mode!=='daily'||!(spontaneous||company))return [];
  let ids=new Set(w.holdings.map(h=>h.company_id));if(company)ids=new Set([...ids].filter(i=>i===company.company_id));
  const now=w.now(),rank:Record<string,number>={high:0,medium:1,low:2},seen=new Set<string|undefined>(),out:News[]=[];
  for(const n of w.news){if(!ids.has(n.company_id)||conv.mentioned_news_ids.includes(n.news_id))continue;
    const pub=Date.parse(n.published_at);if(!isNaN(pub)&&now-pub>LLM1.newsMaxAgeDays*864e5)continue;
    if(seen.has(n.event_key))continue;seen.add(n.event_key);out.push(n)}
  out.sort((a,b)=>(rank[a.importance??'']??3)-(rank[b.importance??'']??3)||a.published_at.localeCompare(b.published_at));
  return out.slice(0,LLM1.newsPerCall);
}
function dialogueExamples(mode:Mode,text:string|null,w:World){
  if(mode!=='daily'||!text)return [];
  return w.examples.map(ex=>({s:ex.keywords.filter(k=>text.includes(k)).length,ex})).filter(x=>x.s).sort((a,b)=>b.s-a.s).slice(0,LLM1.dialogueExamplesPerCall)
    .map(({ex})=>({topic:ex.topic,dialogue:ex.dialogue,update_candidate:ex.update_candidate,caution:ex.caution}));
}
// 탐지 대화에서 질문 방향을 잡을 '평소 투자 방식' 요약: 값이 채워진 항목만 (근거로 쓰지 않고 질문 선택에만)
function investorBackground(uj:Record<string,any>,es:Session|null,w:World){
  const leafs=(o:any,prefix:string):any[]=>{const out:any[]=[];if(!o||typeof o!=='object')return out;
    for(const [k,v] of Object.entries(o)){const path=prefix?`${prefix}.${k}`:k;if(v&&typeof v==='object'&&'value' in (v as object)&&'basis' in (v as object)){const x=v as any;out.push({path,value:x.value,basis:x.basis,confidence:x.confidence,scope:x.scope??null})}
      else if(v&&typeof v==='object')out.push(...leafs(v,path))}return out};
  const ip=uj.investment_philosophy??{},phil=Object.fromEntries(Object.entries(ip).filter(([k])=>k!=='strategies'&&k!=='recurring_reasons'));
  const rr=ip.recurring_reasons,cid=es?.company_id??null;
  const strategies=Object.entries(ip.strategies??{}).filter(([,st]:[string,any])=>['in_use','considering'].includes(st?.usage_status)).map(([sid,st]:[string,any])=>({strategy_id:sid,name:st.name??null,usage_status:st.usage_status,
    rules:leafs(Object.fromEntries(Object.entries(st).filter(([k])=>!['strategy_id','name','usage_status','unresolved_points'].includes(k))),'')}));
  const others=Object.entries(uj.company_views??{}).filter(([o,v]:[string,any])=>o!==cid&&v?.current_thesis).map(([o,v]:[string,any])=>({company_id:o,name:holdingOf(w,o)?.name??null,current_thesis:v.current_thesis.value,basis:v.current_thesis.basis}));
  return {recurring_reasons:rr&&typeof rr==='object'?{value:rr.value,basis:rr.basis,confidence:rr.confidence,scope:rr.scope??null}:null,
    investment_philosophy:leafs(phil,'investment_philosophy'),preferences:leafs(uj.preferences??{},'preferences'),personality_tendencies:leafs(uj.personality_tendencies??{},'personality_tendencies'),
    strategies_in_use:strategies,this_company_previous_view:cid?leafs((uj.company_views??{})[cid]??{},`company_views.${cid}`):[],other_companies_previous_views:others,
    knowledge_notes:leafs(uj.financial_knowledge??{},'financial_knowledge'),conversation_preferences:leafs(uj.conversation_preferences??{},'conversation_preferences')};
}

// ============================================================ user message / 보리 speaking first
export async function runTurn(storeIn:Store,w:World,model:Model,o:{text:string|null;spontaneous?:boolean;clientMessageId?:string|null}):
  Promise<{store:Store;result:TurnResult;skipped?:boolean}>{
  const store=clone(storeIn),conv=store.conv,now=w.now(),spontaneous=!!o.spontaneous,notes:string[]=[];
  const empty=(mode:Mode,n:string[]):TurnResult=>({session_id:conv.session_id,mode,reply:null,profile_applied:[],profile_rejected:[],notes:n});
  if(o.clientMessageId&&conv.processed_client_ids[o.clientMessageId]){const r=conv.processed_client_ids[o.clientMessageId];
    return {store,result:{...r,notes:[...r.notes,'중복 client_message_id — 이전 결과 재사용(대사 재생성·재전송 없음)']},skipped:true}}
  if(conv.persona_version!==w.persona.persona_version)throw new Error(`세션에 고정된 persona_version(${conv.persona_version})과 저장소 버전(${w.persona.persona_version})이 다름 — 새 세션 필요`);
  let es=activeSession(store);
  if(spontaneous){
    if(conv.visit.spontaneous_count>=LLM1.spontaneousPerVisit)return {store,result:empty('daily',[`방문당 자발 발화 한도(${LLM1.spontaneousPerVisit}) 도달 — 호출 안 함`]),skipped:true};
    if(es&&es.status==='collecting')return {store,result:empty('elicitation',['탐지 대화 진행 중 — 자발 발화 끼워 넣지 않음']),skipped:true};
    return turn(store,w,model,'daily',null,null,{spontaneous:true,notes:[`event=visit`]});
  }
  expireBuffer(conv,now,notes);
  // (1) 발언을 먼저 버퍼에 저장 — LLM 실패로 원래 발언을 잃지 않도록
  const msg=newMessage(conv,'user',o.text??'',now);pushRecent(conv,msg);
  let mode:Mode='daily';
  if(es){
    if(es.status==='collecting')mode='elicitation';
    else if(es.status==='ready'){const job=store.jobs.find(j=>j.request_id===es!.request_id);
      if(job&&job.status==='ready'){store.jobs=store.jobs.filter(j=>j!==job);Object.assign(es,{status:'collecting',request_id:null,finish_reason:null});mode='elicitation';
        notes.push('전달 전 추가 발언: ready 스냅샷 폐기 후 collecting 복귀')}
      else notes.push('전달 진행 중 — 이번 발언은 평상시 모드로 처리')}
    else if(es.status==='paused')notes.push('탐지 세션 paused — 명시적 재개 전에는 평상시 모드')}
  if(mode==='elicitation'&&es){es.messages.push(msg);es.user_turns+=1;es.updated_at=iso(now);
    if(es.messages.reduce((n,m)=>n+m.text.length,0)>LLM1.maxSessionChars){notes.push('원문 분량 안전 한도 초과 — 자동 종료 금지, 보류');es.status='paused';mode='daily'}}
  conv.last_active_at=iso(now);
  return turn(store,w,model,mode,msg,mode==='elicitation'?es:null,{spontaneous:false,clientMessageId:o.clientMessageId,notes});
}

async function turn(store:Store,w:World,model:Model,mode:Mode,current:Msg|null,es:Session|null,o:{spontaneous:boolean;clientMessageId?:string|null;notes:string[]}):
  Promise<{store:Store;result:TurnResult}>{
  const conv=store.conv,now=w.now(),notes=o.notes,turnSeq=conv.turn_seq;
  const result:TurnResult={session_id:conv.session_id,mode,reply:null,profile_applied:[],profile_rejected:[],notes};
  // (2) 입력 준비
  const uj=store.profile.json,allowed=w.persona.json.system_state.allowed_emotions.filter(e=>LLM1.clientEmotions.includes(e));
  const company=companyContext(current?.text??null,w,es),news=newsContext(conv,mode,o.spontaneous,company,w);
  // 최근 버퍼 + (탐지 세션이면) 세션 원문. 버퍼에서 밀려난 초기 근거도 유지 (3.7)
  const merged=new Map(conv.recent_messages.map(m=>[m.message_id,m]));if(es)for(const m of es.messages)if(!merged.has(m.message_id))merged.set(m.message_id,m);
  if(current)merged.delete(current.message_id);const view=[...merged.values()].sort((a,b)=>a.seq-b.seq);
  const builtAt=iso(now),streak=es?consecutiveQuestionTurns(es):0;
  const ci={mode,character_persona:w.persona.json,user_json:uj,current_message:current?strip(current):null,recent_messages:view.map(strip),
    conversation_state:{last_topic:conv.state.last_topic,open_question:conv.state.open_question,mood:conv.state.mood,paused_topics:conv.state.paused_topics},
    company_context:company,holdings_context:w.holdings,news_context:news,
    detection_context:es?{event_id:es.detection_event_id,company_id:es.company_id,reason_code:es.detection_reason_code,reason:es.detection_reason}:null,
    elicitation_state:stateForPrompt(es),
    conversation_policy:{may_speak:true,spontaneous_event:o.spontaneous,max_questions_per_turn:1,paused_topics:conv.state.paused_topics,already_mentioned_news_ids:conv.mentioned_news_ids.slice(-20),consecutive_question_turns:streak},
    investor_background:mode==='elicitation'?investorBackground(uj as Record<string,any>,es,w):null,dialogue_examples:dialogueExamples(mode,current?.text??null,w),
    server_meta:{user_id:conv.user_id,turn_id:`${conv.session_id}-t${turnSeq+1}`,turn_seq:turnSeq+1,profile_revision:(uj.revision as number)??0,collection_revision:es?.revision??null,now:builtAt,persona_version:w.persona.persona_version,company_context_version:null}};
  const messages:Parameters<Model>[0]=buildMessages(ci,w.registry,allowed);
  // (3) 생성 + 형식 검증 (수정 생성 최대 1회). 탐지 대화에서 2턴 연속 질문했으면 이번엔 질문 없이 (수정 기회에만)
  const errors:string[]=[];let out:TurnOut|null=null;
  for(let attempt=0;attempt<=LLM1.maxFormatRepairs;attempt++){
    let raw:string;try{raw=await model(messages,mode)}catch(e){errors.push(`llm_error: ${(e as Error).message}`);break}
    const c=checkTurn(raw||'{}',mode);let errs=c.errors;
    if(c.out){errs=semanticErrors(c.out,o.spontaneous,mode);
      if(!errs.length){const style=mode==='elicitation'&&streak>=2&&current&&c.out.reply?.text.includes('?')?[`캐릭터가 이미 ${streak}턴 연속 질문함 — 이번 턴은 질문 없이 반응·생각만 말할 것`]:[];
        if(!style.length||attempt===LLM1.maxFormatRepairs){out=c.out;if(style.length)errors.push(...style.map(s=>`style(수용): ${s}`));break}
        errs=style}}
    errors.push(...errs);messages.push({role:'assistant',content:raw||'(빈 응답)'},repairMessage(errs));
  }
  if(!out){
    notes.push(`LLM 출력 실패 → 복구 안내만, 변경 없음: ${JSON.stringify(errors).slice(0,400)}`);
    if(!o.spontaneous){const m=newMessage(conv,'character',FALLBACK_REPLY.text,now);pushRecent(conv,m);result.reply={message_id:m.message_id,...FALLBACK_REPLY,mentioned_news_ids:[]};
      if(es&&mode==='elicitation')es.messages.push(m)}
    if(es)result.elicitation_status=es.status;
    conv.turn_seq+=1;remember(conv,o.clientMessageId,result);return {store,result};
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
  const p=upd.apply(store.profile.json,out.profile_update,index,{inputRevision:(uj.revision as number)??0,inputBuiltAt:builtAt});
  conv.strategy_seq=seq;result.profile_applied=p.applied;result.profile_rejected=p.rejected;
  if(p.applied.length)store.profile={...store.profile,json:p.json,revision:p.json.revision as number,updated_at:p.json.updated_at as string};
  let charMsg:Msg|null=null;
  if(reply){charMsg=newMessage(conv,'character',reply.text,now);pushRecent(conv,charMsg);result.reply={message_id:charMsg.message_id,...reply}}
  if(mode==='elicitation'&&es&&out.elicitation)applyElicitation(store,es,out.elicitation,index,current,charMsg,result,now);
  applyStateUpdate(conv,out.conversation_state_update,now);
  if(reply)for(const n of reply.mentioned_news_ids)if(!conv.mentioned_news_ids.includes(n))conv.mentioned_news_ids.push(n);
  if(o.spontaneous&&reply&&mode==='daily')conv.visit.spontaneous_count+=1;
  conv.turn_seq+=1;conv.last_active_at=iso(now);conv.expires_at=plus(now,LLM1.bufferInactiveHours);
  remember(conv,o.clientMessageId,result);
  return {store,result};
}

function applyElicitation(store:Store,es:Session,el:ElicitationBlock,index:MessageIndex,current:Msg|null,charMsg:Msg|null,result:TurnResult,now:number){
  if(charMsg)es.messages.push(charMsg);
  if(el.base_revision!==es.revision){result.notes.push('수집 revision 충돌 — 근거 변경·결정 반영 금지');result.elicitation_status=es.status;return}
  const r=applyEvidenceChanges(es,el.evidence_changes,index,()=>nextId(store.conv,'evidence','ev'));
  const s=r.s;result.evidence_applied=r.applied;result.evidence_rejected=r.rejected;
  for(const pt of el.unresolved_points??[])if(typeof pt==='string'&&pt.trim()&&!s.unresolved_points.includes(pt))s.unresolved_points.push(pt);
  if(el.next_question_goal)s.asked_questions.push({goal:el.next_question_goal,message_id:charMsg?.message_id??null});
  let decision=el.decision;const cur=current?.text??null;
  if(decision!=='pause'&&isStopRequest(cur)){result.notes.push('사용자 중단·보류 요청 감지 → 서버가 pause로 처리(몰래 전달 금지)');decision='pause'}
  if(decision==='pause'){s.status='paused';s.pause_reason='user_request'}
  else if(decision==='finish'){
    const [ok,why]=validateFinish(s,el,cur,LLM1.limitedMoreMinUserTurns,r.rejected.length>0);result.finish_check=why;
    if(ok){s.status='ready';s.finish_reason=el.finish_reason;s.decision_note=el.decision_note;const rid=nextId(store.conv,'request','ar');s.request_id=rid;
      const route=el.finish_reason==='no_basis'&&!LLM1.receiverSupportsNoBasis?'insufficient_input':'argument_analysis';
      s.revision+=1;const packet=buildPacket(s,rid);
      store.jobs.push({request_id:rid,elicitation_id:s.elicitation_id,payload_hash:'',payload:packet,route,status:'ready',receipt:null,attempts:0,next_retry_at:iso(now),last_error:null,created_at:iso(now),updated_at:iso(now)});
      result.delivery_request_id=rid}
    else{s.status='collecting';result.notes.push(`finish 거부 → 계속 수집: ${why}`)}}
  else s.status='collecting';
  if(s.status!=='ready'&&(r.applied.length||s.status!==es.status))s.revision+=1;
  s.decision_note=el.decision_note;s.updated_at=iso(now);result.elicitation_status=s.status;
  store.sessions=store.sessions.map(x=>x.elicitation_id===s.elicitation_id?s:x);
}
function remember(conv:Conv,cid:string|null|undefined,r:TurnResult){
  if(!cid)return;conv.processed_client_ids[cid]=r;const ks=Object.keys(conv.processed_client_ids);
  for(const k of ks.slice(0,Math.max(0,ks.length-LLM1.processedClientIdLimit)))delete conv.processed_client_ids[k];
}

// ============================================================ 탐지 모델 → 서버 입구 (손절 신호)
// stocks: company ids (or {company_id, detail}). Held stocks only; one open signal per stock; queued, never cut into a talk
export function receiveStopLossSignal(storeIn:Store,w:World,stocks:(string|{company_id:string;detail?:unknown})[],o:{signalId?:string|null;signaledAt?:string;sourceModel?:string}={}){
  const store=clone(storeIn),accepted:string[]=[],rejected:{stock:string|null;reason:string}[]=[];
  const held=new Set(w.holdings.filter(h=>(h.status??'holding')==='holding').map(h=>h.company_id));
  for(const it of stocks){const cid=typeof it==='string'?it:it?.company_id??null,detail=typeof it==='string'?null:it?.detail??null;
    if(!cid||!holdingOf(w,cid)){rejected.push({stock:cid,reason:'기업 정보 없음 — 대상 종목 불명확, 보류'});continue}
    if(!held.has(cid)){rejected.push({stock:cid,reason:'사용자 보유종목이 아님'});continue}
    if(store.events.some(e=>e.company_id===cid&&(e.status==='pending'||e.status==='in_progress'))){rejected.push({stock:cid,reason:'같은 종목의 처리 중인 신호가 있음 — 중복 제거'});continue}
    const eid=nextId(store.conv,'signal','sl');
    store.events.push({event_id:eid,user_id:store.conv.user_id,company_id:cid,reason_code:'stop_loss_signal',reason:'자사 손절 모델이 이 보유종목에 손절 신호를 줌',
      source_model:o.sourceModel??'fds_stop_loss_model',signal_id:o.signalId??null,detail,detected_at:o.signaledAt??iso(w.now()),status:'pending'});accepted.push(eid)}
  enqueue(store);
  return {store,accepted,rejected};
}
function enqueue(store:Store){const c=store.conv;c.pending_detection_events??=[];c.seen_detection_event_ids??=[];
  for(const ev of [...store.events].filter(e=>e.status==='pending').sort((a,b)=>a.detected_at.localeCompare(b.detected_at)))
    if(!c.pending_detection_events.includes(ev.event_id)&&!c.seen_detection_event_ids.includes(ev.event_id))c.pending_detection_events.push(ev.event_id)}
// the next queued signal opens a talk: 보리 speaks first (never in the middle of another one)
export async function startNextPendingDetection(storeIn:Store,w:World,model:Model):Promise<{store:Store;result:TurnResult}|null>{
  const store=clone(storeIn),c=store.conv;
  if(activeSession(store)||!(c.pending_detection_events??[]).length)return null;
  const eid=c.pending_detection_events!.shift()!,ev=store.events.find(e=>e.event_id===eid);if(!ev)return null;
  const now=w.now(),id=nextId(c,'elicitation','es');
  store.sessions.push(newSession({elicitationId:id,userId:c.user_id,convSessionId:c.session_id,event:ev,now:iso(now),expires:plus(now,LLM1.maxPendingDays*24)}));
  c.active_elicitation_id=id;(c.seen_detection_event_ids??=[]).includes(ev.event_id)||c.seen_detection_event_ids!.push(ev.event_id);ev.status='in_progress';
  return turn(store,w,model,'elicitation',null,store.sessions.at(-1)!,{spontaneous:true,notes:[`탐지 이벤트 ${ev.event_id} → 수집 세션 ${id} 시작`]});
}
// 무응답·접속 종료 → paused (자동 분석 없음) / 사용자가 다시 하자고 하면 collecting으로 재개
export function pauseElicitation(storeIn:Store,reason='no_response'):Store{
  const store=clone(storeIn),es=activeSession(store);if(!es||!['collecting','ready'].includes(es.status))return store;
  if(es.status==='ready'&&es.request_id){const job=store.jobs.find(j=>j.request_id===es.request_id);if(job?.status==='ready'){store.jobs=store.jobs.filter(j=>j!==job);es.request_id=null}}
  es.status='paused';es.pause_reason=reason;return store;
}
export async function resumeElicitation(storeIn:Store,w:World,model:Model){
  const store=clone(storeIn),es=activeSession(store);
  if(!es||es.status!=='paused')return {store,result:{session_id:store.conv.session_id,mode:'daily' as Mode,reply:null,profile_applied:[],profile_rejected:[],notes:['재개할 paused 세션 없음']}};
  es.status='collecting';es.pause_reason=null;
  return turn(store,w,model,'elicitation',null,es,{spontaneous:true,notes:['사용자 재개 의사 확인 → collecting']});
}

// ============================================================ 분석 단계 전달 (design 9.1, 9.3, 10.1, 10.3)
// the receiver answers {request_id, payload_hash, status:'persisted'|'conflict'|...}; only a matching persisted receipt
// lets the sender drop its copy of the quotes; failures retry 5s→30s→2m→10m→30m
export type Receiver=(job:{request_id:string;payload_hash:string;payload:Packet;route:Job['route']})=>Promise<{request_id:string;payload_hash:string;status:string}>;
const canon=(o:unknown):string=>Array.isArray(o)?'['+o.map(canon).join(',')+']':o&&typeof o==='object'?'{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canon((o as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(o);
export async function sha256Json(o:unknown){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canon(o)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function runDeliveryWorker(storeIn:Store,receive:Receiver,now:number):Promise<{store:Store;results:{request_id:string;status:string;error?:string}[]}>{
  const store=clone(storeIn),results:{request_id:string;status:string;error?:string}[]=[];
  for(const job of store.jobs){
    if(job.status!=='ready'&&job.status!=='queued')continue;
    const nra=Date.parse(job.next_retry_at);if(!isNaN(nra)&&nra>now)continue;
    if(!job.payload_hash&&job.payload)job.payload_hash=await sha256Json(job.payload);
    job.status='queued';job.attempts+=1;job.updated_at=iso(now);
    const later=(err:string)=>{const b=LLM1.retryBackoffSeconds,delay=job.attempts>=LLM1.maxAttempts?b[b.length-1]:b[Math.min(job.attempts-1,b.length-1)];
      job.next_retry_at=iso(now+delay*1e3);job.last_error=err;results.push({request_id:job.request_id,status:'retry_scheduled',error:err})};
    let receipt;try{receipt=await receive({request_id:job.request_id,payload_hash:job.payload_hash,payload:job.payload!,route:job.route})}catch(e){later((e as Error).message);continue}
    if(receipt.status==='persisted'&&receipt.request_id===job.request_id&&receipt.payload_hash===job.payload_hash){
      job.status='delivered';job.receipt=receipt;job.payload=null;job.updated_at=iso(now);
      // 인수 확인 후 송신 측 원문 정리, 평상시 복귀, 이벤트 done
      const es=store.sessions.find(s=>s.elicitation_id===job.elicitation_id);
      if(es){Object.assign(es,{status:'delivered',messages:[],unresolved_points:[],asked_questions:[],updated_at:iso(now)});
        es.evidence=es.evidence.map(e=>({evidence_id:e.evidence_id,active:e.active,kind:e.kind}) as never);
        if(store.conv.active_elicitation_id===es.elicitation_id)store.conv.active_elicitation_id=null;
        const ev=store.events.find(e=>e.event_id===es.detection_event_id);if(ev)ev.status='done'}
      results.push({request_id:job.request_id,status:'delivered'});continue}
    if(receipt.status==='conflict'){job.status='failed_conflict';job.last_error='동일 request_id에 다른 payload_hash';results.push({request_id:job.request_id,status:'failed_conflict'});continue}
    later(`영수증 불일치: ${receipt.status}`);
  }
  return {store,results};
}
