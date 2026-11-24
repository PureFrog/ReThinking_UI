'use client';
// 집 (PM 설계 2026-11-19 1~4장): the player sits at the desk, first person, eye level with 보리 across it. Near: the desk
// edge and today's quiz sheet; an arm's length on: 보리's hand and face; behind 보리: the door to the village and the
// window light. The drawer on the right carries the lock and the exact level plate until the case file unlocks.
// One 3D room the whole time; the camera only moves between three seats (look.ts LOOK.house.cam): sitting back, looking
// down at the sheet, leaning in over the case file. Reduced motion switches between them at once.
// Room coordinates: x across, z toward the player, y up; the player's chair at z≈0.6, 보리 at z≈-1.25.
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from './materials';
import {MODELS} from './models';
import {fixBoriPatch} from './Analyst3D';
import {LOOK} from './look';
import {still} from './still';

export type HouseCam='seat'|'paper'|'case';
// where 보리's hand points: the sheet, the drawer, the case file or the door (null: hands in the lap)
export type Point='paper'|'drawer'|'case'|'door'|null;
// 9-3 where 보리's paws are and what they keep doing there (a place for each state of the day; they never just go back)
export type Paws='rest'|'push'|'tap-paper'|'hold'|'mark-0'|'mark-1'|'plate'|'door'|'door-turn'|'tap-case'|'case-docs'|'case-compare'|'case-note'|'case-board';
export type HouseProps={cam:HouseCam;point:Point;paws:Paws;mood:string;
  paper:'fresh'|'done'|'none'|'glow';drawer:'locked'|'open';caseFile:'hidden'|'rising'|'closed'|'open'|'done';door:boolean;tidy:boolean;
    onPaper:()=>void;onDrawer:()=>void;onCase:()=>void;onDoor:()=>void;onBori:()=>void};

const H=()=>LOOK.house;
const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const tap=(fn:()=>void)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();fn()};
// the e2e hooks: where the room's things are on screen, and what the desk shows
type Hk={house?:{cam:HouseCam;point:Point;paws:Paws;pawAt?:{r:number[];l:number[]};door:boolean;drawer:string;caseFile:string;paper:string;points:Record<string,{x:number;y:number}>}};
const hooks=()=>((window as {__proto3d?:Hk}).__proto3d??={} as Hk);
export const HOUSE_SPOTS={paper:[-0.18,0.77,-0.5],drawer:[0.52,0.98,-0.7],case:[-0.45,0.79,-0.62],door:[1.05,1.1,-2.75],bori:[0,1.15,-1.5]} as const;

function Cam({cam}:{cam:HouseCam}){
  const {camera,size}=useThree();
  const want=useMemo(()=>{const c=H().cam[cam];return {pos:new THREE.Vector3(...c.pos),look:new THREE.Vector3(...c.look)}},[cam]);
  const look=useRef(want.look.clone()),first=useRef(true);
  useEffect(()=>{const c=camera as THREE.PerspectiveCamera,a=size.width/size.height,d=Math.PI/180;
    // keep hfov across: a tall screen widens the vertical view (both desk ends stay in), never past fovMax
    const fromH=2*Math.atan(Math.tan(H().hfov*d/2)/a)/d;c.fov=Math.min(H().fovMax,Math.max(H().fov,fromH));c.near=0.05;c.updateProjectionMatrix()},[camera,size.width,size.height]);
  useFrame((_,dt)=>{const k=still()||first.current?1:1-Math.exp(-Math.min(dt,0.1)*H().camEase);first.current=false;
    camera.position.lerp(want.pos,k);look.current.lerp(want.look,k);camera.lookAt(look.current);
    // the room's things on screen (e2e taps them)
    const pts:Record<string,{x:number;y:number}>={};const v=new THREE.Vector3();
    for(const [k2,p] of Object.entries(HOUSE_SPOTS)){v.set(p[0],p[1],p[2]).project(camera);pts[k2]={x:(v.x+1)/2*size.width,y:(1-v.y)/2*size.height}}
    const h=hooks();if(h.house)h.house.points=pts});
  return null;
}

