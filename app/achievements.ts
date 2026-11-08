// 12.5 the house grows with steady reflection. A reached milestone is not a badge: the next visiting friend brings it
// as a gift (the 11.8 pick-up flow). The drawer's album shows them all, the ones not reached as a silhouette and a hint.
import type {JournalEntry} from './care';
export type Milestone={id:string;title:string;item?:string;hint:string;reached:(s:Progress)=>boolean};
// retros: 12.4 retrospectives answered (left out by older callers)
export type Progress={journal:JournalEntry[];gold:number;weeks:number;retros?:number};
export const MILESTONES:Milestone[]=[
 {id:'first-journal',title:'첫 일지',item:'첫 일지 액자',hint:'나무에 물을 주며 일지를 처음 남기면',reached:s=>s.journal.length>=1},
 {id:'journal-10',title:'일지 10번',item:'작은 독서 의자',hint:'일지를 열 번 남기면',reached:s=>s.journal.length>=10},
 {id:'gold-3',title:'금박 책 세 권',item:'금박 책받침',hint:'책장의 퀴즈 책 세 권을 다 맞히면',reached:s=>s.gold>=3},
 {id:'weeks-4',title:'주 목표 4주',hint:'한 주에 4일씩, 네 주를 채우면 (울타리 옆 땅이 열려요)',reached:s=>s.weeks>=4},
 {id:'retro-5',title:'회고 다섯 번',hint:'루온이 들고 온 리본에 다섯 번 답하면 (다락방이 열려요)',reached:s=>(s.retros??0)>=5},
 {id:'journal-50',title:'일지 50번',hint:'일지를 쉰 번 남기면 (집이 한 단계 커져요)',reached:s=>s.journal.length>=50},
];
export type Earned=Record<string,{day:string;delivered:boolean}>;
// Milestones reached now that were not earned before, stamped with the day.
export function newlyReached(earned:Earned,s:Progress,day:string):Earned{
 const add:Earned={};for(const m of MILESTONES)if(!earned[m.id]&&m.reached(s))add[m.id]={day,delivered:!m.item};return add}
// What the next friend carries: reached milestones with an item not yet handed over, oldest first.
export const pendingGifts=(earned:Earned)=>MILESTONES.filter(m=>m.item&&earned[m.id]&&!earned[m.id].delivered).map(m=>({id:'ach-'+m.id,item:m.item!}));
// Weeks (Mon–Sun) with at least WEEK_GOAL journal days.
export function goalWeeks(days:string[],goal:number){const by=new Map<string,Set<string>>();for(const d of days){const [y,m,dd]=d.split('-').map(Number);const t=new Date(y,m-1,dd);t.setDate(t.getDate()-((t.getDay()+6)%7));const k=t.toDateString();by.set(k,(by.get(k)??new Set()).add(d))}return Array.from(by.values()).filter(s=>s.size>=goal).length}
