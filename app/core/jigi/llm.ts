// 지기 LLM calls (docs/jigi.md; spec: A 가설 구조화, B 작성 도움, C 분석 설명). All three run on the server
// (db/functions/jigi-llm, OpenAI); the prompts and the checks on what comes back live here so tests cover them.
// The rules every call keeps: only what the player wrote (A, B) or what the code counted (C); no new numbers, dates
// or confidence; no buy/sell advice, no price calls; nothing about a person's ability. Anything that breaks a rule is
// dropped and the rule-based fallback is used instead.
import {DOMAINS,FORMS,ROLES,DIRS,type Draft} from './extract';
import type {Journal} from './journal';

type Msg={role:'system'|'user';content:string};
export const LLM_LIMIT={perDay:40/* calls a player may make a day, all three together */,text:1200/* characters of a journal sent */};
const UNSAFE=/(^|\s)(사라|사 둬|팔아|팔라|물타기|풀매수|몰빵)|매수하세요|매도하세요|매수해|매도해|오를\s?거야|오른다고|떨어질\s?거야|목표가|수익\s?보장|실력이 (없|부족)|능력이 (없|부족)/;
export const jigiSafe=(t:string)=>!!t.trim()&&!UNSAFE.test(t);

// A: split my own 가설·반대 근거 into hypotheses, without adding any
export function extractPrompt(j:Journal):Msg[]{
  return [{role:'system',content:['너는 투자일지 원문을 구조화하는 도구다. 원문에 실제로 적힌 예측과 행동만 문장 단위로 뽑는다.',
    '새 가설을 만들거나 논리 연결을 보태지 않는다. 원문에 없는 기한·수치·확신도는 채우지 않는다.',
    `JSON 배열만 출력한다. 원소: {"text":원문에 가까운 한 문장,"src":"핵심 가설"|"반대 근거","domain":${JSON.stringify(DOMAINS)} 중 하나,"form":${JSON.stringify(FORMS)} 중 하나,"role":${JSON.stringify(ROLES)} 중 하나,"dir":"상승"|"하락"|"없음"}`,
    '주종목 주가의 방향 예측만 domain "주가"·form "방향"으로 둔다. 반대 근거에서 온 문장은 form "반대 시나리오"다.'].join('\n')},
    {role:'user',content:`주종목: ${j.stock?.name??'미정'}\n[핵심 가설]\n${j.f.hypo.slice(0,LLM_LIMIT.text)}\n[반대 근거]\n${(j.f.opt.counter??'(없음)').slice(0,LLM_LIMIT.text)}`}];
}
// what came back from A, kept only where it is well-formed and close to my own words
export function parseExtract(raw:string,j:Journal):Draft[]|null{
  let v:unknown;try{v=JSON.parse(raw.replace(/^```(json)?|```$/g,'').trim())}catch{return null}
  if(!Array.isArray(v))return null;
  const src=(j.f.hypo+' '+(j.f.opt.counter??'')).replace(/\s+/g,'');
  const out=v.flatMap((h:Record<string,unknown>)=>{if(!h||typeof h.text!=='string')return [];const text=h.text.trim().slice(0,300);if(text.length<4||!jigiSafe(text))return [];
    // close to the original: most of its characters appear in what I wrote
    const chars=[...text.replace(/\s+/g,'')],seen=chars.filter(ch=>src.includes(ch)).length;if(seen/chars.length<.8)return [];
    const counter=h.src==='반대 근거',form=counter?'반대 시나리오':FORMS.includes(h.form as never)?String(h.form):'추세';
    return [{text,src:counter?'반대 근거':'핵심 가설',domain:DOMAINS.includes(h.domain as never)?String(h.domain):'경기',form,role:ROLES.includes(h.role as never)?String(h.role):'중간 전달 과정',
      dir:DIRS.includes(h.dir as never)?h.dir as Draft['dir']:'없음',endDate:counter||form==='행동'?'':j.f.checkDate} as Draft]});
  return out.length?out:null;
}

