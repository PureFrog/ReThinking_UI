// Persona presets (ux-spec 13.7-2). A friend in app/friends.ts names one of these.
// A new kind of friend = a new preset here, written from the persona the user gives for that character;
// the scene reads only these fields.
import type {TaskId} from './visitor-tasks';
export type Persona={
 label:string;
 // how much the friend likes each task; missing tasks are never picked
 weights:Partial<Record<TaskId,number>>;
 // done first on arrival; with openingRepeat it keeps going while there is something to do (every tree watered once)
 opening?:TaskId;openingRepeat?:boolean;
 // water every tree once per visit, not only the dry ones
 tends?:boolean;
 // when the player comes within reach: turn to look, come over, or back off
 near:'face'|'approach'|'shy';
 // multipliers on walking time, the pause between tasks, and how long a task lasts
 pace:number;rest:number;linger:number;
 // self-talk: minimum gap per friend (11.15-6, chatty is the 13.7-3 exception) and the chance a due line is said
 lineGap:number;lineChance:number;
 // tasks exempt from "not one of the last three"
 repeatable?:TaskId[];
 // lines for this kind of friend when the friend has none of its own
 lines?:Partial<Record<TaskId,string>>;
};
const base={near:'face' as const,pace:1,rest:1,linger:1,lineGap:40000,lineChance:.35};
export const PERSONAS:Record<string,Persona>={
 // 모아: sitting, flowers, near the player; comes over when the player stops close by
 gentle:{...base,label:'다정',near:'approach',weights:{sofa:5,read:2,window:1,flowers:5,water:2,look:2,nap:1,follow:5,watch:1,chase:1,stretch:2,tea:3,snack:1}},
 // 토리: running about, watering, butterflies, new furniture; quick on its feet
 lively:{...base,label:'활발',pace:.8,rest:.8,weights:{sofa:1,read:1,window:1,flowers:2,water:5,look:5,nap:1,follow:2,watch:1,chase:5,stretch:3,roam:3,snack:3,tea:1}},
 // 루온: naps, the window, watching from afar; few words, lingers
 quiet:{...base,label:'조용',linger:1.3,lineChance:.2,weights:{sofa:2,read:3,window:5,flowers:1,water:1,look:1,nap:5,follow:1,watch:5,chase:1,stretch:2,study:4,bed:3}},
};
export function personaOf(id:string):Persona{return PERSONAS[id]??PERSONAS.gentle}
