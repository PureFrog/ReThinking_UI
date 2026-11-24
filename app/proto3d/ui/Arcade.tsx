'use client';
// 오락실 (피드백 2026-11-24 "오락실 들어가면 3인칭 공간 안에 닌자 게임 할 수 있게"): one room seen from behind me (3인칭).
// Three cabinets stand along the back wall; the middle one runs 닌자 포트폴리오 (a teammate's prototype, restyled to our paper
// UI: public/arcade/ninja/index.html), the two beside it are still covered ("준비 중"). A tap on the floor walks me there;
// a tap on the ninja cabinet walks me up to it and the game opens over the room (its own page in a frame, portrait,
// at most 440 wide). 나가기 goes back out to the village, by the arcade's door.
// Room coordinates: x across, z toward the camera, y up, floor at 0.
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {Explorer} from '../Explorer3D';
import {soft} from '../materials';
import {LOOK} from '../look';
import {cue} from '../../core/sound';
import type {Look} from '../../core/wardrobe';

export const ARCADE_GAME='/arcade/ninja/index.html';
const ROOM={w:9,d:7,h:3.4};
type Cab={id:string;x:number;title:string;sub:string;body:string;trim:string;open:boolean};
const CABS:Cab[]=[
  {id:'soon-l',x:-2.6,title:'준비 중',sub:'곧 들어와요',body:'#b9d6f2',trim:'#8ab8e2',open:false},
  {id:'ninja',x:0,title:'닌자 포트폴리오',sub:'눌러서 시작',body:'#ffb8c8',trim:'#f08aa4',open:true},
  {id:'soon-r',x:2.6,title:'준비 중',sub:'곧 들어와요',body:'#c6e9b8',trim:'#94cc7e',open:false},
];
const CAB_Z=-ROOM.d/2+0.75;
const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const START={x:0,z:1.6};

