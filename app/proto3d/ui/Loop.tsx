'use client';
// The core loop on screen (redesign 4장): the research note and the judgment, luon's counter-argument, the grade
// reveal, and today's case. All rules are in app/core; these only show them and call the actions in state.ts.
import {useEffect,useState} from 'react';
import {Lightbulb} from 'lucide-react';
import {CHOICES,CHOICE_LABEL,REASON_MAX,LOOKBACK,canRecord,shiftDay,type Choice,type Confidence,type Judgment,type Graded,type Mark} from '../../core/judgment';
import {CASE,answerCase,type PastCase,type CaseAnswer} from '../../core/cases';
import {DEEP_AT,TRUST_LABEL} from '../../core/ledger';
import type {Holding} from '../../core/model';
import type {Signal} from '../../content/signals';
import {LINES,MODEL_INFO,analystById,line} from '../../content/analysts';
import {formatDay} from '../../core/items';
import {Sheet,Face,pct} from './Sheet';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;

export function NoteCard({sig,trustStage}:{sig:Signal;trustStage:number}){
  const a=analystById(sig.analyst),m=MODEL_INFO[sig.model];
  return <article className="rt-note" aria-label={`${a.name} 리서치 노트`}>
    <div className="rt-note-head"><Face id={a.id} name={a.name}/>
      <div><strong>{a.name} · {a.role}</strong><small>{m.name} · {m.what}</small></div>
      <span className={`rt-tag ${sig.loss?'signal':'ok'}`} style={{marginLeft:'auto'}}>{sig.loss?'손실 신호':'참고'}</span></div>
    <p className="rt-headline">{sig.headline}</p>
    <ul className="rt-evidence">{sig.evidence.map(e=><li key={e.k}><span>{e.k}</span><b className="rt-num">{e.v}</b></li>)}</ul>
    <p className="rt-say">{sig.say}</p>
    {sig.deep&&(trustStage>=DEEP_AT
      ?<details style={{marginTop:12}} open><summary className="rt-link">{sig.deep.title} · {sig.deep.items.filter(i=>i.ok).length}/9</summary>
        <ul className="rt-evidence" style={{marginTop:8}}>{sig.deep.items.map(i=><li key={i.k}><span>{i.k}</span><b className={i.ok?'rt-up':'rt-down'}>{i.ok?'통과':'미달'}</b></li>)}</ul></details>
      :<p className="rt-hint" style={{marginTop:10}}>{a.name} {TRUST_LABEL[DEEP_AT]}부터 {sig.deep.title}을 하나씩 보여줘.</p>)}
  </article>;
}

function JudgeForm({holding,sig,onDone,g,lookback=false}:{holding:Holding;sig:Signal|null;onDone:(j:Judgment)=>void;g:G;lookback?:boolean}){
  const [choice,setChoice]=useState<Choice|null>(null),[reason,setReason]=useState(''),[conf,setConf]=useState<Confidence|null>(null);
  const ok=canRecord({choice,confidence:conf,reason});
  const submit=()=>{if(!ok)return;const j=g.ops.recordJudgment({holdingId:holding.id,name:holding.name,choice:choice!,reason:reason.trim(),confidence:conf!,rate:holding.rate,
    ...(sig?{signalId:sig.loss?sig.id:undefined,analyst:sig.analyst,model:sig.model}:{})},lookback);onDone(j)};
  return <form onSubmit={e=>{e.preventDefault();submit()}} aria-label="판단 기록">
    <div className="rt-field">판단<div className="rt-seg" role="group" aria-label="판단">
      {CHOICES.map(c=><button key={c.id} type="button" aria-pressed={choice===c.id} onClick={()=>setChoice(c.id)}>{c.label}<small>{c.sub}</small></button>)}</div></div>
    <label className="rt-field">이유 한 줄 <span className="rt-hint">{reason.trim().length}/{REASON_MAX} · 90일 뒤에 이 문장 그대로 돌아와</span>
      <textarea className="rt-input" rows={2} maxLength={REASON_MAX} value={reason} onChange={e=>setReason(e.target.value)} placeholder="예: 수주 잔고 3년치. 이자만 버티면 돼."/></label>
    <div className="rt-field">확신도 <span className="rt-hint">높을수록 맞으면 많이, 틀리면 크게 깎여</span>
      <div className="rt-conf" role="group" aria-label="확신도">{([1,2,3,4,5] as Confidence[]).map(n=><button key={n} type="button" aria-pressed={conf===n} onClick={()=>setConf(n)}>{n}</button>)}</div></div>
    <button type="submit" className="rt-btn primary" style={{width:'100%',marginTop:20}} disabled={!ok}>기록</button>
  </form>;
}

