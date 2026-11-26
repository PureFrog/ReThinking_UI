'use client';
// 집 더 꾸미기 (피드백 2026-11-26):
//  · 선생님이 왜 우리 집에? → she is the visiting tutor (방문 과외): her own armchair across the desk, her coat, scarf and
//    tote on the stand by the door, a tea for two; her desk things (the bell, an apple, the red pen, the quiz sheets)
//  · 책상과 앉은 모습이 어색 → a real writing desk (a top with an apron, a drawer pedestal with brass pulls, turned legs),
//    a banker's lamp instead of the glowing ball, and the bear sitting IN a chair with her legs and feet showing
//  · 문 디테일 → a panelled door in a moulded casing: hinges, a brass knob with its plate and keyhole, a wreath, a mat
//  · 뒤쪽이 휑해 → the near half of the room: an armchair and footstool with a throw, a coffee table with a mug and a
//    book, a record player cabinet, a cat tree and the cat's bed, a little side rug
//  · 고양이 → a tabby that walks between its places (bed, rug, the stove, the window seat), sits, washes, sleeps
// Room as Interior3D: w 9, d 7, h 3.2 (back wall z=-3.5, left x=-4.5, right x=4.5), floor at 0.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {still} from './still';
import {npcStep} from './places';
import {usePetCue,petPick,Hearts,type PetId} from './Pets';

const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
const brass=()=><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/>;
function tex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void,rep?:[number,number]){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...rep)}return t;
}
function useTex(make:()=>THREE.Texture){const t=useMemo(make,[]);useEffect(()=>()=>t.dispose(),[t]);return t}// eslint-disable-line react-hooks/exhaustive-deps

