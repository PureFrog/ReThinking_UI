'use client';
// R4–R6 landmarks and small things in the world, all primitives on the shared soft material (a Blender .glb can
// replace any of them later through models.ts):
//   Observatory  the mock-trading round's door (R5, app/content/game.ts)
//   Signpost     the track record at the garden's entrance (R4)
//   Cart         the peddler's cart, sells garden items for the currency (R6)
//   Pot          a cooldown seed beside a tree: a sprout while it waits, a flower once waited out (R4)
//   Decor        items placed on the garden's slots (R6, app/content/garden-items.ts)
import {useMemo,useRef} from 'react';
import {signTexture} from './Build3D';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import type {Shape} from '../content/garden-items';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const click=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};

export function Observatory({onPick,lit}:{onPick:()=>void;lit:boolean}){
  const dome=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(dome.current)dome.current.rotation.y=Math.sin(clock.elapsedTime*0.15)*0.6});
  return <group onClick={click(onPick)} name="observatory">
    <mesh position-y={0.9} castShadow receiveShadow><cylinderGeometry args={[1.5,1.7,1.8,40]}/>{S('#ece6da')}</mesh>
    <mesh position-y={1.85} castShadow><cylinderGeometry args={[1.62,1.62,0.14,40]}/>{S('#5b6f8c')}</mesh>
    <group ref={dome} position-y={1.9}>
      <mesh castShadow><sphereGeometry args={[1.5,40,20,0,Math.PI*2,0,Math.PI/2]}/>{S('#46597a')}</mesh>
      {/* the slit and the telescope poking out of it */}
      <mesh position={[0,0.9,0.95]} rotation-x={-0.55}><boxGeometry args={[0.42,0.05,1.3]}/>{S('#23324a')}</mesh>
      <mesh position={[0,1.05,1.05]} rotation-x={-0.95} castShadow><cylinderGeometry args={[0.16,0.2,1.4,16]}/>{S('#c99a3e')}</mesh>
    </group>
    {/* door with a warm light: the round is open */}
    <mesh position={[0,0.62,1.58]}><boxGeometry args={[0.7,1.2,0.1]}/>{S('#3c4b62')}</mesh>
    <mesh position={[0,0.62,1.64]}><planeGeometry args={[0.5,1]}/><meshStandardMaterial color="#ffcf7a" emissive="#ffb347" emissiveIntensity={lit?1.4:0.25} toneMapped={false}/></mesh>
    {[[-0.9,1.15],[0.9,1.15]].map(([x,y],i)=><mesh key={i} position={[x,y,1.42]} rotation-y={x*0.5}><circleGeometry args={[0.18,20]}/><meshStandardMaterial color="#ffd89a" emissive="#ffb347" emissiveIntensity={1} toneMapped={false}/></mesh>)}
  </group>;
}

