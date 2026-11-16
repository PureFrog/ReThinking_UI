// 1번 LLM detection talk — the evidence-collection session (port of 정균 fds_llm1/elicitation.py, design 3.3–3.7,
// 8.2, 9.1–9.3): after a stop-loss signal on a holding, 보리 hears in the player's own words why they hold it.
// Evidence is quotes of the player's messages; finishing is checked by rules; the packet is the active quotes in order.
import {MessageIndex,isBackchannel,validateSourceRefs,type Msg,type SourceRef} from './validate';

export const EVIDENCE_KINDS=['claim','reason','horizon','condition','background'] as const;
export const ORIGINS=['user_initiated','topic_prompted','new_reflection'] as const;
// 사용자가 추가 설명을 시작한 신호 → finish 금지 (설계 3.5)
const CONTINUE=/(그리고\s*하나\s*더|하나\s*더\s*있|또\s*있어|그리고\.{0,3}$|\.\.\.$|…$|잠깐만?)/;
// 더 없다는 신호 (limited_more 근거)
const NO_MORE=/(더\s*는?\s*없|그게\s*다|잘\s*모르겠|몰라|그냥\s*그래|딱히\s*없|이유\s*없)/;
// 분석 중단·보류 요청 (limited_more와 구분, 설계 3.6)
const STOP=/(그만\s*(하자|해)|분석\s*하지\s*마|다음에\s*(하자|얘기)|나중에\s*(하자|얘기)|이\s*얘기\s*그만)/;
export const isStopRequest=(t:string|null|undefined)=>!!t&&STOP.test(t);

export type Evidence={evidence_id:string;active:boolean;kind:string;origin:string;is_prior_reason:boolean|null;summary:string;source_refs:SourceRef[];
  context_message_ids:string[];superseded_by:string|null;retracted_by?:SourceRef[]};
export type Session={elicitation_id:string;user_id:string;conv_session_id:string;detection_event_id:string;company_id:string|null;detection_reason:string|null;
  detection_reason_code:string|null;revision:number;status:'collecting'|'ready'|'paused'|'delivered'|'expired';evidence:Evidence[];messages:Msg[];
  asked_questions:{goal:string;message_id:string|null}[];last_new_evidence_ids:string[];unresolved_points:string[];finish_reason:string|null;decision_note:string|null;
  user_turns:number;request_id:string|null;supersedes_request_id:string|null;pause_reason?:string|null;created_at:string;updated_at:string;expires_at:string};
export type DetectionEvent={event_id:string;user_id:string;company_id:string;reason_code:'stop_loss_signal';reason:string;source_model:string;signal_id:string|null;
  detail:unknown;detected_at:string;status:'pending'|'in_progress'|'done'|'expired'};
export type EvidenceChange={op:'add'|'replace'|'retract';target_id:string|null;kind:string|null;origin:string|null;source_refs:SourceRef[];context_message_ids:string[];summary:string|null;is_prior_reason:boolean|null};
export type ElicitationBlock={base_revision:number;decision:'continue'|'finish'|'pause';finish_reason:'sufficient'|'limited_more'|'no_basis'|null;decision_note:string;
  evidence_changes:EvidenceChange[];unresolved_points:string[];next_question_goal:string|null};