function Rebuttal({j,sig,g,onDone}:{j:Judgment;sig:Signal|null;g:G;onDone:()=>void}){
  const [edit,setEdit]=useState(false),[reason,setReason]=useState(j.reason);
  const text=sig?sig.counter[j.choice]:LINES.counter[j.choice];
  const finish=(how:'kept'|'accepted'|'skipped')=>{g.ops.answerRebuttal(j.id,how);if(how==='accepted'&&reason.trim())g.ops.reviseReason(j.id,reason.trim());g.say(how==='kept'?LINES.rebuttalKept:how==='accepted'?LINES.rebuttalAccepted:LINES.recorded);onDone()};
  return <div className="rt-quote" aria-label="루온의 반박">
    <strong>루온 · 반박</strong>
    <p>{LINES.rebuttalIntro} {text}</p>
    {edit?<>
      <textarea className="rt-input" style={{marginTop:10}} rows={2} maxLength={REASON_MAX} value={reason} onChange={e=>setReason(e.target.value)} aria-label="고친 이유"/>
      <div className="rt-quote-acts"><button type="button" className="rt-btn primary" disabled={!reason.trim()} onClick={()=>finish('accepted')}>고친 이유로 저장</button></div></>
    :<div className="rt-quote-acts">
      <button type="button" className="rt-btn primary" onClick={()=>finish('kept')}>그래도 유지</button>
      <button type="button" className="rt-btn" onClick={()=>setEdit(true)}>이유 고칠게</button>
      <button type="button" className="rt-btn ghost" onClick={()=>finish('skipped')}>넘기기</button></div>}
  </div>;
}

// Briefing: today's notes → one note → the judgment → luon → done. Opened from the dock, an analyst or a tree.
export function Briefing({g,signals,holdings,start,onClose}:{g:G;signals:Signal[];holdings:Holding[];start:{signalId?:string;holdingId?:number}|null;onClose:()=>void}){
  const judged=(hid:number)=>g.s.judgments.some(j=>j.holdingId===hid&&j.day===g.clock.today);
  const first=start?.signalId?signals.find(s=>s.id===start.signalId)??null:start?.holdingId?signals.find(s=>s.holdingId===start.holdingId)??null:null;
  const [sig,setSig]=useState<Signal|null>(first);
  const [hid,setHid]=useState<number|null>(first?.holdingId??start?.holdingId??null);
  const [made,setMade]=useState<Judgment|null>(null),[done,setDone]=useState(false);
  const holding=holdings.find(h=>h.id===hid)??null;
  if(!holding){
    const open=signals.filter(s=>!judged(s.holdingId)),closed=signals.filter(s=>judged(s.holdingId));
    return <Sheet kicker="오늘 브리핑" title={open.length?`신호 ${open.length}건`:LINES.noSignal} onClose={onClose} label="오늘 브리핑">
      {signals.length===0&&<p className="rt-empty">{LINES.noSignal}</p>}
      {[...open,...closed].map(s=>{const a=analystById(s.analyst),h=holdings.find(x=>x.id===s.holdingId)!;return <button key={s.id} type="button" className="rt-row" onClick={()=>{setSig(s);setHid(s.holdingId)}}>
        <Face id={a.id} name={a.name} sm/><div><strong>{h.name}</strong><small>{a.name} · {MODEL_INFO[s.model].name} · {s.headline}</small></div>
        {judged(s.holdingId)?<span className="rt-tag ok">기록함</span>:<span className={`rt-tag ${s.loss?'signal':''}`}>{s.loss?'신호':'참고'}</span>}</button>})}
    </Sheet>;
  }
  const a=sig?analystById(sig.analyst):null;
  return <Sheet kicker={a?`${a.name} · ${MODEL_INFO[sig!.model].name}`:'판단 기록'} title={holding.name} onClose={onClose} label="브리핑">
    {sig&&<NoteCard sig={sig} trustStage={g.s.trust[sig.analyst].stage}/>}
    {!made&&<JudgeForm holding={holding} sig={sig} g={g} onDone={setMade}/>}
    {made&&!done&&<>
      <div className="rt-note" style={{marginTop:12}}><div className="rt-kicker">기록됨</div>
        <p className="rt-headline" style={{margin:'6px 0 2px'}}>{CHOICE_LABEL[made.choice]} · 확신 {made.confidence}</p><p className="rt-say">{made.reason}</p></div>
      <Rebuttal j={made} sig={sig} g={g} onDone={()=>setDone(true)}/></>}
    {done&&made&&<div className="rt-reveal" role="status">
      <small>채점 예정</small><strong className="rt-num">{formatDay(shiftDay(made.day,30),g.clock.today)} · {formatDay(shiftDay(made.day,90),g.clock.today)}</strong>
      <p>{LINES.recorded}</p>
      <button type="button" className="rt-btn" style={{marginTop:12,width:'100%'}} onClick={onClose}>닫기</button></div>}
  </Sheet>;
}

