// ux-spec 4장 realtime mode: a friend who came by while the player was away leaves traces — footprints at the door,
// wet soil under the tree it watered, a note in the mailbox, and the day's gift box if it had one to give. They are
// the first thing seen on coming back; footprints and soil last for that day, the note until it is read.
// The watering is only a trace: it is not a journal page and pays nothing (13.7-7).
import type {Holding} from './model';
// away at least this long before a friend has come by
export const AWAY={hours:6};
export type AwayVisit={day:string;friend:string;soil:number|null};
// lastSeen: when the garden was last open (ms), null for a new garden. today: the friend who comes now, left out
// when another friend can be the one who came by. rolls: two numbers in [0,1) for the friend and the tree.
export function awayVisit(o:{lastSeen:number|null;now:number;day:string;friends:string[];today:string;holdings:Holding[];rolls:[number,number]}):AwayVisit|null{
 if(o.lastSeen===null||o.now-o.lastSeen<AWAY.hours*3600000||!o.friends.length)return null;
 const pool=o.friends.length>1?o.friends.filter(f=>f!==o.today):o.friends;
 const friend=pool[Math.min(pool.length-1,Math.floor(o.rolls[0]*pool.length))];
 const tree=o.holdings.length?o.holdings[Math.min(o.holdings.length-1,Math.floor(o.rolls[1]*o.holdings.length))]:null;
 return {day:o.day,friend,soil:tree?.id??null}}
// what the garden shows today
export const tracesToday=(v:AwayVisit|null|undefined,day:string)=>v&&v.day===day?{footprints:true,soil:v.soil}:{footprints:false,soil:null};