function Room({door,onDoor}:{door:boolean;onDoor:()=>void}){
  const leaf=useRef<THREE.Group>(null);
  useFrame((_,dt)=>{const g=leaf.current;if(!g)return;const to=door?-1.15:0;g.rotation.y=still()?to:THREE.MathUtils.lerp(g.rotation.y,to,1-Math.exp(-dt*3))});
  const c=H().color;
  return <group>
    {/* floor, back wall with the window and the door, side walls */}
    <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[7,7]}/>{S(c.floor)}</mesh>
    <mesh position={[0,1.6,-2.8]} receiveShadow><planeGeometry args={[7,3.2]}/>{S(c.wall)}</mesh>
    <mesh position={[-2.6,1.6,-0.6]} rotation-y={Math.PI/2} receiveShadow><planeGeometry args={[5,3.2]}/>{S(c.wall2)}</mesh>
    <mesh position={[2.6,1.6,-0.6]} rotation-y={-Math.PI/2} receiveShadow><planeGeometry args={[5,3.2]}/>{S(c.wall2)}</mesh>
    <mesh position={[0,0.06,-2.78]}><boxGeometry args={[7,0.12,0.04]}/>{S(c.trim)}</mesh>
    {/* the window: light comes in from here */}
    <group position={[-1.25,1.55,-2.77]}>
      <mesh><boxGeometry args={[1.25,1.0,0.06]}/>{S(c.trim)}</mesh>
      <mesh position-z={0.035}><planeGeometry args={[1.1,0.86]}/><meshBasicMaterial color={c.sky} toneMapped={false}/></mesh>
      <mesh position-z={0.05}><boxGeometry args={[0.04,0.86,0.02]}/>{S(c.trim)}</mesh>
      <mesh position-z={0.05}><boxGeometry args={[1.1,0.04,0.02]}/>{S(c.trim)}</mesh>
    </group>
    {/* the door to the village: opens outward once the day's quiz is done; a tap goes out */}
    <group position={[1.05,0,-2.76]}>
      <mesh position={[0,1.1,-0.01]}><boxGeometry args={[1.0,2.25,0.04]}/>{S(door?c.outside:c.trim)}</mesh>
      <group ref={leaf} position={[-0.46,0,0.03]}>
        <mesh position={[0.46,1.08,0]} onClick={tap(onDoor)} name="house-door" castShadow><boxGeometry args={[0.9,2.15,0.06]}/>{S(c.door)}</mesh>
        <mesh position={[0.82,1.05,0.05]}><sphereGeometry args={[0.04,10,8]}/>{S(c.brass)}</mesh>
      </group>
    </group>
    {/* a rug and a plant so the room reads as a home */}
    <mesh rotation-x={-Math.PI/2} position={[0,0.005,-0.5]}><circleGeometry args={[1.6,40]}/>{S(c.rug)}</mesh>
    <group position={[-2.1,0,-2.3]}>
      <mesh position-y={0.25}><cylinderGeometry args={[0.2,0.16,0.5,16]}/>{S(c.pot)}</mesh>
      {[[0,0.8,0,0.32],[0.15,1.05,0.05,0.24],[-0.12,1.0,-0.05,0.22]].map(([x,y,z,r],i)=><mesh key={i} position={[x,y,z]} scale={r}><sphereGeometry args={[1,14,10]}/>{S(i?c.leaf2:c.leaf)}</mesh>)}
    </group>
  </group>;
}

function GlowRim(){const m=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{if(m.current)(m.current.material as THREE.MeshBasicMaterial).opacity=0.45+0.35*Math.sin(clock.elapsedTime*4)});
  return <mesh ref={m} rotation-x={-Math.PI/2} position-y={-0.001}><planeGeometry args={[0.42,0.52]}/><meshBasicMaterial color="#ffd66b" transparent opacity={0.6} toneMapped={false}/></mesh>}
