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
  const {camera,size,gl}=useThree(),tall=size.width<size.height;
  // a tall phone keeps the observer in the upper part (the panel is below); a wide screen keeps it in the middle of the
  // room the panel leaves (피드백 2026-11-26 "컴퓨터에서 옷 메뉴가 캐릭터를 다 가려": measured from the panel itself)
  useEffect(()=>{const c=camera as THREE.PerspectiveCamera;c.fov=tall?40:34;c.position.set(0,2.8,tall?L().camTall:L().camWide);
    const fit=()=>{c.clearViewOffset();
      if(tall)c.setViewOffset(size.width,size.height,0,size.height*0.1,size.width,size.height);
      else{const cv=gl.domElement.getBoundingClientRect(),pn=document.querySelector('.rt-me-panel')?.getBoundingClientRect();
        if(pn&&pn.left>cv.left+120){const free=pn.left-cv.left,dx=size.width/2-free/2;c.setViewOffset(size.width,size.height,dx,0,size.width,size.height)}}
      c.updateProjectionMatrix()};
    fit();const ts=[150,400,800,1400].map(t=>setTimeout(fit,t));addEventListener('resize',fit);
    return()=>{ts.forEach(clearTimeout);removeEventListener('resize',fit);c.clearViewOffset()}},[camera,size.width,size.height,tall,gl]);
  // 피드백 2026-11-26 "빙글빙글 돌아서 어지러워": no turning by itself; a drag still turns it
  return <OrbitControls makeDefault enablePan={false} enableDamping target={[0,1.25,0]} minPolarAngle={1.0} maxPolarAngle={1.5} minDistance={5} maxDistance={15}/>;
}

