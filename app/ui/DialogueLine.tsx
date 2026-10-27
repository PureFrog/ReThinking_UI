'use client';
import {useEffect,useRef,useState} from 'react';
import TypedDialogue from '../TypedDialogue';
import {splitDialogue,isTypingTarget} from '../dialogue-pages';
import {speechDuration} from '../timing';
export default function DialogueLine({text,kind='formal',onReady,onDone,onActivate}:{text:string;kind?:'formal'|'ambient'|'thought';onReady?:(ready:boolean)=>void;onDone?:()=>void;onActivate?:()=>void}){
 const pages=kind==='formal'?splitDialogue(text):[text];const [page,setPage]=useState(0),[complete,setComplete]=useState(false),[held,setHeld]=useState(false);const content=pages[page];const ref=useRef<HTMLDivElement>(null);const callbacks=useRef({onReady,onDone,onActivate});callbacks.current={onReady,onDone,onActivate};
 useEffect(()=>{callbacks.current.onReady?.(complete&&page===pages.length-1)},[complete,page,pages.length]);
 useEffect(()=>{if(kind==='formal'||!complete||held)return;const t=setTimeout(()=>callbacks.current.onDone?.(),speechDuration(content,kind==='thought'));return()=>clearTimeout(t)},[kind,complete,held,content]);
 function advance(){if(!complete){ref.current?.querySelector<HTMLButtonElement>('.typed-dialogue')?.click();return}if(page<pages.length-1){setPage(p=>p+1);setComplete(false)}else if(kind==='ambient')callbacks.current.onActivate?.();else if(kind==='thought')callbacks.current.onDone?.()}
 useEffect(()=>{if(kind!=='formal')return;const f=(e:KeyboardEvent)=>{if(e.isComposing||isTypingTarget(e.target))return;if(e.key===' '||e.key==='Enter'){e.preventDefault();advance()}};window.addEventListener('keydown',f);const g=()=>advance();window.addEventListener('garden:advance',g);return()=>{window.removeEventListener('keydown',f);window.removeEventListener('garden:advance',g)}},[complete,page,kind]);
 return <div ref={ref} className="dialogue-line" onMouseEnter={()=>setHeld(true)} onMouseLeave={()=>setHeld(false)} onPointerDown={()=>setHeld(true)} onPointerUp={()=>setHeld(false)}><TypedDialogue key={page+content} text={content} onComplete={()=>setComplete(true)} onAdvance={advance}/>{kind==='formal'&&<span className="dialogue-next" aria-hidden="true">{complete?'▼':'·'} {pages.length>1?`${page+1}/${pages.length}`:''}</span>}</div>
}
