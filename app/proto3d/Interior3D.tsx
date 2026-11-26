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
import {HouseDecor,houseMaterials,FillerRow,DeskChair} from './HouseDecor';
import {StudyDesk,TutorSeat,DoorDetail,CoatStand,FrontCozy,Cat} from './HouseMore';
import {DECOR_SLOTS,type Shape} from '../content/garden-items';
import type {AnalystId} from '../content/analysts';
import {frameFor} from '../core/frame';
import {Teacher} from './House3D';
import {Explorer} from './Explorer3D';
import {RoomMe} from './Seats';
import type {Look} from '../core/wardrobe';
import {Villager} from './Village3D';
import {VILLAGERS} from '../content/villagers';
import {surfaceY} from './ground';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const click=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};
export const ROOM={w:9,d:7,h:3.2};
const I=()=>LOOK.interior;
// where things stand (the DOM tags and the e2e test read these as points)
export const ROOM_SPOTS={desk:{x:-2.0,z:-1.45},shelf:{x:2.9,z:-2.85},board:{x:0.95,z:-3.42},door:{x:-4.42,z:1.4},window:{x:-1.2,z:-3.45}};
const TEACHER_AT={x:-2.3,z:-2.3,s:1.45},LIB_AT={x:1.5,z:-2.2},LIBRARIAN=VILLAGERS.find(v=>v.id==='librarian');
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
  // a phone held upright sees less across: back off a little more and aim a little left, so the teacher at the desk
  // (the room's far left) stays in the picture with the shelf and the door
  const tall=size.width<size.height,dist=I().camDist*(tall?I().tallDist:1),tx=tall?I().tallX:0;
  useMemo(()=>{const c=camera as THREE.PerspectiveCamera;c.clearViewOffset();c.fov=fr.fov;c.updateProjectionMatrix();
    c.position.set(tx,1+Math.cos(I().camPitch)*dist,-0.4+Math.sin(I().camPitch)*dist);c.lookAt(tx,1,-0.4)},[camera,dist,fr.fov,tx]);
  return <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.12} target={[tx,1,-0.4]}
    minAzimuthAngle={-0.55} maxAzimuthAngle={0.55} minPolarAngle={0.55} maxPolarAngle={1.25} minDistance={dist*0.6} maxDistance={dist*1.15}/>;
}

