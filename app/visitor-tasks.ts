// 11.15: a visiting friend picks what to do next from a task list, not a spot on the map.
// Each task is walk → action → short reaction (an emote, now and then a line).
export type TaskId='sofa'|'read'|'window'|'flowers'|'water'|'look'|'nap'|'follow'|'watch'|'chase'|'stretch';
export type Emote='heart'|'note'|'sparkle'|'zzz'|'dots';
export type Pose='stand'|'sit'|'nap'|'read'|'lean'|'stretch'|'hop';
type Cell={x:number;y:number};
export type Task={
 // where to go: a fixed cell (near = stop next to it), or worked out from the scene
 spot:Cell|'player'|'far'|'tree'|'new'|'garden'|'here';near?:boolean;
 pose:Pose;ms:number;emote:Emote;lines:[string,string,string];
};
// Spots stand in front of the furniture so the friend stays in view (cells behind the sofa are hidden by it).
const flowers:Cell[]=[{x:1,y:10},{x:2,y:12},{x:14,y:2},{x:15,y:7},{x:12,y:8}];
export const TASKS:Record<TaskId,Task>={
 sofa:{spot:{x:4,y:3},pose:'sit',ms:4200,emote:'note',lines:['여기 앉으니까 포근하다.','소파 폭신하네!','…편하네.']},
 read:{spot:{x:3,y:2},pose:'read',ms:4200,emote:'sparkle',lines:['이 책 재밌어 보여.','오, 이 책 뭐꼬?','…이 책, 좋네.']},
 window:{spot:{x:3,y:1},pose:'lean',ms:3600,emote:'dots',lines:['밖에 바람이 좋다.','창밖 구경 좋다!','…구름이 느리네.']},
 flowers:{spot:'garden',pose:'lean',ms:3000,emote:'heart',lines:['꽃 냄새 좋다.','꽃 예쁘다!','…향이 은은하네.']},
 water:{spot:'tree',near:true,pose:'stand',ms:2000,emote:'sparkle',lines:['목말랐지? 물 줄게.','물 듬뿍이다!','…촉촉해졌다.']},
 look:{spot:'new',near:true,pose:'hop',ms:2600,emote:'sparkle',lines:['이거 새로 놨구나!','우와, 이거 새거네!','…새로 들였네.']},
 nap:{spot:{x:4,y:4},pose:'nap',ms:6000,emote:'zzz',lines:['햇볕이 따뜻해서 졸려…','쪼매만 잘게…','…잠깐만.']},
 follow:{spot:'player',near:true,pose:'stand',ms:1800,emote:'heart',lines:['같이 있을래.','같이 가자!','…따라가도 되지?']},
 watch:{spot:'far',pose:'stand',ms:3600,emote:'dots',lines:['오늘도 열심이네.','뭐 하노?','……']},
 chase:{spot:'garden',pose:'hop',ms:1600,emote:'sparkle',lines:['나비다!','나비 잡아 보자!','…나비네.']},
 stretch:{spot:'here',pose:'stretch',ms:1800,emote:'note',lines:['으음, 기지개!','으라차!','…하암.']},
};
export const FLOWER_CELLS=flowers;
// Personality: 0 모아 sit · flowers · near the player; 1 토리 running · watering · butterflies · furniture; 2 루온 naps · window · watching from afar.
export const PERSONALITY:Record<TaskId,number>[]=[
 {sofa:5,read:2,window:1,flowers:5,water:2,look:2,nap:1,follow:5,watch:1,chase:1,stretch:2},
 {sofa:1,read:1,window:1,flowers:2,water:5,look:5,nap:1,follow:2,watch:1,chase:5,stretch:3},
 {sofa:2,read:3,window:5,flowers:1,water:1,look:1,nap:5,follow:1,watch:5,chase:1,stretch:2},
];
export type TaskContext={recent:TaskId[];dryTree:boolean;newThing:boolean;closeness?:number;night?:boolean};
// Weights after the situation: a dry tree pulls toward watering, something new gets looked at first.
// closeness (0..1) and night are hooks for the relationship and time stages (13.4-6).
export function taskWeights(friend:number,ctx:TaskContext){
 const w={...PERSONALITY[friend]??PERSONALITY[0]};
 if(ctx.dryTree)w.water*=6;else w.water=0;
 if(ctx.newThing)w.look*=10;else w.look=0;
 if(ctx.closeness){w.follow*=1+ctx.closeness;w.sofa*=1+ctx.closeness/2}
 if(ctx.night){for(const k of Object.keys(w) as TaskId[])w[k]*=k==='sofa'||k==='nap'?2:.2}
 for(const k of ctx.recent.slice(-3))w[k]=0;
 return w;
}
export function pickTask(friend:number,ctx:TaskContext,rnd=Math.random):TaskId{
 const w=taskWeights(friend,ctx);const entries=(Object.entries(w) as [TaskId,number][]).filter(([,v])=>v>0);
 const total=entries.reduce((s,[,v])=>s+v,0);let r=rnd()*total;
 for(const [k,v] of entries){r-=v;if(r<0)return k}
 return entries[entries.length-1]?.[0]??'stretch';
}
// Lines are rare: at most one per friend per gap (11.15-6), and even then only some of the time.
export function mayTalk(now:number,last:number|undefined,gap:number,rnd=Math.random){return (last===undefined||now-last>=gap)&&rnd()<.35}
// Where a friend steps aside to: a free neighbour that the player's path does not use.
export function stepAside(at:Cell,path:Cell[],free:(c:Cell)=>boolean):Cell|null{
 const used=new Set(path.map(c=>`${c.x},${c.y}`));
 for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const c={x:at.x+dx,y:at.y+dy};if(!used.has(`${c.x},${c.y}`)&&free(c))return c}
 return null;
}
export const near=(a:Cell,b:Cell,n:number)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=n;
