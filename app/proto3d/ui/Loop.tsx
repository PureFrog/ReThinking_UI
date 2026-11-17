'use client';
// The core loop on screen (redesign 4장): the research note and the judgment, luon's counter-argument, the grade
// reveal, and today's case. All rules are in app/core; these only show them and call the actions in state.ts.
import {still} from '../still';
import {useEffect,useMemo,useState} from 'react';
import {Bulb} from './Icons';
import {CHOICES,CHOICE_LABEL,REASON_MAX,LOOKBACK,canRecord,shiftDay,type Choice,type Confidence,type Judgment,type Graded,type Mark} from '../../core/judgment';
import {CASE,answerCase,type PastCase,type CaseAnswer} from '../../core/cases';
import {stageFor} from '../../core/master';
import {DEEP_AT,TRUST_LABEL,EARN} from '../../core/ledger';
import {REWIND,paidLeft,type RewindRound} from '../../core/rewind';
import {rewindProvider} from '../../content/rewind';
import {recallOf} from '../../core/recall';
import type {Holding} from '../../core/model';
import type {Signal} from '../../content/signals';
import {LINES,UI,CURRENCY,MODEL_INFO,analystById,line,say} from '../../content/analysts';
import {formatDay} from '../../core/items';
import {revealPhase,revealValue,REVEAL_TOTAL} from '../../core/reveal';
import {TIMING} from '../../core/timing';
import {cue} from '../../core/sound';
import {Sheet,Face,Said,pct,Num} from './Sheet';
import {Pack} from './Capsules';
import {ShareSheet} from './Share';
import {shareCard} from '../../core/share';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;

// onDeep: the note's 땅 속 보기 (W2 root cut-away under this company's tree)
export function NoteCard({sig,trustStage,onDeep}:{sig:Signal;trustStage:number;onDeep?:()=>void}){
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
        <ul className="rt-evidence" style={{marginTop:8}}>{sig.deep.items.map(i=><li key={i.k}><span>{i.k}</span><b className={i.ok?'rt-ok':'rt-bad'}>{i.ok?'통과':'미달'}</b></li>)}</ul></details>
      :<p className="rt-hint" style={{marginTop:10}}>{a.name} {TRUST_LABEL[DEEP_AT]}부터 {sig.deep.title}을 하나씩 볼 수 있어요</p>)}
    {onDeep&&<button type="button" className="rt-btn rt-deep-btn" onClick={onDeep}>재무 체력 보기<small>F-score · 올슨 · 부채비율</small></button>}
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
    <label className="rt-field">이유 한 줄 <span className="rt-hint">{reason.trim().length}/{REASON_MAX} · 30·90일 뒤 채점 때 이 문장이 다시 나와요</span>
      <textarea className="rt-input" rows={2} maxLength={REASON_MAX} value={reason} onChange={e=>setReason(e.target.value)} placeholder="예: 수주 잔고 3년치. 이자만 버티면 돼."/></label>
    <div className="rt-field">확신도 <span className="rt-hint">높을수록 맞으면 크게 오르고, 틀리면 크게 깎여요</span>
      <div className="rt-conf" role="group" aria-label="확신도">{([1,2,3,4,5] as Confidence[]).map(n=><button key={n} type="button" aria-pressed={conf===n} onClick={()=>setConf(n)}>{n}</button>)}</div></div>
    <button type="submit" className="rt-btn primary" style={{width:'100%',marginTop:20}} disabled={!ok}>기록하기</button>
  </form>;
}