function Desk({paper,drawer,caseFile,tidy,onPaper,onDrawer,onCase}:Pick<HouseProps,'paper'|'drawer'|'caseFile'|'tidy'|'onPaper'|'onDrawer'|'onCase'>){
  const c=H().color;
  const box=useRef<THREE.Group>(null),file=useRef<THREE.Group>(null),cover=useRef<THREE.Mesh>(null),sheet=useRef<THREE.Group>(null);
  useFrame((_,dt)=>{const k=still()?1:1-Math.exp(-dt*4);
    if(box.current)box.current.position.z=THREE.MathUtils.lerp(box.current.position.z,drawer==='open'?0.2:0,k);
    if(file.current){const shown=caseFile!=='hidden';const to=caseFile==='rising'?new THREE.Vector3(0.52,1.0,-0.62):tidy?new THREE.Vector3(-0.75,0.79,-0.85):new THREE.Vector3(-0.45,0.79,-0.62);
      file.current.visible=shown;file.current.position.lerp(to,k)}
    if(cover.current)cover.current.rotation.z=THREE.MathUtils.lerp(cover.current.rotation.z,caseFile==='open'?-2.6:0,k);
    if(sheet.current){const to=tidy?new THREE.Vector3(-0.66,0.775,-0.75):new THREE.Vector3(-0.18,0.772,-0.5);sheet.current.position.lerp(to,k)}});
  return <group>
    {/* the desk top runs from the player's lap to 보리 */}
    <mesh position={[0,0.73,-0.45]} castShadow receiveShadow><boxGeometry args={[2.0,0.06,1.25]}/>{S(c.desk)}</mesh>
    <mesh position={[0,0.7,0.18]}><boxGeometry args={[2.0,0.02,0.02]}/>{S(c.deskEdge)}</mesh>
    {[[-0.94,-1.0],[0.94,-1.0],[-0.94,0.1],[0.94,0.1]].map(([x,z],i)=><mesh key={i} position={[x,0.35,z]}><boxGeometry args={[0.07,0.7,0.07]}/>{S(c.deskEdge)}</mesh>)}
    {/* today's quiz sheet: a tap opens it */}
    {paper!=='none'&&<group ref={sheet} position={[-0.18,0.772,-0.5]} rotation-y={0.04}>
      <mesh rotation-x={-Math.PI/2} onClick={tap(onPaper)} name="house-paper" receiveShadow><planeGeometry args={[0.34,0.44]}/>{S(c.paper)}</mesh>
      {[0,1,2,3,4].map(i=><mesh key={i} rotation-x={-Math.PI/2} position={[-0.02,0.001,-0.15+i*0.06]}><planeGeometry args={[i?0.24:0.18,0.012]}/>{S(c.ink)}</mesh>)}
      {/* 유저 워크플로우 1장: on the first lesson only the quiz paper lights up until it is tapped */}
      {paper==='glow'&&<GlowRim/>}
      {paper==='done'&&<mesh rotation-x={-Math.PI/2} position={[0.1,0.002,0.14]}><ringGeometry args={[0.035,0.05,24]}/><meshBasicMaterial color={c.stamp}/></mesh>}
    </group>}
    {/* the drawer unit on the right: a lock and the level plate until the case file unlocks */}
    <group position={[0.55,0.76,-0.95]} scale={0.75}>
      <mesh position={[0,0.12,-0.02]} castShadow><boxGeometry args={[0.46,0.24,0.42]}/>{S(c.deskEdge)}</mesh>
      <group ref={box}>
        <mesh position={[0,0.12,0.2]} onClick={tap(onDrawer)} name="house-drawer"><boxGeometry args={[0.42,0.2,0.04]}/>{S(c.desk)}</mesh>
        <mesh position={[0,0.13,0.23]}><boxGeometry args={[0.14,0.025,0.025]}/>{S(c.brass)}</mesh>
        {drawer==='locked'&&<group position={[0,0.07,0.235]}>
          <mesh><boxGeometry args={[0.05,0.05,0.02]}/>{S(c.lock)}</mesh>
          <mesh position-y={0.035}><torusGeometry args={[0.018,0.006,6,14,Math.PI]}/>{S(c.lock)}</mesh>
        </group>}
      </group>

    </group>
    {/* the case file: brown board covers tied with a string */}
    <group ref={file} position={[-0.45,0.79,-0.62]} rotation-y={0.12} visible={false} onClick={tap(onCase)} name="house-case">
      <mesh castShadow><boxGeometry args={[0.36,0.03,0.46]}/>{S(c.file)}</mesh>
      <mesh ref={cover} position={[0.18,0.02,0]}><boxGeometry args={[0.001,0.001,0.001]}/>{S(c.file)}</mesh>
      <mesh position={[0,0.017,0]} rotation-x={-Math.PI/2}><planeGeometry args={[0.02,0.46]}/>{S(c.string)}</mesh>
      <mesh position={[0,0.018,0.05]} rotation-x={-Math.PI/2}><planeGeometry args={[0.16,0.08]}/>{S(c.paper)}</mesh>
    </group>
  </group>;
}

