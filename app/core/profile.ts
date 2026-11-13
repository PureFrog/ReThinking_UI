// The observer's page (ui/MyPage.tsx): what kind of judge I am, read from my own record (never from returns).
//   choices: how often I held, reviewed or kept watching
//   byConfidence: for each confidence I gave (1–5), how often I was right (so "5 but right 60%" shows over-confidence)
//   habit: a one-line nickname from the two above
import type {Judgment,Graded,Choice} from './judgment';
export function choiceShare(list:Judgment[]):Record<Choice,number>{
  const n=Math.max(1,list.length),c=(k:Choice)=>list.filter(j=>j.choice===k).length/n;
  return {hold:c('hold'),review:c('review'),watch:c('watch')};
}
export function byConfidence(list:Judgment[],graded:Graded[]):{c:number;n:number;rate:number|null}[]{
  const conf=new Map(list.map(j=>[j.id,j.confidence]));
  return [1,2,3,4,5].map(c=>{const g=graded.filter(x=>conf.get(x.judgmentId)===c);return {c,n:g.length,rate:g.length?Math.round(g.filter(x=>x.hit).length/g.length*100):null}});
}
// over-confident: sure calls (4–5) right less often than they claimed; careful: unsure calls (1–2) right more often
export function habitOf(list:Judgment[],graded:Graded[]):{name:string;why:string}{
  if(list.length<3)return {name:'새내기 관찰자',why:'판단이 세 개 쌓이면 습관이 보여.'};
  const s=choiceShare(list),b=byConfidence(list,graded);
  const sure=b.filter(x=>x.c>=4&&x.n),unsure=b.filter(x=>x.c<=2&&x.n);
  const sureRate=sure.length?sure.reduce((a,x)=>a+x.rate!*x.n,0)/sure.reduce((a,x)=>a+x.n,0):null;
  const unsureRate=unsure.length?unsure.reduce((a,x)=>a+x.rate!*x.n,0)/unsure.reduce((a,x)=>a+x.n,0):null;
  const lead=sureRate!==null&&sureRate<60?'과감한':unsureRate!==null&&unsureRate>=60?'신중한':'차분한';
  const noun=s.hold>=0.5?'버팀꾼':s.review>=0.5?'정리꾼':s.watch>=0.5?'관망꾼':'기록자';
  const why=lead==='과감한'?`확신 4~5를 줬을 때 적중 ${Math.round(sureRate!)}%`:lead==='신중한'?`확신을 낮게 줬는데 적중 ${Math.round(unsureRate!)}%`:'확신과 결과가 대체로 맞아';
  return {name:`${lead} ${noun}`,why:`${why} · 홀드 ${Math.round(s.hold*100)}% · 손절 검토 ${Math.round(s.review*100)}% · 지켜봄 ${Math.round(s.watch*100)}%`};
}
