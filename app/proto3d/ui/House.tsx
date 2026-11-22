'use client';
// 집 (PM 설계 2026-11-19, 9장 2026-11-20): the desk scene (House3D.tsx) and what sits over it: 보리's line, today's quiz
// papers stamped one by one (QuizDesk, 9-2), and the case file desk (ui/CaseDesk.tsx). Every visit starts here; the door
// goes out to the village (Proto3D).
// The save: core/house.ts HouseSave under 'rethink-house-v1' (account level: the quiz experience, the unlock, the day's
// bundle and its stamps), the case file's bookmark in 'rethink-casefile-v1'.
import {useEffect,useMemo,useRef,useState} from 'react';
import {House3D,type HouseCam,type Point,type Paws} from '../House3D';
import {CaseDesk,type CaseFocus} from './CaseDesk';
import {useGamePacks} from '../game/Expedition';
import {DESK_PAPERS} from '../../content/desk-papers';
import {bookPapers,quizPapers,bundleOfDay,newDay,nextPaper,stampPaper,finishDay,levelOf,xpFor,stampMark,type Paper,type DeskDay,type Stamp} from '../../core/desk';
import {HOUSE,HOUSE0,readHouse,kstDay,afterQuiz,deskState,doorOpen,boriLine,lockPlate,caseOf,assignCase,setCaseStatus,deskOf,putDesk,seenPapers,type HouseSave} from '../../core/house';
import {packOfDay,masteryOf} from '../../core/casefile';
import {TIMING,QUIZ_SECONDS} from '../../core/timing';
import {KIND_LABEL,LEVEL_LABEL,ONE_TAP,ready,say as sayResp,type Q100,type Resp} from '../../core/quiz100';
import {cue} from '../../core/sound';
import {still} from '../still';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;

const KEY='rethink-house-v1';
export function loadHouse():HouseSave{try{return readHouse(JSON.parse(localStorage.getItem(KEY)??'null'))}catch{return HOUSE0}}
export function saveHouse(h:HouseSave){try{localStorage.setItem(KEY,JSON.stringify(h))}catch{/* this visit only */}}
// the day's quiz is dealt from the 100 questions (투자학습 퀴즈 100문항, 2026-11-21); the older two-stamp papers stay
// readable for bundles saved before
export const PAPERS:Paper[]=quizPapers();
const OLD:Paper[]=[...bookPapers(),...DESK_PAPERS];
const paperOf=(id:string)=>PAPERS.find(p=>p.id===id)??OLD.find(p=>p.id===id)!;
// test addresses (9-6): ?quizlv=N starts at quiz level N (5+ is unlocked; ?houseLv=N is the older name), ?quest opens
// today's case file at once when it is unlocked. The master account opens everything as elsewhere.
const param=(k:string)=>{try{return new URLSearchParams(location.search).get(k)}catch{return null}};
const lent=()=>Number(param('quizlv')??param('houseLv'))||0;

