'use client';
// W1 (docs/brief-wow.md): my account becoming the garden. Each holding's card (name and return) flies from where the
// list was to its plot, shrinks to a name tag as the tree comes up, and the tags go once the analysts walk in.
// The trees, the dust and the camera are in Scene3D (World.birth); the timing is core/birth.ts. A tap anywhere skips.
import {useEffect,useRef} from 'react';
import {treeAt,stageAt,growScale,type BirthPlan} from '../../core/birth';
import type {Holding} from '../../core/model';
import {screenPoints} from '../screen';
import {Num} from './Sheet';
import {LOOK} from '../look';

const ease=(k:number)=>k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
export function BirthCards({birth,holdings,onSkip}:{birth:{ids:number[];t0:number;plan:BirthPlan};holdings:Holding[];onSkip:()=>void}){
  const refs=useRef(new Map<number,HTMLDivElement>());
  useEffect(()=>{let raf=0;const {plan,t0,ids}=birth;
    const tick=()=>{const ms=performance.now()-t0,st=stageAt(plan,ms),W=innerWidth,H=innerHeight;
      // the cards leave from where the holdings list was (the sheet at the bottom, or the right panel on a wide screen)
      const from=W>H*1.2?{x:W*0.78,y:H*0.5}:{x:W*0.5,y:H*0.74};
      ids.forEach((id,i)=>{const el=refs.current.get(id);if(!el)return;const b=treeAt(plan,i,ms),plot=screenPoints.get('plot-'+id),top=screenPoints.get('tree-'+id);
        if(b.phase==='wait'||!plot){el.style.opacity='0';return}
        let x=plot.x,y=plot.y,s=LOOK.birth.tagScale,o=1;
        if(b.phase==='card'){const e=ease(b.k);x=from.x+(plot.x-from.x)*e;y=from.y+(plot.y-from.y)*e-Math.sin(Math.PI*b.k)*70;s=1-(1-LOOK.birth.tagScale)*e}
        else if(top){const g=Math.min(1,growScale(b.phase,b.k));x=plot.x+(top.x-plot.x)*g;y=plot.y+(top.y-56-plot.y)*g}
        // tags fade as the camera starts its look round
        if(st!=='trees')o=Math.max(0,1-(ms-plan.orbitAt)/500);
        el.style.opacity=String(o);el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) scale(${s})`});
      if(st!=='done')raf=requestAnimationFrame(tick)};
    tick();return()=>cancelAnimationFrame(raf)},[birth]);
  return <>
    {/* a tap anywhere skips the rest */}
    <button type="button" className="rt-skip-layer" aria-label="건너뛰기" onClick={onSkip}><span>탭하면 건너뛰기</span></button>
    {birth.plan.long&&birth.ids.map(id=>{const h=holdings.find(x=>x.id===id);if(!h)return null;
      return <div key={id} className="rt-birth-card" data-holding={id} aria-hidden ref={el=>{if(el)refs.current.set(id,el);else refs.current.delete(id)}} style={{opacity:0}}>
        <strong>{h.name}</strong><b className={`rt-num ${h.rate<0?'rt-down':h.rate>0?'rt-up':''}`}><Num v={h.rate}/></b></div>})}
  </>;
}
