'use client';
// 피드백 2026-11-26 "건물 들어가면 방 보이는 UI가 제각각" + "양옆 정도는 보고 방 안을 돌아다닐 수 있게 (모든 건물)":
// every room (집, 가게들, 거장의 집, 오락실) is seen the same way. The camera is behind me, a little up, and follows me
// (look.ts LOOK.room). Dragging sideways turns the view left and right (±LOOK.room.yawMax); it stays where it is put.
// A drag never counts as a tap, so turning the view does not also walk me or open a shelf.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {LOOK} from './look';

export type Spot={x:number;z:number};
const R=()=>LOOK.room;
const hooks=()=>{const w=window as unknown as {__proto3d?:Record<string,unknown>};return (w.__proto3d??={}) as Record<string,unknown>};

// me: where I stand (read every frame). halfW: the room's half width, so the camera stays inside the side walls.
// center: the room's middle across (the camera leans toward it by LOOK.room.pull).
export function RoomFollow({me,halfW,center=0,off=false}:{me:{current:Spot};halfW:number;center?:number;off?:boolean}){
  const {camera,size,gl}=useThree(),yaw=useRef(0),want=useRef(0),look=useRef(new THREE.Vector3()),first=useRef(true);
  const v=useMemo(()=>({p:new THREE.Vector3(),l:new THREE.Vector3()}),[]);
  useEffect(()=>{const el=(gl.domElement.parentElement??gl.domElement) as HTMLElement;let x0=0,y0=0,down=false,base=0,dragged=false;
    const dn=(e:PointerEvent)=>{down=true;dragged=false;x0=e.clientX;y0=e.clientY;base=want.current};
    const mv=(e:PointerEvent)=>{if(!down)return;const dx=e.clientX-x0,dy=e.clientY-y0;
      if(!dragged&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy))dragged=true;
      if(dragged)want.current=Math.max(-R().yawMax,Math.min(R().yawMax,base+dx*R().drag))};
    const up=()=>{down=false};
    // the tap that ends a drag is eaten before the 3D scene sees it
    const clk=(e:MouseEvent)=>{if(dragged){e.stopPropagation();e.preventDefault();dragged=false}};
    el.addEventListener('pointerdown',dn);addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);el.addEventListener('click',clk,true);
    return()=>{el.removeEventListener('pointerdown',dn);removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);el.removeEventListener('click',clk,true)}},[gl]);
  useEffect(()=>{const h=hooks();h.roomView={yaw:()=>yaw.current,turn:(a:number)=>{want.current=Math.max(-R().yawMax,Math.min(R().yawMax,a))}};return()=>{delete h.roomView}},[]);
  useFrame((_,dt)=>{if(off)return;const c=camera as THREE.PerspectiveCamera,t=Math.min(dt,0.05),tall=size.width<size.height,q=me.current,r=R();
    yaw.current+=(want.current-yaw.current)*Math.min(1,8*t);
    const back=tall?r.backTall:r.back,s=Math.sin(yaw.current),co=Math.cos(yaw.current),bx=q.x+(center-q.x)*r.pull,lim=Math.max(0,halfW-r.wallPad);
    v.p.set(Math.max(center-lim,Math.min(center+lim,bx+s*back)),tall?r.upTall:r.up,q.z+co*back);
    v.l.set(q.x*0.85+center*0.15-s*r.ahead,tall?r.lookTall:r.look,q.z-co*r.ahead);
    const k=first.current?1:Math.min(1,r.follow*t);first.current=false;
    c.position.lerp(v.p,k);look.current.lerp(v.l,k);c.lookAt(look.current);
    const fov=tall?r.fovTall:r.fov;if(c.fov!==fov||c.view?.enabled){c.clearViewOffset();c.fov=fov;c.updateProjectionMatrix()}});
  return null;
}