function Rebuttal({j,sig,g,onDone}:{j:Judgment;sig:Signal|null;g:G;onDone:()=>void}){
  const [edit,setEdit]=useState(false),[reason,setReason]=useState(j.reason);
  const text=sig?sig.counter[j.choice]:LINES.counter[j.choice];
  // the player made the same call on this company before: luon asks about that first
  const before=g.s.judgments.some(x=>x.id!==j.id&&x.holdingId===j.holdingId&&x.choice===j.choice);
  const open=before?say(LINES.again,j.id,{choice:CHOICE_LABEL[j.choice]}):say(LINES.rebuttalIntro,j.id);
  const finish=(how:'kept'|'accepted'|'skipped')=>{g.ops.answerRebuttal(j.id,how);if(how==='accepted'&&reason.trim())g.ops.reviseReason(j.id,reason.trim());g.say(how==='kept'?say(LINES.rebuttalKept,j.id):how==='accepted'?say(LINES.rebuttalAccepted,j.id):UI.skipped);onDone()};
  return <div className="rt-quote" aria-label="루온의 반박">
    <strong>루온 · 반박</strong>
    <p>{open} {text}</p>
    {edit?<>
      <textarea className="rt-input" style={{marginTop:10}} rows={2} maxLength={REASON_MAX} value={reason} onChange={e=>setReason(e.target.value)} aria-label="고친 이유"/>
      <div className="rt-quote-acts"><button type="button" className="rt-btn primary" disabled={!reason.trim()} onClick={()=>finish('accepted')}>고친 이유로 저장</button></div></>
    :<div className="rt-quote-acts">
      <button type="button" className="rt-btn primary" onClick={()=>finish('kept')}>그래도 유지</button>
      <button type="button" className="rt-btn" onClick={()=>setEdit(true)}>이유 고치기</button>
      <button type="button" className="rt-btn ghost" onClick={()=>finish('skipped')}>넘기기</button></div>}
  </div>;
}

