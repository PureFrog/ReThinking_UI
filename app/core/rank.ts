// The player's own growth (not the portfolio's): judging experience turns into a title, and each new title brings a
// thing for the garden (content/garden-items.ts rank items). Experience counts the work of judging, never returns:
// a graded judgment, a solved case, a 되감기 round. Right or wrong both count; the track record shows the quality.
export const RANKS=[
  {name:'인턴',xp:0},{name:'주니어 애널리스트',xp:12},{name:'애널리스트',xp:35},{name:'시니어 애널리스트',xp:80},{name:'수석 애널리스트',xp:160},{name:'리서치 헤드',xp:300},
] as const;
// work: 지기 process acts (core/jigi/points.ts) — a journal saved, a hypothesis confirmed, a review, a task practiced
export const XP={graded:3,caseAnswered:1,rewind:1,work:2};
export const xpOf=(c:{graded:number;cases:number;rewinds:number;work?:number})=>c.graded*XP.graded+c.cases*XP.caseAnswered+c.rewinds*XP.rewind+(c.work??0)*XP.work;
export function rankOf(xp:number){
  let i=0;for(let k=0;k<RANKS.length;k++)if(xp>=RANKS[k].xp)i=k;
  const next=RANKS[i+1];
  return {index:i,name:RANKS[i].name,next:next?{name:next.name,left:next.xp-xp}:null,progress:next?(xp-RANKS[i].xp)/(next.xp-RANKS[i].xp):1};
}