// 보리 across the desk: sits so its eyes are level with the player's, looks at the player, points with its right hand
function Bori({point,paws,mood,onBori}:{point:Point;paws:Paws;mood:string;onBori:()=>void}){
  const {scene}=useGLTF(MODELS.analyst('bori'));
  const model=useMemo(()=>{const root=scene.clone(true);
    root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;const src=m.material as THREE.MeshStandardMaterial;
      m.material=src.name==='eye'||src.name==='frame'||src.name==='brow'?new THREE.MeshStandardMaterial({color:'#1d1f24',roughness:0.3}):soft('#'+src.color.getHexString(THREE.SRGBColorSpace))});
    return fixBoriPatch(root)},[scene]);
  const parts=useMemo(()=>({body:model.getObjectByName('body'),head:model.getObjectByName('head'),armR:model.getObjectByName('arm_r'),armL:model.getObjectByName('arm_l'),
    eyes:[model.getObjectByName('eye_l'),model.getObjectByName('eye_r')].filter(Boolean) as THREE.Object3D[]}),[model]);
  const rest=useMemo(()=>({r:parts.armR?.rotation.clone(),l:parts.armL?.rotation.clone(),eyeY:parts.eyes[0]?.scale.y??1}),[parts]);
  // the face (x_<emotion>_ pieces, like the garden 보리)
  useEffect(()=>{const by=new Map<string,THREE.Object3D[]>(),eyes=new Set<string>();
    model.traverse(o=>{const m=/^x_([a-z]+)_(.*)$/.exec(o.name);if(!m)return;if(!by.has(m[1]))by.set(m[1],[]);by.get(m[1])!.push(o);if(m[2].startsWith('eye'))eyes.add(m[1])});
    const cur=by.has(mood)?mood:'neutral';for(const [e,l] of by)for(const o of l)o.visible=e===cur;for(const o of parts.eyes)o.visible=!eyes.has(cur);
    hooks().house&&((window as {__proto3d?:{boriFace?:string}}).__proto3d!.boriFace=cur)},[model,mood,parts]);
  const blink=useRef(2);
  useFrame(({clock},dt)=>{const t=clock.elapsedTime,k=1-Math.exp(-Math.min(dt,0.1)*6);
    const aim=point?HOUSE_SPOTS[point]:null;
    if(parts.body){parts.body.position.y=0.42+Math.sin(t*2)*0.01;parts.body.rotation.y=THREE.MathUtils.lerp(parts.body.rotation.y,paws==='door-turn'?-0.75:aim?Math.atan2(aim[0],1.4)*0.6:0,k)}
    if(parts.head){const down=point==='paper'||point==='case'||point==='drawer'?0.35:point==='door'?-0.05:0.02;
      parts.head.rotation.x=THREE.MathUtils.lerp(parts.head.rotation.x,down+Math.sin(t*0.7)*0.03,k);
      parts.head.rotation.y=THREE.MathUtils.lerp(parts.head.rotation.y,point==='door'?-1.0:point==='drawer'?-0.5:point==='case'?0.35:Math.sin(t*0.5)*0.05,k)}
    // the model's own arms stay under the desk: the paws on top do the reaching (PawsOnDesk)
    if(parts.armR&&rest.r)parts.armR.rotation.copy(rest.r);if(parts.armL&&rest.l)parts.armL.rotation.copy(rest.l);
    blink.current-=dt;const shut=blink.current<0.12;if(blink.current<0)blink.current=2.5+Math.random()*3;for(const e of parts.eyes)e.scale.y=rest.eyeY*(shut?0.15:1)});
  const b=H().bori;
  return <group position={[0,b.y,-1.5]} rotation-y={0} scale={b.scale} onClick={tap(onBori)} name="house-bori"><primitive object={model}/></group>;
}


