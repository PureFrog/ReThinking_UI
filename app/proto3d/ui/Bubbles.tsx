'use client';
// Bubbles over the analysts, as plain DOM buttons pinned each frame to the point the scene projects above each head
// (screen.ts). id is an analyst's, or 'bori' for the friend (core/friend.ts). Plain DOM keeps them sharp, focusable and testable.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
export function Bubbles({items,onPick}:{items:{id:string;text:string;alert:boolean}[];onPick:(id:string)=>void}){
  const refs=useRef(new Map<string,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [id,el] of refs.current){const p=screenPoints.get('bubble-'+id);
      if(!p||!p.visible){el.style.visibility='hidden';continue}el.style.visibility='visible';const half=el.offsetWidth/2,max=(el.parentElement?.clientWidth??innerWidth)-half-12;
      // keep the whole bubble on screen (the tail may then point a little off its analyst)
      el.style.left=Math.max(half+12,Math.min(max,p.x))+'px';el.style.top=Math.max(el.offsetHeight+80,p.y)+'px'}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(b=><button key={b.id} type="button" className="rt-bubble" data-analyst={b.id} data-long={b.text.length>28||undefined} style={{visibility:'hidden'}}
    ref={el=>{if(el)refs.current.set(b.id,el);else refs.current.delete(b.id)}} onClick={()=>onPick(b.id)}>
    {b.alert&&<span className="rt-dot"/>}{b.text}</button>)}</>;
}
