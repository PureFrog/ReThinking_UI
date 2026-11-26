'use client';
// 버핏 (피드백 2026-11-26 "블록 같은 머리, 부자연스러운 무릎, 팔이 의자를 관통, 옷의 가로줄 두 개"): his own figure, built
// in the armchair's units (cushion top 0.44, armrest tops 0.75 at x ±0.47, the back's front face at z -0.28). Round head,
// thin white hair, heavy brows, round glasses; a navy pinstripe suit with lapels, a striped shirt and collar, a red tie;
// thighs over the cushion, knees past its front edge, shins down to real oxford shoes. His forearms rest ON the armrests
// (nothing passes through the chair). headRef turns and nods the head only.
import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {soft} from '../materials';

type V=[number,number,number];
function tex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void,rep:[number,number]){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...rep);t.anisotropy=4;return t;
}
function noise(g:CanvasRenderingContext2D,w:number,h:number,a:number){for(let i=0;i<w*h/3;i++){g.fillStyle=Math.random()<0.5?`rgba(255,255,255,${a})`:`rgba(0,0,0,${a})`;g.fillRect(Math.random()*w,Math.random()*h,1,1)}}
// a wool suit: navy, a fine twill and chalk pinstripes
const suitTex=(base:string)=>tex(64,64,g=>{g.fillStyle=base;g.fillRect(0,0,64,64);
  for(let i=-64;i<64;i+=3){g.strokeStyle='rgba(255,255,255,0.035)';g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke()}
  noise(g,64,64,0.05);g.fillStyle='rgba(220,225,240,0.16)';for(let x=4;x<64;x+=16)g.fillRect(x,0,1,64)},[6,3]);
const shirtTex=()=>tex(32,32,g=>{g.fillStyle='#f6f8fb';g.fillRect(0,0,32,32);g.fillStyle='#b9cbe3';for(let x=0;x<32;x+=4)g.fillRect(x,0,1,32)},[3,3]);
const tieTex=(base:string)=>tex(64,64,g=>{g.fillStyle=base;g.fillRect(0,0,64,64);g.strokeStyle='#e8c46a';g.lineWidth=3;
  for(let i=-64;i<128;i+=14){g.beginPath();g.moveTo(i,0);g.lineTo(i-64,64);g.stroke()}g.strokeStyle='#2f3a52';g.lineWidth=2;
  for(let i=-60;i<128;i+=14){g.beginPath();g.moveTo(i,0);g.lineTo(i-64,64);g.stroke()}noise(g,64,64,0.05)},[3,3]);
const leatherTex=()=>tex(64,64,g=>{const s=g.createLinearGradient(0,0,64,64);s.addColorStop(0,'#5a3220');s.addColorStop(1,'#3b2014');g.fillStyle=s;g.fillRect(0,0,64,64);noise(g,64,64,0.06);
  g.fillStyle='rgba(255,230,200,0.18)';g.fillRect(10,8,30,6)},[1,1]);

// a capsule from a to b
function Limb({a,b,r,m}:{a:V;b:V;r:number;m:THREE.Material}){
  const {pos,q,len}=useMemo(()=>{const A=new THREE.Vector3(...a),Bv=new THREE.Vector3(...b),d=Bv.clone().sub(A);
    return {pos:A.clone().add(Bv).multiplyScalar(0.5),q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()),len:d.length()}},[a,b]);
  return <mesh position={pos} quaternion={q} castShadow><capsuleGeometry args={[r,Math.max(0.001,len),8,16]}/><primitive object={m} attach="material"/></mesh>;
}
const P=(m:THREE.Material)=><primitive object={m} attach="material"/>;

