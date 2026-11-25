'use client';
// 피드백 2026-11-23 "상인들도 상점을 만들어서 상점에 들어가면 안에 상인들이 있는 형태": the four people who keep a
// shop (상인, 건물 점원, 옷 점원, 사서) stand inside their own building. Outside: ShopHouse, a small house in the
// shop's colour with its sign over the door (tapping it walks me to the door). Inside: ShopRoom, a cut-open room
// with the counter, the shop's own goods on the shelves and the keeper behind the counter, facing me.
// Room coordinates as in Interior3D: x across, z toward the camera, y up, floor at 0.
import {Suspense,useMemo} from 'react';
import {useThree,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {OnGround} from './ground';
import {Explorer} from './Explorer3D';
import {ROLE_KIT,ROLE_LOOK} from './RoleKit';
import {LOOK} from './look';
import type {Look} from '../core/wardrobe';
import {place} from './places';
import {TAILOR_STALL} from '../content/villagers';
import {useGLTF} from '@react-three/drei';
import {MODELS} from './models';

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

// 2026-11-25 (user): a building model (models.ts MODELS.building), shadows on, the glass-like volume material drawn as paint
export function BuildingModel({url,scale}:{url:string;scale:number}){
  const {scene}=useGLTF(url);
  const obj=useMemo(()=>{const o=scene.clone(true);o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
    const mat=m.material as THREE.MeshPhysicalMaterial;if(mat&&'transmission' in mat){mat.transmission=0;mat.thickness=0}}});return o},[scene]);
  return <primitive object={obj} scale={scale}/>;
}
Object.values(MODELS.building).forEach(u=>useGLTF.preload(u));
// how big each model stands in the village (the file is about 1 across): roughly the old houses' footprint
export const BUILDING_SCALE={library:5.4,builder:4.0,tailor:3.9,home:5.4};

// outside: the shop's own building (2026-11-25 models: 도서관 a book house, 건물 상점 a flower-roof house, 옷 가게 a
// shop with a hanger on the roof); the old box house stays as the stand-in while the file loads
export function ShopHouse({id,x,z,rot,open=true,onPick}:{id:ShopId;x:number;z:number;rot:number;open?:boolean;onPick:()=>void}){
  return <OnGround x={x} z={z} rot={rot}><group name={'shop-'+id} onClick={click(onPick)}>
    <Suspense fallback={<BoxHouse id={id} open={open}/>}><BuildingModel url={MODELS.building[id==='librarian'?'library':id]} scale={BUILDING_SCALE[id==='librarian'?'library':id]}/></Suspense>
    {/* an easy thing to tap */}
    <mesh position-y={1.5} visible={false}><boxGeometry args={[id==='librarian'?5:4.2,3,id==='librarian'?3.6:4.2]}/></mesh>
  </group></OnGround>;
}
// the old box house (before the models): a small house, 3.6 wide; the library a size bigger with columns
function BoxHouse({id,open}:{id:ShopId;open:boolean}){
  const s=SHOP_INFO[id],big=id==='librarian',W=big?4.6:3.6,D=big?3.6:3.0,H=big?2.6:2.2;
  return <group>
    <mesh position-y={0.08} receiveShadow><boxGeometry args={[W+0.5,0.16,D+0.5]}/>{S('#d9cfba')}</mesh>
    <mesh position-y={0.16+H/2} castShadow receiveShadow><boxGeometry args={[W,H,D]}/>{S(s.wall)}</mesh>
    {/* the roof: two slopes and the gable ends */}
    {[-1,1].map(k=><mesh key={k} position={[0,0.16+H+0.55,k*D/4]} rotation-x={k*-0.62} castShadow><boxGeometry args={[W+0.5,0.12,D*0.66]}/>{S(s.roof)}</mesh>)}
    <mesh position={[0,0.16+H+0.04,0]} castShadow><boxGeometry args={[W+0.3,0.1,D+0.3]}/>{S(s.trim)}</mesh>
    {/* the door, its frame and a step */}
    <mesh position={[0,0.16+0.75,D/2+0.02]}><boxGeometry args={[0.95,1.5,0.06]}/>{S('#7a5238')}</mesh>
    <mesh position={[0,0.16+1.55,D/2+0.03]}><boxGeometry args={[1.15,0.12,0.08]}/>{S(s.trim)}</mesh>
    <mesh position={[0.3,0.16+0.75,D/2+0.07]}><sphereGeometry args={[0.05,8,6]}/>{S('#e0b13a')}</mesh>
    {/* windows either side, lit when open */}
    {[-1,1].map(k=><group key={k} position={[k*(W/2-0.75),0.16+1.15,D/2+0.02]}>
      <mesh><boxGeometry args={[0.8,0.7,0.05]}/>{S(s.trim)}</mesh>
      <mesh position-z={0.03}><planeGeometry args={[0.66,0.56]}/>{open?<primitive object={glowWin} attach="material"/>:S('#5c6470')}</mesh></group>)}
    {/* the sign board over the door: the shop's colour and its goods in little blocks */}
    <group position={[0,0.16+H+0.05,D/2+0.12]}>
      <mesh><boxGeometry args={[1.9,0.5,0.08]}/>{S(s.roof)}</mesh>
      {s.goods.slice(0,4).map((c,i)=><mesh key={i} position={[-0.6+i*0.4,0,0.06]}><boxGeometry args={[0.22,0.22,0.05]}/>{S(c)}</mesh>)}
    </group>
    {big&&[-1,1].map(k=><mesh key={'c'+k} position={[k*0.95,0.16+0.85,D/2+0.35]} castShadow><cylinderGeometry args={[0.11,0.13,1.7,12]}/>{S('#f4f1ea')}</mesh>)}
    {big&&<mesh position={[0,0.16+1.75,D/2+0.35]} castShadow><boxGeometry args={[2.4,0.14,0.5]}/>{S('#f4f1ea')}</mesh>}
  </group>;
}

