'use client';
// 오락실 (피드백 2026-11-24 "오락실 들어가면 3인칭 공간 안에 닌자 게임 할 수 있게"): one room seen from behind me (3인칭).
// Three cabinets stand along the back wall; the middle one runs 닌자 포트폴리오 (a teammate's prototype, restyled to our paper
// UI: public/arcade/ninja/index.html), the two beside it are still covered ("준비 중"). A tap on the floor walks me there;
// a tap on the ninja cabinet walks me up to it and the game opens over the room (its own page in a frame, portrait,
// at most 440 wide). 나가기 goes back out to the village, by the arcade's door.
// Room coordinates: x across, z toward the camera, y up, floor at 0.
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {Explorer} from '../Explorer3D';
import {SeatHits,LOG_TOP,type SeatSpot} from '../Seats';
import {soft} from '../materials';
import {RoomFollow} from '../RoomView';
import {LOOK} from '../look';
import {cue,arcadeMusic} from '../../core/sound';
import type {Look} from '../../core/wardrobe';

export const ARCADE_GAME='/arcade/ninja/index.html';
// 피드백 2026-11-26: the left machine is 분산 바구니 now (public/arcade/basket); it reports its score for coins
const GAMES:Record<string,{src:string;title:string}>={ninja:{src:ARCADE_GAME,title:'닌자 포트폴리오'},basket:{src:'/arcade/basket/index.html',title:'분산 바구니'}};
const ROOM={w:9,d:7,h:5.4};   // tall enough that a phone's view up past the cabinets stays inside the room
type Cab={id:string;x:number;title:string;sub:string;body:string;trim:string;open:boolean};
const CABS:Cab[]=[
  {id:'basket',x:-2.6,title:'분산 바구니',sub:'눌러서 시작',body:'#a9c7e8',trim:'#6f9cc9',open:true},
  {id:'ninja',x:0,title:'닌자 포트폴리오',sub:'눌러서 시작',body:'#f2a7b8',trim:'#d4708a',open:true},
  {id:'soon-r',x:2.6,title:'준비 중',sub:'곧 들어와요',body:'#bfe0b0',trim:'#7fb06a',open:false},
];
const CAB_Z=-ROOM.d/2+0.75;
const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
const START={x:0,z:1.6};

// a cabinet's screen: its title drawn on a canvas, lit when it runs a game
function screenTex(c:Cab){
  const cv=document.createElement('canvas');cv.width=256;cv.height=200;const g=cv.getContext('2d')!;
  if(!c.open){const gr=g.createLinearGradient(0,0,0,200);gr.addColorStop(0,'#20243a');gr.addColorStop(1,'#12141f');g.fillStyle=gr;g.fillRect(0,0,256,200);
    g.fillStyle='#ffffff10';for(let y=0;y<200;y+=4)g.fillRect(0,y,256,1);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
  // 피드백 2026-11-26 "파란색은 닌자 포트폴리오가 아니잖아": the left cabinet shows 분산 바구니's own title screen: the orchard's
  // canopy, fruit falling, the basket, the combo
  if(c.id==='basket'){const sk=g.createLinearGradient(0,0,0,200);sk.addColorStop(0,'#7fc4ea');sk.addColorStop(0.7,'#cfeaf6');sk.addColorStop(1,'#9fd07a');g.fillStyle=sk;g.fillRect(0,0,256,200);
    for(let i=0;i<7;i++){g.fillStyle=i%2?'#4f9a45':'#6db24f';g.beginPath();g.arc(i*42+10,4,30,0,7);g.fill()}
    g.fillStyle='#7ab35a';g.fillRect(0,182,256,18);
    g.font='22px serif';g.textAlign='center';g.textBaseline='middle';[['🍎',40,118],['🍊',214,96],['🍇',70,150],['🍐',190,140],['⭐',150,112],['🐛',224,160]].forEach(([e,x,y])=>g.fillText(e as string,x as number,y as number));
    g.fillStyle='#b9824a';g.beginPath();g.moveTo(98,160);g.lineTo(158,160);g.lineTo(150,182);g.lineTo(106,182);g.closePath();g.fill();g.fillStyle='#d9a35a';g.fillRect(94,155,68,7);
    g.font='bold 30px "Jua",sans-serif';g.lineWidth=6;g.strokeStyle='#2b5a2a';g.strokeText('분산 바구니',128,58);g.fillStyle='#ffd447';g.fillText('분산 바구니',128,58);
    g.font='bold 16px "Jua",sans-serif';g.lineWidth=4;g.strokeStyle='#7a3b00';g.strokeText('COMBO ×5',128,88);g.fillStyle='#fff';g.fillText('COMBO ×5',128,88);
    g.font='bold 12px monospace';g.fillStyle='#2b5a2a';g.fillText('HI-SCORE 012500',128,194);
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
  // 피드백 2026-11-26: the ninja cabinet shows a real title screen: night sky, a moon, rooftops, the title in pixel-gold, a
  // little ninja, the high score (the blinking GAME START! sits on top, StartBlink)
  const sky=g.createLinearGradient(0,0,0,200);sky.addColorStop(0,'#1a1440');sky.addColorStop(1,'#4a2a6a');g.fillStyle=sky;g.fillRect(0,0,256,200);
  g.fillStyle='#fff6d0';for(let i=0;i<30;i++)g.fillRect((i*67)%256,(i*29)%110,2,2);
  g.fillStyle='#ffe9a8';g.beginPath();g.arc(206,40,20,0,7);g.fill();g.fillStyle='#4a2a6a';g.beginPath();g.arc(214,34,18,0,7);g.fill();
  g.fillStyle='#120c26';[[0,150,60],[50,135,50],[95,155,70],[160,140,45],[200,150,56]].forEach(([x,y,w])=>{g.fillRect(x,y,w,200-y);g.beginPath();g.moveTo(x-6,y);g.lineTo(x+w/2,y-14);g.lineTo(x+w+6,y);g.fill()});
  g.textAlign='center';g.textBaseline='middle';g.font='bold 30px "Jua",sans-serif';g.lineWidth=6;g.strokeStyle='#5a1f3a';
  g.strokeText('닌자',128,42);g.fillStyle='#ffd447';g.fillText('닌자',128,42);g.strokeText('포트폴리오',128,76);g.fillStyle='#ff8fb0';g.fillText('포트폴리오',128,76);
  const px=(x:number,y:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,5,5)};const ninja=['..KKK..','.KKKKK.','.KWWWK.','KKKKKKK','.RKKKR.','..KKK..','.K...K.'];
  ninja.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!=='.')px(110+x*4,96+y*4,ch==='K'?'#22202e':ch==='W'?'#fff0d6':'#e8405a')}));
  g.font='bold 13px monospace';g.fillStyle='#8cf07a';g.fillText('HI-SCORE 099999',128,186);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
