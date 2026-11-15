// The observer's page (ui/MyPage.tsx): what kind of judge I am, read from my own record (never from returns).
//   choices: how often I held, reviewed or kept watching
//   byConfidence: for each confidence I gave (1–5), how often I was right (so "5 but right 60%" shows over-confidence)
//   habit: my judging style in plain numbers (docs/copy.md: no personality names)
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
  if(list.length<3)return {name:'집계 전',why:'판단 3개부터 통계가 나와요'};
  const s=choiceShare(list),b=byConfidence(list,graded);
  const sure=b.filter(x=>x.c>=4&&x.n),unsure=b.filter(x=>x.c<=2&&x.n);
  const sureRate=sure.length?sure.reduce((a,x)=>a+x.rate!*x.n,0)/sure.reduce((a,x)=>a+x.n,0):null;
  const unsureRate=unsure.length?unsure.reduce((a,x)=>a+x.rate!*x.n,0)/unsure.reduce((a,x)=>a+x.n,0):null;
  const main=s.hold>=0.5?'홀드 위주':s.review>=0.5?'손절 검토 위주':s.watch>=0.5?'지켜봄 위주':'고르게';
  const sureText=sureRate!==null?`확신 4~5 적중 ${Math.round(sureRate)}%`:unsureRate!==null?`확신 1~2 적중 ${Math.round(unsureRate)}%`:'채점 전';
  return {name:main,why:`${sureText} · 홀드 ${Math.round(s.hold*100)}% · 손절 검토 ${Math.round(s.review*100)}% · 지켜봄 ${Math.round(s.watch*100)}%`};
}
