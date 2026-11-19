'use client';
// The wider map round the first garden (places.ts): the stream with its bridge, the dirt paths as stepping stones,
// the forest ring at the edge, the case library up the north path and the league square across the stream.
// Everything is code-made primitives on the shared soft material, instanced where there are many.
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {OnGround,surfaceY,tiltAt,rng,UP} from './ground';
import {PATHS,PLACES,STREAM,BRIDGE,streamZ,WORLD} from './places';
import {soft} from './materials';
import {LOOK} from './look';
import {mixHex} from '../core/daylight';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const click=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};
const M=()=>LOOK.map;

// a ribbon laid on the sphere along the stream, `half` wide either side of its middle line
function ribbon(half:number,lift:number){
  const pos:number[]=[],idx:number[]=[];let n=0;
  for(let x=STREAM.from;x<=STREAM.to;x+=0.5){const zc=streamZ(x);
    for(const s of [-1,1]){const z=zc+s*half;pos.push(x,surfaceY(x,z)+lift,z)}
    if(n>0){const a=(n-1)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}n++}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function Stream({dim=0}:{dim?:number}){
  const water=useMemo(()=>ribbon(STREAM.half,0.07),[]),bank=useMemo(()=>ribbon(STREAM.half+STREAM.bank,0.035),[]);
  useLayoutEffect(()=>()=>{water.dispose();bank.dispose()},[water,bank]);
  return <group name="stream">
    <mesh geometry={bank} receiveShadow><meshBasicMaterial color={mixHex(M().bank,'#4a4636',dim)} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={water}><meshBasicMaterial color={mixHex(M().water,'#13284a',dim)} side={THREE.DoubleSide}/></mesh>
  </group>;
}
// the wooden bridge: planks over an arch, a rail each side
export function Bridge(){
  const zc=streamZ(BRIDGE.x),planks=14,len=BRIDGE.half*2;
  return <OnGround x={BRIDGE.x} z={zc}><group name="bridge">
    {Array.from({length:planks},(_,i)=>{const t=i/(planks-1),z=-len/2+t*len,y=0.18+0.42*Math.sin(Math.PI*t);
      return <mesh key={i} position={[0,y,z]} rotation-x={Math.cos(Math.PI*t)*0.42*-0.9} castShadow receiveShadow><boxGeometry args={[1.5,0.09,len/planks*0.92]}/>{S(i%2?M().plank:M().plank2)}</mesh>})}
    {[-0.72,0.72].map(x=><group key={x}>
      {[0,0.25,0.5,0.75,1].map(t=>{const z=-len/2+t*len,y=0.18+0.42*Math.sin(Math.PI*t);return <mesh key={t} position={[x,y+0.32,z]} castShadow><cylinderGeometry args={[0.05,0.06,0.62,8]}/>{S(M().rail)}</mesh>})}
      {Array.from({length:8},(_,i)=>{const t0=i/8,t1=(i+1)/8,z0=-len/2+t0*len,z1=-len/2+t1*len,y0=0.6+0.42*Math.sin(Math.PI*t0),y1=0.6+0.42*Math.sin(Math.PI*t1);
        return <mesh key={i} position={[x,(y0+y1)/2,(z0+z1)/2]} rotation-x={-Math.atan2(y1-y0,z1-z0)} castShadow><boxGeometry args={[0.07,0.07,Math.hypot(z1-z0,y1-y0)+0.02]}/>{S(M().rail)}</mesh>})}
    </group>)}
  </group></OnGround>;
}
// stepping stones along the paths
export function Paths(){
  const ref=useRef<THREE.InstancedMesh>(null);
  const stones=useMemo(()=>{const r=rng(17),out:{x:number;z:number;s:number;a:number}[]=[];
    for(const line of PATHS)for(let i=1;i<line.length;i++){const [ax,az]=line[i-1],[bx,bz]=line[i],len=Math.hypot(bx-ax,bz-az),n=Math.ceil(len/0.78);
      for(let k=0;k<n;k++){const t=k/n,x=ax+(bx-ax)*t+(r()-0.5)*0.24,z=az+(bz-az)*t+(r()-0.5)*0.24;
        if(Math.abs(x-BRIDGE.x)<1&&Math.abs(z-streamZ(x))<BRIDGE.half+0.2)continue;out.push({x,z,s:0.24+r()*0.12,a:r()*6.28})}}return out},[]);
  useLayoutEffect(()=>{const m=ref.current;if(!m)return;const o=new THREE.Object3D();
    stones.forEach((st,i)=>{o.position.set(st.x,surfaceY(st.x,st.z)+0.02,st.z);o.quaternion.copy(tiltAt(st.x,st.z)).multiply(new THREE.Quaternion().setFromAxisAngle(UP,st.a));o.scale.set(st.s*1.25,0.05,st.s);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true},[stones]);
  return <instancedMesh ref={ref} args={[undefined,undefined,stones.length]} receiveShadow>
    <cylinderGeometry args={[1,1,1,12]}/><primitive object={soft(M().stone)} attach="material"/></instancedMesh>;
}
// the forest ring that closes the edge: round trees and cypresses, instanced (three draws for the lot)
export function Forest(){
  const trunks=useRef<THREE.InstancedMesh>(null),crowns=useRef<THREE.InstancedMesh>(null),spires=useRef<THREE.InstancedMesh>(null);
  const trees=useMemo(()=>{const r=rng(91),out:{x:number;z:number;s:number;spire:boolean}[]=[];let guard=0;
    while(out.length<M().forest&&guard++<2000){const a=r()*Math.PI*2,d=WORLD.walk+2.5+r()*8,x=Math.cos(a)*d,z=Math.sin(a)*d;
      // 2026-11-18 (user): the edge is all plain round trees, no teal capsule cypresses (the draw from r() stays so the spots don't move)
      if(out.some(t=>Math.hypot(t.x-x,t.z-z)<2.2))continue;const s=0.9+r()*0.7;r();out.push({x,z,s,spire:false})}return out},[]);
  const round=trees.filter(t=>!t.spire),spire=trees.filter(t=>t.spire);
  useLayoutEffect(()=>{const o=new THREE.Object3D(),c=new THREE.Color(),place=(t:{x:number;z:number},lift:number,sx:number,sy:number,sz=sx)=>{
      const q=tiltAt(t.x,t.z),up=new THREE.Vector3(0,lift,0).applyQuaternion(q);o.position.set(t.x,surfaceY(t.x,t.z),t.z).add(up);o.quaternion.copy(q);o.scale.set(sx,sy,sz);o.updateMatrix()};
    const tr=trunks.current,cr=crowns.current,sp=spires.current;if(!tr||!cr||!sp)return;
    round.forEach((t,i)=>{place(t,1.5*t.s,0.4*t.s,3*t.s);tr.setMatrixAt(i,o.matrix);
      for(let k=0;k<3;k++){const off=[[0,4.2,0,1.9],[1.1,3.6,0.4,1.4],[-1,3.7,-0.3,1.5]][k];
        const q=tiltAt(t.x,t.z),v=new THREE.Vector3(off[0]*t.s,off[1]*t.s,off[2]*t.s).applyQuaternion(q);o.position.set(t.x,surfaceY(t.x,t.z),t.z).add(v);o.scale.setScalar(off[3]*t.s);o.updateMatrix();
        cr.setMatrixAt(i*3+k,o.matrix);cr.setColorAt(i*3+k,c.set(k===0?'#6db24f':'#4f9a45'))}});
    spire.forEach((t,i)=>{place(t,2.6*t.s,0.95*t.s,1.9*t.s);sp.setMatrixAt(i,o.matrix)});
    for(const m of [tr,cr,sp]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}},[round,spire]);
  return <group name="forest">
    <instancedMesh ref={trunks} args={[undefined,undefined,round.length]} castShadow><cylinderGeometry args={[0.7,1,1,8]}/>{S('#6c5b53')}</instancedMesh>
    <instancedMesh ref={crowns} args={[undefined,undefined,round.length*3]} castShadow receiveShadow><sphereGeometry args={[1,16,12]}/>{S('#ffffff')}</instancedMesh>
    <instancedMesh ref={spires} args={[undefined,undefined,spire.length]} castShadow><capsuleGeometry args={[1,2,6,12]}/>{S('#2e7a6b')}</instancedMesh>
  </group>;
}

// one plain round tree, the same shape as the forest's (2026-11-18 user: the trees outside the fence are all plain trees,
// so the fruit trees in the fence are the stock ones). Used for the garden's starter trees (Scene3D starter()).
export function PlainTree({x,z,s=0.65}:{x:number;z:number;s?:number}){
  const yaw=(x*928.37+z*311.1)%(Math.PI*2);
  return <OnGround x={x} z={z}><group rotation-y={yaw} scale={s} name="plain-tree">
    <mesh position-y={1.5} scale={[0.4,3,0.4]} castShadow><cylinderGeometry args={[0.7,1,1,8]}/>{S('#6c5b53')}</mesh>
    {([[0,4.2,0,1.9,'#6db24f'],[1.1,3.6,0.4,1.4,'#4f9a45'],[-1,3.7,-0.3,1.5,'#4f9a45']] as const).map(([px,py,pz,r,c],i)=>
      <mesh key={i} position={[px,py,pz]} scale={r} castShadow receiveShadow><sphereGeometry args={[1,16,12]}/>{S(c)}</mesh>)}
  </group></OnGround>;
}

// 사례 서고 (2026-11-18 user: the house took its building's place): a small outdoor bookshelf beside the cottage with a
// little roof, coloured books, a lantern (bright when today's case is waiting) and the open-book sign on a post
const BOOKS=['#b8372b','#3f6fa8','#d9a441','#4f8a5b','#7a4f8f','#c46a3a','#2f5e6e','#a8413f'];
export function Library({onPick,open}:{onPick:()=>void;open:boolean}){
  const p=PLACES.find(x=>x.id==='library')!;
  return <OnGround x={p.x} z={p.z} rot={p.rot}><group onClick={click(onPick)} name="library">
    {/* the shelf: sides, back, three boards and a slanted plank roof */}
    {[-0.75,0.75].map(x=><mesh key={x} position={[x,0.85,0]} castShadow><boxGeometry args={[0.1,1.7,0.55]}/>{S('#8a5a3e')}</mesh>)}
    <mesh position={[0,0.85,-0.24]} castShadow receiveShadow><boxGeometry args={[1.5,1.7,0.06]}/>{S('#6b4130')}</mesh>
    {[0.08,0.62,1.16].map(y=><mesh key={y} position={[0,y,0]} receiveShadow><boxGeometry args={[1.5,0.07,0.55]}/>{S('#9a6b45')}</mesh>)}
    <mesh position={[0,1.82,0.05]} rotation-x={0.25} castShadow><boxGeometry args={[1.8,0.08,0.85]}/>{S('#a0523a')}</mesh>
    {/* books on the two upper boards */}
    {[0.12,0.66].flatMap((y,row)=>Array.from({length:7},(_,i)=>{const h=0.34+((i*7+row*3)%4)*0.04;
      return <mesh key={row+'-'+i} position={[-0.58+i*0.19,y+0.04+h/2,0.02]} rotation-z={i===5&&row===1?0.25:0} castShadow><boxGeometry args={[0.14,h,0.38]}/>{S(BOOKS[(i+row*3)%BOOKS.length])}</mesh>}))}
    {/* a lantern on the side */}
    <mesh position={[-0.86,1.35,0.15]}><sphereGeometry args={[0.12,12,8]}/><meshStandardMaterial color="#ffd894" emissive="#ffb347" emissiveIntensity={open?1.6:0.4} toneMapped={false}/></mesh>
    {/* the sign: an open book on a post */}
    <group position={[1.25,0,0.45]}>
      <mesh position-y={0.8} castShadow><cylinderGeometry args={[0.06,0.07,1.6,8]}/>{S('#6c5b53')}</mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*0.26,1.62,0]} rotation={[-0.3,0,s*0.28]} castShadow><boxGeometry args={[0.5,0.04,0.36]}/>{S('#f4eedf')}</mesh>)}
      <mesh position-y={1.6} rotation-x={-0.3}><boxGeometry args={[0.04,0.08,0.38]}/>{S('#b8372b')}</mesh>
    </group>
    {/* an easier thing to tap than the boards */}
    <mesh position={[-0.2,1,0.1]} visible={false}><boxGeometry args={[2.8,2.2,1.4]}/></mesh>
  </group></OnGround>;
}

