'use client';
// 부지·건물·랜드마크 in the garden (core/land.ts, decided 2026-11-16 B+C). All primitives on the shared soft material,
// like Garden3D.tsx; a Blender .glb can replace any of them later.
//   Fields     every open plot as a bed (밭: a tilled square with furrows, 과수원: a round mulch ring), a low fence and a
//              gate round each piece of land, so a new tree has an obvious place to grow
//   Lots       in 넓히기 mode: land still closed as dashed outlines, building lots as dashed squares (tags in DOM)
//   Buildings  유리 온실, 곡물 창고, 풍차
//   Landmarks  서울 경복궁, 도쿄 가미나리몬, 파리 에펠탑, 런던 시계탑, 뉴욕 자유의 여신상 — at the garden's edge
import {useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {PATHS} from './places';
import {LOOK} from './look';
import {OnGround} from './ground';
import {LANDS,BUILDINGS,CITIES,BASE_LAND,type Built} from '../core/land';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const stop=(fn?:()=>void)=>fn?(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()}:undefined;
const boundsOf=(plots:[number,number][],pad:number)=>{const xs=plots.map(p=>p[0]),zs=plots.map(p=>p[1]);return {x0:Math.min(...xs)-pad,x1:Math.max(...xs)+pad,z0:Math.min(...zs)-pad,z1:Math.max(...zs)+pad}};
// posts round a rectangle every ~1.3 units, leaving a gate gap in the middle of the side facing the paths (west)
// gate: the x of an opening in the front (south) fence, where the stepping stones come in (feedback 2026-11-20)
function rect(b:{x0:number;x1:number;z0:number;z1:number},step:number,gate:number|null=null){
  const pts:[number,number,number][]=[],side=(ax:number,az:number,bx:number,bz:number,g:boolean)=>{const len=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(len/step)),rot=Math.atan2(bx-ax,bz-az);
    for(let i=0;i<n;i++){const t=(i+0.5)/n,x=ax+(bx-ax)*t;if(g&&gate!==null&&Math.abs(x-gate)<step*0.75)continue;pts.push([x,az+(bz-az)*t,rot])}};
  side(b.x0,b.z0,b.x1,b.z0,false);side(b.x1,b.z0,b.x1,b.z1,false);side(b.x1,b.z1,b.x0,b.z1,true);side(b.x0,b.z1,b.x0,b.z0,false);return pts;
}
const gateOf=(b:{x0:number;x1:number},kind:'farm'|'orchard')=>b.x0+(b.x1-b.x0)*(kind==='farm'?0.5:0.72);