// a cabinet's screen: its title drawn on a canvas, lit when it runs a game
function screenTex(c:Cab){
  const cv=document.createElement('canvas');cv.width=256;cv.height=200;const g=cv.getContext('2d')!;
  const gr=g.createLinearGradient(0,0,0,200);gr.addColorStop(0,c.open?'#fff3d6':'#f5efe4');gr.addColorStop(1,c.open?'#ffd0dc':'#e6ddd0');g.fillStyle=gr;g.fillRect(0,0,256,200);
  g.fillStyle='#2a2620';g.textAlign='center';g.textBaseline='middle';
  if(c.open){g.font='64px sans-serif';g.fillText('🥷',128,70)}
  g.font=`bold ${c.title.length>5?30:36}px "Jua","Gowun Dodum",sans-serif`;g.fillText(c.title,128,c.open?140:90);
  g.font='20px "Gowun Dodum",sans-serif';g.fillStyle='#6f6656';g.fillText(c.sub,128,c.open?176:130);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function Cabinet({c,onPick}:{c:Cab;onPick:()=>void}){
  const tex=useMemo(()=>screenTex(c),[c]),glow=useRef<THREE.MeshBasicMaterial>(null);
  useEffect(()=>()=>tex.dispose(),[tex]);
  useFrame(({clock})=>{if(glow.current&&c.open)glow.current.color.setScalar(0.88+Math.sin(clock.elapsedTime*3)*0.12)});
  return <group position={[c.x,0,CAB_Z]} name={'cab-'+c.id} onClick={e=>{e.stopPropagation();onPick()}}>
    <mesh position-y={0.75} castShadow receiveShadow><boxGeometry args={[1.1,1.5,0.8]}/>{S(c.body)}</mesh>
    {/* the top with the screen leaning back, the marquee over it */}
    <mesh position={[0,1.85,-0.08]} castShadow><boxGeometry args={[1.1,0.75,0.64]}/>{S(c.body)}</mesh>
    <mesh position={[0,1.86,0.25]} rotation-x={-0.18}><planeGeometry args={[0.9,0.7]}/><meshBasicMaterial ref={glow} map={tex} toneMapped={false}/></mesh>
    <mesh position={[0,2.36,0.02]} castShadow><boxGeometry args={[1.18,0.26,0.78]}/>{S(c.trim)}</mesh>
    {/* the control panel: a stick and three buttons */}
    <mesh position={[0,1.42,0.5]} rotation-x={0.35} castShadow><boxGeometry args={[1.1,0.1,0.45]}/>{S(c.trim)}</mesh>
    <mesh position={[-0.28,1.55,0.52]}><cylinderGeometry args={[0.03,0.03,0.18,8]}/>{S('#5c5447')}</mesh>
    <mesh position={[-0.28,1.65,0.52]}><sphereGeometry args={[0.07,12,10]}/>{S('#e8705f')}</mesh>
    {['#e8705f','#6fa8dc','#f2c230'].map((col,i)=><mesh key={col} position={[0.06+i*0.17,1.5,0.54]}><cylinderGeometry args={[0.055,0.055,0.04,14]}/>{S(col)}</mesh>)}
    {/* a cover on the ones not in yet */}
    {!c.open&&<mesh position={[0,1.86,0.27]} rotation-x={-0.18}><planeGeometry args={[0.95,0.75]}/><meshStandardMaterial color="#fffaf0" transparent opacity={0.25}/></mesh>}
    <mesh position-y={1.2} visible={false}><boxGeometry args={[1.3,2.6,1.4]}/></mesh>
  </group>;
}

function Room({onFloor}:{onFloor:(p:THREE.Vector3)=>void}){
  const {w,d,h}=ROOM;
  // a checked floor in two paper colours
  const floor=useMemo(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d')!;
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#c6e8d3':'#fff6e6';g.fillRect(i*32,j*32,32,32)}
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w/2,d/2);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t},[w,d]);
  useEffect(()=>()=>floor.dispose(),[floor]);
  // the back wall: soft pink stripes with the arcade's name in a scalloped sign (bright like the village's paper UI, 2026-11-24 "너무 칙칙해")
  const wall=useMemo(()=>{const cv=document.createElement('canvas');cv.width=1024;cv.height=388;const g=cv.getContext('2d')!;
    for(let i=0;i<16;i++){g.fillStyle=i%2?'#ffd3de':'#ffe8ee';g.fillRect(i*64,0,64,388)}
    g.fillStyle='#fffaf0';g.beginPath();g.roundRect(372,14,280,80,40);g.fill();g.lineWidth=8;g.strokeStyle='#f2a7b8';g.stroke();
    g.fillStyle='#d4708a';g.font='bold 58px "Jua","Gowun Dodum",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('오락실',512,56);
    g.font='40px sans-serif';[[330,56,'#f2c230'],[694,56,'#8ab8e2']].forEach(([x,y,c])=>{g.fillStyle=c as string;g.fillText('★',x as number,y as number)});
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t},[]);
  useEffect(()=>()=>wall.dispose(),[wall]);
  const bulbs=useMemo(()=>Array.from({length:15},(_,i)=>({x:-w/2+0.4+i*(w-0.8)/14,c:['#f2a7b8','#f2c230','#a9c7e8','#bfe0b0'][i%4]})),[w]);
  const balloons:[number,number,number,string][]=[[-4.0,2.1,-2.9,'#f2a7b8'],[-3.6,2.35,-3.0,'#f2c230'],[-3.85,2.5,-2.6,'#a9c7e8'],[3.9,2.2,-2.9,'#bfe0b0'],[3.55,2.4,-3.0,'#f2a7b8'],[3.8,2.55,-2.6,'#f9d38a']];
  return <group>
    <mesh rotation-x={-Math.PI/2} receiveShadow onClick={e=>{e.stopPropagation();if(e.delta<6)onFloor(e.point)}}><planeGeometry args={[w,d+4]}/><meshStandardMaterial map={floor} roughness={0.9}/></mesh>
    <mesh position={[0,h/2,-d/2]} receiveShadow><boxGeometry args={[w,h,0.12]}/>{S('#fff1f4')}</mesh>
    <mesh position={[0,h/2,-d/2+0.065]}><planeGeometry args={[w,h]}/><meshStandardMaterial map={wall} roughness={0.95}/></mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*w/2,h/2,0.6]} receiveShadow><boxGeometry args={[0.12,h,d+3]}/>{S('#ffe9d6')}</mesh>)}
    <mesh position={[0,h,0.6]} rotation-x={Math.PI/2}><planeGeometry args={[w,d+3]}/>{S('#ffe4ea')}</mesh>
    {balloons.map(([x,y,z,c],i)=><group key={i} position={[x,y,z]}><mesh castShadow><sphereGeometry args={[0.22,16,14]}/>{S(c)}</mesh>
      <mesh position-y={-0.6}><cylinderGeometry args={[0.006,0.006,0.95,4]}/>{S('#c9b8a6')}</mesh></group>)}
    {/* a skirting band and a string of little lights along the back wall */}
    <mesh position={[0,0.2,-d/2+0.07]}><boxGeometry args={[w,0.4,0.04]}/>{S('#f5bccb')}</mesh>
    {bulbs.filter(b=>Math.abs(b.x)>1.7).map((b,i)=><mesh key={i} position={[b.x,h-0.35-Math.sin((b.x/w+0.5)*Math.PI)*0.25,-d/2+0.12]}><sphereGeometry args={[0.085,12,10]}/><meshBasicMaterial color={b.c} toneMapped={false}/></mesh>)}
    {/* a round rug where I come in, a bench and a plant */}
    <mesh rotation-x={-Math.PI/2} position={[0,0.01,START.z+0.2]}><circleGeometry args={[1.1,40]}/>{S('#ffd0dc')}</mesh>
    <group position={[-3.6,0,0.6]}><mesh position-y={0.3} castShadow><boxGeometry args={[0.6,0.12,1.6]}/>{S('#f6cf96')}</mesh>
      {[-0.6,0.6].map(z=><mesh key={z} position={[0,0.15,z]}><boxGeometry args={[0.5,0.3,0.1]}/>{S('#e3a873')}</mesh>)}</group>
    <group position={[3.7,0,-0.4]}><mesh position-y={0.2} castShadow><cylinderGeometry args={[0.22,0.17,0.4,14]}/>{S('#f2a7b8')}</mesh>
      <mesh position-y={0.7} castShadow><sphereGeometry args={[0.42,16,12]}/>{S('#8fd18a')}</mesh></group>
  </group>;
}

