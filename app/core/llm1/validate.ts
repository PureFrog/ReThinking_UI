// 1번 LLM output checks (port of 정균 fds_llm1/validation.py + the daily output contract in schemas.py).
// - shape, types, enums: checkDaily() (pydantic DailyTurnOutput in Python)
// - cross conditions: semanticErrors() (design 8.1)
// - quotes: validateSourceRefs() — an exact substring of a user message that is in this call's input
export type Msg={message_id:string;seq:number;role:'user'|'character';text:string;truncated?:boolean;created_at:string};
export type SourceRef={message_id:string;quote:string};
export type ProfileChange={op:'set'|'remove'|'unblock';path:string;value?:unknown;basis?:string|null;confidence?:string|null;scope?:string|null;evidence_summary?:string|null;source_refs:SourceRef[]};
export type StrategyProposal={proposal_key:string;target_strategy_id?:string|null;name?:string|null;usage_status?:string|null;source_refs:SourceRef[];initial_changes:ProfileChange[]};
export type ProfileUpdate={base_revision?:number|null;changes:ProfileChange[];strategy_proposals:StrategyProposal[]};
export type Reply={text:string;emotion:string;mentioned_news_ids:string[]};
export type StateUpdate={last_topic?:string|null;open_question?:string|null;mood?:string|null;paused_topics?:string[]|null};
export type DailyOut={reply:Reply|null;conversation_state_update:StateUpdate|null;profile_update:ProfileUpdate;elicitation:null};
import type {ElicitationBlock,EvidenceChange} from './elicitation';
export type TurnOut=Omit<DailyOut,'elicitation'>&{elicitation:ElicitationBlock|null};

// 단순 호응: 이것만으로 새 claim/reason을 만들 수 없음 (설계 3.3, 8.2)
const BACKCHANNELS=new Set(['응','어','ㅇㅇ','웅','그래','그렇지','맞아','그럴 수도 있지','그럴수도','글쎄','음','아','오','넵','네','예','ㅋㅋ','ㅎㅎ','그치','그러게','그럴지도']);
export const isBackchannel=(t:string)=>{const s=t.trim().replace(/[.!?~… ]+$/,'').trim();return BACKCHANNELS.has(s)||[...s].length<=1};

export class MessageIndex{
  private byId=new Map<string,Msg>();
  constructor(ms:(Msg|null|undefined)[]){for(const m of ms)if(m?.message_id)this.byId.set(m.message_id,m)}
  get(id:unknown){return typeof id==='string'?this.byId.get(id):undefined}
}
export function validateSourceRefs(refs:unknown,index:MessageIndex,requireNonEmpty=true):string|null{
  if(!Array.isArray(refs)||(requireNonEmpty&&!refs.length))return 'source_refs가 비어 있음';
  for(const r of refs){if(!r||typeof r!=='object')return 'source_refs 항목 형식 오류';
    const {message_id:mid,quote}=r as SourceRef,m=index.get(mid);
    if(!m)return `입력에 없는 message_id: ${mid}`;
    if(m.role!=='user')return `사용자 메시지가 아님(캐릭터 발화는 근거가 될 수 없음): ${mid}`;
    if(m.truncated)return `잘린 메시지는 근거로 사용할 수 없음: ${mid}`;
    if(typeof quote!=='string'||!quote.trim())return `quote가 비어 있음: ${mid}`;
    if(!m.text.includes(quote))return `quote가 원문의 정확한 부분 문자열이 아님: ${mid}`}
  return null;
}

