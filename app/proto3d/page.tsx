'use client';
// The 3D look prototype (/proto3d, user request 2026-11-11): primitives and post-processing only, to see whether
// React Three Fiber can reach the soft, glowing garden look before any Blender work. The main garden (Phaser) is untouched.
import {useEffect,useState} from 'react';
import Proto3D from './Proto3D';
import './rethink.css';
import './me.css';
import './welcome.css';
import './glass.css';
import './jigi.css';
import './build.css';
import './house.css';
export default function Proto3DPage(){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  return mounted?<Proto3D/>:<div style={{position:'fixed',inset:0,background:'#bfe8f4'}}/>;
}
