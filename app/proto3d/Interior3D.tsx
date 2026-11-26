'use client';
// Inside the house: the three analysts' workroom (a dollhouse cut open toward the camera). Everything in it is a way
// into something the game already has:
//   desk        today's three (core/today.ts)        bookshelf   my judgments as books → the track record
//   cork board  the buried capsules as notes, D-n     window      the garden outside, its weather
//   door        back out
// Analysts with nothing flagged rest in here. Three decor slots (garden-items DECOR_SLOTS room 'in') take drawer items.
// Room coordinates: x across, z toward the camera, y up, floor at 0. Code-made primitives on the shared soft material.
import {Suspense,useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {LOOK} from './look';
import {Analyst} from './Analyst3D';
import {Decor} from './Garden3D';
import {HouseDecor,houseMaterials,FillerRow,DeskChair} from './HouseDecor';
import {StudyDesk,TutorSeat,DoorDetail,CoatStand,FrontCozy,Cat} from './HouseMore';
import {DECOR_SLOTS,type Shape} from '../content/garden-items';
import type {AnalystId} from '../content/analysts';
import {Teacher} from './House3D';
import {Explorer} from './Explorer3D';
import {RoomMe,type Area} from './Seats';
import {RoomFollow} from './RoomView';
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

// 피드백 2026-11-26 "방 UI 통일 + 양옆 보고 돌아다니기": the camera is RoomView's (behind me, following, a sideways drag
// looks round), and I walk the floor round the furniture. The room is closed over (a ceiling, the walls run on past
// the camera) so no dark shows above or in front.
const CEIL=4.4,MORE=8;
const circle=(cx:number,cz:number,r:number)=>(x:number,z:number)=>(x-cx)**2+(z-cz)**2<r*r;
const rect=(x0:number,x1:number,z0:number,z1:number)=>(x:number,z:number)=>x>x0&&x<x1&&z>z0&&z<z1;
const HOME_BLOCKS=[rect(-3.3,-0.75,-3.5,-0.7)/* desk, the tutor behind it */,rect(-2.45,-1.55,-0.75,-0.15)/* desk chair */,rect(1.75,4.5,-3.5,-2.2)/* shelf */,
  circle(-1.7,2.25,0.65)/* armchair */,circle(-1.33,3.12,0.4)/* footstool */,rect(0.05,1.35,1.95,2.75)/* coffee table */,circle(-3.7,-2.9,0.45)/* plant */,
  rect(-4.6,-3.6,-0.9,0.9)/* stove */];
const HOME_AREA:Area={x:[-3.9,3.9],z:[-2.6,3.25],block:(x,z)=>HOME_BLOCKS.some(b=>b(x,z))};

export function Interior({me,books,notes,resting,decor,onDesk,onShelf,onBoard,onDoor,onAnalyst,report,reportAnalyst,people=false}:{me?:Look;people?:boolean;books:Book[];notes:Note[];resting:AnalystId[];decor:{slot:string;shape:Shape}[];
  onDesk:()=>void;onShelf:()=>void;onBoard:()=>void;onDoor:()=>void;onAnalyst:(id:AnalystId)=>void;report:(k:string,v:THREE.Vector3)=>void;reportAnalyst:(id:string,v:THREE.Vector3)=>void}){
  const {w,d,h}=ROOM,face=useRef(new THREE.Vector3(0,0,4)),flat=useMemo(()=>()=>0,[]),still=useMemo(()=>()=>new THREE.Quaternion(),[]);
  const v=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(()=>{for(const [k,p] of Object.entries(ROOM_SPOTS)){v.set(p.x,k==='board'||k==='window'?2.2:k==='door'?2.3:k==='desk'&&people?2.55:1.4,p.z);report('room-'+k,v)}});
  // 피드백 2026-11-26 "집인데 왜 이렇게 썰렁해": wallpaper, a grained floor, a patterned rug and the cozy things (HouseDecor)
  const hm=useMemo(houseMaterials,[]),meAt=useRef({x:0.35,z:1.25});
  return <group name="interior">
    <hemisphereLight args={['#fff4e2','#8a6448',0.9]}/>
    <pointLight position={people?[-1.2,2.4,-0.6]:[-2.4,2.1,-1.8]} color="#ffcf87" intensity={people?4:7} distance={7} decay={2}/>
    {/* the house round the room: no sky in here, just the dim inside of the walls */}
    <mesh><sphereGeometry args={[34,24,16]}/><meshBasicMaterial color={I().outside} side={THREE.BackSide}/></mesh>
    <mesh position-y={-0.12} rotation-x={-Math.PI/2}><planeGeometry args={[70,70]}/><meshBasicMaterial color={I().under}/></mesh>
    {/* floor: planks */}
    {/* the floor runs on toward the camera (the cut-open side), so a tall screen sees boards, not the dark */}
    <mesh position={[0,-0.05,0]} receiveShadow><boxGeometry args={[w,0.1,d]}/><primitive object={hm.floor} attach="material"/></mesh>
    {/* the rest of the house toward the camera: floor, side walls, and a ceiling over all (RoomFollow looks from in here) */}
    <mesh position={[0,-0.05,d/2+MORE/2]} receiveShadow><boxGeometry args={[w,0.1,MORE]}/><primitive object={hm.floor} attach="material"/></mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*w/2,CEIL/2,d/2+MORE/2]}><boxGeometry args={[0.12,CEIL,MORE]}/><primitive object={hm.side} attach="material"/></mesh>)}
    {/* above the old wall top: a cornice and a plain upper wall up to the ceiling */}
    <mesh position={[0,(h+CEIL)/2,-d/2]}><boxGeometry args={[w,CEIL-h,0.12]}/>{S(I().wallUp)}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*w/2,(h+CEIL)/2,0]}><boxGeometry args={[0.12,CEIL-h,d]}/>{S(I().wallUp)}</mesh>)}
    <mesh position={[0,h+0.04,-d/2+0.1]}><boxGeometry args={[w,0.1,0.12]}/>{S(I().woodDark)}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*(w/2-0.1),h+0.04,MORE/2]}><boxGeometry args={[0.12,0.1,d+MORE]}/>{S(I().woodDark)}</mesh>)}
    <mesh position={[0,CEIL+0.05,MORE/2]}><boxGeometry args={[w+0.2,0.1,d+MORE]}/>{S(I().ceiling)}</mesh>
    {[-2,0,2].map(z=><mesh key={z} position={[0,CEIL-0.06,z]}><boxGeometry args={[w,0.12,0.18]}/>{S(I().woodDark)}</mesh>)}
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
    {/* bookshelf: a book per judgment */}
    <group position={[ROOM_SPOTS.shelf.x,0,ROOM_SPOTS.shelf.z]} onClick={click(onShelf)} name="room-shelf">
      <mesh position={[0,1.3,-0.24]} castShadow receiveShadow><boxGeometry args={[2.1,2.6,0.06]}/>{S(I().woodDark)}</mesh>
      {[-1.02,1.02].map(x=><mesh key={x} position={[x,1.3,0]} castShadow><boxGeometry args={[0.06,2.6,0.52]}/>{S(I().wood)}</mesh>)}
      {[0.28,1.06,1.84,2.58].map(y=><mesh key={y} position={[0,y,0]} castShadow receiveShadow><boxGeometry args={[2.04,0.05,0.52]}/>{S(I().wood)}</mesh>)}
      <Books books={books}/>
      {/* the rest of each shelf: books of my own and a few things (the judgment books stay first) */}
      {[0,1,2].map(r=>{const n=Math.min(12,Math.max(0,books.length-r*12));return <FillerRow key={r} from={-0.95+n*0.15} to={0.98} y={0.305+r*0.78} seed={11+r*17} maxH={0.66}/>})}
      <mesh position-y={1.3} visible={false}><boxGeometry args={[2.2,2.7,0.8]}/></mesh>
    </group>
    {/* cork board: a note per buried capsule */}
    <group position={[ROOM_SPOTS.board.x,2.05,ROOM_SPOTS.board.z+0.02]} onClick={click(onBoard)} name="room-board">
      {/* 피드백 2026-11-26 "창문과 칠판이 겹쳐": a smaller board, right of the window's curtains */}
      <mesh castShadow><boxGeometry args={[1.6,1.0,0.05]}/>{S(I().trim)}</mesh>
      <mesh position-z={0.03}><planeGeometry args={[1.48,0.88]}/>{S(I().cork)}</mesh>
      <group position-z={0.04} scale={0.82}><Notes notes={notes}/></group>
    </group>
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
    {me&&<RoomMe look={me} home={{x:0.35,z:1.25}} homeFace={-0.5} scale={LOOK.explorer.scale*0.95} area={HOME_AREA} me={meAt} seats={[
      {id:'desk-chair',x:ROOM_SPOTS.desk.x,z:ROOM_SPOTS.desk.z+0.92,top:0.575,face:Math.PI,box:[0.62,1.1,0.62],at:[ROOM_SPOTS.desk.x,0.55,ROOM_SPOTS.desk.z+0.95],
        // 피드백 2026-11-26 "앉을 때 가구를 통과": round to the chair's open side, then in (not through its back)
        via:[{x:ROOM_SPOTS.desk.x+0.8,z:ROOM_SPOTS.desk.z+1.05}]},
      // 피드백 2026-11-26 "소파를 관통": sat a little forward on the cushion (its front edge 0.42 out) so the legs hang over it
      {id:'armchair',x:-1.63,z:2.42,top:0.63,face:0.4,box:[1.0,1.1,0.9],at:[-1.7,0.55,2.25],via:[{x:-0.78,z:2.51},{x:-1.49,z:2.76}]/* past the footstool, to the seat's front */},
      ...(people?[{id:'tutor-chair',x:TEACHER_AT.x,z:TEACHER_AT.z,top:0.6,face:0,taken:true,box:[1.0,1.3,0.9] as [number,number,number],at:[TEACHER_AT.x,0.6,TEACHER_AT.z] as [number,number,number]}]:[])]}/>}
    {/* 피드백 2026-11-23: the 사서 works in the village library now (Shop3D.tsx); the shelf stays */}
    {/* analysts with nothing flagged rest in here */}
    <Suspense fallback={null}>{resting.map(id=><Analyst key={id} id={id} to={SEATS[id]} face={face} surface={flat} tilt={still} bubble={null}
      onPick={()=>onAnalyst(id)} report={reportAnalyst}/>)}</Suspense>
    <RoomFollow me={meAt} halfW={w/2}/>
  </group>;
}