// Briefing: today's notes → one note → the judgment → luon → done. Opened from the dock, an analyst or a tree.
// onBury: leaving once a judgment is recorded buries it under its tree as a capsule (W3)
export function Briefing({g,signals,holdings,start,onClose,onDeep,onBury,onWrite}:{g:G;signals:Signal[];holdings:Holding[];start:{signalId?:string;holdingId?:number}|null;onClose:()=>void;onDeep?:(holdingId:number)=>void;onBury?:(holdingId:number)=>void;
  // 지기 (docs/jigi.md): the note leads to a journal page instead of the old one-line judgment
  onWrite?:(holdingId:number,signalId:string|null)=>void}){
  const judged=(hid:number)=>g.s.judgments.some(j=>j.holdingId===hid&&j.day===g.clock.today);
  const first=start?.signalId?signals.find(s=>s.id===start.signalId)??null:start?.holdingId?signals.find(s=>s.holdingId===start.holdingId)??null:null;
  const [sig,setSig]=useState<Signal|null>(first);
  const [hid,setHid]=useState<number|null>(first?.holdingId??start?.holdingId??null);
  const [made,setMade]=useState<Judgment|null>(null),[done,setDone]=useState(false);
  const holding=holdings.find(h=>h.id===hid)??null;
  const leave=()=>{if(made&&onBury)onBury(made.holdingId);else onClose()};
  if(!holding){
    const open=signals.filter(s=>!judged(s.holdingId)),closed=signals.filter(s=>judged(s.holdingId));
    return <Sheet kicker="오늘 브리핑" title={open.length?`신호 ${open.length}건`:UI.noSignal} onClose={onClose} label="오늘 브리핑">
      {signals.length===0&&<p className="rt-empty">{UI.noSignal}</p>}
      {[...open,...closed].map(s=>{const a=analystById(s.analyst),h=holdings.find(x=>x.id===s.holdingId)!;return <button key={s.id} type="button" className="rt-row" onClick={()=>{setSig(s);setHid(s.holdingId)}}>
        <Face id={a.id} name={a.name} sm/><div><strong>{h.name}</strong><small>{a.name} · {MODEL_INFO[s.model].name} · {s.headline}</small></div>
        {judged(s.holdingId)?<span className="rt-tag ok">기록함</span>:<span className={`rt-tag ${s.loss?'signal':''}`}>{s.loss?'신호':'참고'}</span>}</button>})}
    </Sheet>;
  }
  const a=sig?analystById(sig.analyst):null;
  // the analyst remembers the player's last call on this company (core/recall.ts)
  const recall=sig?recallOf(sig.analyst,g.s.judgments,g.s.graded,g.clock.today,holding.id):null;
  return <Sheet kicker={a?`${a.name} · ${MODEL_INFO[sig!.model].name}`:'판단 기록'} title={holding.name} onClose={leave} label="브리핑">
    {sig&&<NoteCard sig={sig} trustStage={stageFor(g.s.trust[sig.analyst].stage)} onDeep={!made&&onDeep?()=>onDeep(holding.id):undefined}/>}
    {sig&&!made&&recall&&<Said id={sig.analyst} name={analystById(sig.analyst).name} style={{marginTop:10}}>{say(LINES.remember[sig.analyst][recall.kind],g.clock.today+holding.id,recall)}</Said>}
    {!made&&(onWrite?<button type="button" className="rt-btn primary wide" style={{marginTop:16}} onClick={()=>onWrite(holding.id,sig?.id??null)}>이 종목 일지 쓰기</button>
      :<JudgeForm holding={holding} sig={sig} g={g} onDone={setMade}/>)}
    {made&&!done&&<>
      <div className="rt-note" style={{marginTop:12}}><div className="rt-kicker">기록됨</div>
        <p className="rt-headline" style={{margin:'6px 0 2px'}}>{CHOICE_LABEL[made.choice]} · 확신 {made.confidence}</p><p className="rt-say">{made.reason}</p></div>
      <Rebuttal j={made} sig={sig} g={g} onDone={()=>setDone(true)}/></>}
    {done&&made&&<div className="rt-reveal" role="status">
      {onBury&&<Pack j={made}/>}
      <small>채점 예정</small><strong className="rt-num">{formatDay(shiftDay(made.day,30),g.clock.today)} · {formatDay(shiftDay(made.day,90),g.clock.today)}</strong>
      <Said id={a?.id??'luon'} name={a?.name??'루온'}>{say(LINES.signedOff[a?.id??'luon'],made.id)}</Said>
      {onBury?<button type="button" className="rt-btn primary" style={{marginTop:12,width:'100%'}} onClick={leave}>{holding.name} 저장</button>
        :<button type="button" className="rt-btn" style={{marginTop:12,width:'100%'}} onClick={onClose}>닫기</button>}</div>}
  </Sheet>;
}