export function newSession(o:{elicitationId:string;userId:string;convSessionId:string;event:DetectionEvent;now:string;expires:string;supersedes?:string|null}):Session{
  return {elicitation_id:o.elicitationId,user_id:o.userId,conv_session_id:o.convSessionId,detection_event_id:o.event.event_id,company_id:o.event.company_id??null,
    detection_reason:o.event.reason??null,detection_reason_code:o.event.reason_code??null,revision:0,status:'collecting',evidence:[],messages:[],asked_questions:[],
    last_new_evidence_ids:[],unresolved_points:[],finish_reason:null,decision_note:null,user_turns:0,request_id:null,supersedes_request_id:o.supersedes??null,
    created_at:o.now,updated_at:o.now,expires_at:o.expires};
}
// LLM 입력용 elicitation_state (원문 인용은 유지: 같은 질문 반복 방지·정정 대상 지정용)
export function stateForPrompt(s:Session|null){
  if(!s)return null;
  return {elicitation_id:s.elicitation_id,base_revision:s.revision,status:s.status,company_id:s.company_id,user_turns_so_far:s.user_turns,
    evidence:s.evidence.map(e=>({evidence_id:e.evidence_id,active:e.active,kind:e.kind,origin:e.origin,is_prior_reason:e.is_prior_reason,summary:e.summary,
      quotes:e.source_refs.map(r=>r.quote),...(e.superseded_by?{superseded_by:e.superseded_by}:{})})),
    asked_question_goals:s.asked_questions.filter(q=>q.goal).map(q=>q.goal),last_turn_new_evidence_ids:s.last_new_evidence_ids??[],unresolved_points:s.unresolved_points};
}
const refsKey=(rs:SourceRef[])=>rs.map(r=>r.message_id+'\u0000'+r.quote).sort().join('\u0001');
export type EvApplied={op?:string;target_id?:string|null;evidence_id?:string;reason?:string};
export function applyEvidenceChanges(session:Session,changes:EvidenceChange[]|null|undefined,index:MessageIndex,issueId:()=>string):{s:Session;applied:EvApplied[];rejected:EvApplied[]}{
  const s:Session=JSON.parse(JSON.stringify(session)),applied:EvApplied[]=[],rejected:EvApplied[]=[],byId=new Map(s.evidence.map(e=>[e.evidence_id,e])),newIds:string[]=[];
  for(const ch of changes??[]){
    if(!ch||typeof ch!=='object'){rejected.push({reason:'변경 항목이 객체가 아님'});continue}
    const tag={op:ch.op,target_id:ch.target_id??null};
    const err=validateSourceRefs(ch.source_refs,index);if(err){rejected.push({...tag,reason:err});continue}
    const ctx=ch.context_message_ids??[];
    if(!Array.isArray(ctx)||ctx.some(c=>!index.get(c))){rejected.push({...tag,reason:'context_message_ids가 입력에 없음'});continue}
    if(ch.op==='retract'){const tgt=byId.get(ch.target_id??'');if(!tgt||!tgt.active){rejected.push({...tag,reason:'철회 대상 근거가 없거나 이미 비활성'});continue}
      tgt.active=false;tgt.retracted_by=ch.source_refs;applied.push(tag);continue}
    if(ch.op!=='add'&&ch.op!=='replace'){rejected.push({...tag,reason:`알 수 없는 op: ${ch.op}`});continue}
    if(ch.op==='add'&&ch.target_id!=null){rejected.push({...tag,reason:'add는 target_id=null'});continue}
    let tgt:Evidence|undefined;
    if(ch.op==='replace'){tgt=byId.get(ch.target_id??'');if(!tgt||!tgt.active){rejected.push({...tag,reason:'정정 대상 근거가 없거나 이미 비활성'});continue}}
    const kind=ch.kind??tgt?.kind??null,origin=ch.origin??tgt?.origin??null,prior=ch.is_prior_reason??null,summary=ch.summary;
    if(!EVIDENCE_KINDS.includes(kind as never)){rejected.push({...tag,reason:`kind 오류: ${kind}`});continue}
    if(!ORIGINS.includes(origin as never)){rejected.push({...tag,reason:`origin 오류: ${origin}`});continue}
    if(![true,false,null].includes(prior)){rejected.push({...tag,reason:'is_prior_reason은 true/false/null'});continue}
    if(origin==='new_reflection'&&prior===true){rejected.push({...tag,reason:'new_reflection을 기존 보유 이유(is_prior_reason=true)로 소급할 수 없음'});continue}
    if(typeof summary!=='string'||!summary.trim()||summary.length>300){rejected.push({...tag,reason:'summary는 300자 이내 문자열'});continue}
    if((kind==='claim'||kind==='reason')&&ch.source_refs.every(r=>isBackchannel(r.quote))){rejected.push({...tag,reason:'단순 호응만으로 주장·이유를 만들 수 없음'});continue}
    const key=refsKey(ch.source_refs);
    if(ch.op==='add'&&s.evidence.some(e=>e.active&&refsKey(e.source_refs)===key)){rejected.push({...tag,reason:'동일 원문 근거 중복 — 추가하지 않음'});continue}
    const eid=issueId();
    const ev:Evidence={evidence_id:eid,active:true,kind:kind!,origin:origin!,is_prior_reason:prior,summary,source_refs:ch.source_refs.map(r=>({message_id:r.message_id,quote:r.quote})),
      context_message_ids:ctx,superseded_by:null};
    s.evidence.push(ev);byId.set(eid,ev);newIds.push(eid);
    if(tgt){tgt.active=false;tgt.superseded_by=eid}
    applied.push({...tag,evidence_id:eid});
  }
  s.last_new_evidence_ids=newIds;
  return {s,applied,rejected};
}
// 설계 9.2 종료 검증
export function validateFinish(s:Session,el:ElicitationBlock,current:string|null,minUserTurns:number,hadRejections:boolean):[boolean,string]{
  const active=s.evidence.filter(e=>e.active);
  if(!s.company_id)return [false,'대상 종목 미확정 — 전달 보류'];
  if(hadRejections)return [false,'이번 턴 근거 변경 중 거부된 항목이 있음 — 정정 반영이 끝나지 않음'];
  if(current&&CONTINUE.test(current.trim()))return [false,'사용자가 추가 설명을 시작함 — 계속 듣기'];
  if(current&&STOP.test(current))return [false,'중단 요청은 finish가 아니라 pause'];
  if(!active.length)return [false,'활성 근거 원문이 없음'];
  if(!(el.decision_note??'').trim())return [false,'decision_note 없음'];
  if(el.finish_reason==='sufficient'){if(!active.some(e=>e.kind==='claim'||e.kind==='reason'))return [false,'sufficient인데 주장/이유 근거가 없음']}
  else if(el.finish_reason==='limited_more'){const texts=s.messages.filter(m=>m.role==='user').slice(-2).map(m=>m.text);
    if(!texts.some(t=>NO_MORE.test(t))&&s.user_turns<minUserTurns)return [false,'limited_more의 구체적 근거(더 없다는 발언·반복)가 부족']}
  else if(el.finish_reason!=='no_basis')return [false,`알 수 없는 finish_reason: ${el.finish_reason}`];
  return [true,'ok'];
}
// 설계 9.3 전달 패킷: 본문 = 활성 근거 원문을 발언 순서대로. 캐릭터 대사·회사 자료·프로필 추정 제외
export type Packet={schema_version:'1.0';request_id:string;detection_event_id:string;company_id:string|null;collection_revision:number;finish_reason:string|null;
  investor_natural_language:string;segments:{message_id:string;quote:string;kind:string;origin:string;is_prior_reason:boolean|null;context_message_ids:string[];created_at:string|null}[];
  context_messages:{message_id:string;speaker:string;text:string}[];unresolved_points:string[];supersedes_request_id:string|null};
