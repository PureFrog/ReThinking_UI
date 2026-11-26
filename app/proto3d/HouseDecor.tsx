'use client';
// 집 꾸미기 (피드백 2026-11-26 "집인데 왜 이렇게 썰렁해, 모동숲 cozy"): the room in Interior3D gets wallpaper, a parquet floor
// with a real grain, a patterned rug, a view out of the window (sky, clouds, hills, trees, a fence, flowers) with
// curtains, books filling the shelf round the judgment books, a proper chair at the desk, a sofa with cushions, a
// side table with tea, a wood stove, pictures, a clock, string lights, a floor lamp and a basket. Room: w 9, d 7,
// h 3.2 (back wall z=-3.5, left x=-4.5, right x=4.5). Nothing here takes a tap.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {SPINES,useSpineMats} from './LibraryDecor';

const W=9,D=7,H=3.2,BACK=-D/2,LEFT=-W/2,RIGHT=W/2;
const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
function tex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void,rep?:[number,number]){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...rep)}return t;
}
export function houseMaterials(){
  // floor: herringbone-ish planks with grain lines
  const floor=tex(256,256,g=>{const cols=['#b8875c','#a97a50','#c09065','#ad7f55'];
    for(let r=0;r<16;r++)for(let k=0;k<5;k++){const off=(r%2)*32;const x=k*64-off;g.fillStyle=cols[(r+k)%cols.length];g.fillRect(x,r*16,64,16);g.fillRect(x+256,r*16,64,16);
      g.strokeStyle='#7d553455';g.lineWidth=1;for(let l=0;l<3;l++){g.beginPath();g.moveTo(x+4,r*16+4+l*4);g.bezierCurveTo(x+20,r*16+2+l*4,x+40,r*16+7+l*4,x+60,r*16+4+l*4);g.stroke()}}
    g.strokeStyle='#6a4a3066';for(let r=0;r<=16;r++){g.beginPath();g.moveTo(0,r*16);g.lineTo(256,r*16);g.stroke()}},[W/1.4,(D+5)/1.4]);
  // wallpaper: cream with small sprigs, a stripe of rose
  const paper=(base:string,w:number)=>tex(128,128,g=>{g.fillStyle=base;g.fillRect(0,0,128,128);g.fillStyle='#d9a7a022';for(let x=0;x<128;x+=64)g.fillRect(x+28,0,8,128);
    for(let y=16;y<128;y+=32)for(let x=12;x<128;x+=32){g.fillStyle='#8fae6a99';g.beginPath();g.ellipse(x,y,3,6,0.6,0,7);g.fill();g.fillStyle='#e08a8a99';g.beginPath();g.arc(x+3,y-4,2.4,0,7);g.fill()}},[w/0.9,H/0.9]);
  const rug=tex(256,256,g=>{g.fillStyle='#a5553f';g.fillRect(0,0,256,256);const ring=(r:number,c:string,lw:number)=>{g.strokeStyle=c;g.lineWidth=lw;g.beginPath();g.arc(128,128,r,0,7);g.stroke()};
    ring(118,'#f2dcae',8);ring(104,'#3f6a5a',6);ring(80,'#f2dcae',4);ring(56,'#e0a24a',10);
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;g.fillStyle=i%2?'#3f6a5a':'#f2dcae';g.save();g.translate(128+Math.cos(a)*92,128+Math.sin(a)*92);g.rotate(a);g.fillRect(-5,-5,10,10);g.restore()}
    g.fillStyle='#f2dcae';g.beginPath();g.moveTo(128,108);g.lineTo(148,128);g.lineTo(128,148);g.lineTo(108,128);g.fill()});
  const view=tex(256,192,g=>{const s=g.createLinearGradient(0,0,0,120);s.addColorStop(0,'#8fcbe8');s.addColorStop(1,'#d9f0ee');g.fillStyle=s;g.fillRect(0,0,256,192);
    g.fillStyle='#ffffffdd';[[50,34],[170,24],[210,46]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,12,0,7);g.arc(x+14,y-5,15,0,7);g.arc(x+28,y,11,0,7);g.fill()});
    g.fillStyle='#9cc77a';g.beginPath();g.moveTo(0,120);g.quadraticCurveTo(80,80,160,112);g.quadraticCurveTo(210,128,256,100);g.lineTo(256,192);g.lineTo(0,192);g.fill();
    g.fillStyle='#7fb35e';g.beginPath();g.moveTo(0,150);g.quadraticCurveTo(128,120,256,148);g.lineTo(256,192);g.lineTo(0,192);g.fill();
    [[40,118],[70,112],[196,110],[226,116]].forEach(([x,y])=>{g.fillStyle='#6b4a30';g.fillRect(x-2,y,4,14);g.fillStyle='#4f9a45';g.beginPath();g.arc(x,y-4,11,0,7);g.fill();g.fillStyle='#6db24f';g.beginPath();g.arc(x-4,y-8,6,0,7);g.fill()});
    g.fillStyle='#f4ead2';for(let x=0;x<256;x+=16){g.fillRect(x+4,152,4,22)}g.fillRect(0,158,256,3);g.fillRect(0,168,256,3);
    ['#f48fb8','#ffd447','#ffffff','#e08a5a'].forEach((c,i)=>{g.fillStyle=c;for(let k=0;k<7;k++){g.beginPath();g.arc(12+k*36+i*8,182-(k%2)*4,3,0,7);g.fill()}})});
  const frames=['#e9b98a','#8fcbe8','#b8d89a'].map((c,i)=>tex(64,80,g=>{g.fillStyle=c;g.fillRect(0,0,64,80);g.fillStyle='#ffffff88';
    if(i===0){g.beginPath();g.arc(40,24,9,0,7);g.fill();g.fillStyle='#7fb35e';g.fillRect(0,52,64,28)}else if(i===1){g.fillStyle='#f4ead2';g.fillRect(18,30,28,34);g.fillStyle='#c44b3b';g.beginPath();g.moveTo(14,32);g.lineTo(32,16);g.lineTo(50,32);g.fill()}
    else{g.fillStyle='#f48fb8';for(let k=0;k<5;k++){g.beginPath();g.arc(14+k*9,40+(k%2)*8,5,0,7);g.fill()}g.fillStyle='#4f9a45';g.fillRect(30,44,3,30)}}));
  return {floor:new THREE.MeshStandardMaterial({map:floor,roughness:0.8}),back:new THREE.MeshStandardMaterial({map:paper('#f4ead6',W),roughness:0.95}),
    side:new THREE.MeshStandardMaterial({map:paper('#efe3cc',D),roughness:0.95}),rug:new THREE.MeshStandardMaterial({map:rug,roughness:1}),view,frames,
    dispose(){[floor,rug,view,...frames].forEach(t=>t.dispose())}};
}