// GAME START! blinking over the ninja screen
function StartBlink(){
  const ref=useRef<THREE.Mesh>(null);
  const tex=useMemo(()=>{const cv=document.createElement('canvas');cv.width=256;cv.height=48;const g=cv.getContext('2d')!;g.textAlign='center';g.textBaseline='middle';
    g.font='bold 30px "Jua",sans-serif';g.lineWidth=6;g.strokeStyle='#1a1440';g.strokeText('GAME START!',128,26);g.fillStyle='#ffffff';g.fillText('GAME START!',128,26);
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t},[]);
  useEffect(()=>()=>tex.dispose(),[tex]);
  useFrame(({clock})=>{if(ref.current)ref.current.visible=Math.floor(clock.elapsedTime*2.2)%2===0});
  return <mesh ref={ref} position={[0,-0.17,0.004]}><planeGeometry args={[0.6,0.11]}/><meshBasicMaterial map={tex} transparent toneMapped={false}/></mesh>;
}
function Cabinet({c,onPick}:{c:Cab;onPick:()=>void}){
  const tex=useMemo(()=>screenTex(c),[c]),glow=useRef<THREE.MeshBasicMaterial>(null);
  useEffect(()=>()=>tex.dispose(),[tex]);
  useFrame(({clock})=>{if(glow.current&&c.open)glow.current.color.setScalar(0.88+Math.sin(clock.elapsedTime*3)*0.12)});
  return <group position={[c.x,0,CAB_Z]} name={'cab-'+c.id} onClick={e=>{e.stopPropagation();onPick()}}>
    <RoundedBox args={[1.1,1.5,0.8]} radius={0.08} smoothness={3} position-y={0.75} castShadow receiveShadow>{S(c.body)}</RoundedBox>
    {/* the top with the screen leaning back, the marquee over it */}
    <RoundedBox args={[1.1,0.75,0.64]} radius={0.07} smoothness={3} position={[0,1.85,-0.08]} castShadow>{S(c.body)}</RoundedBox>
    {/* 피드백 2026-11-26 "게임화면이 가운데에": the screen sits square in a black bezel in the middle of the head */}
    <group position={[0,1.86,0.255]}>
      <mesh><boxGeometry args={[0.9,0.68,0.02]}/>{S('#14121c')}</mesh>
      <mesh position-z={0.012}><planeGeometry args={[0.8,0.6]}/><meshBasicMaterial ref={glow} map={tex} toneMapped={false}/></mesh>
      <mesh position-z={0.016}><planeGeometry args={[0.8,0.6]}/><meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05}/></mesh>
      {c.open&&<group position-z={0.014}><StartBlink/></group>}
      {!c.open&&<Note x={c.x}/>}
    </group>
    <RoundedBox args={[1.18,0.26,0.78]} radius={0.08} smoothness={3} position={[0,2.36,0.02]} castShadow>{S(c.trim)}</RoundedBox>
    {/* the control panel: a stick and three buttons */}
    <RoundedBox args={[1.1,0.1,0.45]} radius={0.04} smoothness={3} position={[0,1.42,0.5]} rotation-x={0.35} castShadow>{S(c.trim)}</RoundedBox>
    <mesh position={[-0.28,1.55,0.52]}><cylinderGeometry args={[0.03,0.03,0.18,8]}/>{S('#5c5447')}</mesh>
    <mesh position={[-0.28,1.65,0.52]}><sphereGeometry args={[0.07,12,10]}/>{S('#e8705f')}</mesh>
    {['#e8705f','#6fa8dc','#f2c230'].map((col,i)=><mesh key={col} position={[0.06+i*0.17,1.5,0.54]}><cylinderGeometry args={[0.055,0.055,0.04,14]}/>{S(col)}</mesh>)}
    {/* 피드백 2026-11-25: the ones not in yet have a paper taped over the screen, "점검 중" */}
    <mesh position-y={1.2} visible={false}><boxGeometry args={[1.3,2.6,1.4]}/></mesh>
  </group>;
}

