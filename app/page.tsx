'use client';
// ReThink Garden (redesign 2026-11-12): the 3D garden is the main app. The classic 2D garden lives at /classic,
// and /proto3d stays as an alias of this page.
import {useEffect,useState} from 'react';
import Proto3D from './proto3d/Proto3D';
import './proto3d/rethink.css';
export default function Page(){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  return mounted?<Proto3D/>:<div style={{position:'fixed',inset:0,background:'#bfe8f4'}}/>;
}
