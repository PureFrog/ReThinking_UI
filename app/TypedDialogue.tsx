'use client';
import {TIMING} from './timing';
import {useEffect,useRef,useState} from 'react';

/** A line owns its timer, so following the character never restarts speech. */
export default function TypedDialogue({text,onComplete,onAdvance}:{text:string;onComplete?:()=>void;onAdvance?:()=>void}){
 const letters=Array.from(text);
 const [count,setCount]=useState(0);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const line=useRef<HTMLButtonElement>(null);
 const finished=count>=letters.length;
 useEffect(()=>{
  if(finished)return;
  const previous=letters[count-1]??'';
  const pause=/[.!?…]/.test(previous)?TIMING.typeEnd:/[,，]/.test(previous)?TIMING.typeComma:TIMING.typeChar;
  timer.current=setTimeout(()=>setCount(n=>n+1),count===0?TIMING.typeStart:pause);
  return()=>{if(timer.current)clearTimeout(timer.current)};
 },[count,text,finished]);
 useEffect(()=>{if(line.current)line.current.scrollTop=line.current.scrollHeight},[count]);
 useEffect(()=>{if(finished)onComplete?.()},[finished]);
 const complete=()=>{if(timer.current)clearTimeout(timer.current);setCount(letters.length)};
 return <><button ref={line} type="button" className="typed-dialogue" onClick={()=>finished?onAdvance?.():complete()} aria-label={finished?text:'대사 전체 보기'}><span aria-hidden="true">{letters.slice(0,count).join('')}{!finished&&<span className="typing-cursor">▍</span>}</span></button><span className="typing-hint" aria-hidden="true">{finished?'':'말풍선을 누르면 한 번에 읽어요'}</span><span className="sr-only" role="status" aria-live="polite">{finished?text:''}</span></>;
}
