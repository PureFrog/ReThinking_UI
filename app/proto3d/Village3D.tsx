'use client';
// 유저 워크플로우 (PM 2026-11-21): the village's people and the things beside them (content/villagers.ts), and the guide
// of the first walk: a ring and a bobbing arrow over the person to go to next, and footprints from the player to them.
// The people are Explorer3D figures in their work clothes; each turns to the player when the player comes close.
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {npcStep,NPC_FIRE_SEATS,NPC_LIVE,npcAround} from './places';
import {Explorer} from './Explorer3D';
import {ROLE_KIT,ROLE_LOOK} from './RoleKit';
import {soft} from './materials';
import {OnGround,surfaceY,tiltAt} from './ground';
import {LOOK} from './look';
import {MerchantStallDetail,FarmCartDetail,NewsBoardDetail} from './VillageProps';
import type {Look} from '../core/wardrobe';

const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const glow=new THREE.MeshBasicMaterial({color:'#ffd66b',transparent:true,opacity:0.85,toneMapped:false});

// a person of the village: stands at (x,z) facing `face`, turns to the player within a few steps (or while talking)
// away: not there now (the merchant out of hours): the figure is not drawn, the spot still takes a tap and keeps its tag
// errand (피드백 2026-11-21, the farmer's harvest): walks to the tree, reaches up and picks for a while with a basket
// filling, carries it to the cart, tips it in and walks home; onErrandDone then
export type Errand={to:{x:number;z:number};cart:{x:number;z:number};key:number};
// 피드백 2026-11-26 "농부가 실제로 일하는 모습 / 신문배달 자전거": a day's round when nobody needs them: walk (or ride) from
// point to point and do something there (water, prune, carry to the cart, toss a paper, look round); they head home
// when the player comes near or a talk starts
export type Act='water'|'prune'|'carry'|'toss'|'look'|'sit';
export type Routine={pts:{x:number;z:number;act:Act;hold:number}[];ride?:boolean;speed?:number};
const STEP=2.4,PICK=2.2,DROP=0.8;
export function Villager({id,x,z,face,look,hl,talking,away=false,errand=null,onErrandDone,routine=null,player,onPick,report}:{id:string;x:number;z:number;face:number;look:Look;hl:boolean;talking:boolean;away?:boolean;
  errand?:Errand|null;onErrandDone?:()=>void;routine?:Routine|null;
  player:React.MutableRefObject<THREE.Vector3>;onPick:()=>void;report:(k:string,v:THREE.Vector3)=>void}){
  const body=useRef<THREE.Group>(null),walker=useRef<THREE.Group>(null),basket=useRef<THREE.Group>(null),ring=useRef<THREE.Mesh>(null),arrow=useRef<THREE.Group>(null);
  const base=useMemo(()=>new THREE.Vector3(x,surfaceY(x,z),z),[x,z]),q=useMemo(()=>tiltAt(x,z),[x,z]),qi=useMemo(()=>q.clone().invert(),[q]);
  // 피드백 2026-11-26 "모닥불에 앉은 신문 배달부가 공중 부양": away from home the ground curves (the village is a planet), so
  // a spot far off is placed through the home's tilt and stands on its own ground (it used to be offset in the home's
  // tangent plane: above the ground far away)
  const place=(w:THREE.Object3D,px:number,pz:number)=>{w.position.set(px,surfaceY(px,pz),pz).sub(base).applyQuaternion(qi);w.quaternion.copy(qi).multiply(tiltAt(px,pz))};
  const head=useMemo(()=>new THREE.Vector3(),[]);
  // 피드백 2026-11-23: each one in the look of what they do (RoleKit.tsx)
  const kitLook=useMemo(()=>{const r=ROLE_LOOK[id];return r?{...look,coat:r.coat,hat:r.hat,bag:null,tool:null}:look},[id,look]);
  const run=useRef<{key:number;leg:number;t:number;px:number;pz:number}|null>(null);
  const sitRef=useRef(false),nav=useRef<{x:number;z:number}>({x,z}),day=useRef({i:0,t:0,px:x,pz:z,at:false}),tools=useRef<THREE.Group>(null),drops=useRef<(THREE.Mesh|null)[]>([]),paper=useRef<THREE.Mesh>(null);
  useFrame(({clock},dt)=>{const b=body.current,w=walker.current;if(!b||!w)return;const t=clock.elapsedTime;
    if(errand&&run.current?.key!==errand.key)run.current={key:errand.key,leg:0,t:0,px:x,pz:z};
    const r=run.current;let busy=false;
    if(r&&errand){busy=true;
      // legs: 0 to the tree, 1 picking, 2 to the cart, 3 tipping it in, 4 home
      const toward=(tx:number,tz:number,stop:number)=>{const dx=tx-r.px,dz=tz-r.pz,d=Math.hypot(dx,dz);
        const ang=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(ang-b.rotation.y),Math.cos(ang-b.rotation.y));b.rotation.y+=diff*Math.min(1,dt*10);
        if(d<=stop+0.02)return true;const m=Math.min(d-stop,STEP*dt);const q=nav.current;q.x=r.px;q.z=r.pz;if(!npcStep(q,tx,tz,m,npcAround(id))){r.px+=dx/d*m;r.pz+=dz/d*m}else{r.px=q.x;r.pz=q.z}b.position.y=Math.abs(Math.sin(t*9))*0.05;return false};
      r.t+=dt;b.rotation.x=0;
      if(r.leg===0){if(toward(errand.to.x,errand.to.z,0.95)){r.leg=1;r.t=0}}
      else if(r.leg===1){b.position.y=Math.abs(Math.sin(r.t*5.5))*0.14;b.rotation.x=-0.22-Math.abs(Math.sin(r.t*5.5))*0.12;if(r.t>PICK){r.leg=2;r.t=0;b.rotation.x=0}}
      else if(r.leg===2){if(toward(errand.cart.x,errand.cart.z,0.9)){r.leg=3;r.t=0}}
      else if(r.leg===3){b.rotation.x=Math.min(0.35,r.t*1.2);if(r.t>DROP){r.leg=4;r.t=0;b.rotation.x=0}}
      else if(r.leg===4){if(toward(x,z,0)){run.current=null;b.position.y=0;r.px=x;r.pz=z;onErrandDone?.()}}
      place(w,r.px,r.pz);NPC_LIVE[id]={x:r.px,z:r.pz};
      // the basket: fills up while picking, carried to the cart, empty after
      const k=basket.current;if(k){const full=r.leg===1?Math.min(1,r.t/PICK):r.leg===2?1:r.leg===3?Math.max(0,1-r.t/DROP):0;
        k.visible=r.leg>=1&&r.leg<=3;k.position.set(Math.sin(b.rotation.y)*0.38,0.78+b.position.y,Math.cos(b.rotation.y)*0.38);
        k.children.forEach((c,i)=>{if(i>0)c.visible=i<=Math.ceil(full*5)})}
    }else if(routine&&!away){busy=true;const D=day.current,p=player.current,sp=routine.speed??1.6;
      // home when the player is near (to talk) or a talk is on; else the round
      // (only the player near their home spot calls them back: judging by where they are now made the paperboy shake
      // back and forth at the edge when I stood on his round, 피드백 2026-11-26)
      const near=Math.hypot(p.x-x,p.z-z)<4.5||talking;
      const goal=near?{x,z,act:'look' as Act,hold:0}:routine.pts[D.i%routine.pts.length];
      const dx=goal.x-D.px,dz=goal.z-D.pz,d=Math.hypot(dx,dz);let act:Act|null=null;
      if(d>0.05){const m=Math.min(d,sp*dt),ox=D.px,oz=D.pz,q=nav.current;q.x=D.px;q.z=D.pz;if(npcStep(q,goal.x,goal.z,m,npcAround(id))){D.px=q.x;D.pz=q.z}else{/* blocked a long while: straight on (all but the fire, which is walked round) */D.px+=dx/d*m;D.pz+=dz/d*m}const ang=Math.atan2(D.px-ox||dx,D.pz-oz||dz);b.rotation.y+=Math.atan2(Math.sin(ang-b.rotation.y),Math.cos(ang-b.rotation.y))*Math.min(1,dt*8);
        b.position.y=routine.ride?0.3:Math.abs(Math.sin(t*9))*0.05;b.rotation.x=0;D.t=0}
      else if(near){busy=false;b.position.y=0;b.rotation.x=0}
      else{D.t+=dt;act=goal.act;b.position.y=routine.ride?0.3:0;
        b.rotation.x=act==='water'?0.25:act==='prune'?-0.1+Math.sin(t*8)*0.05:act==='carry'?0.15:0;
        if(act==='look')b.rotation.y+=Math.sin(t*0.8)*dt*0.8;
        // a rest by the fire: sat on the stump facing it (the bicycle left leaning beside)
        if(act==='sit'){const fs=NPC_FIRE_SEATS.find(q=>Math.hypot(q.x-D.px,q.z-D.pz)<0.3);if(fs)b.rotation.y+=Math.atan2(Math.sin(fs.face-b.rotation.y),Math.cos(fs.face-b.rotation.y))*Math.min(1,dt*6);b.position.y=0;b.rotation.x=0}
        if(D.t>goal.hold){D.i++;D.t=0}}
      place(w,D.px,D.pz);NPC_LIVE[id]={x:D.px,z:D.pz};
      ((window as unknown as {__npc?:Record<string,unknown>}).__npc??={})[id]={x:D.px,z:D.pz,act,near,ry:+b.rotation.y.toFixed(3),by:+b.position.y.toFixed(3),wx:+w.position.x.toFixed(3)};
      // the tools: a watering can and its drops, shears that snip, a sack on the shoulder, the bicycle and the paper
      const tg=tools.current;if(tg){tg.rotation.y=b.rotation.y;tg.position.y=b.position.y;const [can,shear,sack,bike]=tg.children;
        can.visible=act==='water';shear.visible=act==='prune';sack.visible=act==='carry'||(d>0.05&&routine.pts[(D.i+routine.pts.length-1)%routine.pts.length]?.act==='carry');bike.visible=!!routine.ride&&act!=='sit';sitRef.current=act==='sit';
        if(act==='prune')(shear.children[1] as THREE.Object3D).rotation.z=0.3+Math.abs(Math.sin(t*10))*0.4;
        drops.current.forEach((m,i)=>{if(!m)return;const k=((t*1.6+i/5)%1);m.visible=act==='water';m.position.set(0.05*Math.sin(i*2),0.85-k*0.8,0.62+k*0.12)});
        const pp=paper.current;if(pp){const k=act==='toss'?Math.min(1,D.t/0.8):0;pp.visible=act==='toss'&&k<1;pp.position.set(0.3+k*1.4,1.3+Math.sin(k*Math.PI)*0.9-k*1.0,0.2);pp.rotation.z=k*9}}
    }else{w.position.set(0,0,0);w.quaternion.identity();NPC_LIVE[id]={x,z};b.position.y=0;b.rotation.x=0;if(basket.current)basket.current.visible=false}
    if(!busy){const p=player.current,d=Math.hypot(p.x-x,p.z-z);
      const want=talking||d<4.2?Math.atan2(p.x-x,p.z-z):face,diff=Math.atan2(Math.sin(want-b.rotation.y),Math.cos(want-b.rotation.y));
      b.rotation.y+=diff*Math.min(1,dt*(talking?9:4))}
    if(ring.current){ring.current.scale.setScalar(1+Math.sin(t*3)*0.06)}
    if(arrow.current)arrow.current.position.y=2.55+Math.sin(t*3.2)*0.12;
    head.copy(base).add(w.position);head.y+=1.2;report('npc-'+id,head);head.y+=1.05;report('npctag-'+id,head)});
  return <group position={base} quaternion={q} name={'npc-'+id} onClick={e=>{e.stopPropagation();onPick()}}>
    <group ref={walker}>
      <group ref={body} rotation-y={face} scale={LOOK.explorer.scale} visible={!away}><Suspense fallback={null}><Explorer look={kitLook} kit={ROLE_KIT[id]} sit={sitRef}/></Suspense></group>
      {/* the harvest basket and the fruit in it */}
      <group ref={basket} visible={false}>
        <mesh castShadow><cylinderGeometry args={[0.2,0.15,0.18,12,1,true]}/><meshStandardMaterial color="#b08a5a" side={THREE.DoubleSide} roughness={0.9}/></mesh>
        {[[-0.07,0.06,-0.04],[0.07,0.06,0.03],[0,0.08,0.08],[-0.03,0.13,0],[0.06,0.14,-0.06]].map(([fx,fy,fz],i)=>
          <mesh key={i} position={[fx,fy,fz]} castShadow><sphereGeometry args={[0.075,10,8]}/>{S('#d0533f')}</mesh>)}
      </group>
      {routine&&<group ref={tools}>
        <group position={[0.22,0.85,0.35]} rotation-x={0.5}>{/* watering can */}
          <mesh><cylinderGeometry args={[0.11,0.12,0.2,14]}/><meshStandardMaterial color="#5f9ec0" metalness={0.5} roughness={0.35}/></mesh>
          <mesh position={[0,0.04,0.17]} rotation-x={1.1}><cylinderGeometry args={[0.018,0.03,0.25,8]}/><meshStandardMaterial color="#5f9ec0" metalness={0.5} roughness={0.35}/></mesh>
          <mesh position={[0,0.14,-0.04]} rotation-y={Math.PI/2}><torusGeometry args={[0.08,0.015,6,12,Math.PI]}/><meshStandardMaterial color="#4a7f9c" metalness={0.5}/></mesh></group>
        <group position={[0.2,1.0,0.38]}>{/* shears */}
          <mesh rotation-z={-0.3}><boxGeometry args={[0.03,0.22,0.01]}/><meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2}/></mesh>
          <mesh rotation-z={0.3}><boxGeometry args={[0.03,0.22,0.01]}/><meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2}/></mesh>
          {[-1,1].map(k=><mesh key={k} position={[k*0.05,-0.15,0]}><torusGeometry args={[0.035,0.01,6,12]}/>{S('#c44b3b')}</mesh>)}</group>
        <group position={[-0.15,1.45,-0.05]} rotation-z={0.3}>{/* a sack on the shoulder */}
          <mesh scale={[1,0.8,0.8]}><sphereGeometry args={[0.2,12,10]}/>{S('#c9b48a')}</mesh>
          {[0,1,2].map(i=><mesh key={i} position={[-0.05+i*0.05,0.17,0]}><sphereGeometry args={[0.05,8,6]}/>{S(['#d0533f','#e2a64b','#7fae4e'][i])}</mesh>)}</group>
        <group position={[0,0,0]}>{/* the bicycle: wheels with spokes, frame, seat, bars and a basket of papers */}
          {[-1,1].map(k=><group key={k} position={[0,0.3,k*0.45]} rotation-y={Math.PI/2}><mesh><torusGeometry args={[0.27,0.03,8,24]}/>{S('#2f2a28')}</mesh>
            {[0,1,2,3].map(j=><mesh key={j} rotation-z={j*Math.PI/4}><boxGeometry args={[0.5,0.01,0.01]}/>{S('#c0c0c0')}</mesh>)}</group>)}
          <mesh position={[0,0.5,0]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.025,0.025,0.85,8]}/>{S('#c44b3b')}</mesh>
          <mesh position={[0,0.55,-0.2]}><cylinderGeometry args={[0.02,0.02,0.5,8]}/>{S('#c44b3b')}</mesh>
          <mesh position={[0,0.62,-0.22]}><boxGeometry args={[0.14,0.05,0.22]}/>{S('#3b2a20')}</mesh>
          <mesh position={[0,0.85,0.42]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.015,0.015,0.5,8]}/>{S('#2f2a28')}</mesh>
          <mesh position={[0,0.62,0.42]}><cylinderGeometry args={[0.02,0.02,0.45,8]}/>{S('#c44b3b')}</mesh>
          <group position={[0,0.72,0.66]}><mesh><boxGeometry args={[0.3,0.18,0.24]}/><meshStandardMaterial color="#b08a5a" roughness={0.9}/></mesh>
            {[0,1,2].map(i=><mesh key={i} position={[-0.08+i*0.08,0.12,0]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.035,0.035,0.22,8]}/>{S('#f4efe2')}</mesh>)}</group></group>
        {Array.from({length:5},(_,i)=><mesh key={'d'+i} ref={el=>{drops.current[i]=el}} visible={false}><sphereGeometry args={[0.025,6,4]}/><meshBasicMaterial color="#8fd3ff"/></mesh>)}
        <mesh ref={paper} visible={false}><cylinderGeometry args={[0.035,0.035,0.22,8]}/>{S('#f4efe2')}</mesh>
      </group>}
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
  const N=22,dots=useRef<(THREE.Mesh|null)[]>([]);
  useFrame(({clock})=>{const p=from.current,dx=to.x-p.x,dz=to.z-p.z,d=Math.hypot(dx,dz),t=clock.elapsedTime;
    for(let i=0;i<N;i++){const m=dots.current[i];if(!m)continue;const k=(i+1)/(N+1);const x=p.x+dx*k,z=p.z+dz*k;
      m.visible=d>1.8&&k*d>0.9&&(1-k)*d>0.9;m.position.set(x,surfaceY(x,z)+0.04,z);m.rotation.set(-Math.PI/2,0,0);
      (m.material as THREE.MeshBasicMaterial).opacity=0.45+0.55*Math.max(0,Math.sin(t*4-i*0.55))}});
  return <>{Array.from({length:N},(_,i)=><mesh key={i} ref={m=>{dots.current[i]=m}}><circleGeometry args={[0.22,16]}/>
    <meshBasicMaterial color="#ffd04a" transparent opacity={0.8} toneMapped={false} depthWrite={false}/></mesh>)}</>;
}

