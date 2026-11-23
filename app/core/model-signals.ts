// The team's 서서히 verdicts (investment-evidence-system → holding_signals, ops/ui/push_signals.py) turned into the
// analysts' notes. One row per real holding (stock code + buy date): the three model risk scores and the numbers
// behind them, from the buy date's filing snapshot to the latest session. Each friend keeps one model
// (content/analysts.ts: 토리 듀퐁, 모아 올슨, 루온 F-Score); a friend speaks only when their model's risk score
// reaches the team's line (BAD below, pipeline.py BAD_THRESHOLD). The numbers come from the row; nothing is made up.
// Wording follows redesign 2장: what the model saw, never "팔아"/"사" or a price call.
import type {AnalystId,ModelId} from '../content/analysts';
import type {Holding} from './model';

export type VerdictStatus='available'|'held'|'stale'|'not_covered'|'no_signal';
type Detail=Record<string,unknown>;
export type ModelEvidence={status?:string;hold_reason?:string|null;detail?:Detail};
export type HoldingVerdict={code:string;buy_date:string;status:VerdictStatus;verdict:string|null;
  fscore:number|null;ohlson_score:number|null;dupont_score:number|null;sum_total:number|null;
  eval_date:string|null;financial_as_of:string|null;price_as_of:string|null;release_id:number|null;
  evidence:{fscore?:ModelEvidence;ohlson?:ModelEvidence;dupont?:ModelEvidence}|null};
export type Fact={k:string;v:string};
export type VerdictNote={holdingId:number;analyst:AnalystId;model:ModelId;loss:true;headline:string;evidence:Fact[];say:string;
  counter:{hold:string;review:string;watch:string}};

// pipeline.py BAD_THRESHOLD: at or above this a model counts as "worsened"
export const BAD={fscore:2,ohlson:2,dupont:2} as const;
export const RISK_MAX={fscore:3,ohlson:2,dupont:3} as const;
export const verdictKey=(code:string,buyDate:string)=>`${code}|${buyDate}`;

const n=(v:unknown)=>{const x=typeof v==='number'?v:typeof v==='string'&&v.trim()!==''&&v!=='None'?Number(v):NaN;return Number.isFinite(x)?x:null};
const signed=(x:number,digits=1)=>`${x>0?'+':''}${x.toFixed(digits)}`;
const OMEGA:Record<string,string>={high:'높음',low:'낮음',lowest:'최하'};

function fscoreNote(h:Holding,r:HoldingVerdict,d:Detail):Omit<VerdictNote,'holdingId'>{
  const buy=n(d.f_score_buy),now=n(d.f_score_eval),drop=buy!=null&&now!=null?buy-now:null;
  return {analyst:'luon',model:'fscore',loss:true,
    headline:buy!=null&&now!=null?`재무 체력 ${buy}점 → ${now}점 (9점 만점)`:`재무 체력 위험 ${r.fscore}/${RISK_MAX.fscore}`,
    evidence:[...(buy!=null?[{k:`살 때 (${d.fiscal_year_buy ?? '-'}년 결산)`,v:`${buy}점`}]:[]),
      ...(now!=null?[{k:`지금 (${d.fiscal_year_eval ?? '-'}년 결산)`,v:`${now}점`}]:[]),
      {k:'위험 점수',v:`${r.fscore} / ${RISK_MAX.fscore}`},...basis(r)],
    say:drop!=null&&drop>0?`아홉 칸 중 ${drop}칸이 살 때보다 나빠졌어.`:'아홉 칸 점수가 위험선까지 내려왔어.',
    counter:{hold:'살 때 본 숫자들, 지금도 그대로야?',review:'한 해 결산만 보고 정하는 건 이르지 않아?',watch:'다음 결산까지 뭘 보고 기다릴 거야?'}};
}

