// 1번 LLM field registry (port of 정균 fds_llm1/registry.py): profile path → value type, and value checks
// (design 5.3, 5.5). Data: app/content/llm1/field_registry.json (copied as is).
export type ValueType='text'|'quantity'|'age';
export type Resolved={path:string;valueType:ValueType;kind:'static'|'concept'|'company_view'|'strategy';companyId?:string;strategyId?:string|null;relPath?:string};
export class PathError extends Error{}
export type RegistryData={text_max_chars?:number;profile_paths:Record<string,ValueType>;concept_path_prefix:string;concept_value_type:ValueType;concept_ids:string[];
  company_view_prefix:string;company_view_fields:Record<string,ValueType>;company_view_meta_fields:string[];strategy_prefix:string;strategy_paths:Record<string,ValueType>;
  strategy_usage_status:string[];quantity_units:Record<string,string>;basis_values:string[];confidence_values:string[];confidence_rank:Record<string,number>;
  generalization_rules?:Record<string,{inferred_min_company_views?:number}>};
const DATE=/^\d{4}-\d{2}-\d{2}/;
type Json=Record<string,unknown>;

export class FieldRegistry{
  readonly textMax:number;
  constructor(readonly data:RegistryData,private companyIds:()=>Iterable<string>){this.textMax=Number(data.text_max_chars??300)}
  resolve(path:unknown,userJson:Json):Resolved{
    const d=this.data;
    if(typeof path!=='string'||!path)throw new PathError('path가 비어 있음');
    if(path in d.profile_paths)return {path,valueType:d.profile_paths[path],kind:'static'};
    const cp=d.concept_path_prefix+'.';
    if(path.startsWith(cp)){const cid=path.slice(cp.length);if(!d.concept_ids.includes(cid))throw new PathError(`등록되지 않은 개념 ID: ${cid}`);return {path,valueType:d.concept_value_type,kind:'concept'}}
    const vp=d.company_view_prefix+'.';
    if(path.startsWith(vp)){const rest=path.slice(vp.length);if(!rest.includes('.'))throw new PathError('company_views는 말단 필드만 수정 가능');
      const i=rest.indexOf('.'),companyId=rest.slice(0,i),field=rest.slice(i+1);
      if(![...this.companyIds()].includes(companyId))throw new PathError(`등록되지 않은 기업 ID: ${companyId}`);
      if(d.company_view_meta_fields.includes(field))throw new PathError(`서버 메타데이터 필드는 LLM이 변경할 수 없음: ${field}`);
      if(!(field in d.company_view_fields))throw new PathError(`허용되지 않은 company_views 필드: ${field}`);
      return {path,valueType:d.company_view_fields[field],kind:'company_view',companyId}}
    const sp=d.strategy_prefix+'.';
    if(path.startsWith(sp)){const rest=path.slice(sp.length);if(!rest.includes('.'))throw new PathError('strategies는 말단 필드만 수정 가능');
      const i=rest.indexOf('.'),sid=rest.slice(0,i),rel=rest.slice(i+1);
      const strategies=((userJson.investment_philosophy as Json|undefined)?.strategies as Json|undefined)??{};
      if(!(sid in strategies))throw new PathError(`사용자 범위에 없는 strategy_id: ${sid}`);
      return this.resolveStrategyRel(rel,sid)}
    throw new PathError(`레지스트리에 없는 경로: ${path}`);
  }
  resolveStrategyRel(rel:unknown,sid:string|null):Resolved{
    const sp=this.data.strategy_paths;
    if(typeof rel!=='string'||!(rel in sp))throw new PathError(`허용되지 않은 전략 상대경로(말단만 가능): ${rel}`);
    return {path:sid?`${this.data.strategy_prefix}.${sid}.${rel}`:rel,valueType:sp[rel],kind:'strategy',strategyId:sid,relPath:rel};
  }
  // an error message, or null when the value fits the type
  validateValue(t:ValueType,v:unknown):string|null{
    if(t==='text'){if(typeof v!=='string'||!v.trim())return 'text 경로에는 비어있지 않은 문자열만 허용';if(v.length>this.textMax)return `text 길이 ${v.length} > ${this.textMax}`;return null}
    if(t==='age'){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['years','age_band','as_of'].includes(k)))return 'age는 {years, age_band, as_of} 객체';
      const a=v as {years?:unknown;as_of?:unknown};
      if(a.years!=null&&(!Number.isInteger(a.years)||(a.years as number)<=0||(a.years as number)>=120))return 'age.years는 정수 또는 null';
      if(a.years!=null&&!a.as_of)return 'age.years가 있으면 as_of(기준일) 필수 — 자동 증가 금지';
      if(a.as_of&&!DATE.test(String(a.as_of)))return 'age.as_of는 YYYY-MM-DD';return null}
    if(t==='quantity'){if(!v||typeof v!=='object'||Array.isArray(v))return 'quantity는 {amount, unit, reference, condition} 객체';
      const extra=Object.keys(v).filter(k=>!['amount','unit','reference','condition'].includes(k));if(extra.length)return `quantity에 허용되지 않은 키: ${JSON.stringify(extra.sort())}`;
      const q=v as {amount?:unknown;unit?:unknown;reference?:unknown;condition?:unknown},units=this.data.quantity_units;
      if(typeof q.unit!=='string'||!(q.unit in units))return `등록되지 않은 단위: ${q.unit}`;
      if(q.amount!=null&&typeof q.amount!=='number')return 'amount는 숫자 또는 null';
      if(units[q.unit]==='ratio'&&typeof q.amount==='number'&&Math.abs(q.amount)>1)return '비율은 소수로 기록 (예: 10% → 0.10)';
      if(typeof q.condition!=='string'||!q.condition.trim())return 'quantity.condition(적용 조건)은 필수 문자열';
      if(!('reference' in q))return 'quantity.reference 키 필수(미확정이면 null)';return null}
    return `알 수 없는 자료형: ${t}`;
  }
}
export const getPath=(o:unknown,dotted:string):unknown=>{let cur:unknown=o;for(const k of dotted.split('.')){if(!cur||typeof cur!=='object'||!(k in (cur as Json)))return undefined;cur=(cur as Json)[k]}return cur};
export function setPath(o:Json,dotted:string,v:unknown){const ks=dotted.split('.');let cur=o;for(const k of ks.slice(0,-1)){if(!cur[k]||typeof cur[k]!=='object')cur[k]={};cur=cur[k] as Json}cur[ks[ks.length-1]]=v}
