'use client';
// 시나리오 튜토리얼 (2026-11-23 "5레벨 됐을 때 딱 시나리오만 튜토리얼"): the village walk's way of showing the next thing —
// only the one thing to press is lit (a ring that breathes), everything else is dimmed and can't be pressed, and 보리
// says in one or two sentences what it is. With no target 보리 only talks and nothing is dimmed (a moment to watch).
// Once, then never again (SQ_TUTORIAL_KEY); e2e pages start without it unless the address has ?tutorial.
import {useEffect,useState} from 'react';

export const SQ_TUTORIAL_KEY='rethink-sq-tutorial-v1';
export const sqTutorialOn=()=>{try{return !(window as {__noTutorial?:boolean}).__noTutorial&&!localStorage.getItem(SQ_TUTORIAL_KEY)}catch{return false}};
export const sqTutorialDone=()=>{try{localStorage.setItem(SQ_TUTORIAL_KEY,'1')}catch{/* this visit only */}};

type R={x:number;y:number;w:number;h:number};
export function SpotCoach({sel,text,onSkip}:{sel:string|null;text:string;onSkip:()=>void}){
  const [r,setR]=useState<R|null>(null);
  // follow the target as it moves (papers slide in, the device pops up)
  useEffect(()=>{if(!sel){setR(null);return}let on=true,raf=0;
    const tick=()=>{if(!on)return;const el=document.querySelector(sel) as HTMLElement|null,b=el?.getBoundingClientRect();
      setR(o=>{const n=b&&b.width>0?{x:b.left-6,y:b.top-6,w:b.width+12,h:b.height+12}:null;
        return o&&n&&Math.abs(o.x-n.x)<0.5&&Math.abs(o.y-n.y)<0.5&&Math.abs(o.w-n.w)<0.5&&Math.abs(o.h-n.h)<0.5?o:n});
      raf=requestAnimationFrame(tick)};
    // a lit thing below the fold is brought into view once (the dim would stop the scroll to it)
    const t=setTimeout(()=>{try{(document.querySelector(sel) as HTMLElement|null)?.scrollIntoView({block:'nearest',behavior:'smooth'})}catch{/* old browsers */}},80);
    tick();return()=>{on=false;cancelAnimationFrame(raf);clearTimeout(t)}},[sel]);
  const W=typeof innerWidth==='number'?innerWidth:1000,H=typeof innerHeight==='number'?innerHeight:800;
  // the bubble goes where there is room: under the lit thing, or over it when it sits low
  // when neither side has room (a big lit card) it sits at the bottom, over the card's lower edge
  const BW=Math.min(320,W-24),ROOM=170,under=r?H-(r.y+r.h):0,over=r?r.y:0;
  const bubble={width:BW,left:Math.max(12,Math.min(W-BW-12,(r?r.x+r.w/2:W/2)-BW/2)),
    ...(r&&under>=ROOM?{top:r.y+r.h+14}:r&&over>=ROOM?{top:r.y-14,transform:'translateY(-100%)'}:{bottom:16})};
  return <div className="sc" data-target={sel??''} aria-live="polite">
    {r&&<>
      {/* four blinds round the hole: the dim, and nothing under it can be pressed */}
      <i className="sc-dim" style={{left:0,top:0,width:W,height:Math.max(0,r.y)}}/>
      <i className="sc-dim" style={{left:0,top:r.y+r.h,width:W,height:Math.max(0,H-r.y-r.h)}}/>
      <i className="sc-dim" style={{left:0,top:r.y,width:Math.max(0,r.x),height:r.h}}/>
      <i className="sc-dim" style={{left:r.x+r.w,top:r.y,width:Math.max(0,W-r.x-r.w),height:r.h}}/>
      <i className="sc-ring" style={{left:r.x,top:r.y,width:r.w,height:r.h}}/>
    </>}
    <div className="sc-bubble" role="note" style={bubble}><b>보리</b><p>{text}</p>
      <button type="button" className="sc-skip" onClick={onSkip}>튜토리얼 건너뛰기</button></div>
  </div>;
}
