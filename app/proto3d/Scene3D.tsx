'use client';
// The 3D look prototype scene. Everything is a primitive (sphere, capsule, cylinder) so a Blender .glb can replace
// any piece later without touching the layout. The look comes from lighting + post-processing:
// hemisphere light, warm sun with soft shadows, fog into the sky gradient, bloom on emissive bits, tilt-shift blur.
import {Suspense,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type ComponentRef,type ReactNode} from 'react';
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {OrbitControls,useGLTF} from '@react-three/drei';
import {EffectComposer,Bloom,TiltShift2,HueSaturation,Vignette} from '@react-three/postprocessing';
import * as THREE from 'three';
type OrbitControlsImpl=ComponentRef<typeof OrbitControls>;
import {treeState,defaultRules,type Growth,type Condition} from '../core/model';
import type {Weather} from '../core/weather';
import type {Holding} from '../core/model';
import {WeatherFx} from './Weather3D';
import {Analyst} from './Analyst3D';
import {screenPoints} from './screen';
import {Observatory,Signpost,Cart,Pot,Decor} from './Garden3D';
import {DECOR_SLOTS,type Shape} from '../content/garden-items';
import type {AnalystId} from '../content/analysts';
import {LOOK} from './look';
import {soft} from './materials';
import {MODELS,ALL_TREE_FILES,CANOPY,BARK,STUMP_CUT} from './models';

// The world is the top of a big sphere, so the far side curves away into the fog (a small-planet feel).
const R=38;
const WALK=12.5;// how far from the centre the player may walk
const SPEED=3.2;// player walking speed, units per second
const PLAYER_START=new THREE.Vector3(0,0,2.5);
export const surfaceY=(x:number,z:number)=>Math.sqrt(Math.max(0,R*R-x*x-z*z))-R;
const normalAt=(x:number,z:number)=>new THREE.Vector3(x,surfaceY(x,z)+R,z).normalize();
const UP=new THREE.Vector3(0,1,0);
const tiltAt=(x:number,z:number)=>new THREE.Quaternion().setFromUnitVectors(UP,normalAt(x,z));

type Hooks={frames:number;ready:boolean;player:{x:number;z:number};trees:Record<number,{x:number;y:number}>;softMeshes:number;meshes:number;treeModels:number;weather?:Weather;points:Record<string,{x:number;y:number}>};
declare global{interface Window{__proto3d?:Hooks}}
const testHooks=()=>window.__proto3d??=({frames:0,ready:false,player:{x:0,z:0},trees:{},softMeshes:0,meshes:0,treeModels:0,points:{}});

function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// A piece standing on the ground at (x,z), tilted to the sphere.
function OnGround({x,z,lift=0,rot=0,children}:{x:number;z:number;lift?:number;rot?:number;children:ReactNode}){
  const q=useMemo(()=>tiltAt(x,z).multiply(new THREE.Quaternion().setFromAxisAngle(UP,rot)),[x,z,rot]);
  return <group position={[x,surfaceY(x,z)+lift,z]} quaternion={q}>{children}</group>;
}

const POND:[number,number,number][]=[[0.2,7.6,1.8],[2,8.1,1.4],[-1.6,8.3,1.3],[0.9,9.3,1.3],[-0.5,6.5,1]];
const inPond=(x:number,z:number,pad=0)=>POND.some(([px,pz,r])=>Math.hypot(x-px,z-pz)<r+pad);
const HOUSE={x:-5.5,z:-3};
const FARM:[number,number][]=[[2.6,-1.8],[5,-0.4],[3.4,1.5],[5.8,2.3],[7.4,-2.4],[1.6,4.4],[7.6,4.4]];
// landmarks (R4–R6, Garden3D.tsx) and where grass tufts and flowers keep away from
const SPOTS={observatory:{x:-9,z:1.2,rot:1.25},signpost:{x:-1.9,z:3.5,rot:0.35},cart:{x:-3.6,z:5.3,rot:0.5}};
const KEEP_CLEAR:[number,number,number][]=[[SPOTS.observatory.x,SPOTS.observatory.z,2.2],[SPOTS.cart.x,SPOTS.cart.z,1.3],[SPOTS.signpost.x,SPOTS.signpost.z,0.6],...DECOR_SLOTS.map(d=>[d.x,d.z,0.8] as [number,number,number])];
const clearOf=(x:number,z:number)=>KEEP_CLEAR.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r);
// analysts idle around the campfire when nothing is flagged
const IDLE:Record<AnalystId,{x:number;z:number}>={tori:{x:-3.1,z:-0.2},moa:{x:-0.2,z:-2.3},luon:{x:-1.0,z:-2.9}};