// The grade reveal (redesign 4-2): the moment the loop is built around. One at a time, oldest first.
export function Grades({g,onClose}:{g:G;onClose:()=>void}){
  const [shown,setShown]=useState<{j:Judgment;mark:Mark;gr:Graded}|null>(null);
  const next=g.due[0];
  if(!shown&&!next)return <Sheet kicker="판정" title="열 판정 없음" onClose={onClose}><p className="rt-empty">다음 채점은 기록한 날로부터 30일 뒤야.</p></Sheet>;
  if(!shown){const d=next;return <Sheet kicker={`판정 ${g.due.length}건 도착`} title={`${d.mark}일 전 너의 판단`} onClose={onClose}>
    <div className="rt-note"><div className="rt-note-head"><div><strong>{d.judgment.name}</strong><small>{formatDay(d.judgment.day,g.clock.today)} 기록</small></div></div>
      <p className="rt-headline">{CHOICE_LABEL[d.judgment.choice]} · 확신 {d.judgment.confidence}</p><p className="rt-say">{d.judgment.reason}</p></div>
    <button type="button" className="rt-btn primary" style={{width:'100%',marginTop:16}} onClick={()=>setShown({j:d.judgment,mark:d.mark,gr:g.ops.openGrade(d.judgment,d.mark)})}>결과 열기</button>
  </Sheet>}
  const {j,mark,gr}=shown,a=j.analyst?analystById(j.analyst):null,sure=j.confidence>=4;
  const verdict=gr.hit?(sure?LINES.gradeHitSure:line(LINES.gradeHitUnsure,{c:j.confidence})):(sure?line(LINES.gradeMissSure,{c:j.confidence}):LINES.gradeMissUnsure);
  return <Sheet kicker={`${mark}일 판정 · ${j.name}`} title={gr.hit?'적중':'빗나감'} onClose={onClose} label="판정 결과">
    <div className="rt-verdict">
      <div className="rt-kicker">그 뒤 {mark}일</div>
      <div className={`rt-big rt-num ${gr.after<0?'rt-down':'rt-up'}`}>{pct(gr.after)}</div>
      <div className="rt-then">
        <div><span>{mark}일 전 너</span><b>{CHOICE_LABEL[j.choice]} · 확신 {j.confidence}</b><small>{j.reason}</small></div>
        <div><span>결과</span><b className={gr.hit?'rt-up':'rt-down'}>{gr.hit?'판단 적중':'판단 빗나감'}</b><small className="rt-num">점수 {gr.points>0?'+':''}{gr.points}</small></div>
      </div>
      <p className="rt-say" style={{marginTop:14}}>{verdict}</p>
      {a&&gr.signalRight!==null&&<p className="rt-hint" style={{marginTop:6}}>{line(gr.signalRight?LINES.signalRight:LINES.signalWrong,{who:a.name})} ({MODEL_INFO[j.model as keyof typeof MODEL_INFO]?.name})</p>}
    </div>
    <button type="button" className="rt-btn primary" style={{width:'100%',marginTop:18}} onClick={()=>g.due.length?setShown(null):onClose()}>{g.due.length?`다음 판정 (${g.due.length})`:'닫기'}</button>
  </Sheet>;
}

