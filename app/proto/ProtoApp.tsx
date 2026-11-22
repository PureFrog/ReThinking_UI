'use client';
// The phone prototype (/app, user request 2026-11-11): one space per screen, a door moves between them with a question,
// and the features sit on buttons (the tab bar), not on furniture. Core only: quizzes, the journal, and a friend who
// comes over and asks why a stock was bought. The calculations are the game's own (app/core, app/content);
// the save is separate (little-garden-proto-v1) so the full garden is not touched.
import {useEffect,useMemo,useRef,useState} from 'react';
import {Home,Sprout,CalendarDays,User,Sun,Flame,DoorOpen,X,ChevronRight,ChevronLeft,Send,BookOpen,Droplets,PenLine,Star} from 'lucide-react';
import {ROOMS,BOOKSHELF,SHELF_BOOKS,CALENDAR,SOFA,PLOTS,FARM_PX,FARM_TREE_SCALE,FOCUS,type RoomId} from './rooms';
import {initial,treeState,defaultRules,heldDays,CONDITION_NAMES,GROWTH_NAMES,type Holding} from '../core/model';
import {saveJournal,answerNews,careOf,journalOf,MOODS,type Care,type JournalEntry} from '../core/care';
import {BOOKS,blankQuiz,answerBook,nextQuestion,firstOpenBook,isGold,type QuizProgress} from '../core/quiz-books';
import {blankStreak,checkStreak,answerStreak,shownCount,type Streak} from '../core/streak';
import {reasonEntry} from '../core/stop-loss';
import {isoDay,formatDay} from '../core/items';
import {newsProvider,type NewsQuiz} from '../content/news';
import {FRIENDS,friendById,portraitStyle} from '../content/friends';
import {friendLine,askLine,heardLine} from '../content/content';
import {CareJournal,NewsQuizView} from '../ui/Care';
import {deliveredArt,standInArt,treeName} from '../scene/tree-art';
import {TREE_FIT} from '../scene/treeFit';
import {TIMING} from '../core/timing';

const KEY='little-garden-proto-v1';
// quizDays: the days a quiz was answered (the wall calendar marks them, with the days a journal page was written)
type Save={holdings:Holding[];care:Care;journal:JournalEntry[];quiz:QuizProgress;streak:Streak;sunlight:number;asked:string[];quizDays:string[]};
const blank=():Save=>({holdings:initial,care:{},journal:[],quiz:blankQuiz(),streak:blankStreak(),sunlight:0,asked:[],quizDays:[]});
// a month as weeks of day numbers (null before the 1st and after the last day), Sunday first
function monthGrid(y:number,m:number){const first=new Date(y,m-1,1).getDay(),n=new Date(y,m,0).getDate();const cells:(number|null)[]=[...Array(first).fill(null),...Array.from({length:n},(_,i)=>i+1)];while(cells.length%7)cells.push(null);return cells}
const dayKey=(y:number,m:number,d:number)=>y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
type Tab='home'|'quiz'|'journal'|'my';
// the friend's speech: a line, and what the player can answer
type Talk={id:string;text:string;menu?:'ask'|'none';holding?:number};

