'use client';
// 유저 워크플로우 (PM 2026-11-21): the village's people and the things beside them (content/villagers.ts), and the guide
// of the first walk: a ring and a bobbing arrow over the person to go to next, and footprints from the player to them.
// The people are Explorer3D figures in their work clothes; each turns to the player when the player comes close.
import {Suspense,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Explorer} from './Explorer3D';
import {soft} from './materials';
import {OnGround,surfaceY,tiltAt} from './ground';
import {LOOK} from './look';
import type {Look} from '../core/wardrobe';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const glow=new THREE.MeshBasicMaterial({color:'#ffd66b',transparent:true,opacity:0.85,toneMapped:false});

// a person of the village: stands at (x,z) facing `face`, turns to the player within a few steps (or while talking)
// away: not there now (the merchant out of hours): the figure is not drawn, the spot still takes a tap and keeps its tag
// errand (피드백 2026-11-21, the farmer's harvest): walks to the tree, reaches up and picks for a while with a basket
// filling, carries it to the cart, tips it in and walks home; onErrandDone then
export type Errand={to:{x:number;z:number};cart:{x:number;z:number};key:number};
const STEP=2.4,PICK=2.2,DROP=0.8;
export function Villager({id,x,z,face,look,hl,talking,away=false,errand=null,onErrandDone,player,onPick,report}:{id:string;x:number;z:number;face:number;look:Look;hl:boolean;talking:boolean;away?:boolean;
  errand?:Errand|null;onErrandDone?:()=>void;
  player:React.MutableRefObject<THREE.Vector3>;onPick:()=>void;report:(k:string,v:THREE.Vector3)=>void}){
  const body=useRef<THREE.Group>(null),walker=useRef<THREE.Group>(null),basket=useRef<THREE.Group>(null),ring=useRef<THREE.Mesh>(null),arrow=useRef<THREE.Group>(null);
  const base=useMemo(()=>new THREE.Vector3(x,surfaceY(x,z),z),[x,z]),q=useMemo(()=>tiltAt(x,z),[x,z]);
  const head=useMemo(()=>new THREE.Vector3(),[]);
  const run=useRef<{key:number;leg:number;t:number;px:number;pz:number}|null>(null);
  useFrame(({clock},dt)=>{const b=body.current,w=walker.current;if(!b||!w)return;const t=clock.elapsedTime;
    if(errand&&run.current?.key!==errand.key)run.current={key:errand.key,leg:0,t:0,px:x,pz:z};
    const r=run.current;let busy=false;
    if(r&&errand){busy=true;
      // legs: 0 to the tree, 1 picking, 2 to the cart, 3 tipping it in, 4 home
      const toward=(tx:number,tz:number,stop:number)=>{const dx=tx-r.px,dz=tz-r.pz,d=Math.hypot(dx,dz);
        const ang=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(ang-b.rotation.y),Math.cos(ang-b.rotation.y));b.rotation.y+=diff*Math.min(1,dt*10);
        if(d<=stop+0.02)return true;const m=Math.min(d-stop,STEP*dt);r.px+=dx/d*m;r.pz+=dz/d*m;b.position.y=Math.abs(Math.sin(t*9))*0.05;return false};
      r.t+=dt;b.rotation.x=0;
      if(r.leg===0){if(toward(errand.to.x,errand.to.z,0.95)){r.leg=1;r.t=0}}
      else if(r.leg===1){b.position.y=Math.abs(Math.sin(r.t*5.5))*0.14;b.rotation.x=-0.22-Math.abs(Math.sin(r.t*5.5))*0.12;if(r.t>PICK){r.leg=2;r.t=0;b.rotation.x=0}}
      else if(r.leg===2){if(toward(errand.cart.x,errand.cart.z,0.9)){r.leg=3;r.t=0}}
      else if(r.leg===3){b.rotation.x=Math.min(0.35,r.t*1.2);if(r.t>DROP){r.leg=4;r.t=0;b.rotation.x=0}}
      else if(r.leg===4){if(toward(x,z,0)){run.current=null;b.position.y=0;r.px=x;r.pz=z;onErrandDone?.()}}
      w.position.set(r.px-x,surfaceY(r.px,r.pz)-base.y,r.pz-z);
      // the basket: fills up while picking, carried to the cart, empty after
      const k=basket.current;if(k){const full=r.leg===1?Math.min(1,r.t/PICK):r.leg===2?1:r.leg===3?Math.max(0,1-r.t/DROP):0;
        k.visible=r.leg>=1&&r.leg<=3;k.position.set(Math.sin(b.rotation.y)*0.38,0.78+b.position.y,Math.cos(b.rotation.y)*0.38);
        k.children.forEach((c,i)=>{if(i>0)c.visible=i<=Math.ceil(full*5)})}
    }else{w.position.set(0,0,0);b.position.y=0;b.rotation.x=0;if(basket.current)basket.current.visible=false}
    if(!busy){const p=player.current,d=Math.hypot(p.x-x,p.z-z);
      const want=talking||d<4.2?Math.atan2(p.x-x,p.z-z):face,diff=Math.atan2(Math.sin(want-b.rotation.y),Math.cos(want-b.rotation.y));
      b.rotation.y+=diff*Math.min(1,dt*(talking?9:4))}
    if(ring.current){ring.current.scale.setScalar(1+Math.sin(t*3)*0.06)}
    if(arrow.current)arrow.current.position.y=2.55+Math.sin(t*3.2)*0.12;
    head.copy(base).add(w.position);head.y+=1.2;report('npc-'+id,head);head.y+=1.05;report('npctag-'+id,head)});
  return <group position={base} quaternion={q} name={'npc-'+id} onClick={e=>{e.stopPropagation();onPick()}}>
    <group ref={walker}>
      <group ref={body} rotation-y={face} scale={LOOK.explorer.scale} visible={!away}><Suspense fallback={null}><Explorer look={look}/></Suspense></group>
      {/* the harvest basket and the fruit in it */}
      <group ref={basket} visible={false}>
        <mesh castShadow><cylinderGeometry args={[0.2,0.15,0.18,12,1,true]}/><meshStandardMaterial color="#b08a5a" side={THREE.DoubleSide} roughness={0.9}/></mesh>
        {[[-0.07,0.06,-0.04],[0.07,0.06,0.03],[0,0.08,0.08],[-0.03,0.13,0],[0.06,0.14,-0.06]].map(([fx,fy,fz],i)=>
          <mesh key={i} position={[fx,fy,fz]} castShadow><sphereGeometry args={[0.075,10,8]}/>{S('#d0533f')}</mesh>)}
      </group>
      {/* a wider invisible column so a tap on the person is easy */}
      <mesh position-y={0.9} visible={false}><cylinderGeometry args={[0.55,0.55,1.8,8]}/><meshBasicMaterial/></mesh>
    </group>
    {hl&&<><mesh ref={ring} rotation-x={-Math.PI/2} position-y={0.03}><ringGeometry args={[0.62,0.78,40]}/><primitive object={glow} attach="material"/></mesh>
      <group ref={arrow} position-y={2.55}><mesh rotation-x={Math.PI}><coneGeometry args={[0.2,0.36,4]}/><primitive object={glow} attach="material"/></mesh></group></>}
  </group>;
}

