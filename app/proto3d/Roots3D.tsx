'use client';
// W2 뿌리 단면 (docs/brief-wow.md): the ground round one holding's tree slides open toward the camera, showing soil
// layers and the roots (core/roots.ts): how many and how thick = 재무 체력, dark spots = 부도 위험, a stone caught in
// them = 빚 부담. The ground, grass and flowers are clipped (three clipping planes, intersection) only inside the open
// box, and the box's walls are drawn as cut soil. Everything is made in code from a seed, no files.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Roots} from '../core/roots';
import {TIMING} from '../core/timing';
import {LOOK} from './look';
import {soft} from './materials';

function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const ease=(k:number)=>1-Math.pow(1-Math.min(1,Math.max(0,k)),3);

// soil bands by depth (vertex colours): dark topsoil, brown, then clay
function soilColors(g:THREE.BufferGeometry,seed:number){
  const p=g.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color(),r=rng(seed);
  const [top,mid,deep]=LOOK.roots.soil.map(x=>new THREE.Color(x));
  for(let i=0;i<p.count;i++){const y=-p.getY(i)+(r()-0.5)*0.12;
    if(y<0.35)c.copy(top);else if(y<1.25)c.copy(top).lerp(mid,THREE.MathUtils.smoothstep(y,0.35,0.7));else c.copy(mid).lerp(deep,THREE.MathUtils.smoothstep(y,1.25,1.8));
    col.set([c.r,c.g,c.b],i*3)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));return g;
}
// one root: from the foot of the trunk outward and down, a little crooked
function rootCurve(r:()=>number,a:number,reach:number,depth:number){
  const pts=[new THREE.Vector3(0,-0.05,0)];
  for(let k=1;k<=4;k++){const t=k/4,ang=a+(r()-0.5)*0.5*t;pts.push(new THREE.Vector3(Math.sin(ang)*reach*t,-depth*Math.pow(t,0.8)-0.05,Math.cos(ang)*reach*t))}
  return new THREE.CatmullRomCurve3(pts);
}