// the paper taped over a closed cabinet's screen
function noteTex(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=200;const g=cv.getContext('2d')!;
  g.fillStyle='#fbf6e8';g.fillRect(10,14,236,176);g.strokeStyle='#e3d8bd';g.lineWidth=2;g.strokeRect(10,14,236,176);
  g.fillStyle='#f3d76bcc';g.save();g.translate(40,18);g.rotate(-0.5);g.fillRect(-26,-9,52,18);g.restore();
  g.save();g.translate(216,18);g.rotate(0.5);g.fillRect(-26,-9,52,18);g.restore();
  g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c4432f';g.font='bold 52px "Jua","Gowun Dodum",sans-serif';g.fillText('점검 중',128,86);
  g.fillStyle='#5a5040';g.font='22px "Gowun Dodum",sans-serif';g.fillText('게임 준비 중이에요',128,140);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function Note({x}:{x:number}){
  const tex=useMemo(noteTex,[]);useEffect(()=>()=>tex.dispose(),[tex]);
  return <mesh position={[0,0,0.03]} rotation={[0,0,x<0?0.06:-0.05]}><planeGeometry args={[0.8,0.62]}/><meshBasicMaterial map={tex} transparent toneMapped={false}/></mesh>;
}
// wall posters (canvas): a coin slot call and a high score board
type PosterKind='coin'|'score'|'ninja'|'soon'|'invader'|'champ'|'basket';
function posterTex(kind:PosterKind){
  if(kind==='ninja'||kind==='soon'||kind==='invader'||kind==='champ'||kind==='basket'){const cv=document.createElement('canvas');cv.width=256;cv.height=340;const g=cv.getContext('2d')!;
    const bg={ninja:'#2a1f3d',soon:'#1f2d3d',invader:'#101828',champ:'#3d1f2a',basket:'#1f3d2a'}[kind],line={ninja:'#ff5fa2',soon:'#ffd447',invader:'#8cf07a',champ:'#ffd447',basket:'#8fd0ff'}[kind];
    g.fillStyle=bg;g.fillRect(0,0,256,340);g.strokeStyle=line;g.lineWidth=8;g.strokeRect(10,10,236,320);g.textAlign='center';g.textBaseline='middle';
    if(kind==='ninja'){g.fillStyle='#ffe9f0';g.font='bold 34px "Jua",sans-serif';g.fillText('닌자',128,60);g.fillText('포트폴리오',128,100);g.font='110px sans-serif';g.fillText('🥷',128,210);g.fillStyle='#ffd447';g.font='bold 24px "Jua",sans-serif';g.fillText('지금 플레이',128,300)}
    if(kind==='soon'){g.fillStyle='#ffd447';g.font='bold 40px "Jua",sans-serif';g.fillText('COMING',128,110);g.fillText('SOON',128,160);g.fillStyle='#e8f6ff';g.font='24px "Jua","Gowun Dodum",sans-serif';g.fillText('새 게임 준비 중',128,240);g.font='60px sans-serif';g.fillText('🕹️',128,295)}
    if(kind==='basket'){g.fillStyle='#e8ffe8';g.font='bold 36px "Jua",sans-serif';g.fillText('분산',128,60);g.fillText('바구니',128,102);g.font='54px sans-serif';g.fillText('🍎🍊🍇',128,175);g.fillText('🧺',128,240);g.fillStyle='#ffd447';g.font='bold 24px "Jua",sans-serif';g.fillText('NEW! 지금 플레이',128,300)}
    if(kind==='invader'){const px=(x:number,y:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,14,14)};const sh=['..X.....X..','...X...X...','..XXXXXXX..','.XX.XXX.XX.','XXXXXXXXXXX','X.XXXXXXX.X','X.X.....X.X','...XX.XX...'];
      sh.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch==='X')px(51+x*14,90+y*14,'#8cf07a')}));g.fillStyle='#e8f6ff';g.font='bold 30px "Jua",sans-serif';g.fillText('GAME OVER?',128,260);g.font='22px "Jua",sans-serif';g.fillText('PRESS START',128,300)}
    if(kind==='champ'){g.font='100px sans-serif';g.fillText('🏆',128,130);g.fillStyle='#ffd447';g.font='bold 34px "Jua",sans-serif';g.fillText('이달의 챔피언',128,230);g.fillStyle='#ffe9f0';g.font='28px "Jua",sans-serif';g.fillText('보리',128,280)}
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
  return posterTex0(kind);
}
function posterTex0(kind:'coin'|'score'){
  const cv=document.createElement('canvas');cv.width=256;cv.height=340;const g=cv.getContext('2d')!;
  g.fillStyle=kind==='coin'?'#3a1f5c':'#122a3d';g.fillRect(0,0,256,340);
  g.strokeStyle=kind==='coin'?'#ff5fa2':'#4fe3ff';g.lineWidth=8;g.strokeRect(10,10,236,320);
  g.textAlign='center';g.textBaseline='middle';
  if(kind==='coin'){g.fillStyle='#ffd447';g.font='bold 46px "Jua",sans-serif';g.fillText('INSERT',128,100);g.fillText('COIN',128,152);
    g.beginPath();g.arc(128,240,44,0,Math.PI*2);g.fillStyle='#f2c230';g.fill();g.fillStyle='#8a6a10';g.font='bold 44px sans-serif';g.fillText('C',128,242)}
  else{g.fillStyle='#4fe3ff';g.font='bold 36px "Jua",sans-serif';g.fillText('HIGH SCORE',128,62);g.font='26px "Jua","Gowun Dodum",sans-serif';
    [['1','보리','99,999'],['2','루온','87,210'],['3','토리','75,040'],['4','모아','61,500']].forEach(([n,w,sc],i)=>{const y=130+i*50;g.fillStyle=i===0?'#ffd447':'#e8f6ff';
      g.textAlign='left';g.fillText(n+'. '+w,34,y);g.textAlign='right';g.fillText(sc,226,y);g.textAlign='center'})}
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function Poster({kind,position,rotY,size=[1.2,1.6]}:{kind:PosterKind;position:[number,number,number];rotY:number;size?:[number,number]}){
  const tex=useMemo(()=>posterTex(kind),[kind]);useEffect(()=>()=>tex.dispose(),[tex]);
  return <mesh position={position} rotation-y={rotY}><planeGeometry args={size}/><meshBasicMaterial map={tex} toneMapped={false}/></mesh>;
}
// a drinks machine: lit front, rows of cans, a slot
function VendingMachine({position}:{position:[number,number,number]}){
  const cols=['#e8705f','#6fa8dc','#f2c230','#8cf07a','#ff9fc0'];
  return <group position={position} rotation-y={0.6}>
    <mesh position-y={0.95} castShadow><boxGeometry args={[0.8,1.9,0.6]}/>{S('#4fa3d9')}</mesh>
    <mesh position={[-0.08,1.15,0.305]}><planeGeometry args={[0.56,1.2]}/><meshStandardMaterial color="#e8f6ff" emissive="#bfe8ff" emissiveIntensity={0.6}/></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[-0.28+(i%4)*0.13,0.7+Math.floor(i/4)*0.36,0.32]}><cylinderGeometry args={[0.04,0.04,0.12,10]}/>{S(cols[i%cols.length])}</mesh>)}
    <mesh position={[0.3,1.2,0.31]}><boxGeometry args={[0.1,0.4,0.02]}/>{S('#2a2233')}</mesh>
    <mesh position={[0,0.25,0.31]}><boxGeometry args={[0.5,0.14,0.02]}/>{S('#2a2233')}</mesh>
    <mesh position={[0,1.95,0.02]}><boxGeometry args={[0.82,0.12,0.62]}/>{S('#ff6fa8')}</mesh>
  </group>;
}
// a gumball machine on a stand
function Gumball({position}:{position:[number,number,number]}){
  const balls=useMemo(()=>Array.from({length:22},(_,i)=>({p:[Math.cos(i*2.4)*0.11*((i%3)/3+0.4),0.98+Math.floor(i/6)*0.05,Math.sin(i*2.4)*0.11*((i%3)/3+0.4)] as [number,number,number],c:['#ff5fa2','#ffd447','#4fe3ff','#8cf07a','#b47bff'][i%5]})),[]);
  return <group position={position}>
    <mesh position-y={0.4}><cylinderGeometry args={[0.05,0.12,0.8,12]}/>{S('#e8705f')}</mesh>
    <mesh position-y={0.86}><cylinderGeometry args={[0.14,0.16,0.14,16]}/>{S('#e8705f')}</mesh>
    {balls.map((b,i)=><mesh key={i} position={b.p}><sphereGeometry args={[0.03,8,6]}/>{S(b.c)}</mesh>)}
    <mesh position-y={1.05}><sphereGeometry args={[0.18,18,14]}/><meshStandardMaterial color="#e8f6ff" transparent opacity={0.25} depthWrite={false}/></mesh>
    <mesh position-y={1.25}><cylinderGeometry args={[0.05,0.07,0.05,12]}/>{S('#e8705f')}</mesh>
  </group>;
}
// a claw machine by the right wall (피드백 2026-11-26 "디테일"): a glass case on a pink base, full of little plush bears
// and chicks heaped up, a gold frame round the glass, a lit sign on top, a claw on a rail that roams, a control
// panel with a stick and a button, a prize chute and a coin slot
function Plush({kind,color,position,rot}:{kind:number;color:string;position:[number,number,number];rot:number}){
  return <group position={position} rotation={[0.2*Math.sin(rot*3),rot,0.15*Math.cos(rot*2)]} scale={0.9}>
    {kind===0?<>{/* a bear */}
      <mesh position-y={0.07}><sphereGeometry args={[0.075,12,10]}/>{S(color)}</mesh>
      <mesh position-y={0.16}><sphereGeometry args={[0.06,12,10]}/>{S(color)}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.045,0.21,0]}><sphereGeometry args={[0.022,8,6]}/>{S(color)}</mesh>)}
      <mesh position={[0,0.15,0.052]}><sphereGeometry args={[0.022,8,6]}/>{S('#fff4e6')}</mesh>
      {[-1,1].map(k=><mesh key={'e'+k} position={[k*0.022,0.175,0.054]}><sphereGeometry args={[0.008,6,4]}/>{S('#2a2620')}</mesh>)}</>
    :kind===1?<>{/* a chick */}
      <mesh position-y={0.08}><sphereGeometry args={[0.08,12,10]}/>{S(color)}</mesh>
      <mesh position={[0,0.09,0.075]} rotation-x={Math.PI/2}><coneGeometry args={[0.018,0.04,6]}/>{S('#f28c28')}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.03,0.11,0.065]}><sphereGeometry args={[0.009,6,4]}/>{S('#2a2620')}</mesh>)}</>
    :<>{/* a round bunny */}
      <mesh position-y={0.08}><sphereGeometry args={[0.08,12,10]}/>{S(color)}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.03,0.19,0]} rotation-z={k*0.2}><capsuleGeometry args={[0.018,0.07,4,6]}/>{S(color)}</mesh>)}
      {[-1,1].map(k=><mesh key={'e'+k} position={[k*0.028,0.1,0.072]}><sphereGeometry args={[0.009,6,4]}/>{S('#2a2620')}</mesh>)}</>}
  </group>;
}
function ClawMachine({position}:{position:[number,number,number]}){
  const claw=useRef<THREE.Group>(null),wire=useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{const t=clock.elapsedTime;if(claw.current){claw.current.position.x=Math.sin(t*0.6)*0.3;claw.current.position.z=Math.cos(t*0.45)*0.22;
    const dip=Math.max(0,Math.sin(t*0.9))**8*0.35;claw.current.position.y=1.92-dip;if(wire.current){wire.current.scale.y=1+dip/0.12;wire.current.position.y=0.06+dip/2}}});
  const toys=useMemo(()=>{const cols=['#ff9fc0','#ffd447','#8fd3ff','#b8f28a','#d8a8ff','#ffb27a','#fff4e6','#f28c8c'];const out:{k:number;c:string;p:[number,number,number];r:number}[]=[];
    for(let i=0;i<26;i++){const row=Math.floor(i/9),col=i%9;out.push({k:i%3,c:cols[(i*5)%cols.length],r:i*1.7,p:[-0.38+(col%3)*0.36+((row+col)%2)*0.08,0.92+row*0.1+(col%2)*0.03,-0.3+Math.floor(col/3)*0.3]})}return out},[]);
  return <group position={position} rotation-y={-0.5} name="arcade-claw">
    {/* the base with its prize chute, coin slot and panel */}
    <mesh position-y={0.45} castShadow><boxGeometry args={[1.1,0.9,1.0]}/>{S('#ff6fa8')}</mesh>
    <mesh position={[0,0.82,0.02]}><boxGeometry args={[1.12,0.06,1.02]}/>{S('#ffd447')}</mesh>
    <mesh position={[0.3,0.3,0.505]}><boxGeometry args={[0.34,0.3,0.02]}/>{S('#2a2233')}</mesh>
    <mesh position={[0.3,0.3,0.52]}><planeGeometry args={[0.28,0.22]}/><meshBasicMaterial color="#3a2f4a"/></mesh>
    <mesh position={[-0.3,0.45,0.51]}><boxGeometry args={[0.12,0.18,0.02]}/>{S('#c9a23a')}</mesh>
    <mesh position={[-0.3,0.48,0.525]}><boxGeometry args={[0.02,0.08,0.01]}/>{S('#2a2233')}</mesh>
    <group position={[0,0.88,0.42]}><mesh rotation-x={-0.4}><boxGeometry args={[0.9,0.06,0.22]}/>{S('#ffd447')}</mesh>
      <mesh position={[-0.2,0.08,0]}><cylinderGeometry args={[0.012,0.012,0.12,6]}/>{S('#5c5447')}</mesh><mesh position={[-0.2,0.15,0]}><sphereGeometry args={[0.04,10,8]}/>{S('#e8705f')}</mesh>
      <mesh position={[0.18,0.05,0.02]}><cylinderGeometry args={[0.05,0.05,0.04,14]}/>{S('#6fa8dc')}</mesh></group>
    {/* the plush heap behind the glass */}
    {toys.map((t,i)=><Plush key={i} kind={t.k} color={t.c} position={t.p} rot={t.r}/>)}
    {/* the glass and its gold frame */}
    <mesh position-y={1.45}><boxGeometry args={[1.06,1.1,0.96]}/><meshStandardMaterial color="#cfefff" transparent opacity={0.14} roughness={0.05} depthWrite={false}/></mesh>
    {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b],i)=><mesh key={i} position={[a*0.53,1.45,b*0.48]}><boxGeometry args={[0.04,1.1,0.04]}/>{S('#ffd447')}</mesh>)}
    {/* the claw on its wire */}
    <group ref={claw} position={[0,1.92,0]}>
      <mesh ref={wire} position-y={0.06}><cylinderGeometry args={[0.006,0.006,0.12,4]}/>{S('#d9d9d9')}</mesh>
      <mesh><cylinderGeometry args={[0.04,0.05,0.06,10]}/>{S('#c0c0c0')}</mesh>
      {[0,1,2].map(i=><mesh key={i} position={[Math.cos(i*2.09)*0.04,-0.08,Math.sin(i*2.09)*0.04]} rotation={[Math.sin(i*2.09)*0.5,0,-Math.cos(i*2.09)*0.5]}><boxGeometry args={[0.015,0.12,0.015]}/>{S('#c0c0c0')}</mesh>)}
    </group>
    {/* the lit sign on top */}
    <mesh position-y={2.1} castShadow><boxGeometry args={[1.12,0.2,1.02]}/>{S('#ffd447')}</mesh>
    <mesh position={[0,2.32,0.2]}><boxGeometry args={[0.9,0.26,0.06]}/>{S('#ff6fa8')}</mesh>
    <mesh position={[0,2.32,0.235]}><planeGeometry args={[0.8,0.18]}/><meshBasicMaterial map={useMemo(()=>{const cv=document.createElement('canvas');cv.width=256;cv.height=56;const g=cv.getContext('2d')!;
      g.fillStyle='#ff6fa8';g.fillRect(0,0,256,56);g.fillStyle='#fffbe8';g.font='bold 38px "Jua",sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#fff';g.shadowBlur=8;g.fillText('인형뽑기',128,30);
      const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t},[])} toneMapped={false}/></mesh>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[-0.49+i*0.14,2.2,0.52]}><sphereGeometry args={[0.025,8,6]}/><meshBasicMaterial color={['#ffd447','#8fd3ff','#ff9fc0','#b8f28a'][i%4]} toneMapped={false}/></mesh>)}
  </group>;
}