// me: walks to where the floor was tapped, then faces the way it went (or the cabinet it came to)
function Me({look,to,face,onArrive}:{look:Look;to:{x:number;z:number;at:number};face:number|null;onArrive:()=>void}){
  const g=useRef<THREE.Group>(null),moving=useRef(false),p=useRef(new THREE.Vector3(START.x,0,START.z)),done=useRef(to.at);
  const {camera,size}=useThree(),tall=size.width<size.height;
  useFrame((_,dt)=>{const gr=g.current;if(!gr)return;const t=Math.min(dt,0.05),dx=to.x-p.current.x,dz=to.z-p.current.z,d=Math.hypot(dx,dz);
    moving.current=d>0.04;
    if(moving.current){const st=Math.min(d,3.2*t);p.current.x+=dx/d*st;p.current.z+=dz/d*st;const yaw=Math.atan2(dx,dz);
      gr.rotation.y+=Math.atan2(Math.sin(yaw-gr.rotation.y),Math.cos(yaw-gr.rotation.y))*Math.min(1,10*t)}
    else{if(face!==null)gr.rotation.y+=Math.atan2(Math.sin(face-gr.rotation.y),Math.cos(face-gr.rotation.y))*Math.min(1,8*t);
      if(done.current!==to.at){done.current=to.at;onArrive()}}
    gr.position.copy(p.current);
    // the camera behind me, a little up, sliding after me
    const c=camera as THREE.PerspectiveCamera,want=new THREE.Vector3(p.current.x*0.55,tall?3.6:3.0,p.current.z+(tall?6.8:5.2));
    c.position.lerp(want,Math.min(1,4*t));c.lookAt(p.current.x*0.7,tall?1.1:1.2,p.current.z-1.6);
    const fov=tall?62:46;if(c.fov!==fov){c.fov=fov;c.updateProjectionMatrix()}});
  useEffect(()=>{const c=camera;c.position.set(0,3.4,START.z+6.5);c.lookAt(0,1.1,START.z-1.6)},[camera]);
  return <group ref={g} name="arcade-me" scale={LOOK.explorer.scale*1.2}><Suspense fallback={null}><Explorer look={look} moving={moving}/></Suspense></group>;
}