// Soft colour patches on the ground (vertex colours): smooth wavy noise picks between dark, base, light and a warm yellow-green.
const patchNoise=(x:number,z:number,k:number)=>
  Math.sin(x*k*3.1+Math.sin(z*k*1.9)*1.4)*0.5+Math.sin(z*k*4.2-x*k*1.3)*0.33+Math.sin((x+z)*k*7.7)*0.17;
function groundGeometry(){
  const g=new THREE.SphereGeometry(R,160,110),p=g.attributes.position,col=new Float32Array(p.count*3);
  const {base,light,dark,warm,patchScale:k}=LOOK.ground,cb=new THREE.Color(base),cl=new THREE.Color(light),cd=new THREE.Color(dark),cw=new THREE.Color(warm),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),n=patchNoise(x,z,k),w=patchNoise(z+40,x-17,k*0.8);
    c.copy(cb);
    if(n>0)c.lerp(cl,THREE.MathUtils.smoothstep(n,0.1,0.55));else c.lerp(cd,THREE.MathUtils.smoothstep(-n,0.2,0.7)*0.8);
    c.lerp(cw,THREE.MathUtils.smoothstep(w,0.45,0.85)*0.7);
    col.set([c.r,c.g,c.b],i*3)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g;
}
function Ground({onWalk}:{onWalk:(p:THREE.Vector3)=>void}){
  const click=(e:ThreeEvent<MouseEvent>)=>{if(e.delta>6)return;onWalk(e.point)};
  const geo=useMemo(groundGeometry,[]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return (
    <mesh position={[0,-R,0]} receiveShadow onClick={click} geometry={geo}>
      <primitive object={soft('#ffffff',{vertexColors:true})} attach="material"/>
    </mesh>
  );
}

// The soft rounded blobs that make the grass read as tufts (the reference's bubbly ground).
function Tufts(){
  const ref=useRef<THREE.InstancedMesh>(null);
  const items=useMemo(()=>{const r=rng(7),out:{x:number;z:number;s:number;c:string}[]=[],T=LOOK.tufts;
    while(out.length<T.count){const a=r()*Math.PI*2,d=Math.sqrt(r())*17,x=Math.cos(a)*d,z=Math.sin(a)*d;
      if(inPond(x,z,0.4)||clearOf(x,z)||Math.hypot(x-HOUSE.x,z-HOUSE.z)<2.8||FARM.some(([fx,fz])=>Math.hypot(x-fx,z-fz)<1.2))continue;
      // mostly small, a few big; small ones cluster near big ones
      const big=r()<0.2,s=big?0.75+r()*0.6:0.25+r()*0.4,q=r();
      out.push({x,z,s,c:q<0.4?T.light:q<0.8?T.mid:T.dark})}return out},[]);
  useLayoutEffect(()=>{const m=ref.current;if(!m)return;const o=new THREE.Object3D(),c=new THREE.Color();
    items.forEach((t,i)=>{o.position.set(t.x,surfaceY(t.x,t.z),t.z);o.quaternion.copy(tiltAt(t.x,t.z));o.scale.set(t.s,t.s*0.32,t.s);o.updateMatrix();m.setMatrixAt(i,o.matrix);m.setColorAt(i,c.set(t.c))});
    m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true},[items]);
  return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} receiveShadow>
    <sphereGeometry args={[1,20,12]}/><primitive object={soft('#ffffff')} attach="material"/>
  </instancedMesh>;
}

function Pond(){
  return <>{POND.map(([x,z,r],i)=>(
    // rim pieces sit low and water pieces well above them, so neighbouring tilted discs never cut into each other
    <OnGround key={i} x={x} z={z} lift={0.03}>
      <mesh rotation-x={-Math.PI/2} receiveShadow><circleGeometry args={[r+0.3,40]}/><meshBasicMaterial color="#a8e4ec"/></mesh>
      <mesh rotation-x={-Math.PI/2} position-y={0.12}><circleGeometry args={[r,40]}/><meshBasicMaterial color="#2c86d6"/></mesh>
    </OnGround>))}
    {/* stepping stones and lily pads */}
    {[[0.4,7.9,0.4],[1.3,8.4,0.34],[-0.7,8.6,0.3]].map(([x,z,s],i)=>(
      <OnGround key={'s'+i} x={x} z={z} lift={0.14}><mesh scale={[s,s*0.35,s]} castShadow><sphereGeometry args={[1,20,12]}/><primitive object={soft(i===2?'#e6d65a':'#b9d86a')} attach="material"/></mesh></OnGround>))}
  </>;
}

