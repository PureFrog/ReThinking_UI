// 집과 마을 (docs/house-village.md, PM 설계 2026-11-19): every visit starts at the desk in the house. The day is a quiz
// bundle of quiz papers (core/desk.ts) and, from quiz Lv.5 on, one case file (core/casefile.ts). The door opens once the
// quiz is done. Pure: the screen keeps the save, these say what the desk looks like and what 보리 says.
//
// Two kinds of state are kept apart (설계 7장): the account's quiz level and unlock (they never go back), and today's quiz
// and case progress (a new Korean day starts them over).
import {DESK,KO_COUNT,type DeskDay} from './desk';
const N=()=>KO_COUNT[DESK.perDay]??String(DESK.perDay);

// 2장, 9-4: the unlock level lives in DESK (core/desk.ts); the check and the lock plate read the same value
export const HOUSE={unlockLevel:DESK.unlockLevel};

// the Korean date (Asia/Seoul) of a moment, whatever the device's time zone
export function kstDay(at:number|Date=Date.now()){
  const t=typeof at==='number'?at:at.getTime(),k=new Date(t+9*3600000);
  return k.getUTCFullYear()+'-'+String(k.getUTCMonth()+1).padStart(2,'0')+'-'+String(k.getUTCDate()).padStart(2,'0');
}

// what is kept for the house (one save per account; app/proto3d/house-store.ts)
export type CaseStatus='new'|'open'|'done';
export type HouseSave={v:1;
  // the account: unlocked for good once the level is reached; unlockedOn = the day it happened (the drawer opens that day)
  unlocked:boolean;unlockedOn:string|null;
  // the case of each day: which file and how far (the bookmark lives with the file, core/casefile.ts)
  cases:{day:string;packId:string;status:CaseStatus}[];
  // finished case files, for the mastery that sets how much 보리 leaves to the player
  solved:number;
  // stop-loss events 보리 has already asked about in the village (never twice)
  heard:string[];
  // the first visit's greeting (보리 meets your eyes and pushes the sheet over)
  greeted:boolean;
  // 오늘의 퀴즈 (9-2): the quiz experience banked by finished bundles, and the bundles of recent days (the stamps on them)
  xp:number;desk:DeskDay[]};
export const HOUSE0:HouseSave={v:1,unlocked:false,unlockedOn:null,cases:[],solved:0,heard:[],greeted:false,xp:0,desk:[]};
export function readHouse(v:unknown):HouseSave{
  const s=v&&typeof v==='object'?v as Partial<HouseSave>:{};
  return {v:1,unlocked:!!s.unlocked,unlockedOn:typeof s.unlockedOn==='string'?s.unlockedOn:null,
    cases:Array.isArray(s.cases)?s.cases.filter(c=>c&&typeof c.day==='string'&&typeof c.packId==='string'):[],
    solved:Number.isFinite(s.solved)?Number(s.solved):0,heard:Array.isArray(s.heard)?s.heard.filter(x=>typeof x==='string').slice(-200):[],greeted:!!s.greeted,
    xp:Number.isFinite(s.xp)?Math.max(0,Number(s.xp)):0,
    desk:Array.isArray(s.desk)?s.desk.filter(d=>d&&typeof d.day==='string'&&Array.isArray(d.ids)&&Array.isArray(d.stamps)).slice(-60):[]};
}

