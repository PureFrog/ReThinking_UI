'use client';
// /mts: the made-up brokerage's MTS demo (app/mts/Mts.tsx, 멘토링 2026-11-22) — ReThink opened from inside a broker app
import {useEffect,useState} from 'react';
import Mts from './Mts';
import './mts.css';
export default function MtsPage(){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  return mounted?<Mts/>:<div style={{position:'fixed',inset:0,background:'#f3f5f8'}}/>;
}