// 피드백 2026-11-26 "옷 갈아입는 곳이 허접": a little boutique round the pedestal: velvet curtains behind, rails of
// shirts and a hat stand either side, a gold mirror, shelves of folded clothes, shoe boxes, a plant, fairy lights
const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
type V3=[number,number,number];
function Rail({at,rot,colors}:{at:V3;rot:number;colors:string[]}){
  return <group position={at} rotation-y={rot}>
    {[-1,1].map(k=><mesh key={k} position={[k*1.1,0.95,0]} castShadow><cylinderGeometry args={[0.035,0.035,1.9,10]}/>{S('#c9a23a')}</mesh>)}
    <mesh position-y={1.85} rotation-z={Math.PI/2}><cylinderGeometry args={[0.03,0.03,2.3,10]}/>{S('#c9a23a')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*1.1,0.03,0]}><boxGeometry args={[0.18,0.06,0.6]}/>{S('#5a3d2b')}</mesh>)}
    {colors.map((c,i)=>{const x=-0.85+i*(1.7/(colors.length-1));return <group key={i} position={[x,1.8,0]} rotation-y={Math.PI/2+((i*37)%5-2)*0.06}>
      <mesh position-y={0.04} rotation-x={Math.PI/2}><torusGeometry args={[0.04,0.008,6,12,Math.PI*1.3]}/>{S('#888')}</mesh>
      <mesh position-y={-0.04}><boxGeometry args={[0.42,0.03,0.03]}/>{S('#8a6a3a')}</mesh>
      <mesh position-y={-0.34} castShadow><boxGeometry args={[0.38,0.56,0.08]}/>{S(c)}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.24,-0.17,0]} rotation-z={-k*0.5}><boxGeometry args={[0.12,0.22,0.08]}/>{S(c)}</mesh>)}</group>})}
  </group>;
}
function HatStand({at}:{at:V3}){
  const hats:[number,number,string][]=[[0,1.62,'#3a6fb0'],[1.6,1.38,'#d65a5a'],[3.4,1.2,'#e6c46a']];
  return <group position={at}>
    <mesh position-y={0.8} castShadow><cylinderGeometry args={[0.04,0.05,1.6,10]}/>{S('#6f5040')}</mesh>
    <mesh position-y={0.04}><cylinderGeometry args={[0.32,0.36,0.08,20]}/>{S('#6f5040')}</mesh>
    {hats.map(([a,y,c],i)=><group key={i} position={[Math.cos(a)*0.22,y,Math.sin(a)*0.22]} rotation-z={Math.cos(a)*0.3}>
      <mesh><cylinderGeometry args={[0.26,0.26,0.025,20]}/>{S(c)}</mesh><mesh position-y={0.09}><cylinderGeometry args={[0.15,0.17,0.17,18]}/>{S(c)}</mesh></group>)}
  </group>;
}
function Mirror({at,rot}:{at:V3;rot:number}){
  return <group position={at} rotation-y={rot}>
    <mesh position-y={1.25} castShadow><boxGeometry args={[1.05,2.3,0.1]}/>{S('#c9a23a')}</mesh>
    <mesh position={[0,1.25,0.055]}><planeGeometry args={[0.85,2.1]}/><meshStandardMaterial color="#cfe3ea" metalness={0.6} roughness={0.08}/></mesh>
    <mesh position={[-0.2,1.6,0.06]} rotation-z={0.5}><planeGeometry args={[0.06,0.9]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.35}/></mesh>
    <mesh position={[0,2.48,0]}><sphereGeometry args={[0.12,12,8]}/>{S('#c9a23a')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*0.4,0.05,-0.25]} rotation-x={-0.4}><boxGeometry args={[0.06,0.1,0.6]}/>{S('#a88a3a')}</mesh>)}
  </group>;
}
function Shelves({at,rot}:{at:V3;rot:number}){
  const folds=['#e8875a','#5b7fa8','#f3ead3','#4f8a5b','#d46a8c','#2f3a52','#e8c84a','#c8a26a','#8a4f8f'];
  return <group position={at} rotation-y={rot}>
    <mesh position={[0,1.2,-0.2]} castShadow><boxGeometry args={[1.6,2.4,0.05]}/>{S('#8a6446')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*0.8,1.2,0]}><boxGeometry args={[0.05,2.4,0.42]}/>{S('#a77d58')}</mesh>)}
    {[0.4,1.05,1.7].map((y,r)=><group key={y} position-y={y}><mesh><boxGeometry args={[1.58,0.04,0.42]}/>{S('#a77d58')}</mesh>
      {[0,1,2].map(i=><group key={i} position={[-0.48+i*0.48,0.02,0.02]}>{[0,1,2].map(h=><mesh key={h} position-y={0.05+h*0.08} castShadow><boxGeometry args={[0.36-h*0.01,0.075,0.3]}/>{S(folds[(r*3+i+h)%folds.length])}</mesh>)}</group>)}</group>)}
    <mesh position={[0,2.48,0]}><boxGeometry args={[1.7,0.08,0.46]}/>{S('#6f5040')}</mesh>
  </group>;
}
function ShoeBoxes({at}:{at:V3}){
  return <group position={at}>{([[0,0,'#f3ead3'],[0.05,0.2,'#d46a8c'],[-0.02,0.4,'#5b7fa8'],[0.5,0,'#c8a26a']] as [number,number,string][]).map(([x,y,c],i)=>
    <group key={i} position={[x,y+0.1,i===3?0.1:0]} rotation-y={i*0.15}><mesh castShadow><boxGeometry args={[0.46,0.2,0.3]}/>{S(c)}</mesh><mesh position-y={0.105}><boxGeometry args={[0.48,0.02,0.32]}/>{S('#fff6ea')}</mesh></group>)}</group>;
}
function Curtains(){
  // velvet folds in a half ring behind the pedestal, with a gold pelmet and tie-backs
  return <group>{Array.from({length:26},(_,i)=>{const a=Math.PI*0.15+i/25*Math.PI*0.7,r=6.4;return <mesh key={i} position={[Math.cos(a)*r,2.6,-Math.sin(a)*r]} rotation-y={Math.PI/2-a}>
      <cylinderGeometry args={[0.32,0.38,5.2,10,1,true]}/><primitive object={soft(i%2?'#7a2a34':'#8a3040',{side:THREE.DoubleSide})} attach="material"/></mesh>})}
    <mesh position-y={5.1} rotation-y={Math.PI}><cylinderGeometry args={[6.1,6.1,0.35,48,1,true,Math.PI*0.65,Math.PI*1.7]}/><primitive object={soft('#c9a23a',{side:THREE.DoubleSide})} attach="material"/></mesh></group>;
}
function FairyLights(){
  const pts=useMemo(()=>Array.from({length:30},(_,i)=>{const a=Math.PI*0.17+i/29*Math.PI*0.66,r=5.9;return [Math.cos(a)*r,4.5-Math.sin(i/29*Math.PI*3)*0.25-Math.sin(i/29*Math.PI)*0.5,-Math.sin(a)*r] as V3}),[]);
  const mat=useMemo(()=>new THREE.MeshStandardMaterial({color:'#fff1c4',emissive:'#ffc867',emissiveIntensity:2,toneMapped:false}),[]);
  return <group>{pts.map((p,i)=><mesh key={i} position={p} material={mat}><sphereGeometry args={[0.06,8,6]}/></mesh>)}</group>;
}
function Plant({at}:{at:V3}){
  return <group position={at}><mesh position-y={0.25} castShadow><cylinderGeometry args={[0.3,0.24,0.5,14]}/>{S('#c27a55')}</mesh>
    {[0,1.1,2.2,3.3,4.4,5.5].map(a=><mesh key={a} position={[Math.cos(a)*0.16,0.85,Math.sin(a)*0.16]} rotation={[Math.sin(a)*0.45,0,Math.cos(a)*0.45]} castShadow><capsuleGeometry args={[0.1,0.7,4,8]}/>{S('#4f9a45')}</mesh>)}</group>;
}
function Boutique(){
  return <group name="boutique">
    <Curtains/><FairyLights/>
    {/* a round rug under the pedestal */}
    <mesh rotation-x={-Math.PI/2} position-y={0.005}><circleGeometry args={[3.4,48]}/>{S('#7a3d36')}</mesh>
    <mesh rotation-x={-Math.PI/2} position-y={0.007}><ringGeometry args={[3.0,3.15,64]}/>{S('#d8b25a')}</mesh>
    <Rail at={[-4.2,0,-1.6]} rot={0.9} colors={['#e8875a','#f3ead3','#5b7fa8','#e0645a','#4f8a5b','#2f3a52']}/>
    <Rail at={[4.2,0,-1.6]} rot={-0.9} colors={['#c8a26a','#d46a8c','#3d6b8a','#e8c84a','#8a4f8f','#f3ead3']}/>
    <HatStand at={[-3.2,0,1.6]}/>
    <Mirror at={[3.4,0,1.2]} rot={-1.1}/>
    <Shelves at={[-1.9,0,-4.4]} rot={0.35}/><Shelves at={[1.9,0,-4.4]} rot={-0.35}/>
    <ShoeBoxes at={[2.6,0,-2.9]}/>
    <Plant at={[-4.6,0,0.6]}/><Plant at={[4.9,0,-0.2]}/>
  </group>;
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
    <Boutique/>
    <Motes/>
    {burst>0&&<Confetti key={burst} stamp={burst} colors={[pal.primary,pal.secondary,pal.accent,'#f4eedf']}/>}
    <StageCam/>
  </group>;
}
