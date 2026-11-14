// 관측소 원정 feel (docs/game.md 7-1): a sound slot (core/sound.ts, off when the player turned sound off) and a short
// buzz on the big moments only (off when "움직임 줄이기" is on or the phone has no vibration).
import {cue,type Slot} from '../../core/sound';
import {still} from '../still';
export function fx(slot:Slot,buzz=0){
  cue(slot);
  if(buzz&&!still())try{navigator.vibrate?.(buzz)}catch{}
}
// a little paper clip that flies from where a headline was pinned to the pin counter (FLIP, transform only)
export function flyPin(from:Element|null,to:Element|null){
  if(!from||!to||still())return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  const el=document.createElement('div');el.className='gx-fly';el.innerHTML='<svg viewBox="0 0 24 24"><path d="M15 4l5 5-3 1-4 4 1 4-2 2-4-4-4 4M9 13l-4-4 2-2 4 1 4-4 1-3z"/></svg>';
  el.style.left=a.left+'px';el.style.top=a.top+'px';document.body.appendChild(el);
  requestAnimationFrame(()=>{el.style.transform=`translate(${b.left-a.left+8}px,${b.top-a.top+6}px) scale(.7)`;el.style.opacity='.4'});
  setTimeout(()=>{el.remove();to.animate?.([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'})},440);
}