// 피드백 2026-11-26 "벽 조명 더 리얼하게": a festoon string: a dark wire sagging in three swags between hooks, each bulb a
// little black socket and a glass bulb with a soft halo, twinkling a little out of step
let haloTex:THREE.Texture|null=null;
function halo(){if(haloTex)return haloTex;const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d')!;
  const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,0.9)');r.addColorStop(0.25,'rgba(255,255,255,0.35)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,64,64);haloTex=new THREE.CanvasTexture(cv);return haloTex}
function StringLights({bulbs,z}:{bulbs:{x:number;c:string}[];z:number}){
  const x0=bulbs[0].x-0.2,x1=bulbs[bulbs.length-1].x+0.2,swags=3,top=3.2,sag=0.32;
  const yAt=(x:number)=>{const u=(x-x0)/(x1-x0)*swags,f=u-Math.floor(u);return top-Math.sin(f*Math.PI)*sag};
  const wire=useMemo(()=>{const pts:THREE.Vector3[]=[];for(let i=0;i<=120;i++){const x=x0+(x1-x0)*i/120;pts.push(new THREE.Vector3(x,yAt(x),z))}
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),240,0.008,5,false)},[x0,x1,z]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>wire.dispose(),[wire]);
  const mats=useRef<(THREE.MeshBasicMaterial|null)[]>([]),hal=useRef<(THREE.SpriteMaterial|null)[]>([]);
  useFrame(({clock})=>{const t=clock.elapsedTime;bulbs.forEach((_,i)=>{const k=0.82+0.18*Math.sin(t*1.7+i*2.3)*Math.sin(t*0.6+i);
    const h=hal.current[i];if(h)h.opacity=0.35*k;const m=mats.current[i];if(m)m.color.set(bulbs[i].c).multiplyScalar(0.85+k*0.25)})});
  return <group name="arcade-string-lights">
    <mesh geometry={wire}>{S('#151218')}</mesh>
    {Array.from({length:swags+1},(_,i)=>{const x=x0+(x1-x0)*i/swags;return <mesh key={'h'+i} position={[x,top+0.02,z-0.02]}><sphereGeometry args={[0.025,8,6]}/>{S('#8a8a8a')}</mesh>})}
    {bulbs.map((b,i)=>{const y=yAt(b.x);return <group key={i} position={[b.x,y,z]}>
      <mesh position-y={-0.035}><cylinderGeometry args={[0.022,0.022,0.05,10]}/>{S('#1c1a20')}</mesh>
      <mesh position-y={-0.1} scale={[1,1.25,1]}><sphereGeometry args={[0.045,14,12]}/><meshBasicMaterial ref={el=>{mats.current[i]=el}} color={b.c} toneMapped={false}/></mesh>
      <mesh position={[-0.014,-0.085,0.03]}><sphereGeometry args={[0.01,6,5]}/><meshBasicMaterial color="#ffffff" transparent opacity={0.7}/></mesh>
      <sprite position={[0,-0.1,0.02]} scale={[0.36,0.36,1]}><spriteMaterial ref={el=>{hal.current[i]=el}} map={halo()} color={b.c} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/></sprite>
    </group>})}
  </group>;
}
// 피드백 2026-11-26 "러그도 리얼하게": a round woven arcade rug: rings in the room's neon colours, a ring of pixel stars,
// a joystick-and-coin medallion, a fringe-like edge and wool grain
function ArcadeRug({at}:{at:[number,number,number]}){
  const t=useMemo(()=>{const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d')!;const C=256;
    [[250,'#1b1532'],[236,'#f2a7b8'],[226,'#3b2f6b'],[180,'#4fe3ff'],[172,'#2a2252'],[110,'#ffd447'],[102,'#3b2f6b']].forEach(([r,c])=>{g.fillStyle=c as string;g.beginPath();g.arc(C,C,r as number,0,7);g.fill()});
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2,x=C+Math.cos(a)*203,y=C+Math.sin(a)*203;g.save();g.translate(x,y);g.rotate(a);g.fillStyle=['#ff5fa2','#ffd447','#8cf07a','#b47bff'][k%4];
      [[0,-2],[-1,-1],[0,-1],[1,-1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[1,1]].forEach(([i,j])=>g.fillRect(i*5-2,j*5-2,5,5));g.restore()}
    for(let k=0;k<24;k++){const a=k/24*Math.PI*2;g.strokeStyle='#ffffff30';g.lineWidth=2;g.beginPath();g.moveTo(C+Math.cos(a)*112,C+Math.sin(a)*112);g.lineTo(C+Math.cos(a)*170,C+Math.sin(a)*170);g.stroke()}
    g.fillStyle='#ff5fa2';g.beginPath();g.arc(C,C+20,40,0,7);g.fill();g.fillStyle='#22202e';g.fillRect(C-6,C-60,12,70);g.fillStyle='#e8405a';g.beginPath();g.arc(C,C-64,24,0,7);g.fill();
    g.fillStyle='#fff6d0';g.beginPath();g.arc(C-8,C-72,7,0,7);g.fill();
    for(let i=0;i<40000;i++){g.fillStyle=`rgba(${Math.random()<0.5?'255,255,255':'0,0,0'},${0.04+Math.random()*0.05})`;g.fillRect(Math.random()*512,Math.random()*512,1,2)}
    for(let k=0;k<180;k++){const a=k/180*Math.PI*2;g.strokeStyle='#e8dcc8';g.lineWidth=2;g.beginPath();g.moveTo(C+Math.cos(a)*246,C+Math.sin(a)*246);g.lineTo(C+Math.cos(a)*255,C+Math.sin(a)*255);g.stroke()}
    const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=4;return tx},[]);
  useEffect(()=>()=>t.dispose(),[t]);
  return <mesh rotation-x={-Math.PI/2} position={at} receiveShadow name="arcade-rug"><circleGeometry args={[1.25,64]}/><meshStandardMaterial map={t} color="#d8d0e0" roughness={1} transparent alphaTest={0.1}/></mesh>;
}
// 피드백 2026-11-26 "가구를 다 통과": what I can't walk through (circles: x, z, radius); the cabinets are boxes
const BLOCK:[number,number,number][]=[[3.5,0.3,0.85],[-3.75,2.2,0.6],[-3.6,0.6,0.55],[-3.6,1.15,0.4],[-3.6,0.05,0.4],[-3.85,-1.0,0.3],[2.6,2.5,0.85]];
const ME_R=0.3;
export function blocked(x:number,z:number){
  if(z<CAB_Z+0.42+ME_R&&CABS.some(c=>Math.abs(x-c.x)<0.6+ME_R))return true;
  return BLOCK.some(([bx,bz,r])=>Math.hypot(x-bx,z-bz)<r+ME_R);
}