// inside: the counter, shelves of the shop's goods, the keeper behind the counter
const ROOM={w:7,d:5,h:3.6};
// 피드백 2026-11-23 "들어가면 3인칭": I stand in front of the counter and the camera is behind me, a little up and to
// the side, so I see myself and the keeper across the counter
const ME_AT={x:-1.05,z:1.5},ME_TURN=Math.atan2(0-ME_AT.x,-0.9-ME_AT.z);
function ShopCam(){
  const {camera,size}=useThree(),tall=size.width<size.height;
  useMemo(()=>{const c=camera as THREE.PerspectiveCamera;c.clearViewOffset();c.fov=tall?55:42;c.updateProjectionMatrix();
    c.up.set(0,1,0);c.position.set(tall?0.2:0.9,tall?2.9:2.75,tall?7.6:5.6);c.lookAt(tall?-0.45:-0.35,tall?0.85:1.15,-0.5)},[camera,tall]);
  return null;
}
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
  const s=SHOP_INFO[id],{w,d,h}=ROOM,kitLook=useMemo(()=>{const r=ROLE_LOOK[id];return r?{...look,coat:r.coat,hat:r.hat,bag:null,tool:null}:look},[id,look]);
  return <group name={'shop-room-'+id}>
    <ShopCam/>
    {/* the village's own sky and sun stay on in here too (Scene3D), so these only add a little warmth
        (피드백 2026-11-25 "이거 너무 밝아": was 0.9 + 1.6 on top of the village light, walls and faces blown out) */}
    {/* the village's own sky and sun stay on in here too (Scene3D), so these only add a little warmth
        (피드백 2026-11-25 "이거 너무 밝아": was 0.9 + 1.6 on top of the village light, walls and faces blown out) */}
    <hemisphereLight args={['#fff1dc','#7a5a40',0.5]}/>
    <directionalLight position={[2,5,5]} intensity={0.9} color="#ffe2b8"/>
    <mesh><sphereGeometry args={[30,24,16]}/><meshBasicMaterial color="#2a2420" side={THREE.BackSide}/></mesh>
    <mesh position={[0,-0.05,3.5]} receiveShadow><boxGeometry args={[w,0.1,d+7]}/>{S(s.floor)}</mesh>
    <mesh position={[0,h/2,-d/2]} receiveShadow><boxGeometry args={[w,h,0.12]}/>{S(s.wall)}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*w/2,h/2,3.5]} receiveShadow><boxGeometry args={[0.12,h,d+7]}/>{S(s.wall)}</mesh>)}
    <mesh position={[0,h+0.05,3.5]}><boxGeometry args={[w+0.2,0.1,d+7]}/>{S(s.wall)}</mesh>
    <mesh position={[0,h-0.1,-d/2+0.08]}><boxGeometry args={[w,0.2,0.1]}/>{S(s.roof)}</mesh>
    <Goods id={id}/>
    {/* the keeper behind the counter */}
    <group position={[0,0,-0.9]} scale={LOOK.explorer.scale*1.25}><Suspense fallback={null}><Explorer look={kitLook} kit={ROLE_KIT[id]}/></Suspense></group>
    {/* me, from behind (3인칭) */}
    <group name="shop-me" position={[ME_AT.x,0,ME_AT.z]} rotation-y={ME_TURN} scale={LOOK.explorer.scale*1.25}><Suspense fallback={null}><Explorer look={look}/></Suspense></group>
    <group position={[0,0,0.2]}>
      <mesh position-y={0.5} castShadow receiveShadow><boxGeometry args={[3.2,1,0.7]}/>{S('#8a5a3e')}</mesh>
      <mesh position-y={1.03}><boxGeometry args={[3.4,0.07,0.85]}/>{S('#c79362')}</mesh>
      {/* on the counter: the shop's thing */}
      {id==='librarian'&&<group position={[0.9,1.1,0.1]}><mesh rotation-y={0.3}><boxGeometry args={[0.5,0.06,0.36]}/>{S('#f3ead3')}</mesh></group>}
      {id==='tailor'&&<mesh position={[0.9,1.12,0.1]} rotation-x={Math.PI/2}><torusGeometry args={[0.14,0.03,8,20]}/>{S('#f2d36a')}</mesh>}
      {id==='builder'&&<group position={[0.9,1.1,0.1]}><mesh position-y={0.1}><boxGeometry args={[0.24,0.2,0.22]}/>{S('#f3e6cc')}</mesh><mesh position-y={0.27} rotation-y={Math.PI/4}><coneGeometry args={[0.2,0.16,4]}/>{S('#c44b3b')}</mesh></group>}
    </group>
  </group>;
}