export function BuffettFigure({headRef,colors}:{headRef:React.RefObject<THREE.Group|null>;colors:{suit:string;tie:string;skin:string}}){
  const m=useMemo(()=>{
    const suit=new THREE.MeshStandardMaterial({map:suitTex(colors.suit),roughness:0.85}),
      shirt=new THREE.MeshStandardMaterial({map:shirtTex(),roughness:0.7}),tie=new THREE.MeshStandardMaterial({map:tieTex(colors.tie),roughness:0.45,side:THREE.DoubleSide}),
      shoe=new THREE.MeshStandardMaterial({map:leatherTex(),roughness:0.35,metalness:0.05});
    return {suit,shirt,tie,shoe,lapel:new THREE.MeshStandardMaterial({color:'#263049',roughness:0.5}),skin:soft(colors.skin),blush:new THREE.MeshBasicMaterial({color:'#f2a39a',transparent:true,opacity:0.55}),
      hair:new THREE.MeshStandardMaterial({color:'#f2f1ec',roughness:0.95}),frame:new THREE.MeshStandardMaterial({color:'#1b1714',roughness:0.3}),lens:new THREE.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:0.18,roughness:0.05}),
      eye:new THREE.MeshBasicMaterial({color:'#231a14'}),shine:new THREE.MeshBasicMaterial({color:'#ffffff'}),sole:soft('#2a1a12'),sock:soft('#1f2433'),
      button:new THREE.MeshStandardMaterial({color:'#1a1a1a',roughness:0.3}),lace:soft('#2b1a10'),mouth:new THREE.MeshBasicMaterial({color:'#8a4a3a'}),white:soft('#ffffff')}},[colors]);
  useEffect(()=>()=>{Object.values(m).forEach(x=>{(x as THREE.MeshStandardMaterial).map?.dispose();x.dispose()})},[m]);
  // the jacket's body: a lathe (round shoulders, a little belly), flattened front to back
  const torso=useMemo(()=>new THREE.LatheGeometry([[0,0],[0.2,0],[0.245,0.1],[0.255,0.28],[0.245,0.42],[0.215,0.53],[0.13,0.6],[0.06,0.625],[0,0.63]].map(([x,y])=>new THREE.Vector2(x,y)),32),[]);
  const tieGeo=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-0.022,0);s.lineTo(0.022,0);s.lineTo(0.016,-0.04);s.lineTo(0.042,-0.3);s.lineTo(0,-0.345);s.lineTo(-0.042,-0.3);s.lineTo(-0.016,-0.04);s.closePath();
    return new THREE.ExtrudeGeometry(s,{depth:0.012,bevelEnabled:true,bevelThickness:0.004,bevelSize:0.004,bevelSegments:2})},[]);
  const vee=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-0.085,0);s.lineTo(0.085,0);s.lineTo(0,-0.26);s.closePath();return new THREE.ShapeGeometry(s)},[]);
  useEffect(()=>()=>{torso.dispose();tieGeo.dispose();vee.dispose()},[torso,tieGeo,vee]);
  const Y0=0.47,Z=-0.05;// hips on the cushion, the body's middle in front of the chair back
  return <group name="buffett-figure">
    {/* jacket body (back at z -0.25, clear of the chair back) */}
    <mesh geometry={torso} position={[0,Y0,Z]} scale={[1,1,0.78]} castShadow>{P(m.suit)}</mesh>
    {/* shirt front and tie in the jacket's V, lapels either side */}
    <group position={[0,Y0+0.5,Z+0.17]} rotation-x={-0.32}>
      <mesh geometry={vee} position-z={0.012}>{P(m.shirt)}</mesh>
      <mesh geometry={tieGeo} position={[0,0.005,0.014]} castShadow>{P(m.tie)}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.075,-0.12,0.006]} rotation-z={k*0.33}><boxGeometry args={[0.055,0.3,0.014]}/>{P(m.lapel)}</mesh>)}
      {[-1,1].map(k=><mesh key={'c'+k} position={[k*0.035,0.0,0.024]} rotation-z={k*0.5}><boxGeometry args={[0.035,0.05,0.008]}/>{P(m.white)}</mesh>)}
    </group>
    {/* buttons and a pocket square */}
    {[0.2,0.1].map(y=><mesh key={y} position={[0.012,Y0+y,Z+0.198]}><sphereGeometry args={[0.012,10,8]}/>{P(m.button)}</mesh>)}
    <mesh position={[-0.13,Y0+0.36,Z+0.19]} rotation-x={-0.2}><boxGeometry args={[0.07,0.025,0.01]}/>{P(m.white)}</mesh>
    {/* neck and head */}
    <mesh position={[0,Y0+0.66,Z+0.01]}><cylinderGeometry args={[0.06,0.07,0.1,16]}/>{P(m.skin)}</mesh>
    <mesh position={[0,Y0+0.64,Z+0.01]}><torusGeometry args={[0.072,0.018,8,20]} />{P(m.white)}</mesh>
    <group ref={headRef} position={[0,Y0+0.9,Z+0.02]}>
      <mesh scale={[1,1.04,0.97]} castShadow><sphereGeometry args={[0.215,32,24]}/>{P(m.skin)}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.21,-0.01,0]} scale={[0.5,1,0.8]}><sphereGeometry args={[0.055,14,10]}/>{P(m.skin)}</mesh>)}
      {/* thin white hair: back and sides, a soft wave on top, receding at the front */}
      <mesh rotation-x={-0.35} scale={1.04}><sphereGeometry args={[0.215,32,16,0,Math.PI*2,0,Math.PI*0.42]}/>{P(m.hair)}</mesh>
      <mesh position={[0,0.02,-0.03]} scale={[1.07,1.0,1.06]}><sphereGeometry args={[0.215,32,16,Math.PI*0.62,Math.PI*1.76,Math.PI*0.28,Math.PI*0.42]}/>{P(m.hair)}</mesh>
      {[[-0.08,0.19,0.06],[0.04,0.2,0.08],[0.12,0.17,0.05]].map(([x,y,z],i)=><mesh key={i} position={[x,y,z]} scale={[1.4,0.6,1]}><sphereGeometry args={[0.05,12,8]}/>{P(m.hair)}</mesh>)}
      {/* brows, eyes, glasses */}
      {[-1,1].map(k=><mesh key={'b'+k} position={[k*0.075,0.085,0.19]} rotation-z={k*-0.15}><capsuleGeometry args={[0.012,0.05,4,8]}/>{P(m.hair)}</mesh>)}
      {[-1,1].map(k=><group key={'e'+k} position={[k*0.075,0.025,0.195]}>
        <mesh scale={[1,1.25,0.6]}><sphereGeometry args={[0.022,12,10]}/>{P(m.eye)}</mesh>
        <mesh position={[0.007,0.01,0.012]}><sphereGeometry args={[0.006,8,6]}/>{P(m.shine)}</mesh>
        <mesh position-z={0.02}><torusGeometry args={[0.058,0.009,10,28]}/>{P(m.frame)}</mesh>
        <mesh position-z={0.018}><circleGeometry args={[0.055,24]}/>{P(m.lens)}</mesh>
        <mesh position={[k*0.1,0.01,-0.08]} rotation-y={Math.PI/2}><boxGeometry args={[0.17,0.012,0.01]}/>{P(m.frame)}</mesh></group>)}
      <mesh position={[0,0.03,0.215]}><boxGeometry args={[0.035,0.01,0.01]}/>{P(m.frame)}</mesh>
      <mesh position={[0,-0.03,0.21]} scale={[1,0.9,1]}><sphereGeometry args={[0.03,14,10]}/>{P(m.skin)}</mesh>
      <mesh position={[0,-0.085,0.193]} rotation-z={Math.PI}><torusGeometry args={[0.035,0.007,6,16,Math.PI]}/>{P(m.mouth)}</mesh>
      {[-1,1].map(k=><mesh key={'c'+k} position={[k*0.12,-0.05,0.17]} rotation-y={k*0.55}><circleGeometry args={[0.03,16]}/>{P(m.blush)}</mesh>)}
    </group>
    {/* arms: shoulder → elbow on the armrest → forearm along its top → hand over the front edge */}
    {[-1,1].map(k=><group key={'a'+k}>
      <mesh position={[k*0.235,Y0+0.49,Z]} castShadow><sphereGeometry args={[0.078,16,12]}/>{P(m.suit)}</mesh>
      <Limb a={[k*0.25,Y0+0.47,Z]} b={[k*0.45,0.82,-0.08]} r={0.066} m={m.suit}/>
      <Limb a={[k*0.45,0.82,-0.08]} b={[k*0.46,0.82,0.24]} r={0.062} m={m.suit}/>
      <mesh position={[k*0.46,0.82,0.29]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.05,0.05,0.04,14]}/>{P(m.shirt)}</mesh>
      <mesh position={[k*0.46,0.81,0.35]} scale={[0.9,0.7,1.15]} castShadow><sphereGeometry args={[0.055,14,10]}/>{P(m.skin)}</mesh>
      <mesh position={[k*0.42,0.83,0.34]}><sphereGeometry args={[0.02,8,6]}/>{P(m.skin)}</mesh></group>)}
    {/* legs: thighs on the cushion, knees past the seat's front (z 0.45), shins down, oxford shoes */}
    {[-1,1].map(k=>{const x=k*0.12;return <group key={'l'+k}>
      <Limb a={[x,0.53,Z]} b={[x,0.55,0.5]} r={0.092} m={m.suit}/>
      <mesh position={[x,0.55,0.52]} castShadow><sphereGeometry args={[0.094,16,12]}/>{P(m.suit)}</mesh>
      <Limb a={[x,0.53,0.55]} b={[x,0.16,0.56]} r={0.08} m={m.suit}/>
      <mesh position={[x,0.13,0.56]}><cylinderGeometry args={[0.088,0.088,0.035,16]}/>{P(m.suit)}</mesh>
      <mesh position={[x,0.1,0.56]}><cylinderGeometry args={[0.06,0.06,0.04,12]}/>{P(m.sock)}</mesh>
      {/* the shoe: sole and heel, a rounded upper, a toe cap and laces */}
      <group position={[x,0,0.62]}>
        <mesh position={[0,0.018,0.02]} castShadow><boxGeometry args={[0.13,0.03,0.29]}/>{P(m.sole)}</mesh>
        <mesh position={[0,0.04,-0.1]}><boxGeometry args={[0.11,0.03,0.07]}/>{P(m.sole)}</mesh>
        <mesh position={[0,0.07,0.0]} scale={[0.62,0.45,1.35]} castShadow><sphereGeometry args={[0.1,20,14]}/>{P(m.shoe)}</mesh>
        <mesh position={[0,0.06,0.1]} scale={[0.6,0.4,0.55]}><sphereGeometry args={[0.1,20,14,0,Math.PI*2,0,Math.PI/2]}/>{P(m.shoe)}</mesh>
        {[0,1,2].map(i=><mesh key={i} position={[0,0.112-i*0.006,-0.03+i*0.035]} rotation-x={-0.35}><boxGeometry args={[0.06,0.005,0.008]}/>{P(m.lace)}</mesh>)}
      </group></group>})}
  </group>;
}