type Line={text:string;choices:{label:string;go:()=>void}[]};
// 유저 워크플로우 1장 (PM 2026-11-21): the first lesson. 보리 waves and only the quiz paper lights up (a tap on it goes on);
// 보리 points at the level gauge, then turns to the drawer's lock; the first paper is solved, its back read; the door
// opens and 보리 looks at it. Kept: the day the lesson was done (the door stays open that day). lesson: allowed here
// (e2e pages start without it unless the address has ?tutorial)
type Lesson='wave'|'level'|'lock'|'solve'|'door';
const LESSON_KEY='rethink-lesson-v1';
const lessonDay=()=>{try{return localStorage.getItem(LESSON_KEY)}catch{return null}};
export function House({g,master,onOut,onSettings,lesson=false}:{g:G;master:boolean;onOut:()=>void;onSettings:()=>void;lesson?:boolean}){
  const day=kstDay(g.clock.now);
  const [h,setH]=useState<HouseSave>(()=>{const x=loadHouse(),lv=lent();return lv&&x.xp<xpFor(lv)?{...x,xp:xpFor(lv)}:x});
  const put=(f:(x:HouseSave)=>HouseSave)=>setH(x=>{const n=f(x);if(n!==x)saveHouse(n);return n});
  const level=Math.max(levelOf(h.xp).lv,master?HOUSE.unlockLevel:0);
  // a level lent or reached elsewhere is taken in as it is read
  useEffect(()=>{put(x=>afterQuiz(x,level,x.unlocked?x.unlockedOn??day:day))},[level]);// eslint-disable-line react-hooks/exhaustive-deps
  // today's bundle: dealt once, unseen papers first (9-2)
  const desk=deskOf(h,day);
  useEffect(()=>{if(!desk)put(x=>deskOf(x,day)?x:putDesk(x,newDay(day,bundleOfDay(PAPERS,day,seenPapers(x)))))},[day,!!desk]);// eslint-disable-line react-hooks/exhaustive-deps
  const quizDone=!!desk?.done,started=!!desk&&desk.stamps.length>0&&!desk.done;
  const today=caseOf(h,day);
  // today's file is handed out with the unlock (and never asked for before it: 설계 7장)
  const idx=useGamePacks();
  useEffect(()=>{if(!h.unlocked||today||!idx)return;const id=packOfDay(idx.packs.map(p=>p.id),day,h.cases.map(c=>c.packId));if(id)put(x=>assignCase(x,day,id))},[h.unlocked,today,idx,day]);// eslint-disable-line react-hooks/exhaustive-deps
  const state=deskState({unlocked:h.unlocked,unlockedOn:h.unlockedOn,quizDone,caseStatus:today?.status??null,day});
  const [les,setLes]=useState<Lesson|null>(()=>lesson&&!lessonDay()&&!(deskOf(loadHouse(),day)?.stamps.length)?'wave':null);
  const lessonDone=()=>{try{localStorage.setItem(LESSON_KEY,day)}catch{/* this visit only */}};
  const door=doorOpen(state)||les==='door'||lessonDay()===day;
  const [view,setView]=useState<'desk'|'paper'|'case'>('desk');
  // the reveal of the unlock day plays once, as the player looks up from the papers
  const [rising,setRising]=useState(false);
  const [say,setSay]=useState<{text:string;at:'plate'|'paper'}|null>(null);
  const first=!h.greeted;
  useEffect(()=>{if(first)put(x=>({...x,greeted:true}))},[]);// eslint-disable-line react-hooks/exhaustive-deps
  const openPaper=()=>{setSay(null);if(les==='wave'){setLes('level');return}if(les==='level'||les==='lock')setLes('solve');setView('paper')};
  const openCase=()=>{if(!today)return;setSay(null);if(today.status==='new')put(x=>setCaseStatus(x,day,'open'));setView('case')};
  // ?quest: straight to today's file once it is there
  const quest=useRef(param('quest')!==null);
  useEffect(()=>{if(quest.current&&h.unlocked&&today){quest.current=false;openCase()}},[h.unlocked,today]);// eslint-disable-line react-hooks/exhaustive-deps
  const lookUp=()=>{if(les==='solve'&&deskOf(loadHouse(),day)?.stamps.length){setLes('door');setView('desk');return}setView('desk');if(state==='unlocked'&&!still()){setRising(true);setTimeout(()=>setRising(false),TIMING.houseRise)}};
  const drawerTap=()=>{if(h.unlocked){if(today)openCase();return}const p=lockPlate(level);setSay({text:`손잡이에 적혀 있지? ${p.title.replace('시나리오 · ','')}. 지금은 Lv.${level}이야.`,at:'plate'})};
  const goOut=()=>{if(les){lessonDone();setLes(null)}onOut()};
  const doorTap=()=>{if(door){goOut();return}setSay({text:'문은 오늘 문서를 다 보면 열어 줄게.',at:'paper'})};
  const LV=HOUSE.unlockLevel;
  const lessonLine:Line|null=les==='wave'?{text:'안녕, 나는 선생님이야. 이 방에서 매일 퀴즈를 내고 해설해 줄 거야. 오늘은 나랑 문제 하나 풀어 보자. 이 종이 한 장 받아 줄래?',choices:[{label:'종이 누르기',go:openPaper}]}
    :les==='level'?{text:`이건 네 퀴즈 레벨이야. 지금은 Lv.${level}. 퀴즈를 풀면서 여기까지 자라는 거야.`,choices:[{label:'응',go:()=>setLes('lock')}]}
    :les==='lock'?{text:`옆 서랍엔 자물쇠가 있어. 퀴즈 Lv.${LV}에 열려. 그때 사건철을 같이 꺼내 보자. 이제 종이를 펼쳐 볼까?`,choices:[{label:'종이 펼치기',go:openPaper}]}
    :les==='door'?{text:'잘했어! 문 열어 둘게. 나가 볼래? 남은 문서는 언제든 와서 마저 봐도 돼.',choices:[{label:'밖으로 나가기',go:goOut}]}:null;
  const line:Line=lessonLine??(say?{text:say.text,choices:[{label:'알겠어',go:()=>setSay(null)}]}:{text:boriLine(state,{first,level,caseStatus:today?.status??null,started}),choices:[
    ...(state==='quiz'||state==='quiz-first'?[{label:started?'이어서 보기':'문서 받기',go:openPaper}]:[]),
    ...(quizDone?[{label:'오늘 결과표',go:openPaper}]:[]),
    ...((state==='unlocked'||state==='case')&&today?[{label:today.status==='open'?'책갈피부터 이어 보기':'사건철 펼치기',go:openCase}]:[]),
    ...(door?[{label:'밖으로 나가기',go:goOut}]:[])]});
  // 보리's paws (9-3): a place for each state of the day, and they keep moving there
  const [quizPaw,setQuizPaw]=useState<Paws>('hold');
  const [focus,setFocus]=useState<CaseFocus>('docs');
  const paws:Paws=les==='wave'&&view==='desk'?'push':les==='level'?'tap-paper':les==='lock'?'plate':les==='door'?'door':view==='paper'?quizPaw:view==='case'?(focus==='docs'?'case-docs':focus==='compare'?'case-compare':focus==='note'?'case-note':'case-board')
    :say?.at==='plate'?'plate':say?.at==='paper'?'tap-paper'
    :state==='quiz'||state==='quiz-first'?(first&&!started?'push':'tap-paper'):state==='locked-done'?'door':state==='day-done'?'door-turn':today?'tap-case':'rest';
  const point:Point=paws==='plate'?'drawer':paws==='door'||paws==='door-turn'?'door':paws.startsWith('case')||paws==='tap-case'?'case':paws==='rest'?null:'paper';
  const cam:HouseCam=view==='paper'?'paper':view==='case'?'case':'seat';
  return <div className="hs" data-testid="house" data-state={state} data-paws={paws}>
    <House3D cam={cam} point={point} paws={paws} mood={say?'curious':state==='unlocked'||state==='day-done'||state==='locked-done'?'happy':'neutral'}
      paper={les==='wave'?'glow':quizDone?'done':'fresh'} drawer={h.unlocked?'open':'locked'} tidy={state==='day-done'&&view==='desk'}
      caseFile={!h.unlocked||!today?'hidden':rising?'rising':view==='case'?'open':today.status==='done'?'done':'closed'} door={door}
      onPaper={openPaper} onDrawer={drawerTap} onCase={openCase} onDoor={doorTap} onBori={()=>setSay(null)}/>
    {!h.unlocked&&view==='desk'&&<Pinned at="drawer"><button type="button" data-hl={les==='lock'} className="hs-plate" onClick={drawerTap} aria-label={`${lockPlate(level).title} · ${lockPlate(level).now}`}>
      <b>🔒 {lockPlate(level).title}</b><span>{lockPlate(level).now}</span></button></Pinned>}
    <div className="hs-top">
      <span className="hs-chip" data-hl={les==='level'} aria-label={`퀴즈 레벨 ${level}`}>퀴즈 Lv.{level}
        {/* the gauge 보리 points at on the first lesson: from where I am to the drawer's level */}
        <i className="hs-gauge" aria-hidden><b style={{width:`${Math.min(100,Math.round((level-1)/Math.max(1,LV-1)*100))}%`}}/></i><small>Lv.{LV}</small></span>
      <span className="hs-chip hs-day">{day.slice(5).replace('-','월 ')}일</span>
      <button type="button" className="hs-corner" aria-label="설정" onClick={onSettings}>설정</button>
    </div>
    {view==='desk'&&<div className="rt-talk hs-talk" role="dialog" aria-label="선생님">
      <div className="rt-talk-choices" role="group" aria-label="대답">{line.choices.map((c,i)=><button key={c.label} type="button" className={'rt-talk-choice'+(i===0?' first':'')} onClick={c.go}>{c.label}</button>)}</div>
      <div className="rt-talk-box"><span className="rt-talk-name" data-who="teacher">선생님<small className="rt-talk-role">퀴즈 선생님 · 방</small></span><p className="rt-talk-line" aria-live="polite">{line.text}</p></div>
    </div>}
    {view==='paper'&&desk&&<QuizDesk first={les==='solve'} d={desk} level={level}
      onStamp={(p,choice,resp)=>put(x=>{const cur=deskOf(x,day);if(!cur)return x;const n=finishDay(stampPaper(cur,p,choice,resp));
        if(n===cur)return x;const y=putDesk(x,n);return afterQuiz(y,Math.max(levelOf(y.xp).lv,master?HOUSE.unlockLevel:0),day)})}
      onPaw={setQuizPaw} onUp={lookUp}/>}
    {view==='case'&&today&&<CaseDesk packId={today.packId} day={today.day} mastery={masteryOf(h.solved)} solved={h.solved} onFocus={setFocus}
      onEnd={()=>put(x=>setCaseStatus(x,today.day,'done'))} onClose={()=>setView('desk')}/>}
  </div>;
}