// ------------------------------------------------------------ the desk (local: top centre at y 0.86, student side +z)
export function StudyDesk(){
  const grain=useTex(()=>tex(128,64,g=>{g.fillStyle='#a77d58';g.fillRect(0,0,128,64);g.strokeStyle='#8a6448';g.lineWidth=1;
    for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,i*4.6+Math.random()*2);g.bezierCurveTo(40,i*4.6+3,80,i*4.6-2,128,i*4.6+1);g.stroke()}},[2,1]));
  const sheet=useTex(()=>tex(64,80,g=>{g.fillStyle='#fbf7ec';g.fillRect(0,0,64,80);g.fillStyle='#5a4a3a';g.font='bold 9px sans-serif';g.fillText('오늘의 퀴즈',6,12);
    g.fillStyle='#b9ad98';for(let i=0;i<7;i++)g.fillRect(6,20+i*8,40+(i%3)*6,2);g.strokeStyle='#c4432f';g.lineWidth=2;g.beginPath();g.arc(50,62,8,0,7);g.stroke()}));
  const top=<meshStandardMaterial map={grain} roughness={0.6}/>;
  return <group name="study-desk">
    <mesh position-y={0.86} castShadow receiveShadow><boxGeometry args={[2.2,0.07,1.05]}/>{top}</mesh>
    <mesh position-y={0.8}><boxGeometry args={[2.1,0.08,0.95]}/>{M('#8a6448')}</mesh>
    {/* the drawer pedestal on the left: three drawers with brass pulls (student side) */}
    <mesh position={[0.72,0.39,0]} castShadow receiveShadow><boxGeometry args={[0.62,0.78,0.95]}/>{M('#8a6448')}</mesh>
    {[0.62,0.39,0.16].map(y=><group key={y} position={[0.72,y,0.48]}><mesh><boxGeometry args={[0.54,0.19,0.02]}/>{top}</mesh>
      <mesh position-z={0.02} rotation-z={Math.PI/2}><cylinderGeometry args={[0.012,0.012,0.12,8]}/>{brass()}</mesh></group>)}
    {/* turned legs on the right */}
    {[[-0.98,-0.4],[-0.98,0.4]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position-y={0.4} castShadow><cylinderGeometry args={[0.04,0.03,0.8,12]}/>{M('#6f5040')}</mesh>
      <mesh position-y={0.62}><sphereGeometry args={[0.05,12,10]}/>{M('#6f5040')}</mesh><mesh position-y={0.04}><cylinderGeometry args={[0.045,0.05,0.08,12]}/>{M('#5a3d2b')}</mesh></group>)}
    {/* on top: the quiz sheets, a pencil cup, an apple, a bell, a red pen, a banker's lamp */}
    <mesh position={[-0.2,0.9,0.12]} rotation={[-Math.PI/2,0,0.08]}><planeGeometry args={[0.46,0.6]}/><meshStandardMaterial map={sheet}/></mesh>
    {[0,1,2].map(i=><mesh key={i} position={[0.35,0.9+i*0.008,-0.05]} rotation={[-Math.PI/2,0,-0.15+i*0.06]}><planeGeometry args={[0.42,0.55]}/>{M(i%2?'#f4eedf':'#fbf7ec')}</mesh>)}
    <mesh position={[0.08,0.905,0.2]} rotation={[-Math.PI/2,0,0.7]}><cylinderGeometry args={[0.008,0.008,0.16,6]}/>{M('#c4432f')}</mesh>
    <group position={[-0.7,0.9,-0.25]}><mesh position-y={0.07}><cylinderGeometry args={[0.06,0.055,0.14,14]}/>{M('#3f6a5a')}</mesh>
      {[['#f2c94c',0.02],['#c4432f',-0.02],['#5f8ab8',0.0]].map(([c,x],i)=><mesh key={i} position={[x as number,0.18,(i-1)*0.02]} rotation-z={(i-1)*0.12}><cylinderGeometry args={[0.008,0.008,0.18,6]}/>{M(c as string)}</mesh>)}</group>
    <group position={[-0.45,0.9,-0.3]}><mesh position-y={0.06}><sphereGeometry args={[0.065,16,12]}/>{M('#d8453a')}</mesh>
      <mesh position-y={0.13}><cylinderGeometry args={[0.005,0.005,0.04,4]}/>{M('#5a3d2b')}</mesh><mesh position={[0.025,0.13,0]} rotation-z={-0.9} scale={[1,0.4,0.6]}><sphereGeometry args={[0.025,8,6]}/>{M('#4f9a45')}</mesh></group>
    <group position={[0.15,0.9,-0.35]}><mesh position-y={0.05}><sphereGeometry args={[0.06,16,10,0,Math.PI*2,0,Math.PI/2]}/>{brass()}</mesh>
      <mesh position-y={0.11}><cylinderGeometry args={[0.008,0.008,0.05,6]}/>{M('#3b2a20')}</mesh><mesh position-y={0.005}><cylinderGeometry args={[0.07,0.07,0.01,16]}/>{M('#3b2a20')}</mesh></group>
    <group position={[0.75,0.9,-0.3]}>
      <mesh position-y={0.02}><cylinderGeometry args={[0.1,0.11,0.04,18]}/>{brass()}</mesh>
      <mesh position-y={0.17}><cylinderGeometry args={[0.012,0.012,0.3,8]}/>{brass()}</mesh>
      <mesh position={[0,0.33,0.04]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.1,0.1,0.32,18,1,true,0,Math.PI]}/><meshStandardMaterial color="#2f6b4f" metalness={0.2} roughness={0.3} side={THREE.DoubleSide}/></mesh>
      <mesh position={[0,0.31,0.04]} rotation-z={Math.PI/2}><capsuleGeometry args={[0.035,0.18,4,10]}/><meshStandardMaterial color="#fff4cc" emissive="#ffd98a" emissiveIntensity={1.4} toneMapped={false}/></mesh>
      <pointLight position={[0,0.25,0.15]} intensity={1.6} distance={2.2} color="#ffd9a0"/></group>
  </group>;
}