export function Signpost({onPick,hitRate}:{onPick:()=>void;hitRate:number|null}){
  // the board's stripe fills with the hit rate: an at-a-glance read of the track record
  const k=hitRate===null?0:hitRate/100;
  const tex=useMemo(()=>typeof document!=='undefined'?signTexture('마을 지도','#f2ede2'):null,[]);
  return <group onClick={click(onPick)} name="signpost">
    {/* a wider, invisible tap area: from an upright phone the camera looks down on the thin post */}
    <mesh position-y={1} name="signpost-hit"><cylinderGeometry args={[0.9,0.9,2,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <mesh position-y={0.8} castShadow><cylinderGeometry args={[0.08,0.1,1.6,10]}/>{S('#7a6250')}</mesh>
    <mesh position={[0,1.45,0.06]} castShadow><boxGeometry args={[1.3,0.6,0.08]}/>{S('#f2ede2')}</mesh>
    <mesh position={[-0.55+0.55*k,1.3,0.105]} scale={[Math.max(0.001,k),1,1]}><boxGeometry args={[1.1,0.08,0.01]}/>{S('#1e6b4a')}</mesh>
    <mesh position={[0,1.3,0.1]}><boxGeometry args={[1.1,0.08,0.005]}/>{S('#d8d2c4')}</mesh>
    {/* the board's words (2026-11-23: the grey stripes read as a blank, broken sign) */}
    {tex&&<mesh position={[0,1.56,0.102]}><planeGeometry args={[0.96,0.375]}/><meshBasicMaterial map={tex} toneMapped={false}/></mesh>}
  </group>;
}

export function Cart({onPick,flag}:{onPick:()=>void;flag:string}){
  const cloth=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{if(cloth.current)cloth.current.rotation.y=Math.sin(clock.elapsedTime*2)*0.15});
  return <group onClick={click(onPick)} name="cart">
    <mesh position-y={0.75} castShadow receiveShadow><boxGeometry args={[1.5,0.5,0.9]}/>{S('#b08a63')}</mesh>
    {[-0.55,0.55].map(x=><mesh key={x} position={[x,0.35,0.5]} rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.33,0.33,0.08,20]}/>{S('#6f5846')}</mesh>)}
    {/* striped awning on two poles */}
    {[-0.65,0.65].map(x=><mesh key={'p'+x} position={[x,1.35,-0.35]}><cylinderGeometry args={[0.04,0.04,1.3,8]}/>{S('#6f5846')}</mesh>)}
    {[0,1,2,3,4].map(i=><mesh key={'a'+i} position={[-0.6+i*0.3,1.98,-0.05]} rotation-x={0.35} castShadow><boxGeometry args={[0.3,0.04,0.9]}/>{S(i%2?'#f4efe4':'#2f5d50')}</mesh>)}
    {/* the 꽃집 (feedback 11-17): pots of flowers on the cart instead of boxes */}
    {[[-0.45,'#e2566b'],[0,'#f2c84b'],[0.45,'#8a7be0']].map(([x,c],i)=><group key={'g'+i} position={[x as number,1,0]}>
      <mesh position-y={0.11} castShadow><cylinderGeometry args={[0.15,0.11,0.22,14]}/>{S('#c27a55')}</mesh>
      {[[-0.07,0.05],[0.07,0.03],[0,-0.07],[0.02,0.08]].map(([dx,dz],k)=><group key={k} position={[dx,0.22,dz]}>
        <mesh position-y={0.12}><cylinderGeometry args={[0.012,0.012,0.24,5]}/>{S('#4f8a3a')}</mesh>
        <mesh position-y={0.27} castShadow><sphereGeometry args={[0.07,10,8]}/>{S(c as string)}</mesh></group>)}
    </group>)}
    <mesh position={[0.65,2.35,-0.35]}><cylinderGeometry args={[0.025,0.025,0.6,6]}/>{S('#6f5846')}</mesh>
    <mesh ref={cloth} position={[0.85,2.5,-0.35]}><boxGeometry args={[0.36,0.22,0.02]}/>{S(flag)}</mesh>
  </group>;
}

export function Pot({open,flowers}:{open:boolean;flowers:number}){
  const sprout=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(sprout.current)sprout.current.rotation.z=Math.sin(clock.elapsedTime*1.6)*0.08});
  return <group name="cooldown-pot">
    <mesh position-y={0.2} castShadow><cylinderGeometry args={[0.26,0.19,0.4,16]}/>{S('#c27a55')}</mesh>
    <mesh position-y={0.39}><cylinderGeometry args={[0.23,0.23,0.03,16]}/>{S('#6c4c3a')}</mesh>
    {open&&<group ref={sprout} position-y={0.4}>
      <mesh position-y={0.15}><cylinderGeometry args={[0.02,0.025,0.3,6]}/>{S('#5c9a45')}</mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*0.08,0.28,0]} rotation-z={-s*0.6} scale={[0.1,0.03,0.06]}><sphereGeometry args={[1,10,6]}/>{S('#6db24f')}</mesh>)}
    </group>}
    {Array.from({length:Math.min(3,flowers)},(_,i)=><group key={i} position={[(i-1)*0.1,0.4,(i%2)*0.06]}>
      <mesh position-y={0.18}><cylinderGeometry args={[0.015,0.02,0.36,6]}/>{S('#5c9a45')}</mesh>
      <mesh position-y={0.38}><sphereGeometry args={[0.08,12,8]}/><meshStandardMaterial color="#ffd166" emissive="#ffb000" emissiveIntensity={0.6} toneMapped={false}/></mesh>
    </group>)}
  </group>;
}

