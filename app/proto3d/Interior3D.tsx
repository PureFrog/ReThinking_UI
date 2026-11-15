'use client';
// Inside the house: the three analysts' workroom (a dollhouse cut open toward the camera). Everything in it is a way
// into something the game already has:
//   desk        today's three (core/today.ts)        bookshelf   my judgments as books → the track record
//   cork board  the buried capsules as notes, D-n     window      the garden outside, its weather
//   door        back out
// Analysts with nothing flagged rest in here. Three decor slots (garden-items DECOR_SLOTS room 'in') take drawer items.
// Room coordinates: x across, z toward the camera, y up, floor at 0. Code-made primitives on the shared soft material.
import {Suspense,useMemo,useRef} from 'react';
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from './materials';
import {LOOK} from './look';
import {Analyst} from './Analyst3D';
import {Decor} from './Garden3D';
import {DECOR_SLOTS,type Shape} from '../content/garden-items';
import type {AnalystId} from '../content/analysts';
import {frameFor} from '../core/frame';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const click=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};
export const ROOM={w:9,d:7,h:3.2};
const I=()=>LOOK.interior;
// where things stand (the DOM tags and the e2e test read these as points)
export const ROOM_SPOTS={desk:{x:-2.5,z:-2.2},shelf:{x:2.9,z:-2.85},board:{x:0.4,z:-3.42},door:{x:-4.42,z:1.4},window:{x:-1.2,z:-3.45}};
const SEATS:Record<AnalystId,{x:number;z:number}>={tori:{x:-2.5,z:-1.0},moa:{x:0.4,z:0.9},luon:{x:3.2,z:-0.6}};
export type Book={state:'hit'|'miss'|'waiting'};
export type Note={holdingId:number;due:boolean};

function Books({books}:{books:Book[]}){
  // up to three shelves of books, spine colour by how the judgment came out
  const per=12,rows=[0,1,2];
  return <group>{rows.map(r=>books.slice(r*per,(r+1)*per).map((b,i)=>{const w=0.12+((i*7+r*3)%4)*0.02,h=0.5+((i*5+r)%3)*0.08;
    return <mesh key={r+'-'+i} position={[-0.85+i*0.15,0.3+r*0.78+h/2,0]} rotation-z={i%7===6?-0.18:0} castShadow>
      <boxGeometry args={[w,h,0.42]}/>{S(b.state==='hit'?I().bookHit:b.state==='miss'?I().bookMiss:I().bookWait)}</mesh>}))}</group>;
}
function Notes({notes}:{notes:Note[]}){
  const pins=useRef<(THREE.Mesh|null)[]>([]);
  useFrame(({clock})=>{const p=0.5+0.5*Math.sin(clock.elapsedTime*2.4);pins.current.forEach((m,i)=>{if(m&&notes[i]?.due)(m.material as THREE.MeshStandardMaterial).emissiveIntensity=0.8+1.4*p})});
  return <group>{notes.slice(0,8).map((n,i)=>{const x=-0.6+(i%4)*0.42,y=0.24-Math.floor(i/4)*0.46,rot=((i*37)%7-3)*0.03;
    return <group key={n.holdingId} position={[x,y,0.03]} rotation-z={rot}>
      <mesh><planeGeometry args={[0.34,0.34]}/>{S(n.due?'#fffdf4':'#f4eedf')}</mesh>
      <mesh ref={el=>{pins.current[i]=el}} position={[0,0.13,0.03]}><sphereGeometry args={[0.035,10,8]}/>
        <meshStandardMaterial color={n.due?'#b8372b':'#5c5447'} emissive={n.due?'#ff5a3c':'#000000'} emissiveIntensity={n.due?1.2:0} toneMapped={!n.due}/></mesh>
      {[0,1].map(k=><mesh key={k} position={[0,-0.02-k*0.07,0.005]}><planeGeometry args={[0.24-k*0.06,0.022]}/>{S('#9c9180')}</mesh>)}
    </group>})}</group>;
}

// the camera inside: a fixed look into the open room, a little drag to look around, pinch to come closer
function RoomCam(){
  const {camera,size}=useThree(),fr=frameFor(LOOK.camera.frames,size.width/Math.max(1,size.height));
  const tall=size.width<size.height,dist=I().camDist*(tall?1.08:1);
  useMemo(()=>{const c=camera as THREE.PerspectiveCamera;c.clearViewOffset();c.fov=fr.fov;c.updateProjectionMatrix();
    c.position.set(0,1+Math.cos(I().camPitch)*dist,-0.4+Math.sin(I().camPitch)*dist);c.lookAt(0,1,-0.4)},[camera,dist,fr.fov]);
  return <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.12} target={[0,1,-0.4]}
    minAzimuthAngle={-0.55} maxAzimuthAngle={0.55} minPolarAngle={0.55} maxPolarAngle={1.25} minDistance={dist*0.6} maxDistance={dist*1.15}/>;
}

