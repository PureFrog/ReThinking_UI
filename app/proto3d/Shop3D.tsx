'use client';
// 피드백 2026-11-23 "상인들도 상점을 만들어서 상점에 들어가면 안에 상인들이 있는 형태": the four people who keep a
// shop (상인, 건물 점원, 옷 점원, 사서) stand inside their own building. Outside: ShopHouse, a small house in the
// shop's colour with its sign over the door (tapping it walks me to the door). Inside: ShopRoom, a cut-open room
// with the counter, the shop's own goods on the shelves and the keeper behind the counter, facing me.
// Room coordinates as in Interior3D: x across, z toward the camera, y up, floor at 0.
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {OnGround} from './ground';
import {Explorer} from './Explorer3D';
import {RoomMe,type Area} from './Seats';
import {RoomFollow} from './RoomView';
import {ROLE_KIT,ROLE_LOOK} from './RoleKit';
import {LOOK} from './look';
import type {Look} from '../core/wardrobe';
import {place} from './places';
import {TAILOR_STALL} from '../content/villagers';
import {LibraryDecor} from './LibraryDecor';
import {wallpaper,parquet} from './ui/StudyDecor';
import {BuilderFacade,TailorFacade,LibraryFacade} from './ShopFacades';
import {ShopShell,shopMats,BuilderDecor,BuilderCounter,TailorDecor,counterFront} from './ShopDecor';

// 피드백 2026-11-23: the merchant (가상 종목) keeps the open stall outside, no building
export type ShopId='builder'|'tailor'|'librarian';
export const SHOP_IDS:ShopId[]=['builder','tailor','librarian'];
export const SHOP_INFO:Record<ShopId,{name:string;sign:string;wall:string;roof:string;trim:string;floor:string;goods:string[]}>={
  builder:{name:'건물 상점',sign:'🏠',wall:'#f1e3c8',roof:'#e08a2e',trim:'#f2c230',floor:'#a88664',goods:['#c44b3b','#6fbf4a','#f2d36a','#8a6a3a']},
  tailor:{name:'옷 가게',sign:'👕',wall:'#fbeef0',roof:'#d46a8c',trim:'#f3d0dc',floor:'#c49a7a',goods:['#6aa6d8','#d46a8c','#f2d36a','#4f8a5b']},
  librarian:{name:'도서관',sign:'📖',wall:'#efe7d6',roof:'#4f6b5a',trim:'#c9a23a',floor:'#9a7454',goods:['#b8372b','#3f6fa8','#d9a441','#4f8a5b','#7a4f8f']},
};
const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const glowWin=new THREE.MeshStandardMaterial({color:'#ffe7a8',emissive:'#ffc867',emissiveIntensity:0.9,toneMapped:false});
const click=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};
// the door is on the house's front (+z); where I stand to go in (also the tutorial's lead)
export const DOOR_OUT=2.6;
export const doorOf=(p:{x:number;z:number;rot:number},out=DOOR_OUT)=>({x:p.x+Math.sin(p.rot)*out,z:p.z+Math.cos(p.rot)*out});
// where each stands in the village (the old stalls' and places' spots, places.ts PLACE_AT) and its door outside
export const SHOP_AT:Record<ShopId,{x:number;z:number;rot:number}>={builder:place('cart'),tailor:TAILOR_STALL,librarian:place('library')};
export const SHOP_DOOR=Object.fromEntries(SHOP_IDS.map(id=>[id,doorOf(SHOP_AT[id],id==='librarian'?DOOR_OUT+0.9:DOOR_OUT)])) as Record<ShopId,{x:number;z:number}>;

// outside: a small house, 3.6 wide; the library is a size bigger with columns
export function ShopHouse({id,x,z,rot,open=true,onPick}:{id:ShopId;x:number;z:number;rot:number;open?:boolean;onPick:()=>void}){
  const s=SHOP_INFO[id],big=id==='librarian',W=big?4.6:3.6,D=big?3.6:3.0,H=big?2.6:2.2;
  return <OnGround x={x} z={z} rot={rot}><group name={'shop-'+id} onClick={click(onPick)}>
    <mesh position-y={0.08} receiveShadow><boxGeometry args={[W+0.5,0.16,D+0.5]}/>{S('#d9cfba')}</mesh>
    {/* 피드백 2026-11-26: each shop its own building (ShopFacades) */}
    {id==='builder'?<BuilderFacade W={W} D={D} H={H} lit={open} glow={glowWin}/>:id==='tailor'?<TailorFacade W={W} D={D} H={H} lit={open} glow={glowWin}/>:<LibraryFacade W={W} D={D} H={H} lit={open} glow={glowWin}/>}
    {/* an easy thing to tap */}
    <mesh position-y={1.4} visible={false}><boxGeometry args={[W+0.6,2.8,D+1.2]}/></mesh>
  </group></OnGround>;
}