// ------------------------------------------------------------ the tutor's armchair, and her legs and feet
export function TutorSeat({fur,pad}:{fur:string;pad:string}){
  const fabric=useTex(()=>tex(64,64,g=>{g.fillStyle='#b56a5a';g.fillRect(0,0,64,64);g.strokeStyle='#a35a4b';for(let i=0;i<64;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i,64);g.stroke()}
    for(let i=0;i<500;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*0.06})`;g.fillRect(Math.random()*64,Math.random()*64,1,1)}},[2,2]));
  const f=<meshStandardMaterial map={fabric} roughness={0.9}/>;
  return <group name="tutor-seat">
    <mesh position={[0,0.5,0]} castShadow receiveShadow><boxGeometry args={[1.15,0.22,0.62]}/>{f}</mesh>
    <mesh position={[0,1.05,-0.27]} castShadow><boxGeometry args={[1.15,1.0,0.14]}/>{f}</mesh>
    <mesh position={[0,1.56,-0.27]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.08,0.08,1.15,14]}/>{f}</mesh>
    {[-1,1].map(k=><group key={k}><mesh position={[k*0.54,0.72,0]} castShadow><boxGeometry args={[0.14,0.28,0.62]}/>{f}</mesh>
      <mesh position={[k*0.54,0.86,0.02]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.075,0.075,0.6,12]}/>{f}</mesh></group>)}
    {[[-0.5,-0.25],[0.5,-0.25],[-0.5,0.25],[0.5,0.25]].map(([x,z],i)=><mesh key={i} position={[x,0.19,z]}><cylinderGeometry args={[0.035,0.025,0.38,8]}/>{M('#5a3d2b')}</mesh>)}
    {/* her legs over the cushion's edge and her round feet with pads */}
    {[-1,1].map(k=><group key={'l'+k} position={[k*0.2,0,0]}>
      <mesh position={[0,0.66,0.3]} rotation-x={Math.PI/2.3} castShadow><capsuleGeometry args={[0.11,0.22,6,12]}/>{M(fur)}</mesh>
      <mesh position={[0,0.42,0.43]} castShadow><capsuleGeometry args={[0.1,0.2,6,12]}/>{M(fur)}</mesh>
      <mesh position={[0,0.2,0.48]} scale={[1,0.75,1.3]} castShadow><sphereGeometry args={[0.12,14,10]}/>{M(fur)}</mesh>
      <mesh position={[0,0.2,0.62]} rotation-x={-0.2}><circleGeometry args={[0.065,16]}/>{M(pad)}</mesh></group>)}
  </group>;
}

// ------------------------------------------------------------ the door, by the left wall (local: faces +z after the wall's turn)
export function DoorDetail(){
  const mat=useTex(()=>tex(64,64,g=>{g.fillStyle='#ffffff';g.fillRect(0,0,64,64);g.fillStyle='#7a3f2c';g.fillRect(0,0,64,64);g.fillStyle='#ffffff';
    g.font='bold 11px sans-serif';g.textAlign='center';g.fillStyle='#f4ead2';g.fillText('WELCOME',32,36)}));
  return <group name="door-detail">
    {/* casing round the door */}
    {[[-0.62,1.1,0.1,2.25],[0.62,1.1,0.1,2.25],[0,2.25,1.34,0.12]].map(([x,y,a,b],i)=><mesh key={i} position={[x,y,0.03]}><boxGeometry args={[a,b,0.06]}/>{M('#f4eedf')}</mesh>)}
    {/* four raised panels */}
    {[[-0.24,1.55],[0.24,1.55],[-0.24,0.6],[0.24,0.6]].map(([x,y],i)=><group key={i} position={[x,y,0.04]}>
      <mesh><boxGeometry args={[0.36,i<2?0.7:0.85,0.02]}/>{M('#8a4a34')}</mesh>
      <mesh position-z={0.012}><boxGeometry args={[0.28,i<2?0.6:0.75,0.01]}/>{M('#7a3f2c')}</mesh></group>)}
    {/* hinges, the knob with its plate and keyhole */}
    {[0.4,1.75].map(y=><mesh key={y} position={[-0.53,y,0.04]}><boxGeometry args={[0.05,0.14,0.02]}/>{brass()}</mesh>)}
    <mesh position={[0.4,1.05,0.04]}><boxGeometry args={[0.08,0.24,0.01]}/>{brass()}</mesh>
    <mesh position={[0.4,1.1,0.08]}><sphereGeometry args={[0.045,14,10]}/>{brass()}</mesh>
    <mesh position={[0.4,1.0,0.047]}><circleGeometry args={[0.012,8]}/>{M('#1f1b1a')}</mesh>
    {/* a wreath with berries and a ribbon */}
    <group position={[0,1.82,0.07]}>
      <mesh><torusGeometry args={[0.17,0.05,8,24]}/>{M('#4f7a3f')}</mesh>
      {Array.from({length:10},(_,i)=><mesh key={i} position={[Math.cos(i*0.63)*0.17,Math.sin(i*0.63)*0.17,0.04]}><sphereGeometry args={[0.022,8,6]}/>{M(i%2?'#c4432f':'#6db24f')}</mesh>)}
      <mesh position={[0,-0.17,0.05]} rotation-z={Math.PI/4}><boxGeometry args={[0.08,0.08,0.02]}/>{M('#e8a5a0')}</mesh></group>
    {/* a mat in front */}
    <mesh position={[0,0.008,0.5]} rotation-x={-Math.PI/2}><planeGeometry args={[0.9,0.5]}/><meshStandardMaterial map={mat} roughness={1}/></mesh>
  </group>;
}

// ------------------------------------------------------------ the tutor's coat stand by the door (room coordinates)
export function CoatStand({position,scarf}:{position:[number,number,number];scarf:string}){
  return <group position={position} name="coat-stand">
    <mesh position-y={0.03}><cylinderGeometry args={[0.2,0.22,0.06,16]}/>{M('#5a3d2b')}</mesh>
    <mesh position-y={0.9}><cylinderGeometry args={[0.025,0.03,1.8,10]}/>{M('#6f5040')}</mesh>
    {[0,1.6,3.2,4.7].map(a=><mesh key={a} position={[Math.cos(a)*0.1,1.72,Math.sin(a)*0.1]} rotation={[Math.sin(a)*0.8,0,-Math.cos(a)*0.8]}><cylinderGeometry args={[0.012,0.012,0.18,6]}/>{M('#6f5040')}</mesh>)}
    {/* her scarf (the teal she wears) and a tote with a book in it */}
    <mesh position={[0.12,1.45,0]} rotation-z={0.15}><boxGeometry args={[0.08,0.6,0.05]}/>{M(scarf)}</mesh>
    <mesh position={[0.2,1.45,0.02]} rotation-z={-0.1}><boxGeometry args={[0.08,0.5,0.05]}/>{M(scarf)}</mesh>
    <group position={[-0.12,1.28,0.05]} rotation-z={-0.08}><mesh><boxGeometry args={[0.34,0.38,0.08]}/>{M('#efe3c8')}</mesh>
      <mesh position={[0,0.3,0]}><torusGeometry args={[0.1,0.012,6,16,Math.PI]}/>{M('#efe3c8')}</mesh>
      <mesh position={[0.05,0.2,0]}><boxGeometry args={[0.18,0.12,0.04]}/>{M('#3f6a5a')}</mesh>
      <mesh position={[-0.06,0,0.045]}><circleGeometry args={[0.06,14]}/>{M('#f4a7b9')}</mesh></group>
  </group>;
}

// ------------------------------------------------------------ the near half of the room
export function FrontCozy(){
  const throwTex=useTex(()=>tex(64,64,g=>{g.fillStyle='#e9dcc2';g.fillRect(0,0,64,64);g.fillStyle='#c97a6e';for(let i=0;i<64;i+=16){g.fillRect(i,0,6,64);g.fillRect(0,i,64,6)}},[1.5,1.5]));
  const rug=useTex(()=>tex(128,96,g=>{g.fillStyle='#e7d6b4';g.fillRect(0,0,128,96);g.strokeStyle='#7b8f5e';g.lineWidth=6;g.strokeRect(6,6,116,84);
    g.fillStyle='#c97a6e';for(let x=18;x<112;x+=12)for(let y=18;y<80;y+=12)if((x+y)%24===0){g.beginPath();g.arc(x,y,3,0,7);g.fill()}
    for(let i=0;i<3000;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*0.05})`;g.fillRect(Math.random()*128,Math.random()*96,1,2)}}));
  const cover=useTex(()=>tex(32,32,g=>{g.fillStyle='#e8c46a';g.fillRect(0,0,32,32);g.fillStyle='#2f3a52';g.fillRect(4,4,24,24);g.fillStyle='#e8c46a';g.beginPath();g.arc(16,16,6,0,7);g.fill()}));
  return <group name="front-cozy">
    {/* an armchair and a footstool by the basket, a throw over its arm */}
    <group position={[-1.7,0,2.25]} rotation-y={0.4}>
      <mesh position-y={0.36} castShadow receiveShadow><boxGeometry args={[0.95,0.3,0.85]}/>{M('#d9a35a')}</mesh>
      <mesh position={[0,0.85,-0.35]} castShadow><boxGeometry args={[0.95,0.75,0.18]}/>{M('#d9a35a')}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.47,0.62,0]} castShadow><boxGeometry args={[0.14,0.28,0.85]}/>{M('#c48e48')}</mesh>)}
      <mesh position={[0,0.55,0.05]}><boxGeometry args={[0.78,0.1,0.7]}/>{M('#e6b56a')}</mesh>
      <mesh position={[0.52,0.62,0.05]} rotation-z={-0.2}><boxGeometry args={[0.04,0.5,0.6]}/><meshStandardMaterial map={throwTex}/></mesh>
      <mesh position={[0,0.82,-0.2]} rotation-x={0.25}><boxGeometry args={[0.36,0.3,0.1]}/>{M('#8fcbe8')}</mesh>
      {[[-0.4,-0.35],[0.4,-0.35],[-0.4,0.35],[0.4,0.35]].map(([x,z],i)=><mesh key={i} position={[x,0.1,z]}><cylinderGeometry args={[0.03,0.02,0.2,8]}/>{M('#5a3d2b')}</mesh>)}
      <group position={[0,0,0.95]}><mesh position-y={0.25} castShadow><boxGeometry args={[0.6,0.22,0.45]}/>{M('#d9a35a')}</mesh>
        {[[-0.25,-0.18],[0.25,-0.18],[-0.25,0.18],[0.25,0.18]].map(([x,z],i)=><mesh key={i} position={[x,0.07,z]}><cylinderGeometry args={[0.025,0.02,0.14,8]}/>{M('#5a3d2b')}</mesh>)}</group>
    </group>
    <mesh position={[-1.55,0.006,2.6]} rotation-x={-Math.PI/2}><planeGeometry args={[1.9,1.3]}/><meshStandardMaterial map={rug} roughness={1}/></mesh>
    {/* a coffee table at the rug's near edge: a mug with steam-less tea, a book face down, a little vase */}
    <group position={[0.7,0,2.35]}>
      <mesh position-y={0.4} castShadow receiveShadow><boxGeometry args={[1.2,0.06,0.62]}/>{M('#a77d58')}</mesh>
      <mesh position-y={0.15}><boxGeometry args={[1.08,0.03,0.5]}/>{M('#8a6448')}</mesh>
      {[[-0.54,-0.26],[0.54,-0.26],[-0.54,0.26],[0.54,0.26]].map(([x,z],i)=><mesh key={i} position={[x,0.2,z]}><boxGeometry args={[0.05,0.4,0.05]}/>{M('#6f5040')}</mesh>)}
      <group position={[-0.3,0.43,0.05]}><mesh position-y={0.05}><cylinderGeometry args={[0.045,0.04,0.1,14]}/>{M('#f4eedf')}</mesh>
        <mesh position={[0.05,0.05,0]} rotation-y={Math.PI/2}><torusGeometry args={[0.025,0.008,6,12]}/>{M('#f4eedf')}</mesh><mesh position-y={0.095}><circleGeometry args={[0.04,12]}/>{M('#8a5a3e')}</mesh></group>
      <mesh position={[0.15,0.445,0.02]} rotation={[0,0.3,0]}><boxGeometry args={[0.3,0.04,0.22]}/><meshStandardMaterial map={cover}/></mesh>
      <group position={[0.42,0.43,-0.1]}><mesh position-y={0.07}><cylinderGeometry args={[0.035,0.05,0.14,12]}/>{M('#8fcbe8')}</mesh>
        {[0,1,2].map(i=><mesh key={i} position={[(i-1)*0.03,0.2+i*0.02,0]}><sphereGeometry args={[0.03,8,6]}/>{M(['#f48fb8','#ffd447','#ffffff'][i])}</mesh>)}</group>
      {[0,1].map(i=><mesh key={i} position={[-0.2+i*0.3,0.185,0]}><boxGeometry args={[0.24,0.04,0.18]}/>{M(i?'#c97a6e':'#5f8a7a')}</mesh>)}
    </group>
    {/* a record player on a low cabinet, records leaning against it */}
    <group position={[2.5,0,3.0]} rotation-y={-0.3}>
      <mesh position-y={0.32} castShadow receiveShadow><boxGeometry args={[1.0,0.64,0.45]}/>{M('#8a6448')}</mesh>
      {[-0.25,0.25].map(x=><mesh key={x} position={[x,0.32,0.23]}><boxGeometry args={[0.44,0.54,0.02]}/>{M('#a77d58')}</mesh>)}
      <group position={[0,0.66,0]}><mesh position-y={0.04}><boxGeometry args={[0.5,0.08,0.38]}/>{M('#6f5040')}</mesh>
        <RecordSpin/>
        <mesh position={[0.17,0.11,-0.08]} rotation-y={0.6}><boxGeometry args={[0.18,0.01,0.015]}/>{M('#c0c0c0')}</mesh></group>
      {['#c4432f','#2f3a52','#f2c94c'].map((c,i)=><mesh key={c} position={[0.6,0.18,-0.1+i*0.06]} rotation-z={0.12}><boxGeometry args={[0.02,0.34,0.34]}/>{M(c)}</mesh>)}
    </group>
    {/* the cat's tree and its bed */}
    <group position={[3.75,0,-1.6]}>
      <mesh position-y={0.04}><boxGeometry args={[0.6,0.08,0.6]}/>{M('#e9dcc2')}</mesh>
      {[0.55,1.1].map(y=><mesh key={y} position={[0,y/2+0.04,0]}><cylinderGeometry args={[0.07,0.07,y,10]}/>{M('#c9a27a')}</mesh>)}
      <mesh position={[0,0.62,0]}><cylinderGeometry args={[0.28,0.28,0.06,18]}/>{M('#e9dcc2')}</mesh>
      <mesh position={[0,1.2,0]}><cylinderGeometry args={[0.22,0.22,0.06,18]}/>{M('#e9dcc2')}</mesh>
      <mesh position={[0.2,1.0,0]}><cylinderGeometry args={[0.004,0.004,0.3,4]}/>{M('#5a3d2b')}</mesh><mesh position={[0.2,0.84,0]}><sphereGeometry args={[0.04,10,8]}/>{M('#f48fb8')}</mesh>
    </group>
    <group position={[-3.6,0,0.75]}>
      <mesh position-y={0.08}><torusGeometry args={[0.28,0.09,10,24]} />{M('#c97a6e')}</mesh>
      <mesh position-y={0.05} rotation-x={-Math.PI/2}><circleGeometry args={[0.28,20]}/>{M('#f4ead2')}</mesh>
      <mesh position={[0.45,0.03,0.1]}><cylinderGeometry args={[0.08,0.07,0.05,14]}/>{M('#8fcbe8')}</mesh>
    </group>
  </group>;
}
function RecordSpin(){const r=useRef<THREE.Mesh>(null);useFrame((_,dt)=>{if(r.current&&!still())r.current.rotation.y+=dt*3.5});
  return <mesh ref={r} position-y={0.09}><cylinderGeometry args={[0.15,0.15,0.01,24]}/>{M('#1f1b1a')}</mesh>}

