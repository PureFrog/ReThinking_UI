'use client';
// W3 타임캡슐 (docs/brief-wow.md, core/capsule.ts): a judgment goes under its tree in a metal-and-glass capsule and
// is dug up when its grade arrives. Here, in the tree's own ground frame (Scene3D wraps them in OnGround):
//   Marker: the small stake left above the capsule (a glass bulb on a metal pin); once the grade has arrived, light
//   leaks out round it (a soft shaft, a glowing ring), seen from anywhere in the garden
//   CapsuleFx: the capsule itself while it is buried (drops in with a puff of soil) or dug up (rises, lid opens)
// Not a pot: the cooldown seeds (Garden3D Pot) are terracotta above the ground; these are cool metal and glass.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {TIMING} from '../core/timing';
import {LOOK} from './look';

const C=()=>LOOK.capsule;
const metal=new THREE.MeshStandardMaterial({color:'#eef3f6',metalness:0.3,roughness:0.32,emissive:'#3a4650',emissiveIntensity:0.25});
const dark=new THREE.MeshStandardMaterial({color:'#7d8892',metalness:0.6,roughness:0.35});
const easeIn=(k:number)=>k*k*k,easeOut=(k:number)=>1-Math.pow(1-k,3);
const clamp01=(k:number)=>Math.min(1,Math.max(0,k));

export function Marker({due,pop,onPick}:{due:boolean;pop:number|null;onPick:()=>void}){
  // no point light: adding or removing a light recompiles every material (a hitch on a phone); the glow is emissive + bloom
  const g=useRef<THREE.Group>(null),shaft=useRef<THREE.Mesh>(null),ring=useRef<THREE.Mesh>(null);
  const bulb=useMemo(()=>new THREE.MeshStandardMaterial({color:C().glass,transparent:true,opacity:0.8,roughness:0.08,emissive:due?C().glow:C().idle,emissiveIntensity:due?2.4:0.35,toneMapped:!due}),[due]);
  const shaftMat=useMemo(()=>new THREE.MeshBasicMaterial({color:C().glow,transparent:true,opacity:0.25,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),[]);
  const ringMat=useMemo(()=>new THREE.MeshBasicMaterial({color:C().glow,transparent:true,opacity:0.5,depthWrite:false,blending:THREE.AdditiveBlending}),[]);
  useEffect(()=>()=>{bulb.dispose();shaftMat.dispose();ringMat.dispose()},[bulb,shaftMat,ringMat]);
  useFrame(({clock})=>{const t=clock.elapsedTime;
    // it pops up once the capsule is in the ground
    if(g.current){const k=pop===null?1:clamp01((performance.now()-pop-TIMING.capsuleBury*0.72)/(TIMING.capsuleBury*0.28));
      g.current.scale.setScalar(k<1?easeOut(k)*(1+0.25*Math.sin(Math.PI*k)):1);g.current.visible=k>0}
    if(!due)return;const p=0.5+0.5*Math.sin(t*2.4);
    shaftMat.opacity=0.12+0.14*p;ringMat.opacity=0.28+0.3*p;bulb.emissiveIntensity=1.8+1.2*p;
    if(ring.current)ring.current.scale.setScalar(0.9+0.25*p)});
  const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onPick()};
  return <group ref={g} name={`capsule-marker${due?'-due':''}`}>
    <mesh position-y={0.015} material={dark}><cylinderGeometry args={[0.2,0.22,0.03,20]}/></mesh>
    <mesh position-y={0.27} material={metal} castShadow><cylinderGeometry args={[0.022,0.03,0.5,8]}/></mesh>
    <mesh position-y={0.58} material={bulb}><sphereGeometry args={[0.12,20,14]}/></mesh>
    <mesh position-y={0.49} material={metal}><cylinderGeometry args={[0.06,0.05,0.05,12]}/></mesh>
    {due&&<>
      <mesh ref={shaft} position-y={1.75} material={shaftMat}><cylinderGeometry args={[0.07,0.55,3.4,24,1,true]}/></mesh>
      <mesh ref={ring} rotation-x={-Math.PI/2} position-y={0.04} material={ringMat}><ringGeometry args={[0.25,1,36]}/></mesh>
    </>}
    {/* an easier thing to tap than the thin pin */}
    <mesh position-y={0.6} visible={false} onClick={click}><cylinderGeometry args={[0.55,0.55,1.3,10]}/></mesh>
  </group>;
}

