// 11.15: a visiting friend picks what to do next from a task list, not a spot on the map.
// Each task is walk → action → short reaction (an emote, now and then a line). Which tasks a friend
// likes, and how it moves and talks, comes from its persona (app/content/personas.ts).
import type {Persona} from '../content/personas';
export type TaskId='sofa'|'read'|'window'|'flowers'|'water'|'look'|'nap'|'follow'|'watch'|'chase'|'stretch'|'hide'|'roam'|'chat'|'snack'|'tea'|'bed'|'study';
export const TASK_IDS:TaskId[]=['sofa','read','window','flowers','water','look','nap','follow','watch','chase','stretch','hide','roam','chat','snack','tea','bed','study'];
export type Emote='heart'|'note'|'sparkle'|'zzz'|'dots';
export type Pose='stand'|'sit'|'nap'|'read'|'lean'|'stretch'|'hop'|'hide';
type Cell={x:number;y:number};
export type Task={
 // where to go: a fixed cell, or worked out from the scene. near = stop next to it.
 // corner: a free cell against walls or furniture, away from the player. roam: a garden cell a few steps off.
 spot:Cell|'player'|'far'|'tree'|'new'|'garden'|'here'|'corner'|'roam';near?:boolean;
 pose:Pose;ms:number;emote:Emote;
 // default line when neither the friend nor its persona has one
 line:string;
 // chain this many walks before the action (roam)
 hops?:number;
};
// Spots stand in front of the furniture so the friend stays in view (cells behind the sofa are hidden by it).
const flowers:Cell[]=[{x:1,y:10},{x:2,y:12},{x:17,y:9},{x:21,y:24},{x:5,y:23}];
export const TASKS:Record<TaskId,Task>={
 sofa:{spot:{x:1,y:1},pose:'sit',ms:4200,emote:'note',line:'여기 앉으니까 편하다.'},
 read:{spot:{x:3,y:1},pose:'read',ms:4200,emote:'sparkle',line:'이 책 재밌어 보여.'},
 window:{spot:{x:1,y:2},pose:'lean',ms:3600,emote:'dots',line:'밖에 바람이 좋다.'},
 flowers:{spot:'garden',near:true,pose:'lean',ms:3000,emote:'heart',line:'꽃 냄새 좋다.'},
 water:{spot:'tree',near:true,pose:'stand',ms:2000,emote:'sparkle',line:'목말랐지? 물 줄게.'},
 look:{spot:'new',near:true,pose:'hop',ms:2600,emote:'sparkle',line:'이거 새로 놨구나!'},
 nap:{spot:{x:2,y:1},pose:'nap',ms:6000,emote:'zzz',line:'졸려…'},
 follow:{spot:'player',near:true,pose:'stand',ms:1800,emote:'heart',line:'같이 있을래.'},
 watch:{spot:'far',pose:'stand',ms:3600,emote:'dots',line:'오늘도 열심이네.'},
 chase:{spot:'roam',pose:'hop',ms:1600,emote:'sparkle',line:'나비다!'},
 stretch:{spot:'here',pose:'stretch',ms:1800,emote:'note',line:'으음, 기지개!'},
 hide:{spot:'corner',pose:'hide',ms:7000,emote:'dots',line:'…여기 있을게.'},
 roam:{spot:'roam',pose:'hop',ms:900,emote:'note',line:'신난다!',hops:3},
 chat:{spot:'player',near:true,pose:'stand',ms:2600,emote:'note',line:'있잖아, 오늘은 뭐 했어?'},
 // rooms of 13.7-5: kitchen (floor 1), bedroom and study (floor 2)
 snack:{spot:{x:10,y:1},pose:'hop',ms:2400,emote:'heart',line:'맛있는 냄새가 나!'},
 tea:{spot:{x:11,y:3},pose:'sit',ms:4600,emote:'note',line:'차 한 잔 마시고 갈게.'},
 bed:{spot:{x:42,y:1},pose:'nap',ms:6500,emote:'zzz',line:'침대 푹신하다…'},
 study:{spot:{x:52,y:1},pose:'read',ms:5000,emote:'sparkle',line:'여기 조용해서 좋다.'},
};
export const FLOWER_CELLS=flowers;
export type TaskContext={recent:TaskId[];dryTree:boolean;newThing:boolean;closeness?:number;night?:boolean};
// Weights after the situation: a dry tree pulls toward watering, something new gets looked at first.
// closeness (0..1) and night are hooks for the relationship and time stages (13.4-6).
export function taskWeights(persona:Persona,ctx:TaskContext){
 const w=Object.fromEntries(TASK_IDS.map(k=>[k,persona.weights[k]??0])) as Record<TaskId,number>;
 if(ctx.dryTree)w.water*=6;else w.water=0;
 if(ctx.newThing)w.look*=10;else w.look=0;
 if(ctx.closeness){w.follow*=1+ctx.closeness;w.sofa*=1+ctx.closeness/2;w.chat*=1+ctx.closeness}
 if(ctx.night){for(const k of TASK_IDS)w[k]*=k==='sofa'||k==='nap'?2:.2}
 // 11.15-7: none of the last three, unless the persona lives for it (a sleepy friend keeps napping)
 for(const k of ctx.recent.slice(-3))if(!persona.repeatable?.includes(k))w[k]=0;
 return w;
}
export function pickTask(persona:Persona,ctx:TaskContext,rnd=Math.random):TaskId{
 const w=taskWeights(persona,ctx);const entries=(Object.entries(w) as [TaskId,number][]).filter(([,v])=>v>0);
 const total=entries.reduce((s,[,v])=>s+v,0);let r=rnd()*total;
 for(const [k,v] of entries){r-=v;if(r<0)return k}
 return entries[entries.length-1]?.[0]??'stretch';
}
// Lines are rare: at most one per friend per gap (11.15-6), and even then only some of the time.
export function mayTalk(now:number,last:number|undefined,gap:number,rnd=Math.random,chance=.35){return (last===undefined||now-last>=gap)&&rnd()<chance}
// Where a friend steps aside to: a free neighbour that the player's path does not use.
export function stepAside(at:Cell,path:Cell[],free:(c:Cell)=>boolean):Cell|null{
 const used=new Set(path.map(c=>`${c.x},${c.y}`));
 for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const c={x:at.x+dx,y:at.y+dy};if(!used.has(`${c.x},${c.y}`)&&free(c))return c}
 return null;
}
export const near=(a:Cell,b:Cell,n:number)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=n;
export const dist=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
// A hiding spot: a free cell with walls or furniture on at least two sides, as far from the player as possible.
export function cornerCell(cells:Cell[],free:(c:Cell)=>boolean,player:Cell):Cell|null{
 const sheltered=cells.filter(c=>free(c)&&[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!free({x:c.x+dx,y:c.y+dy})).length>=2);
 return sheltered.sort((a,b)=>dist(b,player)-dist(a,player))[0]??null;
}
// Somewhere to back off to when the player comes too close: a free cell 2–4 steps away, as far from the player as possible.
export function fleeCell(at:Cell,player:Cell,cells:Cell[],free:(c:Cell)=>boolean):Cell|null{
 return cells.filter(c=>free(c)&&dist(c,at)>=2&&dist(c,at)<=4&&dist(c,player)>dist(at,player)).sort((a,b)=>dist(b,player)-dist(a,player))[0]??null;
}