export function CutAway({pos,quat,roots,seed,t0,closing}:{pos:THREE.Vector3;quat:THREE.Quaternion;roots:Roots;seed:number;t0:number;closing:number|null}){
  const {gl}=useThree(),C=LOOK.roots;
  const group=useRef<THREE.Group>(null),walls=useRef<THREE.Group>(null);
  // the open box in the tree's own frame: x across, +z toward the camera, y up
  const W=C.width,BACK=-C.back,D=C.depth,FRONT=C.front;
  const geos=useMemo(()=>{
    const back=soilColors(new THREE.PlaneGeometry(W*2,D,8,14).translate(0,-D/2,0),seed);
    const floor=new THREE.PlaneGeometry(W*2,1,4,4).rotateX(-Math.PI/2).translate(0,0,0.5);floor.translate(0,-D,0);soilColors(floor,seed+1);
    const side=soilColors(new THREE.PlaneGeometry(1,D,4,14).rotateY(Math.PI/2).translate(0,-D/2,0.5),seed+2);
    return {back,floor,side};
  },[W,D,seed]);
  const parts=useMemo(()=>{const r=rng(seed*31+7),n=roots.count;
    // fan the roots out over the half the camera sees, a couple sideways
    const tubes=Array.from({length:n},(_,i)=>{const a=-1.7+3.4*(n===1?0.5:i/(n-1))+(r()-0.5)*0.25,reach=0.7+r()*0.55,depth=0.8+r()*1.0;
      const curve=rootCurve(r,a,reach,depth);return {curve,geo:new THREE.TubeGeometry(curve,20,roots.thick*(0.8+r()*0.4),7,false)}});
    // fine side roots off the main ones (more on a strong one)
    const fine=tubes.flatMap((t,i)=>i%2&&roots.count<5?[]:[0.45,0.7].map(at=>{const p=t.curve.getPoint(at),a=r()*6.28,len=0.35+r()*0.3;
      const c=new THREE.CatmullRomCurve3([p,p.clone().add(new THREE.Vector3(Math.sin(a)*len*0.5,-len*0.3,Math.cos(a)*len*0.5)),p.clone().add(new THREE.Vector3(Math.sin(a)*len,-len*0.7,Math.cos(a)*len))]);
      return new THREE.TubeGeometry(c,8,roots.thick*0.45,5,false)}));
    // dark spots along the roots: the bankruptcy risk
    const spots=Array.from({length:roots.spots},()=>{const t=tubes[Math.floor(r()*tubes.length)],p=t.curve.getPoint(0.25+r()*0.7);return {p,s:roots.thick*(1.4+r()*1.2)}});
    // the stone: the debt, caught on the thickest root halfway down
    const host=tubes[Math.floor(tubes.length/2)].curve.getPoint(0.55);
    return {tubes,fine,spots,stone:roots.stone>0.05?{p:host.clone().add(new THREE.Vector3(0.12,-0.1,0.18)),s:0.16+0.5*roots.stone}:null};
  },[roots,seed]);
  useEffect(()=>()=>{geos.back.dispose();geos.floor.dispose();geos.side.dispose();parts.tubes.forEach(t=>t.geo.dispose());parts.fine.forEach(g=>g.dispose())},[geos,parts]);

  // clip the ground layer inside the open box; restore it on close
  const planes=useMemo(()=>[new THREE.Plane(),new THREE.Plane(),new THREE.Plane(),new THREE.Plane()],[]);
  const clipped=useMemo(()=>[soft('#ffffff',{vertexColors:true}),soft('#ffffff')],[]);
  useEffect(()=>{const was=gl.localClippingEnabled;gl.localClippingEnabled=true;
    for(const m of clipped){m.clippingPlanes=planes;m.clipIntersection=true;m.needsUpdate=true}
    return()=>{for(const m of clipped){m.clippingPlanes=null;m.clipIntersection=false;m.needsUpdate=true}gl.localClippingEnabled=was}},[gl,clipped,planes]);
  const local=useMemo(()=>[new THREE.Plane(),new THREE.Plane(),new THREE.Plane(),new THREE.Plane()],[]);
  useFrame(()=>{const g=group.current,w=walls.current;if(!g||!w)return;
    const now=performance.now(),open=ease((now-t0)/TIMING.cutawayOpen),shut=closing===null?0:ease((now-closing)/TIMING.cutawayClose);
    // how far toward the camera the ground is open: slides from the back wall forward, and back again on close
    const front=BACK+(FRONT-BACK)*open*(1-shut),len=Math.max(0.001,front-BACK);
    w.position.z=BACK;w.scale.z=1;
    (w.children[1] as THREE.Mesh).scale.set(1,1,len);(w.children[2] as THREE.Mesh).scale.set(1,1,len);(w.children[3] as THREE.Mesh).scale.set(1,1,len);
    w.visible=len>0.02;
    // inside the box = behind all four planes (their negative sides): z > back, z < front, |x| < W
    local[0].set(new THREE.Vector3(0,0,-1),BACK);local[1].set(new THREE.Vector3(0,0,1),-front);local[2].set(new THREE.Vector3(1,0,0),-W);local[3].set(new THREE.Vector3(-1,0,0),-W);
    g.updateMatrixWorld();planes.forEach((p,i)=>p.copy(local[i]).applyMatrix4(g.matrixWorld))});
  const wallMat=soft('#ffffff',{vertexColors:true,side:THREE.DoubleSide});
  return <group ref={group} position={pos} quaternion={quat} name="cutaway">
    <group ref={walls}>
      <mesh geometry={geos.back} material={wallMat} receiveShadow/>
      <mesh geometry={geos.floor} material={wallMat} receiveShadow/>
      <mesh geometry={geos.side} material={wallMat} position-x={-W} receiveShadow/>
      <mesh geometry={geos.side} material={wallMat} position-x={W} receiveShadow/>
    </group>
    {/* the roots, the spots and the stone sit in the soil under the trunk */}
    {parts.tubes.map((t,i)=><mesh key={i} geometry={t.geo} castShadow><primitive object={soft(C.root)} attach="material"/></mesh>)}
    {parts.fine.map((g,i)=><mesh key={'f'+i} geometry={g}><primitive object={soft(C.root)} attach="material"/></mesh>)}
    {parts.spots.map((s,i)=><mesh key={'s'+i} position={s.p} scale={[s.s,s.s*0.7,s.s]}><sphereGeometry args={[1,10,8]}/><primitive object={soft(C.rot)} attach="material"/></mesh>)}
    {parts.stone&&<mesh position={parts.stone.p} scale={[parts.stone.s*1.15,parts.stone.s*0.85,parts.stone.s]} rotation={[0.3,0.6,0.2]} castShadow>
      <dodecahedronGeometry args={[1,1]}/><primitive object={soft(C.stone)} attach="material"/></mesh>}
  </group>;
}
