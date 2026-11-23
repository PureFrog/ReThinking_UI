'use client';
// 마을 (PM 설계 2026-11-19 5·6장): each holding tree carries its stock's name and nothing else (no returns, no D-day).
// 피드백 2026-11-22 "나무 위에 종목명이 떠 있는 방식 말고": the name is a small plant marker stuck in the ground at the
// tree's foot (like a garden label), and only the trees I stand near show theirs (LOOK.treeTag: within near, the
// closest few). Plain DOM pinned each frame (screen.ts 'tree-<id>'). A tap opens that stock's notebook.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
import {LOOK} from '../look';

export function TreeTags({items,onPick}:{items:{id:number;name:string;virtual?:boolean}[];onPick:(id:number)=>void}){
  const refs=useRef(new Map<number,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{
      const near=[...refs.current.keys()].map(id=>({id,p:screenPoints.get('treefoot-'+id)})).filter(x=>x.p&&x.p.visible&&x.p.y>=60&&(x.p.d??99)<=LOOK.treeTag.near)
        .sort((a,b)=>(a.p!.d??99)-(b.p!.d??99)).slice(0,LOOK.treeTag.most).map(x=>x.id);
      for(const [id,el] of refs.current){const p=screenPoints.get('treefoot-'+id);
        if(!p||!near.includes(id)){el.style.visibility='hidden';continue}el.style.visibility='visible';el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(t=><button key={t.id} type="button" className="vl-tree-tag" data-tree={t.id} data-virtual={!!t.virtual} style={{visibility:'hidden'}} aria-label={t.virtual?`가상 ${t.name} 보기`:`${t.name} 일지 펼치기`}
    ref={el=>{if(el)refs.current.set(t.id,el);else refs.current.delete(t.id)}} onClick={()=>onPick(t.id)}><span>{t.name}</span></button>)}</>;
}