function ohlsonNote(h:Holding,r:HoldingVerdict,d:Detail):Omit<VerdictNote,'holdingId'>{
  const sb=n(d.s_buy),se=n(d.s_eval),ob=typeof d.omega_state_buy==='string'?d.omega_state_buy:null,oe=typeof d.omega_state_eval==='string'?d.omega_state_eval:null;
  return {analyst:'moa',model:'ohlson',loss:true,
    headline:sb!=null&&se!=null?`초과이익률 ${signed(sb*100)}% → ${signed(se*100)}%`:`부실 위험 ${r.ohlson_score}/${RISK_MAX.ohlson}`,
    evidence:[...(sb!=null&&se!=null?[{k:'초과이익률 (자본 대비)',v:`${signed(sb*100)}% → ${signed(se*100)}%`}]:[]),
      ...(ob&&oe?[{k:'시장 기대 (ω)',v:`${OMEGA[ob]??ob} → ${OMEGA[oe]??oe}`}]:[]),
      {k:'위험 점수',v:`${r.ohlson_score} / ${RISK_MAX.ohlson}`},...basis(r)],
    say:'잠깐만, 자본으로 버는 힘이 살 때보다 약해졌어.',
    counter:{hold:'번 돈이 자본비용보다 적어. 버틸 근거 있어?',review:'한 분기 숫자로 정하면 나중에 복기는?',watch:'다음 분기 초과이익, 그게 기준이야?'}};
}

function dupontNote(h:Holding,r:HoldingVerdict,d:Detail):Omit<VerdictNote,'holdingId'>{
  const pm=n(d.dPM_adj_pp),ato=n(d.dATO_rel_pct),partial=d.partial===true||d.partial==='True';
  return {analyst:'tori',model:'dupont',loss:true,
    headline:pm!=null?`업종 대비 영업이익률 ${signed(pm)}%p`:`수익성 위험 ${r.dupont_score}/${RISK_MAX.dupont}`,
    evidence:[...(pm!=null?[{k:'영업이익률 (업종 대비 변화)',v:`${signed(pm)}%p`}]:[]),
      ...(ato!=null?[{k:'자산회전율 (업종 대비 변화)',v:`${signed(ato)}%`}]:[]),
      {k:'위험 점수',v:`${r.dupont_score} / ${RISK_MAX.dupont}${partial?' (한쪽 지표만)':''}`},...basis(r)],
    say:'장부를 쪼개 보면 이익률이 업종보다 처졌더라.',
    counter:{hold:'이익률이 업종보다 처졌어. 그래도 들 이유는?',review:'일시 비용이면 다음 분기에 돌아오잖아?',watch:'다음 분기 이익률, 그걸로 판단할 거야?'}};
}

function basis(r:HoldingVerdict):Fact[]{
  return [...(r.financial_as_of?[{k:'재무 기준',v:r.financial_as_of}]:[]),...(r.eval_date?[{k:'평가일',v:r.eval_date}]:[])];
}

// the notes for one holding: one per model at or above its line, in the friends' order 토리 · 모아 · 루온
export function verdictNotes(h:Holding,r:HoldingVerdict):VerdictNote[]{
  if(r.status!=='available'&&r.status!=='stale')return [];
  const ev=r.evidence??{},out:VerdictNote[]=[];
  const add=(note:Omit<VerdictNote,'holdingId'>)=>out.push({...note,holdingId:h.id});
  if(r.dupont_score!=null&&r.dupont_score>=BAD.dupont)add(dupontNote(h,r,ev.dupont?.detail??{}));
  if(r.ohlson_score!=null&&r.ohlson_score>=BAD.ohlson)add(ohlsonNote(h,r,ev.ohlson?.detail??{}));
  if(r.fscore!=null&&r.fscore>=BAD.fscore)add(fscoreNote(h,r,ev.fscore?.detail??{}));
  return out;
}

// which holdings the verdicts decide: a real holding with a code whose row was found and is in the model's universe.
// not_covered / no_signal / no row: the old path (price chart note) stays.
export function verdictFor(h:Holding,rows:ReadonlyMap<string,HoldingVerdict>):HoldingVerdict|null{
  if(!h.real||!h.code||h.virtual)return null;
  const r=rows.get(verdictKey(h.code,h.date));
  return r&&r.status!=='not_covered'&&r.status!=='no_signal'?r:null;
}

