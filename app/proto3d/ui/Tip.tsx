'use client';
// A first-time pointer (core/tips.ts): a paper callout beside what it points at (a button by its selector, or a place in
// the garden by its screen point), with "알겠어". Pinned each frame, hidden when its target is not on screen.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
export function Tip({text,target,point,onDone}:{text:string;target?:string;point?:string;onDone:()=>void}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{let raf=0;const tick=()=>{const el=ref.current;if(el){let x=0,y=0,ok=false;
      if(target){const t=document.querySelector(target)?.getBoundingClientRect();if(t&&t.width){x=t.left+t.width/2;y=t.top;ok=true}}
      else if(point){const p=screenPoints.get(point);if(p&&p.visible){x=p.x;y=p.y-30;ok=true}}
      el.style.visibility=ok?'visible':'hidden';
      if(ok){const w=el.offsetWidth,h=el.offsetHeight,W=innerWidth,below=y<h+40;
        el.style.left=Math.max(10,Math.min(W-w-10,x-w/2))+'px';el.style.top=(below?y+60:y-h-12)+'px';el.dataset.below=String(below);
        el.style.setProperty('--arrow',`${Math.max(14,Math.min(w-14,x-Math.max(10,Math.min(W-w-10,x-w/2))))}px`)}}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[target,point]);
  return <div ref={ref} className="rt-tip" role="status" style={{visibility:'hidden'}}>
    <p>{text}</p><button type="button" className="rt-btn" onClick={onDone}>알겠어</button></div>;
}