function Bed({kind}:{kind:'farm'|'orchard'}){
  if(kind==='orchard')return <group>
    <mesh position-y={0.02} receiveShadow><cylinderGeometry args={[1.05,1.12,0.08,28]}/>{S('#8b6b52')}</mesh>
    <mesh position-y={0.05} rotation-x={-Math.PI/2}><torusGeometry args={[1.06,0.08,6,32]}/>{S('#b59a74')}</mesh></group>;
  return <group>
    <mesh position-y={0.03} receiveShadow><boxGeometry args={[1.9,0.12,1.9]}/>{S('#7c5e46')}</mesh>
    {[-0.6,0,0.6].map(x=><mesh key={x} position={[x,0.11,0]} castShadow receiveShadow><boxGeometry args={[0.34,0.1,1.7]}/>{S('#94704f')}</mesh>)}
  </group>;
}
// a fence piece: a post with a rail to the next one
function FencePiece({len}:{len:number}){
  return <group>
    <mesh position-y={0.32} castShadow><boxGeometry args={[0.1,0.64,0.1]}/>{S('#e9dcc2')}</mesh>
    <mesh position={[0,0.42,0]} castShadow><boxGeometry args={[0.06,0.07,len]}/>{S('#e9dcc2')}</mesh>
    <mesh position={[0,0.22,0]}><boxGeometry args={[0.06,0.07,len]}/>{S('#e9dcc2')}</mesh>
  </group>;
}
// the board's words, painted on a canvas (the browser's own Korean font)
function signTexture(text:string,color:string){
  const c=document.createElement('canvas');c.width=512;c.height=200;const x=c.getContext('2d')!;
  x.fillStyle=color;x.fillRect(0,0,512,200);x.strokeStyle='#00000022';x.lineWidth=10;x.strokeRect(5,5,502,190);
  const font="104px 'Jua','Gowun Dodum','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const paint=()=>{x.fillStyle=color;x.fillRect(0,0,512,200);x.strokeStyle='#ffffffaa';x.lineWidth=8;x.beginPath();x.roundRect(14,14,484,172,26);x.stroke();
    x.fillStyle='#4a3424';x.font=font;x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,106)};
  paint();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  // the round 'Jua' face comes from the web font: paint again once it has loaded
  document.fonts?.load(font).then(()=>{paint();t.needsUpdate=true}).catch(()=>{});
  return t;
}
function Sign({color,text}:{color:string;text?:string}){
  const tex=useMemo(()=>text&&typeof document!=='undefined'?signTexture(text,color):null,[text,color]);
  return <group><mesh position-y={0.55} castShadow><boxGeometry args={[0.1,1.1,0.1]}/>{S('#8a6a4c')}</mesh>
    {/* the board leans back a little so the words read from the usual camera above */}
    <group position-y={1.1} rotation-x={text?-0.45:0}><mesh castShadow><boxGeometry args={[1.5,0.6,0.08]}/>{S(color)}</mesh>
    {tex&&[1,-1].map(k=><mesh key={k} position={[0,0,0.042*k]} rotation-y={k<0?Math.PI:0}><planeGeometry args={[1.46,0.57]}/><meshBasicMaterial map={tex} toneMapped={false}/></mesh>)}</group></group>;
}
// beige stepping stones from a field's gate straight down to the village path, then along it if the path ends short
// (feedback 2026-11-20: one path along the front of both fields, a short branch up to each gate)
function GatePath({from}:{from:[number,number]}){
  const stones=useMemo(()=>{let best:[number,number]=from,bd=Infinity;
    for(const line of PATHS)for(let i=1;i<line.length;i++){const [ax,az]=line[i-1],[bx,bz]=line[i];
      for(let k=0;k<=40;k++){const t=k/40,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(z<from[1])continue;const d=Math.hypot(x-from[0],z-from[1]);if(d<bd){bd=d;best=[x,z]}}}
    const out:[number,number,number][]=[],line=(a:[number,number],b:[number,number],skip0:boolean)=>{const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(len/0.78));
      for(let k=skip0?1:0;k<n;k++){const t=k/n;out.push([a[0]+(b[0]-a[0])*t+((out.length*37)%7-3)*0.03,a[1]+(b[1]-a[1])*t+((out.length*53)%7-3)*0.03,out.length*1.7])}};
    const corner:[number,number]=[from[0],best[1]];line(from,corner,false);if(Math.abs(best[0]-from[0])>0.5)line(corner,best,true);return out},[from[0],from[1]]);// eslint-disable-line react-hooks/exhaustive-deps
  return <>{stones.map(([x,z,a],i)=><OnGround key={i} x={x} z={z} rot={a} lift={0.02}><mesh scale={[0.36,0.05,0.29]} receiveShadow><cylinderGeometry args={[1,1,1,12]}/>{S(LOOK.map.stone)}</mesh></OnGround>)}</>;
}
export function Fields({land,mode,onLot}:{land:string[];mode:boolean;onLot?:(id:string)=>void}){
  const open=LANDS.filter(l=>BASE_LAND.includes(l.id)||land.includes(l.id)),closed=LANDS.filter(l=>!BASE_LAND.includes(l.id)&&!land.includes(l.id));
  // a piece of land merges with its base field when they touch (밭 넓히기 extends 밭's fence)
  const groups=useMemo(()=>{const g:{kind:'farm'|'orchard';plots:[number,number][]}[]=[];
    for(const l of open){const near=g.find(x=>x.kind===l.kind&&x.plots.some(p=>l.plots.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<2.6)));if(near)near.plots.push(...l.plots);else g.push({kind:l.kind,plots:[...l.plots]})}return g},[open.map(l=>l.id).join()]);// eslint-disable-line react-hooks/exhaustive-deps
  return <>
    {open.flatMap(l=>l.plots.map(([x,z],i)=><OnGround key={l.id+i} x={x} z={z} lift={-0.02}><Bed kind={l.kind}/></OnGround>))}
    {groups.map((gr,k)=>{const b=boundsOf(gr.plots,1.35),step=1.3;return <group key={k}>
      {rect(b,step,gateOf(b,gr.kind)).map(([x,z,rot],i)=><OnGround key={i} x={x} z={z} rot={rot}><FencePiece len={step}/></OnGround>)}
      <OnGround x={gateOf(b,gr.kind)-1.25} z={b.z1+0.55} rot={0}><Sign color={gr.kind==='farm'?'#f2d28c':'#bfe39c'} text={gr.kind==='farm'?'실제 종목':'가상 종목'}/></OnGround>
      <GatePath from={[gateOf(b,gr.kind),b.z1+0.35]}/></group>})}
    {mode&&closed.map(l=>{const b=boundsOf(l.plots,1.1);return <group key={l.id} onClick={stop(onLot&&(()=>onLot('land:'+l.id)))} name={'lot-land-'+l.id}>
      {rect(b,0.7).map(([x,z,rot],i)=><OnGround key={i} x={x} z={z} rot={rot} lift={0.04}><mesh><boxGeometry args={[0.12,0.06,0.42]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.92}/></mesh></OnGround>)}
      {l.plots.map(([x,z],i)=><OnGround key={'p'+i} x={x} z={z} lift={0.03}><mesh rotation-x={-Math.PI/2}><circleGeometry args={[0.9,24]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.16}/></mesh></OnGround>)}
    </group>})}
  </>;
}
export function BuildingLots({built,onLot}:{built:Built;onLot?:(id:string)=>void}){
  return <>{BUILDINGS.filter(b=>!built.buildings.includes(b.id)).map(b=><group key={b.id} onClick={stop(onLot&&(()=>onLot('building:'+b.id)))} name={'lot-building-'+b.id}>
    {rect({x0:b.at[0]-1.5,x1:b.at[0]+1.5,z0:b.at[1]-1.5,z1:b.at[1]+1.5},0.6).map(([x,z,rot],i)=><OnGround key={i} x={x} z={z} rot={rot} lift={0.04}><mesh><boxGeometry args={[0.1,0.06,0.34]}/><meshBasicMaterial color="#ffe2a0" transparent opacity={0.95}/></mesh></OnGround>)}
  </group>)}</>;
}