// footprints from the player to where the next person is (the first walk's guide): a row of soft dots that light up
// one after another toward the goal
export function GuideTrail({from,to}:{from:React.MutableRefObject<THREE.Vector3>;to:{x:number;z:number}}){
  const N=14,dots=useRef<(THREE.Mesh|null)[]>([]);
  useFrame(({clock})=>{const p=from.current,dx=to.x-p.x,dz=to.z-p.z,d=Math.hypot(dx,dz),t=clock.elapsedTime;
    for(let i=0;i<N;i++){const m=dots.current[i];if(!m)continue;const k=(i+1)/(N+1);const x=p.x+dx*k,z=p.z+dz*k;
      m.visible=d>1.8&&k*d>0.9&&(1-k)*d>0.9;m.position.set(x,surfaceY(x,z)+0.04,z);m.rotation.set(-Math.PI/2,0,0);
      (m.material as THREE.MeshBasicMaterial).opacity=0.25+0.6*Math.max(0,Math.sin(t*4-i*0.55))}});
  return <>{Array.from({length:N},(_,i)=><mesh key={i} ref={m=>{dots.current[i]=m}}><circleGeometry args={[0.13,14]}/>
    <meshBasicMaterial color="#ffe08a" transparent opacity={0.6} toneMapped={false} depthWrite={false}/></mesh>)}</>;
}

