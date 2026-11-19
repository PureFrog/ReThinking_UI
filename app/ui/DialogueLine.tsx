'use client';
import {useEffect,useRef,useState} from 'react';
import TypedDialogue from './TypedDialogue';
import {splitDialogue,isTypingTarget} from '../core/dialogue-pages';
import {PauseClock} from '../scene/pause-clock';
import {TIMING,speechDuration} from '../core/timing';
// `pages` gives the balloons as written (a stage scene); each is still split when it runs long
export default function DialogueLine({text,pages:given,kind='formal',autoAdvance=false,voice,onReady,onDone,onActivate}:{text:string;voice?:string;pages?:string[];kind?:'formal'|'ambient'|'thought';autoAdvance?:boolean;onReady?:(ready:boolean)=>void;onDone?:()=>void;onActivate?:()=>void}){
 const pages=kind!=='formal'?[text]:given?.length?given.flatMap(p=>splitDialogue(p)):splitDialogue(text);const [page,setPage]=useState(0),[complete,setComplete]=useState(false),[held,setHeld]=useState(false);const content=pages[page];const ref=useRef<HTMLDivElement>(null);const callbacks=useRef({onReady,onDone,onActivate});callbacks.current={onReady,onDone,onActivate};
 const last=page===pages.length-1;
 useEffect(()=>{callbacks.current.onReady?.(complete&&last)},[complete,last]);
 const clock=useRef<PauseClock|null>(null);const wasHeld=useRef(false);
 // Ambient and thought balloons close on their own; the clock starts once typing ends (11.3).
 useEffect(()=>{if(kind==='formal'||!complete)return;if(!clock.current)clock.current=new PauseClock(speechDuration(content,kind==='thought'));const c=clock.current,now=Date.now();if(held){c.pause(now);wasHeld.current=true;return}if(wasHeld.current){c.release(now,TIMING.speechRelease);wasHeld.current=false}else c.start(now);const t=setTimeout(()=>callbacks.current.onDone?.(),c.left(now));return()=>clearTimeout(t)},[kind,complete,held,content]);
 // Optional auto-advance for formal talk uses the ambient formula and stops before choices (11.4-7).
 useEffect(()=>{if(kind!=='formal'||!autoAdvance||!complete||last||held)return;const t=setTimeout(()=>{setPage(p=>p+1);setComplete(false)},speechDuration(content));return()=>clearTimeout(t)},[kind,autoAdvance,complete,last,held,content]);
 function advance(){if(!complete){ref.current?.querySelector<HTMLButtonElement>('.typed-dialogue')?.click();return}if(!last){setPage(p=>p+1);setComplete(false)}else if(kind==='ambient')callbacks.current.onActivate?.();else if(kind==='thought')callbacks.current.onDone?.()}
 useEffect(()=>{if(kind!=='formal')return;const f=(e:KeyboardEvent)=>{if(e.isComposing||isTypingTarget(e.target))return;if(e.key===' '||e.key==='Enter'){e.preventDefault();advance()}};window.addEventListener('keydown',f);const g=()=>advance();window.addEventListener('garden:advance',g);return()=>{window.removeEventListener('keydown',f);window.removeEventListener('garden:advance',g)}},[complete,page,kind]);
 // A thought closes on the first press, even mid-typing.
 return <div ref={ref} className="dialogue-line" onClickCapture={kind==='thought'?e=>{e.stopPropagation();callbacks.current.onDone?.()}:undefined} onMouseEnter={()=>setHeld(true)} onMouseLeave={()=>setHeld(false)} onPointerDown={()=>setHeld(true)} onPointerUp={()=>setHeld(false)} onPointerCancel={()=>setHeld(false)}><TypedDialogue key={page+content} text={content} voice={voice} onComplete={()=>setComplete(true)} onAdvance={advance}/>{kind==='formal'&&<>{pages.length>1&&<span className="dialogue-page" aria-hidden="true">{page+1}/{pages.length}</span>}{complete&&!last&&<span className="dialogue-next" aria-hidden="true">▼</span>}</>}</div>
}
