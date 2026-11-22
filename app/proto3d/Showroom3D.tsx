'use client';
// The observer's stage (the "my page" scene, ui/MyPage.tsx): the garden is put away and my observer stands on a turning
// pedestal under a spotlight, dust motes drifting up through the light. Changing what it wears throws a burst of paper
// confetti in the colour set and it gives a little twirl. Drag to turn it; it turns slowly by itself when left alone.
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from './materials';
import {LOOK} from './look';
import {Explorer,type ExplorerAct} from './Explorer3D';
import {PALETTES,type Look} from '../core/wardrobe';
import {rng} from './ground';

const L=()=>LOOK.stage;
function Backdrop(){
  // a dome shading from the dark of the stage above to a warm floor glow
  const geo=useMemo(()=>{const g=new THREE.SphereGeometry(40,32,20),p=g.attributes.position,col=new Float32Array(p.count*3),top=new THREE.Color(L().top),bot=new THREE.Color(L().bottom),c=new THREE.Color();
    for(let i=0;i<p.count;i++){const k=THREE.MathUtils.smoothstep(p.getY(i),-6,24);c.copy(bot).lerp(top,k);col.set([c.r,c.g,c.b],i*3)}
    g.setAttribute('color',new THREE.BufferAttribute(col,3));return g},[]);
  return <mesh geometry={geo}><meshBasicMaterial vertexColors side={THREE.BackSide}/></mesh>;
}
function Motes(){
  const ref=useRef<THREE.InstancedMesh>(null),o=useMemo(()=>new THREE.Object3D(),[]);
  const m=useMemo(()=>{const r=rng(5);return Array.from({length:60},()=>({a:r()*6.28,d:0.4+r()*2.6,h:r()*5,s:0.6+r()*0.6,z:0.02+r()*0.03}))},[]);
  useFrame(({clock})=>{const g=ref.current;if(!g)return;const t=clock.elapsedTime;
    m.forEach((p,i)=>{const y=(p.h+t*0.25*p.s)%5,a=p.a+t*0.1*p.s;o.position.set(Math.cos(a)*p.d,y,Math.sin(a)*p.d);o.scale.setScalar(p.z*(1-Math.abs(y/5-0.5)));o.updateMatrix();g.setMatrixAt(i,o.matrix)});
    g.instanceMatrix.needsUpdate=true});
  return <instancedMesh ref={ref} args={[undefined,undefined,m.length]} frustumCulled={false}><sphereGeometry args={[1,6,4]}/>
    <meshStandardMaterial color="#fff3c4" emissive="#ffd27a" emissiveIntensity={2.2} toneMapped={false}/></instancedMesh>;
}
// paper confetti in the colour set, thrown up when the look changes
function Confetti({stamp,colors}:{stamp:number;colors:string[]}){
  const ref=useRef<THREE.InstancedMesh>(null),o=useMemo(()=>new THREE.Object3D(),[]),t0=useRef(performance.now());
  const bits=useMemo(()=>{const r=rng(stamp%9973);return Array.from({length:70},(_,i)=>({a:r()*6.28,v:1.6+r()*2.4,up:3+r()*3,spin:r()*8,c:colors[i%colors.length]}))},[stamp,colors]);
  useEffect(()=>{t0.current=performance.now();const g=ref.current;if(!g)return;const c=new THREE.Color();bits.forEach((b,i)=>g.setColorAt(i,c.set(b.c)));if(g.instanceColor)g.instanceColor.needsUpdate=true},[bits]);
  useFrame(()=>{const g=ref.current;if(!g)return;const k=(performance.now()-t0.current)/1000;if(k>2.2){g.visible=false;return}g.visible=true;
    bits.forEach((b,i)=>{const r=b.v*k;o.position.set(Math.cos(b.a)*r,1.4+b.up*k-4.2*k*k,Math.sin(b.a)*r);o.rotation.set(b.spin*k,b.spin*k*0.7,0);o.scale.setScalar(1);o.updateMatrix();g.setMatrixAt(i,o.matrix)});
    g.instanceMatrix.needsUpdate=true});
  return <instancedMesh ref={ref} args={[undefined,undefined,bits.length]} frustumCulled={false}><planeGeometry args={[0.09,0.14]}/><meshBasicMaterial side={THREE.DoubleSide} toneMapped={false}/></instancedMesh>;
}
function StageCam(){
  const {camera,size}=useThree(),tall=size.width<size.height;
  // a tall phone keeps the observer in the upper part (the panel is below); a wide screen keeps it left of the panel
  useEffect(()=>{const c=camera as THREE.PerspectiveCamera;c.fov=tall?40:34;c.clearViewOffset();
    if(tall)c.setViewOffset(size.width,size.height,0,size.height*0.1,size.width,size.height);else if(size.width>720)c.setViewOffset(size.width,size.height,size.width*0.16,0,size.width,size.height);
    c.position.set(0,2.8,tall?L().camTall:L().camWide);c.updateProjectionMatrix();return()=>{c.clearViewOffset()}},[camera,size.width,size.height,tall]);
  return <OrbitControls makeDefault enablePan={false} enableDamping autoRotate autoRotateSpeed={1.1} target={[0,1.25,0]} minPolarAngle={1.0} maxPolarAngle={1.5} minDistance={5} maxDistance={15}/>;
}
export function Showroom({look}:{look:Look}){
  const pal=PALETTES.find(p=>p.id===look.palette)??PALETTES[0];
  const key=[look.coat,look.hat,look.bag,look.tool,look.palette].join('|');
  const [burst,setBurst]=useState(0),[act,setAct]=useState<ExplorerAct>('look'),first=useRef(true);
  useEffect(()=>{if(first.current){first.current=false;return}setBurst(Date.now());setAct('twirl');const t=setTimeout(()=>setAct('look'),700);return()=>clearTimeout(t)},[key]);
  const ped=useRef<THREE.Group>(null),ring=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{const t=clock.elapsedTime;if(ring.current)(ring.current.material as THREE.MeshBasicMaterial).opacity=0.35+0.2*Math.sin(t*2)});
  return <group name="showroom">
    <Backdrop/>
    <hemisphereLight args={['#ffe9c4','#1c241e',0.55]}/>
    <spotLight position={[0,9,2.5]} angle={0.42} penumbra={0.6} intensity={L().spotPower} distance={20} decay={2} color={L().spot} castShadow/>
    <pointLight position={[-3,2.5,3]} color={L().rim} intensity={10} distance={9} decay={2}/>
    {/* the floor and the light falling on it */}
    <mesh rotation-x={-Math.PI/2} position-y={-0.01} receiveShadow><circleGeometry args={[14,48]}/>{<primitive object={soft(L().floor)} attach="material"/>}</mesh>
    <mesh ref={ring} rotation-x={-Math.PI/2} position-y={0.01}><ringGeometry args={[1.9,2.25,64]}/><meshBasicMaterial color={L().spot} transparent opacity={0.4} toneMapped={false}/></mesh>
    <mesh position-y={4.6}><cylinderGeometry args={[0.25,2.3,9.2,32,1,true]}/><meshBasicMaterial color={L().spot} transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide}/></mesh>
    {/* the pedestal: wood with a brass rim */}
    <group ref={ped}>
      <mesh position-y={0.22} castShadow receiveShadow><cylinderGeometry args={[1.6,1.7,0.44,48]}/>{<primitive object={soft(L().wood)} attach="material"/>}</mesh>
      <mesh position-y={0.45} rotation-x={-Math.PI/2}><torusGeometry args={[1.6,0.04,8,64]} /><meshStandardMaterial color="#d8b25a" emissive="#b8862a" emissiveIntensity={0.6}/></mesh>
      <mesh position-y={0.445} rotation-x={-Math.PI/2}><circleGeometry args={[1.58,48]}/>{<primitive object={soft(L().top2)} attach="material"/>}</mesh>
      <group position-y={0.45} scale={LOOK.stage.scale}><Suspense fallback={null}><Explorer look={look} act={act}/></Suspense></group>
    </group>
    <Motes/>
    {burst>0&&<Confetti key={burst} stamp={burst} colors={[pal.primary,pal.secondary,pal.accent,'#f4eedf']}/>}
    <StageCam/>
  </group>;
}