// the capsule body: metal ends, a glass band with the memo glowing inside, a lid that swings open on its hinge
function Body({lid,glow}:{lid:React.RefObject<THREE.Group|null>;glow:THREE.MeshStandardMaterial}){
  return <group>
    <mesh material={metal} castShadow><cylinderGeometry args={[0.17,0.17,0.2,24]}/></mesh>
    <mesh position-y={-0.1} material={metal} castShadow><sphereGeometry args={[0.17,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2]}/></mesh>
    <mesh position-y={0.17} material={glow}><cylinderGeometry args={[0.175,0.175,0.14,24]}/></mesh>
    {[0.1,0.24].map(y=><mesh key={y} position-y={y} material={dark}><torusGeometry args={[0.175,0.014,8,28]} /></mesh>)}
    <group ref={lid} position={[-0.17,0.24,0]}>
      <mesh position-x={0.17} material={metal} castShadow><sphereGeometry args={[0.17,24,12,0,Math.PI*2,0,Math.PI/2]}/></mesh>
    </group>
  </group>;
}
// a puff of soil where the capsule goes in or comes out
const puffGeo=new THREE.SphereGeometry(1,8,6);
function Puff({at}:{at:number}){
  const ref=useRef<THREE.InstancedMesh>(null),o=useMemo(()=>new THREE.Object3D(),[]);
  const mat=useMemo(()=>new THREE.MeshBasicMaterial({color:LOOK.birth.dust,transparent:true,depthWrite:false}),[]);
  const parts=useMemo(()=>Array.from({length:14},(_,i)=>({a:i/14*6.28+Math.sin(i*7)*0.3,sp:0.7+((i*37)%10)/10,up:0.5+((i*53)%10)/12,s:0.06+((i*17)%5)/60})),[]);
  useEffect(()=>()=>mat.dispose(),[mat]);
  useFrame(()=>{const m=ref.current;if(!m)return;const k=(performance.now()-at)/TIMING.birthDust;if(k<0||k>1){m.visible=false;return}m.visible=true;mat.opacity=0.85*(1-k);
    parts.forEach((q,i)=>{const r=0.2+q.sp*k*1.1;o.position.set(Math.cos(q.a)*r,0.1+q.up*k*1.4-1.6*k*k,Math.sin(q.a)*r);o.scale.setScalar(q.s*(1+k*1.3));o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true});
  return <instancedMesh ref={ref} args={[puffGeo,mat,parts.length]} frustumCulled={false} visible={false}/>;
}
export function CapsuleFx({kind,t0}:{kind:'bury'|'dig';t0:number}){
  const g=useRef<THREE.Group>(null),lid=useRef<THREE.Group>(null);
  const glow=useMemo(()=>new THREE.MeshStandardMaterial({color:C().glass,transparent:true,opacity:0.85,emissive:C().memo,emissiveIntensity:0.6,toneMapped:false}),[]);
  useEffect(()=>()=>glow.dispose(),[glow]);
  useFrame(({clock})=>{const gr=g.current;if(!gr)return;const t=performance.now()-t0;
    if(kind==='bury'){const k=t/TIMING.capsuleBury;
      // shows above the tree with the memo glowing, then drops into the ground
      const s=easeOut(clamp01(k/0.18)),fall=easeIn(clamp01((k-0.4)/0.32));
      gr.position.y=1.5-2.1*fall+(fall?0:Math.sin(clock.elapsedTime*3)*0.06);gr.rotation.set(0,clock.elapsedTime*1.5*(1-fall),0.25*(1-fall));
      gr.scale.setScalar(s);gr.visible=k<0.78;glow.emissiveIntensity=1.6*(1-fall)+0.3;if(lid.current)lid.current.rotation.z=0}
    else{const k=t/TIMING.capsuleDig;
      // out of the ground with a puff, up above the tree, then the lid opens and the memo light spills
      const up=easeOut(clamp01(k/0.72)),open=easeOut(clamp01((k-0.72)/0.28));
      gr.position.y=-0.5+1.75*up+(k>1?Math.sin(clock.elapsedTime*2)*0.05:0);gr.rotation.set(0,(1-up)*4+clock.elapsedTime*0.3,0);
      gr.scale.setScalar(1);gr.visible=true;glow.emissiveIntensity=0.5+2.2*open;if(lid.current)lid.current.rotation.z=-1.9*open}});
  return <>
    <group ref={g} scale={0}><group scale={C().size}><Body lid={lid} glow={glow}/></group></group>
    <Puff at={kind==='bury'?t0+TIMING.capsuleBury*0.68:t0}/>
  </>;
}