// 선생님 (피드백 2026-11-21, the team's bear drawing): an orange bear in pink round glasses across the desk, built from
// simple shapes in the room's soft materials. Looks where the lesson points, nods a little, blinks; smiles (closed arcs)
// when the day goes well. Replaces 보리 in the room; the paws on the desk (PawsOnDesk) are hers.
export function Teacher({point,paws,mood,onBori}:{point:Point;paws:Paws;mood:string;onBori:()=>void}){
  const T=H().teacher,head=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),eyes=useRef<THREE.Group>(null);
  const m=useMemo(()=>({fur:soft(T.fur),light:soft(T.light),ear:soft(T.ear),muzzle:soft(T.muzzle),dark:new THREE.MeshStandardMaterial({color:T.dark,roughness:0.45}),
    pink:new THREE.MeshStandardMaterial({color:T.pink,roughness:0.4}),lens:new THREE.MeshStandardMaterial({color:'#ffe0ea',transparent:true,opacity:0.22,roughness:0.1,depthWrite:false}),
    blush:new THREE.MeshStandardMaterial({color:'#ff8fa8',transparent:true,opacity:0.5,roughness:1,depthWrite:false}),scarf:soft(T.scarf)}),[T]);
  const smile=mood==='happy';
  // the glasses' arms: from the outer rim back to the ear
  const temple=useMemo(()=>{const q=(sx:number)=>new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0.28*sx,0.04,-0.57).normalize());return {r:q(1),l:q(-1)}},[]);
  useEffect(()=>{const w=window as {__proto3d?:{boriFace?:string}};if(w.__proto3d)w.__proto3d.boriFace=mood},[mood]);
  const blink=useRef(2);
  useFrame(({clock},dt)=>{const t=clock.elapsedTime,k=1-Math.exp(-Math.min(dt,0.1)*6),aim=point?HOUSE_SPOTS[point]:null;
    if(body.current){body.current.position.y=Math.sin(t*2)*0.012;body.current.rotation.y=THREE.MathUtils.lerp(body.current.rotation.y,paws==='door-turn'?-0.6:aim?Math.atan2(aim[0],1.4)*0.5:0,k)}
    const h=head.current;if(h){const down=point==='paper'||point==='case'||point==='drawer'?0.16:point==='door'?-0.05:0.04;
      h.rotation.x=THREE.MathUtils.lerp(h.rotation.x,down+(still()?0:Math.sin(t*1.2)*0.04),k);h.rotation.z=still()?0:Math.sin(t*0.6)*0.03;
      h.rotation.y=THREE.MathUtils.lerp(h.rotation.y,point==='door'?-0.9:point==='drawer'?-0.45:point==='case'?0.3:Math.sin(t*0.5)*0.05,k)}
    blink.current-=dt;const shut=!smile&&blink.current<0.12;if(blink.current<0)blink.current=2.5+Math.random()*3;if(eyes.current)eyes.current.scale.y=shut?0.15:1});
  const sp=(r:number)=><sphereGeometry args={[r,32,22]}/>;
  return <group position={[0,T.y,-1.5]} scale={T.scale} onClick={tap(onBori)} name="house-bori">
    <group ref={body}>
      {/* body, the little scarf like the garden friends wear, legs tucked under the desk */}
      <mesh position={[0,1.65,0]} scale={[1,1.05,0.85]} material={m.fur} castShadow>{sp(0.8)}</mesh>
      <mesh position={[0,1.62,0.5]} scale={[0.75,0.8,0.35]} material={m.light}>{sp(0.6)}</mesh>
      <mesh position={[0,2.3,0.05]} rotation-x={Math.PI/2} material={m.scarf} castShadow><torusGeometry args={[0.52,0.11,12,32]}/></mesh>
      <group ref={head} position={[0,2.75,0]}>
        <mesh scale={[1.08,0.95,1]} material={m.fur} castShadow>{sp(0.85)}</mesh>
        {[-1,1].map(s=><group key={s}><mesh position={[0.62*s,0.62,-0.05]} scale={[1,1,0.7]} material={m.fur} castShadow>{sp(0.3)}</mesh>
          <mesh position={[0.62*s,0.62,0.12]} scale={[1,1,0.4]} material={m.ear}>{sp(0.17)}</mesh></group>)}
        <mesh position={[0,-0.22,0.66]} scale={[1.15,0.75,0.6]} material={m.muzzle}>{sp(0.32)}</mesh>
        <mesh position={[0,-0.12,0.83]} scale={[1.3,0.85,0.8]} material={m.dark}>{sp(0.09)}</mesh>
        {[-1,1].map(s=><mesh key={s} position={[0.055*s,-0.28,0.84]} rotation-z={Math.PI} material={m.dark}><torusGeometry args={[0.055,0.018,8,16,Math.PI]}/></mesh>)}
        <group ref={eyes} position={[0,0.04,0]}>
          {[-1,1].map(s=>smile?<mesh key={s} position={[0.33*s,0,0.81]} rotation-y={-0.4*s} material={m.dark}><torusGeometry args={[0.1,0.026,10,20,Math.PI]}/></mesh>
            :<mesh key={s} position={[0.31*s,-0.02,0.8]} scale={[0.8,mood==='curious'?1.25:1.05,0.5]} material={m.dark}>{sp(0.09)}</mesh>)}
        </group>
        {[-1,1].map(s=><group key={s}>
          <mesh position={[0.48*s,-0.2,0.66]} rotation-y={0.6*s} scale={[1.2,0.6,0.3]} material={m.blush}>{sp(0.13)}</mesh>
          {/* the pink round glasses: rims, lenses, the arms back to the ears */}
          <mesh position={[0.33*s,0.04,0.9]} rotation-y={-0.3*s} material={m.pink}><torusGeometry args={[0.27,0.05,14,40]}/></mesh>
          <mesh position={[0.33*s,0.04,0.9]} rotation-y={-0.3*s} material={m.lens}><circleGeometry args={[0.25,32]}/></mesh>
          <mesh position={[0.72*s,0.08,0.535]} quaternion={s<0?temple.l:temple.r} material={m.pink}><cylinderGeometry args={[0.028,0.028,0.64,10]}/></mesh>
        </group>)}
        <mesh position={[0,0.08,0.95]} rotation-z={Math.PI/2} material={m.pink}><cylinderGeometry args={[0.033,0.033,0.14,10]}/></mesh>
      </group>
    </group>
  </group>;
}

