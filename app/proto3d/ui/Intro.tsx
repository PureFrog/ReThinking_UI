'use client';
// The first entry (feedback 11-17 "가입하고 입장하자마자 소개 받으면서 들어가야지 · 포트폴리오 업로드 유도"): before
// the empty garden asks for holdings, the four introduce themselves in the same dialogue box as 보리's talks
// (ui/Friend.tsx, rethink.css .rt-talk), one line each with their one job (docs/quest-journal.md 3장), and 보리 ends on
// the capture. Lines in content/intro.ts. A tap shows the rest of a line, then the next; 건너뛰기 goes straight on.
import {useEffect,useRef,useState} from 'react';
import {INTRO,INTRO_NAME,type IntroWho} from '../../content/intro';
import {TIMING} from '../../core/timing';

export function Intro({onCapture,onOther}:{onCapture:()=>void;onOther:()=>void}){
  const [i,setI]=useState(0),[shown,setShown]=useState(0);
  const cur=INTRO[i],last=i===INTRO.length-1,done=shown>=cur.text.length;
  const t0=useRef(0);
  useEffect(()=>{setShown(0);t0.current=performance.now()},[i]);
  // typed by time, like 보리's lines: a busy phone skips letters instead of typing slower
  useEffect(()=>{if(done)return;const t=setInterval(()=>setShown(n=>Math.max(n,Math.min(cur.text.length,Math.floor((performance.now()-t0.current)/TIMING.typeChar)))),TIMING.typeChar);
    return()=>clearInterval(t)},[i,done,cur.text.length]);
  const tap=()=>{if(!done){setShown(cur.text.length);return}if(!last)setI(n=>n+1)};
  return <div className="rt-talk rt-intro" role="dialog" aria-label="처음 소개">
    <button type="button" className="rt-talk-leave" onClick={onOther}>건너뛰기</button>
    <div className="rt-intro-faces" aria-hidden>{(['bori','tori','moa','luon'] as IntroWho[]).map(w=>
      <span key={w} className={'rt-intro-face f-'+w+(w===cur.who?' on':'')}/>)}</div>
    {last&&done&&<div className="rt-talk-choices" role="group" aria-label="대답">
      <button type="button" className="rt-talk-choice first" onClick={onCapture}>캡처 올리기</button>
      <button type="button" className="rt-talk-choice" onClick={onOther}>다른 방법으로</button>
    </div>}
    <div className="rt-talk-box" onClick={tap}>
      <span className={'rt-talk-name n-'+cur.who}>{INTRO_NAME[cur.who]}</span>
      <p className="rt-talk-line" aria-live="polite">{cur.text.slice(0,shown)}<span className="rt-sr">{cur.text.slice(shown)}</span></p>
      {done&&!last&&<i className="rt-talk-more" aria-hidden/>}
      <span className="rt-intro-step" aria-label={`${i+1} / ${INTRO.length}`}>{i+1} / {INTRO.length}</span>
    </div>
  </div>;
}