// ── 반박 (rebuttal) results: what the player told 보리 about why they hold, checked against the company's numbers by
// the team's Toulmin pipeline (investment-evidence-system backend/llm/fds_rebuttal → ops/ui/analysis_worker.py →
// analysis_results.result, schema toulmin.1). 루온 brings it back as a note on that holding: the decision (S8 D-1..D-5),
// each of the player's points with its tag, and the open conditions the data could not settle.
export type RebuttalDecision='thesis_factually_inconsistent'|'thesis_weakened'|'mixed'|'thesis_supported'|'insufficient_evidence';
type Mention={span?:string|null;mapping_status?:string|null;evaluation?:{tag?:string|null}|null};
export type Toulmin={decision?:string|null;as_of?:string|null;claim?:Mention[];grounds?:Mention[];
  question_candidates?:{text?:string|null}[];unresolved_items?:unknown[]};
export type AnalysisRow={request_id:string;company_id:string|null;status:'done'|'insufficient_input'|'failed';decision:string|null;
  result:Toulmin|null;alert_date:string|null;as_of:string|null;analyzed_at:string|null};
export type RebuttalNote={holdingId:number;analyst:'luon';model:'rebuttal';loss:false;headline:string;evidence:Fact[];say:string;
  counter:{hold:string;review:string;watch:string};request:string};

export const DECISION:Record<RebuttalDecision,{headline:string;say:string}>={
  thesis_factually_inconsistent:{headline:'네 근거 하나가 숫자와 반대야',say:'네가 말한 사실 중 하나는 장부랑 방향이 달라.'},
  thesis_weakened:{headline:'네 전제를 지난 숫자가 약하게 해',say:'앞으로 그렇게 된다는 전제, 지난 숫자는 반대였어.'},
  mixed:{headline:'맞는 근거도, 걸리는 근거도 있어',say:'반은 숫자가 받쳐 주고 반은 아니야. 어느 쪽이 무거워?'},
  thesis_supported:{headline:'네 근거, 지금 숫자와는 맞아',say:'확인한 건 다 맞아. 그래도 내가 반대편에 서 볼게.'},
  insufficient_evidence:{headline:'판단할 숫자가 아직 부족해',say:'네 말을 확인할 숫자가 모자라. 맞다 틀리다 못 하겠어.'},
};
// S8 tags (pipeline_s6_s7_s8.py TAG_DEFINITIONS) in the player's words
export const TAG:Record<string,string>={supported:'숫자와 일치',partial:'방향은 맞음',contradicted:'숫자와 반대',undercut:'지난 숫자가 약화',
  insufficient:'데이터 부족',direction_only:'방향만 확인',unknown:'확인 못 함',investor_claimed:'확인 안 된 주장',out_of_scope:'모델 밖 이야기'};
const clip=(t:string,max=22)=>{const s=t.replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max-1)+'…':s};
const tagOf=(m:Mention)=>{const t=m.evaluation?.tag;return t?TAG[t]??t:'확인 못 함'};

// the newest finished analysis per company code
export function latestByCompany(rows:readonly AnalysisRow[]):Map<string,AnalysisRow>{
  const out=new Map<string,AnalysisRow>();
  for(const r of rows){if(r.status!=='done'||!r.company_id||!r.result)continue;const cur=out.get(r.company_id);
    if(!cur||(r.analyzed_at??'')>(cur.analyzed_at??''))out.set(r.company_id,r)}
  return out;
}

export function rebuttalNote(h:Holding,r:AnalysisRow):RebuttalNote|null{
  const t=r.result;if(r.status!=='done'||!t)return null;
  const d=(r.decision??t.decision) as RebuttalDecision,words=DECISION[d]??DECISION.insufficient_evidence;
  const points=[...(t.claim??[]),...(t.grounds??[])].filter(m=>typeof m.span==='string'&&m.span.trim());
  const seen=new Set<string>(),facts:Fact[]=[];
  for(const m of points){const k=clip(m.span!);if(seen.has(k))continue;seen.add(k);facts.push({k:`“${k}”`,v:tagOf(m)});if(facts.length>=4)break}
  const open=(t.question_candidates??[]).map(q=>q.text).filter((x):x is string=>!!x&&!!x.trim());
  if(open.length)facts.push({k:'숫자로 못 가린 조건',v:clip(open[0],26)});
  const asOf=r.as_of??t.as_of;if(asOf)facts.push({k:'기업 데이터 기준',v:asOf});
  return {holdingId:h.id,analyst:'luon',model:'rebuttal',loss:false,headline:words.headline,evidence:facts,say:words.say,request:r.request_id,
    counter:{hold:'들고 가는 이유, 숫자로 확인된 것만 남기면 뭐가 남아?',review:'확인 못 한 조건이 풀리면 생각이 바뀔 수도 있지 않아?',
      watch:'못 가린 조건, 언제 어떤 숫자로 확인할 거야?'}};
}

