'use client';
// 밤 조명 (피드백 2026-11-26 "밤에 너무 어두운 공간, 모동숲 느낌 귀요미 램프·가로수; 거장의 집 눈 창문이 안 비친다; 오락실도 너무 어둡다"):
//   VillageLamps  little round-headed lamp posts along the paths (places.ts LAMP_AT): the head glows, a soft halo round it
//                 and a warm pool of light on the grass; all of it fades in as night falls (no lights by day)
//   GlowPool      a lit patch on the ground (additive radial gradient): reads as light without a real light per lamp
//   Halo          a glow sprite round a light
// The few real point lights (the master's eyes, the arcade's front) are fixed in number so shaders never recompile.
import {useMemo} from 'react';
import * as THREE from 'three';
import {OnGround} from './ground';
import {LAMP_AT} from './places';

let _glow:THREE.Texture|null=null;
export function glowTex(){if(_glow)return _glow;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;
  const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.25,'rgba(255,255,255,.55)');r.addColorStop(0.6,'rgba(255,255,255,.15)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,128,128);_glow=new THREE.CanvasTexture(c);return _glow}
export function GlowPool({r=2.2,color='#ffbf6a',k}:{r?:number;color?:string;k:number}){
  if(k<=0.01)return null;
  return <mesh rotation-x={-Math.PI/2} position-y={0.06} renderOrder={2}><planeGeometry args={[r*2,r*2]}/>
    <meshBasicMaterial map={glowTex()} color={color} transparent opacity={0.55*k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>;
}
export function Halo({at,size=1.2,color='#ffcf80',k}:{at:[number,number,number];size?:number;color?:string;k:number}){
  if(k<=0.01)return null;
  return <sprite position={at} scale={[size,size,1]} renderOrder={3}><spriteMaterial map={glowTex()} color={color} transparent opacity={0.8*k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></sprite>;
}
const POST='#3d5a4a',CAP='#2f4a3c';
function Lamp({x,z,night,tint}:{x:number;z:number;night:number;tint:string}){
  const lit=0.25+night*2.4;
  return <OnGround x={x} z={z}><group name="lamp">
    {/* a rounded foot, a slim post with a ring, a lantern head with a mushroom cap and a little knob */}
    <mesh position-y={0.1} castShadow><cylinderGeometry args={[0.16,0.2,0.2,14]}/><meshStandardMaterial color={CAP} roughness={0.7}/></mesh>
    <mesh position-y={0.85} castShadow><cylinderGeometry args={[0.055,0.07,1.5,10]}/><meshStandardMaterial color={POST} roughness={0.6}/></mesh>
    <mesh position-y={1.45}><torusGeometry args={[0.07,0.025,8,16]}/><meshStandardMaterial color={CAP}/></mesh>
    <mesh position-y={1.68}><cylinderGeometry args={[0.15,0.12,0.06,14]}/><meshStandardMaterial color={CAP}/></mesh>
    <mesh position-y={1.84}><sphereGeometry args={[0.16,18,14]}/><meshStandardMaterial color="#fff3cf" emissive={tint} emissiveIntensity={lit} toneMapped={false} roughness={0.3}/></mesh>
    <mesh position-y={2.0} scale={[1,0.55,1]} castShadow><sphereGeometry args={[0.22,18,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={CAP} roughness={0.6}/></mesh>
    <mesh position-y={2.14}><sphereGeometry args={[0.045,10,8]}/><meshStandardMaterial color="#d9b45a" metalness={0.4} roughness={0.4}/></mesh>
    <Halo at={[0,1.84,0]} size={1.4} color={tint} k={night}/>
    <GlowPool r={2.3} color={tint} k={night}/>
  </group></OnGround>;
}
const TINTS=['#ffb85c','#ffc670','#ffa95a'];
export function VillageLamps({night}:{night:number}){
  const list=useMemo(()=>LAMP_AT,[]);
  return <group name="village-lamps">{list.map((l,i)=><Lamp key={i} x={l.x} z={l.z} night={night} tint={TINTS[i%TINTS.length]}/>)}</group>;
}