export function Interior({me,books,notes,resting,decor,onDesk,onShelf,onBoard,onDoor,onAnalyst,report,reportAnalyst,people=false}:{me?:Look;people?:boolean;books:Book[];notes:Note[];resting:AnalystId[];decor:{slot:string;shape:Shape}[];
  onDesk:()=>void;onShelf:()=>void;onBoard:()=>void;onDoor:()=>void;onAnalyst:(id:AnalystId)=>void;report:(k:string,v:THREE.Vector3)=>void;reportAnalyst:(id:string,v:THREE.Vector3)=>void}){
  const {w,d,h}=ROOM,face=useRef(new THREE.Vector3(0,0,4)),flat=useMemo(()=>()=>0,[]),still=useMemo(()=>()=>new THREE.Quaternion(),[]);
  const v=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(()=>{for(const [k,p] of Object.entries(ROOM_SPOTS)){v.set(p.x,k==='board'||k==='window'?2.2:k==='door'?2.3:k==='desk'&&people?2.55:1.4,p.z);report('room-'+k,v)}});
  // 피드백 2026-11-26 "집인데 왜 이렇게 썰렁해": wallpaper, a grained floor, a patterned rug and the cozy things (HouseDecor)
  const hm=useMemo(houseMaterials,[]);
  return <group name="interior">
    <hemisphereLight args={['#fff4e2','#8a6448',0.9]}/>
    <pointLight position={people?[-1.2,2.4,-0.6]:[-2.4,2.1,-1.8]} color="#ffcf87" intensity={people?4:7} distance={7} decay={2}/>
    {/* the house round the room: no sky in here, just the dim inside of the walls */}
    <mesh><sphereGeometry args={[34,24,16]}/><meshBasicMaterial color={I().outside} side={THREE.BackSide}/></mesh>
    <mesh position-y={-0.12} rotation-x={-Math.PI/2}><planeGeometry args={[70,70]}/><meshBasicMaterial color={I().under}/></mesh>
    {/* floor: planks */}
    {/* the floor runs on toward the camera (the cut-open side), so a tall screen sees boards, not the dark */}
    <mesh position={[0,-0.05,0]} receiveShadow><boxGeometry args={[w,0.1,d]}/><primitive object={hm.floor} attach="material"/></mesh>
    {/* 피드백 2026-11-26 "집 앞쪽 공간이 휑해": the floor ends where the room ends; a dollhouse lip shows its cut edge */}
    <mesh position={[0,-0.2,d/2+0.03]}><boxGeometry args={[w+0.24,0.42,0.06]}/>{S(I().woodDark)}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*(w/2+0.06),h/2-0.1,d/2+0.03]}><boxGeometry args={[0.24,h+0.2,0.06]}/>{S(I().woodDark)}</mesh>)}
    {/* walls: back, left, right; a skirting board along them */}
    <mesh position={[0,h/2,-d/2]} receiveShadow><boxGeometry args={[w,h,0.12]}/><primitive object={hm.back} attach="material"/></mesh>
    <mesh position={[-w/2,h/2,0]} receiveShadow><boxGeometry args={[0.12,h,d]}/><primitive object={hm.side} attach="material"/></mesh>
    <mesh position={[w/2,h/2,0]} receiveShadow><boxGeometry args={[0.12,h,d]}/><primitive object={hm.side} attach="material"/></mesh>
    {[[0,-d/2+0.08,w,0.08],[-w/2+0.08,0,0.08,d],[w/2-0.08,0,0.08,d]].map(([x,z,sx,sz],i)=><mesh key={i} position={[x,0.1,z]}><boxGeometry args={[sx,0.2,sz]}/>{S(I().trim)}</mesh>)}
    {/* desk: today's three */}
    <group position={[ROOM_SPOTS.desk.x,0,ROOM_SPOTS.desk.z]} onClick={click(onDesk)} name="room-desk">
      <StudyDesk/>
      <DeskChair position={[0,0,0.9]}/>
      <mesh position-y={0.8} visible={false}><boxGeometry args={[2.4,1.7,1.4]}/></mesh>
    </group>
    {/* 피드백 11-26 "이거 옷장으로 바꿔야": the wardrobe where the bookshelf stood: two doors, round knobs, a straw hat on
        top. The journal is the librarian's (the village library); a tap here opens the clothes */}
    <group position={[ROOM_SPOTS.shelf.x,0,ROOM_SPOTS.shelf.z]} onClick={click(onShelf)} name="room-shelf" userData={{books:books.length}}>
      {[-0.66,0.66].map(x=><mesh key={'l'+x} position={[x,0.07,0.05]} castShadow><boxGeometry args={[0.12,0.14,0.12]}/>{S(I().woodDark)}</mesh>)}
      <mesh position={[0,1.22,-0.02]} castShadow receiveShadow><boxGeometry args={[1.6,2.16,0.58]}/>{S(I().wood)}</mesh>
      <mesh position={[0,2.34,0]} castShadow><boxGeometry args={[1.74,0.12,0.66]}/>{S(I().woodDark)}</mesh>
      {[-0.39,0.39].map(x=><mesh key={'d'+x} position={[x,1.24,0.275]} castShadow><boxGeometry args={[0.74,1.96,0.04]}/>{S('#e8c79a')}</mesh>)}
      {[-0.39,0.39].map(x=><mesh key={'p'+x} position={[x,1.62,0.3]}><boxGeometry args={[0.52,0.7,0.02]}/>{S('#f2d8b0')}</mesh>)}
      {[-0.39,0.39].map(x=><mesh key={'q'+x} position={[x,0.78,0.3]}><boxGeometry args={[0.52,0.62,0.02]}/>{S('#f2d8b0')}</mesh>)}
      {[-0.07,0.07].map(x=><mesh key={'k'+x} position={[x,1.24,0.32]}><sphereGeometry args={[0.045,12,10]}/>{S('#c99a3e')}</mesh>)}
      <group position={[0.35,2.46,0.02]}>
        <mesh castShadow><cylinderGeometry args={[0.36,0.36,0.03,24]}/>{S('#f1dca0')}</mesh>
        <mesh position-y={0.09} castShadow><cylinderGeometry args={[0.17,0.19,0.17,20]}/>{S('#f1dca0')}</mesh>
        <mesh position-y={0.04}><cylinderGeometry args={[0.195,0.195,0.05,20]}/>{S('#e8b04a')}</mesh></group>
      <mesh position-y={1.3} visible={false}><boxGeometry args={[1.8,2.7,0.8]}/></mesh>
    </group>
    {/* 피드백 11-26: the cork board of grades is gone from the room (they are seen in the library) */}
    {/* the door out, warm light round it */}
    <group position={[ROOM_SPOTS.door.x,0,ROOM_SPOTS.door.z]} rotation-y={Math.PI/2} onClick={click(onDoor)} name="room-door">
      <mesh position-y={1.05}><boxGeometry args={[1.1,2.1,0.06]}/>{S('#7a3f2c')}</mesh>
      <mesh position={[0.36,1.05,0.05]}><sphereGeometry args={[0.05,10,8]}/>{S('#c99a3e')}</mesh>
      <DoorDetail/>
      <mesh position-y={1.1} visible={false}><boxGeometry args={[1.4,2.4,0.8]}/></mesh>
    </group>
    {/* rug, a plant */}
    <mesh position={[0.6,0.006,0.8]} rotation-x={-Math.PI/2} receiveShadow><circleGeometry args={[1.6,48]}/><primitive object={hm.rug} attach="material"/></mesh>
    <HouseDecor mats={hm}/>
    <group position={[-3.7,0,-2.9]}><mesh position-y={0.25} castShadow><cylinderGeometry args={[0.28,0.22,0.5,14]}/>{S('#c27a55')}</mesh>
      {[0,1.2,2.4,3.6,4.8].map(a=><mesh key={a} position={[Math.cos(a)*0.18,0.75,Math.sin(a)*0.18]} rotation={[Math.sin(a)*0.4,0,Math.cos(a)*0.4]} castShadow><capsuleGeometry args={[0.08,0.5,4,8]}/>{S('#4f9a45')}</mesh>)}</group>
    {/* drawer items placed in the room */}
    {decor.map(dc=>{const sl=DECOR_SLOTS.find(x=>x.id===dc.slot&&x.room==='in');return sl&&<group key={dc.slot} position={[sl.x,0,sl.z]} rotation-y={sl.rot}><Decor shape={dc.shape}/></group>})}
    {/* 피드백 2026-11-22: after the first lesson the house is this room seen from outside (3인칭): the teacher behind the
        desk (the quiz), the librarian by the bookshelf (the journal); the library left the village for here */}
    {/* 피드백 2026-11-26 "선생님이 왜 집에?": she is the visiting tutor, sat in her own armchair across the desk; her scarf
        and tote hang on the stand by the door */}
    {people&&<group position={[TEACHER_AT.x,0,TEACHER_AT.z-0.05]}><TutorSeat fur={LOOK.house.teacher.fur} pad={LOOK.house.teacher.light}/></group>}
    {people&&<group position={[TEACHER_AT.x,0,TEACHER_AT.z+1.5*TEACHER_AT.s]} scale={TEACHER_AT.s}><Teacher point={null} paws="rest" mood="calm" onBori={onDesk}/></group>}
    {people&&<CoatStand position={[-4.1,0,2.45]} scarf={LOOK.house.teacher.scarf}/>}
    <FrontCozy/>
    <Cat/>
    {/* 피드백 2026-11-26 "집에 들어가면 내 캐릭터가 사라져": I am in the room too (every inside place is seen from outside, me in it) */}
    {/* 피드백 2026-11-26 "의자가 있다면 클릭했을 때 거기에 앉을 수": the desk chair and the armchair; the tutor's is hers */}
    {me&&<RoomMe look={me} home={{x:0.35,z:1.25}} homeFace={-0.5} scale={LOOK.explorer.scale*0.95} seats={[
      {id:'desk-chair',x:ROOM_SPOTS.desk.x,z:ROOM_SPOTS.desk.z+0.92,top:0.575,face:Math.PI,box:[0.62,1.1,0.62],at:[ROOM_SPOTS.desk.x,0.55,ROOM_SPOTS.desk.z+0.95],
        // 피드백 2026-11-26 "앉을 때 가구를 통과": round to the chair's open side, then in (not through its back)
        via:[{x:ROOM_SPOTS.desk.x+0.8,z:ROOM_SPOTS.desk.z+1.05}]},
      {id:'armchair',x:-1.7,z:2.25,top:0.6,face:0.4,box:[1.0,1.1,0.9],at:[-1.7,0.55,2.25],via:[{x:-0.78,z:2.51},{x:-1.49,z:2.76}]/* past the footstool, to the seat's front */},
      ...(people?[{id:'tutor-chair',x:TEACHER_AT.x,z:TEACHER_AT.z,top:0.6,face:0,taken:true,box:[1.0,1.3,0.9] as [number,number,number],at:[TEACHER_AT.x,0.6,TEACHER_AT.z] as [number,number,number]}]:[])]}/>}
    {/* 피드백 2026-11-23: the 사서 works in the village library now (Shop3D.tsx); the shelf stays */}
    {/* analysts with nothing flagged rest in here */}
    <Suspense fallback={null}>{resting.map(id=><Analyst key={id} id={id} to={SEATS[id]} face={face} surface={flat} tilt={still} bubble={null}
      onPick={()=>onAnalyst(id)} report={reportAnalyst}/>)}</Suspense>
    <RoomCam/>
  </group>;
}
