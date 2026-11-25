// 투자학습 퀴즈 100문항: eight kinds of question for the daily quiz papers. Since 2026-11-23 the day's quiz is dealt from
// the 입문 set (팀 자료 "투자학습_입문_800선_100문항", content/quiz100-intro.json, Q101~Q200); the first set
// (2026-11-21, content/quiz100.json, Q001~Q100) is kept so the quizzes already done still show in 지난 퀴즈.
// The files are kept as given; this reads them, grades a response and writes a response out as words for the back of the paper.
// Pure: no screen here.
import SET from '../content/quiz100-intro.json';
import FIRST from '../content/quiz100.json';

export type Opt={id:string;text:string};
export type QKind='true_false'|'matching'|'fill_blank'|'direction'|'ordering'|'multiple_select'|'classification'|'scenario';
export type Q100={id:string;type:QKind;topic:string;difficulty:string;prompt:string;explanation:string;
  data:{options?:Opt[];left?:Opt[];right?:Opt[];items?:Opt[];targets?:Opt[];statement?:string;blanks?:{id:string;input_type:'number'|'text';unit?:string}[]};
  answer:unknown};
// what the player gave: one option id, several ids (a set or an order), or a map (left → right, target → option, blank → text)
export type Resp=string|string[]|Record<string,string>;

// "[빈칸]" in a fill-in prompt is shown as a blank line
const shown=(q:Q100):Q100=>q.type==='fill_blank'?{...q,prompt:q.prompt.replace(/\[빈칸\]/g,'＿＿＿')}:q;
/** the day's deck (입문 100문항) */
export const QUIZ100=(SET.questions as unknown as Q100[]).map(shown);
const ALL=new Map([...QUIZ100,...(FIRST.questions as unknown as Q100[]).map(shown)].map(q=>[q.id,q]));
/** any question by id, the earlier set too (for the quizzes already done) */
export const quizById=(id:string)=>ALL.get(id);
export const KIND_LABEL:Record<QKind,string>=Object.fromEntries(Object.entries(SET.types).map(([k,v])=>[k,v.label])) as Record<QKind,string>;
export const TOPIC_LABEL:Record<string,string>=SET.topics;
export const LEVEL_LABEL:Record<string,string>=SET.difficulty_labels;
// one tap answers it (the rest are put together, then sent)
export const ONE_TAP:QKind[]=['true_false','classification','scenario'];

const strip=(s:string)=>s.replace(/\s+/g,'');
const num=(s:string)=>{const t=s.replace(/[,\s%원배p]/g,'').replace(/^\+/,'');return t===''||isNaN(Number(t))?null:Number(t)};
const sameSet=(a:string[],b:string[])=>a.length===b.length&&a.every(x=>b.includes(x));
// is the response right (the file's scoring rules: types[].scoring, scoring_notes)
export function grade(q:Q100,r:Resp|null):boolean{
  if(r===null||r===undefined)return false;
  const a=q.answer;
  switch(q.type){
    case 'true_false':case 'classification':case 'scenario':return r===a;
    case 'multiple_select':return Array.isArray(r)&&sameSet(r,a as string[]);
    case 'ordering':return Array.isArray(r)&&r.length===(a as string[]).length&&r.every((x,i)=>x===(a as string[])[i]);
    case 'matching':case 'direction':{const m=a as Record<string,string>;if(typeof r!=='object'||Array.isArray(r))return false;
      return Object.keys(m).every(k=>r[k]===m[k])}
    case 'fill_blank':{const m=a as Record<string,number|string[]>;if(typeof r!=='object'||Array.isArray(r))return false;
      return Object.entries(m).every(([k,v])=>{const got=r[k]??'';
        if(typeof v==='number'){const n=num(got);return n!==null&&Math.abs(n-v)<1e-9}
        return (v as string[]).some(t=>strip(t)===strip(got))})}
  }
  return false;
}
// a response is complete enough to send
export function ready(q:Q100,r:Resp|null):boolean{
  if(r===null)return false;const d=q.data;
  switch(q.type){
    case 'multiple_select':return Array.isArray(r)&&r.length>0;
    case 'ordering':return Array.isArray(r)&&r.length===(d.items??[]).length;
    case 'matching':return typeof r==='object'&&!Array.isArray(r)&&(d.left??[]).every(l=>!!r[l.id]);
    case 'direction':return typeof r==='object'&&!Array.isArray(r)&&(d.targets??[]).every(t=>!!r[t.id]);
    case 'fill_blank':return typeof r==='object'&&!Array.isArray(r)&&(d.blanks??[]).every(b=>(r[b.id]??'').trim()!=='');
    default:return typeof r==='string';
  }
}
const textOf=(list:Opt[]|undefined,id:string)=>list?.find(o=>o.id===id)?.text??id;
// a response (mine, or the answer) as words, one line per part
export function say(q:Q100,r:Resp|null|unknown):string[]{
  if(r===null||r===undefined)return ['—'];const d=q.data;
  switch(q.type){
    case 'true_false':case 'classification':case 'scenario':return [textOf(d.options,r as string)];
    case 'multiple_select':return (r as string[]).length?(r as string[]).map(id=>textOf(d.options,id)):['—'];
    case 'ordering':return (r as string[]).map((id,i)=>`${i+1}. ${textOf(d.items,id)}`);
    case 'matching':return (d.left??[]).map(l=>`${l.text} → ${(r as Record<string,string>)[l.id]?textOf(d.right,(r as Record<string,string>)[l.id]):'—'}`);
    case 'direction':return (d.targets??[]).map(t=>`${t.text}: ${(r as Record<string,string>)[t.id]?textOf(d.options,(r as Record<string,string>)[t.id]):'—'}`);
    case 'fill_blank':return (d.blanks??[]).map(b=>{const v=(r as Record<string,unknown>)[b.id];const s=Array.isArray(v)?v.filter((x,i,a)=>a.findIndex(y=>String(y).toLowerCase()===String(x).toLowerCase())===i).join(' 또는 '):String(v??'—');/* EPS and eps: one answer */return b.unit?`${s}${b.unit}`:s});
  }
  return [String(r)];
}
