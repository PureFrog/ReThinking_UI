// 1번 LLM profile updates (port of 정균 fds_llm1/profile_store.py, design 5.3–5.6, 6, 8.3, 8.4). The LLM only proposes
// changes; this checks path, type, quote, blocked paths and revision, builds the stored value object and applies it.
// Quotes (source_refs) are not kept in the long-term profile.
import {FieldRegistry,PathError,getPath,setPath,type Resolved} from './registry';
import {validateSourceRefs,type MessageIndex,type ProfileChange,type ProfileUpdate,type StrategyProposal,type SourceRef} from './validate';

type Json=Record<string,unknown>;
const SET_FIELDS=['path','value','basis','confidence','scope','evidence_summary','source_refs'] as const;
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const t=(s:unknown)=>typeof s==='string'&&s?Date.parse(s):NaN;
export type Applied={path?:string|null;op?:string|null;what?:string;proposal_key?:string;reason?:string};

export class ProfileUpdater{
  constructor(private reg:FieldRegistry,private strategyTemplate:Json,private issueId:()=>string,private now:()=>string){}
  apply(userJson:Json,update:ProfileUpdate|null|undefined,index:MessageIndex,o:{inputRevision:number;inputBuiltAt:string}):{json:Json;applied:Applied[];rejected:Applied[]}{
    const next=clone(userJson),applied:Applied[]=[],rejected:Applied[]=[];
    if(!update)return {json:next,applied,rejected};
    const conflict=(next.revision??0)!==o.inputRevision;
    if(update.base_revision!=null&&update.base_revision!==o.inputRevision)rejected.push({what:'profile_update.base_revision',reason:'입력 revision과 불일치 — 서버 값 사용'});
    for(const ch of update.changes??[]){const err=this.change(next,ch,index,conflict,o.inputBuiltAt);(err?rejected:applied).push({path:ch?.path??null,op:ch?.op??null,...(err?{reason:err}:{})})}
    for(const p of update.strategy_proposals??[]){const r=this.proposal(next,p,index,conflict,o.inputBuiltAt);applied.push(...r.applied);rejected.push(...r.rejected)}
    if(applied.length){next.revision=((next.revision as number)??0)+1;next.updated_at=this.now()}
    return {json:next,applied,rejected};
  }
  private change(uj:Json,ch:ProfileChange,index:MessageIndex,conflict:boolean,builtAt:string,strategyId?:string):string|null{
    if(!ch||typeof ch!=='object')return '변경 항목이 객체가 아님';
    let rp:Resolved;
    try{rp=strategyId!=null?this.reg.resolveStrategyRel(ch.path,strategyId):this.reg.resolve(ch.path,uj)}catch(e){if(e instanceof PathError)return e.message;throw e}
    const full=rp.path,err=validateSourceRefs(ch.source_refs,index);if(err)return err;
    const mp=(uj.memory_policy??={}) as Json,blocked=(mp.blocked_profile_paths??=[]) as string[];
    if(ch.op==='unblock'){const i=blocked.indexOf(full);if(i>=0){blocked.splice(i,1);return null}return '차단되지 않은 경로'}
    if(ch.op==='remove'){this.ensure(uj,rp);setPath(uj,full,null);if(!blocked.includes(full))blocked.push(full);return null}
    if(ch.op!=='set')return `알 수 없는 op: ${ch.op}`;
    const missing=SET_FIELDS.filter(k=>(ch as unknown as Json)[k]==null);if(missing.length)return `set에 필요한 필드 누락: ${JSON.stringify(missing)}`;
    if(blocked.some(b=>full===b||full.startsWith(b+'.')))return '사용자가 삭제 요청한 차단 경로 — 자동 재수집 금지';
    if(!this.reg.data.basis_values.includes(ch.basis!))return 'basis는 explicit/inferred';
    if(!this.reg.data.confidence_values.includes(ch.confidence!))return 'confidence는 low/medium/high';
    for(const k of ['scope','evidence_summary'] as const){const v=ch[k];if(typeof v!=='string'||!v.trim()||v.length>this.reg.textMax)return `${k}는 300자 이내 문자열`}
    const verr=this.reg.validateValue(rp.valueType,ch.value);if(verr)return verr;
    const gerr=this.generalization(uj,full,ch.basis!);if(gerr)return gerr;
    const existing=getPath(uj,full) as Json|null|undefined;
    if(conflict&&existing&&typeof existing==='object'){const ex=t(existing.updated_at),built=t(builtAt);if(!isNaN(ex)&&!isNaN(built)&&ex>built)return 'revision 충돌: 입력 이후 같은 필드가 갱신됨 — 최신값으로 재판단 필요'}
    let basis=ch.basis!,conf=ch.confidence!;
    if(existing&&typeof existing==='object')[basis,conf]=this.clamp(existing,basis,conf,ch.source_refs,index);
    this.ensure(uj,rp);
    setPath(uj,full,{value:ch.value,basis,confidence:conf,scope:ch.scope,evidence_summary:ch.evidence_summary,updated_at:this.now()});
    // 수량 규칙에서 기준이 없으면 미해결 사항을 남김 (설계 5.5)
    if(rp.kind==='strategy'&&rp.valueType==='quantity'&&(ch.value as Json).reference==null){
      const st=((uj.investment_philosophy as Json).strategies as Json)[rp.strategyId!] as Json,list=(st.unresolved_points??=[]) as string[];
      const note=`${rp.relPath}: 기준(reference) 미확정 — 원문 조건 '${(ch.value as Json).condition}'`;if(!list.includes(note))list.push(note)}
    return null;
  }
  // 종목 하나의 생각을 일반 성향으로 넓히지 않도록 (설계 5.5·부록 A)
  private generalization(uj:Json,path:string,basis:string):string|null{
    const rule=this.reg.data.generalization_rules?.[path];if(!rule||basis==='explicit')return null;
    const need=Number(rule.inferred_min_company_views??0),have=Object.values((uj.company_views??{}) as Json).filter(v=>v&&typeof v==='object'&&(v as Json).current_thesis).length;
    return have<need?`${path}: 추론으로 기록하려면 생각이 기록된 종목이 ${need}개 이상 필요(현재 ${have}개) — 사용자가 직접 일반화해 말한 경우만 explicit으로 기록`:null;
  }
  // 설계 6-6: 새 사용자 근거가 없으면 basis·confidence를 올리지 않는다 (새 근거 = 기존 값 이후에 쓴 사용자 메시지를 인용)
  private clamp(existing:Json,basis:string,conf:string,refs:SourceRef[],index:MessageIndex):[string,string]{
    const ex=t(existing.updated_at);
    const hasNew=refs.some(r=>{const m=index.get(r.message_id);const mt=t(m?.created_at);return isNaN(ex)||(!isNaN(mt)&&mt>ex)});
    if(hasNew)return [basis,conf];
    const rank=this.reg.data.confidence_rank;
    if(existing.basis==='inferred'&&basis==='explicit')basis='inferred';
    const oc=existing.confidence as string;if(oc in rank&&(rank[conf]??0)>rank[oc])conf=oc;
    return [basis,conf];
  }
  private ensure(uj:Json,rp:Resolved){
    if(rp.kind==='company_view'){const cv=(uj.company_views??={}) as Json;
      if(!cv[rp.companyId!]){const o:Json={};for(const f of Object.keys(this.reg.data.company_view_fields))o[f]=null;for(const f of this.reg.data.company_view_meta_fields)o[f]=null;cv[rp.companyId!]=o}}
    else if(rp.kind==='concept'){const fk=(uj.financial_knowledge??={}) as Json;fk.concepts??={}}
  }
  private proposal(uj:Json,p:StrategyProposal,index:MessageIndex,conflict:boolean,builtAt:string):{applied:Applied[];rejected:Applied[]}{
    const applied:Applied[]=[],rejected:Applied[]=[];
    if(!p||typeof p.proposal_key!=='string')return {applied,rejected:[{what:'strategy_proposal',reason:'proposal_key 필요'}]};
    const key=p.proposal_key,err=validateSourceRefs(p.source_refs,index);if(err)return {applied,rejected:[{what:`strategy_proposal:${key}`,reason:err}]};
    const status=p.usage_status;if(status!=null&&!this.reg.data.strategy_usage_status.includes(status))return {applied,rejected:[{what:`strategy_proposal:${key}`,reason:`usage_status 오류: ${status}`}]};
    const name=p.name;if(name!=null&&(typeof name!=='string'||name.length>100))return {applied,rejected:[{what:`strategy_proposal:${key}`,reason:'name은 100자 이내 문자열 또는 null'}]};
    const ip=(uj.investment_philosophy??={}) as Json,strategies=(ip.strategies??={}) as Record<string,Json>;
    let sid:string;const target=p.target_strategy_id;
    if(target!=null){if(!(target in strategies))return {applied,rejected:[{what:`strategy_proposal:${key}`,reason:`사용자 범위에 없는 strategy_id: ${target}`}]};
      sid=target;if(name!=null)strategies[sid].name=name;if(status!=null)strategies[sid].usage_status=status;applied.push({what:`strategy_meta:${sid}`,op:'update'})}
    else{const norm=(name??'').replace(/ /g,'').toLowerCase();
      const dup=norm?Object.keys(strategies).find(s=>String(strategies[s].name??'').replace(/ /g,'').toLowerCase()===norm):undefined;
      if(dup){sid=dup;rejected.push({what:`strategy_proposal:${key}`,reason:`동일 이름 전략 ${dup}에 병합(신규 생성 안 함)`});if(status!=null)strategies[sid].usage_status=status}
      else{sid=this.issueId();const st=clone(this.strategyTemplate);st.strategy_id=sid;st.name=name??null;st.usage_status=status??'unknown';strategies[sid]=st;applied.push({what:`strategy_created:${sid}`,op:'create',proposal_key:key})}}
    for(const ch of p.initial_changes??[]){const e=this.change(uj,ch,index,conflict,builtAt,sid),item={path:`strategies.${sid}.${ch?.path??'?'}`};
      if(e)rejected.push({...item,reason:e});else applied.push({...item,op:ch.op})}
    return {applied,rejected};
  }
}
// 서비스의 '기억 삭제' API (설계 6-9): LLM을 거치지 않는 직접 삭제
export function forgetPath(uj:Json,reg:FieldRegistry,path:string):Json{
  const next=clone(uj),rp=reg.resolve(path,next);setPath(next,rp.path,null);
  const mp=(next.memory_policy??={}) as Json,blocked=(mp.blocked_profile_paths??=[]) as string[];if(!blocked.includes(rp.path))blocked.push(rp.path);
  next.revision=((next.revision as number)??0)+1;return next;
}
