// redesign 4-2 the cooldown (borrowed from Forest): pressing "팔고 싶어" does not record anything yet. A seed goes into a
// pot beside the tree; come back after COOLDOWN.hours and decide, and the pot flowers. Deciding early is allowed (it is
// the player's call), but the pot stays bare and the impulse-control stat counts it as not waited.
export const COOLDOWN={hours:24};
export type Cooldown={id:string;holdingId:number;started:number;done?:{at:number;waited:boolean}};
export const readyAt=(c:Cooldown)=>c.started+COOLDOWN.hours*3600000;
export const isReady=(c:Cooldown,now:number)=>now>=readyAt(c);
export const openFor=(list:Cooldown[],holdingId:number)=>list.find(c=>c.holdingId===holdingId&&!c.done)??null;
export function startCooldown(list:Cooldown[],holdingId:number,now:number):Cooldown[]{
  if(openFor(list,holdingId))return list;
  return [...list,{id:`cd-${holdingId}-${now}`,holdingId,started:now}];
}
export function finishCooldown(list:Cooldown[],id:string,now:number):{list:Cooldown[];waited:boolean}{
  const c=list.find(x=>x.id===id);if(!c||c.done)return {list,waited:false};
  const waited=isReady(c,now);
  return {list:list.map(x=>x===c?{...x,done:{at:now,waited}}:x),waited};
}
// hours and minutes left, for the pot's label
export function leftLabel(c:Cooldown,now:number){const ms=Math.max(0,readyAt(c)-now),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h?`${h}시간 ${m}분`:`${m}분`}
export function impulseOf(list:Cooldown[]){const done=list.filter(c=>c.done);const waited=done.filter(c=>c.done!.waited).length;return {done:done.length,waited,rate:done.length?Math.round(waited/done.length*100):null}}
// pots on a tree: open ones show a sprout, waited ones a flower (kept as a little trophy)
export const flowersOn=(list:Cooldown[],holdingId:number)=>list.filter(c=>c.holdingId===holdingId&&c.done?.waited).length;