// books filling a shelf row after the judgment books (x from `from` to the row's end)
export function FillerRow({from,to,y,seed,depth=0.4,maxH=0.62}:{from:number;to:number;y:number;seed:number;depth?:number;maxH?:number}){
  const sp=useSpineMats();
  const books=useMemo(()=>{const out:{x:number;w:number;h:number;c:number;lean:number}[]=[];let r=seed;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280};let x=from;
    while(x<to-0.1){const w=0.08+rnd()*0.07,h=0.4+rnd()*(maxH-0.4);if(rnd()<0.08){x+=0.14;continue}const lean=rnd()<0.07?-0.2:0;out.push({x:x+w/2,w,h,c:Math.floor(rnd()*SPINES.length),lean});x+=w+(lean?0.08:0.005)}
    return out},[from,to,seed,maxH]);
  return <group>{books.map((b,i)=><mesh key={i} position={[b.x,y+b.h/2,0]} rotation-z={b.lean} castShadow material={sp[b.c].mats}><boxGeometry args={[b.w,b.h,depth]}/></mesh>)}</group>;
}

function Stove({position}:{position:[number,number,number]}){
  const f=useRef<THREE.MeshStandardMaterial>(null),l=useRef<THREE.PointLight>(null);
  useFrame(({clock})=>{const k=0.8+Math.sin(clock.elapsedTime*7)*0.12+Math.sin(clock.elapsedTime*13)*0.08;if(f.current)f.current.emissiveIntensity=1.6*k;if(l.current)l.current.intensity=2.4*k});
  return <group position={position} rotation-y={Math.PI/2}>
    <mesh position-y={0.5} castShadow><boxGeometry args={[0.8,0.8,0.6]}/>{M('#2f2a28')}</mesh>
    <mesh position={[0,0.45,0.31]}><planeGeometry args={[0.46,0.36]}/><meshStandardMaterial ref={f} color="#ff9a3c" emissive="#ff7a1a" emissiveIntensity={1.6} toneMapped={false}/></mesh>
    {[-0.16,0,0.16].map(x=><mesh key={x} position={[x,0.45,0.32]}><boxGeometry args={[0.025,0.38,0.02]}/>{M('#1f1b1a')}</mesh>)}
    <mesh position-y={0.93}><boxGeometry args={[0.86,0.06,0.66]}/>{M('#3b3431')}</mesh>
    <mesh position={[0,2.05,-0.1]}><cylinderGeometry args={[0.1,0.1,2.2,12]}/>{M('#2f2a28')}</mesh>
    {[-0.3,0.3].map(x=><mesh key={x} position={[x,0.05,0]}><boxGeometry args={[0.08,0.1,0.5]}/>{M('#1f1b1a')}</mesh>)}
    <group position={[0.6,0,0.15]}>{[0,1,2].map(i=><mesh key={i} position={[0,0.08+i*0.13,0]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.065,0.065,0.42,10]}/>{M(i%2?'#8a5a3e':'#9a6a4a')}</mesh>)}</group>
    <pointLight ref={l} position={[0,0.5,0.7]} color="#ffa24a" intensity={2.4} distance={4}/>
  </group>;
}
function StringLights(){
  const n=22,cols=['#ffd27a','#ff9fb8','#9fe0ff','#c8ff9a'];
  return <group>{Array.from({length:n},(_,i)=>{const x=-W/2+0.4+i*(W-0.8)/(n-1),y=H-0.25-Math.sin(i/(n-1)*Math.PI*4)**2*0.18;
    return <mesh key={i} position={[x,y,BACK+0.1]}><sphereGeometry args={[0.04,8,6]}/><meshBasicMaterial color={cols[i%cols.length]} toneMapped={false}/></mesh>})}</group>;
}

