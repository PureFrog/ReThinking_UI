'use client';
// Small paper tags pinned over things in the room (the desk, the shelf, the board, the door), so what each does reads
// without a tap; plain DOM pinned each frame to the point the scene reports (screen.ts), like the bubbles.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
export type RoomTag={k:string;text:string;alert?:boolean;onClick:()=>void};
export function RoomTags({items}:{items:RoomTag[]}){
  const refs=useRef(new Map<string,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [k,el] of refs.current){const p=screenPoints.get(k);
      if(!p||!p.visible||p.x<0||p.x>window.innerWidth){el.style.visibility='hidden';continue}/* its thing is off the screen */el.style.visibility='visible';
      // kept on the screen: a tag by the room's edge would run off the side on a phone
      const hw=el.offsetWidth/2,x=Math.max(hw+8,Math.min(window.innerWidth-hw-8,p.x));
      el.style.transform=`translate(${x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(t=><button key={t.k} type="button" className="rt-room-tag" data-alert={!!t.alert} style={{visibility:'hidden'}}
    ref={el=>{if(el)refs.current.set(t.k,el);else refs.current.delete(t.k)}} onClick={t.onClick}>{t.text}</button>)}</>;
}