// --- shape checks (what pydantic did): returns errors with a path, like "reply.emotion: ..."
const isStr=(v:unknown)=>typeof v==='string',orNull=(f:(v:unknown)=>boolean)=>(v:unknown)=>v==null||f(v);
const ENUMS={op:['set','remove','unblock'],basis:['explicit','inferred'],confidence:['low','medium','high'],usage:['unknown','example_only','considering','in_use','inactive']};
function keysOnly(o:Record<string,unknown>,allowed:string[],at:string,errs:string[]){for(const k of Object.keys(o))if(!allowed.includes(k))errs.push(`${at}.${k}: 허용되지 않은 키`)}
function checkRefs(v:unknown,at:string,errs:string[]){if(v==null)return [] as SourceRef[];if(!Array.isArray(v)){errs.push(`${at}: 배열이어야 함`);return []}
  v.forEach((r,i)=>{if(!r||typeof r!=='object'||!isStr((r as SourceRef).message_id)||!isStr((r as SourceRef).quote))errs.push(`${at}.${i}: {message_id, quote} 문자열`)});return v as SourceRef[]}
function checkChange(c:unknown,at:string,errs:string[]):ProfileChange|null{
  if(!c||typeof c!=='object'||Array.isArray(c)){errs.push(`${at}: 객체여야 함`);return null}
  const o=c as Record<string,unknown>;keysOnly(o,['op','path','value','basis','confidence','scope','evidence_summary','source_refs'],at,errs);
  if(!ENUMS.op.includes(o.op as string))errs.push(`${at}.op: set|remove|unblock`);
  if(!isStr(o.path))errs.push(`${at}.path: 문자열`);
  if(!orNull(v=>ENUMS.basis.includes(v as string))(o.basis))errs.push(`${at}.basis: explicit|inferred|null`);
  if(!orNull(v=>ENUMS.confidence.includes(v as string))(o.confidence))errs.push(`${at}.confidence: low|medium|high|null`);
  for(const k of ['scope','evidence_summary'])if(!orNull(isStr)(o[k]))errs.push(`${at}.${k}: 문자열|null`);
  if(o.value!=null&&!isStr(o.value)&&(typeof o.value!=='object'||Array.isArray(o.value)))errs.push(`${at}.value: 문자열|객체|null`);
  return {op:o.op as ProfileChange['op'],path:o.path as string,value:o.value??null,basis:(o.basis as string)??null,confidence:(o.confidence as string)??null,
    scope:(o.scope as string)??null,evidence_summary:(o.evidence_summary as string)??null,source_refs:checkRefs(o.source_refs,`${at}.source_refs`,errs)};
}
// mode 'elicitation' (ElicitationTurnOutput): the elicitation block is required and checked too
export function checkTurn(raw:string,mode:'daily'|'elicitation'):{out:TurnOut|null;errors:string[]}{
  let v:unknown;try{v=JSON.parse(raw)}catch(e){return {out:null,errors:[`JSON 파싱 실패: ${(e as Error).message.slice(0,80)}`]}}
  const errs:string[]=[];
  if(!v||typeof v!=='object'||Array.isArray(v))return {out:null,errors:['최상위는 객체여야 함']};
  const o=v as Record<string,unknown>;keysOnly(o,['reply','conversation_state_update','profile_update','elicitation'],'',errs);
  if(!('reply' in o))errs.push('reply: 필드 필요(null 가능)');
  let reply:Reply|null=null;
  if(o.reply!=null){const r=o.reply as Record<string,unknown>;
    if(typeof r!=='object'||Array.isArray(r))errs.push('reply: 객체|null');
    else{keysOnly(r,['text','emotion','mentioned_news_ids'],'reply',errs);if(!isStr(r.text))errs.push('reply.text: 문자열');if(!isStr(r.emotion))errs.push('reply.emotion: 문자열');
      const n=r.mentioned_news_ids==null?[]:r.mentioned_news_ids;if(!Array.isArray(n)||n.some(x=>!isStr(x)))errs.push('reply.mentioned_news_ids: 문자열 배열');
      reply={text:String(r.text??''),emotion:String(r.emotion??''),mentioned_news_ids:Array.isArray(n)?n as string[]:[]}}}
  let state:StateUpdate|null=null;
  if(o.conversation_state_update!=null){const s=o.conversation_state_update as Record<string,unknown>;
    if(typeof s!=='object'||Array.isArray(s))errs.push('conversation_state_update: 객체|null');
    else{keysOnly(s,['last_topic','open_question','mood','paused_topics'],'conversation_state_update',errs);
      for(const k of ['last_topic','open_question','mood'])if(!orNull(isStr)(s[k]))errs.push(`conversation_state_update.${k}: 문자열|null`);
      if(s.paused_topics!=null&&(!Array.isArray(s.paused_topics)||s.paused_topics.some(x=>!isStr(x))))errs.push('conversation_state_update.paused_topics: 문자열 배열|null');
      state=s as StateUpdate}}
  const pu:ProfileUpdate={base_revision:null,changes:[],strategy_proposals:[]};
  if(o.profile_update!=null){const p=o.profile_update as Record<string,unknown>;
    if(typeof p!=='object'||Array.isArray(p))errs.push('profile_update: 객체');
    else{keysOnly(p,['base_revision','changes','strategy_proposals'],'profile_update',errs);
      if(p.base_revision!=null&&!Number.isInteger(p.base_revision))errs.push('profile_update.base_revision: 정수|null');pu.base_revision=(p.base_revision as number)??null;
      if(p.changes!=null&&!Array.isArray(p.changes))errs.push('profile_update.changes: 배열');
      (Array.isArray(p.changes)?p.changes:[]).forEach((c,i)=>{const ch=checkChange(c,`profile_update.changes.${i}`,errs);if(ch)pu.changes.push(ch)});
      if(p.strategy_proposals!=null&&!Array.isArray(p.strategy_proposals))errs.push('profile_update.strategy_proposals: 배열');
      (Array.isArray(p.strategy_proposals)?p.strategy_proposals:[]).forEach((s,i)=>{const at=`profile_update.strategy_proposals.${i}`;
        if(!s||typeof s!=='object'){errs.push(`${at}: 객체`);return}const q=s as Record<string,unknown>;
        keysOnly(q,['proposal_key','target_strategy_id','name','usage_status','source_refs','initial_changes'],at,errs);
        if(!isStr(q.proposal_key))errs.push(`${at}.proposal_key: 문자열`);
        if(!orNull(v=>ENUMS.usage.includes(v as string))(q.usage_status))errs.push(`${at}.usage_status: enum|null`);
        const init:ProfileChange[]=[];(Array.isArray(q.initial_changes)?q.initial_changes:[]).forEach((c,j)=>{const ch=checkChange(c,`${at}.initial_changes.${j}`,errs);if(ch)init.push(ch)});
        pu.strategy_proposals.push({proposal_key:q.proposal_key as string,target_strategy_id:(q.target_strategy_id as string)??null,name:(q.name as string)??null,
          usage_status:(q.usage_status as string)??null,source_refs:checkRefs(q.source_refs,`${at}.source_refs`,errs),initial_changes:init})})}}
  let el:ElicitationBlock|null=null;
  if(mode==='daily'){if(o.elicitation!=null)errs.push('elicitation: daily 모드에서는 null')}
  else el=checkElicitation(o.elicitation,errs);
  return errs.length?{out:null,errors:errs.slice(0,10)}:{out:{reply,conversation_state_update:state,profile_update:pu,elicitation:el},errors:[]};
}
export const checkDaily=(raw:string)=>checkTurn(raw,'daily') as {out:DailyOut|null;errors:string[]};
const EKIND=['claim','reason','horizon','condition','background'],EORIGIN=['user_initiated','topic_prompted','new_reflection'];
function checkElicitation(v:unknown,errs:string[]):ElicitationBlock|null{
  if(!v||typeof v!=='object'||Array.isArray(v)){errs.push('elicitation: 탐지 모드에서는 객체 필요');return null}
  const e=v as Record<string,unknown>;keysOnly(e,['base_revision','decision','finish_reason','decision_note','evidence_changes','unresolved_points','next_question_goal'],'elicitation',errs);
  if(!Number.isInteger(e.base_revision))errs.push('elicitation.base_revision: 정수');
  if(!['continue','finish','pause'].includes(e.decision as string))errs.push('elicitation.decision: continue|finish|pause');
  if(e.finish_reason!=null&&!['sufficient','limited_more','no_basis'].includes(e.finish_reason as string))errs.push('elicitation.finish_reason: sufficient|limited_more|no_basis|null');
  if(!orNull(isStr)(e.decision_note))errs.push('elicitation.decision_note: 문자열');
  if(!orNull(isStr)(e.next_question_goal))errs.push('elicitation.next_question_goal: 문자열|null');
  if(e.unresolved_points!=null&&(!Array.isArray(e.unresolved_points)||e.unresolved_points.some(x=>!isStr(x))))errs.push('elicitation.unresolved_points: 문자열 배열');
  const changes:EvidenceChange[]=[];
  (Array.isArray(e.evidence_changes)?e.evidence_changes:[]).forEach((c,i)=>{const at='elicitation.evidence_changes.'+i;if(!c||typeof c!=='object'){errs.push(at+': 객체');return}
    const q=c as Record<string,unknown>;keysOnly(q,['op','target_id','kind','origin','source_refs','context_message_ids','summary','is_prior_reason'],at,errs);
    if(!['add','replace','retract'].includes(q.op as string))errs.push(at+'.op: add|replace|retract');
    if(!orNull(v=>EKIND.includes(v as string))(q.kind))errs.push(at+'.kind: enum|null');
    if(!orNull(v=>EORIGIN.includes(v as string))(q.origin))errs.push(at+'.origin: enum|null');
    if(q.is_prior_reason!=null&&typeof q.is_prior_reason!=='boolean')errs.push(at+'.is_prior_reason: bool|null');
    if(q.context_message_ids!=null&&(!Array.isArray(q.context_message_ids)||q.context_message_ids.some(x=>!isStr(x))))errs.push(at+'.context_message_ids: 문자열 배열');
    changes.push({op:q.op as EvidenceChange['op'],target_id:(q.target_id as string)??null,kind:(q.kind as string)??null,origin:(q.origin as string)??null,
      source_refs:checkRefs(q.source_refs,at+'.source_refs',errs),context_message_ids:(q.context_message_ids as string[])??[],summary:(q.summary as string)??null,is_prior_reason:(q.is_prior_reason as boolean)??null})});
  return {base_revision:e.base_revision as number,decision:e.decision as ElicitationBlock['decision'],finish_reason:(e.finish_reason as ElicitationBlock['finish_reason'])??null,
    decision_note:(e.decision_note as string)??'',evidence_changes:changes,unresolved_points:(e.unresolved_points as string[])??[],next_question_goal:(e.next_question_goal as string)??null};
}
// 출력 계약 중 스키마로 표현하지 않은 것 (설계 8.1)
export function semanticErrors(out:TurnOut,spontaneous:boolean,mode:'daily'|'elicitation'='daily'):string[]{
  const e:string[]=[];
  if(out.reply==null&&!spontaneous)e.push('사용자 발화에 대한 reply는 null일 수 없음');
  if(out.reply==null&&mode==='elicitation')e.push('탐지 호출 모드에서는 reply가 필요함(수집 시작·재개 시 먼저 말을 건다)');
  if(out.reply!=null&&!out.reply.text.trim())e.push('reply.text가 비어 있음');
  const el=out.elicitation;
  if(mode==='elicitation'&&el){
    if(el.decision==='finish'&&el.finish_reason==null)e.push('finish에는 finish_reason(sufficient/limited_more/no_basis) 필요');
    if(el.decision!=='finish'&&el.finish_reason!=null)e.push('finish가 아니면 finish_reason은 null');
    if((el.decision==='finish'||el.decision==='pause')&&el.next_question_goal!=null)e.push('finish/pause에서 next_question_goal은 null');
    if(el.decision==='finish'&&out.reply&&out.reply.text.includes('?'))e.push('finish 응답은 새 질문을 포함하지 않음')}
  return e;
}
export const repairMessage=(errors:string[])=>({role:'user' as const,content:'직전 출력이 계약을 위반했어. 오류: '+errors.join('; ')+'\n같은 대화 상황에 대해 계약을 지킨 JSON 객체 하나만 다시 출력해.'});
