// 도장첩: the player's achievements, all about the work of judging (never returns). Each stamp is earned once, on the
// day it first holds, and shown in the observer's room (ui/MyPage.tsx) as a seal on its page; the ones not earned yet
// stay as empty outlines with what it takes, so there is always a next one. Some unlock things to wear (core/wardrobe.ts).
export type StampId='first-judgment'|'first-grade'|'sure-hit'|'humble'|'ten-judgments'|'streak7'|'rewind10'|'roots'|'capsule'|'case5'|'day-done'|'calibrated';
export type StampCtx={judgments:number;graded:{hit:boolean;confidence:number}[];bestStreak:number;rewinds:number;cases:number;daysDone:number;
  seen:{cutaway:number;bury:number};calibration:number|null};
export const STAMPS:{id:StampId;name:string;how:string;check:(c:StampCtx)=>boolean}[]=[
  {id:'first-judgment',name:'첫 기록',how:'판단 하나 남기기',check:c=>c.judgments>=1},
  {id:'capsule',name:'첫 캡슐',how:'판단을 캡슐로 묻기',check:c=>c.seen.bury>=1},
  {id:'first-grade',name:'첫 판정',how:'판정 하나 열기',check:c=>c.graded.length>=1},
  {id:'roots',name:'땅 속 관찰',how:'뿌리 단면 보기',check:c=>c.seen.cutaway>=1},
  {id:'day-done',name:'하루 완주',how:'오늘 할 일 셋 다 하기',check:c=>c.daysDone>=1},
  {id:'sure-hit',name:'확신 적중',how:'확신 5로 적중',check:c=>c.graded.some(g=>g.hit&&g.confidence===5)},
  {id:'humble',name:'겸손한 빗나감',how:'확신 1~2로 빗나가 손해 없이 넘기기',check:c=>c.graded.some(g=>!g.hit&&g.confidence<=2)},
  {id:'case5',name:'사례 다섯 장',how:'오늘의 케이스 5장 풀기',check:c=>c.cases>=5},
  {id:'streak7',name:'7일 연속',how:'케이스를 7일 연속 풀기',check:c=>c.bestStreak>=7},
  {id:'ten-judgments',name:'판단 열 권',how:'판단 10개 기록',check:c=>c.judgments>=10},
  {id:'rewind10',name:'되감기 열 판',how:'되감기 10판',check:c=>c.rewinds>=10},
  {id:'calibrated',name:'확신이 맞는 사람',how:'판정 5개 이상, 확신 보정 80 이상',check:c=>c.graded.length>=5&&(c.calibration??0)>=80},
];
export const stampById=(id:StampId)=>STAMPS.find(s=>s.id===id)!;
// what holds now that was not stamped before (stamped: the ids already in the save)
export function newStamps(ctx:StampCtx,stamped:string[]):StampId[]{return STAMPS.filter(s=>!stamped.includes(s.id)&&s.check(ctx)).map(s=>s.id)}