export function Arcade({look,onOut,hud}:{look:Look;onOut:()=>void;hud?:React.ReactNode}){
  const [to,setTo]=useState({x:START.x,z:START.z,at:0});
  const [face,setFace]=useState<number|null>(Math.PI);
  const [then,setThen]=useState<string|null>(null);
  const [playing,setPlaying]=useState(false);
  const [say,setSay]=useState('가운데 기계를 누르면 닌자 게임을 할 수 있어.');
  const [ready,setReady]=useState(false);
  const clamp=(x:number,z:number)=>({x:Math.max(-ROOM.w/2+0.6,Math.min(ROOM.w/2-0.6,x)),z:Math.max(CAB_Z+0.95,Math.min(ROOM.d/2+0.8,z))});
  const walk=(x:number,z:number,after:string|null=null,f:number|null=null)=>{const q=clamp(x,z);setTo({...q,at:Date.now()});setThen(after);setFace(f)};
  const pick=(c:Cab)=>{if(!c.open){setSay('이 기계는 아직 준비 중이야. 곧 새 게임이 들어와.');walk(c.x,CAB_Z+1.05,null,Math.PI);return}
    setSay('닌자 포트폴리오! 기계 앞으로 가 볼게.');walk(c.x,CAB_Z+1.05,c.id,Math.PI)};
  const arrive=()=>{if(then==='ninja'){setThen(null);cue('capsule-mark');setPlaying(true)}};
  // test hooks (tests/e2e): where I am, and open the game straight away
  useEffect(()=>{const w=window as unknown as {__proto3d?:Record<string,unknown>};if(!w.__proto3d)w.__proto3d={};
    w.__proto3d.arcade={playing,pick:(id:string)=>{const c=CABS.find(x=>x.id===id);if(c)pick(c)}};return()=>{if(w.__proto3d)delete w.__proto3d.arcade}});// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!playing)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setPlaying(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[playing]);
  return <div className="ac" data-testid="arcade" data-playing={playing}>
    <Canvas shadows dpr={[1,1.5]} camera={{fov:50,near:0.1,far:60}} onCreated={()=>setReady(true)} frameloop={playing?'never':'always'}>
      <color attach="background" args={['#fff3ec']}/>
      <hemisphereLight args={['#fffaf2','#f2c9d2',1.15]}/>
      <ambientLight intensity={0.12} color="#fff2e8"/>
      <directionalLight position={[3,6,5]} intensity={1.25} color="#fff4e2" castShadow shadow-mapSize={[1024,1024]} shadow-bias={-0.0004}/>
      <pointLight position={[0,2.4,CAB_Z+0.8]} intensity={4} distance={4} color="#ffc6d4"/>
      <Room onFloor={p=>{setSay('');walk(p.x,p.z)}}/>
      {CABS.map(c=><Cabinet key={c.id} c={c} onPick={()=>pick(c)}/>)}
      <Me look={look} to={to} face={face} onArrive={arrive}/>
    </Canvas>
    <div className="ac-top">
      <button type="button" className="rt-btn ac-out" onClick={onOut}>← 나가기</button>
      <b className="ac-name">오락실</b>
      {!playing&&<span className="ac-hud">{hud}</span>}
    </div>
    {ready&&say&&!playing&&<p className="ac-say" role="status">{say}</p>}
    {playing&&<div className="ac-game" role="dialog" aria-label="닌자 포트폴리오">
      <div className="ac-frame"><iframe src={ARCADE_GAME} title="닌자 포트폴리오" allow="autoplay"/></div>
      <button type="button" className="rt-btn ac-stop" onClick={()=>{setPlaying(false);setSay('또 하고 싶으면 기계를 다시 눌러.')}}>그만하기</button>
    </div>}
  </div>;
}
