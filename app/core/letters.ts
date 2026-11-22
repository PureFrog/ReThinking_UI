// 12.7 the monthly letter: on the 1st, moa leaves a letter in the mailbox about the month before — days written,
// gold books, the mood picked most, and one line of the user's own journal read back. Never returns or prices.
// A month with nothing written or finished brings no letter (a new garden does not get an empty one).
import {MOODS,stickers,type JournalEntry,type Mood} from './care';

export type MonthLetter={month:string;days:number;gold:string[];mood:Mood|'';quote:{name:string;text:string;day:string}|null;read:boolean};
export const monthOf=(day:string)=>day.slice(0,7);
export function prevMonth(month:string){const [y,m]=month.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`}
export const monthLabel=(month:string)=>Number(month.slice(5,7))+'월';

// The line read back: the longest thought of the month, first line, cut to fit one line of the letter.
function quoteOf(entries:JournalEntry[]){
 const pick=[...entries].map(e=>({e,text:(e.think.trim()||e.saw.trim()).split('\n')[0]})).filter(x=>x.text).sort((a,b)=>b.text.length-a.text.length||a.e.day.localeCompare(b.e.day))[0];
 if(!pick)return null;const text=pick.text.length>40?pick.text.slice(0,39)+'…':pick.text;return {name:pick.e.name,text,day:pick.e.day}}

export function monthlyLetter(journal:JournalEntry[],goldDays:Record<string,string>,month:string):MonthLetter|null{
 const entries=journal.filter(e=>monthOf(e.day)===month);
 const gold=Object.entries(goldDays).filter(([,d])=>monthOf(d)===month).map(([id])=>id);
 if(!entries.length&&!gold.length)return null;
 const days=Object.keys(stickers(entries)).length;
 const count=new Map<Mood,number>();for(const e of entries)if(e.mood)count.set(e.mood,(count.get(e.mood)??0)+1);
 const mood=MOODS.map(m=>m.id).filter(id=>count.has(id)).sort((a,b)=>count.get(b)!-count.get(a)!)[0]??'';
 return {month,days,gold,mood,quote:quoteOf(entries),read:false}}

// On opening the garden: last month's letter, if it is due and not written yet.
export function dueLetter(letters:MonthLetter[],journal:JournalEntry[],goldDays:Record<string,string>,today:string){
 const month=prevMonth(monthOf(today));if(letters.some(l=>l.month===month))return null;return monthlyLetter(journal,goldDays,month)}

// moa's words (ux-spec 3장: soft, often a question, never hurrying). Book titles come from the caller.
export function letterLines(l:MonthLetter,bookTitle:(id:string)=>string){
 const mood=MOODS.find(m=>m.id===l.mood);
 return [
  `${monthLabel(l.month)}에 일지를 쓴 날은 ${l.days}일이었어.${l.days>=8?' 꾸준히 들여다봐 줬구나.':l.days?' 바쁜 중에도 들러 줘서 고마워.':''}`,
  l.gold.length?`책장에서 ${l.gold.map(id=>`'${bookTitle(id)}'`).join(', ')} 책이 금박으로 바뀌었지.`:'',
  mood?`가장 많이 고른 기분은 '${mood.label}'이었어.`:'',
  l.quote?`${Number(l.quote.day.slice(5,7))}월 ${Number(l.quote.day.slice(8,10))}일에 ${l.quote.name} 나무에 이렇게 적었더라. "${l.quote.text}"`:'',
  '그때 생각, 지금 다시 읽어 보면 어때? 이번 달도 네 속도로 가자.',
 ].filter(Boolean)}
