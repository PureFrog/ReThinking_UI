'use client';
// The wider map round the first garden (places.ts): the stream with its bridge, the dirt paths as stepping stones,
// the forest ring at the edge, the case library up the north path and the league square across the stream.
// Everything is code-made primitives on the shared soft material, instanced where there are many.
import {Halo,GlowPool} from './VillageLamps';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {MODELS} from './models';
import * as THREE from 'three';
import {OnGround,surfaceY,tiltAt,rng,UP} from './ground';
import {PATHS,PLACES,STREAM,BRIDGE,streamZ,WORLD} from './places';
import {soft} from './materials';
import {LOOK} from './look';
import {mixHex} from '../core/daylight';
import {riverMaterial,RiverBanks} from './VillageNature';
import {planks as plankTex,tmat} from './surfaces';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const click=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};
const M=()=>LOOK.map;

// a ribbon laid on the sphere along the stream, `half` wide either side of its middle line
function ribbon(half:number,lift:number){
  const pos:number[]=[],idx:number[]=[],uv:number[]=[];let n=0;
  for(let x=STREAM.from;x<=STREAM.to;x+=0.5){const zc=streamZ(x);
    for(const s of [-1,1]){const z=zc+s*half;pos.push(x,surfaceY(x,z)+lift,z);uv.push((x-STREAM.from)/1.6,s<0?0:1)}
    if(n>0){const a=(n-1)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}n++}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function Stream({dim=0}:{dim?:number}){
  const water=useMemo(()=>ribbon(STREAM.half,0.07),[]),bank=useMemo(()=>ribbon(STREAM.half+STREAM.bank,0.035),[]);
  useLayoutEffect(()=>()=>{water.dispose();bank.dispose()},[water,bank]);
  // 피드백 2026-11-26 "강이 재미없어": flowing water (ripples drifting downstream, glints, a foam line at the banks), a
  // sandy bank, pebbles, reeds and rocks along it (VillageNature)
  const mat=useMemo(()=>riverMaterial(M().water,'#8fd0f0'),[]);useEffect(()=>()=>mat.dispose(),[mat]);
  useEffect(()=>{mat.uniforms.deep.value.set(mixHex(M().water,'#13284a',dim));mat.uniforms.light.value.set(mixHex('#8fd0f0','#2a4468',dim))},[dim,mat]);
  useFrame(({clock})=>{mat.uniforms.t.value=clock.elapsedTime});
  return <group name="stream">
    <mesh geometry={bank} receiveShadow><meshStandardMaterial color={mixHex('#d9c69a','#4a4636',dim)} roughness={1} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={water}><primitive object={mat} attach="material"/></mesh>
    <RiverBanks zAt={streamZ} from={STREAM.from} to={STREAM.to} half={STREAM.half}/>
  </group>;
}
// the wooden bridge: planks over an arch, a rail each side
export function Bridge(){
  const zc=streamZ(BRIDGE.x),planks=14,len=BRIDGE.half*2;
  const wood=useMemo(()=>({a:tmat(plankTex([160,110,72]),0.6,0.2),b:tmat(plankTex([140,96,62]),0.6,0.2)}),[]);
  return <OnGround x={BRIDGE.x} z={zc}><group name="bridge">
    {Array.from({length:planks},(_,i)=>{const t=i/(planks-1),z=-len/2+t*len,y=0.18+0.42*Math.sin(Math.PI*t);
      return <mesh key={i} position={[0,y,z]} rotation-x={Math.cos(Math.PI*t)*0.42*-0.9} rotation-y={(i%3-1)*0.02} castShadow receiveShadow material={i%2?wood.a:wood.b}><boxGeometry args={[1.5+(i%2)*0.06,0.09,len/planks*0.92]}/></mesh>})}
    {/* 피드백 2026-11-26 "다리 퀄리티": stringers under the planks, rope rails swung between posts, lanterns on the end posts */}
    {[-0.6,0.6].map(x=>Array.from({length:10},(_,i)=>{const t0=i/10,t1=(i+1)/10,z0=-len/2+t0*len,z1=-len/2+t1*len,y0=0.08+0.42*Math.sin(Math.PI*t0),y1=0.08+0.42*Math.sin(Math.PI*t1);
      return <mesh key={x+'s'+i} position={[x,(y0+y1)/2,(z0+z1)/2]} rotation-x={-Math.atan2(y1-y0,z1-z0)}><boxGeometry args={[0.12,0.14,Math.hypot(z1-z0,y1-y0)+0.02]}/>{S('#6b4a32')}</mesh>}))}
    {[-0.72,0.72].map(x=>[-1,1].map(e=><group key={x+'l'+e} position={[x,0.18+0.7,e*len/2]}>
      <mesh position-y={0.05}><boxGeometry args={[0.04,0.04,0.18]}/>{S('#2f2a28')}</mesh>
      <mesh position={[0,-0.08,e*0.08]}><boxGeometry args={[0.13,0.17,0.13]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.2} toneMapped={false}/></mesh></group>))}
    {[-0.72,0.72].map(x=><group key={x}>
      {[0,0.25,0.5,0.75,1].map(t=>{const z=-len/2+t*len,y=0.18+0.42*Math.sin(Math.PI*t);return <mesh key={t} position={[x,y+0.32,z]} castShadow><cylinderGeometry args={[0.05,0.06,0.62,8]}/>{S(M().rail)}</mesh>})}
      {Array.from({length:8},(_,i)=>{const t0=i/8,t1=(i+1)/8,z0=-len/2+t0*len,z1=-len/2+t1*len,y0=0.6+0.42*Math.sin(Math.PI*t0),y1=0.6+0.42*Math.sin(Math.PI*t1);
        return <mesh key={i} position={[x,(y0+y1)/2,(z0+z1)/2]} rotation-x={-Math.atan2(y1-y0,z1-z0)-Math.sin(((i%2)+0.5)*Math.PI)*0.0} castShadow><cylinderGeometry args={[0.03,0.03,Math.hypot(z1-z0,y1-y0)+0.02,8]}/>{S('#c9a878')}</mesh>})}
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
    stones.forEach((st,i)=>{o.position.set(st.x,surfaceY(st.x,st.z)+0.02,st.z);o.quaternion.copy(tiltAt(st.x,st.z)).multiply(new THREE.Quaternion().setFromAxisAngle(UP,st.a));o.scale.set(st.s*1.25,0.07,st.s);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true},[stones]);
  // 피드백 2026-11-26 "돌 주변으로 흙이 조금 보이게": a worn patch of dirt under each stone
  const dirt=useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(()=>{const m=dirt.current;if(!m)return;const o=new THREE.Object3D();
    stones.forEach((st,i)=>{o.position.set(st.x,surfaceY(st.x,st.z)+0.008,st.z);o.quaternion.copy(tiltAt(st.x,st.z)).multiply(new THREE.Quaternion().setFromAxisAngle(UP,st.a+0.7));o.scale.set(st.s*2.0,0.01,st.s*1.6);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true},[stones]);
  return <group>
    <instancedMesh ref={dirt} args={[undefined,undefined,stones.length]} receiveShadow><cylinderGeometry args={[1,1,1,10]}/><primitive object={soft('#c4a57c')} attach="material"/></instancedMesh>
    <instancedMesh ref={ref} args={[undefined,undefined,stones.length]} receiveShadow castShadow>
    <cylinderGeometry args={[1,1,1,12]}/><primitive object={soft(M().stone)} attach="material"/></instancedMesh></group>;
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

// 거장의 집 (2026-11-23, a teammate's model: the master's head as a house): north-west of the cottage, facing the middle.
// The file is about 0.9 wide, 0.58 high and 1 deep; MASTER_SIZE scales it to the village. A tap says where the master is met.
export const MASTER_SIZE=6.2;
export function MasterHouse({onPick,night=0}:{onPick:()=>void;night?:number}){
  const p=PLACES.find(x=>x.id==='master')!;
  const {scene}=useGLTF(MODELS.masterHouse);
  const obj=useMemo(()=>{const o=scene.clone(true);o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
    // the model came with a glass-like volume material: drawn as plain lit paint so it sits with the rest of the village
    const mat=m.material as THREE.MeshPhysicalMaterial;if(mat&&'transmission' in mat){mat.transmission=0;mat.thickness=0}}});return o},[scene]);
  return <OnGround x={p.x} z={p.z} rot={p.rot}><group onClick={click(onPick)} name="master-house">
    <primitive object={obj} scale={MASTER_SIZE} position-y={-0.05}/>
    {/* 피드백 2026-11-26 "눈 부분이 창문인데 빛이 안 비친다": the two lenses glow like lit windows (where the yellow lenses are
        in the model, master_house.glb), a halo round each, warm light spilling onto the face and the ground in front */}
    <group scale={MASTER_SIZE} position-y={-0.05}>
      {[-1,1].map(sd=><group key={sd} position={[sd*0.074,0.312,0.142]}>
        <mesh scale={[1,0.72,1]}><circleGeometry args={[0.066,28]}/><meshStandardMaterial color="#ffe7a8" emissive="#ffb347" emissiveIntensity={0.5+night*2.6} toneMapped={false} transparent opacity={0.92} side={THREE.DoubleSide}/></mesh>
        {[-1,1].map(k=><mesh key={k} position={[0,k*0.012,0.002]} scale={[1,0.72,1]}><planeGeometry args={[0.12,0.004]}/><meshBasicMaterial color="#5a3a1c"/></mesh>)}
      </group>)}
    </group>
    {[-1,1].map(sd=><Halo key={sd} at={[sd*0.074*MASTER_SIZE,0.312*MASTER_SIZE-0.05,0.142*MASTER_SIZE+0.1]} size={1.6} color="#ffc070" k={night}/>)}
    <pointLight position={[0,1.2,2.6]} color="#ffb35c" intensity={night*5} distance={6} decay={1.8}/>
    <group position={[0,0,2.4]}><GlowPool r={2.6} color="#ffb35c" k={night*0.9}/></group>
    {/* an easier thing to tap */}
    <mesh position={[0,1.8,0]} visible={false}><boxGeometry args={[5.6,3.6,6.2]}/></mesh>
  </group></OnGround>;
}
useGLTF.preload(MODELS.masterHouse);

// 리그 광장 → a mini stadium (피드백 2026-11-26 "리그 분위기가 안 산다"): a little pitch with its lines and a running track,
// three tiers of benches round it in this week's group colours (open toward the path), a flag per group member on the
// rim (mine taller with a gold star), four floodlight towers, a lit scoreboard and an entrance arch with bunting.
// Local -z faces the path (the walk-in point).
function boardTex(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=256;const g=cv.getContext('2d')!;
  g.fillStyle='#14202a';g.fillRect(0,0,512,256);g.strokeStyle='#ffd447';g.lineWidth=8;g.strokeRect(6,6,500,244);
  g.fillStyle='#ffd447';g.font='bold 46px "Jua",sans-serif';g.textAlign='center';g.fillText('리그 광장',256,64);
  g.fillStyle='#8cf07a';g.font='26px "Jua",sans-serif';g.fillText('이번 주 판단 점수',256,104);
  g.font='bold 30px monospace';['1  ■■■■■■■■','2  ■■■■■■■','3  ■■■■■■','4  ■■■■■'].forEach((t,k)=>{g.fillStyle=k===0?'#ffd447':'#e8f6ff';g.textAlign='left';g.fillText(t,140,148+k*28)});
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function Plaza({onPick,flags,me}:{onPick:()=>void;flags:string[];me:number}){
  const p=PLACES.find(x=>x.id==='plaza')!,wave=useRef<(THREE.Mesh|null)[]>([]);
  useFrame(({clock})=>{const t=clock.elapsedTime;wave.current.forEach((m,i)=>{if(m){m.rotation.y=Math.sin(t*2.2+i)*0.35;m.scale.x=0.9+Math.sin(t*3+i*1.3)*0.1}})});
  const board=useMemo(boardTex,[]);useEffect(()=>()=>board.dispose(),[board]);
  const team=flags.length?flags:['#c44b3b','#3f6fa8','#d9a441','#4f8a5b'];
  // the stands: an arc from +40° round to the far side and back to -40° (the gap faces the path at -z)
  const OPEN=0.75,arc=(n:number)=>Array.from({length:n},(_,k)=>-Math.PI/2+OPEN+k*(Math.PI*2-2*OPEN)/(n-1));
  return <OnGround x={p.x} z={p.z}><group onClick={click(onPick)} name="plaza">
    {/* the pitch, its lines, the track round it */}
    <mesh rotation-x={-Math.PI/2} position-y={0.03} receiveShadow><circleGeometry args={[2.6,48]}/><meshStandardMaterial color="#b5543e" roughness={1}/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={0.04} receiveShadow><circleGeometry args={[2.15,48]}/><meshStandardMaterial color="#5fa548" roughness={1}/></mesh>
    {Array.from({length:6},(_,k)=><mesh key={k} rotation-x={-Math.PI/2} position-y={0.045}><ringGeometry args={[0.3+k*0.31,0.45+k*0.31,48]}/><meshStandardMaterial color="#6db24f" roughness={1}/></mesh>)}
    <mesh rotation-x={-Math.PI/2} position-y={0.05}><ringGeometry args={[0.5,0.56,40]}/><meshBasicMaterial color="#f4f4ee"/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={0.05}><planeGeometry args={[4.1,0.05]}/><meshBasicMaterial color="#f4f4ee"/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={0.05}><ringGeometry args={[2.08,2.13,64]}/><meshBasicMaterial color="#f4f4ee"/></mesh>
    {[2.3,2.45].map(r=><mesh key={r} rotation-x={-Math.PI/2} position-y={0.035}><ringGeometry args={[r,r+0.02,64]}/><meshBasicMaterial color="#f2d7c8"/></mesh>)}
    {/* three tiers of benches, sections in the group's colours */}
    {[0,1,2].map(tier=>arc(26).map((a,k)=>{const r=2.95+tier*0.42,y=0.18+tier*0.3;const c=team[Math.floor(k/5)%team.length];
      return <group key={tier+'-'+k} position={[Math.cos(a)*r,0,Math.sin(a)*r]} rotation-y={-a+Math.PI/2}>
        <mesh position-y={y/2} castShadow receiveShadow><boxGeometry args={[0.6,y,0.4]}/>{S('#d9d2c4')}</mesh>
        <mesh position-y={y+0.04}><boxGeometry args={[0.56,0.08,0.3]}/>{S(c)}</mesh></group>}))}
    {/* the rim wall behind the top tier */}
    {arc(26).map((a,k)=><mesh key={'w'+k} position={[Math.cos(a)*4.25,0.55,Math.sin(a)*4.25]} rotation-y={-a+Math.PI/2} castShadow><boxGeometry args={[0.62,1.1,0.12]}/>{S('#a77d58')}</mesh>)}
    {/* a flag per group member on the rim (mine taller, with a gold star) */}
    {team.map((c,i)=>{const a=arc(team.length+2)[i+1],r=4.25,h=i===me?2.8:2.3;
      return <group key={'f'+i} position={[Math.cos(a)*r,0,Math.sin(a)*r]}>
        <mesh position-y={h/2} castShadow><cylinderGeometry args={[0.035,0.045,h,6]}/>{S('#d9d2c4')}</mesh>
        <mesh ref={el=>{wave.current[i]=el}} position={[0,h-0.28,0.36]}><boxGeometry args={[0.03,0.46,0.72]}/>{S(c)}</mesh>
        {i===me&&<mesh position-y={h+0.1}><sphereGeometry args={[0.09,10,8]}/><meshStandardMaterial color="#ffe08a" emissive="#ffb400" emissiveIntensity={1.4} toneMapped={false}/></mesh>}
      </group>})}
    {/* four floodlight towers */}
    {[0.25,0.75,1.25,1.75].map(f=>{const a=f*Math.PI,x=Math.cos(a)*4.7,z=Math.sin(a)*4.7;
      return <group key={f} position={[x,0,z]} rotation-y={-a-Math.PI/2}>
        <mesh position-y={1.9} castShadow><cylinderGeometry args={[0.06,0.1,3.8,8]}/>{S('#7a8088')}</mesh>
        <mesh position={[0,3.85,0.1]} rotation-x={-0.4}><boxGeometry args={[0.7,0.45,0.1]}/>{S('#5c626a')}</mesh>
        {[-0.2,0,0.2].map(dx=>[0.1,-0.1].map(dy=><mesh key={dx+'-'+dy} position={[dx,3.85+dy,0.16]} rotation-x={-0.4}><circleGeometry args={[0.07,12]}/><meshBasicMaterial color="#fffbe0" toneMapped={false}/></mesh>))}
      </group>})}
    {/* the scoreboard on the far side */}
    <group position={[0,0,4.55]} rotation-y={Math.PI}>
      {[-0.95,0.95].map(x=><mesh key={x} position={[x,1.3,0]} castShadow><boxGeometry args={[0.14,2.6,0.14]}/>{S('#5c626a')}</mesh>)}
      <mesh position={[0,2.35,0]} castShadow><boxGeometry args={[2.3,1.2,0.14]}/>{S('#2a2f36')}</mesh>
      <mesh position={[0,2.35,0.08]}><planeGeometry args={[2.1,1.05]}/><meshBasicMaterial map={board} toneMapped={false}/></mesh>
    </group>
    {/* the entrance arch with bunting, toward the path */}
    <group position={[0,0,-3.3]}>
      {[-0.9,0.9].map(x=><mesh key={x} position={[x,1.1,0]} castShadow><boxGeometry args={[0.22,2.2,0.22]}/>{S('#a77d58')}</mesh>)}
      <mesh position={[0,2.3,0]} castShadow><boxGeometry args={[2.3,0.36,0.26]}/>{S('#4f6b5a')}</mesh>
      {Array.from({length:9},(_,k)=><mesh key={k} position={[-0.8+k*0.2,1.98-Math.sin(k/8*Math.PI)*0.12,0.02]} rotation-z={Math.PI}><coneGeometry args={[0.07,0.16,3]}/>{S(team[k%team.length])}</mesh>)}
    </group>
    <mesh position-y={1.2} visible={false}><cylinderGeometry args={[4.4,4.4,2.6,16]}/></mesh>
  </group></OnGround>;
}

// 오락실 (피드백 2026-11-24 "왼쪽 리그광장 오른쪽 오락실", a teammate's model): over the bridge, right of the split, its
// door turned to the path. The file is 1 wide, 0.49 high, 0.91 deep (steps and stones in front); ARCADE_SIZE scales it.
export const ARCADE_SIZE=5.2;
export function ArcadeHouse({onPick,night=0}:{onPick:()=>void;night?:number}){
  const p=PLACES.find(x=>x.id==='arcade')!;
  const {scene}=useGLTF(MODELS.arcade);
  const obj=useMemo(()=>{const o=scene.clone(true);o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
    const mat=m.material as THREE.MeshPhysicalMaterial;if(mat&&'transmission' in mat){mat.transmission=0;mat.thickness=0}}});return o},[scene]);
  return <><OnGround x={p.x} z={p.z} rot={p.rot}><group onClick={click(onPick)} name="arcade">
    <primitive object={obj} scale={ARCADE_SIZE} position-y={-0.03}/>
    <mesh position={[0,1.4,-0.2]} visible={false}><boxGeometry args={[5.2,2.8,4.2]}/></mesh>
    {/* 피드백 2026-11-26 "오락실도 밤되면 너무 어두워": light spills out the front (pink and blue like the screens inside) */}
    <pointLight position={[0,1.6,3]} color="#ff7ad9" intensity={night*7} distance={7} decay={1.6}/>
    <group position={[0,0,3]}><GlowPool r={3} color="#c46bff" k={night*0.8}/></group>
  </group></OnGround>
  <ArcadeNeon night={night}/></>;
}
useGLTF.preload(MODELS.arcade);
// a neon sign by the arcade's path: "오락실" in pink tubes with a blue border, a row of chasing bulbs, on two posts
function neonTex(){const c=document.createElement('canvas');c.width=512;c.height=220;const g=c.getContext('2d')!;
  g.fillStyle='#1b1030';g.beginPath();g.roundRect(6,6,500,208,34);g.fill();
  g.lineWidth=10;g.strokeStyle='#49c9ff';g.shadowColor='#49c9ff';g.shadowBlur=24;g.beginPath();g.roundRect(20,20,472,180,26);g.stroke();
  g.font='bold 118px "Jua",sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ff4fc8';g.shadowBlur=30;g.fillStyle='#ff9be3';g.fillText('오락실',256,104);
  g.shadowBlur=0;g.font='bold 30px "Jua",sans-serif';g.fillStyle='#ffe066';g.fillText('★ GAME ★',256,178);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function ArcadeNeon({night}:{night:number}){
  const p=PLACES.find(x=>x.id==='arcade')!,tex=useMemo(neonTex,[]),bulbs=useRef<(THREE.MeshStandardMaterial|null)[]>([]);
  useEffect(()=>()=>tex.dispose(),[tex]);
  useFrame(({clock})=>{const t=Math.floor(clock.elapsedTime*6);bulbs.current.forEach((m,i)=>{if(m)m.emissiveIntensity=((i+t)%3===0?2.6:0.5)*(0.35+night)})});
  // beside the walk point, on the side away from the path, turned to face the way in
  const dx=p.walk.x-p.x,dz=p.walk.z-p.z,d=Math.hypot(dx,dz)||1,x=p.walk.x+dx/d*0.6-dz/d*1.9,z=p.walk.z+dz/d*0.6+dx/d*1.9,rot=Math.atan2(dx,dz);
  return <OnGround x={x} z={z} rot={rot}><group name="arcade-neon">
    {[-0.85,0.85].map(sx=><mesh key={sx} position={[sx,0.9,0]} castShadow><cylinderGeometry args={[0.05,0.06,1.8,8]}/><meshStandardMaterial color="#2c2540"/></mesh>)}
    <mesh position={[0,1.95,0.02]}><planeGeometry args={[2.0,0.86]}/><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.35+night*1.3} toneMapped={false} side={THREE.DoubleSide}/></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[-0.92+i*(1.84/11),2.48,0.03]}><sphereGeometry args={[0.045,8,6]}/>
      <meshStandardMaterial ref={m=>{bulbs.current[i]=m}} color="#fff1b0" emissive="#ffd447" toneMapped={false}/></mesh>)}
    <Halo at={[0,1.95,0.4]} size={3.2} color="#ff6bd6" k={night*0.7}/>
    <GlowPool r={2.4} color="#ff6bd6" k={night*0.8}/>
  </group></OnGround>;
}