export function HouseDecor({mats}:{mats:ReturnType<typeof houseMaterials>}){
  useEffect(()=>()=>mats.dispose(),[mats]);
  return <group name="house-decor">
    {/* wainscot along the back and side walls */}
    <mesh position={[0,0.45,BACK+0.07]}><boxGeometry args={[W,0.9,0.02]}/>{M('#c9a27a')}</mesh>
    <mesh position={[0,0.92,BACK+0.08]}><boxGeometry args={[W,0.05,0.04]}/>{M('#8a6448')}</mesh>
    {[LEFT+0.07,RIGHT-0.07].map(x=><group key={x}><mesh position={[x,0.45,0]}><boxGeometry args={[0.02,0.9,D]}/>{M('#c9a27a')}</mesh><mesh position={[x,0.92,0]}><boxGeometry args={[0.04,0.05,D]}/>{M('#8a6448')}</mesh></group>)}
    {/* the window: the garden outside, curtains and a sill with a pot */}
    <group position={[-1.2,2.05,BACK+0.08]}>
      <mesh><planeGeometry args={[1.5,1.1]}/><meshBasicMaterial map={mats.view} toneMapped={false}/></mesh>
      {/* 피드백 11-26 "창문느낌으로": a deep painted frame, a soft shadow inside it, a cross of glazing bars and two
          streaks of light on the glass, so the view reads as seen through a window, not a poster */}
      {[[0,0.59,1.66,0.1],[0,-0.59,1.66,0.1],[-0.79,0,0.1,1.28],[0.79,0,0.1,1.28]].map(([x,y,w,h],i)=>
        <mesh key={'f'+i} position={[x,y,0.04]} castShadow><boxGeometry args={[w,h,0.1]}/>{M('#fbf4e2')}</mesh>)}
      {[[0,0.52,1.5,0.04],[0,-0.52,1.5,0.04],[-0.73,0,0.04,1.1],[0.73,0,0.04,1.1]].map(([x,y,w,h],i)=>
        <mesh key={'s'+i} position={[x,y,0.005]}><planeGeometry args={[w,h]}/><meshBasicMaterial color="#3b2a20" transparent opacity={0.28} depthWrite={false}/></mesh>)}
      <mesh position-z={0.03}><boxGeometry args={[0.05,1.1,0.05]}/>{M('#fbf4e2')}</mesh>
      <mesh position-z={0.03}><boxGeometry args={[1.5,0.05,0.05]}/>{M('#fbf4e2')}</mesh>
      {[[-0.42,0.18,0.09],[-0.25,0.12,0.05],[0.36,-0.22,0.07]].map(([x,y,w],i)=>
        <mesh key={'g'+i} position={[x,y,0.012]} rotation-z={-0.75}><planeGeometry args={[w,0.5]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.22} depthWrite={false} toneMapped={false}/></mesh>)}
      {[-1,1].map(k=><group key={k}><mesh position={[k*0.98,-0.05,0.06]}><boxGeometry args={[0.36,1.5,0.05]}/>{M('#e8a5a0')}</mesh>
        <mesh position={[k*0.98,-0.35,0.09]}><boxGeometry args={[0.38,0.06,0.03]}/>{M('#c97a6e')}</mesh></group>)}
      <mesh position={[0,0.72,0.1]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.02,0.02,2.4,8]}/>{M('#8a6448')}</mesh>
      <mesh position={[0,-0.62,0.1]}><boxGeometry args={[1.8,0.06,0.22]}/>{M('#f4eedf')}</mesh>
      <group position={[0.45,-0.55,0.12]}><mesh position-y={0.07}><cylinderGeometry args={[0.07,0.055,0.13,12]}/>{M('#c27a55')}</mesh>
        {[0,1,2].map(i=><mesh key={i} position={[(i-1)*0.04,0.2,0]}><sphereGeometry args={[0.06,10,8]}/>{M(i===1?'#f48fb8':'#6db24f')}</mesh>)}</group>
    </group>
    {/* a wood stove on the left wall, with logs */}
    <Stove position={[LEFT+0.5,0,-0.4]}/>
    {/* the sofa along the right wall, with cushions and a throw */}
    <group position={[RIGHT-0.55,0,1.7]} rotation-y={-Math.PI/2}>
      <mesh position-y={0.32} castShadow receiveShadow><boxGeometry args={[2.1,0.32,0.9]}/>{M('#5f8a7a')}</mesh>
      <mesh position={[0,0.72,-0.36]} castShadow><boxGeometry args={[2.1,0.65,0.22]}/>{M('#5f8a7a')}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*1.0,0.52,0]} castShadow><boxGeometry args={[0.2,0.5,0.9]}/>{M('#557b6d')}</mesh>)}
      {[-0.55,0,0.55].map((x,i)=><mesh key={x} position={[x,0.56,0.05]} castShadow><boxGeometry args={[0.6,0.14,0.7]}/>{M('#6f9a88')}</mesh>)}
      {[[-0.6,'#f2c94c'],[0.55,'#f4a7b9']].map(([x,c])=><mesh key={x as number} position={[x as number,0.82,-0.18]} rotation={[0.3,0,0.12]} castShadow><boxGeometry args={[0.38,0.34,0.12]}/>{M(c as string)}</mesh>)}
      <mesh position={[0.2,0.64,0.25]} rotation-x={-0.1}><boxGeometry args={[0.7,0.03,0.5]}/>{M('#e9dcc2')}</mesh>
      {[[-0.95,-0.38],[0.95,-0.38],[-0.95,0.38],[0.95,0.38]].map(([x,z],i)=><mesh key={i} position={[x,0.08,z]}><cylinderGeometry args={[0.04,0.03,0.16,8]}/>{M('#5a3d2b')}</mesh>)}
    </group>
    {/* pictures over the sofa */}
    {mats.frames.map((t,i)=><group key={i} position={[RIGHT-0.08,1.95+(i===1?0.15:0),0.95+i*0.75]} rotation-y={-Math.PI/2}>
      <mesh><boxGeometry args={[0.5,0.62,0.04]}/>{M(i===1?'#c9a23a':'#6f5040')}</mesh><mesh position-z={0.025}><planeGeometry args={[0.4,0.52]}/><meshBasicMaterial map={t}/></mesh></group>)}
    {/* a side table with a teapot and a cup, and a floor lamp */}
    <group position={[RIGHT-0.6,0,0.15]}>
      <mesh position-y={0.55} castShadow><cylinderGeometry args={[0.3,0.3,0.05,20]}/>{M('#8a5a3e')}</mesh>
      <mesh position-y={0.27}><cylinderGeometry args={[0.04,0.06,0.54,10]}/>{M('#6f5040')}</mesh>
      <group position={[-0.06,0.58,0]}><mesh position-y={0.1}><sphereGeometry args={[0.11,14,10]}/>{M('#f4eedf')}</mesh>
        <mesh position={[0.13,0.12,0]} rotation-z={-0.8}><cylinderGeometry args={[0.015,0.025,0.12,8]}/>{M('#f4eedf')}</mesh><mesh position-y={0.22}><sphereGeometry args={[0.03,8,6]}/>{M('#e8a5a0')}</mesh></group>
      <mesh position={[0.15,0.62,0.12]}><cylinderGeometry args={[0.04,0.035,0.07,12]}/>{M('#e8a5a0')}</mesh>
    </group>
    <group position={[RIGHT-0.5,0,3.0]}>
      <mesh position-y={0.02}><cylinderGeometry args={[0.16,0.18,0.04,14]}/>{M('#5a3d2b')}</mesh>
      <mesh position-y={0.8}><cylinderGeometry args={[0.02,0.02,1.6,8]}/>{M('#5a3d2b')}</mesh>
      <mesh position-y={1.65}><cylinderGeometry args={[0.16,0.26,0.3,18,1,true]}/><meshStandardMaterial color="#f6e2b8" emissive="#ffd78a" emissiveIntensity={0.5} side={THREE.DoubleSide}/></mesh>
      <pointLight position-y={1.5} intensity={1.8} distance={4} color="#ffd9a0"/>
    </group>
    {/* a clock and string lights on the back wall */}
    <group position={[RIGHT-0.09,2.45,-1.6]} rotation-y={-Math.PI/2}><mesh rotation-x={Math.PI/2}><cylinderGeometry args={[0.22,0.22,0.05,24]}/>{M('#8a6448')}</mesh>
      <mesh position-z={0.03}><circleGeometry args={[0.18,24]}/>{M('#fbf4e2')}</mesh>
      <mesh position={[0,0.05,0.04]}><boxGeometry args={[0.02,0.12,0.01]}/>{M('#3b2a20')}</mesh><mesh position={[0.04,0,0.04]} rotation-z={-1.2}><boxGeometry args={[0.015,0.09,0.01]}/>{M('#3b2a20')}</mesh></group>
    <StringLights/>
    {/* a basket of yarn and a floor cushion, front left */}
    <group position={[-3.2,0,2.4]}>
      <mesh position-y={0.15}><cylinderGeometry args={[0.24,0.2,0.3,16]}/>{M('#c9a27a')}</mesh>
      {['#e8a5a0','#8fcbe8','#f2c94c'].map((c,i)=><mesh key={c} position={[(i-1)*0.1,0.32,(i%2)*0.06]}><sphereGeometry args={[0.09,12,10]}/>{M(c)}</mesh>)}
    </group>
    {/* a hanging plant by the window */}
    <group position={[LEFT+0.45,H-0.15,-1.9]}><mesh position-y={-0.3}><cylinderGeometry args={[0.005,0.005,0.6,4]}/>{M('#5a3d2b')}</mesh>
      <mesh position-y={-0.66}><cylinderGeometry args={[0.13,0.1,0.14,12]}/>{M('#f4eedf')}</mesh>
      {Array.from({length:6},(_,i)=><mesh key={i} position={[Math.cos(i)*0.12,-0.75-(i%3)*0.12,Math.sin(i)*0.12]}><sphereGeometry args={[0.06,8,6]}/>{M('#4f9a45')}</mesh>)}</group>
  </group>;
}

// a proper desk chair: four legs, a seat with a cushion, a slatted back
export function DeskChair({position,rotY=0}:{position:[number,number,number];rotY?:number}){
  return <group position={position} rotation-y={rotY}>
    {[[-0.24,-0.22],[0.24,-0.22],[-0.24,0.22],[0.24,0.22]].map(([x,z],i)=><mesh key={i} position={[x,0.24,z]} castShadow><boxGeometry args={[0.05,0.48,0.05]}/>{M('#6f5040')}</mesh>)}
    <mesh position-y={0.5} castShadow><boxGeometry args={[0.56,0.05,0.52]}/>{M('#a77d58')}</mesh>
    <mesh position-y={0.55}><boxGeometry args={[0.48,0.05,0.44]}/>{M('#c56a5a')}</mesh>
    {[-0.24,0.24].map(x=><mesh key={x} position={[x,0.85,0.23]} castShadow><boxGeometry args={[0.05,0.7,0.05]}/>{M('#6f5040')}</mesh>)}
    {[0.75,0.9,1.05].map(y=><mesh key={y} position={[0,y,0.23]}><boxGeometry args={[0.5,0.06,0.03]}/>{M('#a77d58')}</mesh>)}
  </group>;
}