// The grade reveal (redesign 4-2): the moment the loop is built around. One at a time, oldest first.
// Opening one plays a short sequence (core/reveal.ts): the move counts up from 0 with a ticking counter, the verdict
// stamps down (and the holding tree in the garden sparkles or sheds leaves, onStamp), then the score and the lines.
// A tap on the result skips to the end; reduced motion shows the end at once.
function useReveal(key:string,onStamp:()=>void,hit:boolean){
  const [ms,setMs]=useState(0),phase=revealPhase(ms);
  useEffect(()=>{if(still()){setMs(REVEAL_TOTAL);return}
    const t0=performance.now();let id=0;const step=(now:number)=>{const e=now-t0;setMs(e);if(e<TIMING.revealCount)cue('grade-count');if(e<REVEAL_TOTAL)id=requestAnimationFrame(step)};
    id=requestAnimationFrame(step);return()=>cancelAnimationFrame(id)},[key]);
  const stamped=phase!=='count';
  useEffect(()=>{if(!stamped)return;cue('grade-stamp');cue(hit?'grade-hit':'grade-miss');onStamp()},[stamped,key]);// eslint-disable-line react-hooks/exhaustive-deps
  return {ms,phase,skip:()=>setMs(REVEAL_TOTAL)};
}
// luon's line on a grade (the reveal and the share card say the same)
const verdictOf=(j:Judgment,gr:Graded,mark:Mark)=>{const sure=j.confidence>=4;return say(gr.hit?(sure?LINES.gradeHitSure:LINES.gradeHitUnsure):(sure?LINES.gradeMissSure:LINES.gradeMissUnsure),j.id+mark,{c:j.confidence})};
function Reveal({j,mark,gr,onStamp,children,then}:{j:Judgment;mark:Mark;gr:Graded;onStamp:()=>void;children:(done:boolean)=>React.ReactNode;then?:string}){
  const {ms,phase,skip}=useReveal(j.id+mark,onStamp,gr.hit),a=j.analyst?analystById(j.analyst):null,sure=j.confidence>=4,done=phase==='done';
  const verdict=verdictOf(j,gr,mark);
  const shown=phase==='count'?revealValue(gr.after,ms):gr.after;
  return <>
    <div className="rt-verdict" data-phase={phase} onClick={done?undefined:skip}>
      <div className="rt-kicker">그 뒤 {mark}일</div>
      <div className="rt-big-row">
        <div className={`rt-big rt-num ${shown<0?'rt-down':shown>0?'rt-up':''}`} data-testid="reveal-move"><Num v={shown}/></div>
        {phase!=='count'&&<div className={`rt-stamp ${gr.hit?'hit':'miss'}`} aria-hidden>{gr.hit?'적중':'빗나감'}</div>}
      </div>
      <div className="rt-then">
        <div><span>{then??`${mark}일 전 너`}</span><b>{CHOICE_LABEL[j.choice]} · 확신 {j.confidence}</b><small>{j.reason}</small></div>
        <div><span>결과</span>{phase==='count'?<b className="rt-mute">세는 중</b>:<><b className={gr.hit?'rt-hit':'rt-miss'}>{gr.hit?'판단 적중':'판단 빗나감'}</b>
          {done&&<small className="rt-num rt-fade">점수 {gr.points>0?'+':''}{gr.points}</small>}</>}</div>
      </div>
      {done&&<div className="rt-fade">
        <Said id="luon" name="루온" style={{marginTop:14}}>{verdict}</Said>
        {a&&gr.signalRight!==null&&<Said id={a.id} name={a.name} style={{marginTop:8}}>{say((gr.signalRight?LINES.signalRight:LINES.signalWrong)[a.id],j.id+mark)} <span className="rt-hint">{MODEL_INFO[j.model as keyof typeof MODEL_INFO]?.name} 신호 {gr.signalRight?'적중':'빗나감'}</span></Said>}
      </div>}
    </div>
    {children(done)}
  </>;
}
// start: the judgment whose capsule was tapped (W3) · onDig: its capsule comes up out of the ground while the memo shows
export function Grades({g,onClose,onStamp,onFocus,onRewind,start,onDig}:{g:G;onClose:()=>void;onStamp?:(holdingId:number,hit:boolean)=>void;onFocus?:(holdingId:number|null)=>void;onRewind?:()=>void;start?:string;onDig?:(holdingId:number)=>void}){
  const [shown,setShown]=useState<{j:Judgment;mark:Mark;gr:Graded}|null>(null),[sharing,setSharing]=useState(false);
  const next=(start&&g.due.find(d=>d.judgment.id===start))||g.due[0];
  const buried=!!next&&g.s.holdings.some(h=>h.id===next.judgment.holdingId);
  useEffect(()=>{if(!shown&&next&&buried)onDig?.(next.judgment.holdingId)},[shown,next?.judgment.id,next?.mark]);// eslint-disable-line react-hooks/exhaustive-deps
  // the garden looks at the tree whose grade this is (Scene3D FollowCam focus)
  const focusId=shown?.j.holdingId??next?.judgment.holdingId??null;
  useEffect(()=>{onFocus?.(focusId)},[focusId]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>onFocus?.(null),[]);// eslint-disable-line react-hooks/exhaustive-deps
  if(!shown&&!next)return <Sheet kicker="채점" title="확인할 채점 없음" onClose={onClose}><p className="rt-empty">채점은 기록한 날로부터 30일 뒤에 나와요</p>
    {onRewind&&<button type="button" className="rt-btn primary" style={{width:'100%'}} onClick={onRewind}>기다리는 동안 되감기 1판</button>}</Sheet>;
  if(!shown){const d=next;return <Sheet kicker={`채점 결과 ${g.due.length}건`} title={`${d.mark}일 전 내 판단`} onClose={onClose}>
    <div key={d.judgment.id+d.mark} className={`rt-note${buried?' rt-capsule-memo':''}`}><div className="rt-note-head"><div><strong>{d.judgment.name}</strong><small>{buried?line(UI.capsuleMemo,{when:formatDay(d.judgment.day,g.clock.today)}):`${formatDay(d.judgment.day,g.clock.today)} 기록`}</small></div></div>
      <p className="rt-headline">{CHOICE_LABEL[d.judgment.choice]} · 확신 {d.judgment.confidence}</p><p className="rt-say">{d.judgment.reason}</p></div>
    <button type="button" className="rt-btn primary" style={{width:'100%',marginTop:16}} onClick={()=>setShown({j:d.judgment,mark:d.mark,gr:g.ops.openGrade(d.judgment,d.mark)})}>결과 보기</button>
  </Sheet>}
  const {j,mark,gr}=shown;
  // W4: the grade as a picture to show someone (ui/Share.tsx)
  if(sharing)return <ShareSheet card={shareCard(j,gr,verdictOf(j,gr,mark),'루온')} onClose={()=>setSharing(false)}/>;
  return <Sheet kicker={`${mark}일 채점 · ${j.name}`} title={`${j.name} · ${mark}일 채점`} onClose={onClose} label="채점 결과">
    <Reveal key={j.id+mark} j={j} mark={mark} gr={gr} onStamp={()=>onStamp?.(j.holdingId,gr.hit)}>
      {done=>done&&<div className="rt-fade" style={{display:'flex',gap:8,marginTop:18}}>
        <button type="button" className="rt-btn primary wide" onClick={()=>g.due.length?setShown(null):onClose()}>{g.due.length?`다음 결과 (${g.due.length})`:'닫기'}</button>
        <button type="button" className="rt-btn" onClick={()=>setSharing(true)}>공유하기</button></div>}
    </Reveal>
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
  return <Sheet kicker={`오늘의 케이스 · ${c.sector} · ${c.when}`} title={ans?c.reveal.name:'이 회사, 어떻게 됐을까요?'} onClose={onClose} label="오늘의 케이스">
    {!ans&&<><div className={`rt-timer${left<=10?' low':''}`} aria-label={`남은 시간 ${left}초`}><i style={{width:`${left/CASE.seconds*100}%`}}/></div>
      <p className="rt-hint">{UI.caseIntro} <span className="rt-num">{left}초</span></p></>}
    <div className="rt-facts" style={{marginTop:10}}>{c.facts.map(f=><div key={f.k}><span>{f.k}</span><b>{f.v}</b></div>)}</div>
    {hint&&<div className="rt-note" style={{marginTop:10}}><div className="rt-note-head"><Face id={ha.id} name={ha.name} sm/><div><strong>{ha.name} · {hm.name}</strong><small>힌트 카드</small></div></div><p className="rt-say">{h0.text}</p></div>}
    <p className="rt-headline" style={{marginTop:16}}>{c.question}</p>
    <div className="rt-seg" style={{['--n' as string]:1}} role="group" aria-label="답">
      {c.choices.map(ch=><button key={ch.id} type="button" disabled={!!ans} aria-pressed={ans?.choice===ch.id}
        style={ans&&ch.id===c.answer?{borderColor:'var(--rt-accent)',color:'var(--rt-accent)'}:undefined} onClick={()=>answer(ch.id)}>{ch.label}</button>)}
    </div>
    {!ans&&!hint&&<button type="button" className="rt-btn ghost" style={{marginTop:8}} onClick={()=>setHint(true)}><Bulb size={16}/>모델 카드 힌트 (점수 {CASE.hintPoints})</button>}
    {ans&&<div className="rt-reveal" role="status">
      <small>{c.reveal.name} · {c.reveal.year}</small>
      <strong>{ans.correct?line(UI.caseRight,{model:first.name}):ans.choice?line(UI.caseWrong,{model:first.name}):UI.caseTimeout}</strong>
      <p>{c.reveal.what}</p><p>{c.reveal.lesson}</p>
      <p className="rt-num">+{ans.points}점{run?.counted?` · ${line(UI.streak,{n:run.count})}`:prior?' · 오늘 이미 풀었어요':''}</p>
    </div>}
    {ans&&<p className="rt-hint" style={{marginTop:10}}>출처: {c.source}</p>}
  </Sheet>;
}

