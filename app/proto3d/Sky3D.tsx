'use client';
// 다른 정원들 (core/planets.ts, ui/SkyView.tsx): the garden is put away and the camera pulls back into the night sky. My
// garden floats low and near; the neighbours' gardens float in loose rows above it, each turning slowly, its trees in
// their state colours, its roof in its owner's colour. Tapping one flies the camera to it. Name tags are DOM, pinned to
// screenPoints 'planet:<id>'. Drag turns the sky a little.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {CONDITION_COLOR,type Planet} from '../core/planets';
import {screenPoints} from './screen';
import {still} from './still';
import {LOOK} from './look';
const L=()=>LOOK.space;
// my garden low and near; the others in two loose rows above it, further back
const SLOTS:[number,number,number][]=[[0,-10,6],[-8,-1,-2],[7,1,-5],[-2,6,-9],[9,9,-12],[-9,11,-13],[2,16,-18],[-4,19,-22]];
export type SkyWorld={planets:Planet[];focus:string|null;onPick:(id:string)=>void};

function Backdrop(){
  const geo=useMemo(()=>{const g=new THREE.SphereGeometry(100,32,20),p=g.attributes.position,col=new Float32Array(p.count*3),top=new THREE.Color(L().top),bot=new THREE.Color(L().bottom),c=new THREE.Color();
    for(let i=0;i<p.count;i++){c.copy(bot).lerp(top,THREE.MathUtils.smoothstep(p.getY(i),-40,60));col.set([c.r,c.g,c.b],i*3)}g.setAttribute('color',new THREE.BufferAttribute(col,3));return g},[]);
  const stars=useMemo(()=>{const g=new THREE.BufferGeometry(),n=900,a=new Float32Array(n*3);let s=7;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
    for(let i=0;i<n;i++){const R=80+r()*15,t=r()*Math.PI*2,ph=Math.acos(2*r()-1);a.set([R*Math.sin(ph)*Math.cos(t),R*Math.cos(ph),R*Math.sin(ph)*Math.sin(t)],i*3)}
    g.setAttribute('position',new THREE.BufferAttribute(a,3));return g},[]);
  return <>
    <mesh geometry={geo}><meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} toneMapped={false}/></mesh>
    <points geometry={stars}><pointsMaterial color="#f4eedf" size={0.7} transparent opacity={0.85} sizeAttenuation toneMapped={false}/></points>
  </>;
}

function PlanetMesh({p,slot,i,portrait,onPick}:{p:Planet;slot:[number,number,number];i:number;portrait:boolean;onPick:()=>void}){
  const g=useRef<THREE.Group>(null);
  const R=p.me?5.2:2.4+p.trees.length*.12,big=p.me?1:1.5;
  const land=useMemo(()=>{const geo=new THREE.IcosahedronGeometry(R,4),pos=geo.attributes.position,v=new THREE.Vector3();
    for(let k=0;k<pos.count;k++){v.fromBufferAttribute(pos,k);v.multiplyScalar(1+Math.sin(v.x*1.7+i)*Math.cos(v.z*1.3)*.025);pos.setXYZ(k,v.x,v.y,v.z)}geo.computeVertexNormals();return geo},[R,i]);
  const ground=useMemo(()=>new THREE.Color(L().land).lerp(new THREE.Color(p.color),p.me?0:.18),[p.color,p.me]);
  const trees=useMemo(()=>p.trees.map((t,k)=>{const lat=.35+((k*53)%100)/100*1.1,lon=k/Math.max(1,p.trees.length)*Math.PI*2+i;
    const dir=new THREE.Vector3(Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon));
    return {dir,q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir),h:(R*.22+((k*37)%5)*.04)*big,c:t.condition}}),[p.trees,R,i,big]);
  const houseDir=new THREE.Vector3(-.3,1,.5).normalize(),houseQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),houseDir);
  const base=useRef(new THREE.Vector3()),v=useRef(new THREE.Vector3());
  const {camera,size}=useThree();
  useFrame(({clock},dt)=>{const o=g.current;if(!o)return;const t=still()?0:clock.elapsedTime;
    const s=portrait?.72:1.3;base.current.set(slot[0]*s+(p.me?0:Math.sin(t*.3+i)*.4),slot[1]*(portrait?.9:.8)+Math.sin(t*.6+i*3)*.35,slot[2]);
    o.position.copy(base.current);if(!still())o.rotation.y+=(p.me?.09:.18)*Math.min(dt,.1);
    v.current.copy(o.position).add(new THREE.Vector3(0,R*1.15,0)).project(camera);
    screenPoints.set('planet:'+p.id,{x:(v.current.x*.5+.5)*size.width,y:(-v.current.y*.5+.5)*size.height,visible:v.current.z<1});
  });
  useEffect(()=>()=>{screenPoints.delete('planet:'+p.id)},[p.id]);
  const click=(e:{stopPropagation:()=>void})=>{e.stopPropagation();onPick()};
  return <group ref={g} name={'planet-'+p.id} onClick={click}>
    <mesh geometry={land} castShadow receiveShadow><meshStandardMaterial color={ground} roughness={.95} flatShading/></mesh>
    <group quaternion={new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.6).normalize(),.55)}>
      <mesh position-y={R*.995} rotation-x={-Math.PI/2}><circleGeometry args={[R*.22,20]}/><meshStandardMaterial color={L().pond} roughness={.3}/></mesh>
    </group>
    {trees.map((t,k)=><group key={k} position={t.dir.clone().multiplyScalar(R*.98)} quaternion={t.q}>
      <mesh position-y={t.h/2}><cylinderGeometry args={[.06*big,.09*big,t.h,6]}/><meshStandardMaterial color="#6a4a32"/></mesh>
      {t.c!=='dead'&&<mesh position-y={t.h+R*.08*big}>{t.c==='wilt'||t.c==='rot'?<coneGeometry args={[R*.11*big,R*.2*big,6]}/>:<icosahedronGeometry args={[R*.13*big,1]}/>}
        <meshStandardMaterial color={CONDITION_COLOR[t.c]} flatShading roughness={.8}/></mesh>}
    </group>)}
    <group position={houseDir.clone().multiplyScalar(R*.98)} quaternion={houseQ}>
      <mesh position-y={R*.08}><boxGeometry args={[R*.22,R*.16,R*.18]}/><meshStandardMaterial color="#efe6d2"/></mesh>
      <mesh position-y={R*.23} rotation-y={Math.PI/4}><coneGeometry args={[R*.18,R*.14,4]}/><meshStandardMaterial color={p.color} flatShading/></mesh>
    </group>
    <mesh rotation-x={Math.PI/2.4}><ringGeometry args={[R*1.25,R*1.3,64]}/><meshBasicMaterial color={p.color} transparent opacity={p.me?.5:.35} side={THREE.DoubleSide} toneMapped={false}/></mesh>
  </group>;
}

