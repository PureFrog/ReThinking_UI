// 13.7-10 a stop-loss signal: which one to ask about, who asks, and where the answer goes.
// The friend only asks why the player bought it and reads the answer back; no advice (ux-spec 3장).
import type {StopLossSignal} from '../content/detection';
import type {Holding} from './model';
import type {JournalEntry} from './care';
// the first signal not asked about yet, on a holding still in the garden
export function nextSignal(signals:StopLossSignal[],asked:string[],holdings:Holding[]){return signals.find(s=>!asked.includes(s.id)&&holdings.some(h=>h.id===s.holdingId))??null}
// a friend already here asks (the first in the list); otherwise the closest friend comes over (ties: roster order)
export function askerFor(here:string[],friends:string[],closeness:Record<string,number>){if(here.length)return here[0];return [...friends].sort((a,b)=>(closeness[b]??0)-(closeness[a]??0))[0]}
// the reason is kept as a page of that tree's journal (what the player thinks), marked with the friend who asked
export function reasonEntry(h:Holding,text:string,friend:string,day:string,now=Date.now()):JournalEntry{return {id:'reason-'+h.id+'-'+now,holdingId:h.id,name:h.name,day,saw:'',think:text.trim(),mood:'',asked:friend}}