// ------------------------------------------------------------ the cat
// waypoints: its bed by the stove, the rug, under the window, the cat tree's foot, by the sofa. It walks, stops to sit
// or wash, and sometimes curls up in its bed. A ginger tabby: stripes on its back and tail, a cream chest and paws.
export const CAT_SPOTS:[number,number][]=[[-3.6,0.75],[0.3,0.6],[-0.6,-1.2],[3.3,-1.2],[2.6,1.0],[-0.5,1.5],[1.6,-0.6]];
export function Cat({spots=CAT_SPOTS,ground,tint='#e8a25a',id='house-cat'}:{spots?:[number,number][];ground?:(x:number,z:number)=>number;tint?:string;id?:PetId}={}){
  const cue=usePetCue(id);
  const fur=useTex(()=>tex(64,64,g=>{g.fillStyle=tint;g.fillRect(0,0,64,64);g.fillStyle='rgba(120,60,20,0.35)';for(let i=0;i<64;i+=10){g.beginPath();g.moveTo(0,i);g.quadraticCurveTo(32,i+6,64,i);g.lineTo(64,i+4);g.quadraticCurveTo(32,i+10,0,i+4);g.fill()}
    for(let i=0;i<600;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*0.08})`;g.fillRect(Math.random()*64,Math.random()*64,1,2)}},[1,1]));
  const m=useMemo(()=>({fur:new THREE.MeshStandardMaterial({map:fur,roughness:0.9}),plain:soft(tint),cream:soft('#fbe9cf'),ear:soft('#f4a7a0'),eye:new THREE.MeshBasicMaterial({color:'#2a2a1a'}),
    iris:new THREE.MeshBasicMaterial({color:'#9bc45a'}),nose:soft('#e07a7a'),wh:new THREE.MeshBasicMaterial({color:'#ffffff'}),collar:soft('#c4432f'),bell:new THREE.MeshStandardMaterial({color:'#f2c94c',metalness:0.7,roughness:0.3})}),[fur]);
  const root=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null),tail=useRef<THREE.Group[]>([]),legs=useRef<(THREE.Group|null)[]>([]);
  const st=useRef({x:spots[0][0],z:spots[0][1],to:1,mode:'sleep' as 'walk'|'sit'|'sleep'|'wash',until:4,yaw:0,ph:0});
  useFrame(({clock,camera},dt0)=>{const r=root.current,b=body.current,h=head.current;if(!r||!b||!h)return;const dt=Math.min(dt0,0.05),t=clock.elapsedTime,s=st.current;
    // picked: it sits and looks up at me (toward the camera); petted it purrs and sways, a treat it eats
    const react=cue.reacting(),waiting=cue.waiting();
    if(waiting){if(s.mode==='walk'||s.mode==='sleep'){s.mode='sit'}s.until=t+2;const cx=camera.position.x-s.x,cz=camera.position.z-s.z,yaw=Math.atan2(cx,cz);s.yaw+=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))*Math.min(1,5*dt)}
    if(s.mode==='walk'){const [tx,tz]=spots[s.to],dx=tx-s.x,dz=tz-s.z,d=Math.hypot(dx,dz);
      if(d<0.05){const roll=Math.random();s.mode=s.to===0&&roll<0.6?'sleep':roll<0.5?'sit':'wash';s.until=t+(s.mode==='sleep'?14:5+Math.random()*5)}
      else{const sp=Math.min(d,0.55*dt);if(!ground||!npcStep(s,tx,tz,sp,undefined,0.15)){s.x+=dx/d*sp;s.z+=dz/d*sp}const yaw=Math.atan2(dx,dz);s.yaw+=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))*Math.min(1,6*dt);s.ph+=dt*9}}
    else if(t>s.until){let n=s.to;while(n===s.to)n=Math.floor(Math.random()*spots.length);s.to=n;s.mode='walk'}
    r.position.set(s.x,ground?ground(s.x,s.z):0,s.z);r.rotation.y=s.yaw;
    const walk=s.mode==='walk',sleep=s.mode==='sleep',sit=s.mode==='sit'||s.mode==='wash';
    b.position.y=THREE.MathUtils.lerp(b.position.y,sleep?-0.08:sit?-0.03:walk?Math.abs(Math.sin(s.ph))*0.01:0,0.15);
    b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,sit?-0.45:0,0.12);
    b.scale.z=THREE.MathUtils.lerp(b.scale.z,sleep?0.8:1,0.1);
    h.rotation.x=THREE.MathUtils.lerp(h.rotation.x,react==='treat'?0.75+Math.abs(Math.sin(t*9))*0.2:react==='pet'?-0.25:waiting?-0.15:sleep?0.6:s.mode==='wash'?0.5+Math.sin(t*6)*0.15:sit?0.35:Math.sin(t*0.7)*0.05,0.12);
    h.rotation.z=THREE.MathUtils.lerp(h.rotation.z,react==='pet'?Math.sin(t*3)*0.25:0,0.1);
    h.rotation.y=THREE.MathUtils.lerp(h.rotation.y,waiting?0:sleep?0.9:sit?Math.sin(t*0.4)*0.5:0,0.08);
    legs.current.forEach((l,i)=>{if(!l)return;const ph=s.ph+(i===0||i===3?0:Math.PI);l.rotation.x=walk?Math.sin(ph)*0.5:sit&&i<2?0:0;l.visible=!sleep});
    tail.current.forEach((g,i)=>{if(!g)return;g.rotation.z=Math.sin(t*(walk?3:react?6:1.4)+i*0.6)*(sleep?0.05:react?0.3:0.18);g.rotation.x=sleep?0.25:walk||react?-0.35:-0.15});
    if(react==='pet')b.rotation.z=Math.sin(t*4)*0.06;else b.rotation.z*=0.9});
  const P=(x:THREE.Material)=><primitive object={x} attach="material"/>;
  return <group ref={root} name={id} scale={0.9} onClick={e=>{e.stopPropagation();if(e.delta>6)return;petPick(id,{x:st.current.x,z:st.current.z})}}
    onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
    <Hearts n={cue.hearts} y={0.55}/>
    {/* an easier thing to tap than the cat itself */}
    <mesh position={[0,0.25,0]} visible={false}><boxGeometry args={[0.6,0.6,0.8]}/></mesh>
    <group ref={body}>
      {/* body and chest */}
      <mesh position={[0,0.2,0]} rotation-x={Math.PI/2} castShadow><capsuleGeometry args={[0.1,0.22,8,16]}/>{P(m.fur)}</mesh>
      <mesh position={[0,0.19,0.13]} scale={[0.8,0.9,0.7]}><sphereGeometry args={[0.1,14,12]}/>{P(m.cream)}</mesh>
      {/* legs: front pair, back pair, each with a cream paw */}
      {[[-0.06,0.12],[0.06,0.12],[-0.06,-0.12],[0.06,-0.12]].map(([x,z],i)=><group key={i} ref={el=>{legs.current[i]=el}} position={[x,0.16,z]}>
        <mesh position-y={-0.07}><capsuleGeometry args={[0.032,0.08,4,8]}/>{P(m.plain)}</mesh>
        <mesh position={[0,-0.14,0.01]} scale={[1,0.7,1.2]}><sphereGeometry args={[0.036,10,8]}/>{P(m.cream)}</mesh></group>)}
      {/* tail: a chain of segments curling up */}
      <group position={[0,0.24,-0.2]}>
        {(()=>{const segs:React.ReactNode[]=[];let child:React.ReactNode=null;for(let i=5;i>=0;i--){child=<group key={i} ref={el=>{if(el)tail.current[i]=el}} position={[0,i===0?0:0.07,0]}>
          <mesh position-y={0.035}><capsuleGeometry args={[0.026-i*0.002,0.05,4,8]}/>{P(i===5?m.cream:m.fur)}</mesh>{child}</group>}segs.push(child);return <group rotation-x={-0.9}>{segs}</group>})()}
      </group>
      {/* head */}
      <group ref={head} position={[0,0.33,0.2]}>
        <mesh scale={[1.1,0.95,1]} castShadow><sphereGeometry args={[0.1,20,16]}/>{P(m.fur)}</mesh>
        <mesh position={[0,-0.03,0.07]} scale={[1.1,0.7,0.7]}><sphereGeometry args={[0.055,14,10]}/>{P(m.cream)}</mesh>
        {[-1,1].map(k=><group key={k} position={[k*0.065,0.08,-0.01]} rotation-z={-k*0.25}>
          <mesh><coneGeometry args={[0.04,0.07,4]}/>{P(m.fur)}</mesh><mesh position={[0,-0.005,0.012]} scale={[0.6,0.7,0.5]}><coneGeometry args={[0.04,0.07,4]}/>{P(m.ear)}</mesh></group>)}
        {[-1,1].map(k=><group key={'e'+k} position={[k*0.042,0.015,0.088]}>
          <mesh scale={[1,1.2,0.5]}><sphereGeometry args={[0.02,10,8]}/>{P(m.iris)}</mesh>
          <mesh position-z={0.006} scale={[0.4,1.1,0.5]}><sphereGeometry args={[0.018,8,6]}/>{P(m.eye)}</mesh>
          <mesh position={[0.006,0.008,0.012]}><sphereGeometry args={[0.005,6,4]}/>{P(m.wh)}</mesh></group>)}
        <mesh position={[0,-0.015,0.11]} rotation-x={0.3}><coneGeometry args={[0.012,0.012,3]}/>{P(m.nose)}</mesh>
        {[-1,1].map(k=>[0,1].map(j=><mesh key={k+'w'+j} position={[k*0.07,-0.025-j*0.012,0.08]} rotation-z={k*(0.1+j*0.15)} rotation-y={k*0.3}><boxGeometry args={[0.09,0.002,0.002]}/>{P(m.wh)}</mesh>))}
        <mesh position={[0,-0.075,0.02]} rotation-x={Math.PI/2}><torusGeometry args={[0.07,0.012,6,18]}/>{P(m.collar)}</mesh>
        <mesh position={[0,-0.09,0.085]}><sphereGeometry args={[0.016,8,6]}/>{P(m.bell)}</mesh>
      </group>
    </group>
  </group>;
}