// 피드백 2026-11-22 (튜토리얼 느낌): where the tutorial wants me to go. A warm light falls on that one place (a spot
// from above, a soft beam and a ring that breathes), the rest of the village is dimmed (Scene3D), and the trail is bold
export function LeadMark({to}:{to:{x:number;z:number}}){
  const ring=useRef<THREE.Mesh>(null),beam=useRef<THREE.Mesh>(null),spot=useRef<THREE.SpotLight>(null);
  const y=surfaceY(to.x,to.z);
  useEffect(()=>{const l=spot.current;if(l){l.target.position.set(to.x,y,to.z);if(!l.target.parent)l.parent?.add(l.target);l.target.updateMatrixWorld()}},[to.x,to.z,y]);
  useFrame(({clock})=>{const t=clock.elapsedTime,k=1+0.12*Math.sin(t*3);
    if(ring.current){ring.current.scale.set(k,k,k);(ring.current.material as THREE.MeshBasicMaterial).opacity=0.55+0.3*Math.sin(t*3)}
    if(beam.current)(beam.current.material as THREE.MeshBasicMaterial).opacity=0.16+0.06*Math.sin(t*2)});
  return <group>
    <spotLight ref={spot} position={[to.x,y+9,to.z]} angle={0.32} penumbra={0.6} intensity={140} distance={18} decay={1.6} color="#fff1c8" castShadow={false}/>
    <mesh ref={beam} position={[to.x,y+3.2,to.z]}><cylinderGeometry args={[0.35,1.35,6.4,28,1,true]}/>
      <meshBasicMaterial color="#fff3c4" transparent opacity={0.18} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}/></mesh>
    <mesh ref={ring} position={[to.x,y+0.05,to.z]} rotation-x={-Math.PI/2}><ringGeometry args={[1.05,1.35,40]}/>
      <meshBasicMaterial color="#ffd75e" transparent opacity={0.7} toneMapped={false} depthWrite={false}/></mesh>
  </group>;
}

// the big news board on the square: a wide board with papers pinned on it
export function NewsBoard({x,z,rot,onPick}:{x:number;z:number;rot:number;onPick:()=>void}){
  return <OnGround x={x} z={z} rot={rot}><group name="newsboard" onClick={e=>{e.stopPropagation();onPick()}}><NewsBoardDetail/></group></OnGround>;
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
  return <OnGround x={x} z={z} rot={rot}><group name="merchant-stall"><MerchantStallDetail open={open}/></group></OnGround>;
}
// the farmer's cart beside it: the pile of harvested fruit grows with what waits to be sold
export function FarmCart({x,z,rot,pile}:{x:number;z:number;rot:number;pile:number}){
  return <OnGround x={x} z={z} rot={rot}><group name="farm-cart"><FarmCartDetail pile={pile}/></group></OnGround>;
}