// ── what the server sent this visit (proto3d/model-signals.ts fills it; content/signals.ts reads it)
const VERDICTS=new Map<string,HoldingVerdict>();
let ANALYSES=new Map<string,AnalysisRow>();
export function setVerdicts(rows:readonly HoldingVerdict[]){VERDICTS.clear();for(const r of rows)VERDICTS.set(verdictKey(r.code,r.buy_date),r)}
export function setAnalyses(rows:readonly AnalysisRow[]){ANALYSES=latestByCompany(rows)}
export const verdicts=():ReadonlyMap<string,HoldingVerdict>=>VERDICTS;
export const analysisFor=(code:string|undefined)=>code?ANALYSES.get(code)??null:null;
// the row for a real holding, whatever its status (the deep sheet says not_covered / no_signal in words)
export const rowFor=(h:Holding)=>h.real&&h.code&&!h.virtual?VERDICTS.get(verdictKey(h.code,h.date))??null:null;
export const NOT_COVERED='우리 재무 모델은 아직 120개 종목만 봐. 이 종목은 그 밖이라 가격 신호만 볼 수 있어.';
export const NO_SIGNAL='이 날짜 기준으로 계산된 재무 신호가 아직 없어.';

// the deep sheet (proto3d/ui/Deep.tsx) for a real holding: the verdict's own numbers instead of the mock roots
export type VerdictRow={id:'fscore'|'ohlson'|'dupont'|'sum';word:string;model:string;value:string;tone:'good'|'mid'|'weak'};
const toneRisk=(v:number|null,line:number)=>v==null?'mid':v>=line?'weak':v>0?'mid':'good';
export const VERDICT_WORD:Record<string,string>={Yes:'손실 신호',주의:'주의',No:'신호 없음',유보:'판단 유보'};
export function verdictRows(r:HoldingVerdict):VerdictRow[]{
  const f=r.evidence?.fscore?.detail??{},o=r.evidence?.ohlson?.detail??{},d=r.evidence?.dupont?.detail??{};
  const fb=n(f.f_score_buy),fe=n(f.f_score_eval),sb=n(o.s_buy),se=n(o.s_eval),pm=n(d.dPM_adj_pp);
  const risk=(v:number|null,max:number)=>v==null?'계산 안 됨':`위험 ${v}/${max}`;
  return [
    {id:'fscore',word:'재무 체력',model:'F-Score',tone:toneRisk(r.fscore,BAD.fscore),
      value:fb!=null&&fe!=null?`${fb} → ${fe}점`:risk(r.fscore,RISK_MAX.fscore)},
    {id:'ohlson',word:'버는 힘',model:sb!=null&&se!=null?`올슨 초과이익 · 살 때 ${signed(sb*100)}%`:'올슨 초과이익',tone:toneRisk(r.ohlson_score,BAD.ohlson),
      value:sb!=null&&se!=null?`${signed(se*100)}%`:risk(r.ohlson_score,RISK_MAX.ohlson)},
    {id:'dupont',word:'이익률',model:'듀퐁 업종 대비',tone:toneRisk(r.dupont_score,BAD.dupont),
      value:pm!=null?`${signed(pm)}%p`:risk(r.dupont_score,RISK_MAX.dupont)},
    {id:'sum',word:'종합',model:'서서히',tone:r.verdict==='Yes'?'weak':r.verdict==='주의'?'mid':'good',
      value:r.verdict?VERDICT_WORD[r.verdict]??r.verdict:'계산 중'},
  ];
}