function Rock({x,z,s=1,rot=0}:{x:number;z:number;s?:number;rot?:number}){
  return <OnGround x={x} z={z} rot={rot}><mesh scale={[s*1.2,s*0.75,s]} position-y={s*0.3} castShadow receiveShadow>
    <sphereGeometry args={[1,24,16]}/><primitive object={soft('#cdbfb0')} attach="material"/></mesh></OnGround>;
}

function House(){
  return <OnGround x={HOUSE.x} z={HOUSE.z} rot={0.5}>
    <mesh scale={[2.3,2.7,2.2]} position-y={1.9} castShadow receiveShadow><sphereGeometry args={[1,48,32]}/><primitive object={soft('#ebe0d2')} attach="material"/></mesh>
    {/* the thumb-like stone on top */}
    <mesh position={[-1,4.1,-0.4]} rotation-z={0.35} castShadow><capsuleGeometry args={[0.55,1.2,8,16]}/><primitive object={soft('#b7a29a')} attach="material"/></mesh>
    {/* door with a stone frame */}
    <group position={[0.2,0.75,2.05]} rotation-y={0.05}>
      <mesh rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.85,0.85,0.35,32]}/><primitive object={soft('#a8968e')} attach="material"/></mesh>
      <mesh position-z={0.18} rotation-x={Math.PI/2}><cylinderGeometry args={[0.6,0.6,0.08,32]}/><primitive object={soft('#7a3f2c')} attach="material"/></mesh>
    </group>
    {/* glowing round windows (bloom picks these up) */}
    {[[1.4,2.4,1.55,0.42],[-1.2,2.7,1.7,0.34]].map(([x,y,z,r],i)=>(
      <mesh key={i} position={[x,y,z]} rotation-y={Math.atan2(x,z)}><circleGeometry args={[r,24]}/><meshStandardMaterial color="#ffb24a" emissive="#ff9a2e" emissiveIntensity={1.6} toneMapped={false}/></mesh>))}
    {/* speckles */}
    {Array.from({length:14},(_,i)=>{const a=i*2.39,y=1+((i*37)%25)/10;const rr=2.25*Math.sqrt(Math.max(0.05,1-((y-1.9)/2.7)**2));
      return <mesh key={'d'+i} position={[Math.sin(a)*rr*1.0,y,Math.cos(a)*rr*0.96]} scale={0.07+((i*13)%5)/60}><sphereGeometry args={[1,8,6]}/><primitive object={soft('#b9a999')} attach="material"/></mesh>})}
  </OnGround>;
}

function Campfire(){
  const flame=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{const f=flame.current;if(!f)return;const t=clock.elapsedTime;f.scale.set(1+Math.sin(t*9)*0.08,1+Math.sin(t*13)*0.15,1+Math.cos(t*7)*0.08)});
  return <OnGround x={-1.6} z={-1.2}>
    {[0,1.2,2.4].map(a=><mesh key={a} rotation={[Math.PI/2,0,a]} position-y={0.1} castShadow><cylinderGeometry args={[0.08,0.1,1.1,8]}/><primitive object={soft('#8a6448')} attach="material"/></mesh>)}
    <mesh ref={flame} position-y={0.45}><coneGeometry args={[0.28,0.75,12]}/><meshStandardMaterial color="#ffb02e" emissive="#ff7a1a" emissiveIntensity={1.1} toneMapped={false}/></mesh>
    <pointLight position-y={0.8} color="#ffae5a" intensity={6} distance={5} decay={2}/>
    {/* a fallen log to sit on */}
    <mesh position={[0.6,0.18,-1.3]} rotation={[0,0.4,Math.PI/2]} castShadow><cylinderGeometry args={[0.2,0.2,2.2,12]}/><primitive object={soft('#b18a6b')} attach="material"/></mesh>
  </OnGround>;
}