// 9-3 the two front paws on the far end of the desk (the model's arms are too short to show over it). Each state of the
// day gives them a place and a motion that keeps going there: tapping the sheet, holding it, resting on the side that
// was stamped, pointing at the plate, beckoning to the door, pressing the case file while the right one follows the work.
type V3=[number,number,number];
// lead: which paw does the motion (the right unless the place is on the left of the desk: the near paw reaches,
// so no arm crosses the desk; feedback 2026-11-20 "보리 팔이 길게 늘어나")
const PAW_AT:Record<Paws,{r:V3;l:V3;move:'bob'|'tap'|'push'|'hold'|'wave'|'point'|'press';lead?:'l'}>={
  rest:{r:[0.2,0.785,-0.98],l:[-0.2,0.785,-0.98],move:'bob'},
  push:{r:[-0.1,0.79,-0.7],l:[-0.26,0.79,-0.72],move:'push'},
  'tap-paper':{r:[-0.06,0.79,-0.66],l:[-0.22,0.785,-0.98],move:'tap'},
  hold:{r:[-0.03,0.788,-0.7],l:[-0.33,0.788,-0.7],move:'hold'},
  'mark-0':{r:[-0.27,0.79,-0.46],l:[-0.33,0.788,-0.7],move:'tap'},
  'mark-1':{r:[-0.09,0.79,-0.46],l:[-0.33,0.788,-0.7],move:'tap'},
  plate:{r:[0.4,0.93,-0.86],l:[-0.2,0.785,-0.98],move:'point'},
  door:{r:[0.42,1.12,-1.18],l:[-0.2,0.785,-0.98],move:'wave'},
  'door-turn':{r:[0.5,1.16,-1.32],l:[0.05,0.82,-1.08],move:'wave'},
  'tap-case':{r:[0.2,0.785,-0.98],l:[-0.4,0.82,-0.7],move:'tap',lead:'l'},
  'case-docs':{r:[0.2,0.785,-0.98],l:[-0.6,0.8,-0.78],move:'tap',lead:'l'},
  'case-compare':{r:[-0.15,0.8,-0.62],l:[-0.5,0.815,-0.78],move:'tap'},
  'case-note':{r:[0.32,0.8,-0.66],l:[-0.5,0.815,-0.78],move:'tap'},
  'case-board':{r:[0.12,1.08,-1.0],l:[-0.5,0.815,-0.78],move:'point'},
};
function Paw({side,paws}:{side:'r'|'l';paws:Paws}){
  const P=H().paws,paw=useRef<THREE.Group>(null),arm=useRef<THREE.Mesh>(null),cur=useRef(new THREE.Vector3(...PAW_AT.rest[side])),first=useRef(true);
  const sh=useMemo(()=>new THREE.Vector3(...(side==='r'?P.shoulderR:P.shoulderL)),[side,P]);
  const fur=useMemo(()=>soft(P.fur),[P.fur]),pad=useMemo(()=>soft(P.pad),[P.pad]);
  useFrame(({clock},dt)=>{const g=paw.current,a=arm.current;if(!g||!a)return;const t=clock.elapsedTime+(side==='l'?0.7:0),s=PAW_AT[paws],to=new THREE.Vector3(...s[side]);
    // the motion that keeps going in place (the left paw only holds or presses; the moving one is the right)
    const lead=(s.lead?side===s.lead:side==='r')||s.move==='hold'||s.move==='push';
    if(!still()&&lead){const m=s.move;
      if(m==='tap')to.y+=Math.max(0,Math.sin(t*5.5))*0.035;
      else if(m==='push')to.z+=(Math.sin(t*1.6)*0.5+0.5)*0.12,to.y+=0.01;
      else if(m==='hold')to.x+=Math.sin(t*1.3)*0.006*(side==='r'?1:-1),to.y+=Math.sin(t*2.1)*0.004;
      else if(m==='wave')to.x+=Math.sin(t*4)*0.07,to.y+=Math.abs(Math.cos(t*4))*0.03;
      else if(m==='point')to.addScaledVector(to.clone().sub(sh).normalize(),Math.sin(t*3)*0.025);
      else to.y+=Math.sin(t*2)*0.006}
    else if(!still()&&s.move!=='press')to.y+=Math.sin(t*2)*0.004;
    // an arm never stretches past its reach: a place further off is pointed at from as far as it goes
    // (measured flat on the desk: the paw keeps its height, so it still lands on the desk top)
    const fx=to.x-sh.x,fz=to.z-sh.z,fl=Math.hypot(fx,fz);if(fl>P.reach){to.x=sh.x+fx/fl*P.reach;to.z=sh.z+fz/fl*P.reach}
    cur.current.lerp(to,still()||first.current?1:1-Math.exp(-Math.min(dt,0.1)*P.ease));first.current=false;
    g.position.copy(cur.current);g.lookAt(sh.x,cur.current.y,sh.z);g.rotateY(Math.PI);
    const mid=cur.current.clone().add(sh).multiplyScalar(0.5),len=cur.current.distanceTo(sh);
    a.position.copy(mid);a.scale.set(1,len,1);a.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),cur.current.clone().sub(sh).normalize());
    const hk=hooks().house;if(hk){hk.pawAt??={r:[],l:[]};hk.pawAt[side]=cur.current.toArray()}});
  return <>
    <mesh ref={arm} material={fur} castShadow><cylinderGeometry args={[P.arm,P.arm*1.15,1,12]}/></mesh>
    <group ref={paw} name={'house-paw-'+side}>
      <mesh material={fur} scale={P.size} castShadow><sphereGeometry args={[1,18,12]}/></mesh>
      {[-0.035,0,0.035].map((x,i)=><mesh key={i} material={pad} position={[x,0.012,0.066]} scale={[0.017,0.013,0.016]}><sphereGeometry args={[1,10,8]}/></mesh>)}
    </group>
  </>;
}
function PawsOnDesk({paws}:{paws:Paws}){return <><Paw side="r" paws={paws}/><Paw side="l" paws={paws}/></>}

