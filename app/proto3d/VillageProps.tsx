'use client';
// 마을 소품 (피드백 2026-11-26 "상인 스탠드 디테일 폭발, 농부 수레에 건초·농기구, 신문 게시판 네모네모"): the merchant's
// stall, the farmer's cart and the news board, made like a 모동숲 village's: real materials (planks, canvas, metal),
// scalloped striped awnings, bunting and bulbs, goods with tags, hay and tools, a roofed board with a chalk header,
// pinned papers of different shapes, a lantern and a bench.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {planks,tmat} from './surfaces';

const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
const P=(m:THREE.Material)=><primitive object={m} attach="material"/>;
const metal=(c='#c0c0c0')=><meshStandardMaterial color={c} metalness={0.7} roughness={0.3}/>;
function canvas(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function useOwn<T extends Record<string,THREE.Material|THREE.Texture>>(make:()=>T){const o=useMemo(make,[]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>Object.values(o).forEach(x=>{(x as THREE.MeshStandardMaterial).map?.dispose?.();x.dispose()}),[o]);return o}
const AWN=(a:string,b:string)=>canvas(256,96,g=>{for(let x=0;x<256;x+=32){g.fillStyle=(x/32)%2?b:a;g.fillRect(x,0,32,72);g.beginPath();g.arc(x+16,72,16,0,Math.PI);g.fill()}
  for(let i=0;i<1500;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*0.05})`;g.fillRect(Math.random()*256,Math.random()*72,1,2)}});

function Bunting({w,y,z,cols}:{w:number;y:number;z:number;cols:string[]}){
  const ref=useRef<THREE.Group>(null);useFrame(({clock})=>{const g=ref.current;if(!g)return;g.children.forEach((c,i)=>{if(i>0)c.rotation.x=Math.sin(clock.elapsedTime*2.2+i)*0.15})});
  const n=Math.round(w/0.18);
  return <group ref={ref} position={[0,y,z]}>
    <mesh rotation-z={Math.PI/2}><cylinderGeometry args={[0.005,0.005,w,4]}/>{M('#5a3d2b')}</mesh>
    {Array.from({length:n},(_,i)=>{const x=-w/2+0.09+i*(w-0.18)/(n-1),sag=-Math.sin((i/(n-1))*Math.PI)*0.12;return <mesh key={i} position={[x,sag-0.07,0]} rotation-z={Math.PI}><coneGeometry args={[0.06,0.13,3]}/><meshStandardMaterial color={cols[i%cols.length]} side={THREE.DoubleSide}/></mesh>})}
  </group>;
}
function Bulbs({w,y,z}:{w:number;y:number;z:number}){
  return <group position={[0,y,z]}>{Array.from({length:9},(_,i)=>{const x=-w/2+i*w/8,sag=-Math.sin(i/8*Math.PI)*0.1;return <mesh key={i} position={[x,sag,0]}><sphereGeometry args={[0.03,8,6]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.4} toneMapped={false}/></mesh>})}</group>;
}

// ------------------------------------------------------------ 상인 가판대 (front: +z, the merchant behind at −z)
export function MerchantStallDetail({open}:{open:boolean}){
  const m=useOwn(()=>({wood:tmat(planks([170,112,70]),1.5,1),dark:tmat(planks([110,70,44]),1,2),awn:new THREE.MeshStandardMaterial({map:AWN('#e8604a','#fff6e6'),side:THREE.DoubleSide,transparent:true,alphaTest:0.1}),
    sign:new THREE.MeshStandardMaterial({map:canvas(256,96,g=>{g.fillStyle='#fff6e6';g.beginPath();g.roundRect(4,4,248,88,30);g.fill();g.strokeStyle='#c4432f';g.lineWidth=6;g.stroke();
      g.fillStyle='#f2c230';g.beginPath();g.arc(42,48,24,0,7);g.fill();g.fillStyle='#8a6a10';g.font='bold 28px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('C',42,50);
      g.fillStyle='#3b2a20';g.font='bold 30px "Jua",sans-serif';g.fillText('가상 종목',150,40);g.font='18px "Jua",sans-serif';g.fillStyle='#c4432f';g.fillText('코인으로 사고팔아요',150,70)}),transparent:true}),
    chalk:new THREE.MeshStandardMaterial({map:canvas(160,200,g=>{g.fillStyle='#2f3a35';g.fillRect(0,0,160,200);g.strokeStyle='#a77d58';g.lineWidth=10;g.strokeRect(0,0,160,200);
      g.fillStyle='#f4efe2';g.font='bold 22px "Jua",sans-serif';g.textAlign='center';g.fillText('오늘의 후보',80,40);g.font='16px "Jua",sans-serif';
      ['▲ 2,450','▼ 1,180','▲ 8,900','▲ 3,310','▼ 640'].forEach((t,i)=>{g.fillStyle=t[0]==='▲'?'#ff9a8a':'#8fd3ff';g.fillText(t,80,74+i*24)});g.fillStyle='#ffd447';g.fillText('★',30,40);g.fillText('★',130,40)})}),
    away:new THREE.MeshStandardMaterial({map:canvas(160,80,g=>{g.fillStyle='#f6ead0';g.fillRect(0,0,160,80);g.strokeStyle='#6a4a36';g.lineWidth=6;g.strokeRect(0,0,160,80);g.fillStyle='#3b2a20';g.font='bold 22px "Jua",sans-serif';g.textAlign='center';g.fillText('잠시 쉬어요',80,36);g.font='16px "Jua",sans-serif';g.fillText('아침 8시에 열어요',80,62)})})}));
  return <group name="merchant-stall-detail">
    {/* the counter: planked, a scalloped skirt, a shelf under it with crates */}
    <mesh position={[0,0.47,0]} castShadow receiveShadow><boxGeometry args={[1.9,0.9,0.75]}/>{P(m.wood)}</mesh>
    <mesh position={[0,0.94,0.02]} castShadow><boxGeometry args={[2.02,0.07,0.85]}/>{P(m.dark)}</mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[-0.88+i*0.16,0.86,0.385]}><circleGeometry args={[0.08,12,Math.PI,Math.PI]}/>{M(i%2?'#fff6e6':'#e8604a')}</mesh>)}
    {/* posts, the curved striped awning with a scalloped edge, the sign, bunting and bulbs */}
    {[-1,1].map(k=>[-0.32,0.32].map(z=><mesh key={k+'-'+z} position={[k*0.92,1.4,z]} castShadow><cylinderGeometry args={[0.04,0.045,1.85,10]}/>{M('#f4efe2')}</mesh>))}
    {[0,1,2,3,4].map(i=>{const a=-0.5+i*0.25;return <mesh key={i} position={[0,2.3+Math.cos(a)*0.06,Math.sin(a)*0.55]} rotation-x={a}><planeGeometry args={[2.25,0.3]}/>{P(m.awn)}</mesh>})}
    <mesh position={[0,2.62,-0.05]} castShadow><boxGeometry args={[1.5,0.42,0.06]}/>{P(m.sign)}</mesh>
    {[-0.6,0.6].map(x=><mesh key={x} position={[x,2.42,-0.05]}><boxGeometry args={[0.04,0.2,0.04]}/>{M('#5a3d2b')}</mesh>)}
    <Bunting w={1.9} y={2.05} z={0.42} cols={['#e8604a','#f2c230','#6aa6d8','#7fae4e','#d46a8c']}/>
    <Bulbs w={1.8} y={1.9} z={0.36}/>
    {open?<group>
      {/* on the counter: saplings in pots with little ticker flags, a jar of coins, a scale, a basket of apples, seed packets */}
      {[-0.7,-0.35,0,0.35].map((x,i)=><group key={x} position={[x,0.98,0.1+(i%2)*0.1]}>
        <mesh position-y={0.07}><cylinderGeometry args={[0.07,0.055,0.14,12]}/>{M(['#c27a55','#e9dcc2','#6aa6d8','#d46a8c'][i])}</mesh>
        <mesh position-y={0.2}><cylinderGeometry args={[0.008,0.01,0.12,5]}/>{M('#6b4a30')}</mesh>
        <mesh position-y={0.3}><sphereGeometry args={[0.07,10,8]}/>{M(['#6db24f','#4f9a45','#9ccf6a','#5f9a4f'][i])}</mesh>
        <mesh position={[0.06,0.33,0]}><cylinderGeometry args={[0.003,0.003,0.18,4]}/>{M('#5a3d2b')}</mesh>
        <mesh position={[0.1,0.39,0]}><planeGeometry args={[0.08,0.05]}/><meshStandardMaterial color={i%2?'#8fd3ff':'#ff9a8a'} side={THREE.DoubleSide}/></mesh></group>)}
      <group position={[0.68,0.98,0.05]}><mesh position-y={0.11}><cylinderGeometry args={[0.09,0.09,0.22,16]}/><meshStandardMaterial color="#e8f6ff" transparent opacity={0.35} roughness={0.05}/></mesh>
        {Array.from({length:10},(_,i)=><mesh key={i} position={[Math.cos(i*2.1)*0.045,0.02+i*0.016,Math.sin(i*2.1)*0.045]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.035,0.035,0.012,12]}/>{metal('#f2c230')}</mesh>)}
        <mesh position-y={0.23}><cylinderGeometry args={[0.095,0.095,0.03,16]}/>{M('#c4432f')}</mesh></group>
      <group position={[0.35,0.98,-0.22]}><mesh position-y={0.1}><cylinderGeometry args={[0.15,0.11,0.16,14,1,true]}/><meshStandardMaterial color="#b08a5a" side={THREE.DoubleSide}/></mesh>
        {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i)*0.07,0.18+(i%2)*0.03,Math.sin(i)*0.07]}><sphereGeometry args={[0.045,10,8]}/>{M(i%3?'#d0533f':'#e2a64b')}</mesh>)}</group>
      {[0,1,2].map(i=><mesh key={i} position={[-0.4+i*0.13,0.99,0.3]} rotation={[-Math.PI/2+0.2,0,(i-1)*0.15]}><planeGeometry args={[0.11,0.15]}/>{M(['#f2c230','#7fae4e','#d46a8c'][i])}</mesh>)}
    </group>:<group>
      {/* away: a cloth over the goods and a hanging sign */}
      <mesh position={[0,1.04,0.02]} scale={[1,0.25,0.6]}><sphereGeometry args={[0.9,20,12,0,Math.PI*2,0,Math.PI/2]}/>{M('#e9dcc2')}</mesh>
      <mesh position={[0,1.55,0.36]}><planeGeometry args={[0.7,0.35]}/>{P(m.away)}</mesh>
      {[-0.25,0.25].map(x=><mesh key={x} position={[x,1.8,0.36]}><cylinderGeometry args={[0.004,0.004,0.18,4]}/>{M('#5a3d2b')}</mesh>)}</group>}
    {/* the chalkboard leaning at the front, crates and a barrel at the side, a lantern on the post */}
    <mesh position={[-1.25,0.45,0.55]} rotation={[-0.2,0.35,0]} castShadow><boxGeometry args={[0.5,0.62,0.03]}/>{P(m.chalk)}</mesh>
    <group position={[1.3,0,0.2]}>{[0,1].map(i=><mesh key={i} position={[0,0.18+i*0.36,i*0.05]} rotation-y={i*0.2} castShadow><boxGeometry args={[0.45,0.34,0.4]}/>{P(m.wood)}</mesh>)}
      {Array.from({length:5},(_,i)=><mesh key={'o'+i} position={[-0.12+(i%3)*0.12,0.78,0.05+Math.floor(i/3)*0.12]}><sphereGeometry args={[0.06,10,8]}/>{M('#f08a2e')}</mesh>)}</group>
    <group position={[1.25,0,-0.45]}><mesh position-y={0.32} castShadow><cylinderGeometry args={[0.24,0.2,0.64,16]}/>{P(m.dark)}</mesh>
      {[0.1,0.54].map(y=><mesh key={y} position-y={y} rotation-x={Math.PI/2}><torusGeometry args={[0.235,0.012,6,24]}/>{metal('#5a5a5a')}</mesh>)}
      {[0,1,2].map(i=><mesh key={i} position={[Math.cos(i*2.1)*0.08,0.8,Math.sin(i*2.1)*0.08]} rotation={[Math.sin(i)*0.2,0,Math.cos(i)*0.2]}><cylinderGeometry args={[0.02,0.02,0.5,6]}/>{M(['#c4432f','#6aa6d8','#f2c230'][i])}</mesh>)}</group>
    <group position={[0.92,1.75,0.36]}><mesh position-y={0.05}><boxGeometry args={[0.12,0.04,0.04]}/>{M('#2f2a28')}</mesh>
      <mesh position={[0.08,-0.08,0]}><boxGeometry args={[0.12,0.16,0.12]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.2} toneMapped={false}/></mesh></group>
    <group position={[-1.3,0,-0.3]}><mesh position-y={0.18}><cylinderGeometry args={[0.18,0.14,0.36,14]}/>{M('#c27a55')}</mesh>
      {[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*1.3)*0.1,0.45+(i%2)*0.06,Math.sin(i*1.3)*0.1]}><sphereGeometry args={[0.08,8,6]}/>{M(i%2?'#f48fb8':'#4f9a45')}</mesh>)}</group>
  </group>;
}

const STRAW=Array.from({length:14},(_,i)=>[-0.6+((i*37)%100)/100*1.2,-0.4+((i*61)%100)/100*0.8,i*0.7]);
// ------------------------------------------------------------ 농부 수레 (the handle toward +x)
export function FarmCartDetail({pile}:{pile:number}){
  const k=pile>0?Math.min(1,0.35+0.12*Math.log2(1+pile)):0;
  const m=useOwn(()=>({wood:tmat(planks([168,116,74]),1,1.5),hay:new THREE.MeshStandardMaterial({map:canvas(64,64,g=>{g.fillStyle='#e2c06a';g.fillRect(0,0,64,64);for(let i=0;i<300;i++){g.strokeStyle=['#c9a24a','#f0d68a','#b8913a'][i%3];g.beginPath();const x=Math.random()*64,y=Math.random()*64;g.moveTo(x,y);g.lineTo(x+Math.random()*10-5,y+8);g.stroke()}}),roughness:1})}));
  return <group name="farm-cart-detail">
    {/* the bed with slatted sides */}
    <mesh position={[0,0.58,0]} castShadow receiveShadow><boxGeometry args={[1.4,0.1,0.95]}/>{P(m.wood)}</mesh>
    {[-1,1].map(s=>[0,1].map(r=><mesh key={s+'-'+r} position={[0,0.72+r*0.17,s*0.47]} castShadow><boxGeometry args={[1.4,0.09,0.04]}/>{P(m.wood)}</mesh>))}
    {[-1,1].map(s=>[-0.66,0,0.66].map(x=><mesh key={s+'p'+x} position={[x,0.78,s*0.47]}><boxGeometry args={[0.06,0.4,0.05]}/>{M('#7a5a40')}</mesh>))}
    <mesh position={[-0.69,0.76,0]}><boxGeometry args={[0.05,0.36,0.95]}/>{P(m.wood)}</mesh>
    {/* spoked wheels with iron rims and hubs, an axle */}
    {[-1,1].map(s=><group key={s} position={[-0.15,0.36,s*0.55]}>
      <mesh><torusGeometry args={[0.33,0.035,8,28]}/>{metal('#4a4440')}</mesh><mesh><torusGeometry args={[0.3,0.03,8,28]}/>{M('#8a6448')}</mesh>
      {Array.from({length:8},(_,j)=><mesh key={j} rotation-z={j*Math.PI/8}><boxGeometry args={[0.6,0.03,0.03]}/>{M('#8a6448')}</mesh>)}
      <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[0.06,0.06,0.1,12]}/>{metal('#4a4440')}</mesh></group>)}
    <mesh position={[-0.15,0.36,0]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.03,0.03,1.15,8]}/>{metal('#4a4440')}</mesh>
    {/* the shafts to hold it by, a prop leg */}
    {[-1,1].map(s=><mesh key={'h'+s} position={[1.05,0.6,s*0.3]} rotation-z={-0.18}><cylinderGeometry args={[0.03,0.03,0.9,8]}/>{M('#7a5a40')}</mesh>)}
    <mesh position={[0.62,0.3,0]}><boxGeometry args={[0.05,0.55,0.05]}/>{M('#7a5a40')}</mesh>
    {/* hay bales, a pitchfork and a shovel leaning, a watering can, sacks; the day's fruit in crates on top */}
    <group position={[-0.3,0.82,-0.12]}>{[0,1].map(i=><mesh key={i} position={[i*0.5,0,0]} rotation-z={Math.PI/2} castShadow><cylinderGeometry args={[0.2,0.2,0.42,14]}/>{P(m.hay)}</mesh>)}
      {[0,1].map(i=>[-0.1,0.1].map(x=><mesh key={i+'-'+x} position={[i*0.5+x,0,0]} rotation-y={Math.PI/2}><torusGeometry args={[0.2,0.008,4,20]}/>{M('#8a6448')}</mesh>))}
      <mesh position={[0.25,0.32,0]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.18,0.18,0.4,14]}/>{P(m.hay)}</mesh></group>
    {STRAW.map(([x,z,r],i)=><mesh key={'s'+i} position={[x,0.64,z]} rotation={[0,r,Math.PI/2]}><cylinderGeometry args={[0.005,0.005,0.16,3]}/>{M('#e2c06a')}</mesh>)}
    <group position={[-0.78,0.75,0.4]} rotation-z={0.25}><mesh><cylinderGeometry args={[0.018,0.018,1.3,6]}/>{M('#a77d58')}</mesh>
      {[-1,0,1].map(j=><mesh key={j} position={[j*0.04,0.72,0]}><coneGeometry args={[0.01,0.18,4]}/>{metal()}</mesh>)}<mesh position-y={0.62}><boxGeometry args={[0.12,0.02,0.02]}/>{metal()}</mesh></group>
    <group position={[-0.8,0.7,-0.38]} rotation-z={0.3}><mesh><cylinderGeometry args={[0.018,0.018,1.1,6]}/>{M('#a77d58')}</mesh><mesh position-y={-0.6} scale={[1,1.3,0.3]}><sphereGeometry args={[0.1,10,8]}/>{metal('#8a8a8a')}</mesh></group>
    <group position={[0.75,0,0.6]}><mesh position-y={0.12}><cylinderGeometry args={[0.11,0.12,0.22,14]}/>{metal('#5f9ec0')}</mesh><mesh position={[0,0.16,0.15]} rotation-x={1.1}><cylinderGeometry args={[0.015,0.025,0.22,8]}/>{metal('#5f9ec0')}</mesh></group>
    <group position={[0.85,0,-0.55]}>{[0,1].map(i=><mesh key={i} position={[i*0.12,0.18+i*0.04,i*0.05]} rotation-z={i*0.3} scale={[1,1.2,0.8]}><sphereGeometry args={[0.17,12,10]}/>{M('#c9b48a')}</mesh>)}</group>
    {k>0&&<group position={[0.35,0.66,0.15]} scale={0.6+k*0.5}>
      <mesh position-y={0.1}><boxGeometry args={[0.42,0.2,0.32]}/>{P(m.wood)}</mesh>
      {Array.from({length:Math.round(4+k*8)},(_,i)=><mesh key={i} position={[-0.14+(i%4)*0.09,0.22+Math.floor(i/4)*0.07,-0.08+(i%3)*0.08]}><sphereGeometry args={[0.05,10,8]}/>{M('#d0533f')}</mesh>)}</group>}
  </group>;
}

// ------------------------------------------------------------ 신문 게시판
export function NewsBoardDetail(){
  const m=useOwn(()=>({wood:tmat(planks([150,104,68]),1,1),cork:new THREE.MeshStandardMaterial({map:canvas(128,64,g=>{g.fillStyle='#c9a26e';g.fillRect(0,0,128,64);for(let i=0;i<1600;i++){g.fillStyle=['#b88f5c','#d9b27e','#a6804e'][i%3];g.fillRect(Math.random()*128,Math.random()*64,1.5,1.5)}}),roughness:1}),
    roof:tmat(planks([120,62,44]),2,1,0.8),
    head:new THREE.MeshStandardMaterial({map:canvas(256,64,g=>{g.fillStyle='#2f3a35';g.fillRect(0,0,256,64);g.strokeStyle='#a77d58';g.lineWidth=6;g.strokeRect(0,0,256,64);g.fillStyle='#f4efe2';g.font='bold 32px "Jua",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('📰 마을 소식',128,34)})}),
    p1:new THREE.MeshStandardMaterial({map:canvas(96,120,g=>{g.fillStyle='#fbf7ec';g.fillRect(0,0,96,120);g.fillStyle='#3b2a20';g.font='bold 14px "Jua",sans-serif';g.fillText('주간 소식',8,20);g.fillStyle='#9c9180';for(let i=0;i<9;i++)g.fillRect(8,30+i*9,70-(i%3)*12,3);g.fillStyle='#8fcbe8';g.fillRect(56,80,32,30)})}),
    p2:new THREE.MeshStandardMaterial({map:canvas(96,96,g=>{g.fillStyle='#fff2c4';g.fillRect(0,0,96,96);g.fillStyle='#c4432f';g.font='bold 16px "Jua",sans-serif';g.textAlign='center';g.fillText('속보!',48,24);g.fillStyle='#9c9180';for(let i=0;i<6;i++)g.fillRect(12,36+i*9,72,3)})}),
    p3:new THREE.MeshStandardMaterial({map:canvas(96,96,g=>{g.fillStyle='#e6f4e0';g.fillRect(0,0,96,96);g.strokeStyle='#4f9a45';g.lineWidth=3;g.beginPath();g.moveTo(8,80);g.lineTo(30,60);g.lineTo(50,68);g.lineTo(88,24);g.stroke();g.fillStyle='#3b2a20';g.font='12px "Jua",sans-serif';g.fillText('코스닥',8,16)})}),
    p4:new THREE.MeshStandardMaterial({map:canvas(96,64,g=>{g.fillStyle='#fde2ea';g.fillRect(0,0,96,64);g.fillStyle='#d46a8c';g.font='bold 13px "Jua",sans-serif';g.textAlign='center';g.fillText('낚시 대회',48,24);g.fillText('토요일!',48,44)})})}));
  const papers:[THREE.Material,number,number,number,number,number][]=[[m.p1,-0.7,1.5,0.5,0.62,0.05],[m.p2,0.02,1.62,0.48,0.48,-0.06],[m.p3,0.68,1.48,0.5,0.5,0.07],[m.p4,-0.15,1.08,0.5,0.34,-0.03],[m.p1,0.62,1.02,0.38,0.46,0.1]];
  return <group name="newsboard-detail">
    {[-1,1].map(k=><mesh key={k} position={[k*1.15,1.05,0]} castShadow><boxGeometry args={[0.14,2.1,0.14]}/>{P(m.wood)}</mesh>)}
    <mesh position={[0,1.32,-0.02]} castShadow><boxGeometry args={[2.2,1.25,0.08]}/>{P(m.wood)}</mesh>
    <mesh position={[0,1.32,0.025]}><planeGeometry args={[2.0,1.07]}/>{P(m.cork)}</mesh>
    {/* the little roof and the chalk header */}
    {[-1,1].map(k=><mesh key={'r'+k} position={[0,2.25,k*0.16]} rotation-x={k*-0.5} castShadow><boxGeometry args={[2.6,0.06,0.42]}/>{P(m.roof)}</mesh>)}
    <mesh position={[0,2.02,0.05]}><planeGeometry args={[1.4,0.32]}/>{P(m.head)}</mesh>
    {papers.map(([mat,x,y,w,h,r],i)=><group key={i} position={[x,y,0.04]} rotation-z={r}><mesh><planeGeometry args={[w,h]}/>{P(mat)}</mesh>
      <mesh position={[0,h/2-0.04,0.01]}><sphereGeometry args={[0.025,8,6]}/>{M(['#c4432f','#4f7fb8','#f2c230','#4f9a45','#d46a8c'][i])}</mesh></group>)}
    {/* a rolled bundle of today's papers on a little shelf, a lantern, a bench in front */}
    <mesh position={[0,0.62,0.1]}><boxGeometry args={[2.0,0.05,0.22]}/>{P(m.wood)}</mesh>
    {[0,1,2,3].map(i=><mesh key={i} position={[-0.5+i*0.13,0.7,0.12]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.05,0.05,0.2,10]}/>{M('#f4efe2')}</mesh>)}
    <mesh position={[0.4,0.7,0.12]} rotation-x={-1.3}><planeGeometry args={[0.3,0.2]}/>{P(m.p2)}</mesh>
    <group position={[1.15,2.05,0.12]}><mesh position={[0,0,0]}><boxGeometry args={[0.04,0.04,0.2]}/>{M('#2f2a28')}</mesh>
      <mesh position={[0,-0.14,0.12]}><boxGeometry args={[0.14,0.2,0.14]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.1} toneMapped={false}/></mesh></group>
    <group position={[0,0,1.1]}><mesh position-y={0.4} castShadow><boxGeometry args={[1.4,0.07,0.36]}/>{P(m.wood)}</mesh>
      {[-0.6,0.6].map(x=><mesh key={x} position={[x,0.2,0]}><boxGeometry args={[0.08,0.4,0.3]}/>{M('#7a5a40')}</mesh>)}</group>
    {[-1.35,1.35].map(x=><group key={'f'+x} position={[x,0,0.2]}>{[0,1,2].map(i=><mesh key={i} position={[(i-1)*0.1,0.12,(i%2)*0.08]}><sphereGeometry args={[0.09,8,6]}/>{M(i===1?'#f48fb8':'#6db24f')}</mesh>)}</group>)}
  </group>;
}
