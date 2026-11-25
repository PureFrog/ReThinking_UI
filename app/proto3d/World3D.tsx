'use client';
// The wider map round the first garden (places.ts): the stream with its bridge, the dirt paths as stepping stones,
// the forest ring at the edge, the case library up the north path and the league square across the stream.
// Everything is code-made primitives on the shared soft material, instanced where there are many.
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {useGLTF,RoundedBox} from '@react-three/drei';
import {MODELS} from './models';
import * as THREE from 'three';
import {OnGround,surfaceY,tiltAt,rng,UP} from './ground';
import {PATHS,PLACES,STREAM,BRIDGE,streamZ,WORLD} from './places';
import {soft} from './materials';
import {LOOK} from './look';
import {whenFont} from './canvasFont';
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

// 거장의 집 (2026-11-23, a teammate's model: the master's head as a house): north-west of the cottage, facing the middle.
// The file is about 0.9 wide, 0.58 high and 1 deep; MASTER_SIZE scales it to the village. A tap says where the master is met.
export const MASTER_SIZE=6.2;
export function MasterHouse({onPick}:{onPick:()=>void}){
  const p=PLACES.find(x=>x.id==='master')!;
  const {scene}=useGLTF(MODELS.masterHouse);
  const obj=useMemo(()=>{const o=scene.clone(true);o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
    // the model came with a glass-like volume material: drawn as plain lit paint so it sits with the rest of the village
    const mat=m.material as THREE.MeshPhysicalMaterial;if(mat&&'transmission' in mat){mat.transmission=0;mat.thickness=0}}});return o},[scene]);
  return <OnGround x={p.x} z={p.z} rot={p.rot}><group onClick={click(onPick)} name="master-house">
    <primitive object={obj} scale={MASTER_SIZE} position-y={-0.05}/>
    {/* an easier thing to tap */}
    <mesh position={[0,1.8,0]} visible={false}><boxGeometry args={[5.6,3.6,6.2]}/></mesh>
  </group></OnGround>;
}
useGLTF.preload(MODELS.masterHouse);

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

// 오락실 (피드백 2026-11-24 "왼쪽 리그광장 오른쪽 오락실"; 2026-11-25 "저 3D대로 안 해도 되니까 오락실 UI랑 잘 맞게"): built here
// from simple shapes in the room's own look (ui/Arcade.tsx): pink-striped walls, a cream trim, the scalloped 오락실 sign,
// a candy awning with little lights, a big joystick and three buttons on the roof, balloons by the door.
// Local +z is the front (the door), turned to the path by PLACE_AT.arcade.rot.
// 피드백 2026-11-25 "색감·느낌은 전이 나은데, 글씨체 왜 그래, 너무 각져": the warm colours of the model before
// (butter cream, terracotta, apricot, sage), every block rounded, the sign in the app's own round 'Jua'.
const AC={stripe:['#f9dcaa','#fcebcb'] as const,trim:'#fdf3e4',band:'#ec8a6c',frame:'#e57a62',glass:'#d9eef4',ink:'#c9634d',
  awning:['#ec8a6c','#fdf3e4'] as const,base:'#efd9b8',step:'#fdf3e4',peach:'#f8bb98',sage:'#b9dc9b'};
const AC_FONT="bold 118px 'Jua','Gowun Dodum','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
function arcadeTex(draw:(g:CanvasRenderingContext2D,w:number,h:number)=>void,w:number,h:number,font?:string,text=''){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d')!;draw(g,w,h);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  // the round face comes from the web font: paint again once it has loaded
  if(font)whenFont(font,text,()=>{g.clearRect(0,0,w,h);draw(g,w,h);t.needsUpdate=true});
  return t;
}
const RB=({args,r,children,...rest}:{args:[number,number,number];r:number;children:React.ReactNode}&{position?:[number,number,number]})=>
  <group {...rest}><RoundedBox args={args} radius={r} smoothness={4} castShadow receiveShadow>{children}</RoundedBox></group>;
