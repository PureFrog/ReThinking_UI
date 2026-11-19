// redesign 4-1 today's case (takes over the quiz streak): one real past case a day, company name hidden, 30 seconds.
// One model card can be opened as a hint (worth fewer points). Answering reveals the company, the year and which model
// caught it first. The day's run of answers uses app/core/streak.ts unchanged.
export type CaseChoice={id:string;label:string};
export type CaseHint={model:string;text:string};
export type PastCase={id:string;sector:string;when:string;facts:{k:string;v:string}[];question:string;choices:CaseChoice[];answer:string;
  hints:CaseHint[];reveal:{name:string;year:string;what:string;firstCaught:string;lesson:string};source:string};
export const CASE={seconds:30,points:5,hintPoints:3};
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// the same case all day for everyone (so the league compares like with like); solved ones are skipped while any are left
export function caseOfDay<T extends {id:string}>(cases:T[],day:string,solved:string[]=[]){
  const left=cases.filter(c=>!solved.includes(c.id)),pool=left.length?left:cases;
  return pool[hash(day)%pool.length];
}
export type CaseAnswer={caseId:string;day:string;choice:string|null;correct:boolean;hint:boolean;points:number};
export function answerCase(c:PastCase,choice:string|null,hint:boolean,day:string):CaseAnswer{
  const correct=choice===c.answer;
  return {caseId:c.id,day,choice,correct,hint,points:correct?(hint?CASE.hintPoints:CASE.points):0};
}
export const answeredToday=(answers:CaseAnswer[],day:string)=>answers.find(a=>a.day===day)??null;
