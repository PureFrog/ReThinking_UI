// Care is reflection (ux-spec 13.7-7): watering a tree is writing that stock's investment journal, fertilizing it is
// answering a news OX quiz about the company. Each pays one sunlight piece per tree per day (12.3: no grinding);
// writing again or answering more the same day is kept but not paid. Returns never touch the rate (5장).
export type Mood='sunny'|'calm'|'curious'|'worried'|'tired';
export const MOODS:{id:Mood;label:string;color:string}[]=[
 {id:'sunny',label:'맑음',color:'#f2c766'},{id:'calm',label:'잔잔',color:'#9cc3a4'},{id:'curious',label:'궁금',color:'#9fb7dd'},{id:'worried',label:'걱정',color:'#d9a08f'},{id:'tired',label:'지침',color:'#b9ad9b'}];
// asked: the friend who asked for this page (13.7-10, a reason given after a stop-loss signal)
export type JournalEntry={id:string;holdingId:number;name:string;day:string;saw:string;think:string;mood:Mood|'';asked?:string};
export type TreeCare={water?:string;feed?:string;answered?:string[]};
export type Care=Record<string,TreeCare>;

// One question a day to start from instead of an empty page (12.1).
const PROMPTS=['오늘 이 종목에서 제일 눈에 띈 건 뭐였어?','예상과 다르게 움직인 게 있었어?','이 나무를 처음 심은 이유는 아직 그대로야?','오늘 들은 소식 중에 마음에 걸리는 게 있었어?','내 생각이 틀렸다고 느낄 만한 신호는 뭘까?'];
export function journalPrompt(day:string){const n=Number(day.replace(/-/g,''))||0;return PROMPTS[n%PROMPTS.length]}
// One box is enough to keep it (12.1).
export const canSave=(e:{saw:string;think:string;mood:string})=>!!(e.saw.trim()||e.think.trim()||e.mood);
export const careOf=(care:Care,id:number):TreeCare=>care[id]??{};
export const wateredToday=(care:Care,id:number,day:string)=>careOf(care,id).water===day;

export function saveJournal(care:Care,journal:JournalEntry[],entry:JournalEntry){
 const reward=!wateredToday(care,entry.holdingId,entry.day);
 return {care:{...care,[entry.holdingId]:{...careOf(care,entry.holdingId),water:entry.day}},journal:[...journal,entry],reward};
}
// A right answer pays once a day per tree; a wrong one still counts as read, so the next quiz is another item.
export function answerNews(care:Care,id:number,quizId:string,correct:boolean,day:string){
 const c=careOf(care,id);const reward=correct&&c.feed!==day;const answered=[...(c.answered??[]).filter(a=>a!==quizId),quizId];
 return {care:{...care,[id]:{...c,answered,feed:correct?day:c.feed}},reward};
}
export const journalOf=(journal:JournalEntry[],id:number)=>journal.filter(e=>e.holdingId===id);

// 12.2 wall calendar: one sticker per day written (that day's last chosen mood), a weekly aim of 4 days (Mon–Sun).
// Missing a day never breaks anything; there is no streak to lose.
export const WEEK_GOAL=4;
export function stickers(journal:JournalEntry[]){const out:Record<string,Mood|''>={};for(const e of journal)out[e.day]=e.mood||out[e.day]||'';return out}
const at=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d)};
const iso=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export function weekDays(day:string){const d=at(day);const back=(d.getDay()+6)%7;return Array.from({length:7},(_,i)=>iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()-back+i)))}
export const weekCount=(journal:JournalEntry[],day:string)=>{const s=stickers(journal);return weekDays(day).filter(d=>d in s).length};
// A week that reached the aim hangs a ribbon on the calendar, and the next friend over congratulates it once.
export const weekKey=(day:string)=>weekDays(day)[0];
export function goalWeekKeys(journal:JournalEntry[]){const by:Record<string,number>={};for(const d of Object.keys(stickers(journal))){const k=weekKey(d);by[k]=(by[k]??0)+1}return Object.keys(by).filter(k=>by[k]>=WEEK_GOAL).sort()}
export function pendingCheer(journal:JournalEntry[],cheered:string[]){const k=goalWeekKeys(journal).filter(k=>!cheered.includes(k)).pop();return k??null}
// The month as weeks of 7 (Mon first); days outside the month are ''.
export function monthGrid(day:string){const d=at(day);const first=new Date(d.getFullYear(),d.getMonth(),1);const lead=(first.getDay()+6)%7;const n=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
 const cells=[...Array(lead).fill(''),...Array.from({length:n},(_,i)=>iso(new Date(d.getFullYear(),d.getMonth(),i+1)))];while(cells.length%7)cells.push('');
 return Array.from({length:cells.length/7},(_,w)=>cells.slice(w*7,w*7+7) as string[])}
