'use client';
// The first run's coach (content/game-lines.ts COACH): a paper slip from one analyst pointing at the thing it explains,
// the thing itself outlined. While it is up the days and the moment's clock wait. "건너뛰기" ends the whole coach.
import {useLayoutEffect,useState} from 'react';
import type {CoachStep} from '../../content/game-lines';
import {FACE} from './Moment';
const NAME={tori:'토리',moa:'모아',luon:'루온'} as const;
export function Coach({steps,onDone,onSkip}:{steps:CoachStep[];onDone:()=>void;onSkip:()=>void}){
  const [i,setI]=useState(0),[pos,setPos]=useState<{top:number;below:boolean;arrow:number}|null>(null);
  const s=steps[i];
  useLayoutEffect(()=>{
    const root=document.querySelector('.gx'),el=root?.querySelector(s.target) as HTMLElement|null;
    if(!root||!el){setPos({top:80,below:true,arrow:50});return}
    el.classList.add('gx-focus');
    const r=el.getBoundingClientRect(),R=root.getBoundingClientRect(),mid=r.top+r.height/2-R.top;
    const below=mid<R.height/2;
    setPos({top:below?r.bottom-R.top+12:r.top-R.top-12,below,arrow:Math.max(12,Math.min(88,(r.left+r.width/2-R.left)/R.width*100))});
    return()=>el.classList.remove('gx-focus');
  },[s.target,i]);
  const last=i===steps.length-1;
  return <div className="gx-coach" role="dialog" aria-label="처음 안내" data-testid="gx-coach">
    {pos&&<div className="gx-coach-slip gx-in" data-below={pos.below} style={{top:pos.top,['--arrow' as string]:`${pos.arrow}%`,transform:pos.below?undefined:'translateY(-100%)'}}>
      <div className="gx-said"><span className="gx-face" style={{backgroundImage:`url(${FACE(s.who)})`}}/><div><b>{NAME[s.who]}</b>{s.text}</div></div>
      <div className="gx-coach-foot"><button type="button" onClick={onSkip}>건너뛰기</button><span className="gx-mono gx-note">{i+1}/{steps.length}</span>
        <button type="button" className="gx-btn" onClick={()=>last?onDone():setI(i+1)}>{last?'알겠어':'다음'}</button></div>
    </div>}
  </div>;
}
