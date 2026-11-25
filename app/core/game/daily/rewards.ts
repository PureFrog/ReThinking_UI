// Rewards for 오늘의 관측소 (daily_quest_design 6): completion first, then standing.
//   first-clear   the first scored, ranked completion ever → a stamp
//   weekly-5      five scored, ranked completions in one KST week (Mon–Sun) → a decoration into the inventory (the
//                 player places it in the garden)
//   top10-*       per measure (일지 점수, 투자 성과), the top 10% of the day's scored ranked runs, ties sharing the place
//                 and the reward → a title for that day. Only after the day is over, and withheld for a cohort under
//                 MIN_COHORT (small groups get completion rewards first)
// Every grant has a key; a key is granted once (reward_grants primary key on the server, the save's list here).
export const MIN_COHORT=20,TOP_SHARE=.1,WEEK_GOAL=5,WEEK_ITEM='obs-week-lamp';
export type RewardRule='first-clear'|'weekly-5'|'top10-journal'|'top10-market';
export type Grant={key:string;rule:RewardRule;period:string;label:string;item:string|null};
export type Completion={day:string;dailyId:string;runId:string};
// the Monday of a KST day's week
export const weekOf=(day:string)=>{const d=new Date(day+'T00:00:00Z'),w=(d.getUTCDay()+6)%7;return new Date(d.getTime()-w*864e5).toISOString().slice(0,10)};

export function completionGrants(done:Completion[]):Grant[]{
  const out:Grant[]=[];
  if(done.length)out.push({key:'first-clear',rule:'first-clear',period:[...done].sort((a,b)=>a.day<b.day?-1:1)[0].day,label:'첫 관측 완주',item:null});
  const byWeek=new Map<string,number>();for(const c of done){const w=weekOf(c.day);byWeek.set(w,(byWeek.get(w)??0)+1)}
  for(const [w,n] of [...byWeek].sort())if(n>=WEEK_GOAL)out.push({key:`weekly-5:${w}`,rule:'weekly-5',period:w,label:`${w} 주 관측 ${WEEK_GOAL}회`,item:WEEK_ITEM});
  return out;
}
// the place of a value among the day's: 1 + how many did strictly better (ties share the place)
export const placeOf=(values:number[],v:number)=>1+values.filter(x=>x>v).length;
export function dayGrants(dailyId:string,day:string,today:string,cohort:{journal:number;excess:number}[],mine:{journal:number;excess:number}):Grant[]{
  if(day>=today||cohort.length<MIN_COHORT)return [];
  const cut=Math.max(1,Math.ceil(cohort.length*TOP_SHARE)),out:Grant[]=[];
  if(placeOf(cohort.map(c=>c.journal),mine.journal)<=cut)out.push({key:`top10-journal:${dailyId}`,rule:'top10-journal',period:day,label:'일지 점수 상위 10%',item:null});
  if(placeOf(cohort.map(c=>c.excess),mine.excess)<=cut)out.push({key:`top10-market:${dailyId}`,rule:'top10-market',period:day,label:'투자 성과 상위 10%',item:null});
  return out;
}
export const newGrants=(have:{key:string}[],grants:Grant[])=>grants.filter(g=>!have.some(h=>h.key===g.key));