// the sign over the cabinets
function signTex(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=140;const g=cv.getContext('2d')!;
  g.fillStyle='#4a3443';g.beginPath();g.roundRect(4,4,504,132,40);g.fill();
  g.strokeStyle='#f2a7b8';g.lineWidth=6;g.beginPath();g.roundRect(14,14,484,112,32);g.stroke();
  g.fillStyle='#ffe9f0';g.shadowColor='#ff8fb0';g.shadowBlur=18;g.textAlign='center';g.textBaseline='middle';
  g.font='bold 72px "Jua","Gowun Dodum",sans-serif';g.fillText('오락실',256,74);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function Room({onFloor}:{onFloor:(p:THREE.Vector3)=>void}){
  const {w,d,h}=ROOM;
  // a checked floor in two paper colours
  const floor=useMemo(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d')!;
    // an arcade carpet: deep navy with bright confetti
    g.fillStyle='#1d1838';g.fillRect(0,0,128,128);const cols=['#ff5fa2','#4fe3ff','#ffd447','#8cf07a','#b47bff'];
    for(let k=0;k<18;k++){g.fillStyle=cols[k%cols.length]+'b0';const x=(k*47)%128,y=(k*83)%128;if(k%3===0){g.beginPath();g.arc(x,y,3,0,7);g.fill()}
      else if(k%3===1){g.beginPath();g.moveTo(x,y-4);g.lineTo(x+4,y+3);g.lineTo(x-4,y+3);g.fill()}else g.fillRect(x-1,y-5,3,10)}
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w/1.1,d/1.1);t.colorSpace=THREE.SRGBColorSpace;return t},[w,d]);
  useEffect(()=>()=>floor.dispose(),[floor]);
  const sign=useMemo(signTex,[]);useEffect(()=>()=>sign.dispose(),[sign]);
  const bulbs=useMemo(()=>Array.from({length:15},(_,i)=>({x:-w/2+0.4+i*(w-0.8)/14,c:['#f2a7b8','#f2c230','#a9c7e8','#bfe0b0'][i%4]})),[w]);
  return <group>
    <mesh rotation-x={-Math.PI/2} receiveShadow onClick={e=>{e.stopPropagation();if(e.delta<6)onFloor(e.point)}}><planeGeometry args={[w,d+4]}/><meshStandardMaterial map={floor} roughness={0.9}/></mesh>
    <mesh position={[0,h/2,-d/2]} receiveShadow><boxGeometry args={[w,h,0.12]}/>{S('#2e2654')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*w/2,h/2,0.6]} receiveShadow><boxGeometry args={[0.12,h,d+3]}/>{S('#29224b')}</mesh>)}
    {/* the ceiling, a band where the wall meets it, and the sign */}
    <mesh position={[0,h,0.6]} rotation-x={Math.PI/2}><planeGeometry args={[w,d+3]}/>{S('#1b1733')}</mesh>
    <mesh position={[0,h-0.25,-d/2+0.08]}><boxGeometry args={[w,0.5,0.04]}/>{S('#3a2f66')}</mesh>
    {/* neon tubes: pink along the top of the back wall, cyan along the floor, and down both side walls */}
    <mesh position={[0,h-0.55,-d/2+0.1]}><boxGeometry args={[w-0.3,0.05,0.05]}/><meshBasicMaterial color="#ff5fa2" toneMapped={false}/></mesh>
    <mesh position={[0,0.45,-d/2+0.1]}><boxGeometry args={[w-0.3,0.04,0.04]}/><meshBasicMaterial color="#4fe3ff" toneMapped={false}/></mesh>
    {[-1,1].map(k=><mesh key={'n'+k} position={[k*(w/2-0.08),3.3,0.4]}><boxGeometry args={[0.04,0.05,d+2]}/><meshBasicMaterial color={k<0?'#4fe3ff':'#ff5fa2'} toneMapped={false}/></mesh>)}
    <Poster kind="score" position={[-w/2+0.08,2.2,-0.6]} rotY={Math.PI/2}/>
    <Poster kind="coin" position={[w/2-0.08,2.7,-2.4]} rotY={-Math.PI/2} size={[0.9,1.2]}/>
    <mesh position={[0,3.95,-d/2+0.09]} name="arcade-sign"><planeGeometry args={[3.1,0.85]}/><meshBasicMaterial map={sign} transparent toneMapped={false}/></mesh>
    {/* a skirting band and a string of little lights along the back wall */}
    <mesh position={[0,0.2,-d/2+0.07]}><boxGeometry args={[w,0.4,0.04]}/>{S('#3a2f66')}</mesh>
    <StringLights bulbs={bulbs} z={-d/2+0.14}/>
    {/* a round rug where I come in, a bench and a plant */}
    <ArcadeRug at={[0,0.01,START.z+0.2]}/>
    {/* a glow on the floor in front of each cabinet */}
    {CABS.map(c=><mesh key={'g'+c.id} rotation-x={-Math.PI/2} position={[c.x,0.012,CAB_Z+0.75]}><circleGeometry args={[0.65,32]}/><meshBasicMaterial color={c.trim} transparent opacity={0.28} toneMapped={false}/></mesh>)}
    <group position={[-3.6,0,0.6]}><mesh position-y={0.3} castShadow><boxGeometry args={[0.6,0.12,1.6]}/>{S('#6b4fb3')}</mesh>
      {[-0.6,0.6].map(z=><mesh key={z} position={[0,0.15,z]}><boxGeometry args={[0.5,0.3,0.1]}/>{S('#3a2f66')}</mesh>)}</group>
    <ClawMachine position={[3.5,0,0.3]}/>
    {/* more posters: the ninja game, coming soon, a pixel invader, this month's champion */}
    {/* 피드백 2026-11-26 "푯말을 가리는 포스터": hung in the gaps between the cabinets instead, in thin frames */}
    {([['basket',-1.3,0.03],['ninja',1.3,-0.04]] as const).map(([k,x,r])=><group key={k} position={[x,1.95,-d/2+0.09]} rotation-z={r}>
      <mesh position-z={-0.01}><boxGeometry args={[0.72,0.94,0.03]}/>{S('#1a1626')}</mesh>
      <Poster kind={k} position={[0,0,0.01]} rotY={0} size={[0.64,0.86]}/>
      {[-1,1].map(j=><mesh key={j} position={[j*0.26,0.43,0.02]} rotation-z={j*0.6}><planeGeometry args={[0.12,0.04]}/><meshBasicMaterial color="#f3d76b" transparent opacity={0.85}/></mesh>)}
    </group>)}
    <Poster kind="invader" position={[-w/2+0.08,2.2,1.4]} rotY={Math.PI/2} size={[1.0,1.33]}/>
    <Poster kind="champ" position={[w/2-0.08,2.4,2.0]} rotY={-Math.PI/2} size={[0.9,1.2]}/>
    <VendingMachine position={[-3.75,0,2.2]}/>
    {/* lived in: cans by the bench, a cap left on it, a popcorn bucket, a curl of prize tickets, stray tokens */}
    <group name="arcade-litter">
      {[[-3.2,0.3,'#e8705f'],[-3.05,0.55,'#6fa8dc']].map(([x,z,c])=><mesh key={x as number} position={[x as number,0.06,z as number]} rotation-z={x===-3.05?Math.PI/2:0}><cylinderGeometry args={[0.04,0.04,0.12,10]}/>{S(c as string)}</mesh>)}
      <group position={[-3.6,0.37,0.9]} rotation-y={0.5}><mesh><sphereGeometry args={[0.13,14,10,0,Math.PI*2,0,Math.PI/2]}/>{S('#4fa3d9')}</mesh><mesh position={[0.12,0,0]}><boxGeometry args={[0.16,0.01,0.14]}/>{S('#4fa3d9')}</mesh></group>
      <group position={[-3.55,0.37,0.25]}><mesh position-y={0.1}><cylinderGeometry args={[0.09,0.07,0.2,12]}/>{S('#f4ead2')}</mesh>
        {[0,1,2,3,4,5].map(i=><mesh key={i} position={[Math.cos(i)*0.05,0.22,Math.sin(i)*0.05]}><sphereGeometry args={[0.035,6,5]}/>{S('#fff6d0')}</mesh>)}</group>
      {Array.from({length:7},(_,i)=><mesh key={i} rotation-x={-Math.PI/2} rotation-z={i*0.35} position={[0.9+i*0.12,0.012,CAB_Z+1.6+Math.sin(i)*0.15]}><planeGeometry args={[0.12,0.07]}/>{S(i%2?'#ffd447':'#ff9fc0')}</mesh>)}
      {[[0.4,1.9],[-0.7,2.4],[1.6,0.9],[-1.9,-0.4]].map(([x,z],i)=><mesh key={'t'+i} position={[x,0.012,z]} rotation-x={-Math.PI/2}><circleGeometry args={[0.05,14]}/>{S('#f2c230')}</mesh>)}
    </group>
    <Gumball position={[-3.85,0,-1.0]}/>
    <group position={[2.6,0,2.5]}><mesh position-y={0.42}><cylinderGeometry args={[0.3,0.3,0.04,20]}/>{S('#ff6fa8')}</mesh><mesh position-y={0.21}><cylinderGeometry args={[0.04,0.08,0.42,10]}/>{S('#3a2f66')}</mesh>
      {[-1,1].map(k=><group key={k} position={[k*0.5,0,0.1]}><mesh position-y={0.3}><cylinderGeometry args={[0.15,0.15,0.06,16]}/>{S('#4fe3ff')}</mesh><mesh position-y={0.14}><cylinderGeometry args={[0.025,0.05,0.28,8]}/>{S('#3a2f66')}</mesh></group>)}
      <mesh position={[0.05,0.5,0]}><cylinderGeometry args={[0.04,0.035,0.12,10]}/>{S('#ffd447')}</mesh></group>
    {/* a neon arrow toward the ninja machine */}
    <mesh position={[0,0.8,-d/2+0.1]}><boxGeometry args={[0.5,0.05,0.03]}/><meshBasicMaterial color="#ffd447" toneMapped={false}/></mesh>
  </group>;
}