// A bushy round tree or a tall cypress (scenery, not holdings).
function RoundTree({x,z,s=1}:{x:number;z:number;s?:number}){
  return <OnGround x={x} z={z}>
    <mesh position-y={1.6*s} castShadow><cylinderGeometry args={[0.3*s,0.45*s,3.2*s,10]}/><primitive object={soft('#6c5b53')} attach="material"/></mesh>
    {[[0,4,0,1.8],[1.3,3.5,0.3,1.3],[-1.2,3.6,-0.2,1.4],[0.2,3.3,1.1,1.2],[-0.3,4.9,-0.4,1.2]].map(([a,b,c,r],i)=>(
      <mesh key={i} position={[a*s,b*s,c*s]} scale={r*s} castShadow receiveShadow><sphereGeometry args={[1,20,14]}/><primitive object={soft(i===4?'#6db24f':'#4f9a45')} attach="material"/></mesh>))}
  </OnGround>;
}
function Cypress({x,z,s=1}:{x:number;z:number;s?:number}){
  return <OnGround x={x} z={z}>
    <mesh position-y={2.4*s} castShadow><capsuleGeometry args={[0.85*s,3.2*s,8,16]}/><primitive object={soft('#2e7a6b')} attach="material"/></mesh>
  </OnGround>;
}

