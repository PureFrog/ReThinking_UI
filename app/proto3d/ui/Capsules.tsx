'use client';
// W3 the capsule markers' tags (core/capsule.ts): "판정 도착" on a capsule whose grade has arrived (tap to dig it up),
// D-n on one still waiting. Plain DOM pinned each frame to the point above the marker (screen.ts), like the bubbles.
// Also the memo folding into its capsule when a judgment is recorded, and the look-back's "30일 뒤" in between.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
import {CHOICE_LABEL,type Judgment} from '../../core/judgment';

// items: one marker per tree, an old judgment's (core/capsule.ts) or a 지기 hypothesis's (core/jigi/capsules.ts), with its label
export function CapsuleTags({items,names,onPick}:{items:{holdingId:number;due:boolean;label:string}[];names:Record<number,string>;onPick:(holdingId:number)=>void}){
  const refs=useRef(new Map<number,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [id,el] of refs.current){const p=screenPoints.get('capsule-'+id);
      if(!p||!p.visible||p.y<70){el.style.visibility='hidden';continue}el.style.visibility='visible';el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(c=><button key={c.holdingId} type="button" className="rt-cap-tag" data-due={c.due} style={{visibility:'hidden'}}
    aria-label={`${names[c.holdingId]??''} · ${c.label}`}
    ref={el=>{if(el)refs.current.set(c.holdingId,el);else refs.current.delete(c.holdingId)}} onClick={()=>onPick(c.holdingId)}>
    {c.label}</button>)}</>;
}

// the memo card folding up into its capsule (Briefing, once the judgment is recorded)
export function Pack({j}:{j:Judgment}){
  return <div className="rt-pack" aria-label="저장한 메모">
    <div className="rt-pack-memo"><b>{CHOICE_LABEL[j.choice]} · 확신 {j.confidence}</b><span>{j.reason}</span></div>
    <div className="rt-pack-capsule" aria-hidden><i/></div>
  </div>;
}
