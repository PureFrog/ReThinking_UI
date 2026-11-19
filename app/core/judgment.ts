// redesign 4장 the core loop: a judgment (choice + one-line reason + confidence 1–5) is recorded, and 30 and 90 days
// later it is graded against what the stock did after. The grade is about the quality of the call, not about price:
// whether the choice held up, and whether the confidence matched (a sure call that missed costs, an unsure one barely).
// Nothing here buys or sells; choices are what the player decided to do with their own view.
export const CHOICES=[
  {id:'hold',label:'홀드',sub:'산 이유가 아직 유효'},
  {id:'review',label:'손절 검토',sub:'기준을 다시 본다'},
  {id:'watch',label:'더 지켜봄',sub:'기준 정하고 대기'},
] as const;
export type Choice=typeof CHOICES[number]['id'];
export const CHOICE_LABEL:Record<Choice,string>={hold:'홀드',review:'손절 검토',watch:'더 지켜봄'};
export type Confidence=1|2|3|4|5;
// rebuttal: what the player did with luon's counter-argument
export type Judgment={id:string;holdingId:number;name:string;day:string;choice:Choice;reason:string;confidence:Confidence;
  rate:number;signalId?:string;analyst?:string;model?:string;rebuttal?:'accepted'|'kept'|'skipped';lookback?:boolean};
export const MARKS=[30,90] as const;
export type Mark=typeof MARKS[number];
// after: the stock's move (%) from the judgment day to the mark
export type Graded={judgmentId:string;mark:Mark;after:number;hit:boolean;signalRight:boolean|null;points:number;day:string};

// The numbers that decide a hit, in one place.
export const GRADE={drop:-5/* a fall at least this big means reviewing was right and holding was not */,calm:10/* watching was right if it moved less than this either way */};
export const REASON_MAX=60;

const at=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return Date.UTC(y,m-1,d)};
export const daysBetween=(from:string,to:string)=>Math.round((at(to)-at(from))/86400000);
export const shiftDay=(day:string,n:number)=>new Date(at(day)+n*86400000).toISOString().slice(0,10);

export function hitOf(choice:Choice,after:number){
  if(choice==='review')return after<=GRADE.drop;
  if(choice==='hold')return after>GRADE.drop;
  return Math.abs(after)<GRADE.calm;
}
// confidence 1..5 read as the chance the player gave themselves of being right: 50%..90%
export const probOf=(c:Confidence)=>0.5+(c-1)*0.1;
// right and sure pays most; wrong and sure costs; wrong and unsure costs nothing
export function pointsOf(hit:boolean,c:Confidence){const k=(c-1)*2.5;return Math.round(hit?10+k:-k)+0/* never -0 */}

export const canRecord=(j:{reason:string;choice?:Choice|null;confidence?:number|null})=>!!j.choice&&!!j.confidence&&j.reason.trim().length>0&&j.reason.trim().length<=REASON_MAX;
// one judgment per tree per day counts for rewards; writing again the same day replaces it
export function record(list:Judgment[],j:Judgment){
  const prev=list.find(x=>x.holdingId===j.holdingId&&x.day===j.day);
  return {list:[...list.filter(x=>x!==prev),j],first:!prev};
}
export const judgedToday=(list:Judgment[],holdingId:number,day:string)=>list.some(j=>j.holdingId===holdingId&&j.day===day);

// Marks reached and not graded yet, oldest judgment first. A 90-day mark waits until its 30-day one is shown.
export function dueGrades(list:Judgment[],graded:Graded[],today:string){
  const done=new Set(graded.map(g=>g.judgmentId+'@'+g.mark));
  const out:{judgment:Judgment;mark:Mark}[]=[];
  for(const j of [...list].sort((a,b)=>a.day.localeCompare(b.day))){const d=daysBetween(j.day,today);
    const m=MARKS.find(m=>d>=m&&!done.has(j.id+'@'+m));if(m)out.push({judgment:j,mark:m})}
  return out;
}
export function grade(j:Judgment,mark:Mark,after:number,day:string):Graded{
  const hit=hitOf(j.choice,after);
  return {judgmentId:j.id,mark,after,hit,signalRight:j.signalId?after<=GRADE.drop:null,points:pointsOf(hit,j.confidence),day};
}

// The track record (redesign 4-2): hit rate, calibration (1 - Brier score, so 100 = confidence always matched),
// and impulse control from the cooldowns (app/core/cooldown.ts).
export type Track={judged:number;graded:number;hits:number;hitRate:number|null;calibration:number|null;points:number;signalsRight:number;signalsGraded:number};
export function trackOf(list:Judgment[],graded:Graded[]):Track{
  const byId=new Map(list.map(j=>[j.id,j]));
  let brier=0,hits=0,points=0,sr=0,sg=0;
  for(const g of graded){const j=byId.get(g.judgmentId);if(!j)continue;const p=probOf(j.confidence);brier+=(p-(g.hit?1:0))**2;if(g.hit)hits++;points+=g.points;
    if(g.signalRight!==null){sg++;if(g.signalRight)sr++}}
  const n=graded.filter(g=>byId.has(g.judgmentId)).length;
  return {judged:list.length,graded:n,hits,hitRate:n?Math.round(hits/n*100):null,calibration:n?Math.round((1-brier/n)*100):null,points,signalsRight:sr,signalsGraded:sg};
}
// First visit (redesign 4-2): a new player has no old judgments, so the grade moment would be a month away. The
// look-back puts one of today's signals 30 days back, the player judges it as they would have then, and the 30-day
// grade opens at once. Once per player; it counts like any judgment (its 90-day grade comes due later as usual).
export const LOOKBACK=30;
export function lookbackPick<T extends {loss:boolean}>(signals:T[]):T|null{return signals.find(s=>s.loss)??signals[0]??null}
