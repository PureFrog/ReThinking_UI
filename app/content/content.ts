// Every friend line goes through here (ux-spec 13.7-9). Today it reads app/content/dialogue/<id>.json;
// a backend LLM call replaces these functions later without touching the scene or the UI.
// Each line may carry conditions (closeness stage, a piece of furniture placed) and a priority (ux-spec 3장);
// the newest lines said are remembered so the same line does not come twice in a row.
import moa from './dialogue/moa.json';
import tori from './dialogue/tori.json';
import luon from './dialogue/luon.json';
import {friendById} from './friends';
import {personaOf} from './personas';
import {TASKS,type TaskId} from '../core/visitor-tasks';
import {memoryTopic,fill,remember as rememberKey,type MemoryFacts,type MemoryKind} from '../core/memory';
import type {Reaction} from '../core/gifts';
export type FriendLines={greet:string;talk:string;bye:string;farewell:string;busy:string;notice:string;
 // opens a reply to the player's memo in a tree talk
 agree:string;
 // congratulates a week that reached the calendar aim (12.2)
 cheer:string;
 // 13.7-10 after a stop-loss signal: asks why the player bought {stock}; reads the answer {reason} back
 ask:string;heard:string;
 // 13.7-11 a quiz run about to break: the one last chance ({run} days, {left} quizzes to go), or the run lost
 rescue:string;reset:string;
 // ux-spec 4장 the note left by a friend who came while the player was away (it watered {stock}, or no tree)
 away:string;awayPlain:string;
 // ux-spec 4장 realtime mode: said on the way out, the next visit ("내일 또 올게")
 tomorrow:string};
export type Line={text:string;minStage?:number;maxStage?:number;placed?:string;priority?:number};
// memory: greeting templates per thing remembered (app/core/memory.ts) · gifts: how a gift from the player lands
// (returned = something the friend gave in the first place)
export type DialogueBook={lines:Record<keyof FriendLines,Line[]>;tasks:Partial<Record<TaskId,Line[]>>;scenes:Record<string,string[]>;letter?:string[];
 memory?:Partial<Record<MemoryKind,Line[]>>;gifts?:Partial<Record<Reaction|'returned',Line[]>>;
 // ux-spec 8장 onboarding: the friend who shows a new player round (moa) says these in order
 onboard?:Partial<Record<OnboardLine,string>>};
export type OnboardLine='welcome'|'capture'|'water'|'bye';
// a new friend = one more file here
export const DIALOGUE:Record<string,DialogueBook>={moa,tori,luon} as Record<string,DialogueBook>;
export type LineContext={stage:number;placed:string[]};

// Highest priority first; skip what was said lately; if everything was, the one said longest ago.
export function pickLine(options:Line[]|undefined,ctx:LineContext,recent:string[]=[]){
 const ok=(options??[]).filter(l=>ctx.stage>=(l.minStage??0)&&ctx.stage<=(l.maxStage??4)&&(!l.placed||ctx.placed.includes(l.placed)));
 if(!ok.length)return undefined;const sorted=[...ok].sort((a,b)=>(b.priority??0)-(a.priority??0));
 return (sorted.find(l=>!recent.includes(l.text))??[...sorted].sort((a,b)=>recent.indexOf(b.text)-recent.indexOf(a.text))[0]).text}

