'use client';
// The 3D look prototype scene. Everything is a primitive (sphere, capsule, cylinder) so a Blender .glb can replace
// any piece later without touching the layout. The look comes from lighting + post-processing:
// hemisphere light, warm sun with soft shadows, fog into the sky gradient, bloom on emissive bits, tilt-shift blur.
import {Suspense,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type ComponentRef,type ReactNode} from 'react';
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {OrbitControls,useGLTF} from '@react-three/drei';
import {EffectComposer,Bloom,TiltShift2,HueSaturation,Vignette,Noise} from '@react-three/postprocessing';
import {BlendFunction} from 'postprocessing';
import * as THREE from 'three';
type OrbitControlsImpl=ComponentRef<typeof OrbitControls>;
import {frameFor} from '../core/frame';
import {treeAt,growScale,stateOn,stageAt,type BirthPlan} from '../core/birth';
import type {Roots} from '../core/roots';
import {CutAway} from './Roots3D';
import {Marker,CapsuleFx} from './Capsule3D';
import {TIMING} from '../core/timing';
import {treeState,defaultRules,type Growth,type Condition} from '../core/model';
import type {Weather} from '../core/weather';
import type {Holding} from '../core/model';
import {WeatherFx} from './Weather3D';
import {Analyst} from './Analyst3D';
import {screenPoints,snapshot,tilt} from './screen';
import {Signpost,Cart,Pot,Decor} from './Garden3D';
import {Fields,BuildingLots,Buildings,Landmarks,BuildingGhost} from './Build3D';
import {LANDS,BUILDINGS,CITIES,BASE_LAND,ALL_PLOTS,buildingAt,type Built} from '../core/land';
import {tooClose} from '../core/plants';
import {DECOR_SLOTS,type Shape} from '../content/garden-items';
import type {AnalystId} from '../content/analysts';
import {LOOK} from './look';
import {soft} from './materials';
import {MODELS,ALL_TREE_FILES,CANOPY,BARK,STUMP_CUT,FRUIT,FRUIT_FALLEN} from './models';
import {shingles,siding,stone,brick,planks,tmat} from './surfaces';
import {OnGround,surfaceY,tiltAt,normalAt,rng,UP} from './ground';
import {PLOTS,PATHS,PLACES,place,inStream,route,WORLD,solids,pushOut,BUILDING_R,BRIDGE,streamZ,bridgeBlocks,bridgeLift,FIRE,FIRE_SEAT,FIRE_LOG,setNpcWalls,npcStep,NPC_FIRE_SEATS,type Solid} from './places';
import {spread,spreadXZ} from '../core/world';
import {SIGN_PLACES,SIGN_BUILDINGS,SIGN_CITY} from './ui/Signs';
import {VillageLamps} from './VillageLamps';
import {Stream,Bridge,Paths,Forest,Library,Plaza,PlainTree,MasterHouse,ArcadeHouse} from './World3D';
import {Interior,type Book,type Note} from './Interior3D';
import {Explorer} from './Explorer3D';
import {mixHex,type Daylight} from '../core/daylight';
import {Showroom} from './Showroom3D';
import {SkyScene,type SkyWorld} from './Sky3D';
import type {Look} from '../core/wardrobe';
import {gardenTree} from '../core/recheck';
import {PondLife,CampfireDecor,Dog} from './VillageNature';
import {Cat} from './HouseMore';
import {Villager,GuideTrail,LeadMark,NewsBoard,MerchantStall,FarmCart,type Errand,type Routine} from './Village3D';
import {ShopHouse,ShopRoom,SHOP_IDS,SHOP_AT,doorOf,type ShopId} from './Shop3D';
import {NEWS_BOARD,TAILOR_STALL,MERCHANT_STALL,FARM_CART,VILLAGERS} from '../content/villagers';
import {POND_AT} from './places';

// The ground (a big sphere's top) is ground.tsx; where everything is, places.ts.
const SPEED=LOOK.walk.speed;// player walking speed, units per second (look.ts walk)
const PLAYER_START=new THREE.Vector3(0,0,2.5);
export {surfaceY};

type Hooks={frames:number;ready:boolean;player:{x:number;z:number};trees:Record<number,{x:number;y:number}>;treeAt?:Record<number,{x:number;z:number}>;softMeshes:number;meshes:number;treeModels:number;fruit?:number;weather?:Weather;points:Record<string,{x:number;y:number}>;camera?:{fov:number;dist:number;turn:number;pitch:number;blur:number;lead:number};burst?:{holdingId:number;hit:boolean};births?:{active:boolean;stage:string;long:boolean;n:number;ms:number};cutaway?:{open:boolean;holdingId:number|null;roots:Roots|null};inside?:boolean;stage?:boolean;capsules?:{holdingId:number;due:boolean}[];capsuleFx?:{kind:string;holdingId:number}|null};
declare global{interface Window{__proto3d?:Hooks&{friendAt?:{x:number;z:number};view?:{fp:boolean;eyeGap:number;follow:number}}}}
// the overlay may write its own entries (births, lapse) first: fill in whatever the scene needs that is missing
const testHooks=()=>{const h=(window.__proto3d??={} as Hooks);h.frames??=0;h.ready??=false;h.player??={x:0,z:0};h.trees??={};h.softMeshes??=0;h.meshes??=0;h.treeModels??=0;h.points??={};return h};


// the garden's own trees, kept off every plot, building lot and landmark place (core/land.ts), open or not
// 피드백 2026-11-23 "가게 가리는 나무는 없애줘": no tree this close to a shop (its front and sides stay open to the camera)
const SHOP_CLEAR=7;
// how far from the water's edge the player stops (the bank's sand is walkable, the water is not)
const STREAM_PAD=0.15;
const DECO_TREES=([['c',-3,-8.5,1.1],['c',-3.6,-11.2,1],['c',5.5,-8.8,1.2],['c',9.2,-6.2,1],['c',-6.2,-14.5,1.2],['c',5.8,-17,1.1],['c',-4,-18.2,1],['c',-10.6,-3,0.9],
  ['r',5,-10.4,1.1],['r',-7.6,-6.4,1],['r',17.4,-5.2,0.9],['r',16.6,8.2,1.1],['r',-14,-10,1.2],['r',7,-13.5,1],['r',-11,4,0.8]] as ['c'|'r',number,number,number][]).map(([k,x,z,sc])=>[k,...spread(x,z),sc] as ['c'|'r',number,number,number])
  .filter(([,x,z])=>!ALL_PLOTS.some(p=>Math.hypot(p[0]-x,p[1]-z)<2.4)&&!BUILDINGS.some(b=>Math.hypot(b.at[0]-x,b.at[1]-z)<2.8)&&!CITIES.some(c=>Math.hypot(c.at[0]-x,c.at[1]-z)<4)
    &&![place('library'),place('master'),place('cart'),MERCHANT_STALL,TAILOR_STALL].some(q=>Math.hypot(q.x-x,q.z-z)<SHOP_CLEAR));
// 2026-11-20: the pond (나루's fishing spot) moved to where the 관측소 stood, west of the middle
// 피드백 2026-11-22 (village_layout.jpg): the pond moved east of the middle path, between the fields and the stream
// (the fishing spot); its old place west of the middle is the shops' corner now. Pieces around POND_AT (places.ts)
// 피드백 2026-11-23 ("돌길이랑 겹쳐", "모양이 이상해"): one rounded, slightly uneven pond (it was five circles stuck together,
// and its north lobe ran over the path along the fields); its edge is this radius by angle around POND_AT
const pondR=(a:number)=>{const e=1/Math.hypot(Math.cos(a)/2.35,Math.sin(a)/1.85);return e*(1+0.06*Math.sin(3*a+0.7)+0.03*Math.sin(5*a+2))};
const inPond=(x:number,z:number,pad=0)=>{const dx=x-POND_AT.x,dz=z-POND_AT.z;return Math.hypot(dx,dz)<pondR(Math.atan2(dz,dx))+pad};
const POND_PAD=0.2;
// a point on the water put back on the bank, straight out from the middle
const outOfPond=(q:{x:number;z:number})=>{const dx=q.x-POND_AT.x,dz=q.z-POND_AT.z,a=Math.atan2(dz,dx),r=pondR(a)+POND_PAD+0.01;q.x=POND_AT.x+Math.cos(a)*r;q.z=POND_AT.z+Math.sin(a)*r};
// a flat outline laid on the ground: each point follows the terrain, so the water never sinks under a slope
function pondGeo(grow:number,lift:number){const N=72,pos:number[]=[POND_AT.x,surfaceY(POND_AT.x,POND_AT.z)+lift,POND_AT.z],idx:number[]=[];
  for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=pondR(a)+grow,x=POND_AT.x+Math.cos(a)*r,z=POND_AT.z+Math.sin(a)*r;pos.push(x,surfaceY(x,z)+lift,z);idx.push(0,1+(i+1)%N,1+i)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
const HOUSE=place('home');
const STRAY_CAT:[number,number][]=([[-3,6],[2,4.5],[-6,-2],[4,-4],[9,7],[-1,10]] as [number,number][]).map(([x,z])=>spread(x,z) as [number,number]);
const STRAY_DOG:[number,number][]=([[1,8],[-4,3],[6,2],[-7,9],[3,-2]] as [number,number][]).map(([x,z])=>spread(x,z) as [number,number]);
const ROCKS=([/* (the big rock by the old lookout is gone: it stood in front of the fishing camera, 2026-11-20) */[-5,4.4,0.7,0],[-7.2,4.6,0.55,0],[8.4,6,0.9,0],[3.4,5.2,0.5,0]] as number[][]).map(([x,z,sc,rot])=>[...spread(x,z),sc,rot]);
const FARM=PLOTS;
// landmarks (R4–R6, Garden3D.tsx; World3D.tsx) and where grass tufts and flowers keep away from
const SPOTS={observatory:place('pond'),signpost:spreadXZ({x:-1.9,z:3.5,rot:0.35}),cart:place('cart')};
const LIB=place('library'),PLAZA=place('plaza');
const KEEP_CLEAR:[number,number,number][]=[[place('master').x,place('master').z,4.2],[SPOTS.observatory.x,SPOTS.observatory.z,2.2],[SPOTS.cart.x,SPOTS.cart.z,3.0],[SPOTS.signpost.x,SPOTS.signpost.z,0.6],[LIB.x,LIB.z,3.6],[MERCHANT_STALL.x,MERCHANT_STALL.z,3.0],[TAILOR_STALL.x,TAILOR_STALL.z,3.0],[NEWS_BOARD.x,NEWS_BOARD.z,1.2],[HOUSE.x,HOUSE.z,3.6],[PLAZA.x,PLAZA.z,3.8],...DECOR_SLOTS.filter(d=>!d.room).map(d=>[d.x,d.z,0.8] as [number,number,number]),
  // the building lots and the landmarks' places stay clear of forest and flowers, built or not (core/land.ts)
  ...BUILDINGS.map(b=>[b.at[0],b.at[1],2.2] as [number,number,number]),...CITIES.map(c=>[c.at[0],c.at[1],3.4] as [number,number,number])];
const clearOf=(x:number,z:number)=>KEEP_CLEAR.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r)||inStream(x,z,0.6)||PATHS.some(l=>l.some(([px,pz])=>Math.hypot(x-px,z-pz)<0.5));
// the 꽃집's decor (core/plants.ts): may this grass take one? null = yes, else what to say
function plantBlock(x:number,z:number):string|null{
  if(Math.hypot(x,z)>WORLD.walk-1.5)return '정원 밖이에요';
  if(inPond(x,z,0.6))return '연못 위에는 못 심어요';
  if(inStream(x,z,0.8))return '개울 위에는 못 심어요';
  if(ALL_PLOTS.some(([px,pz])=>Math.hypot(px-x,pz-z)<1.6))return '종목 나무 자리예요';
  if(Math.hypot(x-HOUSE.x,z-HOUSE.z)<3)return '집이 있어요';
  if(KEEP_CLEAR.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r+0.4))return '건물 자리예요';
  if(PATHS.some(l=>l.some(([px,pz])=>Math.hypot(x-px,z-pz)<0.7)))return '길 위에는 못 심어요';
  return null;
}
// 피드백 2026-11-24: where a bought building may be set down (null = yes, else what to say): on the grass, clear of the
// water, the fields, the paths, the shops and houses, the people, the trees and the other buildings
const KEEP_FIXED=KEEP_CLEAR.slice(0,KEEP_CLEAR.length-BUILDINGS.length-CITIES.length);
const segDist=(x:number,z:number,[ax,az]:[number,number],[bx,bz]:[number,number])=>{const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l2));return Math.hypot(x-ax-dx*t,z-az-dz*t)};
export function placeBlock(id:string,x:number,z:number,built:Built|null|undefined,plants:{x:number;z:number}[]=[]):string|null{
  const r=BUILDING_R[id]??1.4;
  if(Math.hypot(x,z)>WORLD.walk-1.5-r)return '마을 밖이에요';
  if(inPond(x,z,r))return '연못 위에는 못 지어요';
  if(inStream(x,z,r+0.3))return '개울 위에는 못 지어요';
  if(ALL_PLOTS.some(([px,pz])=>Math.hypot(px-x,pz-z)<r+1.6))return '밭 자리예요';
  if(Math.hypot(x-HOUSE.x,z-HOUSE.z)<r+3)return '집이 있어요';
  if(Math.hypot(x-FIRE[0],z-FIRE[1])<r+1.6)return '모닥불이 있어요';
  if(KEEP_FIXED.some(([cx,cz,kr])=>Math.hypot(x-cx,z-cz)<r+kr*0.8))return '다른 건물 자리예요';
  if(SHOP_IDS.some(s=>Math.hypot(x-SHOP_AT[s].x,z-SHOP_AT[s].z)<r+2.4))return '가게가 있어요';
  if(PATHS.some(l=>l.some((p,i)=>i>0&&segDist(x,z,l[i-1],p)<r+0.45)))return '길 위에는 못 지어요';
  for(const b of BUILDINGS)if(b.id!==id&&built?.buildings.includes(b.id)){const [bx,bz]=buildingAt(b,built);if(Math.hypot(x-bx,z-bz)<r+(BUILDING_R[b.id]??1.4)+0.4)return '다른 건물이랑 겹쳐요'}
  for(const c of CITIES)if(built?.cities.includes(c.id)&&Math.hypot(x-c.at[0],z-c.at[1])<r+2.4)return '다른 건물이랑 겹쳐요';
  if(VILLAGERS.some(v=>Math.hypot(x-v.x,z-v.z)<r+0.8))return '마을 사람이 서 있어요';
  if([...DECO_TREES.map(([,tx,tz])=>({x:tx,z:tz})),...plants,...starter()].some(q=>Math.hypot(x-q.x,z-q.z)<r+0.7))return '나무랑 꽃이 있어요';
  return null;
}
// every garden starts with a few of the 꽃집's trees and beds (feedback 11-17 "나무들 추가한거 어디감? 과일나무
// 꽃나무"): fruit and blossom trees here and there, flower beds by the 꽃집; more are bought there
const STARTER0:[string,number,number][]=[['cherry',-10,8],['magnolia',8,-13],['mandarin',-13,-10],['lemon',16,10],['apple',-17,2],['cherry',3,-21],
  ['tulips',SPOTS.cart.x+1.0,SPOTS.cart.z+3.1],['hydrangea',SPOTS.cart.x+1.0,SPOTS.cart.z-3.1],['sunflowers',SPOTS.cart.x-3.2,SPOTS.cart.z+0.3]];