// a DOM tag kept on a room thing's screen point (House3D writes them each frame)
function Pinned({at,children}:{at:string;children:React.ReactNode}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{let raf=0;const tick=()=>{const p=(window as {__proto3d?:{house?:{points?:Record<string,{x:number;y:number}>}}}).__proto3d?.house?.points?.[at],el=ref.current;
    if(el&&p){el.style.visibility='visible';el.style.transform=`translate(${Math.min(innerWidth-8,Math.max(8,p.x))}px,${p.y}px) translate(-${p.x>innerWidth*0.7?100:50}%,-100%)`}raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[at]);
  return <div ref={ref} className="hs-pin" style={{visibility:'hidden'}}>{children}</div>;
}

// 9-2 오늘의 퀴즈: papers pushed over the desk one at a time. Front: the typed header, the office seal, the statement and
// the two blanks; two rubber stamps below (맞다 green, 아니다 red). A stamp lands crooked where it always lands for that
// paper; the clock in the corner runs 25 seconds and stamps 시간 초과 at zero. Back: my stamp, the verdict, the answer and
// 보리's handwritten line; 다음 장. After the last: the results sheet (shown alone when the day is opened again).
// a stamp's word: the old papers show the stamp they took; a 100-question paper shows its verdict
const STAMP_TEXT=(p:Paper,s:Stamp)=>s.choice===null?'시간 초과':p.quiz?(s.right?'정답':'오답'):p.options[s.choice];
const INK=(p:Paper,s:Stamp)=>s.choice===null?'late':p.quiz?(s.right?'yes':'no'):s.choice===0?'yes':'no';
const secondsFor=(p:Paper)=>p.quiz?QUIZ_SECONDS[p.quiz.type]??TIMING.quizPaper:TIMING.quizPaper;
function QuizDesk({d,level,onStamp,onPaw,onUp,first=false}:{first?:boolean;d:DeskDay;level:number;onStamp:(p:Paper,choice:0|1|null,resp?:Resp|null)=>void;onPaw:(p:Paws)=>void;onUp:()=>void}){
  const id=nextPaper(d);
  // the paper whose back is showing (the one just stamped), until 다음 장
  const [back,setBack]=useState<string|null>(null);
  const showing=back??id;
  const p=showing?paperOf(showing):null;
  const stamp:Stamp|null=p?d.stamps.find(s=>s.id===p.id)??null:null;
  const total=p?secondsFor(p):TIMING.quizPaper;
  const [left,setLeft]=useState(total);
  // what is being put together on a 100-question paper (sent with 제출, or at once for a one-tap kind)
  const [resp,setResp]=useState<Resp|null>(null);
  // by the wall clock, not by ticks (a busy phone drawing the room would otherwise slow the paper's clock down)
  const t0=useRef(Date.now());
  useEffect(()=>{t0.current=Date.now();setLeft(total);setResp(null);onPaw('hold')},[id]);// eslint-disable-line react-hooks/exhaustive-deps
  const press=(c:0|1|null,r?:Resp|null)=>{if(!p||stamp||back)return;cue('game-stamp');onStamp(p,c,r);setBack(p.id);
    if(c!==null){onPaw(c===0?'mark-0':'mark-1');setTimeout(()=>onPaw('hold'),still()?0:TIMING.quizMark)}};
  useEffect(()=>{if(!p||stamp||back)return;if(left<=0){press(null,null);return}const t=setTimeout(()=>setLeft(Math.max(0,total-Math.floor((Date.now()-t0.current)/1000))),250);return()=>clearTimeout(t)});// eslint-disable-line react-hooks/exhaustive-deps
  const n=d.ids.length,done=d.stamps.length;
  if(!p||(d.done&&!back)){const right=d.stamps.filter(s=>s.right).length;
    return <section className="hs-quiz" data-side="results" aria-label="오늘의 결과표">
      <article className="hs-doc hs-results">
        <p className="hs-type">결과표 · {d.day}</p>
        <h2>오늘 문서 {n}장</h2>
        <ol className="hs-rows">{d.stamps.map((s,i)=>{const q=paperOf(s.id);return <li key={s.id} data-r={s.choice===null?'late':s.right?'ok':'no'}>
          <span className="hs-num">No.{String(i+1).padStart(2,'0')}</span><span className="hs-q">{q.q}</span>
          <b>{s.choice===null?'시간 초과':s.right?'맞음':'틀림'}</b></li>})}</ol>
        <p className="hs-total"><b>{right}/{n}</b> 맞힘 · 경험치 +{d.xp} · 퀴즈 Lv.{level}</p>
        <p className="hs-pen">오늘도 같이 읽어 줘서 고마워.</p>
      </article>
      <div className="hs-bar"><button type="button" className="rt-btn primary" onClick={onUp}>고개 들기</button></div>
    </section>}
  const no=d.ids.indexOf(p.id)+1,mark=stampMark(p.id),q=p.quiz;
  // a 100-question paper's one-tap answer, or its 제출
  const send=(r:Resp)=>{if(q)press(0,r)};
  return <section className="hs-quiz" data-side={stamp?'back':'front'} data-kind={q?.type??'stamp'} aria-label="오늘의 퀴즈 서류">
    <div className="hs-piles" aria-hidden><span className="hs-pile done" data-n={Math.min(done,6)}>{done}</span><span className="hs-pile left" data-n={Math.min(n-done,6)}>{n-done}</span></div>
    <article className="hs-doc" key={p.id+(stamp?':b':':f')} style={{['--tilt' as string]:`${(mark.rot%3)*0.4}deg`}}>
      <header className="hs-type"><span>문서 No.{String(no).padStart(2,'0')} / {String(n).padStart(2,'0')}</span><span>{d.day.replaceAll('-','.')}</span>
        {!stamp&&<span className={'hs-clock'+(left<=TIMING.quizLow?' low':'')} role="timer" aria-label={`남은 시간 ${left}초`}>{left}초</span>}</header>
      <span className="hs-seal" aria-hidden>퀴즈<br/>사무소</span>
      <p className="hs-topic">{p.topic}{q&&<> · {KIND_LABEL[q.type]} · {LEVEL_LABEL[q.difficulty]??q.difficulty}</>}</p>
      {!stamp?<>
        <h2 className="hs-claim">{p.q}</h2>
        {q?.data.statement&&<blockquote className="hs-quote">{q.data.statement}</blockquote>}
        {!q?<div className="hs-blanks" aria-hidden>{p.options.map(o=><span key={o}><i/>{o}</span>)}</div>
          :q.type==='true_false'?null:<Parts q={q} r={resp} set={setResp} send={send}/>}
      </>:<>
        <p className="hs-claim small">{p.q}</p>
        {q?.data.statement&&<blockquote className="hs-quote small">{q.data.statement}</blockquote>}
        <dl className="hs-back">
          <div><dt>{q?'내 답':'내 도장'}</dt><dd>{q?(stamp.choice===null?'—':sayResp(q,stamp.resp??null).map((l,i)=><span key={i} className="hs-line">{l}</span>)):STAMP_TEXT(p,stamp)}</dd></div>
          <div><dt>판정</dt><dd><b className={stamp.choice===null?'hs-late':stamp.right?'hs-ok':'hs-ng'}>{stamp.choice===null?'시간이 지났어요':stamp.right?'맞았어요':'틀렸어요'}</b></dd></div>
          <div><dt>정답</dt><dd>{q?sayResp(q,q.answer).map((l,i)=><span key={i} className="hs-line">{l}</span>):p.options[p.answer]}</dd></div>
        </dl>
        <p className="hs-pen">{p.why}</p>
      </>}
      {stamp&&<span className="hs-ink" data-c={INK(p,stamp)} style={{transform:`translate(${mark.x}px,${mark.y}px) rotate(${mark.rot}deg)`}}>{STAMP_TEXT(p,stamp)}</span>}
    </article>
    <div className="hs-bar">{!stamp?(!q||q.type==='true_false'?<div className="hs-stamps" role="group" aria-label="도장">{(q?q.data.options!.map(o=>o.text):p.options).map((o,i)=>
      <button key={o} type="button" className="hs-stamp" data-c={i===0?'yes':'no'} onClick={()=>q?press(0,q.data.options![i].id):press(i as 0|1)}><span>{o}</span></button>)}</div>
      :ONE_TAP.includes(q.type)?null
      :<div className="hs-acts"><button type="button" className="rt-btn primary hs-send" disabled={!ready(q,resp)} onClick={()=>resp!==null&&send(resp)}>제출</button></div>)
      :first?<div className="hs-acts"><button type="button" className="rt-btn primary" onClick={onUp}>해설 봤어 · 고개 들기</button></div>
      :<div className="hs-acts"><button type="button" className="rt-btn ghost" onClick={onUp}>잠깐 고개 들기</button>
        <button type="button" className="rt-btn primary" onClick={()=>setBack(null)}>{d.done?'결과표 보기':'다음 장'}</button></div>}</div>
  </section>;
}

// the answering part of a 100-question paper, by its kind
const ABC='ABCDEFGH';
function Parts({q,r,set,send}:{q:Q100;r:Resp|null;set:(r:Resp|null)=>void;send:(r:Resp)=>void}){
  const d=q.data,map=(r&&typeof r==='object'&&!Array.isArray(r)?r:{}) as Record<string,string>,list=Array.isArray(r)?r:[];
  const [pick,setPick]=useState<string|null>(null);
  switch(q.type){
    case 'classification':case 'scenario':
      return <div className="hs-opts" role="group" aria-label="보기">{d.options!.map((o,i)=><button key={o.id} type="button" className="hs-opt" onClick={()=>send(o.id)}>
        <i>{i+1}</i><span>{o.text}</span></button>)}</div>;
    case 'multiple_select':
      return <div className="hs-opts" role="group" aria-label="보기 (여러 개)">{d.options!.map((o,i)=>{const on=list.includes(o.id);
        return <button key={o.id} type="button" className="hs-opt" aria-pressed={on} onClick={()=>set(on?list.filter(x=>x!==o.id):[...list,o.id])}>
          <i>{on?'✓':i+1}</i><span>{o.text}</span></button>})}<p className="hs-hint">맞는 걸 모두 고르고 제출해요.</p></div>;
    case 'ordering':
      return <div className="hs-opts" role="group" aria-label="순서">{d.items!.map(o=>{const at=list.indexOf(o.id);
        return <button key={o.id} type="button" className="hs-opt" aria-pressed={at>=0} onClick={()=>set(at>=0?list.slice(0,at):[...list,o.id])}>
          <i>{at>=0?at+1:'·'}</i><span>{o.text}</span></button>})}<p className="hs-hint">먼저 일어나는 것부터 차례로 눌러요. 다시 누르면 거기부터 지워져요.</p></div>;
    case 'direction':
      return <div className="hs-dirs">{d.targets!.map(t=><div key={t.id} className="hs-dir" role="group" aria-label={t.text}><b>{t.text}</b>
        <div>{d.options!.map(o=><button key={o.id} type="button" className="hs-chipbtn" aria-pressed={map[t.id]===o.id}
          onClick={()=>{const n={...map,[t.id]:o.id};if(d.targets!.length===1)send(n);else set(n)}}>{o.text}</button>)}</div></div>)}</div>;
    case 'matching':{const cur=pick??d.left!.find(l=>!map[l.id])?.id??null;
      return <div className="hs-match">
        <div className="hs-left" role="group" aria-label="왼쪽">{d.left!.map(l=>{const k=d.right!.findIndex(x=>x.id===map[l.id]);
          return <button key={l.id} type="button" className="hs-opt" aria-pressed={cur===l.id} data-paired={k>=0} onClick={()=>setPick(l.id)}>
            <span>{l.text}</span><i>{k>=0?ABC[k]:'?'}</i></button>})}</div>
        <div className="hs-right" role="group" aria-label="오른쪽">{d.right!.map((o,k)=><button key={o.id} type="button" className="hs-opt" disabled={!cur}
          data-used={Object.values(map).includes(o.id)} onClick={()=>{if(!cur)return;const n:Record<string,string>={};for(const [a,b] of Object.entries(map))if(b!==o.id)n[a]=b;n[cur]=o.id;set(n);setPick(null)}}>
          <i>{ABC[k]}</i><span>{o.text}</span></button>)}</div>
        <p className="hs-hint">왼쪽을 고르고, 맞는 설명을 눌러 짝지어요.</p></div>}
    case 'fill_blank':
      return <div className="hs-fill">{d.blanks!.map(b=><label key={b.id}><span className="sr-only">빈칸</span>
        <input type="text" inputMode={b.input_type==='number'?'decimal':'text'} autoComplete="off" aria-label={b.input_type==='number'?'숫자 입력':'답 입력'} value={map[b.id]??''}
          onChange={e=>set({...map,[b.id]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&ready(q,{...map,[b.id]:(e.target as HTMLInputElement).value}))send({...map,[b.id]:(e.target as HTMLInputElement).value})}}/>
        {b.unit&&<em>{b.unit}</em>}</label>)}<p className="hs-hint">{d.blanks!.some(b=>b.input_type==='number')?'숫자만 넣어요. 단위는 붙어 있어요.':'낱말로 적어요.'}</p></div>;
  }
  return null;
}