function Greenhouse(){
  const glass=useMemo(()=>new THREE.MeshStandardMaterial({color:'#cfeef2',transparent:true,opacity:0.45,roughness:0.15,metalness:0.1}),[]);
  return <group>
    <mesh position-y={0.1} receiveShadow><boxGeometry args={[3,0.2,2.2]}/>{S('#d8cdb8')}</mesh>
    <mesh position-y={0.85} material={glass}><boxGeometry args={[2.8,1.3,2]}/></mesh>
    <mesh position-y={1.5} rotation-z={Math.PI/2} material={glass}><cylinderGeometry args={[1,1,2.8,4,1,false,0,Math.PI]}/></mesh>
    {[-1.4,0,1.4].map(x=><mesh key={x} position={[x,1.1,0]}><boxGeometry args={[0.06,1.9,2.05]}/>{S('#f4f1ea')}</mesh>)}
    {[[-0.7,0.3],[0.5,-0.4],[0.9,0.5]].map(([x,z],i)=><mesh key={i} position={[x,0.55,z]} castShadow><sphereGeometry args={[0.32,12,10]}/>{S('#5aa848')}</mesh>)}
  </group>;
}
function Silo(){
  return <group>
    <mesh position-y={1.3} castShadow receiveShadow><cylinderGeometry args={[0.9,0.95,2.6,28]}/>{S('#c8553d')}</mesh>
    <mesh position-y={2.6} castShadow><sphereGeometry args={[0.92,28,12,0,Math.PI*2,0,Math.PI/2]}/>{S('#8e9aa3')}</mesh>
    {[0.6,1.3,2].map(y=><mesh key={y} position-y={y} rotation-x={Math.PI/2}><torusGeometry args={[0.93,0.04,6,32]}/>{S('#f0e6d6')}</mesh>)}
    <mesh position={[1.4,0.55,0.2]} castShadow><boxGeometry args={[1.3,1.1,1.1]}/>{S('#e7d7b6')}</mesh>
    <mesh position={[1.4,1.25,0.2]} rotation-z={0} castShadow><boxGeometry args={[1.45,0.18,1.25]}/>{S('#6b4a36')}</mesh>
  </group>;
}
function Windmill(){
  const blades=useRef<THREE.Group>(null);
  useFrame((_,dt)=>{if(blades.current)blades.current.rotation.z+=dt*0.7});
  return <group>
    <mesh position-y={1.4} castShadow receiveShadow><cylinderGeometry args={[0.55,0.9,2.8,10]}/>{S('#f1ebe0')}</mesh>
    <mesh position-y={3.05} castShadow><coneGeometry args={[0.75,0.8,10]}/>{S('#5b6f8c')}</mesh>
    <group ref={blades} position={[0,2.6,0.75]}>
      {[0,1,2,3].map(i=><mesh key={i} rotation-z={i*Math.PI/2} position={[0,0,0]}><boxGeometry args={[0.22,2.6,0.04]}/>{S('#efe6d4')}</mesh>)}
      <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[0.14,0.14,0.2,12]}/>{S('#6b4a36')}</mesh>
    </group>
    <mesh position={[0,0.45,0.82]}><boxGeometry args={[0.4,0.7,0.06]}/>{S('#6b4a36')}</mesh>
  </group>;
}
export function Buildings({built,onPick}:{built:Built;onPick?:(id:string)=>void}){
  return <>{BUILDINGS.filter(b=>built.buildings.includes(b.id)).map(b=><OnGround key={b.id} x={b.at[0]} z={b.at[1]} rot={b.rot}>
    <group onClick={stop(onPick&&(()=>onPick(b.id)))} name={'building-'+b.id}>{b.id==='greenhouse'?<Greenhouse/>:b.id==='silo'?<Silo/>:<Windmill/>}</group></OnGround>)}</>;
}

