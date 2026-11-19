// SERVER ONLY — never import this from app/proto3d or app/content (tests/daily-quest.test.mjs checks it). (feedback
// 2026-11-19: 미래 과제의 이름·순서·배정일·선행 조건·시나리오 팩은 백엔드에만.) The course and the one rule that gives a
// player today's request: the request already finished today if there is one (one new request a day), else the first
// of the course not finished yet. The app only ever receives the single definition handed out.
// Tiers (feedback F2): each day teaches one new thing, and the help follows it (도움의 양은 그날 새로 배우는 기능에 맞춘다).
//   입문  target and period given; pick the direction, write why in one line
//   기초  the target stays given; one new practice a day — evidence, weighing two cards, choosing when to check (the
//         only day the period is chosen), saying how the view moved since the last scene
//   중급  choosing the target; the first counterexample day gives target and period again; a rival held alongside
//   상급  the hypothesis written freely (target, period, direction) with reason, counterexample and a recheck condition
// The level picks the sample pack when no official one is assigned (content/daily/server-packs.ts serverPackOf).
import type {Aid,QuestDef} from './model';
const GIVEN:Aid={target:'given',period:'given'};
export const COURSE:QuestDef[]=[
  {id:'q1',name:'가격표 뒤의 고객',tier:'입문',teaches:'방향 고르고 한 줄 쓰기',level:1,fields:['hypo'],aid:GIVEN},
  {id:'q2',name:'진열대의 단서',tier:'기초',teaches:'근거 자료 고르기',level:2,fields:['hypo','reason'],aid:GIVEN},
  {id:'q3',name:'엇갈린 두 자료',tier:'기초',teaches:'다른 쪽을 가리키는 두 자료 저울질',level:2,fields:['hypo','reason'],aid:GIVEN,evFrom:'focus'},
  {id:'q4',name:'언제 확인할까',tier:'기초',teaches:'확인할 시점 고르기',level:2,fields:['hypo'],aid:{target:'given',period:'choose'}},
  {id:'q5',name:'지난 판단과 오늘',tier:'기초',teaches:'새 자료로 판단이 어떻게 움직였는지 밝히기',level:2,fields:['hypo','shift'],aid:GIVEN},
  {id:'q6',name:'무엇을 볼까',tier:'중급',teaches:'확인할 대상 고르기',level:3,fields:['hypo'],aid:{target:'choose',period:'given'}},
  {id:'q7',name:'내 가설의 빈틈',tier:'중급',teaches:'반례',level:3,fields:['hypo','counter'],aid:GIVEN},
  {id:'q8',name:'두 회사의 갈림길',tier:'중급',teaches:'비교 종목과 함께 읽기',level:4,fields:['hypo','reason','counter'],aid:{target:'choose',period:'choose'}},
  {id:'q9',name:'내가 세우는 가설',tier:'상급',teaches:'대상·기간·방향을 직접 세우기',level:5,fields:['hypo','reason','counter']},
  {id:'q10',name:'다음 관측을 예약하라',tier:'상급',teaches:'재점검',level:5,fields:['hypo','reason','counter','recheck']},
];
export const questById=(id:string)=>COURSE.find(q=>q.id===id)??null;
// today's request for a player: finished = their settled runs with the KST day each was finished on
export function requestFor(finished:{quest:string;day:string}[],today:string):{def:QuestDef;done:boolean}|null{
  const todays=[...finished].reverse().find(f=>f.day===today);
  if(todays){const d=questById(todays.quest);if(d)return {def:d,done:true}}
  const done=new Set(finished.map(f=>f.quest)),next=COURSE.find(q=>!done.has(q.id));
  return next?{def:next,done:false}:null;
}