export function Interior({books,notes,resting,decor,onDesk,onShelf,onBoard,onDoor,onAnalyst,report,reportAnalyst}:{books:Book[];notes:Note[];resting:AnalystId[];decor:{slot:string;shape:Shape}[];
  onDesk:()=>void;onShelf:()=>void;onBoard:()=>void;onDoor:()=>void;onAnalyst:(id:AnalystId)=>void;report:(k:string,v:THREE.Vector3)=>void;reportAnalyst:(id:string,v:THREE.Vector3)=>void}){
  const {w,d,h}=ROOM,face=useRef(new THREE.Vector3(0,0,4)),flat=useMemo(()=>()=>0,[]),still=useMemo(()=>()=>new THREE.Quaternion(),[]);
  const v=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(()=>{for(const [k,p] of Object.entries(ROOM_SPOTS)){v.set(p.x,k==='board'||k==='window'?2.2:k==='door'?2.3:1.4,p.z);report('room-'+k,v)}});
  const planks=useMemo(()=>Array.from({length:Math.round(w/0.6)},(_,i)=>-w/2+0.3+i*0.6),[w]);
  return <group name="interior">
    <hemisphereLight args={['#fff4e2','#8a6448',0.65]}/>
    <pointLight position={[-2.4,2.1,-1.8]} color="#ffcf87" intensity={7} distance={7} decay={2}/>
    {/* the house round the room: no sky in here, just the dim inside of the walls */}
    <mesh><sphereGeometry args={[34,24,16]}/><meshBasicMaterial color={I().outside} side={THREE.BackSide}/></mesh>
    <mesh position-y={-0.12} rotation-x={-Math.PI/2}><planeGeometry args={[70,70]}/><meshBasicMaterial color={I().under}/></mesh>
    {/* floor: planks */}
    {/* the floor runs on toward the camera (the cut-open side), so a tall screen sees boards, not the dark */}
    <mesh position={[0,-0.05,2.5]} receiveShadow><boxGeometry args={[w,0.1,d+5]}/>{S(I().floor)}</mesh>
    {planks.map(x=><mesh key={x} position={[x+0.3,0.002,2.5]} rotation-x={-Math.PI/2}><planeGeometry args={[0.02,d+5]}/>{S(I().floorLine)}</mesh>)}
    {/* walls: back, left, right; a skirting board along them */}
    <mesh position={[0,h/2,-d/2]} receiveShadow><boxGeometry args={[w,h,0.12]}/>{S(I().wall)}</mesh>
    <mesh position={[-w/2,h/2,0]} receiveShadow><boxGeometry args={[0.12,h,d]}/>{S(I().wall2)}</mesh>
    <mesh position={[w/2,h/2,0]} receiveShadow><boxGeometry args={[0.12,h,d]}/>{S(I().wall2)}</mesh>
    {[[0,-d/2+0.08,w,0.08],[-w/2+0.08,0,0.08,d],[w/2-0.08,0,0.08,d]].map(([x,z,sx,sz],i)=><mesh key={i} position={[x,0.1,z]}><boxGeometry args={[sx,0.2,sz]}/>{S(I().trim)}</mesh>)}
    {/* the window onto the garden */}
    <group position={[ROOM_SPOTS.window.x,2.05,-d/2+0.07]}>
      <mesh><planeGeometry args={[1.5,1.1]}/><meshStandardMaterial color={I().sky} emissive={I().sky} emissiveIntensity={0.9} toneMapped={false}/></mesh>
      <mesh position={[0,-0.35,0.01]}><planeGeometry args={[1.5,0.4]}/><meshStandardMaterial color="#8fbf5e" emissive="#6fa04a" emissiveIntensity={0.5}/></mesh>
      {[[0,0.6,1.64,0.08],[0,-0.6,1.64,0.08],[-0.78,0,0.08,1.28],[0.78,0,0.08,1.28],[0,0,0.05,1.1],[0,0.05,1.5,0.05]].map(([x,y,sx,sy],i)=><mesh key={i} position={[x,y,0.03]}><boxGeometry args={[sx,sy,0.06]}/>{S(I().trim)}</mesh>)}
    </group>
    {/* desk: today's three */}
    <group position={[ROOM_SPOTS.desk.x,0,ROOM_SPOTS.desk.z]} onClick={click(onDesk)} name="room-desk">
      <mesh position-y={0.86} castShadow receiveShadow><boxGeometry args={[2.2,0.08,1.05]}/>{S(I().wood)}</mesh>
      {[[-1,-0.45],[1,-0.45],[-1,0.45],[1,0.45]].map(([x,z],i)=><mesh key={i} position={[x,0.42,z]} castShadow><boxGeometry args={[0.08,0.84,0.08]}/>{S(I().woodDark)}</mesh>)}
      <mesh position={[-0.3,0.91,0.05]} rotation={[-Math.PI/2,0,0.12]}><planeGeometry args={[0.6,0.8]}/>{S('#fbf7ec')}</mesh>
      <mesh position={[0.25,0.91,-0.05]} rotation={[-Math.PI/2,0,-0.2]}><planeGeometry args={[0.5,0.66]}/>{S('#f4eedf')}</mesh>
      <group position={[0.75,0.9,-0.25]}>
        <mesh position-y={0.25} castShadow><cylinderGeometry args={[0.03,0.05,0.5,8]}/>{S('#2f3a35')}</mesh>
        <mesh position-y={0.55}><sphereGeometry args={[0.13,14,10]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.6} toneMapped={false}/></mesh></group>
      <mesh position={[0,0.5,0.9]} castShadow><boxGeometry args={[0.6,0.06,0.55]}/>{S(I().woodDark)}</mesh>
      <mesh position={[0,0.82,1.15]} castShadow><boxGeometry args={[0.6,0.6,0.06]}/>{S(I().woodDark)}</mesh>
      <mesh position-y={0.8} visible={false}><boxGeometry args={[2.4,1.7,1.4]}/></mesh>
    </group>
    {/* bookshelf: a book per judgment */}
    <group position={[ROOM_SPOTS.shelf.x,0,ROOM_SPOTS.shelf.z]} onClick={click(onShelf)} name="room-shelf">
      <mesh position={[0,1.3,-0.24]} castShadow receiveShadow><boxGeometry args={[2.1,2.6,0.06]}/>{S(I().woodDark)}</mesh>
      {[-1.02,1.02].map(x=><mesh key={x} position={[x,1.3,0]} castShadow><boxGeometry args={[0.06,2.6,0.52]}/>{S(I().wood)}</mesh>)}
      {[0.28,1.06,1.84,2.58].map(y=><mesh key={y} position={[0,y,0]} castShadow receiveShadow><boxGeometry args={[2.04,0.05,0.52]}/>{S(I().wood)}</mesh>)}
      <Books books={books}/>
      <mesh position-y={1.3} visible={false}><boxGeometry args={[2.2,2.7,0.8]}/></mesh>
    </group>
    {/* cork board: a note per buried capsule */}
    <group position={[ROOM_SPOTS.board.x,2.05,ROOM_SPOTS.board.z+0.02]} onClick={click(onBoard)} name="room-board">
      <mesh castShadow><boxGeometry args={[2,1.2,0.05]}/>{S(I().trim)}</mesh>
      <mesh position-z={0.03}><planeGeometry args={[1.86,1.06]}/>{S(I().cork)}</mesh>
      <group position-z={0.04}><Notes notes={notes}/></group>
    </group>
    {/* the door out, warm light round it */}
    <group position={[ROOM_SPOTS.door.x,0,ROOM_SPOTS.door.z]} rotation-y={Math.PI/2} onClick={click(onDoor)} name="room-door">
      <mesh position-y={1.05}><boxGeometry args={[1.1,2.1,0.06]}/>{S('#7a3f2c')}</mesh>
      <mesh position={[0.36,1.05,0.05]}><sphereGeometry args={[0.05,10,8]}/>{S('#c99a3e')}</mesh>
      <mesh position={[0,2.2,0.04]}><planeGeometry args={[1.2,0.12]}/><meshStandardMaterial color="#ffcf7a" emissive="#ffb347" emissiveIntensity={0.9} toneMapped={false}/></mesh>
      <mesh position-y={1.1} visible={false}><boxGeometry args={[1.4,2.4,0.8]}/></mesh>
    </group>
    {/* rug, a plant */}
    <mesh position={[0.6,0.006,0.8]} rotation-x={-Math.PI/2} receiveShadow><circleGeometry args={[1.6,40]}/>{S(I().rug)}</mesh>
    <mesh position={[0.6,0.008,0.8]} rotation-x={-Math.PI/2}><ringGeometry args={[1.38,1.46,40]}/>{S('#f4eedf')}</mesh>
    <group position={[-3.7,0,-2.9]}><mesh position-y={0.25} castShadow><cylinderGeometry args={[0.28,0.22,0.5,14]}/>{S('#c27a55')}</mesh>
      {[0,1.2,2.4,3.6,4.8].map(a=><mesh key={a} position={[Math.cos(a)*0.18,0.75,Math.sin(a)*0.18]} rotation={[Math.sin(a)*0.4,0,Math.cos(a)*0.4]} castShadow><capsuleGeometry args={[0.08,0.5,4,8]}/>{S('#4f9a45')}</mesh>)}</group>
    {/* drawer items placed in the room */}
    {decor.map(dc=>{const sl=DECOR_SLOTS.find(x=>x.id===dc.slot&&x.room==='in');return sl&&<group key={dc.slot} position={[sl.x,0,sl.z]} rotation-y={sl.rot}><Decor shape={dc.shape}/></group>})}
    {/* analysts with nothing flagged rest in here */}
    <Suspense fallback={null}>{resting.map(id=><Analyst key={id} id={id} to={SEATS[id]} face={face} surface={flat} tilt={still} bubble={null}
      onPick={()=>onAnalyst(id)} report={reportAnalyst}/>)}</Suspense>
    <RoomCam/>
  </group>;
}