// the five cities' landmarks, about 4–6 units tall so they read from across the garden
function Gyeongbokgung(){
  const roof=(w:number,d:number,y:number,c='#4f7262')=><group position-y={y}>
    <mesh castShadow><boxGeometry args={[w,0.16,d]}/>{S(c)}</mesh>
    <mesh position-y={0.32} castShadow><boxGeometry args={[w*0.7,0.5,d*0.6]}/>{S(c)}</mesh>
    {[-1,1].map(s=><mesh key={s} position={[s*w/2,0.08,0]} rotation-z={s*0.35}><boxGeometry args={[0.5,0.1,d]}/>{S(c)}</mesh>)}</group>;
  return <group>
    <mesh position-y={0.25} receiveShadow castShadow><boxGeometry args={[5.2,0.5,3.4]}/>{S('#d9cfb8')}</mesh>
    <mesh position-y={1.2} castShadow><boxGeometry args={[4,1.4,2.4]}/>{S('#a8432f')}</mesh>
    {[-1.5,-0.5,0.5,1.5].map(x=><mesh key={x} position={[x,1.2,1.22]}><boxGeometry args={[0.16,1.4,0.04]}/>{S('#6e2a1d')}</mesh>)}
    {roof(5,3.2,2)}
    <mesh position-y={2.95} castShadow><boxGeometry args={[3,0.9,1.8]}/>{S('#a8432f')}</mesh>
    {roof(3.8,2.4,3.45)}
  </group>;
}
function Kaminarimon(){
  const lantern=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(lantern.current)lantern.current.rotation.z=Math.sin(clock.elapsedTime*1.3)*0.05});
  return <group>
    <mesh position-y={0.15} receiveShadow><boxGeometry args={[4.6,0.3,2]}/>{S('#d9cfb8')}</mesh>
    {[-1.7,1.7].map(x=><mesh key={x} position={[x,1.6,0]} castShadow><boxGeometry args={[0.9,2.9,1.4]}/>{S('#b8372b')}</mesh>)}
    <mesh position-y={3.2} castShadow><boxGeometry args={[4.4,0.35,1.8]}/>{S('#b8372b')}</mesh>
    <mesh position-y={3.6} castShadow><boxGeometry args={[5,0.3,2.3]}/>{S('#2b2b2b')}</mesh>
    <mesh position-y={3.95} castShadow><boxGeometry args={[3.6,0.4,1.4]}/>{S('#3b3b3b')}</mesh>
    <mesh ref={lantern} position={[0,2.2,0]} castShadow><sphereGeometry args={[0.75,24,18]}/><meshStandardMaterial color="#d94a33" emissive="#ff7a4a" emissiveIntensity={0.25}/></mesh>
    <mesh position={[0,2.2,0]}><cylinderGeometry args={[0.55,0.55,1.6,24,1,true]}/>{S('#1f1f1f')}</mesh>
  </group>;
}
function Eiffel(){
  const c='#7a6a52',leg=(sx:number,sz:number)=><mesh key={`${sx}${sz}`} position={[sx*0.95,1.3,sz*0.95]} rotation={[sz*0.32,0,-sx*0.32]} castShadow><boxGeometry args={[0.32,2.8,0.32]}/>{S(c)}</mesh>;
  return <group>
    {[-1,1].flatMap(sx=>[-1,1].map(sz=>leg(sx,sz)))}
    <mesh position-y={2.55} castShadow><boxGeometry args={[1.5,0.18,1.5]}/>{S(c)}</mesh>
    <mesh position-y={3.7} castShadow><cylinderGeometry args={[0.18,0.62,2.3,4]}/>{S(c)}</mesh>
    <mesh position-y={4.9} castShadow><boxGeometry args={[0.55,0.12,0.55]}/>{S(c)}</mesh>
    <mesh position-y={5.6} castShadow><cylinderGeometry args={[0.04,0.18,1.4,4]}/>{S(c)}</mesh>
    {/* the arches between the legs */}
    {[0,Math.PI/2].map(r=><mesh key={r} position-y={1.05} rotation-y={r}><torusGeometry args={[0.85,0.08,6,16,Math.PI]}/>{S(c)}</mesh>)}
  </group>;
}
function ClockTower(){
  return <group>
    <mesh position-y={0.2} receiveShadow><boxGeometry args={[2,0.4,2]}/>{S('#d9cfb8')}</mesh>
    <mesh position-y={2.3} castShadow><boxGeometry args={[1.3,4,1.3]}/>{S('#b39a6e')}</mesh>
    <mesh position-y={4.6} castShadow><boxGeometry args={[1.55,0.9,1.55]}/>{S('#a88d60')}</mesh>
    {/* a clock face on each side */}
    {[0,1,2,3].map(i=><group key={i} rotation-y={i*Math.PI/2}><mesh position={[0,4.6,0.79]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.36,0.36,0.04,24]}/><meshStandardMaterial color="#f5efe0" emissive="#fff3c4" emissiveIntensity={0.2}/></mesh></group>)}
    <mesh position-y={5.55} castShadow><coneGeometry args={[0.95,1.6,4]}/>{S('#4f5d4a')}</mesh>
    <mesh position-y={6.45}><cylinderGeometry args={[0.03,0.06,0.5,6]}/>{S('#c99a3e')}</mesh>
  </group>;
}
function Liberty(){
  const c='#7fa79e';
  return <group>
    <mesh position-y={0.7} castShadow receiveShadow><boxGeometry args={[1.8,1.4,1.8]}/>{S('#cbbfa6')}</mesh>
    <mesh position-y={1.55} castShadow><boxGeometry args={[1.3,0.3,1.3]}/>{S('#b8ab90')}</mesh>
    <mesh position-y={2.65} castShadow><cylinderGeometry args={[0.32,0.6,1.9,12]}/>{S(c)}</mesh>
    <mesh position-y={3.8} castShadow><sphereGeometry args={[0.3,16,12]}/>{S(c)}</mesh>
    {[...Array(7)].map((_,i)=><mesh key={i} position={[Math.sin(i*0.5-1.5)*0.3,4.05,Math.cos(i*0.5-1.5)*0.3]} rotation-z={(i-3)*0.18}><coneGeometry args={[0.05,0.32,4]}/>{S(c)}</mesh>)}
    <mesh position={[0.4,4.15,0]} rotation-z={-0.25} castShadow><cylinderGeometry args={[0.08,0.1,1.2,8]}/>{S(c)}</mesh>
    <mesh position={[0.56,4.85,0]}><coneGeometry args={[0.16,0.32,10]}/><meshStandardMaterial color="#ffcf6a" emissive="#ffb43a" emissiveIntensity={1.2} toneMapped={false}/></mesh>
    <mesh position={[-0.42,3.1,0.12]} rotation-z={0.3}><boxGeometry args={[0.3,0.42,0.08]}/>{S(c)}</mesh>
  </group>;
}
export function Landmarks({built,onPick}:{built:Built;onPick?:(id:string)=>void}){
  // each one faces the middle of the garden
  return <>{CITIES.filter(c=>built.cities.includes(c.id)).map(c=><OnGround key={c.id} x={c.at[0]} z={c.at[1]} rot={Math.atan2(-c.at[0],-c.at[1])}>
    <group onClick={stop(onPick&&(()=>onPick(c.id)))} name={'landmark-'+c.id} scale={1.4}>
      {c.id==='seoul'?<Gyeongbokgung/>:c.id==='tokyo'?<Kaminarimon/>:c.id==='paris'?<Eiffel/>:c.id==='london'?<ClockTower/>:<Liberty/>}</group></OnGround>)}</>;
}