// A holding as a tree: the model comes from Blender (tools/blender/holding_tree.py, listed in models.ts), the growth
// stage picks the file, the condition picks leaf colour, how much canopy is left and whether it blooms.
const blossomMat=new THREE.MeshStandardMaterial({color:'#ffe08a',emissive:'#ffb400',emissiveIntensity:1.6,toneMapped:false});
function TreeModel({url,condition,onTop}:{url:string;condition:Condition;onTop:(y:number)=>void}){
  const {scene}=useGLTF(url);
  const model=useMemo(()=>{
    const c=CANOPY[condition],root=scene.clone(true),leaves:THREE.Object3D[]=[];
    root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
      if(o.name.startsWith('leaf_')){m.material=soft(c.leaf);leaves.push(o)}
      else if(o.name.startsWith('blossom')){m.material=blossomMat;o.visible=c.blossom}
      else if(o.name.startsWith('cut'))m.material=soft(STUMP_CUT)
      else m.material=soft(BARK)});
    // a wilting tree has lost its outer clumps first (the file lists the most important ones first)
    leaves.sort((a,b)=>Number(a.name.slice(5))-Number(b.name.slice(5)))
      .forEach((o,i)=>{o.visible=i<Math.max(1,Math.ceil(leaves.length*c.keep))});
    return root},[scene,condition]);
  useLayoutEffect(()=>{const box=new THREE.Box3().setFromObject(model);onTop(box.max.y*LOOK.holdingTreeScale);
    testHooks().treeModels++},[model,onTop]);
  return <primitive object={model}/>;
}
// R2 condition details: a yellowing or wilting tree drops leaves, a blooming one lets petals go. How many are in the air
// at once and their colour come from CANOPY (models.ts); the wind of the day carries them sideways.
function Falling({condition,height,wind}:{condition:Condition;height:number;wind:number}){
  const c=CANOPY[condition],n=c.falling;
  const ref=useRef<THREE.InstancedMesh>(null),o=useMemo(()=>new THREE.Object3D(),[]);
  const bits=useMemo(()=>{const r=rng(n*31+height*7|0);return Array.from({length:n},()=>({t:r(),x:(r()-0.5)*1.4,z:(r()-0.5)*1.4,sp:0.18+r()*0.12,ph:r()*6.28}))},[n,height]);
  useFrame(({clock},dt)=>{const m=ref.current;if(!m)return;const d=Math.min(dt,0.05);
    bits.forEach((b,i)=>{b.t+=d*b.sp;if(b.t>1){b.t=0;b.x=(Math.random()-0.5)*1.4;b.z=(Math.random()-0.5)*1.4}
      const y=height*0.85*(1-b.t),drift=b.t*wind*28;
      o.position.set(b.x+drift+Math.sin(clock.elapsedTime*2+b.ph)*0.15,Math.max(0.05,y),b.z);
      o.rotation.set(clock.elapsedTime*2+b.ph,b.ph,clock.elapsedTime+b.ph);const s=b.t>0.95?(1-b.t)*20:1;o.scale.set(0.09*s,0.02*s,0.06*s);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true});
  if(!n)return null;
  return <instancedMesh ref={ref} args={[undefined,undefined,n]} frustumCulled={false}>
    <sphereGeometry args={[1,6,4]}/><meshStandardMaterial color={c.fallColor} emissive={condition==='bloom'?c.fallColor:'#000000'} emissiveIntensity={condition==='bloom'?0.5:0}/>
  </instancedMesh>;
}
function HoldingTree({id,x,z,picked,onPick,growth,condition,onTop,wind}:{id:number;x:number;z:number;picked:boolean;onPick:(id:number)=>void;growth:Growth;condition:Condition;onTop:(y:number)=>void;wind:number}){
  const group=useRef<THREE.Group>(null),[h,setH]=useState(2);
  const lean=CANOPY[condition].droop;
  useFrame(({clock})=>{const g=group.current;if(!g)return;const t=clock.elapsedTime;
    // wind: a slow lean plus faster gusts on stormy days
    g.rotation.z=Math.sin(t*0.9+id)*wind+Math.sin(t*2.7+id*2)*wind*0.35-wind*0.6;g.rotation.x=lean});
  const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onPick(id)};
  const top=useCallback((y:number)=>{setH(y);onTop(y)},[onTop]);
  return <OnGround x={x} z={z}>
    {/* soil mound */}
    <mesh scale={[1.1,0.22,1.1]} receiveShadow><sphereGeometry args={[1,20,12]}/><primitive object={soft('#8b6b52')} attach="material"/></mesh>
    {picked&&<mesh rotation-x={-Math.PI/2} position-y={0.12}><torusGeometry args={[1.25,0.06,8,40]}/><meshStandardMaterial color="#fff6c8" emissive="#ffe27a" emissiveIntensity={1.4} toneMapped={false}/></mesh>}
    <group ref={group} onClick={click} name={`tree-${id}`} position-y={0.12} scale={LOOK.holdingTreeScale}>
      <Suspense fallback={null}>
        <TreeModel url={condition==='dead'?MODELS.stump:MODELS.tree(growth,id)} condition={condition} onTop={top}/>
      </Suspense>
    </group>
    <Falling condition={condition} height={h} wind={wind}/>
  </OnGround>;
}
ALL_TREE_FILES.forEach(u=>useGLTF.preload(u));

function Flowers(){
  const ref=useRef<THREE.InstancedMesh>(null);
  const items=useMemo(()=>{const r=rng(21),out:{x:number;z:number;c:string}[]=[],colors=['#ff8fc6','#ffd23f','#5aa8ff','#ffffff','#ff6fa1','#ffe066'];
    // flowers grow in little clusters, like the reference
    for(let k=0;k<48;k++){const a=r()*Math.PI*2,d=2+Math.sqrt(r())*13,cx=Math.cos(a)*d,cz=Math.sin(a)*d,c=colors[Math.floor(r()*colors.length)];
      for(let j=0;j<9;j++){const x=cx+(r()-0.5)*1.4,z=cz+(r()-0.5)*1.4;if(inPond(x,z,0.3)||clearOf(x,z)||Math.hypot(x-HOUSE.x,z-HOUSE.z)<2.6||FARM.some(([fx,fz])=>Math.hypot(x-fx,z-fz)<1.3))continue;out.push({x,z,c})}}
    return out},[]);
  useLayoutEffect(()=>{const m=ref.current;if(!m)return;const o=new THREE.Object3D(),c=new THREE.Color();
    items.forEach((t,i)=>{o.position.set(t.x,surfaceY(t.x,t.z)+0.14,t.z);o.scale.setScalar(0.11);o.updateMatrix();m.setMatrixAt(i,o.matrix);m.setColorAt(i,c.set(t.c))});
    m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true},[items]);
  return <instancedMesh ref={ref} args={[undefined,undefined,items.length]}>
    <sphereGeometry args={[1,10,8]}/><primitive object={soft('#ffffff')} attach="material"/>
  </instancedMesh>;
}

function Butterflies({count=14}:{count?:number}){
  const refs=useRef<(THREE.Group|null)[]>([]);
  const paths=useMemo(()=>{const r=rng(5);return Array.from({length:count},()=>({cx:(r()-0.5)*18,cz:(r()-0.5)*16,rad:1+r()*2.5,sp:0.3+r()*0.5,ph:r()*6.28,c:['#ff7aa8','#ffd84a','#7fd6ff','#ff9b4a'][Math.floor(r()*4)]}))},[count]);
  useFrame(({clock})=>{const t=clock.elapsedTime;paths.forEach((p,i)=>{const g=refs.current[i];if(!g)return;const a=t*p.sp+p.ph;
    const x=p.cx+Math.cos(a)*p.rad,z=p.cz+Math.sin(a*1.3)*p.rad;g.position.set(x,surfaceY(x,z)+1+Math.sin(t*2+p.ph)*0.35,z);g.rotation.y=-a;
    const flap=Math.sin(t*18+p.ph)*0.9;(g.children[0] as THREE.Object3D).rotation.z=flap;(g.children[1] as THREE.Object3D).rotation.z=-flap})});
  return <>{paths.map((p,i)=>(
    <group key={i} ref={el=>{refs.current[i]=el}} scale={0.16}>
      <mesh position-x={0.5}><planeGeometry args={[1,0.8]}/><meshStandardMaterial color={p.c} side={THREE.DoubleSide} emissive={p.c} emissiveIntensity={0.4}/></mesh>
      <mesh position-x={-0.5}><planeGeometry args={[1,0.8]}/><meshStandardMaterial color={p.c} side={THREE.DoubleSide} emissive={p.c} emissiveIntensity={0.4}/></mesh>
    </group>))}</>;
}

// A placeholder player: coat, round head, a fluffy two-tone hair puff.
function Player({target,pos}:{target:React.MutableRefObject<THREE.Vector3>;pos:React.MutableRefObject<THREE.Vector3>}){
  const g=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null);
  useFrame(({clock},dt)=>{const p=pos.current,tg=target.current,gr=g.current,b=body.current;if(!gr||!b)return;
    const dx=tg.x-p.x,dz=tg.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,SPEED*Math.min(dt,0.05)),moving=d>0.05;
    if(moving){p.x+=dx/d*step;p.z+=dz/d*step;b.rotation.y=Math.atan2(dx,dz)}
    gr.position.set(p.x,surfaceY(p.x,p.z),p.z);gr.quaternion.copy(tiltAt(p.x,p.z));
    b.position.y=moving?Math.abs(Math.sin(clock.elapsedTime*10))*0.12:Math.sin(clock.elapsedTime*2)*0.02});
  return <group ref={g}><group ref={body}>
    <mesh position-y={0.55} castShadow><capsuleGeometry args={[0.32,0.45,8,16]}/><primitive object={soft('#f6f1e6')} attach="material"/></mesh>
    <mesh position-y={1.2} castShadow><sphereGeometry args={[0.3,24,16]}/><primitive object={soft('#9fd8cf')} attach="material"/></mesh>
    {[[0,1.5,-0.05,0.3,'#4a8dff'],[0.2,1.45,-0.15,0.22,'#ff9fd6'],[-0.2,1.42,-0.12,0.22,'#ff9fd6'],[0,1.3,-0.28,0.24,'#4a8dff']].map(([x,y,z,r,c],i)=>(
      <mesh key={i} position={[x as number,y as number,z as number]} scale={r as number} castShadow><sphereGeometry args={[1,16,12]}/><primitive object={soft(c as string)} attach="material"/></mesh>))}
    {[-0.14,0.14].map(x=><mesh key={x} position={[x,0.1,0.04]} scale={[0.12,0.1,0.18]}><sphereGeometry args={[1,12,8]}/><primitive object={soft('#ff6f8f')} attach="material"/></mesh>)}
  </group></group>;
}