export function ArcadeHouse({onPick}:{onPick:()=>void}){
  const p=PLACES.find(x=>x.id==='arcade')!;
  const W=3.4,D=2.6,H=2.3,Z0=-0.7;// the body: width, depth, wall height; its centre sits a little back so the door is near the path
  const fz=Z0+D/2;// the front wall
  const walls=useMemo(()=>arcadeTex((g,w,h)=>{for(let i=0;i<16;i++){g.fillStyle=AC.stripe[i%2];g.fillRect(i*w/16,0,w/16,h)}},512,256),[]);
  const sign=useMemo(()=>arcadeTex((g,w,h)=>{g.fillStyle='#fffaf0';g.beginPath();g.roundRect(8,8,w-16,h-16,(h-16)/2);g.fill();
    g.lineWidth=14;g.strokeStyle=AC.band;g.stroke();g.fillStyle=AC.ink;g.font=AC_FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillText('오락실',w/2,h/2+8);g.font='64px sans-serif';g.fillStyle='#f2c230';g.fillText('★',74,h/2+4);g.fillStyle=AC.peach;g.fillText('★',w-74,h/2+4)},640,200,AC_FONT,'오락실'),[]);
  // a window: a small arcade screen glowing inside
  const screen=useMemo(()=>arcadeTex((g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#fff4dc');gr.addColorStop(1,'#fbd3b4');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle=AC.band;g.fillRect(w*0.18,h*0.62,w*0.64,h*0.1);g.fillStyle='#8ab8e2';g.beginPath();g.arc(w*0.32,h*0.38,h*0.12,0,7);g.fill();
    g.fillStyle='#f2c230';g.beginPath();g.arc(w*0.66,h*0.34,h*0.08,0,7);g.fill();g.fillStyle=AC.sage;g.fillRect(w*0.5,h*0.44,w*0.14,h*0.1)},128,128),[]);
  useEffect(()=>()=>{walls.dispose();sign.dispose();screen.dispose()},[walls,sign,screen]);
  const blink=useRef<THREE.Mesh[]>([]);
  useFrame(({clock})=>{const t=clock.elapsedTime;blink.current.forEach((m,i)=>{if(m)(m.material as THREE.MeshBasicMaterial).color.setScalar(0.75+0.25*Math.sin(t*3+i*1.3))})});
  const scallops=9,bulbs=['#ffd27a','#fff0c2','#f8bb98','#ffd27a'];
  return <OnGround x={p.x} z={p.z} rot={p.rot}><group onClick={click(onPick)} name="arcade">
    {/* the plinth and the step up to the door */}
    <RB position={[0,0.09,Z0]} args={[W+0.3,0.18,D+0.3]} r={0.08}>{S(AC.base)}</RB>
    <RB position={[0,0.06,fz+0.45]} args={[1.5,0.12,0.6]} r={0.05}>{S(AC.step)}</RB>
    {/* the walls: pink stripes all round, a cream trim at the foot and the top */}
    <RB position={[0,0.18+H/2,Z0]} args={[W,H,D]} r={0.32}><meshLambertMaterial map={walls} emissive="#ffffff" emissiveMap={walls} emissiveIntensity={0.18}/></RB>
    <RB position={[0,0.32,Z0]} args={[W+0.1,0.28,D+0.1]} r={0.13}>{S(AC.trim)}</RB>
    <RB position={[0,0.18+H-0.05,Z0]} args={[W+0.16,0.24,D+0.16]} r={0.11}>{S(AC.band)}</RB>
    {/* the roof: a cream slab */}
    <RB position={[0,0.18+H+0.2,Z0]} args={[W+0.34,0.24,D+0.34]} r={0.11}>{S(AC.trim)}</RB>
    {/* the door: a pink arch with glass */}
    <group position={[0,0.18,fz+0.01]}>
      <mesh position={[0,0.7,0]}><boxGeometry args={[1.0,1.4,0.06]}/>{S(AC.glass)}</mesh>
      <mesh position={[0,1.4,0]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.5,0.5,0.06,24,1,false,0,Math.PI]}/>{S(AC.glass)}</mesh>
      {[-1,1].map(k=><RB key={k} position={[k*0.58,0.7,0.04]} args={[0.16,1.4,0.14]} r={0.07}>{S(AC.frame)}</RB>)}
      <mesh position={[0,1.4,0.04]}><torusGeometry args={[0.58,0.08,10,24,Math.PI]}/>{S(AC.frame)}</mesh>
      <mesh position={[0.3,0.72,0.05]}><sphereGeometry args={[0.05,10,8]}/>{S('#f2c230')}</mesh>
    </group>
    {/* two windows, each with a little game screen inside */}
    {[-1,1].map(k=><group key={k} position={[k*1.1,0.18+1.05,fz+0.02]}>
      <RB args={[0.86,0.86,0.1]} r={0.045}>{S(AC.trim)}</RB>
      <mesh position-z={0.058}><planeGeometry args={[0.66,0.66]}/><meshBasicMaterial map={screen} toneMapped={false}/></mesh>
    </group>)}
    {/* side windows */}
    {[-1,1].map(k=><group key={k} position={[k*(W/2+0.01),0.18+1.15,Z0]} rotation-y={k*Math.PI/2}>
      <RB args={[0.94,0.74,0.1]} r={0.045}>{S(AC.trim)}</RB>
      <mesh position-z={0.058}><planeGeometry args={[0.74,0.54]}/><meshBasicMaterial map={screen} toneMapped={false}/></mesh>
    </group>)}
    {/* the sign over the door */}
    <RB position={[0,0.18+H+0.66,fz+0.12]} args={[2.34,0.78,0.12]} r={0.055}>{S(AC.band)}</RB>
    <mesh position={[0,0.18+H+0.66,fz+0.185]}><planeGeometry args={[2.2,0.68]}/><meshBasicMaterial map={sign} transparent toneMapped={false}/></mesh>
    {/* the awning: candy scallops along the front, a light under each */}
    {Array.from({length:scallops},(_,i)=>{const x=-W/2+0.2+i*(W-0.4)/(scallops-1);return <group key={i} position={[x,0.18+H-0.2,fz+0.2]}>
      <mesh rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.2,0.2,0.4,14,1,false,Math.PI/2,Math.PI]}/>{S(AC.awning[i%2])}</mesh>
      <mesh ref={el=>{if(el)blink.current[i]=el}} position={[0,-0.24,0.12]}><sphereGeometry args={[0.055,10,8]}/><meshBasicMaterial color={bulbs[i%4]} toneMapped={false}/></mesh>
    </group>})}
    {/* on the roof: a big joystick and three buttons */}
    <group position={[-0.7,0.18+H+0.27,Z0-0.2]}>
      <mesh position-y={0.08} castShadow><cylinderGeometry args={[0.42,0.48,0.16,24]}/>{S('#5c5447')}</mesh>
      <mesh position-y={0.5} castShadow><cylinderGeometry args={[0.07,0.07,0.8,10]}/>{S('#d9d2c6')}</mesh>
      <mesh position-y={1.0} castShadow><sphereGeometry args={[0.3,20,16]}/>{S(AC.band)}</mesh>
    </group>
    {[AC.band,'#f2c230',AC.sage].map((c,i)=><mesh key={c} position={[0.3+i*0.5,0.18+H+0.33,Z0-0.1]} castShadow><cylinderGeometry args={[0.18,0.2,0.14,20]}/>{S(c)}</mesh>)}
    {/* balloons by the door */}
    {([[-1.0,AC.peach,2.2],[-1.2,'#f2c230',2.45],[1.0,AC.band,2.3],[1.2,AC.sage,2.05]] as [number,string,number][]).map(([x,c,y],i)=>
      <group key={i} position={[x*1.55,0,fz+0.35]}>
        <mesh position-y={y} castShadow><sphereGeometry args={[0.2,16,14]}/>{S(c)}</mesh>
        <mesh position-y={(y-0.2)/2}><cylinderGeometry args={[0.008,0.008,y-0.2,4]}/>{S('#c9b8a6')}</mesh>
      </group>)}
    <mesh position={[0,1.4,Z0]} visible={false}><boxGeometry args={[W+0.4,2.9,D+1.2]}/></mesh>
  </group></OnGround>;
}