// The page keeps this current: each friend's stage, the furniture placed, and what each friend remembers.
type World={stages:Record<string,number>;placed:string[];memory?:Record<string,MemoryFacts>;told?:Record<string,string[]>};
let world:World={stages:{},placed:[]};
let onTold:(friendId:string,key:string)=>void=()=>{};
export function setLineContext(c:World,told?:(friendId:string,key:string)=>void){world=c;if(told)onTold=told}
const RECENT_KEY='little-garden-lines',RECENT=2;
let recent:Record<string,string[]>|null=null;
function used(key:string){if(!recent){try{recent=JSON.parse(globalThis.localStorage?.getItem(RECENT_KEY)??'{}')}catch{recent={}}}return recent![key]??[]}
function remember(key:string,text:string){const list=[text,...used(key).filter(t=>t!==text)].slice(0,RECENT);recent![key]=list;try{globalThis.localStorage?.setItem(RECENT_KEY,JSON.stringify(recent))}catch{}}
function say(friendId:string,key:string,options:Line[]|undefined){
 const k=friendId+':'+key,text=pickLine(options,{stage:world.stages[friendId]??0,placed:world.placed},used(k));if(text&&(options?.length??0)>1)remember(k,text);return text}

export function friendLine(friendId:string,kind:keyof FriendLines){return say(friendId,kind,DIALOGUE[friendById(friendId).id]?.lines[kind])??''}
export function taskLine(friendId:string,task:TaskId){const f=friendById(friendId);return say(f.id,'task:'+task,DIALOGUE[f.id]?.tasks[task])??personaOf(f.persona).lines?.[task]??TASKS[task].line}
// the short scene played once when a stage is reached (2~4 balloons)
export const sceneLines=(friendId:string,stage:number)=>DIALOGUE[friendId]?.scenes[String(stage)]??[];
export const friendLetter=(friendId:string)=>DIALOGUE[friendId]?.letter??[];

// A greeting: one thing remembered, brought up once (ux-spec 3장 memory), or the plain hello.
export function memoryLine(friendId:string){
 const book=DIALOGUE[friendId],facts=world.memory?.[friendId];if(!book?.memory||!facts)return '';
 const told=world.told?.[friendId]??[],t=memoryTopic(facts,told,Object.keys(book.memory) as MemoryKind[]);if(!t)return '';
 // a template whose variable is empty here (no reason written, say) is skipped
 const text=say(friendId,'memory:'+t.kind,book.memory[t.kind]!.filter(l=>fill(l.text,t.vars)));if(!text)return '';
 world.told={...world.told,[friendId]:rememberKey(told,t.key)};onTold(friendId,t.key);return fill(text,t.vars)}
// 13.7-10 the ask after a stop-loss signal and the line that reads the reason back (a long reason is cut short)
export const askLine=(friendId:string,stock:string)=>fill(friendLine(friendId,'ask'),{stock});
export const heardLine=(friendId:string,reason:string)=>fill(friendLine(friendId,'heard'),{reason:reason.length>24?reason.slice(0,23)+'…':reason});
export const streakLine=(friendId:string,kind:'rescue'|'reset',run:number,left:number)=>fill(friendLine(friendId,kind),{run:String(run),left:String(left)});
export const awayLine=(friendId:string,stock:string|null)=>stock?fill(friendLine(friendId,'away'),{stock}):friendLine(friendId,'awayPlain');
export const onboardLine=(friendId:string,kind:OnboardLine,stock='')=>fill(DIALOGUE[friendId]?.onboard?.[kind]??'',{stock});
export const greetLine=(friendId:string)=>memoryLine(friendId)||friendLine(friendId,'greet');
export function giftLine(friendId:string,kind:Reaction|'returned',item:string){const b=DIALOGUE[friendId]?.gifts;const options=(b?.[kind]??b?.awkward)?.filter(l=>fill(l.text,{item}));return fill(say(friendId,'gift:'+kind,options)??'',{item})}
// After decorating, a friend looks at the newest piece (the memory "decor" lines, told once).
export function noticeLine(friendId:string,item:string,decorId:number){const key='decor:'+decorId;if(world.told?.[friendId]?.includes(key))return '';
 const options=DIALOGUE[friendId]?.memory?.decor?.filter(l=>fill(l.text,{item}));const text=say(friendId,'memory:decor',options);if(!text)return '';
 world.told={...world.told,[friendId]:rememberKey(world.told?.[friendId]??[],key)};onTold(friendId,key);return fill(text,{item})}
