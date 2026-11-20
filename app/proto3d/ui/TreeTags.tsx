'use client';
// 마을 (PM 설계 2026-11-19 5·6장): each holding tree carries its stock's name and nothing else (no returns, no D-day).
// Plain DOM pinned each frame to the point above the tree (screen.ts 'tree-<id>'), like the capsule tags. A tap opens
// that stock's notebook beside the tree.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';

export function TreeTags({items,onPick}:{items:{id:number;name:string;virtual?:boolean}[];onPick:(id:number)=>void}){
  const refs=useRef(new Map<number,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [id,el] of refs.current){const p=screenPoints.get('tree-'+id);
      if(!p||!p.visible||p.y<60){el.style.visibility='hidden';continue}el.style.visibility='visible';el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%) translateY(-28px)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(t=><button key={t.id} type="button" className="vl-tree-tag" data-tree={t.id} data-virtual={!!t.virtual} style={{visibility:'hidden'}} aria-label={t.virtual?`가상 ${t.name} 보기`:`${t.name} 일지 펼치기`}
    ref={el=>{if(el)refs.current.set(t.id,el);else refs.current.delete(t.id)}} onClick={()=>onPick(t.id)}>{t.name}</button>)}</>;
}