// Today's case: 30 seconds, name hidden, one hint card. Answer (or time) reveals it.
export function CaseView({g,c,onClose}:{g:G;c:PastCase;onClose:()=>void}){
  const prior=g.s.cases.find(x=>x.day===g.clock.today)??null;
  const [left,setLeft]=useState(CASE.seconds),[hint,setHint]=useState(false),[ans,setAns]=useState<CaseAnswer|null>(prior);
  const [run,setRun]=useState<{counted:boolean;count:number}|null>(null);
  const answer=(choice:string|null)=>{if(ans)return;const a=answerCase(c,choice,hint,g.clock.today);setAns(a);const r=g.ops.answerCase(a,hint?MODEL_INFO[c.hints[0].model as keyof typeof MODEL_INFO]?.analyst:undefined);setRun(r)};
  useEffect(()=>{if(ans)return;if(left<=0){answer(null);return}const t=setTimeout(()=>setLeft(l=>l-1),1000);return()=>clearTimeout(t)});
  const h0=c.hints[0],hm=MODEL_INFO[h0.model as keyof typeof MODEL_INFO],ha=analystById(hm.analyst);
  const first=MODEL_INFO[c.reveal.firstCaught as keyof typeof MODEL_INFO];
  return <Sheet kicker={`오늘의 케이스 · ${c.sector} · ${c.when}`} title={ans?c.reveal.name:'이 회사, 어떻게 됐을까'} onClose={onClose} label="오늘의 케이스">
    {!ans&&<><div className={`rt-timer${left<=10?' low':''}`} aria-label={`남은 시간 ${left}초`}><i style={{width:`${left/CASE.seconds*100}%`}}/></div>
      <p className="rt-hint">{LINES.caseIntro} <span className="rt-num">{left}초</span></p></>}
    <div className="rt-facts" style={{marginTop:10}}>{c.facts.map(f=><div key={f.k}><span>{f.k}</span><b>{f.v}</b></div>)}</div>
    {hint&&<div className="rt-note" style={{marginTop:10}}><div className="rt-note-head"><Face id={ha.id} name={ha.name} sm/><div><strong>{ha.name} · {hm.name}</strong><small>힌트 카드</small></div></div><p className="rt-say">{h0.text}</p></div>}
    <p className="rt-headline" style={{marginTop:16}}>{c.question}</p>
    <div className="rt-seg" style={{['--n' as string]:1}} role="group" aria-label="답">
      {c.choices.map(ch=><button key={ch.id} type="button" disabled={!!ans} aria-pressed={ans?.choice===ch.id}
        style={ans&&ch.id===c.answer?{borderColor:'var(--rt-up)',color:'var(--rt-up)'}:undefined} onClick={()=>answer(ch.id)}>{ch.label}</button>)}
    </div>
    {!ans&&!hint&&<button type="button" className="rt-btn ghost" style={{marginTop:8}} onClick={()=>setHint(true)}><Lightbulb size={16}/>모델 카드 힌트 (점수 {CASE.hintPoints})</button>}
    {ans&&<div className="rt-reveal" role="status">
      <small>{c.reveal.name} · {c.reveal.year}</small>
      <strong>{ans.correct?line(LINES.caseRight,{model:first.name}):ans.choice?line(LINES.caseWrong,{model:first.name}):LINES.caseTimeout}</strong>
      <p>{c.reveal.what}</p><p>{c.reveal.lesson}</p>
      <p className="rt-num">+{ans.points}점{run?.counted?` · ${line(LINES.streak,{n:run.count})}`:prior?' · 오늘 이미 풀었어':''}</p>
    </div>}
    {ans&&<p className="rt-hint" style={{marginTop:10}}>출처: {c.source}</p>}
  </Sheet>;
}

// First visit: one of today's signals put 30 days back (core/judgment.ts LOOKBACK). The player judges it, and the
// grade reveal opens straight after (onJudged → the Grades sheet).
export function LookBack({g,sig,holding,onJudged,onClose}:{g:G;sig:Signal;holding:Holding;onJudged:()=>void;onClose:()=>void}){
  const a=analystById(sig.analyst);
  return <Sheet kicker={`되돌아보기 · ${LOOKBACK}일 전`} title={holding.name} label="되돌아보기" onClose={()=>{g.ops.skipLookback();onClose()}}>
    <div className="rt-note-head" style={{marginBottom:12}}><Face id={a.id} name={a.name}/>
      <div><strong>{line(LINES.lookbackIntro,{n:LOOKBACK})}</strong><small>{line(LINES.lookbackNote,{n:LOOKBACK})}</small></div></div>
    <NoteCard sig={sig} trustStage={g.s.trust[sig.analyst].stage}/>
    <JudgeForm holding={holding} sig={sig} g={g} lookback onDone={onJudged}/>
  </Sheet>;
}
