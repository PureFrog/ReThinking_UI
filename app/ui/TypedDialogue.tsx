'use client';
import {TIMING} from '../core/timing';
import {voice as speak} from '../core/sound';
import {typeScale} from '../core/reading';
import {useEffect,useRef,useState} from 'react';

/** A line owns its timer, so following the character never restarts speech. */
// voice: a friend's id; each letter then gets that friend's syllable (7장). Thoughts and notes stay silent.
export default function TypedDialogue({text,voice,onComplete,onAdvance}:{text:string;voice?:string;onComplete?:()=>void;onAdvance?:()=>void}){
 const letters=Array.from(text);
 // 8장 the typing speed setting: 'at once' starts with the whole line
 const [count,setCount]=useState(()=>typeScale()?0:letters.length);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const line=useRef<HTMLButtonElement>(null);
 const finished=count>=letters.length;
 useEffect(()=>{
  if(finished)return;
  const previous=letters[count-1]??'';
  const pause=/[.!?…]/.test(previous)?TIMING.typeEnd:/[,，]/.test(previous)?TIMING.typeComma:TIMING.typeChar;
  timer.current=setTimeout(()=>setCount(n=>n+1),(count===0?TIMING.typeStart:pause)*typeScale());
  return()=>{if(timer.current)clearTimeout(timer.current)};
 },[count,text,finished]);
 useEffect(()=>{if(line.current)line.current.scrollTop=line.current.scrollHeight;if(voice&&count&&!finished)speak(voice,letters[count-1])},[count]);
 useEffect(()=>{if(finished)onComplete?.()},[finished]);
 const complete=()=>{if(timer.current)clearTimeout(timer.current);setCount(letters.length)};
 return <><button ref={line} type="button" className="typed-dialogue" onClick={()=>finished?onAdvance?.():complete()} aria-label={finished?text:'대사 전체 보기'}><span aria-hidden="true">{letters.slice(0,count).join('')}{!finished&&<span className="typing-cursor">▍</span>}</span></button><span className="sr-only" role="status" aria-live="polite">{finished?text:''}</span></>;
}
