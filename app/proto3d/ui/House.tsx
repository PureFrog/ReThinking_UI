'use client';
// 집 (PM 설계 2026-11-19, 9장 2026-11-20): the desk scene (House3D.tsx) and what sits over it: 보리's line, today's quiz
// papers stamped one by one (QuizDesk, 9-2), and the case file desk (ui/CaseDesk.tsx). Every visit starts here; the door
// goes out to the village (Proto3D).
// The save: core/house.ts HouseSave under 'rethink-house-v1' (account level: the quiz experience, the unlock, the day's
// bundle and its stamps), the case file's bookmark in 'rethink-casefile-v1'.
import {useEffect,useMemo,useRef,useState} from 'react';
import {TalkBox} from './Walk';
import {House3D,type HouseCam,type Point,type Paws} from '../House3D';
import {type CaseFocus} from './CaseDesk';
import {ScenarioQuest} from './ScenarioQuest';
import {sqTutorialOn} from './SpotCoach';
import {useGamePacks} from '../game/Expedition';
import {DESK_PAPERS} from '../../content/desk-papers';
import {bookPapers,quizPapers,bundleOfDay,newDay,nextPaper,stampPaper,finishDay,challengePapers,challenge,choosing,stepOf,stepCoins,CHALLENGE,LEVEL_KO,quizCoins,stopRun,type Level,DESK,levelOf,xpFor,stampMark,type Paper,type DeskDay,type Stamp} from '../../core/desk';
import {HOUSE,HOUSE0,readHouse,kstDay,afterQuiz,deskState,doorOpen,boriLine,lockPlate,caseOf,assignCase,setCaseStatus,deskOf,putDesk,seenPapers,type HouseSave} from '../../core/house';
import {packOfDay,masteryOf} from '../../core/casefile';
import {TIMING,QUIZ_SECONDS} from '../../core/timing';
import {KIND_LABEL,LEVEL_LABEL,ONE_TAP,ready,say as sayResp,type Q100,type Resp} from '../../core/quiz100';
import {cue} from '../../core/sound';
import {EARN} from '../../core/ledger';
import {won} from '../../core/won';
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
  // the day's quiz coins (2026-11-23): the base once the first papers are all right, then each right paper of the run
  useEffect(()=>{if(desk)g.ops.quizPay(day,quizCoins(desk))},[desk?.stamps.length]);// eslint-disable-line react-hooks/exhaustive-deps
  // 연습 한 판: two questions not yet seen (from the 100), held only here: no stamp kept, no xp, no coins
  const [drill,setDrill]=useState<DeskDay|null>(null);
  const newDrill=()=>{const seen=new Set([...seenPapers(h),...(drill?.ids??[])]),pool=PAPERS.filter(p=>!seen.has(p.id)),use=(pool.length>=DESK.perDay?pool:PAPERS);
    const ids=[...use].sort(()=>Math.random()-0.5).slice(0,DESK.perDay).map(p=>p.id);setDrill(newDay(day,ids))};
  const practiceNow=()=>{setSay(null);newDrill();setView('paper')};
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
  // 시나리오 튜토리얼 (2026-11-23): the first time the drawer is open (Lv.5) and the day's quiz is done, the room goes straight into the scenario and the
  // tutorial runs inside it; once a visit, so closing it midway leaves the desk as it is
  const auto=useRef(false);
  useEffect(()=>{if(auto.current||view!=='desk'||!h.unlocked||!quizDone||!today||today.status==='done'||les||!sqTutorialOn())return;auto.current=true;openCase()},[view,h.unlocked,quizDone,today,les]);// eslint-disable-line react-hooks/exhaustive-deps
  const lookUp=()=>{if(les==='solve'&&deskOf(loadHouse(),day)?.stamps.length){setLes('door');setView('desk');return}setView('desk');if(state==='unlocked'&&!still()){setRising(true);setTimeout(()=>setRising(false),TIMING.houseRise)}};
  const drawerTap=()=>{if(h.unlocked){if(today)openCase();return}const p=lockPlate(level);setSay({text:`이 서랍은 퀴즈 Lv.${HOUSE.unlockLevel}에 열려. 지금은 Lv.${level}이야.`,at:'plate'});void p};
  const goOut=()=>{if(les){lessonDone();setLes(null)}onOut()};
  const doorTap=()=>{if(door){goOut();return}setSay({text:'오늘 퀴즈를 다 풀면 문이 열려.',at:'paper'})};
  const LV=HOUSE.unlockLevel;
  const lessonLine:Line|null=les==='wave'?{text:'어서 와, 나는 선생님이야. 매일 퀴즈를 내고 해설해 줄게. 첫 문제부터 풀어 보자.',choices:[{label:'퀴즈 시작',go:openPaper}]}
    :les==='level'?{text:`위에 있는 건 네 퀴즈 레벨이야. 지금은 Lv.${level}. 풀수록 올라가.`,choices:[{label:'응',go:()=>setLes('lock')}]}
    :les==='lock'?{text:`옆 서랍은 Lv.${LV}에 열려. 그 안에 사건철이 있어. 이제 문제 풀자.`,choices:[{label:'퀴즈 시작',go:openPaper}]}
    :les==='door'?{text:'오늘 퀴즈 끝! 문 열어 뒀어. 더 풀고 싶으면 새 문제 줄게.',choices:[{label:'새 문제 풀기',go:()=>{lessonDone();setLes(null);practiceNow()}},{label:'밖으로 나가기',go:goOut}]}:null;
  const line:Line=lessonLine??(say?{text:say.text,choices:[{label:'알겠어',go:()=>setSay(null)}]}:{text:boriLine(state,{first,level,caseStatus:today?.status??null,started}),choices:[
    ...(state==='quiz'||state==='quiz-first'?[{label:started?'이어서 풀기':'퀴즈 시작',go:openPaper}]:[]),
    // 피드백 2026-11-26 "선생님을 눌러 퀴즈 풀기를 누르면 끝난 화면만": after today's, new questions straight away (연습)
    ...(quizDone?[{label:'새 문제 풀기',go:practiceNow},{label:'오늘 결과표',go:()=>{setDrill(null);openPaper()}}]:[]),
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
      {/* 피드백 2026-11-25 "너무 intruding": a small lock on the drawer; the full words only while the first lesson points at it */}
      {les==='lock'?<><b>🔒 {lockPlate(level).title}</b><span>{lockPlate(level).now}</span></>:<b>🔒 Lv.{LV}</b>}</button></Pinned>}
    <div className="hs-top">
      <span className="hs-chip" data-hl={les==='level'} aria-label={`퀴즈 레벨 ${level}`}>퀴즈 Lv.{level}
        {/* the gauge 보리 points at on the first lesson: from where I am to the drawer's level */}
        <i className="hs-gauge" aria-hidden><b style={{width:`${Math.min(100,Math.round((level-1)/Math.max(1,LV-1)*100))}%`}}/></i><small>Lv.{LV}</small></span>
      <span className="hs-chip hs-day">{day.slice(5).replace('-','월 ')}일</span>
      <button type="button" className="hs-corner" aria-label="설정" onClick={onSettings}>설정</button>
    </div>
    {view==='desk'&&<TalkBox className="hs-talk" name="선생님" nameWho="teacher" line={line.text} choices={line.choices}/>}
    {view==='paper'&&desk&&drill&&<QuizDesk key={drill.ids.join()} practice d={drill} level={level} onPaw={setQuizPaw} onUp={()=>setDrill(null)} onPractice={newDrill}
      onStamp={(p,choice,resp)=>setDrill(x=>x&&finishDay(stampPaper(x,p,choice,resp)))} onStop={()=>{}} onChallenge={()=>{}}/>}
    {view==='paper'&&desk&&!drill&&<QuizDesk first={les==='solve'} d={desk} level={level} onPractice={desk.done?newDrill:undefined}
      onStamp={(p,choice,resp)=>put(x=>{const cur=deskOf(x,day);if(!cur)return x;const n=finishDay(stampPaper(cur,p,choice,resp));
        if(n===cur)return x;const y=putDesk(x,n);return afterQuiz(y,Math.max(levelOf(y.xp).lv,master?HOUSE.unlockLevel:0),day)})}
      onStop={()=>put(x=>{const cur=deskOf(x,day);if(!cur)return x;const n=stopRun(cur);if(n===cur)return x;const y=putDesk(x,n);return afterQuiz(y,Math.max(levelOf(y.xp).lv,master?HOUSE.unlockLevel:0),day)})}
      onChallenge={lv=>put(x=>{const cur=deskOf(x,day);if(!cur)return x;const n=challenge(cur,lv,challengePapers(PAPERS,day,seenPapers(x),cur.ids,cur.level??lv));return n===cur?x:putDesk(x,n)})}
      onPaw={setQuizPaw} onUp={lookUp}/>}
    {/* 시나리오 퀘스트 (PM 설계 2026-11-22): starts at 오늘의 거장 as soon as the file is picked */}
    {view==='case'&&today&&<ScenarioQuest day={today.day} onFocus={setFocus}
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
const coin=(n:number)=>n.toLocaleString('ko-KR')+'코인';
const STAMP_TEXT=(p:Paper,s:Stamp)=>s.choice===null?'시간 초과':p.quiz?(s.right?'정답':'오답'):p.options[s.choice];
const INK=(p:Paper,s:Stamp)=>s.choice===null?'late':p.quiz?(s.right?'yes':'no'):s.choice===0?'yes':'no';
const secondsFor=(p:Paper)=>p.quiz?QUIZ_SECONDS[p.quiz.type]??TIMING.quizPaper:TIMING.quizPaper;
function QuizDesk({d,level,onStamp,onStop,onChallenge,onPaw,onUp,first=false,practice=false,onPractice}:{practice?:boolean;onPractice?:()=>void;first?:boolean;d:DeskDay;level:number;onStamp:(p:Paper,choice:0|1|null,resp?:Resp|null)=>void;onStop:()=>void;onChallenge:(lv:Level)=>void;onPaw:(p:Paws)=>void;onUp:()=>void}){
  // waiting on the challenge choice (left and came back): the last paper's back again, with the choice on it
  const id=nextPaper(d)??(choosing(d)?d.stamps[d.stamps.length-1].id:null);
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
  // 피드백 2026-11-23 "5초에 한 번씩 초가 내려가": a one-shot timeout stopped whenever the second had not turned yet (the
  // same value renders nothing, so nothing set the next one); a steady tick keeps counting every second
  useEffect(()=>{if(!p||stamp||back)return;const t=setInterval(()=>setLeft(Math.max(0,total-Math.floor((Date.now()-t0.current)/1000))),200);return()=>clearInterval(t)},[id,!!stamp,!!back,total]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!p||stamp||back)return;if(left<=0)press(null,null)},[left]);// eslint-disable-line react-hooks/exhaustive-deps
  const n=d.ids.length,done=d.stamps.length,coins=quizCoins(d),lv=d.level??'easy',steps=CHALLENGE[lv];
  if(!p||(d.done&&!back)){const right=d.stamps.filter(s=>s.right).length;
    return <section className="hs-quiz" data-side="results" aria-label="오늘의 결과표">
      <article className="hs-doc hs-results">
        <p className="hs-type">결과표 · {d.day}</p>
        <h2>오늘 문서 {n}장</h2>
        <ol className="hs-rows">{d.stamps.map((s,i)=>{const q=paperOf(s.id);return <li key={s.id} data-r={s.choice===null?'late':s.right?'ok':'no'}>
          <span className="hs-num">No.{String(i+1).padStart(2,'0')}</span><span className="hs-q">{q.q}</span>
          <b>{s.choice===null?'시간 초과':s.right?'맞음':'틀림'}</b></li>})}</ol>
        {practice?<p className="hs-total"><b>{right}/{n}</b> 맞힘 · 연습 문제라 기록과 코인은 없어요</p>:<>
        <p className="hs-total"><b>{right}/{n}</b> 맞힘 · 경험치 +{d.xp} · 퀴즈 Lv.{level}</p>
        <p className="hs-total hs-coins" data-run={Math.max(0,stepOf(d))}>{coins>0?<>코인 <b>+{coin(coins)}</b> · {stepOf(d)===0?'입장 퀴즈 통과':`${LEVEL_KO[lv]} 도전 ${stepOf(d)}단계${stepOf(d)===steps.length-1?' 완주!':'에서 멈추고 받음'}`}</>:d.stamps.length>DESK.perDay&&d.stamps.some(x=>!x.right)?`${LEVEL_KO[lv]} 도전 실패: 걸었던 코인은 전부 몰수됐어.`:d.stamps.length>=DESK.perDay&&d.stamps.every(x=>x.right)?`${n}장 모두 맞혔어.`:`첫 ${DESK.perDay}장을 다 맞히면 ${coin(steps[0])}과 도전 기회가 열려.`}</p></>}
        <p className="hs-pen">오늘도 같이 읽어 줘서 고마워.</p>
      </article>
      {/* 피드백 2026-11-26 "오늘의 퀴즈를 풀려고 하면 끝난 퀴즈만 보여": today's quiz is once a day; after it, new questions to practise */}
      <div className="hs-bar">{onPractice&&<button type="button" className="rt-btn" onClick={onPractice}>새 문제로 연습</button>}<button type="button" className="rt-btn primary" onClick={onUp}>닫기</button></div>
    </section>}
  const no=d.ids.indexOf(p.id)+1,mark=stampMark(p.id),q=p.quiz;
  // 도전 (2026-11-24): past the entry pair, two papers a step; which step this paper is in, and what is held / at stake
  const inRun=no>DESK.perDay,round=inRun?Math.ceil((no-DESK.perDay)/2):0,inPair=inRun?(no-DESK.perDay-1)%2+1:no;
  const held=stepCoins(d,round-1),next=steps[round]??0,lost=inRun&&!!stamp&&!stamp.right;
  const choose=!!stamp&&choosing(d)&&no===d.stamps.length,top=stepOf(d)===steps.length-1&&d.done;
  const after=stepOf(d)+1;
  const coinNote=!stamp?null:top&&no===d.stamps.length?{ok:true,text:`${LEVEL_KO[lv]} 도전 완주! 최종 보상 ${coin(steps[steps.length-1])}을 받았어. 오늘 도전은 여기까지야.`}
    :choose&&no===DESK.perDay?{ok:true,text:`${DESK.perDay}장 다 맞혔어! ${coin(CHALLENGE.easy[0])} 확보. 그만두면 바로 받고, 도전하면 이 코인을 걸고 두 장을 더 풀어. 다 맞히면 쉬운 도전 ${coin(CHALLENGE.easy[1])} · 어려운 도전 ${coin(CHALLENGE.hard[1])}, 하나라도 틀리면 전부 몰수야. 처음 고른 난이도는 오늘 계속 그대로야.`}
    :choose?{ok:true,text:`${round}단계 성공! 지금 ${coin(stepCoins(d))}. 다음 도전을 다 맞히면 ${coin(steps[after])}, 틀리면 전부 몰수야.`}
    :inRun&&stamp.right?{ok:true,text:`한 장 더 맞히면 ${coin(next)}!`}
    :lost?{ok:false,text:`도전 실패. 걸었던 ${coin(held)}은 전부 몰수야.`}:null;
  // a 100-question paper's one-tap answer, or its 제출
  const send=(r:Resp)=>{if(q)press(0,r)};
  return <section className="hs-quiz" data-side={stamp?'back':'front'} data-kind={q?.type??'stamp'} aria-label="오늘의 퀴즈 서류">
    <div className="hs-piles" aria-hidden><span className="hs-pile done" data-n={Math.min(done,6)}>{done}</span><span className="hs-pile left" data-n={Math.min(n-done,6)}>{n-done}</span></div>
    <article className="hs-doc" key={p.id+(stamp?':b':':f')} style={{['--tilt' as string]:`${(mark.rot%3)*0.4}deg`}}>
      <header className="hs-type">{inRun?<span className="hs-run">{LEVEL_KO[lv]} 도전 {round}단계 · {inPair}/2 · {coin(next)}</span>:<span>문서 No.{String(no).padStart(2,'0')} / {String(DESK.perDay).padStart(2,'0')}</span>}<span>{d.day.replaceAll('-','.')}</span>
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
        {coinNote&&<p className="hs-coin" data-ok={coinNote.ok}>{coinNote.text}</p>}
      </>}
      {stamp&&<span className="hs-ink" data-c={INK(p,stamp)} style={{transform:`translate(${mark.x}px,${mark.y}px) rotate(${mark.rot}deg)`}}>{STAMP_TEXT(p,stamp)}</span>}
    </article>
    <div className="hs-bar">{!stamp?(!q||q.type==='true_false'?<div className="hs-stamps" role="group" aria-label="도장">{(q?q.data.options!.map(o=>o.text):p.options).map((o,i)=>
      <button key={o} type="button" className="hs-stamp" data-c={i===0?'yes':'no'} onClick={()=>q?press(0,q.data.options![i].id):press(i as 0|1)}><span>{o}</span></button>)}</div>
      :ONE_TAP.includes(q.type)?null
      :<div className="hs-acts"><button type="button" className="rt-btn primary hs-send" disabled={!ready(q,resp)} onClick={()=>resp!==null&&send(resp)}>제출</button></div>)
      :first?<div className="hs-acts"><button type="button" className="rt-btn primary" onClick={onUp}>닫기</button></div>
      :<div className="hs-acts"><button type="button" className="rt-btn ghost" onClick={onUp}>닫기</button>
        {choose&&<button type="button" className="rt-btn hs-cash" onClick={()=>{onStop();setBack(null)}}>{`그만하고 ${coin(stepCoins(d))} 받기`}</button>}
        {choose&&!d.level?(['easy','hard'] as Level[]).map(l=><button key={l} type="button" className="rt-btn primary" data-level={l} onClick={()=>{onChallenge(l);setBack(null)}}>{`${LEVEL_KO[l]} 도전 · ${coin(CHALLENGE[l][after])}`}</button>)
          :choose?<button type="button" className="rt-btn primary" onClick={()=>{onChallenge(lv);setBack(null)}}>{`${LEVEL_KO[lv]} 도전 계속 · ${coin(steps[after])}`}</button>
          :<button type="button" className="rt-btn primary" data-lost={lost} onClick={()=>setBack(null)}>{d.done?'결과표 보기':'다음 장'}</button>}</div>}</div>
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
    // 피드백 2026-11-26 "연결 문제 답이 안 골라져": no two-step pick any more: the descriptions sit on the right with their
    // letters, and each word on the left has its own row of letter chips: one tap pairs it (a letter taken elsewhere moves)
    case 'matching':
      return <div className="hs-match">
        <div className="hs-left" role="group" aria-label="단어">{d.left!.map(l=><div key={l.id} className="hs-mrow" role="group" aria-label={l.text}>
          <span>{l.text}</span><div>{d.right!.map((o,k)=><button key={o.id} type="button" className="hs-chipbtn" aria-pressed={map[l.id]===o.id} aria-label={`${l.text} → ${ABC[k]}`}
            onClick={()=>{const n:Record<string,string>={};for(const [a,b] of Object.entries(map))if(b!==o.id&&a!==l.id)n[a]=b;n[l.id]=o.id;set(n)}}>{ABC[k]}</button>)}</div></div>)}</div>
        <div className="hs-right" role="list" aria-label="설명">{d.right!.map((o,k)=><div key={o.id} role="listitem" className="hs-mdef" data-used={Object.values(map).includes(o.id)}>
          <i>{ABC[k]}</i><span>{o.text}</span></div>)}</div>
        <p className="hs-hint">단어마다 맞는 설명의 글자를 눌러요.</p></div>;
    case 'fill_blank':
      return <div className="hs-fill">{d.blanks!.map(b=><label key={b.id}><span className="sr-only">빈칸</span>
        <input type="text" inputMode={b.input_type==='number'?'decimal':'text'} autoComplete="off" aria-label={b.input_type==='number'?'숫자 입력':'답 입력'} value={map[b.id]??''}
          onChange={e=>set({...map,[b.id]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&ready(q,{...map,[b.id]:(e.target as HTMLInputElement).value}))send({...map,[b.id]:(e.target as HTMLInputElement).value})}}/>
        {b.unit&&<em>{b.unit}</em>}</label>)}<p className="hs-hint">{d.blanks!.some(b=>b.input_type==='number')?'숫자만 넣어요. 단위는 붙어 있어요.':'낱말로 적어요.'}</p></div>;
  }
  return null;
}