// me: walks to where the floor was tapped, then faces the way it went (or the cabinet it came to)
function Me({look,to,face,onArrive,seat=null}:{look:Look;to:{x:number;z:number;at:number};face:number|null;onArrive:()=>void;seat?:SeatSpot|null}){
  const sitting=useRef(false),lift=useRef(0);
  const g=useRef<THREE.Group>(null),moving=useRef(false),p=useRef(new THREE.Vector3(START.x,0,START.z)),done=useRef(to.at);
  useFrame((_,dt)=>{const gr=g.current;if(!gr)return;const t=Math.min(dt,0.05),dx=to.x-p.current.x,dz=to.z-p.current.z,d=Math.hypot(dx,dz);
    moving.current=d>0.04;
    if(moving.current){const st=Math.min(d,3.2*t),nx=p.current.x+dx/d*st,nz=p.current.z+dz/d*st;
      // slide along what is in the way; stop if both ways are blocked
      // the last steps onto a seat go into its block (the bench, the stools by the table)
      if(seat&&Math.hypot(seat.x-nx,seat.z-nz)<1.1){p.current.x=nx;p.current.z=nz}else if(!blocked(nx,nz)){p.current.x=nx;p.current.z=nz}else if(!blocked(nx,p.current.z))p.current.x=nx;else if(!blocked(p.current.x,nz))p.current.z=nz;else{to.x=p.current.x;to.z=p.current.z}
      const yaw=Math.atan2(dx,dz);
      gr.rotation.y+=Math.atan2(Math.sin(yaw-gr.rotation.y),Math.cos(yaw-gr.rotation.y))*Math.min(1,10*t)}
    else{if(face!==null)gr.rotation.y+=Math.atan2(Math.sin(face-gr.rotation.y),Math.cos(face-gr.rotation.y))*Math.min(1,8*t);
      if(done.current!==to.at){done.current=to.at;onArrive()}}
    sitting.current=!!seat&&!moving.current&&Math.hypot(seat.x-p.current.x,seat.z-p.current.z)<0.06;
    lift.current+=((sitting.current?seat!.top-LOG_TOP*1.2:0)-lift.current)*Math.min(1,8*t);
    gr.position.copy(p.current);gr.position.y=lift.current;(window as unknown as {__arcadeMe?:{x:number;z:number}}).__arcadeMe={x:p.current.x,z:p.current.z};
    });
  // the camera: the same as every room's (RoomView.tsx)
  return <><RoomFollow me={p} halfW={ROOM.w/2}/><group ref={g} name="arcade-me" scale={LOOK.explorer.scale*1.2}><Suspense fallback={null}><Explorer look={look} moving={moving} sit={sitting}/></Suspense></group></>;
}
// 피드백 2026-11-26 "의자가 있다면 앉을 수": the bench by the wall and the near stool at the snack table
const ARCADE_SEATS:SeatSpot[]=[
  {id:'bench',x:-3.6,z:0.6,top:0.36,face:Math.PI/2,box:[0.7,0.8,1.7],at:[-3.6,0.35,0.6]},
  {id:'stool-l',x:2.1,z:2.6,top:0.33,face:Math.PI/2,box:[0.4,0.7,0.4],at:[2.1,0.3,2.6]}];// (the far stool is left out: the way to it goes through the table)

