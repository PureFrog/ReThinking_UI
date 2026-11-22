// 13.7-11 the daily pull: quizzes, paid by how many days in a row the player keeps coming, not by being right.
// A day counts once any quiz is answered (a quiz book page or a news quiz, right or wrong, a review page too).
// Missing a day resets the run by default. Coming back after a short miss, a friend comes, scolds a little and gives
// one last chance: answer a few quizzes today and the run goes on. Once per run. A longer miss, or a second miss in
// the same run, and the friend says it can't help it: the run starts over.
// All the numbers live here.
export const STREAK={
 rescueQuizzes:3/* quizzes to answer on the day the rescue is offered */,
 resetDays:2/* missed this many days in a row (or more) = no rescue, the run starts over */,
 // sunlight paid when the run reaches these days; after the last one, every `repeat` days pays the last amount again
 bonuses:[{days:3,sun:2},{days:7,sun:4},{days:14,sun:6},{days:30,sun:10}],repeat:30,
};
// notice: what a friend still has to come and say (cleared once said)
export type StreakNotice={kind:'rescue'|'reset';run:number;day:string};
export type Streak={count:number;last:string;best:number;rescued:boolean;rescue:{day:string;done:number}|null;notice:StreakNotice|null};
export const blankStreak=():Streak=>({count:0,last:'',best:0,rescued:false,rescue:null,notice:null});
const at=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return Date.UTC(y,m-1,d)};
export const daysBetween=(from:string,to:string)=>Math.round((at(to)-at(from))/86400000);
// days missed since the last counted day (0 = yesterday or today was counted)
export const missedDays=(s:Streak,today:string)=>s.last?Math.max(0,daysBetween(s.last,today)-1):0;
export function bonusAt(count:number){const b=STREAK.bonuses.find(v=>v.days===count);if(b)return b.sun;const last=STREAK.bonuses.at(-1)!;return count>last.days&&(count-last.days)%STREAK.repeat===0?last.sun:0}

// On opening the garden: a missed day either opens the one rescue (a friend comes to offer it) or ends the run.
export function checkStreak(s:Streak,today:string):Streak{
 const missed=missedDays(s,today);if(!missed||!s.count)return s.rescue&&s.rescue.day!==today?{...s,rescue:null}:s;
 if(s.rescue?.day===today)return s;
 if(missed<STREAK.resetDays&&!s.rescued)return {...s,rescue:{day:today,done:0},notice:s.notice?.kind==='rescue'&&s.notice.day===today?s.notice:{kind:'rescue',run:s.count,day:today}};
 return {...s,count:0,rescued:false,rescue:null,notice:{kind:'reset',run:s.count,day:today}};
}

// A quiz answered today. Counts the day once; during a rescue, counts toward it and the day counts when it is done.
export function answerStreak(s:Streak,today:string):{streak:Streak;counted:boolean;rescued:boolean;bonus:number}{
 const c=checkStreak(s,today);
 if(c.rescue){const done=c.rescue.done+1;if(done<STREAK.rescueQuizzes)return {streak:{...c,rescue:{...c.rescue,done}},counted:false,rescued:false,bonus:0};
  const count=c.count+1;return {streak:{...c,count,last:today,best:Math.max(c.best,count),rescued:true,rescue:null,notice:null},counted:true,rescued:true,bonus:bonusAt(count)}}
 if(c.last===today)return {streak:c,counted:false,rescued:false,bonus:0};
 const count=c.count+1;return {streak:{...c,count,last:today,best:Math.max(c.best,count),notice:c.notice?.kind==='reset'?c.notice:null},counted:true,rescued:false,bonus:bonusAt(count)};
}
export const rescueLeft=(s:Streak)=>s.rescue?Math.max(0,STREAK.rescueQuizzes-s.rescue.done):0;
// the count shown today: a run whose last day was more than a day ago (and not being rescued) is already lost
export const shownCount=(s:Streak,today:string)=>missedDays(s,today)&&!s.rescue?0:s.count;