// The camera keeps its angle and slides with the player; drag rotates, pinch/wheel zooms.
function FollowCam({pos,recenter}:{pos:React.MutableRefObject<THREE.Vector3>;recenter:number}){
  const ctl=useRef<OrbitControlsImpl>(null),{camera}=useThree();
  const prev=useMemo(()=>new THREE.Vector3(),[]),want=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{const c=ctl.current;if(!c||recenter===0)return;camera.position.set(pos.current.x,21,pos.current.z+12);c.target.copy(pos.current);c.update()},[recenter,camera,pos]);
  useFrame(()=>{const c=ctl.current;if(!c)return;prev.copy(c.target);want.set(pos.current.x,surfaceY(pos.current.x,pos.current.z)+0.8,pos.current.z);
    c.target.lerp(want,0.08);camera.position.add(prev.sub(c.target).negate());c.update()});
  return <OrbitControls ref={ctl} makeDefault enablePan={false} enableDamping dampingFactor={0.12}
    minPolarAngle={0.3} maxPolarAngle={1.12} minDistance={9} maxDistance={32} target={[0,0.8,2.5]}/>;
}

// Test hooks for e2e (tests/e2e/proto3d.spec.ts): frame count, player position, tree screen points.
function Hooks({pos,treePos,points}:{pos:React.MutableRefObject<THREE.Vector3>;treePos:{id:number;v:THREE.Vector3}[];points:Map<string,THREE.Vector3>}){
  const {camera,size,scene}=useThree(),v=useMemo(()=>new THREE.Vector3(),[]);
  const counted=useRef(-1);
  useFrame(()=>{const h=testHooks();
    h.frames++;h.ready=h.frames>3;h.player={x:pos.current.x,z:pos.current.z};
    // which lit meshes wear the shared soft material (glowing bits and water are left out on purpose); recount when models arrive
    if(h.frames===2||counted.current!==h.treeModels){counted.current=h.treeModels;let all=0,s=0;scene.traverse(o=>{const m=(o as THREE.Mesh).material as THREE.Material|undefined;if(!(o as THREE.Mesh).isMesh||!m)return;all++;if(m.userData.soft)s++});h.meshes=all;h.softMeshes=s}
    h.trees={};for(const t of treePos){v.copy(t.v).project(camera);h.trees[t.id]={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height}}
    for(const [k,p] of points){v.copy(p).project(camera);const pt={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height};h.points[k]=pt;screenPoints.set(k,{...pt,visible:v.z<1})}});
  return null;
}