// the camera: starts close on my garden and pulls back; flies to a planet being visited; dragging turns the sky a little
function SkyCam({planets,focus}:{planets:Planet[];focus:string|null}){
  const {camera,size,gl,scene}=useThree(),portrait=size.width<size.height;
  const st=useRef({yaw:0,pitch:.12,dist:portrait?66:46,t0:performance.now(),look:new THREE.Vector3(0,-6,6),drag:null as null|{x:number;y:number;yaw:number;pitch:number}});
  // the night dome is wider than the garden's far plane: open it up while the sky is shown, put it back after
  useEffect(()=>{const c=camera as THREE.PerspectiveCamera,far=c.far,fov=c.fov;c.fov=42;c.far=400;c.clearViewOffset();c.updateProjectionMatrix();st.current.t0=performance.now();return()=>{c.far=far;c.fov=fov;c.updateProjectionMatrix()}},[camera]);
  useEffect(()=>{const el=gl.domElement,s=st.current;
    const down=(e:PointerEvent)=>{s.drag={x:e.clientX,y:e.clientY,yaw:s.yaw,pitch:s.pitch}},up=()=>{s.drag=null},
      move=(e:PointerEvent)=>{if(!s.drag||focus)return;s.yaw=s.drag.yaw-(e.clientX-s.drag.x)*.004;s.pitch=Math.max(-.15,Math.min(.7,s.drag.pitch+(e.clientY-s.drag.y)*.003))};
    el.addEventListener('pointerdown',down);addEventListener('pointerup',up);addEventListener('pointermove',move);
    return()=>{el.removeEventListener('pointerdown',down);removeEventListener('pointerup',up);removeEventListener('pointermove',move)}},[gl,focus]);
  const want=useRef(new THREE.Vector3()),cur=useRef({dist:10,yaw:0,pitch:.12});
  useFrame((_,dt)=>{const s=st.current,k=1-Math.exp(-Math.min(dt,.25)*(still()?60:4));
    const intro=Math.min(1,(performance.now()-s.t0)/1600),ease=1-Math.pow(1-intro,3);
    let dist=(portrait?66:46);want.current.set(0,portrait?2.5:0,-4);
    const f=focus?scene.getObjectByName('planet-'+focus):null;
    if(f){const p=planets.find(x=>x.id===focus),R=p?.me?5.2:2.4+(p?.trees.length??0)*.12;want.current.copy(f.position).add(new THREE.Vector3(0,portrait?-R*1.6:0,0));dist=R*(portrait?9.5:6)}
    else if(intro<1){const me=scene.getObjectByName('planet-'+planets[0]?.id);if(me)want.current.lerp(me.position,1-ease);dist=10+(dist-10)*ease}
    s.look.lerp(want.current,k);cur.current.dist+=(dist-cur.current.dist)*k;cur.current.yaw+=(s.yaw-cur.current.yaw)*k;cur.current.pitch+=(s.pitch-cur.current.pitch)*k;
    camera.up.set(0,1,0);const c=cur.current;camera.position.set(s.look.x+Math.sin(c.yaw)*Math.cos(c.pitch)*c.dist,s.look.y+Math.sin(c.pitch)*c.dist,s.look.z+Math.cos(c.yaw)*Math.cos(c.pitch)*c.dist);camera.lookAt(s.look);
  });
  return null;
}

export function SkyScene({sky}:{sky:SkyWorld}){
  const {size}=useThree(),portrait=size.width<size.height;
  return <group name="sky">
    <Backdrop/>
    <hemisphereLight args={['#fff4dd','#26304f',1.05]}/>
    <directionalLight position={[-20,30,25]} intensity={1.6} color="#ffe2b0"/>
    {sky.planets.map((p,i)=><PlanetMesh key={p.id} p={p} slot={SLOTS[i%SLOTS.length]} i={i} portrait={portrait} onPick={()=>sky.onPick(p.id)}/>)}
    <SkyCam planets={sky.planets} focus={sky.focus}/>
  </group>;
}