export function HouseScene(p:HouseProps){
  useEffect(()=>{hooks().house={cam:p.cam,point:p.point,paws:p.paws,door:p.door,drawer:p.drawer,caseFile:p.caseFile,paper:p.paper,points:hooks().house?.points??{}}},[p.cam,p.point,p.paws,p.door,p.drawer,p.caseFile,p.paper]);
  useEffect(()=>()=>{hooks().house=undefined},[]);
  const c=H().color;
  return <>
    <color attach="background" args={[c.wall]}/>
    <hemisphereLight args={['#fff4e2','#8a6a50',1.1]}/>
    <ambientLight intensity={0.35}/>
    <directionalLight position={[-2.5,3.2,-1.5]} intensity={1.6} color="#ffe2b8" castShadow shadow-mapSize={[1024,1024]}/>
    <pointLight position={[0,2.3,0.2]} intensity={0.8} distance={6} color="#fff0d6"/>
    <Cam cam={p.cam}/>
    <Room door={p.door} onDoor={p.onDoor}/>
    <Desk {...p}/>
    <Teacher point={p.point} paws={p.paws} mood={p.mood} onBori={p.onBori}/>
    <PawsOnDesk paws={p.paws}/>
  </>;
}
export function House3D(p:HouseProps){
  return <Canvas className="hs-canvas" shadows dpr={[1,1.75]} gl={{antialias:true}} camera={{fov:52,near:0.05,far:40,position:[0,1.18,0.6]}}>
    <HouseScene {...p}/>
  </Canvas>;
}