let starterCache:{id:string;item:string;x:number;z:number}[]|null=null;
// (the flower beds by the cart stand where they are; the trees only where a planted one could go)
function starter(){return starterCache??=STARTER0.filter(([item,x,z])=>['tulips','hydrangea','sunflowers'].includes(item)||!plantBlock(x,z)&&![place('library'),place('master'),place('cart'),TAILOR_STALL].some(q=>Math.hypot(q.x-x,q.z-z)<SHOP_CLEAR)).map(([item,x,z],i)=>({id:'starter'+i,item,x,z}))}
// analysts idle around the campfire when nothing is flagged
const IDLE:Record<AnalystId,{x:number;z:number}>={tori:spreadXZ({x:-3.1,z:-0.2}),moa:spreadXZ({x:-0.2,z:-2.3}),luon:spreadXZ({x:-1.0,z:-2.9})};

// Soft colour patches on the ground (vertex colours): smooth wavy noise picks between dark, base, light and a warm yellow-green.
const patchNoise=(x:number,z:number,k:number)=>
  Math.sin(x*k*3.1+Math.sin(z*k*1.9)*1.4)*0.5+Math.sin(z*k*4.2-x*k*1.3)*0.33+Math.sin((x+z)*k*7.7)*0.17;
function groundGeometry(){
  const g=new THREE.SphereGeometry(WORLD.R,220,150),p=g.attributes.position,col=new Float32Array(p.count*3);
  const {base,light,dark,warm,patchScale:k}=LOOK.ground,cb=new THREE.Color(base),cl=new THREE.Color(light),cd=new THREE.Color(dark),cw=new THREE.Color(warm),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),n=patchNoise(x,z,k),w=patchNoise(z+40,x-17,k*0.8);
    c.copy(cb);
    if(n>0)c.lerp(cl,THREE.MathUtils.smoothstep(n,0.1,0.55));else c.lerp(cd,THREE.MathUtils.smoothstep(-n,0.2,0.7)*0.8);
    c.lerp(cw,THREE.MathUtils.smoothstep(w,0.45,0.85)*0.7);
    col.set([c.r,c.g,c.b],i*3)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g;
}
function Ground({onWalk,onHover}:{onWalk:(p:THREE.Vector3)=>void;onHover?:(p:THREE.Vector3)=>void}){
  const click=(e:ThreeEvent<MouseEvent>)=>{if(e.delta>6)return;onWalk(e.point)};
  const move=onHover?(e:ThreeEvent<PointerEvent>)=>onHover(e.point):undefined;
  const geo=useMemo(groundGeometry,[]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return (
    <mesh position={[0,-WORLD.R,0]} receiveShadow onClick={click} onPointerMove={move} geometry={geo}>
      <primitive object={soft('#ffffff',{vertexColors:true})} attach="material"/>
    </mesh>
  );
}

// The soft rounded blobs that make the grass read as tufts (the reference's bubbly ground).
function Tufts(){
  const ref=useRef<THREE.InstancedMesh>(null);
  const items=useMemo(()=>{const r=rng(7),out:{x:number;z:number;s:number;c:string}[]=[],T=LOOK.tufts;
    while(out.length<T.count){const a=r()*Math.PI*2,d=Math.sqrt(r())*(WORLD.walk+2),x=Math.cos(a)*d,z=Math.sin(a)*d;
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

// water is unlit (flat colour), so the time of day darkens it here: dim 0 by day … 1 at night
function Pond({dim=0}:{dim?:number}){
  const [rim,water]=useMemo(()=>[pondGeo(0.3,0.04),pondGeo(0,0.15)],[]);
  return <>
    <mesh geometry={rim} receiveShadow><meshBasicMaterial color={mixHex('#a8e4ec','#3d5a72',dim)}/></mesh>
    <mesh geometry={water}><meshBasicMaterial color={mixHex('#2c86d6','#13284a',dim)}/></mesh>
    {/* stepping stones and lily pads */}
    {([[-1.1,0.5,0.4],[-0.4,-0.9,0.34],[-1.5,-0.3,0.3]] as number[][]).map(([dx,dz,s],i)=>{const x=POND_AT.x+dx,z=POND_AT.z+dz;return (
      <OnGround key={'s'+i} x={x} z={z} lift={0.14}><mesh scale={[s,s*0.35,s]} castShadow><sphereGeometry args={[1,20,12]}/><primitive object={soft(i===2?'#e6d65a':'#b9d86a')} attach="material"/></mesh></OnGround>)})}
  </>;
}

function Rock({x,z,s=1,rot=0}:{x:number;z:number;s?:number;rot?:number}){
  return <OnGround x={x} z={z} rot={rot}><mesh scale={[s*1.2,s*0.75,s]} position-y={s*0.3} castShadow receiveShadow>
    <sphereGeometry args={[1,24,16]}/><primitive object={soft('#cdbfb0')} attach="material"/></mesh></OnGround>;
}

// the cottage's roof pieces: a gable pushed front to back, the wall-coloured triangles under it, the porch roof
const tri=(w:number,h:number)=>{const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();return s};
const prism=(w:number,h:number,d:number)=>{const g=new THREE.ExtrudeGeometry(tri(w,h),{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);return g};
const COTTAGE_ROOF=prism(4.3,1.9,4.8),COTTAGE_GABLE=new THREE.ShapeGeometry(tri(4.3,1.9)),COTTAGE_PORCH=prism(1.7,0.55,1.1);
// the house: tapping it (or its door) goes inside (Interior3D.tsx)
// 피드백 2026-11-26 "재질이 드러나게": the cottage in real materials: a fieldstone footing, clapboard walls, a shingle
// roof (two slopes, so the shingles run the right way), a brick chimney that now and then lets off a puff of white
// steam, a plank door and plank flower boxes (textures: surfaces.ts)
function useCottageMats(){
  return useMemo(()=>({stone:tmat(stone(),5/1.4,0.18/1.4*4),wall:tmat(siding(),4.2/1.6,2.5/1.6),gable:tmat(siding(),1/1.6,1/1.6),
    roof:tmat(shingles(),2.95/1.1,4.8/1.1,0.8),chim:tmat(brick(),0.6/0.5,1.6/0.5),door:tmat(planks(),1,1),box:tmat(planks([138,90,62]),1,0.4),
    step:tmat(stone(),1.8/1.2,1.1/1.2)}),[]);
}
// 피드백 2026-11-26 "연기가 동그래서 실감이 없어": smoke as soft wisps: many billboards with a cloudy, ragged texture that
// rise, drift with the wind, swell, turn and fade; it comes in short breaths with quiet between
let smokeTex:THREE.Texture|null=null;
// a wisp of smoke: many faint, uneven lobes (no single round blob), soft all the way to the edge
function smoke(){if(smokeTex)return smokeTex;const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d')!;
  for(let i=0;i<90;i++){const a=Math.random()*Math.PI*2,d=Math.pow(Math.random(),0.7)*40,x=64+Math.cos(a)*d,y=64+Math.sin(a)*d*0.8,r=6+Math.random()*20;
    g.save();g.translate(x,y);g.rotate(Math.random()*3);g.scale(1,0.5+Math.random()*0.6);const gr=g.createRadialGradient(0,0,0,0,0,r);
    gr.addColorStop(0,`rgba(255,255,255,${0.05+Math.random()*0.09})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore()}
  const v=g.createRadialGradient(64,64,10,64,64,64);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(0.7,'rgba(0,0,0,0.4)');v.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=v;g.fillRect(0,0,S,S);
  smokeTex=new THREE.CanvasTexture(cv);return smokeTex}
function Steam({at}:{at:[number,number,number]}){
  const N=34,parts=useRef<(THREE.Sprite|null)[]>([]),seed=useMemo(()=>Array.from({length:N},(_,i)=>({o:i/N,sp:0.75+Math.random()*0.5,sw:Math.random()*6,rot:(Math.random()-0.5)*0.8,big:0.8+Math.random()*0.5})),[]);
  useFrame(({clock})=>{const t=clock.elapsedTime;
    // a breath of smoke for ~4 s in every 9
    const breath=Math.max(0,Math.sin((t%9)/9*Math.PI*2))**0.6;
    parts.current.forEach((sp,i)=>{if(!sp)return;const s=seed[i],life=3.2,k=((t*s.sp/life)+s.o)%1;
      // rises fast at first and slows, bends with the wind, curls and spreads; a thin wisp always, more in each breath
      const rise=1-Math.pow(1-k,1.8);
      sp.position.set(at[0]+rise*0.9*k+Math.sin(t*0.9+s.sw+k*4)*0.14*k,at[1]+rise*2.3,at[2]+k*0.4+Math.cos(t*0.7+s.sw+k*3)*0.1*k);
      const sc=(0.5+k*2.1)*s.big;sp.scale.set(sc,sc*(0.85+0.15*Math.sin(t+s.sw)),1);const m=sp.material as THREE.SpriteMaterial;m.rotation=s.sw+s.rot*t;
      m.opacity=(0.18+breath*0.5)*(1-k)*Math.min(1,k*5)})});
  return <group>{seed.map((_,i)=><sprite key={i} ref={el=>{parts.current[i]=el}}><spriteMaterial map={smoke()} color={['#f4f4f1','#e2e2de','#d4d4d0'][i%3]} transparent opacity={0} depthWrite={false}/></sprite>)}</group>;
}
function House({onEnter,night}:{onEnter:()=>void;night:number}){
  const enter=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onEnter()};
  const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
  const P=(m:THREE.Material)=><primitive object={m} attach="material"/>;
  const m=useCottageMats();
  const glow=<meshStandardMaterial color="#ffb24a" emissive="#ff9a2e" emissiveIntensity={1.2+LOOK.daylight.windows*night} toneMapped={false}/>;
  const slope=Math.atan2(1.9,2.15),len=Math.hypot(2.15,1.9)+0.25;
  return <OnGround x={HOUSE.x} z={HOUSE.z} rot={HOUSE.rot}><group onClick={enter} name="house">
    <mesh position-y={0.09} receiveShadow><boxGeometry args={[5,0.18,4.4]}/>{P(m.step)}</mesh>
    {/* a fieldstone footing under the clapboard */}
    <mesh position-y={0.45} castShadow receiveShadow><boxGeometry args={[4.32,0.55,3.52]}/>{P(m.stone)}</mesh>
    <mesh position-y={1.43} castShadow receiveShadow><boxGeometry args={[4.2,2.5,3.4]}/>{P(m.wall)}</mesh>
    {/* corner boards */}
    {[[-2.11,-1.71],[2.11,-1.71],[-2.11,1.71],[2.11,1.71]].map(([x,z],i)=><mesh key={i} position={[x,1.55,z]}><boxGeometry args={[0.14,2.3,0.14]}/>{M('#e6d9c2')}</mesh>)}
    {[-1.71,1.71].map(z=><mesh key={z} position={[0,2.68,z]} rotation-y={z<0?Math.PI:0} geometry={COTTAGE_GABLE}>{P(m.gable)}</mesh>)}
    {/* the roof: two shingled slopes and a ridge cap */}
    {/* 피드백 2026-11-26 "벽과 지붕 사이가 떠 보여": the slopes sit ON the gable line (their underside on it, not across
        it), a short overhang, and barge boards and a soffit close the eaves so no gap shows under the roof */}
    {[-1,1].map(k=><mesh key={k} position={[k*1.075+k*Math.sin(slope)*0.11,2.68+0.95+Math.cos(slope)*0.11,0]} rotation-z={-k*slope} castShadow receiveShadow><boxGeometry args={[len,0.22,4.1]}/>{P(m.roof)}</mesh>)}
    {[-1,1].map(k=>[-1,1].map(e=><mesh key={k+'b'+e} position={[k*1.075,2.68+0.95,e*2.03]} rotation-z={-k*slope}><boxGeometry args={[len,0.26,0.07]}/>{M('#5a3424')}</mesh>))}
    {[-1,1].map(e=><mesh key={'s'+e} position={[0,2.68+0.01,e*1.85]}><boxGeometry args={[4.35,0.06,0.36]}/>{M('#e6d9c2')}</mesh>)}
    {[-1,1].map(k=><mesh key={'f'+k} position={[k*2.2,2.62,0]}><boxGeometry args={[0.1,0.16,4.1]}/>{M('#5a3424')}</mesh>)}
    <mesh position-y={2.68+1.97} rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.14,0.14,4.2,10]}/>{M('#6e3626')}</mesh>
    {/* the brick chimney, its cap, and a puff of steam now and then */}
    <mesh position={[1.2,3.6,-0.6]} castShadow><boxGeometry args={[0.6,1.6,0.6]}/>{P(m.chim)}</mesh>
    <mesh position={[1.2,4.45,-0.6]} castShadow><boxGeometry args={[0.75,0.15,0.75]}/>{M('#7d6e62')}</mesh>
    <Steam at={[1.2,4.6,-0.6]}/>
    {/* door, step and the porch roof over it */}
    <mesh position={[0,0.95,1.72]}><boxGeometry args={[1,1.7,0.1]}/>{P(m.door)}</mesh>
    <mesh position={[0,1.82,1.74]}><boxGeometry args={[1.12,0.1,0.12]}/>{M('#5a3424')}</mesh>
    <mesh position={[0.32,0.95,1.79]}><sphereGeometry args={[0.06,8,6]}/>{M('#e8c35a')}</mesh>
    <mesh position={[0,0.2,2.15]} receiveShadow><boxGeometry args={[1.8,0.1,1.1]}/>{P(m.step)}</mesh>
    <mesh position={[0,1.95,2.05]} castShadow geometry={COTTAGE_PORCH}>{P(m.roof)}</mesh>
    {/* glowing windows with crossbars, shutters and plank flower boxes */}
    {[-1.35,1.35].map(x=><group key={x}>
      <mesh position={[x,1.55,1.72]}><boxGeometry args={[0.85,0.75,0.08]}/>{M('#f4ead6')}</mesh>
      <mesh position={[x,1.55,1.77]}><planeGeometry args={[0.7,0.6]}/>{glow}</mesh>
      <mesh position={[x,1.55,1.79]}><boxGeometry args={[0.04,0.6,0.02]}/>{M('#f4ead6')}</mesh>
      <mesh position={[x,1.55,1.79]}><boxGeometry args={[0.7,0.04,0.02]}/>{M('#f4ead6')}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[x+k*0.6,1.55,1.75]}><boxGeometry args={[0.28,0.78,0.05]}/>{P(m.box)}</mesh>)}
      <mesh position={[x,1.07,1.85]} castShadow><boxGeometry args={[0.95,0.22,0.3]}/>{P(m.box)}</mesh>
      {['#e8607a','#ffd34d','#f08aa8'].map((c,i)=><mesh key={c} position={[x-0.3+i*0.3,1.25,1.88]}><sphereGeometry args={[0.13,10,8]}/>{M(c)}</mesh>)}
      {[-0.15,0.15].map(dx=><mesh key={dx} position={[x+dx,1.22,1.93]}><sphereGeometry args={[0.08,8,6]}/>{M('#4f9a45')}</mesh>)}
    </group>)}
    {/* a lantern by the door */}
    <mesh position={[0.75,1.5,1.82]}><boxGeometry args={[0.14,0.22,0.14]}/><meshStandardMaterial color="#ffe0a0" emissive="#ffb347" emissiveIntensity={0.6+night} toneMapped={false}/></mesh>
  </group></OnGround>;
}

function Campfire({onSit}:{onSit?:()=>void}){
  const flame=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{const f=flame.current;if(!f)return;const t=clock.elapsedTime;f.scale.set(1+Math.sin(t*9)*0.08,1+Math.sin(t*13)*0.15,1+Math.cos(t*7)*0.08)});
  // 피드백 2026-11-24 "모닥불 앞에 앉기": a tap on the fire or the log walks me to the log and sits me down
  return <group onClick={onSit?e=>{e.stopPropagation();onSit()}:undefined} onPointerOver={onSit?()=>{document.body.style.cursor='pointer'}:undefined} onPointerOut={onSit?()=>{document.body.style.cursor=''}:undefined}><OnGround x={FIRE[0]} z={FIRE[1]}>
    {[0,1.2,2.4].map(a=><mesh key={a} rotation={[Math.PI/2,0,a]} position-y={0.1} castShadow><cylinderGeometry args={[0.08,0.1,1.1,8]}/><primitive object={soft('#8a6448')} attach="material"/></mesh>)}
    <mesh ref={flame} position-y={0.45} visible={false}><coneGeometry args={[0.28,0.75,12]}/><meshBasicMaterial/></mesh>
    <pointLight position-y={0.8} color="#ffae5a" intensity={6} distance={5} decay={2}/>
    {/* a fallen log to sit on */}
    <mesh position={[0.6,0.18,-1.3]} rotation={[0,0.4,Math.PI/2]} castShadow><cylinderGeometry args={[0.2,0.2,2.2,12]}/><primitive object={soft('#b18a6b')} attach="material"/></mesh>
    {/* two stumps round the fire where the village's people sit a while (places.ts NPC_FIRE_SEATS) */}
    {([[-1.35,0.55],[0.75,1.25]] as const).map(([x,z])=><group key={x} position={[x,0,z]}>
      <mesh position-y={0.17} castShadow receiveShadow><cylinderGeometry args={[0.24,0.27,0.34,12]}/><primitive object={soft('#8a6448')} attach="material"/></mesh>
      <mesh position-y={0.345}><cylinderGeometry args={[0.22,0.22,0.01,16]}/><primitive object={soft('#d9b98c')} attach="material"/></mesh>
      <mesh position-y={0.352} rotation-x={-Math.PI/2}><ringGeometry args={[0.1,0.12,16]}/><primitive object={soft('#b8916a')} attach="material"/></mesh></group>)}
  </OnGround></group>;
}

// A bushy round tree or a tall cypress (scenery, not holdings).
function RoundTree({x,z,s=1}:{x:number;z:number;s?:number}){
  return <OnGround x={x} z={z}>
    <mesh position-y={1.6*s} castShadow><cylinderGeometry args={[0.3*s,0.45*s,3.2*s,10]}/><primitive object={soft('#6c5b53')} attach="material"/></mesh>
    {[[0,4,0,1.8],[1.3,3.5,0.3,1.3],[-1.2,3.6,-0.2,1.4],[0.2,3.3,1.1,1.2],[-0.3,4.9,-0.4,1.2]].map(([a,b,c,r],i)=>(
      <mesh key={i} position={[a*s,b*s,c*s]} scale={r*s} castShadow receiveShadow><sphereGeometry args={[1,20,14]}/><primitive object={soft(i===4?'#6db24f':'#4f9a45')} attach="material"/></mesh>))}
  </OnGround>;
}
// 2026-11-18 (user): no teal capsule cypresses any more; the spots where they stood get a plain round tree
function Cypress({x,z,s=1}:{x:number;z:number;s?:number}){
  return <RoundTree x={x} z={z} s={s*0.85}/>;
}

// A holding as a tree: the model comes from Blender (tools/blender/holding_tree.py, listed in models.ts), the growth
// stage picks the file, the condition picks leaf colour, how much canopy is left and whether it blooms.
// apple blossom (the tree in bloom): white with a pink glow
const blossomMat=new THREE.MeshStandardMaterial({color:'#fff3f5',emissive:'#ff9fbd',emissiveIntensity:0.9,toneMapped:false});
function TreeModel({url,condition,onTop}:{url:string;condition:Condition;onTop:(y:number)=>void}){
  const {scene}=useGLTF(url);
  const model=useMemo(()=>{
    const c=CANOPY[condition],root=scene.clone(true),leaves:THREE.Object3D[]=[],fruit:THREE.Object3D[]=[];
    root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
      if(o.name.startsWith('leaf_')){m.material=soft(c.leaf);leaves.push(o)}
      else if(o.name.startsWith('blossom')){m.material=blossomMat;o.visible=c.blossom}
      else if(o.name.startsWith('fruit_')){m.material=soft(FRUIT);fruit.push(o)}
      else if(o.name.startsWith('fallen')){m.material=soft(FRUIT_FALLEN);o.visible=c.fallen}
      else if(o.name.startsWith('cut'))m.material=soft(STUMP_CUT)
      else m.material=soft(BARK)});
    // the apples: a healthy tree keeps them all, a yellowing one a few, a wilting one has dropped them (fallen)
    fruit.sort((a,b)=>Number(a.name.slice(6))-Number(b.name.slice(6))).forEach((o,i)=>{o.visible=i<Math.round(fruit.length*c.fruit)});
    // a wilting tree has lost its outer clumps first (the file lists the most important ones first)
    leaves.sort((a,b)=>Number(a.name.slice(5))-Number(b.name.slice(5)))
      .forEach((o,i)=>{o.visible=i<Math.max(1,Math.ceil(leaves.length*c.keep))});
    return root},[scene,condition]);
  useLayoutEffect(()=>{const box=new THREE.Box3().setFromObject(scene);onTop(box.max.y*LOOK.holdingTreeScale);
    const h=testHooks();h.treeModels++;let f=0;model.traverse(o=>{if(o.name.startsWith('fruit_')&&o.visible)f++});h.fruit=(h.fruit??0)+f},[model,scene,onTop]);
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
// born: this tree is coming up right now (W1, core/birth.ts): hidden until its turn, then the mound, then the tree rising
// with an overshoot; its state (flowers, wilting, lean) goes on as it settles.
export type Born={t0:number;plan:BirthPlan;i:number};
// cut: the ground under it is open (W2): its soil mound goes, so the roots show from the trunk down
// size: 유저 워크플로우 3장, what the holding is worth now (core/walk.ts treeSize); a change eases over a moment
function HoldingTree({id,x,z,picked,onPick,onDeep,growth,condition,onTop,wind,born,cut,size=1}:{id:number;x:number;z:number;picked:boolean;onPick:(id:number)=>void;onDeep:(id:number)=>void;growth:Growth;condition:Condition;onTop:(y:number)=>void;wind:number;born:Born|null;cut:boolean;size?:number}){
  const group=useRef<THREE.Group>(null),mound=useRef<THREE.Mesh>(null),[h,setH]=useState(2);
  const [dressed,setDressed]=useState(!born);
  useEffect(()=>{if(born)setDressed(false)},[born]);
  const shown:Condition=dressed||condition==='dead'?condition:'well';
  const lean=dressed?CANOPY[condition].droop:0;
  useFrame(({clock},dt)=>{const g=group.current;if(!g)return;const t=clock.elapsedTime;
    if(!born){const want=LOOK.holdingTreeScale*size;g.scale.setScalar(g.scale.x+(want-g.scale.x)*Math.min(1,dt*3));g.visible=true}
    if(born){const b=treeAt(born.plan,born.i,performance.now()-born.t0),s=growScale(b.phase,b.k);
      g.scale.setScalar(LOOK.holdingTreeScale*s*size);g.visible=s>0;
      if(mound.current){const m=b.phase==='wait'||b.phase==='card'?0:b.phase==='crack'?b.k:1;mound.current.scale.set(1.1*m,0.22*m,1.1*m);mound.current.visible=m>0}
      if(!dressed&&stateOn(b.phase))setDressed(true)}
    // wind: a slow lean plus faster gusts on stormy days
    g.rotation.z=Math.sin(t*0.9+id)*wind+Math.sin(t*2.7+id*2)*wind*0.35-wind*0.6;g.rotation.x=lean});
  // a press held for TIMING.longPress (and not dragged) opens the ground under the tree instead of its card
  const press=useRef<{t:number;x:number;y:number;long:boolean}|null>(null),timer=useRef(0);
  const down=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();clearTimeout(timer.current);press.current={t:performance.now(),x:e.clientX,y:e.clientY,long:false};
    timer.current=window.setTimeout(()=>{if(press.current){press.current.long=true;onDeep(id)}},TIMING.longPress)};
  const move=(e:ThreeEvent<PointerEvent>)=>{const p=press.current;if(p&&!p.long&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>10){clearTimeout(timer.current);press.current=null}};
  const up=()=>clearTimeout(timer.current);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(press.current?.long){press.current=null;return}press.current=null;onPick(id)};
  const top=useCallback((y:number)=>{setH(y);onTop(y)},[onTop]);
  return <OnGround x={x} z={z}>
    {/* soil mound */}
    <mesh ref={mound} scale={[1.1,0.22,1.1]} visible={!cut} receiveShadow><sphereGeometry args={[1,20,12]}/><primitive object={soft('#8b6b52')} attach="material"/></mesh>
    {picked&&<mesh rotation-x={-Math.PI/2} position-y={0.12}><torusGeometry args={[1.25,0.06,8,40]}/><meshStandardMaterial color="#fff6c8" emissive="#ffe27a" emissiveIntensity={1.4} toneMapped={false}/></mesh>}
    <group ref={group} onClick={click} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} name={`tree-${id}`} position-y={0.12} scale={LOOK.holdingTreeScale*size}>
      <Suspense fallback={null}>
        <TreeModel url={condition==='dead'?MODELS.stump:MODELS.tree(growth,id)} condition={shown} onTop={top}/>
      </Suspense>
    </group>
    {dressed&&<Falling condition={condition} height={h} wind={wind}/>}
    {born&&<BirthDust born={born}/>}
  </OnGround>;
}
ALL_TREE_FILES.forEach(u=>useGLTF.preload(u));

function Flowers(){
  const ref=useRef<THREE.InstancedMesh>(null);
  const items=useMemo(()=>{const r=rng(21),out:{x:number;z:number;c:string}[]=[],colors=['#ff8fc6','#ffd23f','#5aa8ff','#ffffff','#ff6fa1','#ffe066'];
    // flowers grow in little clusters, like the reference
    for(let k=0;k<150;k++){const a=r()*Math.PI*2,d=2+Math.sqrt(r())*(WORLD.walk-1),cx=Math.cos(a)*d,cz=Math.sin(a)*d,c=colors[Math.floor(r()*colors.length)];
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
// stops: where to go after the current target (places.ts route: the bridge's near and far end, then the tap)
// Keyboard (besides tap/drag): arrows or WASD walk the way the camera faces, Q/E turn the view, +/- zoom. Keys typed
// into a field, or while composing Korean, are left alone.
const WALK_KEYS:Record<string,[number,number]>={ArrowUp:[0,1],KeyW:[0,1],ArrowDown:[0,-1],KeyS:[0,-1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
// inside an open panel the keys belong to the panel (arrows scroll it, Enter presses its buttons)
const typing=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;return e.isComposing||!!t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||!!t.closest?.('[role=dialog]'))};
function Keys({pos,target,stops,onMove,enabled,gate}:{gate:(x:number,z:number)=>boolean;pos:React.MutableRefObject<THREE.Vector3>;target:React.MutableRefObject<THREE.Vector3>;stops:React.MutableRefObject<{x:number;z:number}[]>;onMove:()=>void;enabled:boolean}){
  const held=useRef(new Set<string>()),{camera,controls}=useThree() as unknown as {camera:THREE.Camera;controls:OrbitControlsImpl|null};
  const v=useMemo(()=>new THREE.Vector3(),[]),f=useMemo(()=>new THREE.Vector3(),[]),r=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(typing(e)||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.code;
      if(k in WALK_KEYS||k==='KeyQ'||k==='KeyE'||k==='Equal'||k==='Minus'||k==='NumpadAdd'||k==='NumpadSubtract'){held.current.add(k);if(k.startsWith('Arrow'))e.preventDefault()}};
    const up=(e:KeyboardEvent)=>{held.current.delete(e.code)},blur=()=>held.current.clear();
    addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',blur);return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',blur)}},[]);
  useFrame((_,dt)=>{if(!enabled||!held.current.size)return;const h=held.current,t=Math.min(dt,0.1);
    let mx=0,mz=0;for(const k of h){const w=WALK_KEYS[k];if(w){mx+=w[0];mz+=w[1]}}
    if(mx||mz){f.subVectors(controls?.target??pos.current,camera.position).setY(0);if(f.lengthSq()<1e-6)f.set(0,0,-1);f.normalize();r.set(-f.z,0,f.x);
      v.copy(f).multiplyScalar(mz).addScaledVector(r,mx).normalize().multiplyScalar(LOOK.walk.keyStep);
      const nx=pos.current.x+v.x,nz=pos.current.z+v.z;
      if(Math.hypot(nx,nz)<WORLD.walk&&!inPond(nx,nz,POND_PAD)&&!inStream(nx,nz,STREAM_PAD)&&!bridgeBlocks(pos.current,{x:nx,z:nz})&&gate(nx,nz)){target.current.set(nx,0,nz);stops.current=[];onMove()}}
    if(controls){const c=controls.target,turn=(h.has('KeyE')?1:0)-(h.has('KeyQ')?1:0),zoom=(h.has('Minus')||h.has('NumpadSubtract')?1:0)-(h.has('Equal')||h.has('NumpadAdd')?1:0);
      if(turn){v.subVectors(camera.position,c).applyAxisAngle(THREE.Object3D.DEFAULT_UP,turn*LOOK.camera.keyTurn*t);camera.position.copy(c).add(v)}
      if(zoom){v.subVectors(camera.position,c);const d=THREE.MathUtils.clamp(v.length()*(1+zoom*LOOK.camera.keyZoom*t),LOOK.camera.minDist,LOOK.camera.maxDist);camera.position.copy(c).add(v.setLength(d))}
      if(turn||zoom)controls.update()}});
  return null;
}

// the player: my observer as I dressed it (Explorer3D.tsx, core/wardrobe.ts), walking where I tap
function Player({target,stops,pos,hidden,look,walls,onPick,faceTo=null,sit}:{sit?:React.MutableRefObject<{x:number;z:number;face:number}|null>;faceTo?:{x:number;z:number}|null;onPick?:()=>void;target:React.MutableRefObject<THREE.Vector3>;stops:React.MutableRefObject<{x:number;z:number}[]>;pos:React.MutableRefObject<THREE.Vector3>;hidden?:boolean;look:Look;walls:Solid[]}){
  const g=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),moving=useRef(false),speed=useRef(0),sitting=useRef(false),walker=useRef<{x:number;z:number;since?:number}>({x:0,z:0});
  useFrame((_,dt)=>{const p=pos.current,tg=target.current,gr=g.current,b=body.current;if(!gr||!b)return;const t=Math.min(dt,0.25)/* by time: a slow phone walks as fast */;
    const dx=tg.x-p.x,dz=tg.z-p.z,d=Math.hypot(dx,dz);moving.current=d>0.05;
    // speeds up from a stand, slows down over the last stretch, turns toward where it goes instead of snapping
    const want=moving.current?SPEED*Math.min(1,d/LOOK.walk.brake+0.25):0;speed.current+=(want-speed.current)*Math.min(1,LOOK.walk.accel*t);
    // 피드백 2026-11-24 "물가를 그냥 건널 수 있어": the stream is crossed only on the wooden bridge; a step into the water
    // (from the bank) stops at the bank, whatever brought it there (a tap, the keys, a talk's walk)
    // 피드백 2026-11-26 "지도에서 낚시터 누르면 이동이 안 돼": a walk headed straight at a stall or rock used to push into it and
    // stop; now it goes round (places.ts npcStep, as the village's people do) and only gives up when there is no way
    if(moving.current){const step=Math.min(d,speed.current*t),wk=walker.current;wk.x=p.x;wk.z=p.z;
      if(!npcStep(wk,tg.x,tg.z,step,walls,0.35)&&(wk.since??0)>200){tg.set(p.x,0,p.z);stops.current=[];moving.current=false;return}
      const nx=wk.x,nz=wk.z;
      if((inStream(nx,nz,STREAM_PAD)&&!inStream(p.x,p.z,STREAM_PAD))||bridgeBlocks(p,{x:nx,z:nz})){tg.set(p.x,0,p.z);stops.current=[];moving.current=false;return}
      const mx=nx-p.x,mz=nz-p.z;p.x=nx;p.z=nz;
      // 피드백 2026-11-24 "낚시터 지나갈 수 있게 됐어, 물이면 못 지나가게": the pond's water is not walked on either; a step into
      // it slides along its bank (so a walk round it still gets there), a target on the water ends at the bank
      if(inPond(p.x,p.z,POND_PAD)){outOfPond(p);if(inPond(tg.x,tg.z,POND_PAD)){const q={x:tg.x,z:tg.z};outOfPond(q);tg.set(q.x,0,q.z)}}
      // buildings are solid: slide along their edge; a target inside one ends at its edge
      if(pushOut(p,walls)){const q={x:tg.x,z:tg.z};if(pushOut(q,walls))tg.set(q.x,0,q.z)}
      const yaw=Math.atan2(mx||dx,mz||dz),diff=Math.atan2(Math.sin(yaw-b.rotation.y),Math.cos(yaw-b.rotation.y));b.rotation.y+=diff*Math.min(1,LOOK.walk.turn*t)}
    else if(stops.current.length){const n=stops.current.shift()!;tg.set(n.x,0,n.z)}
    // standing in a talk: turned to the one I talk to
    else if(faceTo){const yaw=Math.atan2(faceTo.x-p.x,faceTo.z-p.z),diff=Math.atan2(Math.sin(yaw-b.rotation.y),Math.cos(yaw-b.rotation.y));b.rotation.y+=diff*Math.min(1,LOOK.walk.turn*t)}
    // on the log by the fire: sat down once there, facing the fire; up again as soon as the walk goes anywhere else
    const st=sit?.current;
    if(st){const end=stops.current.length?stops.current[stops.current.length-1]:tg;if(Math.hypot(end.x-st.x,end.z-st.z)>0.25)sit!.current=null}
    const now=!!sit?.current&&!moving.current&&Math.hypot(p.x-st!.x,p.z-st!.z)<0.3;
    if(now){const diff=Math.atan2(Math.sin(st!.face-b.rotation.y),Math.cos(st!.face-b.rotation.y));b.rotation.y+=diff*Math.min(1,LOOK.walk.turn*t)}
    if(now!==sitting.current){sitting.current=now;(testHooks() as {sitting?:boolean}).sitting=now;if(now)dispatchEvent(new CustomEvent('rt-sat-fire'))}
    // on the bridge: up and over its planks
    const lift=bridgeLift(p.x,p.z),y=lift?Math.max(surfaceY(p.x,p.z),surfaceY(BRIDGE.x,streamZ(BRIDGE.x))+lift):surfaceY(p.x,p.z);
    gr.position.set(p.x,y,p.z);gr.quaternion.copy(tiltAt(p.x,p.z))});
  return <group ref={g} visible={!hidden} name="player" onClick={onPick&&!hidden?e=>{e.stopPropagation();/* 피드백 2026-11-26: a drag to look round (first person) is not a tap on me */if(e.delta>6)return;onPick()}:undefined}><group ref={body} scale={LOOK.explorer.scale}>
    <Suspense fallback={null}><Explorer look={look} moving={moving} sit={sitting}/></Suspense>
  </group></group>;
}

// The camera keeps its angle and slides with the player; drag rotates, pinch/wheel zooms. Its distance and field of view
// follow the screen shape (look.ts camera, core/frame.ts): turning the phone reframes the garden, keeping the angle.
const camDir=(turn:number,pitch:number)=>new THREE.Vector3(0,Math.cos(pitch),Math.sin(pitch)).applyAxisAngle(new THREE.Vector3(0,1,0),-turn);
// focus: while a grade is open the camera goes to that holding's tree instead of the player, and the picture slides
// (setViewOffset) so the tree sits in the part of the screen the sheet leaves free (right panel or bottom sheet).
const sheetInset=(w:number,h:number)=>{const r=document.querySelector('.rt-sheet')?.getBoundingClientRect();if(!r)return {x:0,y:0};
  return r.left>w*0.35?{x:(w-r.left)/2,y:0}:r.top>h*0.25?{x:0,y:(h-r.top)/2}:{x:0,y:0}};
// orbit: the look round the garden after the trees are born (W1): one turn, pulled out a little, back to the framing
type Orbit={t0:number;at:number;len:number};
const easeInOut=(k:number)=>k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
// low: the root cut-away is open, so the camera comes down to the side of it (keeping the way it faces)
// near: a capsule is being buried or dug up (W3): the camera comes closer to it
// aim: a landmark just opened — the camera comes down to a side view from the garden's side, facing it (core/land.ts)
function FollowCam({pos,recenter,focus,orbit,low,near,aim,fp=false,talk=null,eye=null}:{pos:React.MutableRefObject<THREE.Vector3>;recenter:number;focus:THREE.Vector3|null;orbit:Orbit|null;low:number|null;near:boolean;aim?:number|null;fp?:boolean;talk?:{az:number;pitch?:number;dist?:number}|null;eye?:{x:number;z:number;ax:number;az:number;h?:number}|null}){
  const shift=useRef({x:0,y:0}),back=useRef(false),lean=useMemo(()=>new THREE.Vector3(),[]),side=useMemo(()=>new THREE.Vector3(),[]),tv=useRef({x:0,y:0});
  const ctl=useRef<OrbitControlsImpl>(null),{camera,size}=useThree(),fpWas=useRef(false);
  const prev=useMemo(()=>new THREE.Vector3(),[]),want=useMemo(()=>new THREE.Vector3(),[]),fwd=useMemo(()=>new THREE.Vector3(),[]);
  const fr=frameFor(LOOK.camera.frames,size.width/Math.max(1,size.height));
  useEffect(()=>{const c=ctl.current,cam=camera as THREE.PerspectiveCamera;if(!c)return;cam.fov=fr.fov;cam.updateProjectionMatrix();
    cam.position.copy(c.target).addScaledVector(camDir(fr.turn,fr.pitch),fr.dist);c.update();testHooks().camera=fr},[fr.fov,fr.dist,fr.turn,fr.pitch,camera]);
  useEffect(()=>{const c=ctl.current;if(!c||recenter===0)return;c.target.copy(pos.current);camera.position.copy(pos.current).addScaledVector(camDir(fr.turn,fr.pitch),fr.dist);c.update()},[recenter,camera,pos]);// eslint-disable-line react-hooks/exhaustive-deps
  // eased by time, not by frame: a slow phone gets there as fast as a quick one
  const eyeWas=useRef(false),eyeFrom=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,dt)=>{const c=ctl.current;if(!c)return;const ease=(r:number)=>1-Math.exp(-Math.min(dt,0.5)*r);
    // 유저 워크플로우 2장: face to face, the camera at my eye height looking at the other's face; afterwards it eases back
    // out to the usual framing where I stand
    const pc0=camera as THREE.PerspectiveCamera,E=LOOK.camera.eyeTalk;
    if(eye){if(!eyeWas.current){eyeWas.current=true;eyeFrom.copy(camera.position)}
      const fh=eye.h??E.face;want.set(eye.ax,surfaceY(eye.ax,eye.az)+fh,eye.az);c.target.lerp(want,ease(4));
      const dx=eye.ax-eye.x,dz=eye.az-eye.z,d=Math.hypot(dx,dz)||1,cx=eye.x-dx/d*E.back,cz=eye.z-dz/d*E.back;
      // level with their face (the ground under the camera can sit lower on the round village: measured from theirs)
      fwd.set(cx,surfaceY(eye.ax,eye.az)+fh+E.eye,cz);camera.position.lerp(fwd,ease(3.2));
      if(pc0.fov!==E.fov){pc0.fov=E.fov;pc0.updateProjectionMatrix()}c.enableZoom=false;c.enableRotate=false;c.minDistance=0.1;c.maxPolarAngle=Math.PI;
      c.update();camera.lookAt(c.target);(testHooks() as {view?:unknown}).view={fp:false,eyeTalk:true,eyeGap:+camera.position.distanceTo(c.target).toFixed(2),follow:0};return}
    if(eyeWas.current){eyeWas.current=false;back.current=true;c.enableRotate=true;c.enableZoom=true;pc0.fov=fr.fov;pc0.updateProjectionMatrix();
      c.minDistance=LOOK.camera.minDist;want.set(pos.current.x,surfaceY(pos.current.x,pos.current.z)+0.8,pos.current.z);c.target.copy(want);
      camera.position.copy(want).addScaledVector(camDir(fr.turn,fr.pitch),LOOK.camera.minDist+0.5)}
    // W6: last frame's tilt offset comes off first, so the orbit and the follow work on the real camera
    // first person: only when nothing else wants the camera (a tree, a building, a scene); those still win
    const F=LOOK.camera.fp,fpOn=fp&&!focus&&low===null&&!near&&aim==null&&!orbit;
    camera.position.sub(lean);prev.copy(c.target);want.set(pos.current.x,surfaceY(pos.current.x,pos.current.z)+(fpOn?F.eye:0.8),pos.current.z);
    if(focus)want.copy(focus);
    else if(fpOn){/* no lead: the eye is where the player is */}
    else if(fr.lead){fwd.subVectors(c.target,camera.position).setY(0);if(fwd.lengthSq()>1e-6)want.addScaledVector(fwd.normalize(),fr.lead)}
    const cam=camera as THREE.PerspectiveCamera,ins=focus?sheetInset(size.width,size.height):{x:0,y:0},sh=shift.current;
    sh.x+=(ins.x-sh.x)*ease(6.3);sh.y+=(ins.y-sh.y)*ease(6.3);
    if(Math.abs(sh.x)+Math.abs(sh.y)<0.5){if(cam.view?.enabled){cam.clearViewOffset()}}else cam.setViewOffset(size.width,size.height,sh.x,sh.y,size.width,size.height);
    c.target.lerp(want,ease(fpOn?F.follow:5));camera.position.add(prev.sub(c.target).negate());
    // a scene that wants its own look: the root cut (W2) low at its side, a capsule (W3) lower and closer; afterwards
    // the camera eases back to the usual framing (keeping the way it faces) instead of snapping
    const R=LOOK.roots,off=fwd.subVectors(camera.position,c.target),polar=Math.acos(Math.min(1,Math.max(-1,off.y/Math.max(1e-6,off.length()))));
    const pose=fpOn?null:low!==null?{az:low,pitch:R.camPitch,dist:R.camDist*fr.dist/LOOK.camera.frames[0].dist}
      :aim!=null?{az:aim,pitch:LOOK.camera.landmarkPitch,dist:fr.dist*LOOK.camera.landmarkDist}
      :talk!=null?{az:talk.az,pitch:talk.pitch??LOOK.camera.talk.pitch,dist:talk.dist??LOOK.camera.talk.dist}
      :near?{az:null,pitch:LOOK.capsule.pitch,dist:fr.dist*LOOK.capsule.near}:back.current?{az:null,pitch:fr.pitch,dist:fr.dist}:null;
    c.maxPolarAngle=pose?Math.max(1.12,polar+0.05,pose.pitch+0.15):1.12;c.minDistance=pose?Math.min(LOOK.camera.minDist,pose.dist*0.6):LOOK.camera.minDist;
    const pc=camera as THREE.PerspectiveCamera;
    if(fpOn){// stepping in: straight to the eye, facing the way the camera already faced, a little under level
      if(!fpWas.current){const az=Math.atan2(off.x,off.z);camera.position.set(Math.sin(F.pitch)*Math.sin(az),Math.cos(F.pitch),Math.sin(F.pitch)*Math.cos(az)).multiplyScalar(F.back).add(c.target);fpWas.current=true}
      else{off.subVectors(camera.position,c.target);camera.position.copy(c.target).add(off.setLength(F.back))}
      c.minDistance=F.back*0.5;c.maxPolarAngle=F.maxPitch;c.enableZoom=false;
      if(pc.fov!==F.fov){pc.fov=F.fov;pc.updateProjectionMatrix()}}
    else{c.enableZoom=true;if(fpWas.current){fpWas.current=false;back.current=true;pc.fov=fr.fov;pc.updateProjectionMatrix()}}
    if(pose){const az=pose.az??Math.atan2(off.x,off.z);
      want.set(Math.sin(pose.pitch)*Math.sin(az),Math.cos(pose.pitch),Math.sin(pose.pitch)*Math.cos(az)).multiplyScalar(pose.dist).add(c.target);
      if(low!==null||near||aim!=null||talk!=null)back.current=true;else if(camera.position.distanceTo(want)<0.2)back.current=false;
      if(back.current&&!(low!==null||near||aim!=null||talk!=null))c.minDistance=Math.min(c.minDistance,camera.position.distanceTo(c.target)*0.9);
      camera.position.lerp(want,ease(3.2))}
    // while the trees come up the camera comes lower and closer (they read as rising, not as blobs seen from above),
    // then it looks once round the garden and ends back on the usual framing
    if(orbit){const k=(performance.now()-orbit.t0-orbit.at)/orbit.len,B=LOOK.birth,cp=Math.min(B.maxPitch,fr.pitch*B.pitch),cd=fr.dist*B.dist;
      if(k<=0){want.copy(c.target).addScaledVector(camDir(fr.turn,cp),cd);camera.position.lerp(want,ease(3.7))}
      else if(k<1){const e=easeInOut(k),lift=Math.sin(Math.PI*k);
        camera.position.copy(c.target).addScaledVector(camDir(fr.turn+Math.PI*2*e,cp+(fr.pitch-cp)*e-0.12*lift),(cd+(fr.dist-cd)*e)*(1+B.pull*lift))}
      else if(k<1.2)camera.position.copy(c.target).addScaledVector(camDir(fr.turn,fr.pitch),fr.dist)}
    c.update();
    // then the new one goes on: sideways and up along the screen, eased so a shaky hand stays smooth
    tv.current.x+=(tilt.x-tv.current.x)*ease(6);tv.current.y+=(tilt.y-tv.current.y)*ease(6);
    side.set(1,0,0).applyQuaternion(camera.quaternion);lean.copy(side).multiplyScalar(tv.current.x*LOOK.tilt.amount);
    side.set(0,1,0).applyQuaternion(camera.quaternion);lean.addScaledVector(side,-tv.current.y*LOOK.tilt.amount*0.6);
    // 피드백 2026-11-26 "1인칭이 땅에 붙고 화면이 기울어": in first person no phone lean, and the view is levelled to the ground
    // under me (on the round world the global up leans away from it); the eye sits higher (look.ts camera.fp.eye)
    if(fpOn){lean.set(0,0,0);camera.up.copy(normalAt(pos.current.x,pos.current.z));camera.lookAt(c.target);camera.up.set(0,1,0)}
    else{camera.position.add(lean);camera.lookAt(c.target)}
    // e2e: first person or not, how far the camera is from where it looks, how far that is from the player (xz)
    (testHooks() as {view?:unknown}).view={fp:fpOn,eyeGap:+camera.position.distanceTo(c.target).toFixed(2),follow:+Math.hypot(c.target.x-pos.current.x,c.target.z-pos.current.z).toFixed(2)}});
  return <OrbitControls ref={ctl} makeDefault enablePan={false} enableDamping dampingFactor={LOOK.camera.damping} rotateSpeed={LOOK.camera.rotateSpeed} zoomSpeed={LOOK.camera.zoomSpeed}
    minPolarAngle={0.3} maxPolarAngle={1.12} minDistance={LOOK.camera.minDist} maxDistance={LOOK.camera.maxDist} target={[0,0.8,2.5]}/>;
}

// The grade reveal reaching the garden (ui/Loop.tsx Grades → Proto3D world.burst): a hit throws bright sparks up out of
// the holding tree, a miss shakes a few leaves loose. Plays once for TIMING.revealBurst, then hides itself.
function Burst({x,z,hit,stamp}:{x:number;z:number;hit:boolean;stamp:number}){
  const ref=useRef<THREE.InstancedMesh>(null),t0=useRef(-1),o=useMemo(()=>new THREE.Object3D(),[]);
  const parts=useMemo(()=>{const r=rng(stamp%100000);return Array.from({length:hit?40:26},()=>({a:r()*6.28,sp:0.6+r()*1.4,up:hit?2.6+r()*2.8:0.5+r()*0.6,h:hit?1.6+r()*1:2.2+r()*1.6,ph:r()*6.28,s:hit?0.11+r()*0.1:0.2+r()*0.12}))},[stamp,hit]);
  const mat=useMemo(()=>new THREE.MeshBasicMaterial({color:hit?LOOK.burst.hit:LOOK.burst.miss,transparent:true,toneMapped:!hit,side:THREE.DoubleSide,depthWrite:false}),[hit]);
  const y0=surfaceY(x,z);
  useFrame(({clock})=>{const m=ref.current;if(!m)return;if(t0.current<0)t0.current=clock.elapsedTime;const k=(clock.elapsedTime-t0.current)/(TIMING.revealBurst/1000);
    if(k>1){m.visible=false;return}m.visible=true;mat.opacity=1-k*k;
    // start at the canopy edge (not inside it, where the tree would hide them)
    parts.forEach((p,i)=>{const r=1.3+p.sp*k*(hit?1.8:1.1),sway=hit?0:Math.sin(k*9+p.ph)*0.25;
      o.position.set(x+Math.cos(p.a)*r+sway,y0+p.h+(hit?p.up*k-2.6*k*k:-p.up*k*2.2),z+Math.sin(p.a)*r);
      o.rotation.set(k*6+p.ph,k*4,p.ph);o.scale.setScalar(p.s*(hit?1-k*0.5:1));o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true});
  return <instancedMesh ref={ref} args={[undefined,mat,parts.length]} frustumCulled={false}>{hit?<octahedronGeometry args={[1,0]}/>:<planeGeometry args={[1.6,1]}/>}</instancedMesh>;
}

// W1: the born tree's stable timing object (one per birth and tree, so the tree's effects do not restart every render)
const bornCache=new WeakMap<object,Born[]>();
function bornOf(b:{t0:number;plan:BirthPlan;ids:number[]},i:number):Born{let list=bornCache.get(b);if(!list){list=b.ids.map((_,k)=>({t0:b.t0,plan:b.plan,i:k}));bornCache.set(b,list)}return list[i]}
// the ground cracking open as a tree's turn comes: a dark ring opening out and a puff of soil (instanced, one per tree)
const dustGeo=new THREE.SphereGeometry(1,8,6),ringGeo=new THREE.RingGeometry(0.55,1,28);
function BirthDust({born}:{born:Born}){
  const ref=useRef<THREE.InstancedMesh>(null),ring=useRef<THREE.Mesh>(null),o=useMemo(()=>new THREE.Object3D(),[]);
  const parts=useMemo(()=>{const r=rng(born.i*97+13);return Array.from({length:16},()=>({a:r()*6.28,sp:0.8+r()*1.2,up:0.6+r()*1.1,s:0.09+r()*0.09}))},[born.i]);
  const mat=useMemo(()=>new THREE.MeshBasicMaterial({color:LOOK.birth.dust,transparent:true,depthWrite:false}),[]);
  const ringMat=useMemo(()=>new THREE.MeshBasicMaterial({color:LOOK.birth.crack,transparent:true,depthWrite:false,side:THREE.DoubleSide}),[]);
  useEffect(()=>()=>{mat.dispose();ringMat.dispose()},[mat,ringMat]);
  useFrame(()=>{const m=ref.current,rg=ring.current;if(!m||!rg)return;const p=born.plan;
    const t=performance.now()-born.t0-born.i*p.stagger-p.card,k=t/(TIMING.birthDust);
    if(k<0||k>1){m.visible=false;rg.visible=false;return}m.visible=rg.visible=true;
    mat.opacity=0.9*(1-k);ringMat.opacity=0.7*(1-k*k);rg.scale.setScalar(0.4+1.3*Math.min(1,k*2.4));
    parts.forEach((q,i)=>{const r=0.35+q.sp*k*1.4;o.position.set(Math.cos(q.a)*r,0.15+q.up*k*1.6-1.8*k*k,Math.sin(q.a)*r);o.scale.setScalar(q.s*(1+k*1.4));o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true});
  return <>
    <mesh ref={ring} geometry={ringGeo} material={ringMat} rotation-x={-Math.PI/2} position-y={0.06} visible={false}/>
    <instancedMesh ref={ref} args={[dustGeo,mat,parts.length]} frustumCulled={false} visible={false}/>
  </>;
}

// the sun (and its shadow box) moves with the player, so the wider map has shadows wherever the player is
function SunFollow({pos,sun}:{pos:React.MutableRefObject<THREE.Vector3>;sun:React.RefObject<THREE.DirectionalLight|null>}){
  const {scene}=useThree();
  useEffect(()=>{const l=sun.current;if(l&&!l.target.parent)scene.add(l.target)},[scene,sun]);
  useFrame(()=>{const l=sun.current;if(!l)return;const p=pos.current,[sx,sy,sz]=LOOK.sun.position;l.position.set(p.x+sx,sy,p.z+sz);l.target.position.set(p.x,surfaceY(p.x,p.z),p.z)});
  return null;
}

// Test hooks for e2e (tests/e2e/proto3d.spec.ts): frame count, player position, tree screen points.
function Hooks({pos,treePos,points}:{pos:React.MutableRefObject<THREE.Vector3>;treePos:{id:number;v:THREE.Vector3}[];points:Map<string,THREE.Vector3>}){
  const {camera,size,scene,gl}=useThree(),v=useMemo(()=>new THREE.Vector3(),[]);
  const counted=useRef(-1);
  // the share card's garden shot: drawn once more straight away (the screen buffer is not kept between frames)
  // without the slide that keeps the tree beside a sheet, so the tree being graded is in the middle of the shot
  useEffect(()=>{snapshot.take=()=>{const cam=camera as THREE.PerspectiveCamera,v=cam.view?.enabled?{...cam.view}:null;if(v)cam.clearViewOffset();
    gl.render(scene,cam);const url=gl.domElement.toDataURL('image/png');if(v)cam.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);return url};
    return()=>{snapshot.take=null}},[gl,scene,camera]);
  useFrame(()=>{const h=testHooks();
    h.frames++;h.ready=h.frames>3;h.player={x:pos.current.x,z:pos.current.z};
    // which lit meshes wear the shared soft material (glowing bits and water are left out on purpose); recount when models arrive
    if(h.frames===2||counted.current!==h.treeModels){counted.current=h.treeModels;let all=0,s=0;scene.traverse(o=>{const m=(o as THREE.Mesh).material as THREE.Material|undefined;if(!(o as THREE.Mesh).isMesh||!m)return;all++;if(m.userData.soft)s++});h.meshes=all;h.softMeshes=s}
    h.trees={};h.treeAt={};for(const t of treePos){h.treeAt[t.id]={x:t.v.x,z:t.v.z};v.copy(t.v).project(camera);const pt={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height};h.trees[t.id]=pt;screenPoints.set('tree-'+t.id,{...pt,visible:v.z<1});
      v.set(t.v.x,surfaceY(t.v.x,t.v.z)+0.08,t.v.z).project(camera);screenPoints.set('treefoot-'+t.id,{x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height,visible:v.z<1,d:Math.hypot(t.v.x-pos.current.x,t.v.z-pos.current.z)})}
    for(const [k,p] of points){v.copy(p).project(camera);const pt={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height};h.points[k]=pt;screenPoints.set(k,{...pt,visible:v.z<1})}});
  return null;
}

// What the overlay tells the world (Proto3D.tsx): where each analyst should be and what their bubble says, cooldown pots,
// placed items, and what the landmarks show.
export type Landmark='master'|'observatory'|'signpost'|'cart'|'library'|'plaza'|'arcade'|'house';
export type World={
  // 마을: a tap on my own character (옷 갈아입기)
  onPlayer?:()=>void;
  // 보리, the friend who comes over to talk (core/friend.ts): where it waits and what a tap does; null keeps it home
  friend?:{at:{x:number;z:number};onPick:()=>void;face?:string}|null;
  // 나루 the otter by the pond, and the float while fishing (wait: bobbing, bite: pulled under)
  naru?:{at:{x:number;z:number};onPick:()=>void}|null;
  fishing?:{x:number;z:number;phase:'wait'|'bite'}|null;
  // 부지·건물·랜드마크 (core/land.ts): what is built, whether 넓히기 mode shows the closed lots, and what a tap on one does
  // (key 'land:<id>' | 'building:<id>' | 'city:<id>')
  build?:{built:Built;mode:boolean;onLot:(key:string)=>void}|null;
  // at: the tree they stand at (a signal) · near: luon waiting by that tree's capsule marker · spot: where their day has
  // them (core/routine.ts), facing `face`, doing `act` · home: indoors (not drawn out here)
  analysts:{id:AnalystId;at:number|null;near?:boolean;talking?:boolean;spot?:{x:number;z:number;face:number;act:string}|null;home?:boolean;bubble:{text:string;alert:boolean}|null}[];
  pots:{holdingId:number;open:boolean;flowers:number}[];
  decor:{slot:string;shape:Shape}[];
  hitRate:number|null;cartFlag:string;gameLit:boolean;
  burst:{holdingId:number;hit:boolean;stamp:number}|null;
  focus:number|null;
  // a spot the camera looks at for a moment instead of the player (a landmark just opened, core/land.ts)
  view?:{x:number;z:number;y?:number;az?:number}|null;
  // W1: the trees being born now (core/birth.ts), and where the analysts walk in from as they arrive
  birth:{ids:number[];t0:number;plan:BirthPlan}|null;
  enterFrom:{x:number;z:number}|null;
  // W2: the ground open under one tree (core/roots.ts), since t0; closing: when it started to cover again
  cutaway:{holdingId:number;roots:Roots;t0:number;closing:number|null}|null;
  onDeep:(holdingId:number)=>void;
  // W3: one capsule marker per tree (core/capsule.ts), the one being buried or dug up now, and a tap on a marker
  capsules:{holdingId:number;due:boolean}[];
  capsuleFx:{kind:'bury'|'dig';holdingId:number;t0:number;len:number}|null;
  onCapsule:(holdingId:number)=>void;
  onAnalyst:(id:AnalystId)=>void;onLandmark:(k:Landmark)=>void;
  // the wider map: the league square's flags (this week's group, mine marked), today's case still open, where to walk
  flags:string[];myFlag:number;caseOpen:boolean;goTo:{x:number;z:number;at:number}|null;
  // first person (feedback 11-17): the camera at the player's eyes; the player's own figure is hidden meanwhile
  fp?:boolean;
  // the 꽃집 (content/flower-shop.ts): what is planted, and while one is being placed a tap on the grass plants it
  plants?:{id:string;item:string;x:number;z:number;scale:number}[];
  planting?:{item:string;scale?:number}|null;onPlant?:(x:number,z:number,why:string|null)=>void;
  // a bought building being set down: a tap on the grass puts it there (or says why not)
  placing?:{id:string}|null;onPlace?:(x:number,z:number,why:string|null)=>void;
  // 보리 came over to talk: the camera frames the point between it and the player (LOOK.camera.talk)
  // eye: 유저 워크플로우 2장, a talk face to face: the camera at my eyes (x,z), looking at the other's face (ax,az)
  talk?:{x:number;z:number;az:number;pitch?:number;dist?:number;lift?:number;eye?:{x:number;z:number;ax:number;az:number;h?:number}|null}|null;
  // 유저 워크플로우: the village's people (content/villagers.ts), whether each is the one to go to now, who is talking;
  // the guide's footprints to the next one; the news board, the cart's pile and whether the merchant is at the stall
  villagers?:{id:string;x:number;z:number;face:number;look:Look;hl:boolean;talking:boolean;away?:boolean;errand?:Errand|null;onErrandDone?:()=>void;routine?:Routine|null;onPick:()=>void}[];
  guide?:{x:number;z:number}|null;
  // 피드백 2026-11-22: the tutorial leads: light on the one place to go, the rest dimmed, and I can only walk along the way there
  lead?:{from:{x:number;z:number};to:{x:number;z:number};mark?:{x:number;z:number};off:()=>void}|null;onNews?:()=>void;cartPile?:number;merchantOpen?:boolean;
  // 피드백 2026-11-23: the shops are houses (Shop3D.tsx); inside one, its room replaces the village
  shop?:ShopId|null;onShop?:(id:ShopId)=>void;
  // inside the house (Interior3D.tsx): the garden is put away and the workroom drawn instead
  // my observer: how it is dressed (core/wardrobe.ts), and whether its stage (ui/MyPage.tsx) is open instead of the garden
  look:Look;stage:boolean;
  // 다른 정원들: the sky of planets replaces the garden while it is open (ui/SkyView.tsx)
  sky:SkyWorld|null;
  // the time of day (core/daylight.ts): how light, how warm, how dark
  light:Daylight;
  inside:boolean;room:{people?:boolean;books:Book[];notes:Note[];resting:AnalystId[];onDesk:()=>void;onShelf:()=>void;onBoard:()=>void;onDoor:()=>void};
};
// 게임 구성 3: a mouse over a thing in the village names it (Proto3D's HoverTip turns the name into words)
const HOVER_NAMES=/^(shop-\w+|house|cart|signpost|signpost-hit|observatory|plaza|arcade|library|player|tree-\d+|analyst-\w+|decor-[\w-]+|bridge)$/;
const hover=(e:ThreeEvent<PointerEvent>)=>{if(e.pointerType!=='mouse')return;let o:THREE.Object3D|null=e.object,name='';
  while(o){if(HOVER_NAMES.test(o.name)){name=o.name;break}o=o.parent}
  window.dispatchEvent(new CustomEvent('rt-hover',{detail:name?{name,x:e.nativeEvent.clientX,y:e.nativeEvent.clientY}:null}))};
const hoverOff=()=>window.dispatchEvent(new CustomEvent('rt-hover',{detail:null}));
export default function Scene3D({holdings,picked,onPick,recenter,weather,world}:{holdings:Holding[];picked:number|null;onPick:(id:number|null)=>void;recenter:number;weather:Weather;world:World}){
  const wl=LOOK.weather[weather],hemi=useRef<THREE.HemisphereLight>(null);
  const {size,camera}=useThree(),blur=frameFor(LOOK.camera.frames,size.width/Math.max(1,size.height)).blur;
  useEffect(()=>{testHooks().weather=weather},[weather]);
  useEffect(()=>{if(world.burst)testHooks().burst={holdingId:world.burst.holdingId,hit:world.burst.hit}},[world.burst]);
  const sun=useRef<THREE.DirectionalLight>(null);
  const pos=useRef(PLAYER_START.clone()),target=useRef(PLAYER_START.clone()),stops=useRef<{x:number;z:number}[]>([]);
  // the map (ui/MapSheet.tsx) sends the player to a place
  // 피드백 2026-11-26 "지도에서 낚시터 누르면 이동이 안 돼": a goal on the pond's edge (the fishing spot) was "in the water" to
  // the route, which then gave up; it is moved out to the bank first
  useEffect(()=>{if(!world.goTo)return;const gq={x:world.goTo.x,z:world.goTo.z};if(inPond(gq.x,gq.z,0.25)){outOfPond(gq);const k=Math.hypot(gq.x-POND_AT.x,gq.z-POND_AT.z)||1;gq.x+=(gq.x-POND_AT.x)/k*0.3;gq.z+=(gq.z-POND_AT.z)/k*0.3}
    const r=route(pos.current,gq,(x,z)=>inPond(x,z,0.2));if(!r)return;const [first,...rest]=r;target.current.set(first.x,0,first.z);stops.current=rest},[world.goTo]);
  // each holding grows on its own plot (app/core/portfolio.ts gives every new tree an empty one)
  // PM 설계 2026-11-19 7장: a tree shows its stock's name only. Leaf colour, size, fruit and lean no longer follow returns,
  // holding days or signals: every holding tree is the same grown, healthy tree (?treeState=1 brings the old look back)
  // 유저 워크플로우 3장 (PM 2026-11-21): the size follows what the holding is worth now (continuously, core/walk.ts treeSize),
  // the leaves and fruit follow the return; the model stays the grown one (?treeState=1: the old age-based look)
  const neutral=typeof window!=='undefined'&&!new URLSearchParams(location.search).has('treeState');
  const trees=useMemo(()=>holdings.filter(h=>h.plot>=0&&h.plot<FARM.length).map(h=>{const st=treeState(h,defaultRules);
    const gt=neutral?gardenTree(h):null;// 처분효과 (core/recheck.ts): nothing here reads the days held
    return {h,st:gt?{...st,growth:gt.growth,condition:gt.condition}:st,size:gt?gt.size:1,x:FARM[h.plot][0],z:FARM[h.plot][1]}}),[holdings,neutral]);
  const points=useMemo(()=>{const m=new Map<string,THREE.Vector3>();for(const [k,p] of Object.entries(SPOTS))m.set(k,new THREE.Vector3(p.x,surfaceY(p.x,p.z)+1.2,p.z));
    // the house, the library and the square: points to tap (e2e) and to pin tags to
    for(const [k,p,y] of [['house',HOUSE,1.6],['library',LIB,1.6],['plaza',PLAZA,1.3]] as const)m.set(k,new THREE.Vector3(p.x,surfaceY(p.x,p.z)+y,p.z));
    // the shop keepers' name tags over their shop's door
    for(const id of SHOP_IDS){const d=doorOf(SHOP_AT[id],1.6);m.set('npctag-'+id,new THREE.Vector3(d.x,surfaceY(d.x,d.z)+(id==='librarian'?4.3:3.8),d.z))}return m},[]);
  // the point the e2e test taps: a little below the top of each tree, updated once its model has loaded
  const birthFocus=useMemo(()=>{const b=world.birth;if(!b)return null;const ts=trees.filter(t=>b.ids.includes(t.h.id));if(!ts.length)return null;
    const c=new THREE.Vector3();for(const t of ts)c.add(new THREE.Vector3(t.x,surfaceY(t.x,t.z)+0.8,t.z));return c.divideScalar(ts.length)},[trees,world.birth]);
  // W2: the cut faces the camera as it was when the ground opened; the camera then looks a little below the ground there
  const cut=useMemo(()=>{const c=world.cutaway,t=c&&trees.find(x=>x.h.id===c.holdingId);if(!c||!t)return null;
    // look from the side nearest the camera's that no other tree stands in front of (W2: the cut must be seen)
    const now=Math.atan2(camera.position.x-t.x,camera.position.z-t.z),reach=LOOK.roots.camDist*0.6;
    const blocked=(az:number)=>trees.reduce((n,o)=>{if(o===t)return n;const dx=o.x-t.x,dz=o.z-t.z,along=dx*Math.sin(az)+dz*Math.cos(az);if(along<0.3||along>reach)return n;
      const side=Math.abs(dx*Math.cos(az)-dz*Math.sin(az));return n+(side<2.4?1+(2.4-side):0)},0);
    let yaw=now,best=Infinity;for(let k=0;k<=12;k++){const az=now+(k%2?1:-1)*Math.ceil(k/2)*Math.PI/12,b=blocked(az)+Math.abs(az-now)*0.15;if(b<best){best=b;yaw=az}}
    const base=new THREE.Vector3(t.x,surfaceY(t.x,t.z),t.z);
    return {c,t,yaw,base,quat:tiltAt(t.x,t.z).multiply(new THREE.Quaternion().setFromAxisAngle(UP,yaw)),look:base.clone().add(new THREE.Vector3(0,-LOOK.roots.camDrop,0))};
  },[world.cutaway?.t0,trees]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{testHooks().cutaway=world.cutaway&&!world.cutaway.closing?{open:true,holdingId:world.cutaway.holdingId,roots:world.cutaway.roots}:{open:false,holdingId:null,roots:null}},[world.cutaway]);
  const focusPos=useMemo(()=>{if(cut&&!cut.c.closing)return cut.look;if(world.talk)return new THREE.Vector3(world.talk.x,surfaceY(world.talk.x,world.talk.z)+(world.talk.lift??LOOK.camera.talk.lift),world.talk.z);const t=trees.find(x=>x.h.id===world.focus);if(t)return new THREE.Vector3(t.x,surfaceY(t.x,t.z)+1.2,t.z);
    const v=world.view;return v?new THREE.Vector3(v.x,surfaceY(v.x,v.z)+(v.y??2.5),v.z):birthFocus},[trees,world.focus,birthFocus,cut,world.view,world.talk]);
  const orbit=useMemo(()=>world.birth&&world.birth.plan.orbit?{t0:world.birth.t0,at:world.birth.plan.orbitAt,len:world.birth.plan.orbit}:null,[world.birth]);
  useEffect(()=>{for(const t of trees)points.set('plot-'+t.h.id,new THREE.Vector3(t.x,surfaceY(t.x,t.z)+0.5,t.z))},[trees]);// eslint-disable-line react-hooks/exhaustive-deps
  // W3 capsule markers stand beside their tree's trunk; their tags (DOM) sit just above them
  const capSpot=(t:{x:number;z:number})=>({x:t.x+LOOK.capsule.spot.dx,z:t.z+LOOK.capsule.spot.dz});
  useEffect(()=>{for(const c of world.capsules){const t=trees.find(x=>x.h.id===c.holdingId);if(!t)continue;const p=capSpot(t);points.set('capsule-'+c.holdingId,new THREE.Vector3(p.x,surfaceY(p.x,p.z)+1.15,p.z))}
    testHooks().capsules=world.capsules.map(c=>({holdingId:c.holdingId,due:c.due}))},[world.capsules,trees]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{testHooks().capsuleFx=world.capsuleFx?{kind:world.capsuleFx.kind,holdingId:world.capsuleFx.holdingId}:null},[world.capsuleFx]);
  const treePos=useMemo(()=>trees.map(t=>({id:t.h.id,v:new THREE.Vector3(t.x,surfaceY(t.x,t.z)+0.5,t.z)})),[trees]);
  const onTops=useMemo(()=>treePos.map(p=>(y:number)=>{p.v.y=surfaceY(p.v.x,p.v.z)+0.12+y*0.75}),[treePos]);
  // each analyst reports its head top: the body point is for tapping it, the bubble point sits above the head
  // the friend reports as friend-<id> (not analyst-), so the analysts' count stays theirs; its bubble point is shared
  const reportFriend=useCallback((id:string,v:THREE.Vector3)=>{if(id==='bori')(testHooks() as {friendAt?:{x:number;z:number}}).friendAt={x:v.x,z:v.z};for(const [k,dy] of (id==='naru'?[['friend-'+id,-1.2],['bubble-'+id,0.55],['npctag-naru',0.1]]:[['friend-'+id,-1.2],['bubble-'+id,0.55]]) as [string,number][]){let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v).y+=dy}},[points]);
  const reportAnalyst=useCallback((id:string,v:THREE.Vector3)=>{for(const [k,dy] of [['analyst-'+id,-1.2],['bubble-'+id,0.55],['npctag-'+id,0.1]] as const){let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v).y+=dy}},[points]);
  // an analyst with a flag stands in front of that tree, a little to one side (so two on one tree do not overlap)
  const spotFor=(id:AnalystId,at:number|null,near?:boolean,spot?:{x:number;z:number}|null)=>{const t=at===null?null:trees.find(x=>x.h.id===at);
    if(!t)return spot??IDLE[id];const side=id==='moa'?-1:1;
    if(near){const c=capSpot(t);return {x:c.x+0.9,z:c.z+0.5}}
    if(cut&&cut.t===t){const lx=side*(LOOK.roots.width+0.65),lz=0.6,c=Math.cos(cut.yaw),s=Math.sin(cut.yaw);return {x:t.x+lx*c+lz*s,z:t.z-lx*s+lz*c}}
    return {x:t.x+side*1.05,z:t.z+1.15}};
  // e2e: plant at a ground point as a tap there would (only while the 꽃집 waits for a spot); how many decor stand
  useEffect(()=>{const h=testHooks() as {plantAt?:(x:number,z:number)=>string|null;decor?:number};h.decor=(world.plants??[]).length;
    h.plantAt=(x,z)=>{if(!world.planting||!world.onPlant)return 'not planting';const why=plantBlock(x,z)||(tooClose([...(world.plants??[]),...starter()],x,z)?'다른 꽃·나무랑 너무 가까워요':null);world.onPlant(x,z,why);return why}});
  // the tutorial's way: near the line from where it started to the place, or near the place itself
  const onWay=(x:number,z:number)=>{const L=world.lead;if(!L)return true;const ax=L.from.x,az=L.from.z,bx=L.to.x-ax,bz=L.to.z-az,l2=bx*bx+bz*bz||1;
    const k=Math.max(0,Math.min(1,((x-ax)*bx+(z-az)*bz)/l2)),dx=x-(ax+bx*k),dz=z-(az+bz*k);return Math.hypot(dx,dz)<LOOK.lead.width||Math.hypot(x-L.to.x,z-L.to.z)<LOOK.lead.near};
  const offAt=useRef(0);const off=()=>{const t=performance.now();if(t-offAt.current>2500){offAt.current=t;world.lead?.off()}};
  const [ghost,setGhost]=useState<{x:number;z:number;ok:boolean}|null>(null);
  useEffect(()=>{if(!world.placing)setGhost(null)},[world.placing]);
  const whyHere=(x:number,z:number)=>world.placing?placeBlock(world.placing.id,x,z,world.build?.built,world.plants):null;
  const placeHover=(p:THREE.Vector3)=>{if(!world.placing)return;(testHooks() as {placeGhost?:unknown}).placeGhost={x:+p.x.toFixed(1),z:+p.z.toFixed(1)};setGhost(g=>g&&Math.hypot(g.x-p.x,g.z-p.z)<0.15?g:{x:p.x,z:p.z,ok:!whyHere(p.x,p.z)})};
  useEffect(()=>{const h=testHooks() as {placeAt?:(x:number,z:number)=>string|null};
    h.placeAt=(x,z)=>{if(!world.placing||!world.onPlace)return 'not placing';const why=whyHere(x,z);setGhost({x,z,ok:!why});world.onPlace(x,z,why);return why}});
  // 피드백 11-26 "나무 설치할때 투명색으로 대략 느낌": a see-through plant follows the pointer over the village, green
  // where it can go and red where not; a click plants it there. On a phone (no hover) the first tap puts the ghost down,
  // a tap on it plants
  const [pg,setPg]=useState<{x:number;z:number;ok:boolean}|null>(null);
  useEffect(()=>{if(!world.planting)setPg(null)},[world.planting]);
  const plantWhy=(x:number,z:number)=>plantBlock(x,z)||(tooClose([...(world.plants??[]),...starter()],x,z)?'다른 꽃·나무랑 너무 가까워요':null);
  const plantHover=(p:THREE.Vector3)=>{if(!world.planting)return;setPg(g=>g&&Math.hypot(g.x-p.x,g.z-p.z)<0.15?g:{x:p.x,z:p.z,ok:!plantWhy(p.x,p.z)})};
  const hoverOk=useMemo(()=>typeof matchMedia!=='undefined'&&matchMedia('(hover:hover) and (pointer:fine)').matches,[]);
  const sit=useRef<{x:number;z:number;face:number}|null>(null);
  const sitDown=()=>{if(world.placing||world.planting)return;const s=FIRE_SEAT;if(!onWay(s.x,s.z)){off();return}
    const r=route(pos.current,s,(x,z)=>inPond(x,z,0.2));if(!r)return;const [first,...rest]=r;target.current.set(first.x,0,first.z);stops.current=rest;sit.current=s;onPick(null)};
  useEffect(()=>{const h=testHooks() as {sitDown?:()=>void;sitFire?:()=>void};h.sitDown=sitDown;h.sitFire=sitDown});
  const walk=(p:THREE.Vector3)=>{if(world.placing&&world.onPlace){const why=whyHere(p.x,p.z);setGhost({x:p.x,z:p.z,ok:!why});world.onPlace(p.x,p.z,why);return}
    if(world.planting&&world.onPlant){const why=plantWhy(p.x,p.z);if(!hoverOk&&!(pg&&Math.hypot(pg.x-p.x,pg.z-p.z)<1.2)){setPg({x:p.x,z:p.z,ok:!why});return}
      setPg({x:p.x,z:p.z,ok:!why});world.onPlant(p.x,p.z,why);return}const r=route(pos.current,p,(x,z)=>inPond(x,z,0.2));if(!r)return;if(!onWay(p.x,p.z)){off();return}const [first,...rest]=r;target.current.set(first.x,0,first.z);stops.current=rest;onPick(null)};
  const reportPoint=useCallback((k:string,v:THREE.Vector3)=>{let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v)},[points]);
  useEffect(()=>{testHooks().inside=world.inside;testHooks().stage=world.stage;(testHooks() as unknown as {shop:unknown}).shop=world.shop??null},[world.inside,world.stage,world.shop]);
  // 넓히기 mode: where each closed lot's tag sits (ui/BuildMode.tsx), and the landmarks' (always, for their name tags)
  const bm=world.build?.mode,bl=world.build?.built;
  // 피드백 2026-11-26 "나무도 바위도 통과": the scenery trees are solid too, for me and for the village's people (who also
  // walk round the fruit trees in the plots: places.ts npcStep)
  const walls=useMemo(()=>[...solids(bl),...DECO_TREES.map(([,x,z,sc])=>({x,z,r:0.42*sc})),...starter().filter(p=>!['tulips','hydrangea','sunflowers'].includes(p.item)).map(p=>({x:p.x,z:p.z,r:0.4}))],[bl]);
  // the people also walk round the log and the stumps by the fire (I sit on the log, so not mine)
  useEffect(()=>{setNpcWalls([...walls,...PLOTS.map(([x,z])=>({x,z,r:0.45})),...[-0.7,0,0.7].map(k=>({x:FIRE_LOG.x-0.92*k,z:FIRE_LOG.z+0.39*k,r:0.28})),
    ...NPC_FIRE_SEATS.slice(1).map(q=>({x:q.x,z:q.z,r:0.26}))])},[walls]);
  // name signs above the buildings (ui/Signs.tsx)
  useEffect(()=>{for(const k of [...points.keys()])if(k.startsWith('sign-'))points.delete(k);
    const put=(k:string,x:number,z:number,y:number)=>points.set('sign-'+k,new THREE.Vector3(x,surfaceY(x,z)+y,z));
    for(const p of PLACES)if(p.id in SIGN_PLACES)put(p.id,p.x,p.z,SIGN_PLACES[p.id]);
    for(const b of BUILDINGS)if(bl?.buildings.includes(b.id)){const [x,z]=buildingAt(b,bl);put(b.id,x,z,SIGN_BUILDINGS[b.id]??4)}
    for(const c of CITIES)if(bl?.cities.includes(c.id))put('city-'+c.id,c.at[0],c.at[1],SIGN_CITY)},[bl,points]);
  useEffect(()=>{for(const k of [...points.keys()])if(k.startsWith('lot-')||k.startsWith('city-'))points.delete(k);if(!bl)return;
    const put=(k:string,x:number,z:number,y:number)=>points.set(k,new THREE.Vector3(x,surfaceY(x,z)+y,z));
    for(const c of CITIES)put('city-'+c.id,c.at[0],c.at[1],bl.cities.includes(c.id)?6.4:1.2);
    if(!bm)return;
    for(const l of LANDS)if(!BASE_LAND.includes(l.id)&&!bl.land.includes(l.id))put('lot-land:'+l.id,l.at[0],l.at[1],1.4);
    for(const b of BUILDINGS)if(!bl.buildings.includes(b.id))put('lot-building:'+b.id,b.at[0],b.at[1],1.4)},[bm,bl,points]);
  return <>
    {!world.inside&&!world.shop&&!world.stage&&!world.sky&&<fog attach="fog" args={[mixHex(wl.fog,LOOK.daylight.nightFog,world.light.night*0.85),LOOK.fog.near,LOOK.fog.far]}/>}
    <hemisphereLight ref={hemi} args={[LOOK.hemi.sky,LOOK.hemi.ground,LOOK.hemi.intensity*wl.hemi*(LOOK.daylight.floor+(1-LOOK.daylight.floor)*world.light.day)]} intensity={LOOK.hemi.intensity*wl.hemi*(LOOK.daylight.floor+(1-LOOK.daylight.floor)*world.light.day)*(world.lead?LOOK.lead.dim:1)}/>
    <SunFollow pos={pos} sun={sun}/>
    <directionalLight ref={sun} position={LOOK.sun.position} intensity={wl.sun.intensity*Math.max(0.08,world.light.day)*(world.lead?LOOK.lead.dim:1)} color={mixHex(wl.sun.color,LOOK.daylight.lowSun,world.light.warm)} castShadow
      shadow-mapSize={[LOOK.shadow.mapSize,LOOK.shadow.mapSize]} shadow-radius={LOOK.shadow.radius} shadow-bias={-0.0004} shadow-normalBias={0.04}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={50}/>

    {world.sky?<SkyScene sky={world.sky}/>:world.stage?<Showroom look={world.look}/>:world.shop?<ShopRoom id={world.shop} look={world.look}/>:world.inside?<Interior me={world.look} people={world.room.people} books={world.room.books} notes={world.room.notes} resting={world.room.resting} decor={world.decor}
      onDesk={world.room.onDesk} onShelf={world.room.onShelf} onBoard={world.room.onBoard} onDoor={world.room.onDoor} onAnalyst={world.onAnalyst}
      report={reportPoint} reportAnalyst={reportAnalyst}/>:<group onPointerMove={hover} onPointerOut={hoverOff}>
    <Ground onWalk={walk} onHover={world.placing?placeHover:world.planting?plantHover:undefined}/>
    {world.planting&&pg&&<Suspense fallback={null}><PlantGhost item={world.planting.item} scale={world.planting.scale??1} at={pg}/></Suspense>}
    {world.placing&&<BuildingGhost id={world.placing.id} at={ghost} ok={!!ghost?.ok} rot={BUILDINGS.find(b=>b.id===world.placing!.id)?.rot??0}/>}
    {(world.plants??[]).map(p=><Suspense key={p.id} fallback={null}><DecorPlant item={p.item} x={p.x} z={p.z} scale={p.scale}/></Suspense>)}
    {/* the starter trees are plain round trees (2026-11-18 user: fruit trees mean stocks, so only the fence has them); the beds stay */}
    {starter().map(p=>['tulips','hydrangea','sunflowers'].includes(p.item)
      ?<Suspense key={p.id} fallback={null}><DecorPlant item={p.item} x={p.x} z={p.z} scale={0.8}/></Suspense>
      :<PlainTree key={p.id} x={p.x} z={p.z}/>)}
    <Tufts/>
    <Pond dim={world.light.night*0.85}/>
    <PondLife at={POND_AT}/>
    {/* 피드백 2026-11-26 "길고양이·강아지": a stray cat and a dog wander between the village's corners */}
    <Cat id="stray-cat" spots={STRAY_CAT} ground={surfaceY} tint="#9a9590"/>
    <Dog spots={STRAY_DOG}/>
    <Flowers/>
    <House night={world.light.night} onEnter={()=>world.onLandmark('house')}/>
    <Campfire onSit={sitDown}/>
    <CampfireDecor at={FIRE}/>
    {ROCKS.map(([x,z,sc,rot],i)=><Rock key={i} x={x} z={z} s={sc} rot={rot}/>)}
    {trees.map((t,i)=>{const b=world.birth,k=b?b.ids.indexOf(t.h.id):-1;return <HoldingTree key={t.h.id} id={t.h.id} x={t.x} z={t.z} size={t.size} growth={t.st.growth} condition={t.st.condition} picked={picked===t.h.id} onPick={id=>onPick(id)} onTop={onTops[i]} wind={wl.wind}
      born={b&&k>=0?bornOf(b,k):null} onDeep={world.onDeep} cut={!!cut&&cut.t===t}/>})}
    {world.capsules.map(c=>{const t=trees.find(x=>x.h.id===c.holdingId),fx=world.capsuleFx;if(!t||(fx&&fx.kind==='dig'&&fx.holdingId===c.holdingId))return null;const p=capSpot(t);
      return <OnGround key={'cap'+c.holdingId} x={p.x} z={p.z}><Marker due={c.due} pop={fx&&fx.kind==='bury'&&fx.holdingId===c.holdingId?{t0:fx.t0,len:fx.len}:null} onPick={()=>world.onCapsule(c.holdingId)}/></OnGround>})}
    {world.capsuleFx&&(()=>{const fx=world.capsuleFx,t=trees.find(x=>x.h.id===fx.holdingId);if(!t)return null;const p=capSpot(t);
      return <OnGround key={'fx'+fx.t0} x={p.x} z={p.z}><CapsuleFx kind={fx.kind} t0={fx.t0} len={fx.len}/></OnGround>})()}
    {cut&&<CutAway key={cut.c.t0} pos={cut.base} quat={cut.quat} roots={cut.c.roots} seed={cut.c.holdingId} t0={cut.c.t0} closing={cut.c.closing}/>}
    {DECO_TREES.map(([k,x,z,sc],i)=>k==='c'?<Cypress key={i} x={x} z={z} s={sc}/>:<RoundTree key={i} x={x} z={z} s={sc}/>)}
    {weather!=='storm'&&<Butterflies count={weather==='cloudy'?5:14}/>}
    <WeatherFx weather={weather} center={pos} hemi={hemi}/>
    <OnGround x={SPOTS.signpost.x} z={SPOTS.signpost.z} rot={SPOTS.signpost.rot}><Signpost hitRate={world.hitRate} onPick={()=>world.onLandmark('signpost')}/></OnGround>
    {/* 피드백 2026-11-23: the shop cart became the building shop's house (Shop3D.tsx, drawn with the others below) */}
    <VillageLamps night={world.light.night}/><Stream dim={world.light.night*0.85}/><Bridge/><Paths/><Forest/>
    {/* 피드백 2026-11-22: the library (사서 and the bookshelf) moved into the house */}
    {false&&<Library open={world.caseOpen} onPick={()=>world.onLandmark('library')}/>}
    <Suspense fallback={null}><MasterHouse night={world.light.night} onPick={()=>world.onLandmark('master')}/></Suspense>
    <Suspense fallback={null}><ArcadeHouse night={world.light.night} onPick={()=>world.onLandmark('arcade')}/></Suspense>
    <Fields land={world.build?.built.land??[]} mode={!!world.build?.mode} onLot={world.build?.onLot}/>
    {world.build?.mode&&<BuildingLots built={world.build.built} onLot={world.build.onLot}/>}
    {world.build&&<Buildings built={world.build.built}/>}
    {world.build&&<Landmarks built={world.build.built} onPick={id=>world.build!.onLot('city:'+id)}/>}
    {world.villagers&&<><NewsBoard x={NEWS_BOARD.x} z={NEWS_BOARD.z} rot={NEWS_BOARD.rot} onPick={()=>world.onNews?.()}/>
      {SHOP_IDS.map(id=><ShopHouse key={id} id={id} x={SHOP_AT[id].x} z={SHOP_AT[id].z} rot={SHOP_AT[id].rot} onPick={()=>world.onShop?.(id)}/>)}
      <MerchantStall x={MERCHANT_STALL.x} z={MERCHANT_STALL.z} rot={MERCHANT_STALL.rot} open={!!world.merchantOpen}/><FarmCart x={FARM_CART.x} z={FARM_CART.z} rot={FARM_CART.rot} pile={world.cartPile??0}/></>}
    {(world.lead||world.guide)&&<GuideTrail from={pos} to={world.lead?.to??world.guide!}/>}
    {world.lead&&<LeadMark to={world.lead.mark??world.lead.to}/>}
    <Plaza flags={world.flags} me={world.myFlag} onPick={()=>world.onLandmark('plaza')}/>
    {world.pots.map(p=>{const t=trees.find(x=>x.h.id===p.holdingId);return t&&<OnGround key={p.holdingId} x={t.x-0.85} z={t.z+0.55}><Pot open={p.open} flowers={p.flowers}/></OnGround>})}
    {world.burst&&(()=>{const b=world.burst,t=trees.find(x=>x.h.id===b.holdingId);return t&&<Burst key={b.stamp} x={t.x} z={t.z} hit={b.hit} stamp={b.stamp}/>})()}
    {world.decor.map(d=>{const sl=DECOR_SLOTS.find(x=>x.id===d.slot&&!x.room);return sl&&<OnGround key={d.slot} x={sl.x} z={sl.z} rot={sl.rot}><Decor shape={d.shape}/></OnGround>})}
    <Suspense fallback={null}>
      {world.analysts.filter(a=>!a.home).map(a=><Analyst key={a.id} id={a.id} to={spotFor(a.id,a.at,a.near,a.spot)} act={a.talking?undefined:a.at===null&&a.spot?a.spot.act:a.at!==null&&!a.near?'look':undefined} faceTo={a.talking?undefined:a.at===null&&a.spot?a.spot.face:undefined} from={world.enterFrom} face={pos} surface={surfaceY} tilt={tiltAt} bubble={a.bubble}
        onPick={()=>world.onAnalyst(a.id)} report={reportAnalyst}/>)}
      {world.naru&&<Analyst key="naru" id="naru" to={world.naru.at} act="look" from={null} face={pos} surface={surfaceY} tilt={tiltAt} bubble={null} onPick={world.naru.onPick} report={reportFriend}/>}
      {(world.villagers??[]).map(v=><Villager key={v.id} id={v.id} x={v.x} z={v.z} face={v.face} look={v.look} hl={v.hl} talking={v.talking} away={v.away} errand={v.errand} onErrandDone={v.onErrandDone} routine={v.routine} player={pos} onPick={v.onPick} report={reportPoint}/>)}
      {world.fishing&&<Bobber x={world.fishing.x} z={world.fishing.z} bite={world.fishing.phase==='bite'}/>}
      {world.friend&&<Analyst key="bori" id="bori" to={world.friend.at} act="look" mood={world.friend.face} from={world.enterFrom} face={pos} surface={surfaceY} tilt={tiltAt} bubble={null} onPick={world.friend.onPick} report={reportFriend}/>}
    </Suspense>
    {/* out of the way while the camera looks into the open ground */}
    <Keys pos={pos} target={target} stops={stops} onMove={()=>onPick(null)} gate={(x,z)=>{const ok=onWay(x,z);if(!ok)off();return ok}} enabled={!world.inside&&!world.shop&&!world.stage&&!world.sky&&!cut&&!world.capsuleFx}/>
    <Player sit={sit} faceTo={world.talk?.eye?{x:world.talk.eye.ax,z:world.talk.eye.az}:null} onPick={world.onPlayer} walls={walls} look={world.look} target={target} stops={stops} pos={pos} hidden={(!!cut&&!cut.c.closing)||!!world.capsuleFx||(!!world.fp&&!focusPos)||!!world.talk?.eye}/>
    {!world.sky&&<FollowCam pos={pos} recenter={recenter} focus={focusPos} orbit={orbit} near={!!world.capsuleFx} aim={world.view?.az??null} low={cut&&!cut.c.closing?cut.yaw:null} fp={!!world.fp} talk={world.talk&&!world.talk.eye?{az:world.talk.az,pitch:world.talk.pitch,dist:world.talk.dist}:null} eye={world.talk?.eye??null}/>}
    </group>}
    <Hooks pos={pos} treePos={treePos} points={points}/>

    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={LOOK.post.bloom.threshold} luminanceSmoothing={LOOK.post.bloom.smoothing} intensity={LOOK.post.bloom.intensity} radius={LOOK.post.bloom.radius}/>
      <TiltShift2 blur={world.stage||world.sky?0:world.inside||world.shop?blur*0.35:blur} taper={LOOK.post.tiltShift.taper}/>
      {/* grain before the saturation boost: a boosted bright yellow goes below zero in blue, and soft light on a
          value below zero is NaN, which showed as black blots (hard hat, campfire, counter top) */}
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={LOOK.post.grain.opacity}/>
      <HueSaturation saturation={wl.saturation}/>
      <Vignette offset={LOOK.post.vignette.offset} darkness={LOOK.post.vignette.darkness}/>
    </EffectComposer>
  </>;
}

// a decor flower bed or tree from the 꽃집, standing on the ground where it was planted (a slow sway like the others)
// 피드백 11-26: the plant about to go in, see-through, with a green (fits) or red (not here) ring round it
function PlantGhost({item,scale,at}:{item:string;scale:number;at:{x:number;z:number;ok:boolean}}){
  const g=useRef<THREE.Group>(null);
  useFrame(()=>{g.current?.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh||m.userData.ghost)return;m.userData.ghost=true;
    const c=(m.material as THREE.Material).clone();c.transparent=true;c.opacity=0.5;c.depthWrite=false;m.material=c;m.castShadow=false;m.raycast=()=>{}})});
  return <group name="plant-ghost">
    <group ref={g}><DecorPlant item={item} x={at.x} z={at.z} scale={scale}/></group>
    <OnGround x={at.x} z={at.z}><mesh rotation-x={-Math.PI/2} position-y={0.05} raycast={()=>null}><ringGeometry args={[0.55*scale,0.75*scale,36]}/>
      <meshBasicMaterial color={at.ok?'#5fd17a':'#ff6b6b'} transparent opacity={0.85} depthWrite={false}/></mesh></OnGround></group>;
}

function DecorPlant({item,x,z,scale}:{item:string;x:number;z:number;scale:number}){
  const {scene}=useGLTF(MODELS.decor(item));
  // 피드백 2026-11-23 (그늘에서 검게): the plants wear the shared soft material too, so a flower seen from below (the big
  // sunflowers' dark hearts) is shaded like everything else instead of going black; the hearts a shade lighter
  const obj=useMemo(()=>{const r=scene.clone(true);r.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
    const src=m.material as THREE.MeshStandardMaterial,n=(src.name||'').replace(/\.\d+$/,'');const hex='#'+src.color.getHexString(THREE.SRGBColorSpace);
    m.material=soft(n.startsWith('heart_#5a3a1e')?'#9a6a3a':hex,{side:THREE.DoubleSide})}});return r},[scene]);
  const yaw=useMemo(()=>((x*928.37+z*311.1)%(Math.PI*2)),[x,z]);
  return <group position={[x,surfaceY(x,z),z]} rotation-y={yaw} scale={LOOK.holdingTreeScale*scale} name={`decor-${item}`}><primitive object={obj}/></group>;
}

// the float on the pond while fishing with 나루: it bobs, and when a fish bites it is pulled under with a splash ring
function Bobber({x,z,bite}:{x:number;z:number;bite:boolean}){
  const g=useRef<THREE.Group>(null),ring=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{const t=clock.elapsedTime;if(g.current)g.current.position.y=bite?-0.09+Math.sin(t*30)*0.015:Math.sin(t*2.4)*0.025;
    if(ring.current){const k=bite?(t*2.2)%1:(t*0.8)%1;ring.current.scale.setScalar(0.4+k*(bite?1.6:1));(ring.current.material as THREE.MeshBasicMaterial).opacity=(1-k)*(bite?0.9:0.45)}});
  return <OnGround x={x} z={z} lift={0.2}>
    <group ref={g} name="bobber">
      <mesh position-y={0.07}><sphereGeometry args={[0.09,16,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#e2566b"/></mesh>
      <mesh position-y={0.07} rotation-x={Math.PI}><sphereGeometry args={[0.09,16,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#ffffff"/></mesh>
      <mesh position-y={0.19}><cylinderGeometry args={[0.01,0.01,0.12,6]}/><meshStandardMaterial color="#22281f"/></mesh>
    </group>
    <mesh ref={ring} rotation-x={-Math.PI/2} position-y={0.02}><ringGeometry args={[0.32,0.36,40]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.4}/></mesh>
  </OnGround>;
}