// after a quiz result is final: the level is read again and the unlock is written once (a retry changes nothing)
export function afterQuiz(h:HouseSave,level:number,day:string,unlockAt=HOUSE.unlockLevel):HouseSave{
  if(h.unlocked||level<unlockAt)return h;
  return {...h,unlocked:true,unlockedOn:day};
}
export const deskOf=(h:HouseSave,day:string)=>h.desk.find(d=>d.day===day)??null;
// a day's bundle kept (or its stamps updated); a finished bundle banks its experience once
export function putDesk(h:HouseSave,d:DeskDay):HouseSave{
  const old=deskOf(h,d.day);if(old?.done)return h;
  return {...h,desk:[...h.desk.filter(x=>x.day!==d.day),d].slice(-60),xp:h.xp+(d.done?d.xp:0)};
}
export const seenPapers=(h:HouseSave)=>[...new Set(h.desk.flatMap(d=>d.stamps.map(s=>s.id)))];
export const caseOf=(h:HouseSave,day:string)=>h.cases.find(c=>c.day===day)??null;
// today's case file is handed out once; the server checks the same (설계 7장) — here the device keeps it
export function assignCase(h:HouseSave,day:string,packId:string):HouseSave{
  if(!h.unlocked||caseOf(h,day))return h;
  return {...h,cases:[...h.cases.slice(-60),{day,packId,status:'new'}]};
}
export function setCaseStatus(h:HouseSave,day:string,status:CaseStatus):HouseSave{
  const c=caseOf(h,day);if(!c||c.status===status||c.status==='done')return h;
  return {...h,cases:h.cases.map(x=>x.day===day?{...x,status}:x),solved:h.solved+(status==='done'?1:0)};
}
export const hear=(h:HouseSave,id:string):HouseSave=>h.heard.includes(id)?h:{...h,heard:[...h.heard,id]};

// the desk as the player sits down (설계 2장 표). One of six states:
//   quiz        before Lv.5, today's quiz not done: one sheet, the drawer locked, the door shut
//   locked-done quiz done, still under Lv.5: the sheet stamped, 보리 closes the day, the door open
//   unlocked    today's quiz just reached Lv.5: the latch comes off, 보리 brings out the first case file
//   quiz-first  unlocked before, a new day: the sheet first, today's case file beside it
//   case        quiz done, today's case not finished: the file (new or bookmarked), the door open
//   day-done    both done: things put away, 보리 turns toward the door
export type DeskState='quiz'|'locked-done'|'unlocked'|'quiz-first'|'case'|'day-done';
export function deskState(o:{unlocked:boolean;unlockedOn:string|null;quizDone:boolean;caseStatus:CaseStatus|null;day:string}):DeskState{
  if(!o.unlocked)return o.quizDone?'locked-done':'quiz';
  if(!o.quizDone)return 'quiz-first';
  if(o.caseStatus==='done')return 'day-done';
  // the day of the unlock, before the file is opened: the reveal (once opened it is a plain case day)
  if(o.unlockedOn===o.day&&(o.caseStatus===null||o.caseStatus==='new'))return 'unlocked';
  return 'case';
}
// the door opens with the day's quiz (2장: going out is possible once the quiz is done)
export const doorOpen=(d:DeskState)=>d!=='quiz'&&d!=='quiz-first';
// what 보리 says as you look up (no advice, no calls on prices)
export function boriLine(d:DeskState,o:{first:boolean;level:number;caseStatus:CaseStatus|null;started?:boolean}):string{
  switch(d){
    case 'quiz':return o.first?`왔어? 오늘 문서 ${N()} 장이야. 한 장씩 같이 보자.`:o.started?'아까 하던 데서부터 이어 보자. 다음 장 올려 둘게.':`오늘 문서 ${N()} 장 가져왔어. 같이 보자.`;
    case 'locked-done':return '오늘은 여기까지야. 밖에 나갈까?';
    case 'unlocked':return '이제 네가 직접 살펴볼 사건이 있어. 펼쳐 볼래?';
    case 'quiz-first':return o.started?'남은 문서부터 마저 보자. 사건철은 그다음이야.':'문서부터 보자. 사건철은 그다음에 펼칠게.';
    case 'case':return o.caseStatus==='open'?'어제 접어 둔 데서부터 이어 보자. 책갈피 끼워 뒀어.':'오늘 사건철이야. 펼쳐 볼래, 아니면 밖에 먼저 나갈래?';
    case 'day-done':return '오늘 할 건 다 했어. 밖에 나가 볼까?';
  }
}
// the lock plate on the drawer handle: the exact level, from the same setting the check reads
export const lockPlate=(level:number,unlockAt=HOUSE.unlockLevel)=>({title:`시나리오 · 퀴즈 Lv.${unlockAt}에 열려요`,now:`현재 Lv.${level}`});
