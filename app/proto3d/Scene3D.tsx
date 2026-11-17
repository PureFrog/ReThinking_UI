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
import {Observatory,Signpost,Cart,Pot,Decor} from './Garden3D';
import {Fields,BuildingLots,Buildings,Landmarks} from './Build3D';
import {LANDS,BUILDINGS,CITIES,BASE_LAND,ALL_PLOTS,type Built} from '../core/land';
import {tooClose} from '../core/plants';
import {DECOR_SLOTS,type Shape} from '../content/garden-items';
import type {AnalystId} from '../content/analysts';
import {LOOK} from './look';
import {soft} from './materials';
import {MODELS,ALL_TREE_FILES,CANOPY,BARK,STUMP_CUT,FRUIT,FRUIT_FALLEN} from './models';
import {OnGround,surfaceY,tiltAt,rng,UP} from './ground';
import {PLOTS,PATHS,PLACES,place,inStream,route,WORLD,solids,pushOut,type Solid} from './places';
import {spread,spreadXZ} from '../core/world';
import {SIGN_PLACES,SIGN_BUILDINGS,SIGN_CITY} from './ui/Signs';
import {Stream,Bridge,Paths,Forest,Library,Plaza} from './World3D';
import {Interior,type Book,type Note} from './Interior3D';
import {Explorer} from './Explorer3D';
import {mixHex,type Daylight} from '../core/daylight';
import {Showroom} from './Showroom3D';
import {SkyScene,type SkyWorld} from './Sky3D';
import type {Look} from '../core/wardrobe';

// The ground (a big sphere's top) is ground.tsx; where everything is, places.ts.
const SPEED=LOOK.walk.speed;// player walking speed, units per second (look.ts walk)
const PLAYER_START=new THREE.Vector3(0,0,2.5);
export {surfaceY};

type Hooks={frames:number;ready:boolean;player:{x:number;z:number};trees:Record<number,{x:number;y:number}>;softMeshes:number;meshes:number;treeModels:number;fruit?:number;weather?:Weather;points:Record<string,{x:number;y:number}>;camera?:{fov:number;dist:number;turn:number;pitch:number;blur:number;lead:number};burst?:{holdingId:number;hit:boolean};births?:{active:boolean;stage:string;long:boolean;n:number;ms:number};cutaway?:{open:boolean;holdingId:number|null;roots:Roots|null};inside?:boolean;stage?:boolean;capsules?:{holdingId:number;due:boolean}[];capsuleFx?:{kind:string;holdingId:number}|null};
declare global{interface Window{__proto3d?:Hooks&{friendAt?:{x:number;z:number};view?:{fp:boolean;eyeGap:number;follow:number}}}}
// the overlay may write its own entries (births, lapse) first: fill in whatever the scene needs that is missing
const testHooks=()=>{const h=(window.__proto3d??={} as Hooks);h.frames??=0;h.ready??=false;h.player??={x:0,z:0};h.trees??={};h.softMeshes??=0;h.meshes??=0;h.treeModels??=0;h.points??={};return h};


// the garden's own trees, kept off every plot, building lot and landmark place (core/land.ts), open or not
const DECO_TREES=([['c',-3,-8.5,1.1],['c',-3.6,-11.2,1],['c',5.5,-8.8,1.2],['c',9.2,-6.2,1],['c',-6.2,-14.5,1.2],['c',5.8,-17,1.1],['c',-4,-18.2,1],['c',-10.6,-3,0.9],
  ['r',5,-10.4,1.1],['r',-7.6,-6.4,1],['r',17.4,-5.2,0.9],['r',16.6,8.2,1.1],['r',-14,-10,1.2],['r',7,-13.5,1],['r',-11,4,0.8]] as ['c'|'r',number,number,number][]).map(([k,x,z,sc])=>[k,...spread(x,z),sc] as ['c'|'r',number,number,number])
  .filter(([,x,z])=>!ALL_PLOTS.some(p=>Math.hypot(p[0]-x,p[1]-z)<2.4)&&!BUILDINGS.some(b=>Math.hypot(b.at[0]-x,b.at[1]-z)<2.8)&&!CITIES.some(c=>Math.hypot(c.at[0]-x,c.at[1]-z)<4));
