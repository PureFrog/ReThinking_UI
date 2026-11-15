// 이번 주 목표: three goals a week (Monday to Sunday, the league's week), picked from a pool by the week so everyone
// gets the same three, counted from what the player did that week. All three done pays once (EARN.weekDone).
// Goals are about the practice of judging; none asks for returns, and none asks to buy or sell.
export type GoalId='judge3'|'grade2'|'case3'|'rewind3'|'humble1'|'rethink1'|'days2';
export type WeekCtx={judgments:{day:string;confidence:number;rebuttal?:string}[];graded:{day:string}[];cases:{day:string}[];rewinds:{day:string}[];daysDone:string[]};
export const GOALS:{id:GoalId;text:string;need:number;count:(c:WeekCtx,inW:(d:string)=>boolean)=>number}[]=[
  {id:'judge3',text:'신호에 판단 3개 남기기',need:3,count:(c,w)=>c.judgments.filter(j=>w(j.day)).length},
  {id:'grade2',text:'채점 결과 2개 확인',need:2,count:(c,w)=>c.graded.filter(g=>w(g.day)).length},
  {id:'case3',text:'오늘의 케이스 3장 풀기',need:3,count:(c,w)=>c.cases.filter(x=>w(x.day)).length},
  {id:'rewind3',text:'되감기 3판',need:3,count:(c,w)=>c.rewinds.filter(x=>w(x.day)).length},
  {id:'humble1',text:'확신 1~2로 솔직하게 판단 하나',need:1,count:(c,w)=>c.judgments.filter(j=>w(j.day)&&j.confidence<=2).length},
  {id:'rethink1',text:'루온 반박 듣고 이유 한 번 고치기',need:1,count:(c,w)=>c.judgments.filter(j=>w(j.day)&&j.rebuttal==='accepted').length},
  {id:'days2',text:'오늘 할 일 이틀 완주',need:2,count:(c,w)=>c.daysDone.filter(w).length},
];
const at=(d:string)=>{const [y,m,dd]=d.split('-').map(Number);return Date.UTC(y,m-1,dd)};
export function weekStart(day:string){const d=new Date(at(day));d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
const weekEnd=(start:string)=>new Date(at(start)+6*86400000).toISOString().slice(0,10);
// the week's three: a steady pick from the pool by the week's start (always one of the everyday ones first)
export function weekGoals(day:string,c:WeekCtx){
  const start=weekStart(day),end=weekEnd(start),inW=(d:string)=>d>=start&&d<=end;
  const n=Math.round(at(start)/(7*86400000)),everyday:GoalId[]=['judge3','case3','grade2'],rest=GOALS.filter(g=>!everyday.includes(g.id));
  const ids=[everyday[n%3],rest[n%rest.length].id,rest[(n+2)%rest.length].id];
  const goals=ids.map(id=>{const g=GOALS.find(x=>x.id===id)!,have=Math.min(g.need,g.count(c,inW));return {id,text:g.text,need:g.need,have,done:have>=g.need}});
  return {start,end,goals,done:goals.every(g=>g.done)};
}
