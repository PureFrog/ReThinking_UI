'use client';
// R2 market weather in the world: clouds overhead, rain streaks, lightning flashes, heat motes. The sky gradient and the
// light values are set by Proto3D/Scene3D from LOOK.weather; this file draws the moving parts.
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Sparkles} from '@react-three/drei';
import * as THREE from 'three';
import type {Weather} from '../core/weather';
import {LOOK} from './look';
import {soft} from './materials';

function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Puffy clouds: a few soft spheres per cloud, drifting slowly across and wrapping around.
function Clouds({count,color,wind}:{count:number;color:string;wind:number}){
  const refs=useRef<(THREE.Group|null)[]>([]);
  const clouds=useMemo(()=>{const r=rng(11);return Array.from({length:count},()=>({x:(r()-0.5)*44,z:-30+r()*12,y:5+r()*5,s:1.4+r()*1.6,
    puffs:Array.from({length:4+Math.floor(r()*3)},(_,i)=>({x:(i-2)*0.9+r()*0.4,y:r()*0.6,z:(r()-0.5)*0.8,r:0.8+r()*0.7}))}))},[count]);
  useFrame((_,dt)=>{clouds.forEach((c,i)=>{const g=refs.current[i];if(!g)return;c.x+=dt*(0.25+wind*12);if(c.x>24)c.x=-24;g.position.set(c.x,c.y,c.z)})});
  const mat=soft(color);
  return <>{clouds.map((c,i)=>(
    <group key={i} ref={el=>{refs.current[i]=el}} position={[c.x,c.y,c.z]} scale={[c.s*1.3,c.s*0.7,c.s]}>
      {c.puffs.map((p,j)=><mesh key={j} position={[p.x,p.y,p.z]} scale={p.r}><sphereGeometry args={[1,16,12]}/><primitive object={mat} attach="material"/></mesh>)}
    </group>))}</>;
}

// Rain: thin streaks falling in a box around the player, slanted by the wind.
function Rain({count,wind,center}:{count:number;wind:number;center:React.MutableRefObject<THREE.Vector3>}){
  const ref=useRef<THREE.InstancedMesh>(null);
  const drops=useMemo(()=>{const r=rng(3);return Array.from({length:count},()=>({x:(r()-0.5)*28,y:r()*9,z:-6+r()*18,v:13+r()*6}))},[count]);
  const o=useMemo(()=>new THREE.Object3D(),[]);
  useFrame((_,dt)=>{const m=ref.current;if(!m)return;const d=Math.min(dt,0.05),c=center.current,slant=wind*6;
    drops.forEach((p,i)=>{p.y-=p.v*d;p.x+=p.v*d*slant*0.15;if(p.y<-1){p.y=8+Math.random()*1.5;p.x=(Math.random()-0.5)*28}
      o.position.set(c.x+p.x,p.y,c.z+p.z);o.rotation.set(0,0,-slant*0.15);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true});
  return <instancedMesh ref={ref} args={[undefined,undefined,count]} frustumCulled={false}>
    <boxGeometry args={[LOOK.rainDrop.width,LOOK.rainDrop.length,LOOK.rainDrop.width]}/><meshBasicMaterial color={LOOK.rainDrop.color} transparent opacity={LOOK.rainDrop.opacity} depthWrite={false}/>
  </instancedMesh>;
}

// Lightning: every few seconds the hemisphere light jumps for a blink (a double flash, like the real thing).
function Lightning({light}:{light:React.RefObject<THREE.HemisphereLight|null>}){
  const next=useRef(3),base=useRef<number|null>(null);
  useFrame(({clock})=>{const l=light.current;if(!l)return;if(base.current===null)base.current=l.intensity;const t=clock.elapsedTime;
    if(t>next.current+0.35){next.current=t+5+Math.random()*7}
    const k=t-next.current,on=(k>0&&k<0.07)||(k>0.16&&k<0.22);l.intensity=base.current*(on?3.2:1)});
  useLayoutEffect(()=>()=>{const l=light.current;if(l&&base.current!==null)l.intensity=base.current},[light]);
  return null;
}

export function WeatherFx({weather,center,hemi}:{weather:Weather;center:React.MutableRefObject<THREE.Vector3>;hemi:React.RefObject<THREE.HemisphereLight|null>}){
  const w=LOOK.weather[weather];
  return <>
    {w.clouds.count>0&&<Clouds key={weather} count={w.clouds.count} color={w.clouds.color} wind={w.wind}/>}
    {w.rain>0&&<Rain count={w.rain} wind={w.wind} center={center}/>}
    {w.flash&&<Lightning light={hemi}/>}
    {w.motes&&<Sparkles count={weather==='heat'?110:70} scale={[26,5,26]} position-y={2} size={weather==='heat'?4:3} speed={weather==='heat'?0.5:0.25} opacity={0.8} color={w.motes}/>}
  </>;
}