export function Decor({shape}:{shape:Shape}){
  switch(shape){
    case 'lamp':return <group><mesh position-y={0.7} castShadow><cylinderGeometry args={[0.05,0.07,1.4,8]}/>{S('#2f3a35')}</mesh>
      <mesh position-y={1.5}><sphereGeometry args={[0.2,16,10]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.5} toneMapped={false}/></mesh>
      <pointLight position-y={1.5} color="#ffcf87" intensity={2} distance={4} decay={2}/></group>;
    case 'bench':return <group><mesh position-y={0.45} castShadow><boxGeometry args={[1.4,0.1,0.45]}/>{S('#a77d58')}</mesh>
      <mesh position={[0,0.75,-0.2]} castShadow><boxGeometry args={[1.4,0.4,0.08]}/>{S('#a77d58')}</mesh>
      {[-0.6,0.6].map(x=><mesh key={x} position={[x,0.22,0]}><boxGeometry args={[0.08,0.45,0.4]}/>{S('#5b4a3d')}</mesh>)}</group>;
    case 'board':return <group><mesh position={[0,0.9,0]} castShadow><boxGeometry args={[0.9,1.1,0.06]}/>{S('#c09068')}</mesh>
      {[0,1,2].map(i=><mesh key={i} position={[(i-1)*0.25,0.95+(i%2)*0.15,0.04]} rotation-z={(i-1)*0.1}><boxGeometry args={[0.22,0.28,0.01]}/>{S(['#f6efd9','#e6eef6','#f6e2d9'][i])}</mesh>)}
      {[-0.35,0.35].map(x=><mesh key={x} position={[x,0.35,-0.05]}><cylinderGeometry args={[0.03,0.03,0.7,6]}/>{S('#5b4a3d')}</mesh>)}</group>;
    case 'vane':return <Vane/>;
    case 'planter':return <group>{[-0.45,0,0.45].map((x,i)=><group key={x} position-x={x}><mesh position-y={0.15} castShadow><boxGeometry args={[0.36,0.3,0.36]}/>{S('#c27a55')}</mesh>
      <mesh position-y={0.38} scale={[0.2,0.16,0.2]}><sphereGeometry args={[1,10,8]}/>{S(['#6db24f','#93cf4b','#4f9a45'][i])}</mesh></group>)}</group>;
    case 'flag':return <Flag/>;
    case 'crate':return <group><mesh position-y={0.3} castShadow><boxGeometry args={[0.6,0.6,0.6]}/>{S('#b78f5f')}</mesh>
      <mesh position-y={0.62}><boxGeometry args={[0.5,0.04,0.4]}/>{S('#f2ede2')}</mesh></group>;
    case 'scope':return <group><mesh position-y={0.45} castShadow><cylinderGeometry args={[0.04,0.06,0.9,8]}/>{S('#2f3a35')}</mesh>
      <mesh position={[0,0.95,0.1]} rotation-x={-1.0} castShadow><cylinderGeometry args={[0.08,0.11,0.8,14]}/>{S('#c99a3e')}</mesh></group>;
  }
}
function Vane(){const r=useRef<THREE.Group>(null);useFrame(({clock})=>{if(r.current)r.current.rotation.y=Math.sin(clock.elapsedTime*0.6)*0.8});
  return <group><mesh position-y={0.8} castShadow><cylinderGeometry args={[0.04,0.05,1.6,8]}/>{S('#2f3a35')}</mesh>
    <group ref={r} position-y={1.6}><mesh rotation-z={Math.PI/2}><coneGeometry args={[0.08,0.35,8]}/>{S('#c4452f')}</mesh>
      <mesh position-x={-0.3}><boxGeometry args={[0.3,0.2,0.02]}/>{S('#2f3a35')}</mesh></group></group>}
function Flag(){const r=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(r.current)r.current.rotation.y=Math.sin(clock.elapsedTime*2.4)*0.25});
  return <group><mesh position-y={1} castShadow><cylinderGeometry args={[0.03,0.04,2,8]}/>{S('#2f3a35')}</mesh>
    <mesh ref={r} position={[0.3,1.75,0]}><boxGeometry args={[0.6,0.4,0.02]}/>{S('#6a5aa8')}</mesh></group>}