// First visit: one of today's signals put 30 days back (core/judgment.ts LOOKBACK). The player judges it, and the
// grade reveal opens straight after (onJudged → the Grades sheet).
// 지기 (docs/jigi.md, core/jigi/lookback.ts): written as a one-page journal as of then — up or down over the month, why,
// and how sure (optional); graded at once against the mock closes and kept as a practice page.
export type LookbackPick={dir:'상승'|'하락';reason:string;conf:string};
export function LookBack({g,sig,holding,onJudged,onClose}:{g:G;sig:Signal;holding:Holding;onJudged:(p:LookbackPick)=>void;onClose:()=>void}){
  const a=analystById(sig.analyst);
  return <Sheet kicker={`되돌아보기 · ${LOOKBACK}일 전`} title={holding.name} label="되돌아보기" onClose={()=>{g.ops.skipLookback();onClose()}}>
    <div className="rt-note-head" style={{marginBottom:12}}><Face id={a.id} name={a.name}/>
      <div><strong>{say(LINES.lookbackIntro[a.id],sig.id,{n:LOOKBACK})}</strong><small>{line(UI.lookbackNote,{n:LOOKBACK})}</small></div></div>
    <NoteCard sig={sig} trustStage={stageFor(g.s.trust[sig.analyst].stage)}/>
    <LookbackForm name={holding.name} onDone={onJudged}/>
  </Sheet>;
}