// 리그 광장: a paved circle across the stream, a ring of flags (this week's group), the notice board in the middle
export function Plaza({onPick,flags,me}:{onPick:()=>void;flags:string[];me:number}){
  const p=PLACES.find(x=>x.id==='plaza')!,wave=useRef<(THREE.Mesh|null)[]>([]);
  useFrame(({clock})=>{const t=clock.elapsedTime;wave.current.forEach((m,i)=>{if(m)m.rotation.y=Math.sin(t*2+i)*0.25})});
  return <OnGround x={p.x} z={p.z}><group onClick={click(onPick)} name="plaza">
    <mesh rotation-x={-Math.PI/2} position-y={0.04} receiveShadow><circleGeometry args={[3.6,40]}/><meshBasicMaterial color={M().paving}/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={0.05}><ringGeometry args={[3.45,3.6,48]}/><meshBasicMaterial color={M().stone}/></mesh>
    {flags.map((c,i)=>{const a=i/flags.length*Math.PI*2,r=2.9,x=Math.cos(a)*r,z=Math.sin(a)*r,h=i===me?3:2.4;
      return <group key={i} position={[x,0,z]}>
        <mesh position-y={h/2} castShadow><cylinderGeometry args={[0.035,0.045,h,6]}/>{S('#6c5b53')}</mesh>
        <mesh ref={el=>{wave.current[i]=el}} position={[0,h-0.3,0.38]}><boxGeometry args={[0.04,0.5,0.8]}/>{S(c)}</mesh>
        {i===me&&<mesh position-y={h+0.08}><sphereGeometry args={[0.08,10,8]}/><meshStandardMaterial color="#ffe08a" emissive="#ffb400" emissiveIntensity={1.4} toneMapped={false}/></mesh>}
      </group>})}
    {/* the notice board: this week's ranking */}
    <group position={[0,0,0]}>
      {[-0.7,0.7].map(x=><mesh key={x} position={[x,0.8,0]} castShadow><cylinderGeometry args={[0.06,0.07,1.6,8]}/>{S('#6c5b53')}</mesh>)}
      <mesh position={[0,1.35,0]} castShadow><boxGeometry args={[1.8,1.1,0.08]}/>{S('#a77d58')}</mesh>
      <mesh position={[0,1.35,0.05]}><planeGeometry args={[1.6,0.9]}/>{S('#f4eedf')}</mesh>
      {[0,1,2,3].map(i=><mesh key={i} position={[-0.1,1.66-i*0.2,0.06]}><planeGeometry args={[1.1-i*0.12,0.05]}/>{S(i===0?'#b8372b':'#5c5447')}</mesh>)}
    </group>
    <mesh position-y={1.2} visible={false}><cylinderGeometry args={[3.6,3.6,2.6,16]}/></mesh>
  </group></OnGround>;
}