// What the overlay tells the world (Proto3D.tsx): where each analyst should be and what their bubble says, cooldown pots,
// placed items, and what the landmarks show.
export type World={
  analysts:{id:AnalystId;at:number|null;bubble:{text:string;alert:boolean}|null}[];
  pots:{holdingId:number;open:boolean;flowers:number}[];
  decor:{slot:string;shape:Shape}[];
  hitRate:number|null;cartFlag:string;gameLit:boolean;
  onAnalyst:(id:AnalystId)=>void;onLandmark:(k:'observatory'|'signpost'|'cart')=>void;
};
export default function Scene3D({holdings,picked,onPick,recenter,weather,world}:{holdings:Holding[];picked:number|null;onPick:(id:number|null)=>void;recenter:number;weather:Weather;world:World}){
  const wl=LOOK.weather[weather],hemi=useRef<THREE.HemisphereLight>(null);
  useEffect(()=>{testHooks().weather=weather},[weather]);
  const pos=useRef(PLAYER_START.clone()),target=useRef(PLAYER_START.clone());
  // each holding grows on its own plot (app/core/portfolio.ts gives every new tree an empty one)
  const trees=useMemo(()=>holdings.filter(h=>h.plot>=0&&h.plot<FARM.length).map(h=>({h,st:treeState(h,defaultRules),x:FARM[h.plot][0],z:FARM[h.plot][1]})),[holdings]);
  // the point the e2e test taps: a little below the top of each tree, updated once its model has loaded
  const treePos=useMemo(()=>trees.map(t=>({id:t.h.id,v:new THREE.Vector3(t.x,surfaceY(t.x,t.z)+0.5,t.z)})),[trees]);
  const onTops=useMemo(()=>treePos.map(p=>(y:number)=>{p.v.y=surfaceY(p.v.x,p.v.z)+0.12+y*0.75}),[treePos]);
  const points=useMemo(()=>{const m=new Map<string,THREE.Vector3>();for(const [k,p] of Object.entries(SPOTS))m.set(k,new THREE.Vector3(p.x,surfaceY(p.x,p.z)+1.2,p.z));return m},[]);
  // each analyst reports its head top: the body point is for tapping it, the bubble point sits above the head
  const reportAnalyst=useCallback((id:AnalystId,v:THREE.Vector3)=>{for(const [k,dy] of [['analyst-'+id,-1.2],['bubble-'+id,0.55]] as const){let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v).y+=dy}},[points]);
  // an analyst with a flag stands in front of that tree, a little to one side (so two on one tree do not overlap)
  const spotFor=(id:AnalystId,at:number|null)=>{const t=at===null?null:trees.find(x=>x.h.id===at);if(!t)return IDLE[id];const side=id==='moa'?-1:1;return {x:t.x+side*1.05,z:t.z+1.15}};
  const walk=(p:THREE.Vector3)=>{const d=Math.hypot(p.x,p.z),k=d>WALK?WALK/d:1,x=p.x*k,z=p.z*k;if(inPond(x,z,0.2))return;target.current.set(x,0,z);onPick(null)};
  return <>
    <fog attach="fog" args={[wl.fog,LOOK.fog.near,LOOK.fog.far]}/>
    <hemisphereLight ref={hemi} args={[LOOK.hemi.sky,LOOK.hemi.ground,LOOK.hemi.intensity*wl.hemi]}/>
    <directionalLight position={LOOK.sun.position} intensity={wl.sun.intensity} color={wl.sun.color} castShadow
      shadow-mapSize={[LOOK.shadow.mapSize,LOOK.shadow.mapSize]} shadow-radius={LOOK.shadow.radius} shadow-bias={-0.0004} shadow-normalBias={0.04}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={50}/>

    <Ground onWalk={walk}/>
    <Tufts/>
    <Pond/>
    <Flowers/>
    <House/>
    <Campfire/>
    <Rock x={-6.4} z={3.2} s={1.1} rot={0.4}/><Rock x={-5} z={4.4} s={0.7}/><Rock x={-7.2} z={4.6} s={0.55}/><Rock x={8.4} z={6} s={0.9}/><Rock x={3.4} z={5.2} s={0.5}/>
    {trees.map((t,i)=><HoldingTree key={t.h.id} id={t.h.id} x={t.x} z={t.z} growth={t.st.growth} condition={t.st.condition} picked={picked===t.h.id} onPick={id=>onPick(id)} onTop={onTops[i]} wind={wl.wind}/>)}
    <Cypress x={-3} z={-8.5} s={1.1}/><Cypress x={-1} z={-9.6}/><Cypress x={5.5} z={-8.8} s={1.2}/><Cypress x={9.6} z={-4.8}/><Cypress x={-10.6} z={-3} s={0.9}/>
    <RoundTree x={1.8} z={-9.2} s={1.1}/><RoundTree x={-7.6} z={-6.4}/><RoundTree x={10.6} z={0.4} s={0.9}/><RoundTree x={-11} z={4} s={0.8}/>
    {weather!=='storm'&&<Butterflies count={weather==='cloudy'?5:14}/>}
    <WeatherFx weather={weather} center={pos} hemi={hemi}/>
    <OnGround x={SPOTS.observatory.x} z={SPOTS.observatory.z} rot={SPOTS.observatory.rot}><Observatory lit={world.gameLit} onPick={()=>world.onLandmark('observatory')}/></OnGround>
    <OnGround x={SPOTS.signpost.x} z={SPOTS.signpost.z} rot={SPOTS.signpost.rot}><Signpost hitRate={world.hitRate} onPick={()=>world.onLandmark('signpost')}/></OnGround>
    <OnGround x={SPOTS.cart.x} z={SPOTS.cart.z} rot={SPOTS.cart.rot}><Cart flag={world.cartFlag} onPick={()=>world.onLandmark('cart')}/></OnGround>
    {world.pots.map(p=>{const t=trees.find(x=>x.h.id===p.holdingId);return t&&<OnGround key={p.holdingId} x={t.x-0.85} z={t.z+0.55}><Pot open={p.open} flowers={p.flowers}/></OnGround>})}
    {world.decor.map(d=>{const sl=DECOR_SLOTS.find(x=>x.id===d.slot);return sl&&<OnGround key={d.slot} x={sl.x} z={sl.z} rot={sl.rot}><Decor shape={d.shape}/></OnGround>})}
    <Suspense fallback={null}>
      {world.analysts.map(a=><Analyst key={a.id} id={a.id} to={spotFor(a.id,a.at)} face={pos} surface={surfaceY} tilt={tiltAt} bubble={a.bubble}
        onPick={()=>world.onAnalyst(a.id)} report={reportAnalyst}/>)}
    </Suspense>
    <Player target={target} pos={pos}/>
    <FollowCam pos={pos} recenter={recenter}/>
    <Hooks pos={pos} treePos={treePos} points={points}/>

    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={LOOK.post.bloom.threshold} luminanceSmoothing={LOOK.post.bloom.smoothing} intensity={LOOK.post.bloom.intensity} radius={LOOK.post.bloom.radius}/>
      <TiltShift2 blur={LOOK.post.tiltShift.blur} taper={LOOK.post.tiltShift.taper}/>
      <HueSaturation saturation={wl.saturation}/>
      <Vignette offset={LOOK.post.vignette.offset} darkness={LOOK.post.vignette.darkness}/>
    </EffectComposer>
  </>;
}
