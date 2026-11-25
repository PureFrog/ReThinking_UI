// 도장첩: the player's achievements, all about the work of judging (never returns). Each stamp is earned once, on the
// day it first holds, and shown in the observer's room (ui/MyPage.tsx) as a seal on its page; the ones not earned yet
// stay as empty outlines with what it takes, so there is always a next one. Some unlock things to wear (core/wardrobe.ts).
export type StampId='observatory-first'|'expedition'|'expedition-sure'|'expedition-weeks'|'first-judgment'|'first-grade'|'sure-hit'|'humble'|'ten-judgments'|'streak7'|'rewind10'|'roots'|'capsule'|'case5'|'day-done'|'calibrated';
export type StampCtx={judgments:number;graded:{hit:boolean;confidence:number}[];bestStreak:number;rewinds:number;cases:number;daysDone:number;
  seen:{cutaway:number;bury:number};calibration:number|null;
  // 관측소 원정 runs (core/game/run.ts RunRecord): the week, and whether a 4-chip decision hit
  expeditions?:{week:string;sureHit:boolean}[];
  // 오늘의 관측소 (core/game/daily/rewards.ts first-clear): scored, ranked completions
  observatoryClears?:number};
export const STAMPS:{id:StampId;name:string;how:string;check:(c:StampCtx)=>boolean}[]=[
  {id:'first-judgment',name:'첫 판단',how:'판단 1개 기록',check:c=>c.judgments>=1},
  {id:'capsule',name:'첫 저장',how:'판단을 저장해 채점 대기에 넣기',check:c=>c.seen.bury>=1},
  {id:'first-grade',name:'첫 채점',how:'채점 결과 1개 확인',check:c=>c.graded.length>=1},
  {id:'roots',name:'재무 체력 확인',how:'재무 체력 보기',check:c=>c.seen.cutaway>=1},
  {id:'day-done',name:'오늘 할 일 완료',how:'오늘 할 일 3개 끝내기',check:c=>c.daysDone>=1},
  {id:'sure-hit',name:'확신 5 적중',how:'확신 5로 적중',check:c=>c.graded.some(g=>g.hit&&g.confidence===5)},
  {id:'humble',name:'확신 1~2로 빗나감',how:'확신을 낮게 걸고 빗나가 손해를 줄이기',check:c=>c.graded.some(g=>!g.hit&&g.confidence<=2)},
  {id:'case5',name:'케이스 5개',how:'오늘의 케이스 5개 풀기',check:c=>c.cases>=5},
  {id:'streak7',name:'7일 연속',how:'케이스를 7일 연속 풀기',check:c=>c.bestStreak>=7},
  {id:'ten-judgments',name:'판단 10개',how:'판단 10개 기록',check:c=>c.judgments>=10},
  {id:'rewind10',name:'되감기 10판',how:'되감기 10판',check:c=>c.rewinds>=10},
  {id:'expedition',name:'첫 챌린지',how:'주간 챌린지 1판 끝내기',check:c=>(c.expeditions?.length??0)>=1},
  {id:'expedition-sure',name:'칩 4개 적중',how:'챌린지에서 칩 4개 건 결정을 맞히기',check:c=>!!c.expeditions?.some(e=>e.sureHit)},
  {id:'expedition-weeks',name:'4주 연속 챌린지',how:'주간 챌린지를 4주 연속',check:c=>weeksInRow((c.expeditions??[]).map(e=>e.week))>=4},
  {id:'calibrated',name:'보정 80 달성',how:'채점 5개 이상, 확신 보정 80 이상',check:c=>c.graded.length>=5&&(c.calibration??0)>=80},
  {id:'observatory-first',name:'첫 관측 완주',how:'오늘의 관측소 과제 하나를 정식으로 끝내기',check:c=>(c.observatoryClears??0)>=1},
];
export const stampById=(id:StampId)=>STAMPS.find(s=>s.id===id)!;
// what holds now that was not stamped before (stamped: the ids already in the save)
export function newStamps(ctx:StampCtx,stamped:string[]):StampId[]{return STAMPS.filter(s=>!stamped.includes(s.id)&&s.check(ctx)).map(s=>s.id)}
// the longest run of consecutive weeks (Monday dates) in a list
export function weeksInRow(weeks:string[]){const t=[...new Set(weeks)].map(w=>Date.parse(w+'T00:00:00Z')/(7*86400000)).sort((a,b)=>a-b);let best=0,run=0;for(let i=0;i<t.length;i++){run=i&&Math.round(t[i]-t[i-1])===1?run+1:1;best=Math.max(best,run)}return best}