export function Arcade({look,onOut,hud,onScore}:{look:Look;onOut:()=>void;hud?:React.ReactNode;onScore?:(game:string,score:number)=>{coins:number;note?:string}}){
  const [to,setTo]=useState({x:START.x,z:START.z,at:0});
  const [face,setFace]=useState<number|null>(Math.PI);
  const [then,setThen]=useState<string|null>(null);
  const [playing,setPlayingId]=useState<string|null>(null);const setPlaying=(v:boolean|string)=>setPlayingId(v===true?'ninja':v||null);
  const frame=useRef<HTMLIFrameElement>(null);
  // a game's score: paid by the village (onScore), the answer shown in the game's result card
  useEffect(()=>{const on=(e:MessageEvent)=>{if(e.origin!==location.origin)return;const d=e.data as {type?:string;game?:string;score?:number};if(d?.type!=='rt-arcade-score'||!d.game)return;
    const r=onScore?.(d.game,d.score??0)??{coins:0};frame.current?.contentWindow?.postMessage({type:'rt-arcade-paid',game:d.game,...r},location.origin)};addEventListener('message',on);return()=>removeEventListener('message',on)},[onScore]);
  const [say,setSay]=useState('가운데 기계를 누르면 닌자 게임을 할 수 있어.');
  const [ready,setReady]=useState(false);
  const clamp=(x:number,z:number)=>({x:Math.max(-ROOM.w/2+0.6,Math.min(ROOM.w/2-0.6,x)),z:Math.max(CAB_Z+0.95,Math.min(ROOM.d/2+0.8,z))});
  const [seat,setSeat]=useState<SeatSpot|null>(null);
  const walk=(x:number,z:number,after:string|null=null,f:number|null=null)=>{setSeat(null);const q=clamp(x,z);setTo({...q,at:Date.now()});setThen(after);setFace(f)};
  const pick=(c:Cab)=>{if(!c.open){setSay('이 기계는 아직 준비 중이야. 곧 새 게임이 들어와.');walk(c.x,CAB_Z+1.05,null,Math.PI);return}
    setSay(c.id==='basket'?'분산 바구니! 기계 앞으로 가 볼게.':'닌자 포트폴리오! 기계 앞으로 가 볼게.');walk(c.x,CAB_Z+1.05,c.id,Math.PI)};
  const arrive=()=>{if(then&&GAMES[then]){const id=then;setThen(null);cue('capsule-mark');setPlaying(id)}};
  // test hooks (tests/e2e): where I am, and open the game straight away
  useEffect(()=>{const w=window as unknown as {__proto3d?:Record<string,unknown>};if(!w.__proto3d)w.__proto3d={};
    w.__proto3d.arcade={playing:!!playing,game:playing,pick:(id:string)=>{const c=CABS.find(x=>x.id===id);if(c)pick(c)},walk:(x:number,z:number)=>walk(x,z),me:()=>(window as unknown as {__arcadeMe?:{x:number;z:number}}).__arcadeMe};return()=>{if(w.__proto3d)delete w.__proto3d.arcade}});// eslint-disable-line react-hooks/exhaustive-deps
  // chiptune while I am in here; quiet while the game itself runs
  useEffect(()=>{arcadeMusic(!playing);return()=>arcadeMusic(false)},[playing]);
  useEffect(()=>{if(!playing)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setPlaying(false)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[playing]);
  return <div className="ac" data-testid="arcade" data-playing={!!playing} data-game={playing??undefined}>
    <Canvas shadows dpr={[1,1.5]} camera={{fov:50,near:0.1,far:60}} onCreated={()=>setReady(true)} frameloop={playing?'never':'always'}>
      <color attach="background" args={['#151226']}/>
      {/* night arcade: a soft purple fill, a warm key from the front, coloured pools at the cabinets */}
      <hemisphereLight args={['#e6dcff','#3a2a55',1.05]}/>
      <directionalLight position={[3,6,5]} intensity={1.15} color="#fff1dc" castShadow shadow-mapSize={[1024,1024]}/>
      <pointLight position={[0,2.4,CAB_Z+0.8]} intensity={5} distance={4.5} color="#ffb3cc"/>
      <pointLight position={[-2.6,2.2,CAB_Z+0.9]} intensity={3.5} distance={3.5} color="#8fd3ff"/>
      <pointLight position={[2.6,2.2,CAB_Z+0.9]} intensity={3.5} distance={3.5} color="#b8f28a"/>
      <pointLight position={[3.3,2.6,0.6]} intensity={3} distance={3} color="#ff8fc4"/>
      <Room onFloor={p=>{setSay('');walk(p.x,p.z)}}/>
      {CABS.map(c=><Cabinet key={c.id} c={c} onPick={()=>pick(c)}/>)}
      <SeatHits seats={ARCADE_SEATS} onSit={st=>{if(seat?.id===st.id){walk(START.x,START.z);return}setSay('');setThen(null);setSeat(st);setFace(st.face);setTo({x:st.x,z:st.z,at:Date.now()})}}/>
      <Me look={look} to={to} face={face} onArrive={arrive} seat={seat}/>
    </Canvas>
    <div className="ac-top">
      <button type="button" className="rt-btn ac-out" onClick={onOut}>← 밖으로 나가기</button>
      <b className="ac-name">오락실</b>
      {!playing&&<span className="ac-hud">{hud}</span>}
    </div>
    {ready&&say&&!playing&&<p className="ac-say" role="status">{say}</p>}
    {playing&&<div className="ac-game" role="dialog" aria-label={GAMES[playing].title}>
      <div className="ac-frame"><iframe ref={frame} src={GAMES[playing].src} title={GAMES[playing].title} allow="autoplay"/></div>
      <button type="button" className="rt-btn ac-stop" onClick={()=>{setPlaying(false);setSay('또 하고 싶으면 기계를 다시 눌러.')}}>그만하기</button>
    </div>}
  </div>;
}