// B: questions to think with for one optional block, from this journal only (no draft text of mine is invented)
export function assistPrompt(j:Journal,block:string,title:string):Msg[]{
  return [{role:'system',content:['너는 투자일지 작성을 돕는다. 사용자가 스스로 생각하도록 질문 2개만 한국어 해요체로 쓴다.',
    '질문은 이 일지의 종목·가설·이유에 맞춘다. 답을 대신 쓰지 않고, 비중·가격·기간·매매 이유를 지어내지 않는다.',
    '사라/팔라 같은 매매 권유와 가격 예측은 하지 않는다. 질문 두 줄만 출력한다.'].join('\n')},
    {role:'user',content:`칸: ${title} (${block})\n종목: ${j.stock?.name??'미정'}\n한 일: ${j.f.action}\n가설: ${j.f.hypo.slice(0,600)}\n이유: ${j.f.reason.slice(0,600)}`}];
}
export function parseAssist(raw:string):string[]|null{const qs=raw.split('\n').map(s=>s.replace(/^[-\d.)\s]+/,'').trim()).filter(s=>s.length>=6&&s.length<=140&&jigiSafe(s)).slice(0,2);return qs.length?qs:null}

// C: two or three sentences explaining numbers the code counted; any number not in the facts sends us back to the fallback
export function explainPrompt(topic:string,facts:unknown):Msg[]{
  return [{role:'system',content:['투자일지 분석 화면의 설명 문단을 쓴다. "계산 결과"는 코드가 계산한 사실이다. 이 사실만 쓰고 숫자를 새로 만들지 않는다.',
    '2~3문장, 한국어 해요체. 관찰된 사실을 먼저 말하고, 가능한 해석은 "~일 수 있어요"로 구분한다. 원인을 단정하지 않고 사람을 평가하지 않는다.',
    '적중률 순위를 능력 순위로 말하지 않는다. 표본이 적으면 그 점을 말한다. 매매 권유나 가격 예측은 하지 않는다. 문단만 출력한다.'].join('\n')},
    {role:'user',content:`주제: ${topic}\n계산 결과: ${JSON.stringify(facts).slice(0,2000)}`}];
}
export function checkExplain(raw:string,facts:unknown):string|null{
  const t=raw.trim().slice(0,460);if(!jigiSafe(t)||t.length<10)return null;
  const known=new Set((JSON.stringify(facts).match(/\d+(\.\d+)?/g)??[]).map(Number));
  // 95 (the interval) is always allowed; any other number must be one of the facts
  for(const n of (t.match(/\d+(\.\d+)?/g)??[]).map(Number))if(n!==95&&!known.has(n))return null;
  return t;
}

// the rows for db/migrations/003_jigi.sql (journals, hypotheses): my own pages only, never the demo
export function journalRows(js:Journal[]){
  const iso=(ms:number|null|undefined)=>ms==null?null:new Date(ms).toISOString();
  const mine=js.filter(j=>!j.demo);
  return {journals:mine.map(j=>({id:j.id,stock_code:j.stock?.code??null,stock_name:j.stock?.name??null,holding_id:j.holdingId,status:j.status,practice:!!j.practice,
      created_at:iso(j.createdAt),saved_at:iso(j.savedAt),tz:j.tz,fields:j.f,anchor:j.anchor,reflection:j.reflection,versions:j.versions,archived_at:iso(j.archivedAt),deleted_at:iso(j.deletedAt),updated_at:new Date().toISOString()})),
    hypotheses:mine.flatMap(j=>j.hypos.map(h=>({id:h.id,journal_id:j.id,text:h.text.slice(0,300),src:h.src,domain:h.domain,form:h.form,role:h.role,dir:h.dir,end_date:h.endDate||null,status:h.status,
      confirmed_at:iso(h.confirmedAt),auto:!!h.auto,base:h.base??null,post_hoc:!!h.postHoc,opened_at:iso(h.opened)})))};
}