// inside: the counter, shelves of the shop's goods, the keeper behind the counter
const ROOM={w:7,d:5,h:3.6};
// 피드백 2026-11-23 "들어가면 3인칭": I stand in front of the counter and the camera is behind me, a little up and to
// the side, so I see myself and the keeper across the counter
const ME_AT={x:-1.05,z:1.5},ME_TURN=Math.atan2(0-ME_AT.x,-0.9-ME_AT.z);
// 피드백 2026-11-26 "방 UI 통일": the camera is RoomView's (behind me, following, a sideways drag looks round); I can
// walk the shop floor in front of the counter and round its ends (not behind it: that is the keeper's)
const SHOP_AREA:Area={x:[-2.9,2.9],z:[-1.8,2.2],block:(x,z)=>Math.abs(x)<1.95&&z<0.85};
function Goods({id}:{id:ShopId}){const s=SHOP_INFO[id];
  // three shelves on the back wall, the shop's own things on them
  return <group position={[0,0,-ROOM.d/2+0.32]}>
    <mesh position={[0,1.35,-0.05]} castShadow receiveShadow><boxGeometry args={[4.6,2.7,0.12]}/>{S('#8a6446')}</mesh>
    {[0.45,1.2,1.95].map((y,r)=><group key={r} position-y={y}>
      <mesh receiveShadow><boxGeometry args={[4.6,0.07,0.5]}/>{S('#a77d58')}</mesh>
      {Array.from({length:id==='librarian'?18:7},(_,i)=>{const c=s.goods[(i+r)%s.goods.length];
        if(id==='librarian'){const h=0.34+((i*7+r*3)%4)*0.05;return <mesh key={i} position={[-2.1+i*0.245,0.04+h/2,0]} castShadow><boxGeometry args={[0.2,h,0.36]}/>{S(c)}</mesh>}
        if(id==='tailor')return <group key={i} position={[-1.9+i*0.63,0.3,0]}><mesh position-y={0.18}><boxGeometry args={[0.36,0.02,0.02]}/>{S('#777')}</mesh>
          <mesh><boxGeometry args={[0.32,0.34,0.06]}/>{S(c)}</mesh><mesh position={[-0.2,0.1,0]} rotation-z={0.5}><boxGeometry args={[0.1,0.14,0.06]}/>{S(c)}</mesh><mesh position={[0.2,0.1,0]} rotation-z={-0.5}><boxGeometry args={[0.1,0.14,0.06]}/>{S(c)}</mesh></group>;
        // builder: little houses and potted trees
        return <group key={i} position={[-1.9+i*0.63,0.05,0]}>{i%2?<><mesh position-y={0.14}><boxGeometry args={[0.3,0.26,0.28]}/>{S('#f3e6cc')}</mesh><mesh position-y={0.36} rotation-y={Math.PI/4}><coneGeometry args={[0.25,0.2,4]}/>{S(c)}</mesh></>
          :<><mesh position-y={0.1}><cylinderGeometry args={[0.12,0.09,0.18,10]}/>{S('#b0703a')}</mesh><mesh position-y={0.28}><sphereGeometry args={[0.13,10,8]}/>{S(c)}</mesh></>}</group>})}
    </group>)}
  </group>;
}
export function ShopRoom({id,look}:{id:ShopId;look:Look}){
  // 피드백 2026-11-26: the library gets its own wallpaper, parquet and furniture (LibraryDecor)
  const lib=useMemo(()=>id==='librarian'?{floor:new THREE.MeshStandardMaterial({map:parquet(ROOM.w,ROOM.d+7),roughness:0.85}),wall:new THREE.MeshStandardMaterial({map:wallpaper('#e8dcc0',ROOM.w,ROOM.h),roughness:0.95}),side:new THREE.MeshStandardMaterial({map:wallpaper('#e2d4b6',ROOM.d+7,ROOM.h),roughness:0.95})}:null,[id]);
  // 피드백 2026-11-26 "상인의 방 휑해": the builder's and the tailor's rooms get their own floor, walls, light and things (ShopDecor)
  const sm=useMemo(()=>id==='librarian'?null:shopMats(id),[id]);
  const front=useMemo(()=>counterFront(id==='tailor'?'#b98a6e':'#8a5a3e'),[id]);useEffect(()=>()=>front.dispose(),[front]);
  const lm=lib??sm,meAt=useRef({...ME_AT});
  const s=SHOP_INFO[id],{w,d,h}=ROOM,kitLook=useMemo(()=>{const r=ROLE_LOOK[id];return r?{...look,coat:r.coat,hat:r.hat,bag:null,tool:null}:look},[id,look]);
  return <group name={'shop-room-'+id}>
    <RoomFollow me={meAt} halfW={ROOM.w/2}/>
    <hemisphereLight args={['#fff4e2','#8a6448',sm?0.7:0.9]}/>
    <directionalLight position={[2,5,5]} intensity={sm?0.95:1.6} color="#fff1dc"/>
    <mesh><sphereGeometry args={[30,24,16]}/><meshBasicMaterial color="#2a2420" side={THREE.BackSide}/></mesh>
    <mesh position={[0,-0.05,3.5]} receiveShadow><boxGeometry args={[w,0.1,d+7]}/>{lm?<primitive object={lm.floor} attach="material"/>:S(s.floor)}</mesh>
    <mesh position={[0,h/2,-d/2]} receiveShadow><boxGeometry args={[w,h,0.12]}/>{lm?<primitive object={lm.wall} attach="material"/>:S(s.wall)}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*w/2,h/2,3.5]} receiveShadow><boxGeometry args={[0.12,h,d+7]}/>{lm?<primitive object={lm.side} attach="material"/>:S(s.wall)}</mesh>)}
    <mesh position={[0,h+0.05,3.5]}><boxGeometry args={[w+0.2,0.1,d+7]}/>{S(s.wall)}</mesh>
    <mesh position={[0,h-0.1,-d/2+0.08]}><boxGeometry args={[w,0.2,0.1]}/>{S(s.roof)}</mesh>
    {sm&&id!=='librarian'&&<ShopShell kind={id} mats={sm}/>}
    {id==='librarian'?<LibraryDecor/>:id==='builder'?<BuilderDecor/>:<TailorDecor/>}
    {/* the keeper behind the counter */}
    <group position={[0,0,-0.9]} scale={LOOK.explorer.scale*1.25}><Suspense fallback={null}><Explorer look={kitLook} kit={ROLE_KIT[id]}/></Suspense></group>
    {/* me, from behind (3인칭) */}
    {/* 피드백 2026-11-26 "의자가 있다면 앉을 수": the 옷 가게's fitting-room stool (ShopDecor FittingRoom) */}
    <RoomMe name="shop-me" look={look} home={ME_AT} homeFace={ME_TURN} scale={LOOK.explorer.scale*1.25} area={SHOP_AREA} me={meAt}
      seats={id==='tailor'?[{id:'fitting-stool',x:7/2-0.75+0.1,z:-5/2+0.85-0.3,top:0.46,face:-Math.PI/2,box:[0.5,0.9,0.5],at:[7/2-0.65,0.4,-5/2+0.55],via:[{x:2.2,z:1.3},{x:2.05,z:-1.75}]}]:[]}/>
    <group position={[0,0,0.2]}>
      <mesh position-y={0.5} castShadow receiveShadow><boxGeometry args={[3.2,1,0.7]}/>{id==='librarian'?S('#8a5a3e'):<meshStandardMaterial map={front} roughness={0.7}/>}</mesh>
      {id!=='librarian'&&<mesh position={[0,0.08,0.36]}><boxGeometry args={[3.24,0.16,0.04]}/>{S('#5a3d2b')}</mesh>}
      <mesh position-y={1.03}><boxGeometry args={[3.4,0.07,0.85]}/>{S('#c79362')}</mesh>
      {/* on the counter: the shop's thing */}
      
      {id==='tailor'&&<mesh position={[0.9,1.12,0.1]} rotation-x={Math.PI/2}><torusGeometry args={[0.14,0.03,8,20]}/>{S('#f2d36a')}</mesh>}
      {id==='builder'&&<><group position={[0.9,1.1,0.1]}><mesh position-y={0.1}><boxGeometry args={[0.24,0.2,0.22]}/>{S('#f3e6cc')}</mesh><mesh position-y={0.27} rotation-y={Math.PI/4}><coneGeometry args={[0.2,0.16,4]}/>{S('#c44b3b')}</mesh></group><BuilderCounter/></>}
    </group>
  </group>;
}
