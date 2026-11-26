'use client';
// 오늘의 관측소 (daily_quest_design v1, 3장): the master's lesson → the portfolio → three scenes (자료 / 내 일지, the
// hypothesis and 보유·부분매도 confirmed together) → the result (the two scores, the reveal, the ranking, the XP).
// Everything typed is a draft in the save at once, so closing or rotating comes back to the same place. The game stays
// in the game: nothing here opens or writes a 지기 journal. ?quest opens it straight away (tests).
import '../game.css';
import './daily.css';
import {useEffect,useRef,useState} from 'react';
import {blankFields,defOf,frac,fractionLabel,DIRS,SHIFTS,FIELD_LABEL,FRACTIONS,closeOf,companiesOf,aliasOf,targetOf,fmul,splitFactor,packOfRun,decide as decideLocal,fillsOf,fval,hypoLine,leftAfter,missingOf,partsOf,titleOf,type DailyPack,type DailyRun,type FieldKey,type Fields,type Fill,type Frac,type QuestDef,type Scene} from '../../../core/game/daily/model';
import {DIM_LABEL,WEIGHTS} from '../../../core/game/daily/judge';
import {placed,sampleDailyRanking,type DailyRow} from '../../../core/game/daily/ranking';
import {summaryOf} from '../../../core/game/daily/settle';
import type {ObservatoryServer} from '../../supabase';
import {packById} from '../../../content/daily/packs';
import {QuestChart} from './QuestChart';
import {Flow} from './Flow';
import {FACE} from '../Moment';
import {Cross} from '../../ui/Icons';
import type {useGarden} from '../../state';
type G=ReturnType<typeof useGarden>;
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const shares=(q:Frac)=>{const v=fval(q);return Number.isInteger(v)?v.toLocaleString('ko-KR'):v.toLocaleString('ko-KR',{maximumFractionDigits:2})};
const pct=(x:number,d=2)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(d)}`;
const cls=(x:number)=>x>0.004?'rt-up':x<-0.004?'rt-down':'';
const PROMPT:Record<FieldKey,string>={hypo:'이 자료로 회사에 대한 내 판단은?',reason:'그렇게 보는 근거는? 자료 하나를 고르고 한 줄로',counter:'내 가설이 틀릴 수 있는 경우는?',recheck:'어떤 일이 생기면 다시 볼까?',
  shift:'지난 장면의 내 판단과 비교하면?'};
// the weighing day (evFrom focus): the two focus cards point different ways
const PROMPT_WEIGH='두 자료가 서로 다른 쪽을 가리켜요. 더 무겁게 본 자료를 고르고, 왜인지 한 줄로';
// what the day asks to fill, in words (the portfolio page says it before scene 1)
function fieldsLine(q:QuestDef){return q.fields.map(k=>k==='hypo'&&q.aid?`가설(${[q.aid.target==='choose'?'대상 고르기':null,q.aid.period==='choose'?'시점 고르기':null,'방향 고르기','이유 한 줄'].filter(Boolean).join(' · ')})`
  :k==='reason'&&q.evFrom==='focus'?'근거(두 자료 중 하나)':k==='shift'?'판단 변화(장면 2부터)':FIELD_LABEL[k]).join(' · ')}
const NAME={tori:'토리',moa:'모아',luon:'루온'} as const;
// quest-settle's refusals, in words (db/functions/quest-settle, core/game/daily/server.ts)
const SYNC_ERR:Record<string,string>={locked:'앞 과제가 서버에 없어요. 로그인 전에 한 판은 이 기기에만 있어요',day:'날짜가 맞지 않아요',invite:'아직 서버에 계정이 준비되지 않았어요. 잠시 뒤 다시 해 주세요',
  'sign-in':'로그인이 풀렸어요',pack:'판 버전이 달라요',retry:'잠시 뒤 다시 시도해 주세요'};

// server: signed in (quest-settle); null keeps everything on this device
export function DailyQuest({g,runId,onClose,server=null}:{g:G;runId:string;onClose:()=>void;server?:ObservatoryServer|null}){
  const run=g.s.observatory?.runs.find(r=>r.id===runId)??null,pack=run?packOfRun(run,packById):null;
  useEffect(()=>{const hk=((window as {__proto3d?:{quest?:unknown}}).__proto3d??={} as {quest?:unknown});
    hk.quest=run?{stage:run.stage,scene:run.scene,quest:run.quest,mode:run.mode,decisions:run.decisions.length,done:run.finishedAt!==null,xp:run.result?.xp.xp??null,play:run.play??null}:null;
    return()=>{hk.quest=null}},[run]);
  if(!run||!pack)return <div className="gx gxq"><p>판을 불러오지 못했어요.</p><button type="button" className="gx-btn" onClick={onClose}>닫기</button></div>;
  const q=defOf(run);
  const close=<button type="button" className="gx-x" aria-label="관측소 닫기" onClick={onClose}><Cross size={16}/></button>;
  const top=(kick:string,title:string,extra?:React.ReactNode)=><div className="gx-top"><div><div className="gx-kick">{kick}</div><div className="gx-title">{title}</div></div>
    <div className="dq-top-r">{run.mode==='practice'&&<span className="gx-pill">연습</span>}{extra}{close}</div></div>;
  return <div className={`gx gxq${run.stage==='scene'&&!run.play?' wide':''}`} role="dialog" aria-label="오늘의 관측소" data-testid="daily-quest" data-stage={run.stage}>
    {run.stage==='lesson'&&<>{top(`오늘의 관측소 · ${q.name}`,'오늘의 투자 수업')}<Lesson pack={pack} level={q.level} onNext={()=>g.ops.questStage(run.id,'portfolio')}/></>}
    {run.stage==='portfolio'&&<>{top(`오늘의 관측소 · ${q.name}`,'포트폴리오')}<Portfolio pack={pack} q={q} onBack={()=>g.ops.questStage(run.id,'lesson')} onNext={()=>g.ops.questBegin(run.id)}/></>}
    {/* the market plays between moments (feedback F4); the scene or the result opens when it stops */}
    {run.play&&(run.stage==='scene'||run.stage==='result')&&<Flow key={`${run.play.from}-${run.play.to}`} g={g} run={run} pack={pack} top={top}/>}
    {!run.play&&run.stage==='scene'&&<SceneView key={run.scene} g={g} run={run} pack={pack} top={top} server={server}/>}
    {!run.play&&run.stage==='result'&&run.result&&<>{top(`오늘의 관측소 · ${q.name} · 결과`,'평가일의 기록')}<Result g={g} run={run} pack={pack} onClose={onClose} server={server}/></>}
  </div>;
}

export function Mono({pack,big}:{pack:DailyPack;big?:boolean}){
  // a portrait only when its rights were checked (it reaches the pack only then); otherwise the name's monogram
  const p=pack.mentor.portrait;
  return <div className={`dq-mentor${big?' big':''}`}>{p?<img className="dq-mono" src={p.uri} alt={p.alt}/>:<span className="dq-mono" aria-hidden>{pack.mentor.monogram}</span>}
    <div><strong>{pack.mentor.name}</strong><small>{pack.mentor.label}</small>{p&&<small>초상 · {p.credit}</small>}</div></div>;
}

function Lesson({pack,level,onNext}:{pack:DailyPack;level:number;onNext:()=>void}){
  const m=pack.mentor;
  return <><div className="dq-scroll">
    <section className="gx-panel dq-sec gx-in"><Mono pack={pack} big/>
      <p className="dq-k">이 사람이 중요하게 본 문제</p><p>{m.problem}</p></section>
    <section className="gx-panel dq-sec gx-in" style={{animationDelay:'80ms'}}><p className="dq-k">오늘의 명제</p><p className="dq-principle" data-testid="dq-principle">{m.principle}</p>
      <dl className="dq-dl"><dt>왜 통하나</dt><dd>{m.why}</dd><dt>언제 쓰나</dt><dd>{m.applies}</dd><dt>언제 깨지나</dt><dd>{m.breaks}</dd></dl>
      <details className="dq-more"><summary>서한 맥락과 용어</summary><p>{m.context}</p>{m.terms.map(t=><p key={t.word}><b>{t.word}</b> · {t.meaning}</p>)}</details></section>
    {level===1&&<section className="gx-panel dq-sec gx-in" style={{animationDelay:'160ms'}}><p className="dq-k">시범 · 다른 사례에 적용해 보면</p>
      <p>{m.demo.fact}</p><p className="dq-quote">{m.demo.line}</p><p className="gx-note">{m.demo.how}</p></section>}
  </div><button type="button" className="gx-btn" onClick={onNext}>포트폴리오 보기</button></>;
}

function Portfolio({pack,q,onBack,onNext}:{pack:DailyPack;q:QuestDef;onBack:()=>void;onNext:()=>void}){
  const s=pack.scenes[0],cos=companiesOf(pack),val=cos.reduce((v,c)=>v+c.qty*closeOf(pack,c.slot,s.tick),0),many=cos.length>1;
  return <><div className="dq-scroll">
    <section className="gx-panel dq-sec" data-testid="dq-portfolio"><p className="dq-k">내 계좌 · 기준 통화 {pack.currency}</p>
      {cos.map(c=><div key={c.slot} className="dq-co"><span className="gx-tag">{c.slot}</span><div><strong>{c.alias} <small className="gx-note">가명</small></strong><small>{c.business}</small>
        <small className="gx-mono">{c.qty}주 · {won(c.qty*closeOf(pack,c.slot,s.tick))}{pack.currency}</small></div></div>)}
      {many&&<p className="gx-note">장면마다 판단할 종목이 하나씩 정해져요. 나머지는 비교 자료로 보고, 판단하지 않은 종목도 계속 보유한 것으로 성과에 들어가요.</p>}
      <dl className="dq-dl two"><dt>평가액</dt><dd className="gx-mono">{won(val)}{pack.currency}</dd>
        <dt>현금</dt><dd className="gx-mono">{won(pack.cash)}{pack.currency}</dd><dt>총자산</dt><dd className="gx-mono">{won(val+pack.cash)}{pack.currency}</dd></dl></section>
    <section className="gx-panel dq-sec"><p className="dq-k">장면 1 · {s.title}</p><p>{s.situation}</p></section>
    <section className="gx-panel dq-sec"><p className="dq-k">오늘 쓸 칸{q.tier?` · ${q.tier}`:''}</p><p>{fieldsLine(q)}</p>
      <p className="gx-note">시장이 하루씩 흐르다 장면마다 멈춰요. 멈춘 순간 새 일지에 가설과 판단(보유 또는 1/8·1/4·1/2 매도)을 함께 확정해요. 매도는 다음 거래일 시가에 체결돼요. 시간 제한은 없어요.</p>
      {pack.market&&<p className="gx-note" data-testid="dq-market">시장 규칙 · {pack.market.label} · 수수료 {Math.round(pack.market.fee*1000)/10}% · 체결은 다음 거래일 시가 그대로</p>}</section>
  </div><div className="dq-row"><button type="button" className="gx-btn ghost" onClick={onBack}>수업 다시 보기</button><button type="button" className="gx-btn" onClick={onNext}>장면 1 시작</button></div></>;
}

function SceneView({g,run,pack,top,server}:{g:G;run:DailyRun;pack:DailyPack;top:(k:string,t:string,x?:React.ReactNode)=>React.ReactNode;server:ObservatoryServer|null}){
  const s=pack.scenes[run.scene],q=defOf(run),f={...blankFields(),...run.drafts[s.id]},pick=run.picks[s.id]??null;
  const [past,setPast]=useState(false),[tab,setTab]=useState<'data'|'journal'>('data'),[help,setHelp]=useState(false),[miss,setMiss]=useState<FieldKey[]>([]),[noPick,setNoPick]=useState(false),[src,setSrc]=useState<string|null>(null);
  const target=targetOf(s),many=companiesOf(pack).length>1,[chartSlot,setChartSlot]=useState(target);
  const {held,fills,at}=fillsOf(pack,run.decisions),qty=fmul(held[target],splitFactor(pack,at,s.tick,target)),after=leftAfter(pack,run.decisions,pick,s.tick,target);
  const prev=run.decisions[run.scene-1]??null,prevFill=fills[run.scene-1]??null;
  const visible=pack.scenes.filter(x=>x.no<=s.no).flatMap(x=>x.cards);
  const set=(p:Partial<Fields>)=>{setMiss([]);g.ops.questDraft(run.id,s.id,p)};
  // an official pack: the decision is committed on the server first, which then sends the next scene (official.ts)
  const official=!!run.dto&&!packById(run.pack),[busy,setBusy]=useState(false),[srvErr,setSrvErr]=useState<string|null>(null),[ask,setAsk]=useState<string|null>(null);
  const confirm=async()=>{
    if(busy)return;
    if(official){const chk=decideLocal(pack,run,s.id,Date.now());
      if('error' in chk){if(chk.error==='missing'||chk.error==='choice'){setMiss(chk.missing??[]);setNoPick(!pick);setTab('journal')}return}
      if(!server){setSrvErr('로그인이 풀려서 공식 판을 이어 갈 수 없어요.');return}
      setBusy(true);setSrvErr(null);const res=await server.decide(run.id,{scene:s.id,fraction:pick!,fields:f});setBusy(false);
      if(!res||'error' in res){setSrvErr(res&&'error' in res&&res.error==='retry'?'다른 곳에서 먼저 확정됐어요. 다시 열어 주세요.':'서버에 확정하지 못했어요. 잠시 뒤 다시 눌러 주세요.');return}
      g.ops.questDto(run.id,res.dto);g.ops.questDecide(run.id,s.id);return}
    const r=g.ops.questDecide(run.id,s.id);if(r.ok)return;
    // say everything that is missing at once: the empty fields and, if none is picked, the decision
    if(r.error==='missing'||r.error==='choice'){setMiss(r.missing??[]);setNoPick(!pick);setTab('journal')}};
  // official runs: what is being written goes to the server a moment after typing stops (design 8 PUT draft)
  const [sync,setSync]=useState<'idle'|'saving'|'saved'|'local'|{drafts:Record<string,Partial<Fields>>;revision:number}>('idle');
  const fKey=JSON.stringify(f);
  useEffect(()=>{if(!official||!server)return;const id=setTimeout(()=>{setSync('saving');
    void server.draft(run.id,s.id,f,run.draftRev??0).then(res=>{if(!res){setSync('local');return}
      if('conflict' in res){setSync(res.conflict);return}g.ops.questDraftRev(run.id,res.revision);setSync('saved')})},1500);return()=>clearTimeout(id)},[fKey]);// eslint-disable-line react-hooks/exhaustive-deps
  const askServer=async()=>{if(!server)return;const field=(missingOf(q,f,s).find(k=>k!=='shift')??'hypo') as Exclude<FieldKey,'shift'>;setAsk('…');
    setAsk(await server.hint(run.id,field,f[field])??'지금은 질문을 받아 오지 못했어요.')};
  const ready=!missingOf(q,f,s).length&&!!pick;
  const focus:string[]=q.level<=2?[...s.focus]:[];
  return <>
    {top(`${s.no}/${pack.scenes.length} · ${s.title}${many?' · 판단할 종목':''}`,aliasOf(pack,target),<span className="gx-pill gx-mono" aria-label={`보유 ${shares(qty)}주`}>{shares(qty)}주</span>)}
    <div className="dq-tabs" role="tablist" aria-label="장면 보기"><button type="button" role="tab" aria-selected={tab==='data'} onClick={()=>setTab('data')}>자료</button>
      <button type="button" role="tab" aria-selected={tab==='journal'} onClick={()=>setTab('journal')}>내 일지{miss.length||noPick?<i className="dq-dot" aria-label="빠진 칸 있음"/>:null}</button></div>
    <div className="dq-split">
      <div className="dq-pane dq-scroll" data-on={tab==='data'} aria-label="자료">
        {prev&&<section className="gx-panel dq-sec dq-arrive" data-testid="dq-arrive"><p className="dq-k">다음 자료 도착</p>
          <p><small className="gx-note">지금 확인할 수 있는 것 · </small>{s.check??'아직 확인 전'}</p>
          {prevFill&&fval(prevFill.sold)>0&&<p className="gx-note">체결 · {many?aliasOf(pack,prevFill.slot)+' ':''}{fractionLabel(prevFill.fraction)} {shares(prevFill.sold)}주 @ {won(prevFill.price)}원 (다음 거래일 시가, 수수료 0.1%)</p>}</section>}
        <p className="dq-situation">{s.situation}</p>
        {many&&<div className="dq-tabs small" role="tablist" aria-label="차트 종목">{companiesOf(pack).map(c=><button key={c.slot} type="button" role="tab" aria-selected={chartSlot===c.slot} onClick={()=>setChartSlot(c.slot)}>{c.alias}{c.slot===target?' · 판단':''}</button>)}</div>}
        <QuestChart pack={pack} upto={s.tick} fills={fills} slot={chartSlot}/>
        <div className="dq-cards">{s.cards.map(c=><article key={c.id} className={`gx-panel dq-card${focus.includes(c.id)?' focus':''}`} data-card={c.id}>
          <header>{many&&<span className="dq-about">{aliasOf(pack,c.about??'A')}</span>}<span className="dq-kind">{c.kind}</span><small>{c.when}</small>{focus.includes(c.id)&&<em>먼저 볼 자료</em>}</header>
          <p className="dq-fact">{c.fact}</p>{c.compare&&<p className="gx-note">{c.compare}</p>}
          {c.term&&<details className="dq-more"><summary>용어 · {c.term.word}</summary><p>{c.term.meaning}</p></details>}
          <button type="button" className="dq-src" aria-expanded={src===c.id} onClick={()=>setSrc(src===c.id?null:c.id)}>출처 · {c.source}</button>
          {src===c.id&&<p className="gx-note">지금은 자료 유형과 시점만 보여요. 원문은 결과에서 공개돼요.</p>}</article>)}</div>
      </div>
      <div className="dq-pane dq-scroll" data-on={tab==='journal'} aria-label="내 일지">
        <section className="gx-panel dq-sec"><p className="dq-k">오늘의 질문</p><p className="dq-ask">{s.ask}</p>
          {q.level===1&&<p className="gx-note">두 자료를 짚어 보세요: {s.focus.map(id=>s.cards.find(c=>c.id===id)?.fact).join(' / ')}</p>}
          <p className="gx-note">명제 · {pack.mentor.principle}</p></section>
        {/* every scene is a new journal (feedback F2): the earlier ones open only on request, read-only */}
        {run.decisions.length>0&&<section className="gx-panel dq-sec" data-testid="dq-past-journal">
          <button type="button" className="dq-help" aria-expanded={past} onClick={()=>setPast(!past)}>{past?'지난 일지 접기':`지난 일지 보기 · ${run.decisions.length}`}</button>
          {past&&run.decisions.map(d=>{const ps=pack.scenes.find(x=>x.id===d.scene);if(!ps)return null;return <div key={d.scene} className="dq-past-j">
            <small className="gx-note">장면 {ps.no} · {ps.title} · {fractionLabel(d.fraction)}</small><p className="dq-quote">{hypoLine(q,ps,d.fields)}</p>
            {(['reason','counter','recheck'] as const).filter(k=>d.fields[k]).map(k=><p key={k} className="gx-note">{FIELD_LABEL[k]} · {d.fields[k]}</p>)}
            {d.fields.shift&&<p className="gx-note">판단 변화 · {d.fields.shift}</p>}</div>})}
          {!past&&<p className="gx-note">이번 장면은 새 일지예요. 지난 일지는 확정한 그대로 남아요.</p>}</section>}
        <section className="gx-panel dq-sec dq-journal" data-testid="dq-journal">
          {q.fields.map(k=>k==='hypo'?<HypoField key={k} q={q} s={s} f={f} set={set} miss={miss.includes(k)}/>
            :k==='shift'?(s.no>1?<div key={k} className={`dq-field${miss.includes(k)?' miss':''}`}><span>{FIELD_LABEL[k]} · {PROMPT[k]}</span>
              <span className="dq-chips" role="group" aria-label={FIELD_LABEL[k]}>{SHIFTS.map(x=><button key={x} type="button" aria-pressed={f.shift===x} onClick={()=>set({shift:x})}>{x}</button>)}</span>
              <small className="gx-note">위의 지난 일지 보기로 장면 {s.no-1}의 일지를 열어 볼 수 있어요. 이유는 가설 칸에 이어 써요.</small></div>:null)
            :<label key={k} className={`dq-field${miss.includes(k)?' miss':''}`}><span>{FIELD_LABEL[k]} · {k==='reason'&&q.evFrom==='focus'?PROMPT_WEIGH:PROMPT[k]}</span>
            {k==='reason'&&<span className="dq-evs" role="group" aria-label="근거 자료">{(q.evFrom==='focus'?s.focus.map(id=>visible.find(c=>c.id===id)!).filter(Boolean):visible).map(c=><button key={c.id} type="button" aria-pressed={f.ev===c.id} onClick={e=>{e.preventDefault();set({ev:c.id})}}>{c.kind} · {q.evFrom==='focus'?c.fact:c.fact.length>16?c.fact.slice(0,15)+'…':c.fact}</button>)}</span>}
            <textarea value={f[k]} rows={2} aria-label={FIELD_LABEL[k]} placeholder={PROMPT[k]}
              onChange={e=>set({[k]:e.target.value} as Partial<Fields>)}/></label>)}
          {official&&<p className="gx-note" role="status" data-testid="dq-draft-sync">{sync==='saving'?'서버에 저장하는 중…':sync==='saved'?'서버에 저장됨 · 다른 기기에서 이어 쓸 수 있어요':sync==='local'?'오프라인 · 이 기기에만 임시저장됨':
            typeof sync==='object'?<>다른 기기에서 고친 초안이 있어요. <button type="button" className="dq-help" onClick={()=>{g.ops.questTakeDrafts(run.id,sync.drafts,sync.revision);setSync('saved')}}>그 초안 불러오기</button>{' '}
              <button type="button" className="dq-help" onClick={()=>{g.ops.questDraftRev(run.id,sync.revision);setSync('idle');set({hypo:f.hypo+''})}}>내 것 유지</button></>:''}</p>}
          <button type="button" className="dq-help" aria-expanded={help} onClick={()=>setHelp(!help)}>작성 도움 {help?'접기':'보기'}</button>
          {help&&<div className="dq-hints">{(['tori','moa','luon'] as const).map(w=><div key={w} className="gx-said"><span className="gx-face" style={{backgroundImage:`url(${FACE(w)})`}}/><div><b>{NAME[w]}</b>{s.hints[w]}</div></div>)}
            {official&&server&&<><button type="button" className="dq-help" onClick={()=>void askServer()}>이 일지에 맞는 질문 받기</button>{ask&&<p className="dq-quote" data-testid="dq-ask">{ask}</p>}</>}
            <p className="gx-note">질문만 해요. 방향은 고르지 않아요.</p></div>}
        </section>
        <section className={`gx-panel dq-sec dq-decide${noPick?' miss':''}`} data-testid="dq-decide"><p className="dq-k">판단 · {aliasOf(pack,target)} · 다음 거래일 시가에 체결</p>
          <div className="dq-fr" role="group" aria-label="보유 또는 부분 매도">{FRACTIONS.map(x=><button key={x.id} type="button" aria-pressed={pick===x.id} onClick={()=>{setNoPick(false);g.ops.questPick(run.id,s.id,x.id)}}>{x.label}</button>)}</div>
          <p className="dq-left gx-mono" aria-live="polite">{shares(qty)}주 → <b>{shares(after)}주</b></p>
          {(miss.length>0||noPick)&&<p className="dq-warn" role="status">아직 비어 있어요: {[...miss.map(k=>FIELD_LABEL[k]),...(noPick?['판단']:[])].join(' · ')}</p>}
          {srvErr&&<p className="dq-warn" role="status">{srvErr}</p>}
          <button type="button" className="gx-btn" data-ready={ready&&!busy} aria-busy={busy} onClick={()=>void confirm()}>{busy?'다음 자료를 받는 중…':'가설과 판단 함께 확정'}</button></section>
      </div>
    </div>
  </>;
}

// the result in two pages (feedback F3): first the result and the reveal — my return, the return of holding, the journal
// score in one line, then the real event next to what the manager did, the standing in one line and the sources behind a
// button; then 일지 피드백 보기 — scene by scene, what I wrote and chose, where the principle was applied, one thing to
// work on (입문: the direction picked and the one line only). 결과로 돌아가기 comes back.
function Result({g,run,pack,onClose,server}:{g:G;run:DailyRun;pack:DailyPack;onClose:()=>void;server:ObservatoryServer|null}){
  const r=run.result!,q=defOf(run),{fills,held,at}=fillsOf(pack,run.decisions),[page,setPage]=useState<'result'|'journal'>('result');
  const prog=g.s.observatory?.progress,t=titleOf(prog?.total_xp??0);
  // signed in: settle on the server once (its replay and ledger replace the local ones), then read the day's ranking
  const sent=useRef(false),[busy,setBusy]=useState(false),[live,setLive]=useState<DailyRow[]|null>(null);
  useEffect(()=>{if(!server||run.synced||sent.current)return;sent.current=true;setBusy(true);
    void server.settle(run).then(res=>{setBusy(false);if(res)g.ops.questSynced(run.id,res)})},[server,run]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!server||!run.synced||run.synced.error||r.pending)return;let on=true;void server.ranking(run.dailyId,r.judge).then(x=>{if(on&&x)setLive(x)});return()=>{on=false}},[server,run.synced,run.dailyId,r.pending]);
  // 평가 중: ask the server again now and then until the judge has answered (design 7)
  useEffect(()=>{if(!server||!r.pending||!run.synced)return;let n=0;const id=setInterval(()=>{if(++n>12){clearInterval(id);return}
    void server.result(run.id).then(res=>{if(res&&!res.run.result?.pending){clearInterval(id);g.ops.questSynced(run.id,res)}})},15000);return()=>clearInterval(id)},[server,r.pending,run.synced,run.id]);// eslint-disable-line react-hooks/exhaustive-deps
  const rank=live?{rows:live,sample:false}:sampleDailyRanking(run.dailyId,run.mode==='ranked'&&!r.pending?{ret:r.excess,journal:r.journal}:null);
  // one sentence on the result: the rule sentence, reworded by the server's call C once the run is scored there
  const [said,setSaid]=useState<string|null>(null);
  useEffect(()=>{if(!server||!run.synced||run.synced.error||r.pending)return;let on=true;void server.explain(run.id).then(t=>{if(on&&t)setSaid(t)});return()=>{on=false}},[server,run.synced,r.pending,run.id]);
  const summary=said??summaryOf(r,r.scenes.flatMap(s=>s.dims).map(d=>({label:DIM_LABEL[d.key],grade:d.grade})));
  const where=!server?'이 기기 기록이에요. 로그인하면 서버에 남고 실제 순위에 들어가요.':busy?'서버에 올리는 중…':run.synced?.error?`서버에 올리지 못해서 이 기기 기록으로 남아요 (${SYNC_ERR[run.synced.error]??run.synced.error}).`:run.synced?'서버에 기록됐어요. 점수와 경험치는 서버가 다시 계산한 값이에요.':'';
  const days=pack.evalTick-pack.scenes[pack.scenes.length-1].tick;
  const [src,setSrc]=useState(false),top=useRef<HTMLDivElement>(null);const go=(p:'result'|'journal')=>{setPage(p);top.current?.scrollTo?.({top:0})};
  if(page==='journal')return <Feedback run={run} pack={pack} q={q} summary={summary} onBack={()=>go('result')}/>;
  // what I kept of each company I judged, at the evaluation day (splits applied), next to the manager's filed quarters
  const T=pack.evalTick,t0=pack.scenes[0].tick,slots=[...new Set(pack.scenes.map(targetOf))];
  const kept=slots.map(slot=>{const c=companiesOf(pack).find(x=>x.slot===slot)!;
    return {slot,alias:c.alias,start:fval(fmul(frac(c.qty),splitFactor(pack,t0,T,slot))),left:fval(fmul(held[slot]??frac(0),splitFactor(pack,at,T,slot)))}});
  const hs=pack.reveal.holdings,h0=hs[0],h1=hs[hs.length-1];
  const num=(v:number)=>Number.isInteger(v)?v.toLocaleString('ko-KR'):v.toLocaleString('ko-KR',{maximumFractionDigits:2});
  // the standing and the XP in one line
  const me=(m:'ret'|'journal')=>placed(rank.rows,m).find(x=>x.me)?.place;
  const standing=r.pending?'일지 평가가 끝나면 순위와 경험치가 들어와요.':run.mode!=='ranked'?`${r.late?'날짜가 지난 뒤 끝낸 판이라':'연습 기록이라'} 순위·경험치는 없어요 · ${t.rank} Lv.${t.level}`
    :`일지 ${me('journal')??'—'}위 · 투자 성과 ${me('ret')??'—'}위 / ${rank.rows.length}명${rank.sample?'(예시 순위)':''} · ${r.xp.met?`+${r.xp.xp} XP`:`경험치 없음(기준 ${r.xp.bar}점)`} · ${t.rank} Lv.${t.level}`;
  return <><div className="dq-scroll" data-testid="dq-result" data-page="result" ref={top}>
    <section className="gx-panel dq-sec dq-head gx-in" data-testid="dq-headline">
      <div className="dq-three"><div><small>내 수익률</small><b className={`gx-mono ${cls(r.ret)}`} data-testid="dq-ret">{pct(r.ret)}%</b></div>
        <div><small>계속 보유 수익률</small><b className={`gx-mono ${cls(r.holdRet)}`}>{pct(r.holdRet)}%</b></div>
        <div><small>일지 점수</small>{r.pending?<b className="dq-score-wait" data-testid="dq-pending">평가 중</b>:<b className="gx-mono" data-testid="dq-journal-score">{r.journal}</b>}</div></div>
      <p className="gx-note">마지막 판단 뒤 {days}거래일, 평가일 종가 기준 · 계속 보유보다 {pct(r.excess)}%p</p></section>
    <section className="gx-panel dq-sec gx-in" data-testid="dq-reveal-card"><p className="dq-k">사례 공개 · {pack.reveal.period}</p>
      <p className="dq-reveal" data-testid="dq-reveal">{pack.reveal.company}</p><p>{pack.reveal.event}</p>
      <div className="dq-compare" data-testid="dq-compare">
        <div><small>내 판단</small>{kept.map(k=><p key={k.slot}>{kept.length>1?`${k.alias} `:''}{num(k.start)}주 중 <b>{num(k.left)}주</b> 유지</p>)}</div>
        <div><small>{pack.reveal.manager} · 분기 말 공시 수량</small>{h0&&h1&&<p>{h0.quarter} {h0.shares.toLocaleString('ko-KR')}주 → {h1.quarter} <b>{h1.shares.toLocaleString('ko-KR')}주</b>
          {h0.shares>0&&<span className="gx-note"> ({pct((h1.shares/h0.shares-1)*100,0)}%)</span>}</p>}</div></div>
      <p className="gx-note">{pack.reveal.holdingsNote}</p>
      <button type="button" className="dq-help" aria-expanded={src} onClick={()=>setSrc(!src)}>{src?'원문 접기':'원문 보기'}</button>
      {src&&<div data-testid="dq-sources"><p className="gx-note">{pack.reveal.summary}</p><ul className="dq-src-list">{pack.reveal.sources.map(x=><li key={x.card}>{x.title}</li>)}</ul></div>}</section>
    <p className="dq-standing gx-in" data-testid="dq-standing">{standing}</p>
    {where&&<p className="gx-note" data-testid="dq-sync" role="status">{where}</p>}
    <section className="gx-panel dq-sec gx-in"><p className="dq-k">평가일까지의 주가와 내 체결</p>
      <QuestChart pack={pack} upto={pack.evalTick} fills={fills} label="평가일까지의 주가"/>
      <ul className="dq-fills">{run.decisions.map((d,i)=>{const s=pack.scenes.find(x=>x.id===d.scene)!,fl:Fill|undefined=fills[i];return <li key={d.scene}>장면 {s.no} · {aliasOf(pack,targetOf(s))} · {fractionLabel(d.fraction)}{fl&&fval(fl.sold)>0?<span className="gx-mono"> · {shares(fl.sold)}주 @ {won(fl.price)}원</span>:null}</li>})}</ul></section>
  </div><div className="dq-row even"><button type="button" className="gx-btn ghost" onClick={onClose}>관측소로 돌아가기</button><button type="button" className="gx-btn" onClick={()=>go('journal')}>일지 피드백 보기</button></div></>;
}

// the second page: the journal, scene by scene (feedback F3)
function Feedback({run,pack,q,summary,onBack}:{run:DailyRun;pack:DailyPack;q:QuestDef;summary:string;onBack:()=>void}){
  const r=run.result!,[k,setK]=useState(0),intro=q.level===1;
  const sg=r.scenes[k],d=run.decisions[k],s=sg?pack.scenes.find(x=>x.id===sg.scene):null,fc=r.forecast?.items.find(x=>x.scene===s?.id);
  const p=s&&d?partsOf(q,s,d.fields):null,phil=sg?.dims.find(x=>x.key==='philosophy');
  const bars=(g:number)=><i aria-label={`${g}/3`}>{[0,1,2].map(n=><b key={n} data-on={g>n}/>)}</i>;
  return <><div className="dq-scroll" data-testid="dq-feedback">
    <section className="gx-panel dq-sec gx-in"><div className="dq-k-row"><p className="dq-k">내 일지 피드백</p>{r.pending?<b className="dq-score-wait">평가 중</b>:<b className="gx-mono dq-score">{r.journal}</b>}</div>
      <p className="dq-summary" data-testid="dq-summary">{summary}</p>
      <p className="gx-note">{r.pending?'채점자가 아직 답하지 않았어요. 평가가 끝나면 장면마다 피드백이 들어와요.':r.judge==='toulmin-v1'?'채점기가 내 문장에서 주장·자료·연결·반박을 찾아 매긴 점수예요.':'체험용 점수예요. 낱말 규칙으로 매겨서 논증이 옳은지는 보증하지 않아요.'} 보유·매도 선택은 점수에 들어가지 않아요.</p>
      {r.forecast&&<p className="gx-note" data-testid="dq-forecast">예측력 {r.forecast.n?`${r.forecast.k} / ${r.forecast.n}`:'판정 없음'} · 대상·방향·기한을 밝힌 가설만, 점수·경험치와 따로 봐요.</p>}</section>
    <div className="dq-tabs dq-scene-tabs" role="tablist" aria-label="장면">{r.scenes.map((x,i)=>{const sc=pack.scenes.find(y=>y.id===x.scene);return <button key={x.scene} type="button" role="tab" aria-selected={k===i} onClick={()=>setK(i)}>장면 {sc?.no??i+1}</button>})}</div>
    {s&&d&&sg&&<section className="gx-panel dq-sec gx-in" data-testid="dq-fb-scene" key={s.id}>
      <div className="dq-k-row"><strong>장면 {s.no} · {s.title}</strong><span className="gx-mono">{r.pending?'':sg.score}</span></div>
      <p className="dq-k">내가 쓴 문장과 선택</p>
      {p&&intro?<dl className="dq-dl"><dt>고른 방향</dt><dd><b>{d.fields.dir}</b> <small className="gx-note">{p.target?.label} · {p.period?.label}</small></dd><dt>한 줄</dt><dd>{p.why}</dd></dl>
        :<><p className="dq-quote">{hypoLine(q,s,d.fields)}</p>
          {(['reason','counter','recheck'] as const).filter(f=>d.fields[f]).map(f=><p key={f} className="gx-note">{FIELD_LABEL[f]} · {d.fields[f]}</p>)}
          {d.fields.shift&&<p className="gx-note">판단 변화 · {d.fields.shift}</p>}</>}
      <p className="gx-note">판단 · {aliasOf(pack,targetOf(s))} {fractionLabel(d.fraction)}</p>
      {!r.pending&&<>
        <p className="dq-k">철학을 적용한 지점</p>
        {phil&&<div className="dq-dims one"><span>{DIM_LABEL.philosophy} {bars(phil.grade)}</span><p>{phil.reason}{phil.quote&&<> <q>{phil.quote}</q></>}</p></div>}
        {!intro&&sg.dims.length>1&&<ul className="dq-dims">{sg.dims.filter(x=>x.key!=='philosophy').map(dm=><li key={dm.key}><span>{DIM_LABEL[dm.key]} <small className="gx-note">{WEIGHTS[dm.key]}</small></span>{bars(dm.grade)}
          <p>{dm.reason}{dm.quote&&<> <q>{dm.quote}</q></>}</p></li>)}</ul>}
        <p className="dq-k">보완할 점 하나</p><p data-testid="dq-next">{sg.next}</p></>}
      {fc&&<p className="gx-note" data-testid="dq-fb-forecast">예측력 · {fc.observe?(fc.status==='hold'?`${fc.observe.label} · 내 예상 ${fc.observe.dir} · 아직 발표 전이라 보류`
        :`${fc.observe.label} · 내 예상 ${fc.observe.dir} · 발표 ${pct(fc.change??0,1)}% (${fc.observe.base}, ±${fc.observe.flat}% 안은 비슷) → ${fc.observe.said} · ${fc.status==='hit'?'적중':'빗나감'}`)
        :fc.status==='void'?'예측이 아니에요(대상·방향·기한 중 빠진 것이 있어요)'
        :fc.status==='hold'?`${fc.direction} ${fc.horizon}거래일 · 평가일 뒤라 보류`:`${fc.direction} ${fc.horizon}거래일 · 실제 ${pct(fc.change??0)}% · ${fc.status==='hit'?'적중':'빗나감'}`}</p>}
    </section>}
  </div><button type="button" className="gx-btn" onClick={onBack}>결과로 돌아가기</button></>;
}

// the hypothesis in one box (feedback F2): on a structured day the target and period are given or picked, the
// direction is picked, and the player writes only why. Written freely when the day gives no aid (상급) or the scene
// says nothing that can be checked.
function HypoField({q,s,f,set,miss}:{q:QuestDef;s:Scene;f:Fields;set:(p:Partial<Fields>)=>void;miss:boolean}){
  const p=partsOf(q,s,f);
  if(!p)return <label className={`dq-field${miss?' miss':''}`}><span>{FIELD_LABEL.hypo} · {PROMPT.hypo}</span>
    <textarea value={f.hypo} rows={3} aria-label={FIELD_LABEL.hypo} placeholder={PROMPT.hypo} onChange={e=>set({hypo:e.target.value})}/></label>;
  const a=q.aid!,given=a.target==='given'||a.period==='given';
  const row=(label:string,body:React.ReactNode)=><div className="dq-hrow"><small>{label}</small>{body}</div>;
  const fixed=(text:string|undefined)=><b className="dq-given">{text}<em>관측소가 정했어요</em></b>;
  return <div className={`dq-field dq-hypo${miss?' miss':''}`} data-testid="dq-hypo"><span>{FIELD_LABEL.hypo} · 한 문장으로 완성해요</span>
    {row('대상',a.target==='given'?fixed(p.target?.label):<span className="dq-chips" role="group" aria-label="대상">{p.o.targets.map(t=><button key={t.id} type="button" aria-pressed={f.target===t.id} onClick={()=>set({target:t.id})}>{t.label}</button>)}</span>)}
    {row('기간',a.period==='given'?fixed(p.period?.label):<span className="dq-chips" role="group" aria-label="기간">{p.o.periods.map(x=><button key={x.id} type="button" aria-pressed={f.period===x.id} onClick={()=>set({period:x.id})}>{x.label}</button>)}</span>)}
    {row('방향',<span className="dq-chips dir" role="group" aria-label="방향">{DIRS.map(d=><button key={d} type="button" aria-pressed={f.dir===d} onClick={()=>set({dir:d})}>{d}</button>)}</span>)}
    <small className="gx-note">{p.o.base} 변화로 봐요. ±{p.o.flat}% 안이면 ‘비슷’이에요.</small>
    <label className="dq-why"><span>그렇게 본 이유는</span><textarea value={f.hypo} rows={2} aria-label="그렇게 본 이유" placeholder="자료 하나를 짚어 한 줄로" onChange={e=>set({hypo:e.target.value})}/></label>
    <small className="gx-note">{given?'관측소가 정한 대상·기간은 점수에 들어가지 않아요. ':''}방향 전망과 아래의 보유·매도 선택은 서로 따로예요.</small></div>;
}

export function ProgressBar({total,t}:{total:number;t:ReturnType<typeof titleOf>}){
  return <div className="dq-prog" data-testid="dq-progress"><div className="dq-k-row"><strong>{t.rank} Lv.{t.level}</strong><span className="gx-mono">{total.toLocaleString('ko-KR')} XP</span></div>
    <i role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(t.progress*100)} aria-label="다음 승급까지"><b style={{width:`${Math.round(t.progress*100)}%`}}/></i>
    <small className="gx-note">{t.next?`${t.next.rank} Lv.${t.next.level}까지 ${t.next.left} XP`:'가장 높은 단계예요. 경험치는 계속 쌓여요.'}</small></div>;
}
