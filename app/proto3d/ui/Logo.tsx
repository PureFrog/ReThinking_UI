'use client';
// The rethinking logo (tools/blender/logo.py → tools/blender/brand_export.py → public/brand). Static: the end state as
// one image. Animated: RT? pops in centred, the other letters spring out as R, T and ? slide to their places, the sprout
// shoots up on the I, then the ?'s hook unbends into ! through the rendered in-between frames. Keeping still shows the
// end at once. Each layer is cropped to its own box (brand.json, in the 1800×640 render's pixels).
import {useEffect,useMemo,useRef,useState} from 'react';
import {still} from '../still';
import brand from '../../../public/brand/brand.json';
import {TIMING} from '../../core/timing';

type Box=[number,number,number,number];
const B=brand as unknown as {size:[number,number];morph:string[];union:Box;layers:Record<string,Box>};
const SRC=(k:string)=>`/brand/l-${k}.webp`;
const LETTERS=[...'0123456789'];
// the frame that holds every layer (the ? sticks out past the final word a little)
const ALL:Box=Object.values(B.layers).reduce<Box>((u,b)=>[Math.min(u[0],b[0]),Math.min(u[1],b[1]),Math.max(u[2],b[2]),Math.max(u[3],b[3])],[1e9,1e9,-1e9,-1e9]);
const FW=ALL[2]-ALL[0],FH=ALL[3]-ALL[1];
const place=(b:Box)=>({left:`${(b[0]-ALL[0])/FW*100}%`,top:`${(b[1]-ALL[1])/FH*100}%`,width:`${(b[2]-b[0])/FW*100}%`,height:`${(b[3]-b[1])/FH*100}%`});

export function Logo({animate=false,height,className,onDone}:{animate?:boolean;height:number|string;className?:string;onDone?:()=>void}){
  if(!animate)return <img className={`rt-logo ${className??''}`} src="/brand/logo.webp" alt="rethinking!" style={{height,width:'auto'}} draggable={false}/>;
  return <AnimatedLogo height={height} className={className} onDone={onDone}/>;
}

type Phase='start'|'rt'|'word'|'sprout'|'morph'|'done';
function AnimatedLogo({height,className,onDone}:{height:number|string;className?:string;onDone?:()=>void}){
  const [phase,setPhase]=useState<Phase>(()=>still()?'done':'start');
  const [frame,setFrame]=useState(-1);
  const done=useRef(onDone);done.current=onDone;
  useEffect(()=>{if(phase==='done'){done.current?.();return}
    const t={rt:TIMING.logoRt,sprout:TIMING.logoSprout,morph:TIMING.logoMorph,frame:TIMING.logoFrame},timers:number[]=[];
    timers.push(window.setTimeout(()=>setPhase('rt'),40));
    timers.push(window.setTimeout(()=>setPhase('word'),t.rt));
    timers.push(window.setTimeout(()=>setPhase('sprout'),t.sprout));
    timers.push(window.setTimeout(()=>{setPhase('morph');B.morph.forEach((_,i)=>timers.push(window.setTimeout(()=>setFrame(i),i*t.frame)));
      timers.push(window.setTimeout(()=>{setFrame(-1);setPhase('done')},B.morph.length*t.frame))},t.morph));
    return()=>timers.forEach(clearTimeout)},[]);// eslint-disable-line react-hooks/exhaustive-deps
  // RT? sits in the middle first: R, T and ? shifted left (T up against R, ? after T), all moved to the centre
  const shift=useMemo(()=>{const r=B.layers['0'],t=B.layers['2'],q=B.layers['q'];
    const tTo=r[2]-40,qTo=tTo+(t[2]-t[0])-30,groupMid=(r[0]+qTo+(q[2]-q[0]))/2,off=(ALL[0]+FW/2)-groupMid;
    const pct=(dx:number,w:number)=>`translateX(${dx/w*100}%)`;
    return {'0':pct(off,r[2]-r[0]),'2':pct(tTo-t[0]+off,t[2]-t[0]),'q':pct(qTo-q[0]+off,q[2]-q[0])} as Record<string,string>},[]);
  const early=phase==='start'||phase==='rt';
  const style=(k:string):React.CSSProperties=>{
    const s:React.CSSProperties={...place(B.layers[k])};
    const shown=k==='0'||k==='2'?phase!=='start':k==='q'?phase!=='start'&&phase!=='morph'&&phase!=='done':
      k==='sprout'?['sprout','morph','done'].includes(phase):k==='bang'?phase==='done':B.morph.includes(k)?phase==='morph'&&B.morph[frame]===k:phase!=='start'&&!early;
    s.opacity=shown?1:0;
    if(k in shift&&early)s.transform=shift[k]+(phase==='start'?' scale(.3)':'');
    else if(!shown&&(LETTERS.includes(k)||k==='sprout'))s.transform='scale(.2) translateY(30%)';
    if(B.morph.includes(k)||k==='bang')s.transition='none';
    if(LETTERS.includes(k))s.transitionDelay=phase==='word'?`${LETTERS.indexOf(k)*50}ms`:'0ms';
    return s};
  const keys=[...LETTERS,'sprout','q','bang',...B.morph];
  return <span className={`rt-logo-anim ${className??''}`} role="img" aria-label="rethinking!" data-phase={phase} style={{height,aspectRatio:`${FW}/${FH}`}}>
    {keys.map(k=><img key={k} src={SRC(k)} alt="" draggable={false} style={style(k)}/>)}
  </span>;
}
