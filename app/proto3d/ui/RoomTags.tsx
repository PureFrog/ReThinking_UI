'use client';
// Small paper tags pinned over things in the room (the desk, the shelf, the board, the door), so what each does reads
// without a tap; plain DOM pinned each frame to the point the scene reports (screen.ts), like the bubbles.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
export type RoomTag={k:string;text:string;alert?:boolean;onClick:()=>void};
export function RoomTags({items}:{items:RoomTag[]}){
  const refs=useRef(new Map<string,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [k,el] of refs.current){const p=screenPoints.get(k);
      if(!p||!p.visible){el.style.visibility='hidden';continue}el.style.visibility='visible';el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(t=><button key={t.k} type="button" className="rt-room-tag" data-alert={!!t.alert} style={{visibility:'hidden'}}
    ref={el=>{if(el)refs.current.set(t.k,el);else refs.current.delete(t.k)}} onClick={t.onClick}>{t.text}</button>)}</>;
}
