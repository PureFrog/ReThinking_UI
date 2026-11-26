'use client';
// 별똥별 (피드백 2026-11-26 "밤에 별똥별 떨어졌으면, 소원 빌기도", 예시 사진: 대각선으로 길게 떨어지는 빛줄기, 머리에 십자 빛).
// At night in the village a shooting star falls now and then across the upper screen, over the 3D scene (the camera
// looks down at the ground, so the sky itself is hardly ever in sight). Once a night a short shower of them.
// 피드백 2026-11-26 "간단하게": a tap on one while it falls is the wish, nothing to fill in: I put my hands together,
// 보리 says the wish for me, and a star goes into the jar on the shelf at home (Proto3D onWish, Interior3D StarJar).
// e2e: __proto3d.meteor() drops one now, __proto3d.meteors counts them.
import {useCallback,useEffect,useRef,useState} from 'react';

type Meteor={id:number;x:number;y:number;len:number;dist:number;dur:number;delay:number;size:number};
const SHOWER_KEY='rethink-shower-day';
// how long a wish takes (hands together, 보리's line): no other star is caught meanwhile
export const WISH_MS=3600;

let seq=0;
const one=(delay=0):Meteor=>{const w=typeof innerWidth==='number'?innerWidth:800;
  // starts along the top and the right edge, falls down-left (as in the photo)
  return {id:++seq,x:42+Math.random()*60,y:-3+Math.random()*24,len:90+Math.random()*90,dist:Math.min(560,w*0.55)+Math.random()*120,
    dur:1.5+Math.random()*0.9,delay,size:0.8+Math.random()*0.5}};

export function ShootingStars({active,day,onWish}:{active:boolean;day:string;onWish:()=>void}){
  const [list,setList]=useState<Meteor[]>([]);
  const [caught,setCaught]=useState<number|null>(null);
  const drop=useCallback((n=1)=>{setList(l=>[...l,...Array.from({length:n},(_,i)=>one(i===0?0:i*(0.25+Math.random()*0.6)))])},[]);
  const busyUntil=useRef(0);
  // the falling: now and then (sooner the first time), and once a night a shower
  useEffect(()=>{if(!active)return;let t=0;const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next=(ms:number)=>{t=window.setTimeout(()=>{drop(1);next(18000+Math.random()*27000)},ms)};
    next(4000+Math.random()*4000);
    let shower=0;
    try{if(!calm&&localStorage.getItem(SHOWER_KEY)!==day)shower=window.setTimeout(()=>{try{localStorage.setItem(SHOWER_KEY,day)}catch{/* this visit */}drop(5+Math.floor(Math.random()*3))},12000+Math.random()*10000)}catch{/* no storage: no shower */}
    return()=>{clearTimeout(t);clearTimeout(shower)}},[active,day,drop]);
  // gone when the night or the village is
  useEffect(()=>{if(!active)setList([])},[active]);
  useEffect(()=>{const h=((window as {__proto3d?:{meteor?:()=>void;meteors?:number}}).__proto3d??={});h.meteor=()=>drop(1);h.meteors=list.length},[drop,list.length]);
  // caught: it stops and flashes, then the wish (one at a time)
  const catchIt=(id:number)=>{const now=Date.now();if(now<busyUntil.current)return;busyUntil.current=now+WISH_MS;setCaught(id);onWish();
    window.setTimeout(()=>{setList(l=>l.filter(m=>m.id!==id));setCaught(null)},450)};
  return <div className="rt-meteors" aria-hidden={!list.length}>
    {list.map(m=><div key={m.id} className={`rt-meteor${caught===m.id?' caught':''}`} style={{left:m.x+'%',top:m.y+'%'}}>
      <div className="rt-meteor-fly" style={{'--dist':m.dist+'px','--dur':m.dur+'s','--delay':m.delay+'s','--len':m.len+'px','--size':m.size} as React.CSSProperties}
        onAnimationEnd={e=>{if(e.target===e.currentTarget)setList(l=>l.filter(x=>x.id!==m.id))}}>
        <i className="rt-meteor-trail"/><i className="rt-meteor-head"/>
        <button type="button" className="rt-meteor-hit" aria-label="별똥별: 눌러서 소원 빌기" onClick={()=>catchIt(m.id)}/>
      </div></div>)}
  </div>;
}

// what 보리 wishes for me (one a time, in turn): the garden, the days, the two of us; never a price or a profit
export const WISH_LINES=['네 나무들이 쑥쑥 자라게 해 주세요!','내일도 같이 놀 수 있게 해 주세요.','이번 주는 마음 편한 한 주가 되게 해 주세요.',
  '밭에 꽃이 가득 피게 해 주세요.','우리 마을에 좋은 일만 생기게 해 주세요.','모닥불 앞에서 또 같이 쉬게 해 주세요.','오늘 밤 좋은 꿈 꾸게 해 주세요.'];
// the wishes made, kept on this device (newest last): each is a star in the jar at home
export const WISH_KEY='rethink-wishes-v1';
export function wishesMade():{day:string;text:string}[]{try{return JSON.parse(localStorage.getItem(WISH_KEY)??'[]')}catch{return []}}
export function keepWish(day:string,text:string){try{const l=wishesMade();l.push({day,text});localStorage.setItem(WISH_KEY,JSON.stringify(l.slice(-200)))}catch{/* storage off */}
  dispatchEvent(new CustomEvent('rt-wish-kept'))}