function LookbackForm({name,onDone}:{name:string;onDone:(p:LookbackPick)=>void}){
  const [dir,setDir]=useState<'상승'|'하락'|null>(null),[reason,setReason]=useState(''),[conf,setConf]=useState('');
  const ok=!!dir&&reason.trim().length>0;
  return <form className="jg-look" aria-label="그때의 일지" onSubmit={e=>{e.preventDefault();if(ok)onDone({dir:dir!,reason,conf})}}>
    <p className="jg-diary">그때 {name} 주가는 한 달 안에
      <span className="rt-seg jg-look-dir" role="group" aria-label="방향">{(['상승','하락'] as const).map(d=><button key={d} type="button" aria-pressed={dir===d} onClick={()=>setDir(d)}>{d==='상승'?'오를':'내릴'}</button>)}</span>
      것 같았다.</p>
    <label className="jg-q"><span className="jg-prompt">왜 그렇게 생각했나요?</span>
      <textarea className="jg-lined" rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="예: 적자가 길어서 반등은 아직 이르다고 봤다." aria-label="이유"/></label>
    <div className="jg-q"><span className="jg-prompt">확신 (골라도 되고 안 골라도 돼요)</span>
      <div className="rt-seg" role="group" aria-label="확신">{['낮음','보통','높음'].map(c=><button key={c} type="button" aria-pressed={conf===c} onClick={()=>setConf(conf===c?'':c)}>{c}</button>)}</div></div>
    <button type="submit" className="rt-btn primary wide" disabled={!ok}>기록하고 결과 보기</button>
    <p className="rt-hint" style={{marginTop:8}}>연습 일지로 남아요. 내 성적에는 들어가지 않아요.</p>
  </form>;
}