export default function ProtoApp(){
 const [save,setSave]=useState<Save>(blank),[loaded,setLoaded]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw)setSave({...blank(),...JSON.parse(raw)})}catch{}setLoaded(true)},[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(KEY,JSON.stringify(save))}catch{}},[save,loaded]);
 const day=isoDay();const saveRef=useRef(save);saveRef.current=save;
 useEffect(()=>{if(loaded)setSave(s=>({...s,streak:checkStreak(s.streak,day)}))},[loaded]);
 const [tab,setTab]=useState<Tab>('home'),[room,setRoom]=useState<RoomId>('living'),[fading,setFading]=useState(false);
 // the wall calendar's big view: which month it shows, or null when closed
 const [cal,setCal]=useState<{y:number;m:number}|null>(null);
 const [note,setNote]=useState('');const noteTimer=useRef<ReturnType<typeof setTimeout>>(undefined);
 const say=(t:string)=>{setNote(t);clearTimeout(noteTimer.current);noteTimer.current=setTimeout(()=>setNote(''),2600)};
 // what the journal and quiz tabs open on (a tree pressed in the farm picks it)
 const [pick,setPick]=useState<number|null>(null);const [tree,setTree]=useState<Holding|null>(null);
 function go(to:RoomId){setTalk(null);setWriting(false);setFading(true);setTimeout(()=>{setRoom(to);setFading(false)},TIMING.fade*1.6)}
 // the room fills the screen's height and scrolls sideways; it opens on the part that matters (FOCUS, % of the picture)
 const view=useRef<HTMLDivElement>(null);
 useEffect(()=>{const v=view.current;if(!v||ROOMS[room].fit!=='height')return;const inner=v.firstElementChild as HTMLElement|null;if(!inner)return;v.scrollLeft=Math.max(0,inner.offsetWidth*FOCUS[room]/100-v.clientWidth/2)},[room,tab,loaded]);
 // a quiz of any kind: the day counts for the run, a bonus at 3/7/14/30 days
 function countQuiz(s:Save):Save{const r=answerStreak(s.streak,day);if(r.bonus)say(`연속 ${r.streak.count}일! 햇살 조각 ${r.bonus}개를 받았어.`);const qd=s.quizDays??[];return {...s,streak:r.streak,sunlight:s.sunlight+r.bonus,quizDays:qd.includes(day)?qd:[...qd,day]}}

 // ── the friend who comes over (option 가: every opening, about one tree in loss) ──
 const [friend,setFriend]=useState<string|null>(null),[talk,setTalk]=useState<Talk|null>(null),[reason,setReason]=useState(''),[writing,setWriting]=useState(false);
 useEffect(()=>{if(!loaded)return;const id=FRIENDS[Math.floor(Math.random()*FRIENDS.length)].id;
  const t1=setTimeout(()=>{setFriend(id);setTalk({id,text:friendLine(id,'greet')})},TIMING.onboardKnock);
  // then it asks about a tree in loss, one not asked about today first
  const t2=setTimeout(()=>{const s=saveRef.current,h=s.holdings.filter(h=>h.rate<0).find(h=>!s.asked.includes(h.id+':'+day))??s.holdings.find(h=>h.rate<0);if(h)setTalk({id,text:askLine(id,h.name),menu:'ask',holding:h.id})},TIMING.onboardKnock+TIMING.onboardLine);
  return ()=>{clearTimeout(t1);clearTimeout(t2)}},[loaded]);
 function answerWhy(){if(!talk?.holding||!reason.trim())return;const h=save.holdings.find(v=>v.id===talk.holding);if(!h)return;
  setSave(s=>({...s,journal:[...s.journal,reasonEntry(h,reason,talk.id,day)],asked:[...s.asked,h.id+':'+day]}));setTalk({id:talk.id,text:heardLine(talk.id,reason.trim())});setReason('');setWriting(false)}
 function later(){if(!talk)return;if(talk.holding)setSave(s=>({...s,asked:[...s.asked,talk.holding+':'+day]}));setTalk({id:talk.id,text:friendLine(talk.id,'bye')});setWriting(false)}

 // ── journal tab ──
 const [jPick,setJPick]=useState<number|null>(null);const jTree=save.holdings.find(h=>h.id===(jPick??pick))??save.holdings[0];
 const [jKey,setJKey]=useState(0);
 function writeJournal(e:{saw:string;think:string;mood:any}){if(!jTree)return;const entry:JournalEntry={id:'j'+Date.now(),holdingId:jTree.id,name:jTree.name,day,...e};
  setSave(s=>{const r=saveJournal(s.care,s.journal,entry);if(r.reward)say('일지를 남겼어. 햇살 조각 1개!');else say('일지를 남겼어.');return {...s,care:r.care,journal:r.journal,sunlight:s.sunlight+(r.reward?1:0)}});setJKey(k=>k+1)}

 // ── quiz tab ──
 const [book,setBook]=useState(''),[bookPick,setBookPick]=useState<number|null>(null),[missed,setMissed]=useState<number[]>([]);
 const openBook=BOOKS.find(b=>b.id===book)??firstOpenBook(save.quiz);const [bookQ,setBookQ]=useState(()=>nextQuestion(save.quiz,openBook));
 useEffect(()=>{setBookQ(nextQuestion(save.quiz,openBook,missed));setBookPick(null)},[openBook.id,loaded]);
 function answerPage(i:number){if(bookPick!==null)return;setBookPick(i);setSave(s=>{const r=answerBook(s.quiz,openBook.id,bookQ,i,day);if(!r.right)setMissed(m=>[...m,bookQ]);if(r.gold)say(`'${openBook.title}' 책이 금박으로 바뀌었어!`);else if(r.reward)say('맞았어! 햇살 조각 1개.');return countQuiz({...s,quiz:r.progress,sunlight:s.sunlight+(r.reward?1:0)})})}
 const nextPage=()=>{setBookQ(nextQuestion(save.quiz,openBook,missed));setBookPick(null)};
 const [nPick,setNPick]=useState<number|null>(null);const nTree=save.holdings.find(h=>h.id===(nPick??pick))??save.holdings[0];
 const news:NewsQuiz|null=useMemo(()=>nTree?newsProvider.quizFor(nTree.name,day,careOf(save.care,nTree.id).answered??[]):null,[nTree?.id,day,loaded,save.care]);
 // the answered quiz stays on screen (with what really happened) until another tree is picked
 const [oxAnswer,setOx]=useState<{quiz:NewsQuiz;o:boolean;tree:number}|null>(null);
 function answerOx(o:boolean){if(!nTree||!news)return;setOx({quiz:news,o,tree:nTree.id});const right=o===news.truth;setSave(s=>{const r=answerNews(s.care,nTree.id,news.id,right,day);if(r.reward)say('맞았어! 햇살 조각 1개.');return countQuiz({...s,care:r.care,sunlight:s.sunlight+(r.reward?1:0)})})}
 const shownNews=oxAnswer&&oxAnswer.tree===nTree?.id?oxAnswer.quiz:news;

 const books=save.journal.length,streak=shownCount(save.streak,day);
 // how far each of the three shelves is filled (right edge of its last book, % of the picture; 0 = empty)
 const journalDays=useMemo(()=>new Set(save.journal.map(e=>e.day)),[save.journal]),quizDays=useMemo(()=>new Set(save.quizDays??[]),[save.quizDays]);
 const calNow={y:Number(day.slice(0,4)),m:Number(day.slice(5,7))};
 const roomNow=ROOMS[room];
 const treeArt=(h:Holding)=>{const st=treeState(h,defaultRules);const a=deliveredArt(h.kind,st.growth,st.condition)??standInArt(h.kind,st.growth,st.condition)??{url:`/assets/trees/tree_${h.kind}_${st.growth}_well.png`};const name=a.url.split('/').pop()!.replace('.png','');const [fx,fy,k]=TREE_FIT[name]??[256,451,1];return {url:a.url,fx,fy,k,st}};
 const chips=(value:number|undefined,set:(id:number)=>void)=><div className="proto-chips" role="group" aria-label="종목 고르기">{save.holdings.map(h=><button key={h.id} aria-pressed={value===h.id} className={value===h.id?'on':''} onClick={()=>set(h.id)}>{h.name}</button>)}</div>;

 return <div className="proto"><div className="proto-phone">
  <header className="proto-head"><span className="proto-avatar" style={portraitStyle(friendById(friend??'moa'))}/><h1><Home size={22}/>마음의 집</h1>
   <div className="proto-stats"><span aria-label={'햇살 조각 '+save.sunlight+'개'}><Sun size={14}/>{save.sunlight}</span><span aria-label={'퀴즈 연속 '+streak+'일'}><Flame size={14}/>{streak}일</span></div></header>

  <main className="proto-main">
   {tab==='home'&&<section className={'proto-home fit-'+roomNow.fit}>
    <p className="proto-room-name">{roomNow.name}</p>
    <div className="proto-view" ref={view}><div className={'proto-room'+(fading?' fading':'')} style={{aspectRatio:String(roomNow.aspect)}}>
     <img className="proto-bg" src={roomNow.bg} alt={roomNow.name} draggable={false}/>
     {room==='living'&&<>
      {/* the bookcase starts empty and takes one book per journal page */}
      <button className="proto-shelf" aria-label={'책장 · 일지 '+books+'권'} style={{left:BOOKSHELF.box[0]+'%',top:BOOKSHELF.box[1]+'%',width:BOOKSHELF.box[2]+'%',height:BOOKSHELF.box[3]+'%'}} onClick={()=>setTab('journal')}>
       <img src="/assets/proto/shelf_empty.png" alt="" draggable={false}/>
       {SHELF_BOOKS.slice(0,books).map(([sh,l,r],i)=><img key={i} className="proto-book" src={`/assets/proto/shelf_books${sh+1}.png`} alt="" draggable={false} style={{clipPath:`inset(0 ${100-r}% 0 ${l}%)`}}/>)}
       <span className="proto-books">{books}권</span>
      </button>
      {books===0&&<div className="proto-hint" style={{left:BOOKSHELF.box[0]+BOOKSHELF.box[2]/2+'%',top:BOOKSHELF.box[1]+8+'%'}}>일지를 쓰면<br/>책이 한 권씩 꽂혀요</div>}
      {/* the wall calendar: this month, a mark on each day a journal page was written or a quiz answered */}
      <button className="proto-wallcal" aria-label={`벽 달력 · ${calNow.m}월`} style={{left:CALENDAR.left+'%',top:CALENDAR.top+'%',width:CALENDAR.w+'%',height:CALENDAR.h+'%',transform:`skewY(${CALENDAR.skew}deg)`}} onClick={()=>setCal(calNow)}>
       <span className="proto-wallcal-head">{calNow.m}월</span>
       <span className="proto-wallcal-grid">{monthGrid(calNow.y,calNow.m).map((d,i)=>{const k=d?dayKey(calNow.y,calNow.m,d):'';return <i key={i} className={(d&&journalDays.has(k)?'j ':'')+(d&&quizDays.has(k)?'q ':'')+(k===day?'today':'')}/>})}</span>
      </button>
      {friend&&<button className="proto-friend" aria-label={friendById(friend).name+'와 이야기'} style={{left:SOFA.x+'%',top:SOFA.y+'%',width:SOFA.w+'%'}} onClick={()=>!talk&&setTalk({id:friend,text:friendLine(friend,'talk')})}><img src={`/assets/characters/friend_${friend}_sit.png`} alt=""/></button>}
     </>}
     {room==='farm'&&save.holdings.map(h=>{const p=PLOTS[h.plot];if(!p)return null;const a=treeArt(h);const g=a.k*FARM_TREE_SCALE,w=256*g*FARM_PX.x,ht=256*g*FARM_PX.y;
      return <button key={h.id} className="proto-tree" aria-label={h.name+' 나무'} style={{left:p[0]-g*a.fx/2*FARM_PX.x+'%',top:p[1]-g*a.fy/2*FARM_PX.y+'%',width:w+'%',height:ht+'%'}} onClick={()=>setTree(h)}><img src={a.url} alt=""/><span className="proto-tag" style={{top:a.fy/512*100+4+'%'}}>{h.name}</span></button>})}
     {/* the door: press it and you go, the label says where */}
     <button className={'proto-door door-'+room} style={{left:roomNow.door.box[0]+'%',top:roomNow.door.box[1]+'%',width:roomNow.door.box[2]+'%',height:roomNow.door.box[3]+'%'}} aria-label={roomNow.door.label} onClick={()=>go(roomNow.door.to)}><span><DoorOpen size={17}/>{roomNow.door.label}</span></button>
    </div></div>
     {talk&&room==='living'&&<div className="proto-bubble" role="dialog" aria-label={friendById(talk.id).name+'의 말'}><strong style={{background:friendById(talk.id).color}}>{friendById(talk.id).name}</strong><p>{talk.text}</p>
      {talk.menu==='ask'&&!writing&&<div className="proto-choices"><button className="primary" onClick={()=>setWriting(true)}><Send size={14}/>이유 말하기</button><button onClick={later}>다음에 얘기하자</button></div>}
      {writing&&<form onSubmit={e=>{e.preventDefault();answerWhy()}}><textarea autoFocus rows={3} aria-label="처음에 산 이유" placeholder="처음에 산 이유는…" value={reason} onChange={e=>setReason(e.target.value)}/><button className="primary" disabled={!reason.trim()}>들려주기</button></form>}
      {talk.menu!=='ask'&&<button className="proto-close" aria-label="말풍선 닫기" onClick={()=>setTalk(null)}><X size={16}/></button>}
     </div>}
    {room==='farm'&&<p className="proto-caption">나무를 누르면 그 종목의 일지와 뉴스 퀴즈로 갈 수 있어요.</p>}
   </section>}

   {tab==='quiz'&&<section className="proto-page">
    <h2><BookOpen size={18}/>책장 퀴즈</h2>
    <nav className="proto-books-row" aria-label="퀴즈 책">{BOOKS.map(b=><button key={b.id} aria-pressed={b.id===openBook.id} className={(b.id===openBook.id?'on ':'')+(isGold(save.quiz,b)?'gold':'')} style={{['--spine' as string]:b.color}} onClick={()=>{setBook(b.id);setMissed([])}}>{b.title}</button>)}</nav>
    <div className="proto-card"><p className="proto-q">{openBook.questions[bookQ].q}</p>
     <div className="proto-answers">{openBook.questions[bookQ].options.map((o,i)=><button key={o} className={bookPick===i?'chosen':''} disabled={bookPick!==null} onClick={()=>answerPage(i)}>{o}<ChevronRight size={16}/></button>)}</div>
     {bookPick!==null&&<div className="proto-why"><strong>{bookPick===openBook.questions[bookQ].answer?'맞아요.':'책갈피를 꽂아 둘게요. 다음에 다시 나와요.'}</strong><p>{openBook.questions[bookQ].why}</p><button className="primary" onClick={nextPage}>다음 문제</button></div>}</div>
    <h2><Sprout size={18}/>내 종목 뉴스 OX</h2>
    {chips(nTree?.id,id=>{setNPick(id);setOx(null)})}
    <div className="proto-card">{shownNews?<NewsQuizView key={shownNews.id} quiz={shownNews} answer={oxAnswer&&oxAnswer.quiz.id===shownNews.id?oxAnswer.o:null} onAnswer={answerOx}/>:<p className="proto-muted">이 종목의 다음 소식은 내일 나와요.</p>}</div>
    <p className="proto-muted">하루에 퀴즈 하나만 풀어도 연속일이 이어져요. 새로 맞히면 햇살 조각을 받아요.</p>
   </section>}

   {tab==='journal'&&<section className="proto-page">
    <h2><CalendarDays size={18}/>투자 일지</h2>
    {chips(jTree?.id,id=>setJPick(id))}
    {jTree&&<div className="proto-card"><p className="proto-sub">{jTree.name} · 모의 {jTree.rate>=0?'+':''}{jTree.rate}% · {heldDays(jTree.date)}일째</p>
     <CareJournal key={jTree.id+':'+jKey} name={jTree.name} day={day} past={journalOf(save.journal,jTree.id)} onSave={writeJournal}/>
     <button className="primary proto-wide" type="submit" form="care-journal-form"><Droplets size={15}/>일지 남기기</button></div>}
    <h2>쓴 일지 {books}권</h2>
    <ul className="proto-list">{[...save.journal].reverse().map(e=><li key={e.id}><span className="dot" style={{background:MOODS.find(m=>m.id===e.mood)?.color??'#d9cfb8'}}/><div><strong>{e.name}</strong><small>{formatDay(e.day)}{e.asked?` · ${friendById(e.asked).name}가 물어봄`:''}</small><p>{[e.saw,e.think].filter(Boolean).join(' · ')||MOODS.find(m=>m.id===e.mood)?.label}</p></div></li>)}
     {!save.journal.length&&<li className="proto-muted">아직 쓴 일지가 없어요. 위에서 종목을 골라 첫 일지를 써 보세요.</li>}</ul>
   </section>}

   {tab==='my'&&<section className="proto-page">
    <h2><User size={18}/>마이</h2>
    <div className="proto-card proto-my"><p><Sun size={15}/>햇살 조각 <b>{save.sunlight}</b>개</p><p><Flame size={15}/>퀴즈 연속 <b>{streak}</b>일 · 최고 {save.streak.best}일</p><p><BookOpen size={15}/>쓴 일지 <b>{books}</b>권 · 금박 책 {BOOKS.filter(b=>isGold(save.quiz,b)).length}권</p></div>
    <h2>내 나무 (모의 종목)</h2>
    <ul className="proto-list">{save.holdings.map(h=>{const st=treeState(h,defaultRules);return <li key={h.id}><span className="dot" style={{background:h.rate>=0?'#9cc3a4':'#d9a08f'}}/><div><strong>{h.name}</strong><small>{GROWTH_NAMES[st.growth]} · {CONDITION_NAMES[st.condition]}</small><p>모의 수익률 {h.rate>=0?'+':''}{h.rate}% · {heldDays(h.date)}일째 · 일지 {journalOf(save.journal,h.id).length}장</p></div></li>})}</ul>
    <button className="proto-reset" onClick={()=>{if(confirm('시안 기록을 지우고 처음부터 볼까요?')){localStorage.removeItem(KEY);location.reload()}}}>시안 기록 지우기</button>
   </section>}
  </main>

  {tree&&<div className="proto-sheet" role="dialog" aria-label={tree.name+' 나무'}><div><button className="proto-close" aria-label="닫기" onClick={()=>setTree(null)}><X size={18}/></button>
   <h2>{tree.name}</h2><p className="proto-sub">모의 수익률 {tree.rate>=0?'+':''}{tree.rate}% · {heldDays(tree.date)}일째 · {GROWTH_NAMES[treeState(tree,defaultRules).growth]} · {CONDITION_NAMES[treeState(tree,defaultRules).condition]}</p>
   <div className="proto-choices"><button className="primary" onClick={()=>{setPick(tree.id);setJPick(tree.id);setTree(null);setTab('journal')}}><Droplets size={15}/>일지 쓰기</button><button onClick={()=>{setPick(tree.id);setNPick(tree.id);setOx(null);setTree(null);setTab('quiz')}}><Sprout size={15}/>뉴스 퀴즈</button></div>
   <p className="proto-muted">나무 모습은 매수·매도 권유가 아니에요.</p></div></div>}
  {cal&&<div className="proto-sheet" role="dialog" aria-label="달력" onClick={e=>{if(e.target===e.currentTarget)setCal(null)}}><div className="proto-cal">
   <button className="proto-close" aria-label="닫기" onClick={()=>setCal(null)}><X size={18}/></button>
   <div className="proto-cal-head"><button aria-label="지난달" onClick={()=>setCal(c=>c&&(c.m===1?{y:c.y-1,m:12}:{y:c.y,m:c.m-1}))}><ChevronLeft size={20}/></button><h2>{cal.y}년 <b>{cal.m}월</b></h2><button aria-label="다음 달" onClick={()=>setCal(c=>c&&(c.m===12?{y:c.y+1,m:1}:{y:c.y,m:c.m+1}))}><ChevronRight size={20}/></button></div>
   <div className="proto-cal-grid">{['일','월','화','수','목','금','토'].map(w=><span key={w} className="wd">{w}</span>)}
    {monthGrid(cal.y,cal.m).map((d,i)=>{if(!d)return <span key={i}/>;const k=dayKey(cal.y,cal.m,d),j=journalDays.has(k),q=quizDays.has(k);return <span key={i} className={'d'+(k===day?' today':'')+(j||q?' done':'')} aria-label={`${cal.m}월 ${d}일${j?' 일지':''}${q?' 퀴즈':''}`}><em>{d}</em><small>{j&&<PenLine size={11}/>}{q&&<Star className="q" size={11}/>}</small></span>})}</div>
   <p className="proto-cal-legend"><span><PenLine size={13}/>일지 쓴 날</span><span><Star size={13}/>퀴즈 푼 날</span></p>
   <p className="proto-muted">이번 달 일지 {[...journalDays].filter(k=>k.startsWith(dayKey(cal.y,cal.m,1).slice(0,8))).length}일 · 퀴즈 {[...quizDays].filter(k=>k.startsWith(dayKey(cal.y,cal.m,1).slice(0,8))).length}일</p>
  </div></div>}
  {note&&<div className="proto-note" role="status">{note}</div>}

  <nav className="proto-tabs" aria-label="메뉴">{([['home','홈',Home],['quiz','퀴즈',Sprout],['journal','일지',CalendarDays],['my','마이',User]] as const).map(([id,label,Icon])=><button key={id} aria-pressed={tab===id} className={tab===id?'on':''} onClick={()=>setTab(id)}><Icon size={22}/>{label}</button>)}</nav>
 </div></div>}
