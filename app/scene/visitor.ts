// One visiting friend (13.7-4: up to MAX_VISITORS at once). Each visitor owns its state machine,
// timers, task memory and head emote; the scene owns the world, the player and the one shared speech bubble.
import {cue} from '../core/sound';
import type * as Phaser from 'phaser';
import type {GardenScene} from './game';
import {pickTask,mayTalk,stepAside,near,dist,cornerCell,fleeCell,TASKS,FLOWER_CELLS,type TaskId,type Emote} from '../core/visitor-tasks';
import {friendById,FRIENDS} from '../content/friends';
const FRIENDS_GUIDE=FRIENDS[0].id;
import {personaOf} from '../content/personas';
import {friendLine,taskLine} from '../content/content';
import {VisitorMachine} from '../core/visitor-machine';
import {TIMING,speechDuration} from '../core/timing';
import {ASSETS,friendArt,FRIEND_POSE_GAP,EMOTE_IMAGES} from './assets';
import {emit,iso,pos,type Actor,type Cell} from './world';
import {floorOf} from './layout';
const EMOTE_GLYPH:Record<Emote,string>={heart:'♥',note:'♪',sparkle:'✦',zzz:'Zz',dots:'…'};
export const decorKey=(d:{name:string;x:number;y:number})=>`${d.name}@${d.x},${d.y}`;
export const DOOR:Cell={x:6,y:10};
export class Visitor{
 machine=new VisitorMachine();tasksDone:TaskId[]=[];tended=new Set<number>();busy=false;leaving=false;arrived=false;
 // the cell this visitor is heading for, so two friends never aim at the same spot
 goal:Cell|null=null;
 activityTimer?:Phaser.Time.TimerEvent;departTimer?:Phaser.Time.TimerEvent;gestureNode?:Phaser.GameObjects.Text|Phaser.GameObjects.Image;
 fleeAt=0;comeOverAt=0;blinkAt=0;glanceAt=0;glance=0;greetAt=0;sample='';looks='';
 constructor(public scene:GardenScene,public id:string,public actor:Actor){}
 get friend(){return friendById(this.id)}
 get persona(){return personaOf(this.friend.persona)}
 get art(){return friendArt(this.id)}
 get present(){return this.scene.guests.includes(this)}
 // the player is walking over to talk, or talking, with this friend
 get engaged(){return this.scene.talkWith===this}
 private mark(task:string){this.scene.game.canvas.dataset.guestTask=task;this.scene.game.canvas.dataset[`task_${this.id}`]=task}
 schedule(delay:number=TIMING.taskGap){this.activityTimer?.remove();const token=this.machine.capture();this.activityTimer=this.scene.time.delayedCall(delay,()=>{if(!this.present||this.leaving)return;if(!this.machine.valid(token)){this.schedule();return}this.activity()})}
 // 11.15-2 / 13.7-2: the persona picks the task (its opening task first), the situation shifts the odds;
 // walk there, do it, end with an emote and now and then a line.
 activity(){const s=this.scene,g=this.actor;if(!this.present||this.leaving)return;if(!this.machine.canAct||this.engaged||s.locked||s.placing||s.placementGate.active||g.walking||this.busy){this.schedule();return}
  const persona=this.persona;const watered=persona.tends?this.tended:s.watered;
  const dry=s.holdings.filter(h=>!watered.has(h.id));const fresh=s.decor.find(d=>s.seenDecor&&!s.seenDecor.has(decorKey(d)));
  const opening=persona.opening&&(!this.tasksDone.length||persona.openingRepeat&&this.tasksDone.every(t=>t===persona.opening))?persona.opening:undefined;
  const cells=s.cells(floorOf(g.cell));const free=(c:Cell)=>s.freeCell(c,this);
  const roamCell=()=>{const options=cells.filter(c=>(c.x>8||c.y>7)&&free(c)&&dist(c,g.cell)>=3&&dist(c,g.cell)<=6);return options[Math.floor(Math.random()*options.length)]??null};
  // a fixed spot someone else is using (the sofa, the window) is skipped for now
  const taken=(c:Cell)=>s.guests.some(o=>o!==this&&(o.goal?.x===c.x&&o.goal?.y===c.y||o.actor.cell.x===c.x&&o.actor.cell.y===c.y));
  let id:TaskId='stretch';let t=TASKS.stretch;let goal:Cell|null=null;let tree;
  for(let attempt=0;attempt<4;attempt++){
   id=s.onboarding&&this.id===FRIENDS_GUIDE?'follow'/* ux-spec 8장: the guide keeps near the new player */:attempt===0&&opening&&(opening!=='water'||dry.length)?opening:pickTask(persona,{recent:this.tasksDone,dryTree:dry.length>0,newThing:!!fresh,closeness:s.closeness[this.id],night:s.daypart==='night'});t=TASKS[id];
   tree=id==='water'?dry[Math.floor(Math.random()*dry.length)]:undefined;goal=null;
   if(typeof t.spot==='object')goal=t.spot;
   else if(t.spot==='player')goal={...s.player.cell};
   else if(t.spot==='tree'&&tree)goal=s.plotCell(tree.plot);
   else if(t.spot==='new'&&fresh)goal={x:fresh.x,y:fresh.y};
   else if(t.spot==='far'){const p=s.player.cell;goal=cells.filter(c=>free(c)&&dist(c,p)>=4&&dist(c,p)<=6).sort((a,b)=>dist(a,g.cell)-dist(b,g.cell))[0]??null}
   else if(t.spot==='roam')goal=roamCell();
   else if(t.spot==='corner')goal=cornerCell(cells,free,s.player.cell);
   else if(t.spot==='garden')goal=FLOWER_CELLS[Math.floor(Math.random()*FLOWER_CELLS.length)];
   if(!goal||!taken(goal))break;
   id='stretch';t=TASKS.stretch;goal=null;tree=undefined;
  }
  this.tasksDone=[...this.tasksDone.slice(-5),id];this.mark(id);this.goal=goal;
  const ms=t.ms*persona.linger;const task=t;const target=goal;const wateringTree=tree;
  const act=()=>{if(!this.present||this.leaving)return;if(this.engaged||s.locked||!this.machine.canAct){this.goal=null;this.schedule();return}
   if(wateringTree){if(!s.holdings.some(h=>h.id===wateringTree.id)){this.goal=null;this.schedule(TIMING.taskGap);return}this.busy=true;s.wateringAnimation(g,wateringTree);s.watered.add(wateringTree.id);this.tended.add(wateringTree.id)}
   if(fresh&&id==='look')s.seenDecor?.add(decorKey(fresh));
   // face what the task is about: the window, the player, or the thing walked up to
   const look=id==='window'?{x:0,y:1}:id==='read'?{x:3,y:0}:id==='sofa'?{x:3,y:1}:id==='watch'||id==='follow'||id==='chat'?s.player.cell:target;if(look){const p=pos(look.x,look.y);if(Math.abs(p.x-g.node.x)>1)g.face=p.x<g.node.x?-1:1}
   g.pose=task.pose;const prop=task.pose==='read'&&!s.textures.exists(this.art.read.key)?s.add.graphics().fillStyle(0xc1836b).fillRoundedRect(-12,-44,24,17,3).fillStyle(0xfdf6df).fillRect(-10,-42,9,13).fillRect(1,-42,9,13):undefined;if(prop)g.node.add(prop);
   if(task.emote==='zzz')this.gesture('zzz',ms);
   // tea: from behind the chair, onto its seat, facing the room
   if(id==='tea'&&s.teaChair){const seat=pos(12,3);s.tweens.add({targets:g.node,x:seat.x,y:seat.y-14,duration:300,ease:'Sine.Out'});g.node.setDepth(s.teaChair.depth+1);s.time.delayedCall(ms-300,()=>{if(!this.present||g.walking||g.pose!=='sit')return;const p=pos(g.cell.x,g.cell.y);s.tweens.add({targets:g.node,x:p.x,y:p.y,duration:300,ease:'Sine.In',onComplete:()=>g.node.setDepth(p.y)})})}
   if(id==='sofa'&&s.sofa){const seat=pos(0,.5);g.face=1;s.tweens.add({targets:g.node,x:seat.x,y:seat.y-20,duration:300,ease:'Sine.Out'});g.node.setDepth(s.sofa.depth+1);s.time.delayedCall(ms-300,()=>{if(!this.present||g.walking||g.pose!=='sit')return;const p=pos(g.cell.x,g.cell.y);s.tweens.add({targets:g.node,x:p.x,y:p.y,duration:300,ease:'Sine.In',onComplete:()=>g.node.setDepth(p.y)})})}
   // a chatty friend opens with a line right away; everyone else ends the task with one now and then
   if(id==='chat')this.mutter(taskLine(this.id,id));
   this.machine.transition(wateringTree?'watering':'doing');const token=this.machine.capture();
   s.time.delayedCall(ms,()=>{prop?.destroy();if(!this.present)return;if(wateringTree)this.busy=false;if(!this.machine.valid(token)||this.leaving)return;g.pose='stand';this.goal=null;this.machine.transition('idle');if(task.emote!=='zzz')this.gesture(task.emote);if(id!=='chat')this.mutter(taskLine(this.id,id));this.schedule((TIMING.taskGap+Math.random()*TIMING.taskJitter)*persona.rest)})};
  // roam chains a few walks before the action
  let hops=(t.hops??1)-1;const arrive=()=>{if(!this.present||this.leaving)return;const next=hops-->0?roamCell():null;if(next&&s.walk(g,next,arrive))return;act()};
  if(!goal||(goal.x===g.cell.x&&goal.y===g.cell.y)){act();return}
  if(!s.walk(g,goal,arrive,!!t.near)){this.goal=null;this.schedule(TIMING.taskGap)}
 }
 // One speech bubble on screen (13.7-4): a line is dropped while another friend's line is still up; a greeting waits its turn.
 says(text:string,wait=false){const s=this.scene;if(!this.present)return;if(s.mode!=='free'){s.worldQueue.enqueue('ambient',()=>this.says(text,wait));return}
  if(!s.inSight(this.actor.cell))return;const now=s.time.now;if(s.bubble.id&&s.bubble.id!==this.id&&now<s.bubble.until){if(wait)s.time.delayedCall(s.bubble.until-now+200,()=>this.says(text,wait));return}
  s.lastLine[this.id]=now;s.bubble={id:this.id,until:now+speechDuration(text)+Array.from(text).length*TIMING.typeChar};
  emit('ambient',{id:this.id,text,...s.view(this.actor.node.x,this.actor.node.y)});/* React owns expiry after typing finishes. */}
 // Lines stay rare: one per friend per persona.lineGap at most (11.15-6; chatty friends 20 s, 13.7-3).
 mutter(line:string,always=false){const p=this.persona;if(mayTalk(this.scene.time.now,this.scene.lastLine[this.id],p.lineGap,Math.random,always?1:p.lineChance))this.says(line)}
 // Head emotes for gestures (11.15-6): the 006 bubbles, or glyph cards if the art is missing.
 gesture(kind:Emote|null,ms:number=TIMING.emote){const s=this.scene;this.gestureNode?.destroy();this.gestureNode=undefined;if(!kind||!this.present)return;if(kind==='heart')cue('heart');s.game.canvas.dataset.guestEmote=kind;s.game.canvas.dataset[`emote_${this.id}`]=kind;
  const a=this.actor.node;const art=EMOTE_IMAGES[kind];const n=s.textures.exists(art.key)?s.add.image(a.x,a.y-112,art.key).setDisplaySize(TIMING.emoteSize,TIMING.emoteSize):s.add.text(a.x,a.y-112,EMOTE_GLYPH[kind],{fontFamily:'sans-serif',fontSize:'20px',color:kind==='heart'?'#d4756a':'#6c7f5c',backgroundColor:'#fffdf0',padding:{x:8,y:3}});n.setOrigin(.5,1).setDepth(3500);const full=n.scaleX;n.setScale(full*.4);this.gestureNode=n;
  s.tweens.add({targets:n,scale:full,duration:200,ease:'Back.Out'});s.time.delayedCall(ms,()=>{if(this.gestureNode!==n)return;s.tweens.add({targets:n,alpha:0,duration:TIMING.fade,onComplete:()=>{n.destroy();if(this.gestureNode===n)this.gestureNode=undefined}})})}
 // Ready for an interruption (step aside, notice, react): standing about or in the middle of a task, not talking or leaving.
 get loose(){const s=this.scene;const st=this.machine.state;return !this.actor.walking&&!this.leaving&&!this.busy&&!this.engaged&&s.mode==='free'&&(st==='idle'||st==='doing')}
 // 11.15-5: a friend on the player's path steps one cell aside.
 makeWay(path:Cell[]){const g=this.actor;if(!this.loose||!path.some(c=>c.x===g.cell.x&&c.y===g.cell.y))return;
  const to=stepAside(g.cell,path,c=>this.scene.freeCell(c,this));if(!to)return;this.mark('make-way');this.goal=to;this.scene.walk(g,to,()=>{this.goal=null;if(this.present&&!this.leaving)this.schedule(TIMING.taskGap)})}
 // 11.15-5: a new outfit gets noticed. The nearest friend comes over with a sparkle (and a word, if a line is due); the others sparkle where they are.
 notice(comeOver:boolean){const s=this.scene,g=this.actor;const st=this.machine.state;if(this.leaving||this.busy||this.engaged||(st!=='idle'&&st!=='doing'&&st!=='moving'))return;this.mark('notice');
  const done=()=>{if(!this.present||this.leaving)return;const p=s.player.node;g.face=p.x<g.node.x?-1:1;this.gesture('sparkle');this.mutter(friendLine(this.id,'notice'),true);this.schedule(TIMING.taskGap)};
  if(!comeOver||near(g.cell,s.player.cell,1)){this.stop();this.machine.transition('idle');done();return}if(!s.walk(g,s.player.cell,done,true))done()}
 stop(){const g=this.actor;++g.token;g.pose='stand';this.goal=null;this.scene.tweens.killTweensOf(g.node);g.walking=false;const p=pos(g.cell.x,g.cell.y);g.node.setPosition(p.x,p.y).setDepth(p.y)}
 // 13.7-2: how a persona answers the player coming close. Shy friends back off; the rest just turn to look (motion).
 react(time:number){const s=this.scene,g=this.actor;if(!this.loose)return;
  if(this.persona.near==='shy'&&time>this.fleeAt&&near(g.cell,s.player.cell,2)){this.fleeAt=time+TIMING.shyCooldown;const to=fleeCell(g.cell,s.player.cell,s.cells(floorOf(g.cell)),c=>s.freeCell(c,this));if(!to)return;this.mark('back-off');this.gesture('dots');this.goal=to;s.walk(g,to,()=>{this.goal=null;if(this.present&&!this.leaving)this.schedule(TIMING.taskGap)})}}
 // A friend who likes company comes over when the player stops nearby.
 comeOver(){const s=this.scene,g=this.actor;if(this.persona.near!=='approach'||!this.loose)return;const now=s.time.now;if(now<this.comeOverAt||near(g.cell,s.player.cell,1)||!near(g.cell,s.player.cell,7))return;
  this.comeOverAt=now+TIMING.comeOverCooldown;this.mark('come-over');s.walk(g,s.player.cell,()=>{if(!this.present||this.leaving)return;this.gesture('heart');this.schedule(TIMING.taskGap)},true)}
 // Two friends standing close trade a little emote now and then.
 greet(other:Visitor,time:number){if(!this.loose||!other.loose||time<this.greetAt||time<other.greetAt)return;if(!near(this.actor.cell,other.actor.cell,2))return;
  this.greetAt=other.greetAt=time+TIMING.friendGreetCooldown;const face=(a:Visitor,b:Visitor)=>{if(Math.abs(b.actor.node.x-a.actor.node.x)>1)a.actor.face=b.actor.node.x<a.actor.node.x?-1:1};face(this,other);face(other,this);
  this.gesture('note');this.scene.time.delayedCall(500,()=>other.gesture('heart'));this.scene.game.canvas.dataset.friendsGreeted=`${this.id}+${other.id}`}
 // 11.15-1: never still. Breathing, the picture for the task at hand (006 poses; without them the idle frame is squashed or tilted),
 // a blink every few seconds, a glance around now and then, and turning to the player when they come close or talk.
 motion(time:number){const s=this.scene,g=this.actor;const img=g.node.getAt(1) as Phaser.GameObjects.Image;const b=g.base??img.scaleY;let face=g.face??1;const state=this.machine.state;const player=s.player;
  if(!g.walking&&(g.pose==='stand'&&near(g.cell,player.cell,3)||state==='approaching'||state==='talking')){if(Math.abs(player.node.x-g.node.x)>1)face=g.face=player.node.x<g.node.x?-1:1}
  else if(!g.walking&&g.pose==='hide'){const toward=player.node.x<g.node.x?-1:1;face=g.face=time%2600<800?toward:-toward}
  else if(!g.walking&&g.pose==='stand'){if(time>this.glanceAt){this.glanceAt=time+TIMING.lookAround+Math.random()*2000;this.glance=time+700}if(time<this.glance)face=-face}
  const art=this.art;const has=(k?:{key:string})=>!!k&&s.textures.exists(k.key);
  const pose=g.pose??'stand';const posed=!g.walking&&(pose==='sit'||pose==='nap'||pose==='read')&&has(art[pose]);
  if(time>=this.blinkAt+TIMING.blink)this.blinkAt=time+TIMING.blinkEvery+Math.random()*3000;const blinking=time>=this.blinkAt;
  const tex=g.walking&&g.back&&has(art.back)?art.back.key:posed?art[pose as 'sit'|'nap'|'read'].key:blinking&&!g.walking&&pose!=='nap'&&has(art.blink)?art.blink.key:'';
  const f=this.friend;if(tex!==g.tex){g.tex=tex;if(tex)img.setTexture(tex);else if(f.atlas)img.setTexture(ASSETS.legacy.key,'item'+f.atlas.frame);else img.setTexture(art.idle.key)}
  // the old atlas frames sit off-centre; the 006 poses are centred with the feet 18px up
  const idle=!tex||tex===art.blink.key;const anchor=f.atlas??{cx:256,gap:FRIEND_POSE_GAP};const dx=idle?(256-anchor.cx)*b:0;const dy=(idle?anchor.gap:FRIEND_POSE_GAP)*b;
  const breath=Math.sin(time/650);let y=0,sy=1+.015*breath,ang=0;
  if(g.walking){y=Math.sin(time/130)*1.2;ang=Math.sin(time/160);sy=1}
  else if(posed)sy=1+(pose==='nap'?.025*Math.sin(time/1100):.01*breath);
  else if(pose==='sit'){sy=.9+.01*breath;y=3}
  else if(pose==='nap'){sy=.84+.02*Math.sin(time/1100);ang=-6*face;y=4}
  else if(pose==='read'){y=Math.sin(time/900)*.8;ang=Math.sin(time/1400)*2}
  else if(pose==='lean')ang=5*face;
  else if(pose==='stretch')sy=1+.06*Math.abs(Math.sin(time/450));
  else if(pose==='hop')y=-Math.abs(Math.sin(time/140))*7;
  else if(pose==='hide'){sy=.93+.01*breath;y=2}
  img.x=dx*face;img.y=y+dy;img.angle=ang;img.setScale(b*face,b*sy);this.sample=`${pose}:${face}:${sy.toFixed(4)}:${y.toFixed(2)}:${tex||'idle'}`;this.looks=Math.sign(player.node.x-g.node.x)===face?'player':'away';
  this.gestureNode?.setPosition(g.node.x,g.node.y-(pose==='nap'?60:112))}
 scheduleDeparture(delay:number){this.departTimer?.remove();this.departTimer=this.scene.time.delayedCall(delay,()=>{if(!this.present)return;if(this.engaged||this.scene.locked||this.busy)this.scheduleDeparture(TIMING.visitRetry);else this.depart()})}
 depart(){const s=this.scene,g=this.actor;if(!this.present||this.leaving)return;if(s.mode!=='free'){s.worldQueue.enqueue('departure',()=>this.depart());return}
  if(this.engaged){++s.talkRequest;s.talkWith=null;s.emote(null);emit('close-talk')}this.gesture(null);s.feel('sad');this.machine.transition('leaving');this.leaving=true;this.activityTimer?.remove();this.departTimer?.remove();if(s.bubble.id===this.id){emit('ambient',null);s.bubble={id:'',until:0}}
  if(s.live)this.says(friendLine(this.id,'tomorrow'))/* ux-spec 4장 세션 루프 4: the next visit, said on the way out */;
  const gone=s.walk(g,DOOR,()=>{g.node.destroy();this.machine.reset();s.visitorGone(this)});if(!gone){this.leaving=false;this.machine.transition('idle');this.scheduleDeparture(TIMING.visitRetry);this.schedule()}}
}