// 되감기 (core/rewind.ts): a made-up company at a past moment, the analyst's note, the same call as in the real loop,
// and the 30 days after revealed at once with the grade reveal above. Round after round; the first few a day pay.
export function RewindView({g,onClose}:{g:G;onClose:()=>void}){
  const [idx,setIdx]=useState(g.s.rewinds.length);
  const rc=useMemo(()=>rewindProvider.round(idx),[idx]);
  const [choice,setChoice]=useState<Choice|null>(null),[conf,setConf]=useState<Confidence|null>(null),[round,setRound]=useState<RewindRound|null>(null);
  const left=paidLeft(g.s.rewinds,g.clock.today);
  const next=()=>{setIdx(i=>i+1);setChoice(null);setConf(null);setRound(null)};
  const j:Judgment={id:rc.id,holdingId:-1,name:rc.name,day:g.clock.today,choice:choice??'hold',reason:'',confidence:conf??3,rate:rc.rate,
    signalId:rc.loss?rc.sig.id:undefined,analyst:rc.sig.analyst,model:rc.sig.model};
  const gr:Graded|null=round&&{judgmentId:rc.id,mark:REWIND.mark,after:round.after,hit:round.hit,signalRight:round.signalRight,points:round.points,day:g.clock.today};
  return <Sheet kicker={`되감기 · 연습 · 가상 회사 · ${idx+1}번째 판`} title={rc.name} label="되감기" onClose={onClose}>
    {!round&&<>
      <div className="rt-facts"><div><span>업종</span><b>{rc.sector}</b></div><div><span>보유</span><b>{rc.held}</b></div>
        <div><span>그때 수익률</span><b className={`rt-num ${rc.rate<0?'rt-down':'rt-up'}`}><Num v={rc.rate}/></b></div></div>
      <div style={{marginTop:10}}><NoteCard sig={rc.sig} trustStage={stageFor(g.s.trust[rc.sig.analyst].stage)}/></div>
      <p className="rt-headline" style={{marginTop:16}}>이때라면 어떻게 할까요?</p>
      <div className="rt-seg" role="group" aria-label="판단">
        {CHOICES.map(c=><button key={c.id} type="button" aria-pressed={choice===c.id} onClick={()=>setChoice(c.id)}>{c.label}<small>{c.sub}</small></button>)}</div>
      <div className="rt-field">확신도<div className="rt-conf" role="group" aria-label="확신도">{([1,2,3,4,5] as Confidence[]).map(n=>
        <button key={n} type="button" aria-pressed={conf===n} onClick={()=>setConf(n)}>{n}</button>)}</div></div>
      <button type="button" className="rt-btn primary" style={{width:'100%',marginTop:18}} disabled={!choice||!conf}
        onClick={()=>setRound(g.ops.playRewind(rc,choice!,conf!))}>결과 보기</button>
      <p className="rt-hint" style={{marginTop:10}}>{left?`오늘 보상 남은 판 ${left} · 가상 회사 · 모의 데이터`:'오늘 보상은 모두 받았어요 · 연습은 계속할 수 있어요'}</p>
    </>}
    {round&&gr&&<Reveal key={rc.id} j={j} mark={REWIND.mark} gr={gr} onStamp={()=>{}} then="그때 너">{done=>done&&<div className="rt-fade">
      {round.paid&&<p className="rt-hint" style={{marginTop:12}}>+{EARN.rewind+(round.hit?EARN.rewindHit:0)} {CURRENCY}</p>}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button type="button" className="rt-btn primary wide" onClick={next}>다음 판</button>
        <button type="button" className="rt-btn" onClick={onClose}>그만</button></div></div>}</Reveal>}
  </Sheet>;
}
