// ux-spec 3장 memory: friends remember the player. Each greeting may bring up one thing the friend noticed, each thing
// once (its key is kept in the friend's record). The lines are templates in app/content/dialogue/<id>.json under "memory";
// a friend only brings up the kinds it has lines for (moa alone worries about a tree in a deep loss).
export type MemoryKind='absence'|'holding'|'loss'|'mine'|'decor'|'outfit'|'decision';
// the first one found wins
export const MEMORY_ORDER:MemoryKind[]=['absence','holding','loss','mine','decor','outfit','decision'];
// this many days away (or more) is a long absence
export const ABSENCE_DAYS=7;
export type Topic={kind:MemoryKind;key:string;vars:Record<string,string>};
export type MemoryFacts={
 today:string;
 // the friend's last visit before today
 lastVisit?:string;
 // what the player gave this friend on an earlier visit
 holding?:{item:string;day:string}|null;
 // a tree in a deep loss
 loss?:{id:number;tree:string}|null;
 // this friend's own gift, placed in the house or worn
 mine?:{giftId:string;item:string}|null;
 // the furniture placed most lately (not this friend's)
 decor?:{id:number;name:string}|null;
 // what the player has on
 outfit?:string[];
 // the latest decision recorded in a tree story, on an earlier day
 decision?:{tree:string;decision:string;reason:string;day:string}|null;
};
export const daysBetween=(a:string,b:string)=>Math.round((Date.parse(b)-Date.parse(a))/86400000);
const md=(day:string)=>Number(day.slice(5,7))+'월 '+Number(day.slice(8,10))+'일';

export function topics(f:MemoryFacts):Topic[]{
 const out:Topic[]=[];
 if(f.lastVisit&&daysBetween(f.lastVisit,f.today)>=ABSENCE_DAYS)out.push({kind:'absence',key:'absence:'+f.today,vars:{days:String(daysBetween(f.lastVisit,f.today))}});
 if(f.holding)out.push({kind:'holding',key:`holding:${f.holding.item}:${f.holding.day}`,vars:{item:f.holding.item}});
 if(f.loss)out.push({kind:'loss',key:`loss:${f.loss.id}:${f.today}`,vars:{tree:f.loss.tree}});
 if(f.mine)out.push({kind:'mine',key:'mine:'+f.mine.giftId,vars:{item:f.mine.item}});
 if(f.decor)out.push({kind:'decor',key:'decor:'+f.decor.id,vars:{item:f.decor.name}});
 for(const item of f.outfit??[])out.push({kind:'outfit',key:'outfit:'+item,vars:{item}});
 if(f.decision&&f.decision.day!==f.today)out.push({kind:'decision',key:`decision:${f.decision.day}:${f.decision.decision}`,vars:{tree:f.decision.tree,decision:f.decision.decision,reason:f.decision.reason,day:md(f.decision.day)}});
 return out}

// The thing to bring up now: not told yet, of a kind the friend has lines for, in MEMORY_ORDER.
export function memoryTopic(f:MemoryFacts,told:string[],kinds:MemoryKind[]):Topic|null{
 const fresh=topics(f).filter(t=>!told.includes(t.key)&&kinds.includes(t.kind));
 return MEMORY_ORDER.map(k=>fresh.find(t=>t.kind===k)).find(Boolean)??null}

// Korean particles after a word: 을/를, 이/가, 은/는, 과/와, 으로/로.
const PAIRS:Record<string,[string,string]>={'을':['을','를'],'를':['을','를'],'이':['이','가'],'가':['이','가'],'은':['은','는'],'는':['은','는'],'과':['과','와'],'와':['과','와'],'으로':['으로','로'],'로':['으로','로']};
export function josa(word:string,p:string){const pair=PAIRS[p];if(!pair)return word+p;const c=word.charCodeAt(word.length-1)-0xac00;const batchim=c>=0&&c<=11171?c%28:0;
 if(pair[0]==='으로')return word+(batchim&&batchim!==8?'으로':'로');return word+(batchim?pair[0]:pair[1])}
// "{item|을} 가져왔어" → "털실 바구니를 가져왔어"; a line whose variable is missing or empty is left out ('').
export function fill(text:string,vars:Record<string,string>){let missing=false;
 const out=text.replace(/\{(\w+)(?:\|([^}]+))?\}/g,(_,k:string,p?:string)=>{const v=vars[k];if(!v){missing=true;return ''}return p?josa(v,p):v});
 return missing?'':out}
// Remembered keys are capped so the record does not grow without end.
export const TOLD_KEEP=60;
export const remember=(told:string[]|undefined,key:string)=>[...(told??[]).filter(k=>k!==key),key].slice(-TOLD_KEEP);
