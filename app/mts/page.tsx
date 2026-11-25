'use client';
// /mts: the practice account's MTS (app/mts/Mts.tsx, 멘토링 2026-11-22); /mts?demo=broker: ReThink inside a made-up broker app
import {useEffect,useState} from 'react';
import Mts,{type MtsMode} from './Mts';
import './mts.css';
export default function MtsPage(){
  const [mode,setMode]=useState<MtsMode|null>(null);
  useEffect(()=>setMode(new URLSearchParams(location.search).get('demo')==='broker'?'broker':'practice'),[]);
  return mode?<Mts mode={mode}/>:<div style={{position:'fixed',inset:0,background:'#f3f5f8'}}/>;
}
