// 12.4 the retrospective, 'a reply to who I was then': 30 and 90 days after a journal page, luon brings it back.
// The player rereads the reason and picks whether it still holds (never whether it made money), with a one-line reply.
// Each answer ties one more knot on that tree's ribbon.
import type {JournalEntry} from './care';

export const RETRO_MARKS=[30,90] as const;
export type RetroMark=typeof RETRO_MARKS[number];
export type Verdict='kept'|'half'|'changed';
export const VERDICTS:{id:Verdict;label:string}[]=[{id:'kept',label:'맞았어'},{id:'half',label:'반쯤'},{id:'changed',label:'달라졌어'}];
export type Retro={entryId:string;holdingId:number;mark:RetroMark;verdict:Verdict;reply:string;day:string};
export type DueRetro={entry:JournalEntry;mark:RetroMark;days:number};

const at=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return Date.UTC(y,m-1,d)};
export const daysBetween=(from:string,to:string)=>Math.round((at(to)-at(from))/86400000);
// the page has a reason to reread (a mood alone does not)
const hasReason=(e:JournalEntry)=>!!(e.think.trim()||e.saw.trim());
// '?ahead=N' looks N days ahead, so a page written today can be brought back in a demo
export function shiftDay(day:string,ahead:number){const t=new Date(at(day)+ahead*86400000);return t.toISOString().slice(0,10)}

// The page luon brings next: the oldest page past a mark it has not been answered at, for a tree still in the garden.
// A page past 90 days skips its 30-day turn. One retrospective a day; `today` is the real day, `lookDay` may be ahead.
export function dueRetro(journal:JournalEntry[],retros:Retro[],held:number[],today:string,lookDay=today):DueRetro|null{
 if(retros.some(r=>r.day===today))return null;
 const done=new Set(retros.map(r=>r.entryId+'@'+r.mark));
 const due=journal.filter(e=>hasReason(e)&&held.includes(e.holdingId)).map(e=>{const days=daysBetween(e.day,lookDay);const mark=[...RETRO_MARKS].reverse().find(m=>days>=m);return mark&&!done.has(e.id+'@'+mark)&&!(mark===30&&done.has(e.id+'@90'))?{entry:e,mark,days}:null}).filter((d):d is DueRetro=>!!d);
 return due.sort((a,b)=>a.entry.day.localeCompare(b.entry.day))[0]??null}

export function answerRetro(retros:Retro[],due:DueRetro,verdict:Verdict,reply:string,day:string):Retro[]{
 return [...retros,{entryId:due.entry.id,holdingId:due.entry.holdingId,mark:due.mark,verdict,reply:reply.trim(),day}]}

// knots on each tree's ribbon = retrospectives answered for it
export function knots(retros:Retro[]){const out:Record<number,number>={};for(const r of retros)out[r.holdingId]=(out[r.holdingId]??0)+1;return out}

export const retroLine=(d:DueRetro)=>`${d.days}일 전에 이렇게 써놨더라.`;
// the biggest reward of all (12.4): sunlight pieces and closeness with luon
export const RETRO_SUN=3,RETRO_CLOSENESS=3;