// the big news board on the square: a wide board with papers pinned on it
export function NewsBoard({x,z,rot,onPick}:{x:number;z:number;rot:number;onPick:()=>void}){
  return <OnGround x={x} z={z} rot={rot}><group name="newsboard" onClick={e=>{e.stopPropagation();onPick()}}>
    {[-1,1].map(k=><mesh key={k} position={[k*1.05,0.9,0]} castShadow>{<boxGeometry args={[0.14,1.8,0.14]}/>}{S('#7a5a40')}</mesh>)}
    <mesh position={[0,1.45,0]} castShadow><boxGeometry args={[2.3,1.25,0.1]}/>{S('#a4805c')}</mesh>
    <mesh position={[0,2.17,0]} castShadow><boxGeometry args={[2.5,0.16,0.3]}/>{S('#6b4c35')}</mesh>
    {[[-0.62,1.62,0.05],[0.1,1.5,-0.04],[0.72,1.68,0.08],[-0.3,1.18,-0.06],[0.5,1.16,0.03]].map(([px,py,r],i)=>
      <mesh key={i} position={[px,py,0.06]} rotation-z={r}><planeGeometry args={[0.55,0.42]}/>{S(i%2?'#f4efe2':'#fbf8ee')}</mesh>)}
  </group></OnGround>;
}
// the clothes stall: a little awning over a rail of hanging coats
export function TailorStall({x,z,rot}:{x:number;z:number;rot:number}){
  const coats=['#c9473d','#2c5c92','#e6b93a','#4b6638'];
  return <OnGround x={x} z={z} rot={rot}><group name="tailor-stall">
    {[-1,1].map(k=><mesh key={k} position={[k*1.0,0.95,-0.4]} castShadow><boxGeometry args={[0.1,1.9,0.1]}/>{S('#8a6a4c')}</mesh>)}
    <mesh position={[0,1.92,-0.15]} rotation-x={0.35} castShadow><boxGeometry args={[2.3,0.06,1.0]}/>{S('#e9dcc2')}</mesh>
    <mesh position={[0,1.5,-0.4]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.03,0.03,2,8]}/>{S('#5b4636')}</mesh>
    {coats.map((c,i)=><mesh key={i} position={[-0.66+i*0.44,1.05,-0.4]} castShadow><boxGeometry args={[0.34,0.8,0.12]}/>{S(c)}</mesh>)}
  </group></OnGround>;
}
// the merchant's stall: a counter with an awning; when the merchant is away a small sign says when it opens
export function MerchantStall({x,z,rot,open}:{x:number;z:number;rot:number;open:boolean}){
  return <OnGround x={x} z={z} rot={rot}><group name="merchant-stall">
    <mesh position={[0,0.45,0]} castShadow receiveShadow><boxGeometry args={[1.8,0.9,0.7]}/>{S('#9a7652')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*0.85,1.25,-0.3]} castShadow><boxGeometry args={[0.08,1.6,0.08]}/>{S('#7a5a40')}</mesh>)}
    {[0,1,2,3].map(i=><mesh key={i} position={[-0.68+i*0.45,2.05,-0.05]} rotation-x={0.4} castShadow><boxGeometry args={[0.45,0.05,0.9]}/>{S(i%2?'#f4efe2':'#c9473d')}</mesh>)}
    {open?[0,1,2].map(i=><mesh key={i} position={[-0.5+i*0.5,0.98,0.05]} castShadow><boxGeometry args={[0.3,0.16,0.3]}/>{S(['#e2a64b','#7fae4e','#d06a4a'][i])}</mesh>)
      :<mesh position={[0,1.12,0.36]}><boxGeometry args={[0.8,0.34,0.04]}/>{S('#fbf8ee')}</mesh>}
  </group></OnGround>;
}
// the farmer's cart beside it: the pile of harvested fruit grows with what waits to be sold
export function FarmCart({x,z,rot,pile}:{x:number;z:number;rot:number;pile:number}){
  const k=pile>0?Math.min(1,0.35+0.12*Math.log2(1+pile)):0;
  return <OnGround x={x} z={z} rot={rot}><group name="farm-cart">
    <mesh position={[0,0.55,0]} castShadow receiveShadow><boxGeometry args={[1.3,0.35,0.85]}/>{S('#9a7652')}</mesh>
    {[-1,1].map(s=><mesh key={s} position={[0,0.32,s*0.48]} rotation-x={Math.PI/2} castShadow><cylinderGeometry args={[0.3,0.3,0.08,16]}/>{S('#5b4636')}</mesh>)}
    <mesh position={[0.95,0.6,0]} rotation-z={-0.35}><boxGeometry args={[0.8,0.06,0.06]}/>{S('#7a5a40')}</mesh>
    {k>0&&<mesh position={[0,0.74+0.2*k,0]} scale={[k,k*0.7,k]} castShadow><sphereGeometry args={[0.5,14,10,0,Math.PI*2,0,Math.PI/2]}/>{S('#d0533f')}</mesh>}
  </group></OnGround>;
}
