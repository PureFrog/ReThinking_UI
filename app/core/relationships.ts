// ux-spec 3장 relationship stages: closeness is kept per friend and split into five stages. Each stage reached plays
// its short scene once (lines in app/content/dialogue/<id>.json) and opens that stage's lines. A daily cap keeps clicking from
// farming it; the retrospective (12.4) is the one reward outside the cap.
export const STAGES=['처음 만남','아는 사이','친구','단짝','가족 같은'] as const;
export type Stage=0|1|2|3|4;
// points needed for each stage
export const STAGE_POINTS=[0,8,25,50,90];
export const DAILY_CAP=6;
// talk: a conversation once per visit · story: a tree story taken to a recorded decision · visit: the first visit of
// a day, streak: on top of it when the friend also came the day before
export const POINTS={talk:1,story:3,visit:1,streak:1};
// visits: arrivals counted (a gift given shows on the next one) · told: memory keys already brought up (app/core/memory.ts)
export type Relation={points:number;stage:Stage;daily:{day?:string;got?:number};lastVisit?:string;streak?:number;scenes?:number[];visits?:number;told?:string[]};
export const blankRelation=():Relation=>({points:0,stage:0,daily:{}});

export function stageOf(points:number):Stage{return STAGE_POINTS.filter(p=>points>=p).length-1 as Stage}
const yesterday=(day:string)=>new Date(Date.parse(day)-86400000).toISOString().slice(0,10);

// Adds closeness; returns the new record and the stage reached, if it went up.
export function gain(r:Relation|undefined,amount:number,day:string,capped=true):{rel:Relation;rose:Stage|null}{
 const cur={...blankRelation(),...r};const got=cur.daily.day===day?cur.daily.got??0:0;
 const add=Math.max(0,capped?Math.min(amount,DAILY_CAP-got):amount);
 const points=cur.points+add,stage=stageOf(points);
 return {rel:{...cur,points,stage,daily:{day,got:got+(capped?add:0)}},rose:stage>cur.stage?stage:null}}

// The first visit of a day pays, more when it keeps a run of days going; later visits that day pay nothing.
export function visitGain(r:Relation|undefined,day:string){
 if(r&&r.lastVisit===day)return {rel:r,rose:null};const cur={...blankRelation(),...r};
 const streak=cur.lastVisit===yesterday(day)?(cur.streak??1)+1:1;
 return gain({...cur,lastVisit:day,streak},POINTS.visit+(streak>1?POINTS.streak:0),day)}

// The lowest reached stage whose scene has not played yet.
export function pendingScene(r:Relation|undefined):Stage|null{
 if(!r)return null;for(let s=1;s<=r.stage;s++)if(!(r.scenes??[]).includes(s))return s as Stage;return null}
export const sceneSeen=(r:Relation|undefined,stage:number)=>!!r?.scenes?.includes(stage);
export function markScene(r:Relation|undefined,stage:number):Relation{const cur={...blankRelation(),...r};return {...cur,scenes:[...(cur.scenes??[]).filter(s=>s!==stage),stage]}}
export const arrive=(r:Relation|undefined):Relation=>{const cur={...blankRelation(),...r};return {...cur,visits:(cur.visits??0)+1}};
// 0..1 for the visitor's task weights (visitor-tasks closeness hook)
export const closeness=(r:Relation|undefined)=>(r?.stage??0)/4;
// luon is found out as the anonymous gift-giver in its 단짝 scene
export const LUON_REVEAL=3;
export const MOA_LETTER=4;
