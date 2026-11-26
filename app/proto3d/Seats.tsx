'use client';
// 의자에 앉기 (피드백 2026-11-26 "다른 캐릭터가 앉아있지 않는 이상, 의자가 있다면 클릭했을 때 거기에 앉을 수 있어야"):
//   SeatSpot  a seat in a room: where the hips go (x, z), the seat top's height (top), which way one faces sitting, a box
//             to tap (size and centre), taken when someone else sits there (the tutor, Buffett): it cannot be had then
//   RoomMe    me in a room: standing at home; a tap on a free seat walks me over and sits me down (the same sit as the
//             log by the fire, Explorer3D sit); a tap on me, on the same seat or Escape stands me up and back
// The sit pose was made for the log (top 0.38): another seat lifts me by the difference.
import {Suspense,useEffect,useRef,useState} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {Explorer} from './Explorer3D';
import {LOOK} from './look';
import type {Look} from '../core/wardrobe';

export const LOG_TOP=0.38;
export type SeatSpot={id:string;x:number;z:number;top:number;face:number;taken?:boolean;box:[number,number,number];at?:[number,number,number];via?:{x:number;z:number}[]};
const hooks=()=>{const w=window as unknown as {__proto3d?:Record<string,unknown>};return (w.__proto3d??={})};

export function SeatHits({seats,onSit}:{seats:SeatSpot[];onSit:(s:SeatSpot)=>void}){
  return <group name="seats">{seats.map(s=><mesh key={s.id} name={'seat-'+s.id} position={s.at??[s.x,s.top/2+0.1,s.z]} visible={false}
    onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(e.delta>6||s.taken)return;onSit(s)}}
    onPointerOver={e=>{e.stopPropagation();document.body.style.cursor=s.taken?'not-allowed':'pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
    <boxGeometry args={s.box}/></mesh>)}</group>;
}

export function RoomMe({look,home,homeFace,seats,scale,name='room-me',speed=2.2}:{look:Look;home:{x:number;z:number};homeFace:number;seats:SeatSpot[];scale:number;name?:string;speed?:number}){
  const g=useRef<THREE.Group>(null),moving=useRef(false),sitting=useRef(false),p=useRef({x:home.x,z:home.z,y:0}),[seat,setSeat]=useState<SeatSpot|null>(null);
  // the way there (round the counter): the seat's via points, walked in order; back home the same way reversed
  const legs=useRef<{x:number;z:number}[]>([]),last=useRef<SeatSpot|null>(null);
  useEffect(()=>{legs.current=seat?[...(seat.via??[])]:[...(last.current?.via??[])].reverse();last.current=seat},[seat]);
  const go=(s:SeatSpot|null)=>{setSeat(cur=>cur&&s&&cur.id===s.id?null:s)};
  useEffect(()=>{hooks().seat=seat?.id??null;hooks().sit=(id:string|null)=>go(id?seats.find(s=>s.id===id)??null:null);hooks().seats=seats.map(s=>({id:s.id,taken:!!s.taken}))},[seat,seats]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setSeat(null)};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[]);
  useFrame((_,dt)=>{const gr=g.current;if(!gr)return;const t=Math.min(dt,0.05),q=p.current,to=seat??{x:home.x,z:home.z,top:LOG_TOP,face:homeFace};
    // stand up first, then walk; arrive, turn, sit
    if(sitting.current&&(!seat||Math.hypot(to.x-q.x,to.z-q.z)>0.05)){sitting.current=false}
    if(legs.current.length&&Math.hypot(legs.current[0].x-q.x,legs.current[0].z-q.z)<0.05)legs.current.shift();
    const tg=legs.current[0]??to;
    const dx=tg.x-q.x,dz=tg.z-q.z,d=Math.hypot(dx,dz);moving.current=d>0.03||tg!==to;
    if(moving.current){const st=Math.min(d,speed*t);q.x+=dx/d*st;q.z+=dz/d*st;const yaw=Math.atan2(dx,dz);gr.rotation.y+=Math.atan2(Math.sin(yaw-gr.rotation.y),Math.cos(yaw-gr.rotation.y))*Math.min(1,10*t)}
    else{gr.rotation.y+=Math.atan2(Math.sin(to.face-gr.rotation.y),Math.cos(to.face-gr.rotation.y))*Math.min(1,8*t);if(seat)sitting.current=true}
    const lift=sitting.current?seat!.top-LOG_TOP*scale/LOOK.explorer.scale:0;q.y+=(lift-q.y)*Math.min(1,8*t);
    gr.position.set(q.x,q.y,q.z)});
  return <>
    <SeatHits seats={seats} onSit={go}/>
    <group ref={g} position={[home.x,0,home.z]} rotation-y={homeFace} name={name} onClick={e=>{if(!seat)return;e.stopPropagation();setSeat(null)}}>
      <group scale={scale}><Suspense fallback={null}><Explorer look={look} moving={moving} sit={sitting}/></Suspense></group>
    </group>
  </>;
}