const POND:[number,number,number][]=([[0.2,7.6,1.8],[2,8.1,1.4],[-1.6,8.3,1.3],[0.9,9.3,1.3],[-0.5,6.5,1]] as [number,number,number][]).map(([x,z,r])=>[...spread(x,z),r]);
const inPond=(x:number,z:number,pad=0)=>POND.some(([px,pz,r])=>Math.hypot(x-px,z-pz)<r+pad);
const HOUSE=place('home');
const FIRE=spread(-1.6,-1.2);
const ROCKS=([[-6.4,3.2,1.1,0.4],[-5,4.4,0.7,0],[-7.2,4.6,0.55,0],[8.4,6,0.9,0],[3.4,5.2,0.5,0]] as number[][]).map(([x,z,sc,rot])=>[...spread(x,z),sc,rot]);
const FARM=PLOTS;
// landmarks (R4–R6, Garden3D.tsx; World3D.tsx) and where grass tufts and flowers keep away from
const SPOTS={observatory:place('observatory'),signpost:spreadXZ({x:-1.9,z:3.5,rot:0.35}),cart:place('cart')};
const LIB=place('library'),PLAZA=place('plaza');
const KEEP_CLEAR:[number,number,number][]=[[SPOTS.observatory.x,SPOTS.observatory.z,2.2],[SPOTS.cart.x,SPOTS.cart.z,1.3],[SPOTS.signpost.x,SPOTS.signpost.z,0.6],[LIB.x,LIB.z,3.6],[PLAZA.x,PLAZA.z,3.8],...DECOR_SLOTS.filter(d=>!d.room).map(d=>[d.x,d.z,0.8] as [number,number,number]),
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
function Ground({onWalk}:{onWalk:(p:THREE.Vector3)=>void}){
  const click=(e:ThreeEvent<MouseEvent>)=>{if(e.delta>6)return;onWalk(e.point)};
  const geo=useMemo(groundGeometry,[]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return (
    <mesh position={[0,-WORLD.R,0]} receiveShadow onClick={click} geometry={geo}>
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
  return <>{POND.map(([x,z,r],i)=>(
    // rim pieces sit low and water pieces well above them, so neighbouring tilted discs never cut into each other
    <OnGround key={i} x={x} z={z} lift={0.03}>
      <mesh rotation-x={-Math.PI/2} receiveShadow><circleGeometry args={[r+0.3,40]}/><meshBasicMaterial color={mixHex('#a8e4ec','#3d5a72',dim)}/></mesh>
      <mesh rotation-x={-Math.PI/2} position-y={0.12}><circleGeometry args={[r,40]}/><meshBasicMaterial color={mixHex('#2c86d6','#13284a',dim)}/></mesh>
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

// the house: tapping it (or its door) goes inside (Interior3D.tsx)
function House({onEnter,night}:{onEnter:()=>void;night:number}){
  const enter=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onEnter()};
  return <OnGround x={HOUSE.x} z={HOUSE.z} rot={HOUSE.rot}><group onClick={enter} name="house">
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
      <mesh key={i} position={[x,y,z]} rotation-y={Math.atan2(x,z)}><circleGeometry args={[r,24]}/><meshStandardMaterial color="#ffb24a" emissive="#ff9a2e" emissiveIntensity={1.6+LOOK.daylight.windows*night} toneMapped={false}/></mesh>))}
    {/* speckles */}
    {Array.from({length:14},(_,i)=>{const a=i*2.39,y=1+((i*37)%25)/10;const rr=2.25*Math.sqrt(Math.max(0.05,1-((y-1.9)/2.7)**2));
      return <mesh key={'d'+i} position={[Math.sin(a)*rr*1.0,y,Math.cos(a)*rr*0.96]} scale={0.07+((i*13)%5)/60}><sphereGeometry args={[1,8,6]}/><primitive object={soft('#b9a999')} attach="material"/></mesh>})}
  </group></OnGround>;
}

function Campfire(){
  const flame=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{const f=flame.current;if(!f)return;const t=clock.elapsedTime;f.scale.set(1+Math.sin(t*9)*0.08,1+Math.sin(t*13)*0.15,1+Math.cos(t*7)*0.08)});
  return <OnGround x={FIRE[0]} z={FIRE[1]}>
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
function HoldingTree({id,x,z,picked,onPick,onDeep,growth,condition,onTop,wind,born,cut}:{id:number;x:number;z:number;picked:boolean;onPick:(id:number)=>void;onDeep:(id:number)=>void;growth:Growth;condition:Condition;onTop:(y:number)=>void;wind:number;born:Born|null;cut:boolean}){
  const group=useRef<THREE.Group>(null),mound=useRef<THREE.Mesh>(null),[h,setH]=useState(2);
  const [dressed,setDressed]=useState(!born);
  useEffect(()=>{if(born)setDressed(false)},[born]);
  const shown:Condition=dressed||condition==='dead'?condition:'well';
  const lean=dressed?CANOPY[condition].droop:0;
  useFrame(({clock})=>{const g=group.current;if(!g)return;const t=clock.elapsedTime;
    if(born){const b=treeAt(born.plan,born.i,performance.now()-born.t0),s=growScale(b.phase,b.k);
      g.scale.setScalar(LOOK.holdingTreeScale*s);g.visible=s>0;
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
    <group ref={group} onClick={click} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} name={`tree-${id}`} position-y={0.12} scale={LOOK.holdingTreeScale}>
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
function Keys({pos,target,stops,onMove,enabled}:{pos:React.MutableRefObject<THREE.Vector3>;target:React.MutableRefObject<THREE.Vector3>;stops:React.MutableRefObject<{x:number;z:number}[]>;onMove:()=>void;enabled:boolean}){
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
      if(Math.hypot(nx,nz)<WORLD.walk&&!inPond(nx,nz,0.2)){target.current.set(nx,0,nz);stops.current=[];onMove()}}
    if(controls){const c=controls.target,turn=(h.has('KeyE')?1:0)-(h.has('KeyQ')?1:0),zoom=(h.has('Minus')||h.has('NumpadSubtract')?1:0)-(h.has('Equal')||h.has('NumpadAdd')?1:0);
      if(turn){v.subVectors(camera.position,c).applyAxisAngle(THREE.Object3D.DEFAULT_UP,turn*LOOK.camera.keyTurn*t);camera.position.copy(c).add(v)}
      if(zoom){v.subVectors(camera.position,c);const d=THREE.MathUtils.clamp(v.length()*(1+zoom*LOOK.camera.keyZoom*t),LOOK.camera.minDist,LOOK.camera.maxDist);camera.position.copy(c).add(v.setLength(d))}
      if(turn||zoom)controls.update()}});
  return null;
}

// the player: my observer as I dressed it (Explorer3D.tsx, core/wardrobe.ts), walking where I tap
function Player({target,stops,pos,hidden,look,walls}:{target:React.MutableRefObject<THREE.Vector3>;stops:React.MutableRefObject<{x:number;z:number}[]>;pos:React.MutableRefObject<THREE.Vector3>;hidden?:boolean;look:Look;walls:Solid[]}){
  const g=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),moving=useRef(false),speed=useRef(0);
  useFrame((_,dt)=>{const p=pos.current,tg=target.current,gr=g.current,b=body.current;if(!gr||!b)return;const t=Math.min(dt,0.25)/* by time: a slow phone walks as fast */;
    const dx=tg.x-p.x,dz=tg.z-p.z,d=Math.hypot(dx,dz);moving.current=d>0.05;
    // speeds up from a stand, slows down over the last stretch, turns toward where it goes instead of snapping
    const want=moving.current?SPEED*Math.min(1,d/LOOK.walk.brake+0.25):0;speed.current+=(want-speed.current)*Math.min(1,LOOK.walk.accel*t);
    if(moving.current){const step=Math.min(d,speed.current*t);p.x+=dx/d*step;p.z+=dz/d*step;
      // buildings are solid: slide along their edge; a target inside one ends at its edge
      if(pushOut(p,walls)){const q={x:tg.x,z:tg.z};if(pushOut(q,walls))tg.set(q.x,0,q.z)}
      const yaw=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(yaw-b.rotation.y),Math.cos(yaw-b.rotation.y));b.rotation.y+=diff*Math.min(1,LOOK.walk.turn*t)}
    else if(stops.current.length){const n=stops.current.shift()!;tg.set(n.x,0,n.z)}
    gr.position.set(p.x,surfaceY(p.x,p.z),p.z);gr.quaternion.copy(tiltAt(p.x,p.z))});
  return <group ref={g} visible={!hidden}><group ref={body} scale={LOOK.explorer.scale}>
    <Suspense fallback={null}><Explorer look={look} moving={moving}/></Suspense>
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
function FollowCam({pos,recenter,focus,orbit,low,near,aim,fp=false,talk=null}:{pos:React.MutableRefObject<THREE.Vector3>;recenter:number;focus:THREE.Vector3|null;orbit:Orbit|null;low:number|null;near:boolean;aim?:number|null;fp?:boolean;talk?:number|null}){
  const shift=useRef({x:0,y:0}),back=useRef(false),lean=useMemo(()=>new THREE.Vector3(),[]),side=useMemo(()=>new THREE.Vector3(),[]),tv=useRef({x:0,y:0});
  const ctl=useRef<OrbitControlsImpl>(null),{camera,size}=useThree(),fpWas=useRef(false);
  const prev=useMemo(()=>new THREE.Vector3(),[]),want=useMemo(()=>new THREE.Vector3(),[]),fwd=useMemo(()=>new THREE.Vector3(),[]);
  const fr=frameFor(LOOK.camera.frames,size.width/Math.max(1,size.height));
  useEffect(()=>{const c=ctl.current,cam=camera as THREE.PerspectiveCamera;if(!c)return;cam.fov=fr.fov;cam.updateProjectionMatrix();
    cam.position.copy(c.target).addScaledVector(camDir(fr.turn,fr.pitch),fr.dist);c.update();testHooks().camera=fr},[fr.fov,fr.dist,fr.turn,fr.pitch,camera]);
  useEffect(()=>{const c=ctl.current;if(!c||recenter===0)return;c.target.copy(pos.current);camera.position.copy(pos.current).addScaledVector(camDir(fr.turn,fr.pitch),fr.dist);c.update()},[recenter,camera,pos]);// eslint-disable-line react-hooks/exhaustive-deps
  // eased by time, not by frame: a slow phone gets there as fast as a quick one
  useFrame((_,dt)=>{const c=ctl.current;if(!c)return;const ease=(r:number)=>1-Math.exp(-Math.min(dt,0.5)*r);
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
      :talk!=null?{az:talk,pitch:LOOK.camera.talk.pitch,dist:LOOK.camera.talk.dist}
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
    camera.position.add(lean);camera.lookAt(c.target);
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
    h.trees={};for(const t of treePos){v.copy(t.v).project(camera);const pt={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height};h.trees[t.id]=pt;screenPoints.set('tree-'+t.id,{...pt,visible:v.z<1})}
    for(const [k,p] of points){v.copy(p).project(camera);const pt={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height};h.points[k]=pt;screenPoints.set(k,{...pt,visible:v.z<1})}});
  return null;
}

// What the overlay tells the world (Proto3D.tsx): where each analyst should be and what their bubble says, cooldown pots,
// placed items, and what the landmarks show.
export type Landmark='observatory'|'signpost'|'cart'|'library'|'plaza'|'house';
export type World={
  // 보리, the friend who comes over to talk (core/friend.ts): where it waits and what a tap does; null keeps it home
  friend?:{at:{x:number;z:number};onPick:()=>void;face?:string}|null;
  // 부지·건물·랜드마크 (core/land.ts): what is built, whether 넓히기 mode shows the closed lots, and what a tap on one does
  // (key 'land:<id>' | 'building:<id>' | 'city:<id>')
  build?:{built:Built;mode:boolean;onLot:(key:string)=>void}|null;
  // at: the tree they stand at (a signal) · near: luon waiting by that tree's capsule marker · spot: where their day has
  // them (core/routine.ts), facing `face`, doing `act` · home: indoors (not drawn out here)
  analysts:{id:AnalystId;at:number|null;near?:boolean;spot?:{x:number;z:number;face:number;act:string}|null;home?:boolean;bubble:{text:string;alert:boolean}|null}[];
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
  planting?:{item:string}|null;onPlant?:(x:number,z:number,why:string|null)=>void;
  // 보리 came over to talk: the camera frames the point between it and the player (LOOK.camera.talk)
  talk?:{x:number;z:number;az:number}|null;
  // inside the house (Interior3D.tsx): the garden is put away and the workroom drawn instead
  // my observer: how it is dressed (core/wardrobe.ts), and whether its stage (ui/MyPage.tsx) is open instead of the garden
  look:Look;stage:boolean;
  // 다른 정원들: the sky of planets replaces the garden while it is open (ui/SkyView.tsx)
  sky:SkyWorld|null;
  // the time of day (core/daylight.ts): how light, how warm, how dark
  light:Daylight;
  inside:boolean;room:{books:Book[];notes:Note[];resting:AnalystId[];onDesk:()=>void;onShelf:()=>void;onBoard:()=>void;onDoor:()=>void};
};
export default function Scene3D({holdings,picked,onPick,recenter,weather,world}:{holdings:Holding[];picked:number|null;onPick:(id:number|null)=>void;recenter:number;weather:Weather;world:World}){
  const wl=LOOK.weather[weather],hemi=useRef<THREE.HemisphereLight>(null);
  const {size,camera}=useThree(),blur=frameFor(LOOK.camera.frames,size.width/Math.max(1,size.height)).blur;
  useEffect(()=>{testHooks().weather=weather},[weather]);
  useEffect(()=>{if(world.burst)testHooks().burst={holdingId:world.burst.holdingId,hit:world.burst.hit}},[world.burst]);
  const sun=useRef<THREE.DirectionalLight>(null);
  const pos=useRef(PLAYER_START.clone()),target=useRef(PLAYER_START.clone()),stops=useRef<{x:number;z:number}[]>([]);
  // the map (ui/MapSheet.tsx) sends the player to a place
  useEffect(()=>{if(!world.goTo)return;const r=route(pos.current,world.goTo,(x,z)=>inPond(x,z,0.2));if(!r)return;const [first,...rest]=r;target.current.set(first.x,0,first.z);stops.current=rest},[world.goTo]);
  // each holding grows on its own plot (app/core/portfolio.ts gives every new tree an empty one)
  const trees=useMemo(()=>holdings.filter(h=>h.plot>=0&&h.plot<FARM.length).map(h=>({h,st:treeState(h,defaultRules),x:FARM[h.plot][0],z:FARM[h.plot][1]})),[holdings]);
  const points=useMemo(()=>{const m=new Map<string,THREE.Vector3>();for(const [k,p] of Object.entries(SPOTS))m.set(k,new THREE.Vector3(p.x,surfaceY(p.x,p.z)+1.2,p.z));
    // the house, the library and the square: points to tap (e2e) and to pin tags to
    for(const [k,p,y] of [['house',HOUSE,1.6],['library',LIB,1.6],['plaza',PLAZA,1.3]] as const)m.set(k,new THREE.Vector3(p.x,surfaceY(p.x,p.z)+y,p.z));return m},[]);
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
  const focusPos=useMemo(()=>{if(cut&&!cut.c.closing)return cut.look;if(world.talk)return new THREE.Vector3(world.talk.x,surfaceY(world.talk.x,world.talk.z)+LOOK.camera.talk.lift,world.talk.z);const t=trees.find(x=>x.h.id===world.focus);if(t)return new THREE.Vector3(t.x,surfaceY(t.x,t.z)+1.2,t.z);
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
  const reportFriend=useCallback((id:string,v:THREE.Vector3)=>{(testHooks() as {friendAt?:{x:number;z:number}}).friendAt={x:v.x,z:v.z};for(const [k,dy] of [['friend-'+id,-1.2],['bubble-'+id,0.55]] as const){let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v).y+=dy}},[points]);
  const reportAnalyst=useCallback((id:string,v:THREE.Vector3)=>{for(const [k,dy] of [['analyst-'+id,-1.2],['bubble-'+id,0.55]] as const){let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v).y+=dy}},[points]);
  // an analyst with a flag stands in front of that tree, a little to one side (so two on one tree do not overlap)
  const spotFor=(id:AnalystId,at:number|null,near?:boolean,spot?:{x:number;z:number}|null)=>{const t=at===null?null:trees.find(x=>x.h.id===at);
    if(!t)return spot??IDLE[id];const side=id==='moa'?-1:1;
    if(near){const c=capSpot(t);return {x:c.x+0.9,z:c.z+0.5}}
    if(cut&&cut.t===t){const lx=side*(LOOK.roots.width+0.65),lz=0.6,c=Math.cos(cut.yaw),s=Math.sin(cut.yaw);return {x:t.x+lx*c+lz*s,z:t.z-lx*s+lz*c}}
    return {x:t.x+side*1.05,z:t.z+1.15}};
  // e2e: plant at a ground point as a tap there would (only while the 꽃집 waits for a spot); how many decor stand
  useEffect(()=>{const h=testHooks() as {plantAt?:(x:number,z:number)=>string|null;decor?:number};h.decor=(world.plants??[]).length;
    h.plantAt=(x,z)=>{if(!world.planting||!world.onPlant)return 'not planting';const why=plantBlock(x,z)||(tooClose(world.plants??[],x,z)?'다른 꽃·나무랑 너무 가까워요':null);world.onPlant(x,z,why);return why}});
  const walk=(p:THREE.Vector3)=>{if(world.planting&&world.onPlant){world.onPlant(p.x,p.z,plantBlock(p.x,p.z)||(tooClose(world.plants??[],p.x,p.z)?'다른 꽃·나무랑 너무 가까워요':null));return}const r=route(pos.current,p,(x,z)=>inPond(x,z,0.2));if(!r)return;const [first,...rest]=r;target.current.set(first.x,0,first.z);stops.current=rest;onPick(null)};
  const reportPoint=useCallback((k:string,v:THREE.Vector3)=>{let p=points.get(k);if(!p){p=new THREE.Vector3();points.set(k,p)}p.copy(v)},[points]);
  useEffect(()=>{testHooks().inside=world.inside;testHooks().stage=world.stage},[world.inside,world.stage]);
  // 넓히기 mode: where each closed lot's tag sits (ui/BuildMode.tsx), and the landmarks' (always, for their name tags)
  const bm=world.build?.mode,bl=world.build?.built;
  const walls=useMemo(()=>solids(bl),[bl]);
  // name signs above the buildings (ui/Signs.tsx)
  useEffect(()=>{for(const k of [...points.keys()])if(k.startsWith('sign-'))points.delete(k);
    const put=(k:string,x:number,z:number,y:number)=>points.set('sign-'+k,new THREE.Vector3(x,surfaceY(x,z)+y,z));
    for(const p of PLACES)if(p.id in SIGN_PLACES)put(p.id,p.x,p.z,SIGN_PLACES[p.id]);
    for(const b of BUILDINGS)if(bl?.buildings.includes(b.id))put(b.id,b.at[0],b.at[1],SIGN_BUILDINGS[b.id]??4);
    for(const c of CITIES)if(bl?.cities.includes(c.id))put('city-'+c.id,c.at[0],c.at[1],SIGN_CITY)},[bl,points]);
  useEffect(()=>{for(const k of [...points.keys()])if(k.startsWith('lot-')||k.startsWith('city-'))points.delete(k);if(!bl)return;
    const put=(k:string,x:number,z:number,y:number)=>points.set(k,new THREE.Vector3(x,surfaceY(x,z)+y,z));
    for(const c of CITIES)put('city-'+c.id,c.at[0],c.at[1],bl.cities.includes(c.id)?6.4:1.2);
    if(!bm)return;
    for(const l of LANDS)if(!BASE_LAND.includes(l.id)&&!bl.land.includes(l.id))put('lot-land:'+l.id,l.at[0],l.at[1],1.4);
    for(const b of BUILDINGS)if(!bl.buildings.includes(b.id))put('lot-building:'+b.id,b.at[0],b.at[1],1.4)},[bm,bl,points]);
  return <>
    {!world.inside&&!world.stage&&!world.sky&&<fog attach="fog" args={[mixHex(wl.fog,LOOK.daylight.nightFog,world.light.night*0.85),LOOK.fog.near,LOOK.fog.far]}/>}
    <hemisphereLight ref={hemi} args={[LOOK.hemi.sky,LOOK.hemi.ground,LOOK.hemi.intensity*wl.hemi*(LOOK.daylight.floor+(1-LOOK.daylight.floor)*world.light.day)]}/>
    <SunFollow pos={pos} sun={sun}/>
    <directionalLight ref={sun} position={LOOK.sun.position} intensity={wl.sun.intensity*Math.max(0.08,world.light.day)} color={mixHex(wl.sun.color,LOOK.daylight.lowSun,world.light.warm)} castShadow
      shadow-mapSize={[LOOK.shadow.mapSize,LOOK.shadow.mapSize]} shadow-radius={LOOK.shadow.radius} shadow-bias={-0.0004} shadow-normalBias={0.04}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={50}/>

    {world.sky?<SkyScene sky={world.sky}/>:world.stage?<Showroom look={world.look}/>:world.inside?<Interior books={world.room.books} notes={world.room.notes} resting={world.room.resting} decor={world.decor}
      onDesk={world.room.onDesk} onShelf={world.room.onShelf} onBoard={world.room.onBoard} onDoor={world.room.onDoor} onAnalyst={world.onAnalyst}
      report={reportPoint} reportAnalyst={reportAnalyst}/>:<>
    <Ground onWalk={walk}/>
    {(world.plants??[]).map(p=><Suspense key={p.id} fallback={null}><DecorPlant item={p.item} x={p.x} z={p.z} scale={p.scale}/></Suspense>)}
    <Tufts/>
    <Pond dim={world.light.night*0.85}/>
    <Flowers/>
    <House night={world.light.night} onEnter={()=>world.onLandmark('house')}/>
    <Campfire/>
    {ROCKS.map(([x,z,sc,rot],i)=><Rock key={i} x={x} z={z} s={sc} rot={rot}/>)}
    {trees.map((t,i)=>{const b=world.birth,k=b?b.ids.indexOf(t.h.id):-1;return <HoldingTree key={t.h.id} id={t.h.id} x={t.x} z={t.z} growth={t.st.growth} condition={t.st.condition} picked={picked===t.h.id} onPick={id=>onPick(id)} onTop={onTops[i]} wind={wl.wind}
      born={b&&k>=0?bornOf(b,k):null} onDeep={world.onDeep} cut={!!cut&&cut.t===t}/>})}
    {world.capsules.map(c=>{const t=trees.find(x=>x.h.id===c.holdingId),fx=world.capsuleFx;if(!t||(fx&&fx.kind==='dig'&&fx.holdingId===c.holdingId))return null;const p=capSpot(t);
      return <OnGround key={'cap'+c.holdingId} x={p.x} z={p.z}><Marker due={c.due} pop={fx&&fx.kind==='bury'&&fx.holdingId===c.holdingId?{t0:fx.t0,len:fx.len}:null} onPick={()=>world.onCapsule(c.holdingId)}/></OnGround>})}
    {world.capsuleFx&&(()=>{const fx=world.capsuleFx,t=trees.find(x=>x.h.id===fx.holdingId);if(!t)return null;const p=capSpot(t);
      return <OnGround key={'fx'+fx.t0} x={p.x} z={p.z}><CapsuleFx kind={fx.kind} t0={fx.t0} len={fx.len}/></OnGround>})()}
    {cut&&<CutAway key={cut.c.t0} pos={cut.base} quat={cut.quat} roots={cut.c.roots} seed={cut.c.holdingId} t0={cut.c.t0} closing={cut.c.closing}/>}
    {DECO_TREES.map(([k,x,z,sc],i)=>k==='c'?<Cypress key={i} x={x} z={z} s={sc}/>:<RoundTree key={i} x={x} z={z} s={sc}/>)}
    {weather!=='storm'&&<Butterflies count={weather==='cloudy'?5:14}/>}
    <WeatherFx weather={weather} center={pos} hemi={hemi}/>
    <OnGround x={SPOTS.observatory.x} z={SPOTS.observatory.z} rot={SPOTS.observatory.rot}><Observatory lit={world.gameLit} onPick={()=>world.onLandmark('observatory')}/></OnGround>
    <OnGround x={SPOTS.signpost.x} z={SPOTS.signpost.z} rot={SPOTS.signpost.rot}><Signpost hitRate={world.hitRate} onPick={()=>world.onLandmark('signpost')}/></OnGround>
    <OnGround x={SPOTS.cart.x} z={SPOTS.cart.z} rot={SPOTS.cart.rot}><Cart flag={world.cartFlag} onPick={()=>world.onLandmark('cart')}/></OnGround>
    <Stream dim={world.light.night*0.85}/><Bridge/><Paths/><Forest/>
    <Library open={world.caseOpen} onPick={()=>world.onLandmark('library')}/>
    <Fields land={world.build?.built.land??[]} mode={!!world.build?.mode} onLot={world.build?.onLot}/>
    {world.build?.mode&&<BuildingLots built={world.build.built} onLot={world.build.onLot}/>}
    {world.build&&<Buildings built={world.build.built}/>}
    {world.build&&<Landmarks built={world.build.built} onPick={id=>world.build!.onLot('city:'+id)}/>}
    <Plaza flags={world.flags} me={world.myFlag} onPick={()=>world.onLandmark('plaza')}/>
    {world.pots.map(p=>{const t=trees.find(x=>x.h.id===p.holdingId);return t&&<OnGround key={p.holdingId} x={t.x-0.85} z={t.z+0.55}><Pot open={p.open} flowers={p.flowers}/></OnGround>})}
    {world.burst&&(()=>{const b=world.burst,t=trees.find(x=>x.h.id===b.holdingId);return t&&<Burst key={b.stamp} x={t.x} z={t.z} hit={b.hit} stamp={b.stamp}/>})()}
    {world.decor.map(d=>{const sl=DECOR_SLOTS.find(x=>x.id===d.slot&&!x.room);return sl&&<OnGround key={d.slot} x={sl.x} z={sl.z} rot={sl.rot}><Decor shape={d.shape}/></OnGround>})}
    <Suspense fallback={null}>
      {world.analysts.filter(a=>!a.home).map(a=><Analyst key={a.id} id={a.id} to={spotFor(a.id,a.at,a.near,a.spot)} act={a.at===null&&a.spot?a.spot.act:a.at!==null&&!a.near?'look':undefined} faceTo={a.at===null&&a.spot?a.spot.face:undefined} from={world.enterFrom} face={pos} surface={surfaceY} tilt={tiltAt} bubble={a.bubble}
        onPick={()=>world.onAnalyst(a.id)} report={reportAnalyst}/>)}
      {world.friend&&<Analyst key="bori" id="bori" to={world.friend.at} act="look" mood={world.friend.face} from={world.enterFrom} face={pos} surface={surfaceY} tilt={tiltAt} bubble={null} onPick={world.friend.onPick} report={reportFriend}/>}
    </Suspense>
    {/* out of the way while the camera looks into the open ground */}
    <Keys pos={pos} target={target} stops={stops} onMove={()=>onPick(null)} enabled={!world.inside&&!world.stage&&!world.sky&&!cut&&!world.capsuleFx}/>
    <Player walls={walls} look={world.look} target={target} stops={stops} pos={pos} hidden={(!!cut&&!cut.c.closing)||!!world.capsuleFx||(!!world.fp&&!focusPos)}/>
    {!world.sky&&<FollowCam pos={pos} recenter={recenter} focus={focusPos} orbit={orbit} near={!!world.capsuleFx} aim={world.view?.az??null} low={cut&&!cut.c.closing?cut.yaw:null} fp={!!world.fp} talk={world.talk?.az??null}/>}
    </>}
    <Hooks pos={pos} treePos={treePos} points={points}/>

    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={LOOK.post.bloom.threshold} luminanceSmoothing={LOOK.post.bloom.smoothing} intensity={LOOK.post.bloom.intensity} radius={LOOK.post.bloom.radius}/>
      <TiltShift2 blur={world.stage||world.sky?0:world.inside?blur*0.35:blur} taper={LOOK.post.tiltShift.taper}/>
      <HueSaturation saturation={wl.saturation}/>
      <Vignette offset={LOOK.post.vignette.offset} darkness={LOOK.post.vignette.darkness}/>
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={LOOK.post.grain.opacity}/>
    </EffectComposer>
  </>;
}

// a decor flower bed or tree from the 꽃집, standing on the ground where it was planted (a slow sway like the others)
function DecorPlant({item,x,z,scale}:{item:string;x:number;z:number;scale:number}){
  const {scene}=useGLTF(MODELS.decor(item));
  const obj=useMemo(()=>{const r=scene.clone(true);r.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});return r},[scene]);
  const yaw=useMemo(()=>((x*928.37+z*311.1)%(Math.PI*2)),[x,z]);
  return <group position={[x,surfaceY(x,z),z]} rotation-y={yaw} scale={LOOK.holdingTreeScale*scale} name={`decor-${item}`}><primitive object={obj}/></group>;
}