export function buildPacket(s:Session,requestId:string):Packet{
  const msgs=new Map(s.messages.map(m=>[m.message_id,m]));
  const items:{seq:number;pos:number;e:Evidence;r:SourceRef;m:Msg}[]=[];
  for(const e of s.evidence){if(!e.active)continue;for(const r of e.source_refs){const m=msgs.get(r.message_id);if(!m)continue;items.push({seq:m.seq??0,pos:m.text.indexOf(r.quote),e,r,m})}}
  items.sort((a,b)=>a.seq-b.seq||a.pos-b.pos);
  const segments:Packet['segments']=[],seen:[string,number,number][]=[],ctx:string[]=[];
  for(const {pos,e,r,m} of items){const start=pos,end=pos+r.quote.length;
    // 같은 메시지에서 이미 포함된 구간은 본문에 중복 넣지 않음
    if(seen.some(([mid,a,b])=>mid===r.message_id&&a<=start&&end<=b))continue;
    seen.push([r.message_id,start,end]);
    segments.push({message_id:r.message_id,quote:r.quote,kind:e.kind,origin:e.origin,is_prior_reason:e.is_prior_reason,context_message_ids:e.context_message_ids,created_at:m.created_at??null});
    for(const c of e.context_message_ids)if(!ctx.includes(c))ctx.push(c)}
  return {schema_version:'1.0',request_id:requestId,detection_event_id:s.detection_event_id,company_id:s.company_id,collection_revision:s.revision,finish_reason:s.finish_reason,
    investor_natural_language:segments.map(x=>x.quote).join(' '),segments,
    context_messages:ctx.filter(c=>msgs.has(c)).map(c=>({message_id:c,speaker:msgs.get(c)!.role,text:msgs.get(c)!.text})),
    unresolved_points:[...s.unresolved_points],supersedes_request_id:s.supersedes_request_id??null};
}
// 기존 S4(툴민 분석) 입력으로 바꾸기 (설계 9.3, 형식은 원본처럼 가정): investor_message + previous_turn, span 역매핑
export function toS4Input(p:Packet){
  const text=p.investor_natural_language,spans:{segment_index:number;message_id:string;start:number;end:number}[]=[];let cursor=0;
  p.segments.forEach((seg,i)=>{const start=text.indexOf(seg.quote,cursor),end=start+seg.quote.length;spans.push({segment_index:i,message_id:seg.message_id,start,end});cursor=end});
  const prev=[...p.context_messages].reverse().find(c=>c.speaker==='character')?.text??null;
  return {request_id:p.request_id,investor_message:text,previous_turn:prev,spans,prior_reason_only_segments:p.segments.flatMap((s,i)=>s.is_prior_reason!==false?[i]:[])};
}
// 탐지 세션 원문 + 최근 버퍼 (버퍼에서 밀려난 초기 근거도 유지, 3.7)
export function consecutiveQuestionTurns(s:Session){let n=0;for(const m of [...s.messages].reverse()){if(m.role!=='character')continue;if(m.text.includes('?'))n++;else break}return n}
