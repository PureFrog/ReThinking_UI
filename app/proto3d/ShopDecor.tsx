'use client';
// 상점 안 꾸미기 (피드백 2026-11-26 "상인의 방 너무 휑해: 데코, 소품, 가구, 재질, 조명, 마루, 벽지, 벽에 파는 물건"):
//  ShopShell   per shop: plank floor with grain, wainscot + patterned wallpaper, crown moulding, ceiling beams, two
//              pendant lamps with warm light, a side window with a view and a flower box
//  BuilderDecor 건물 상점: shelves of little model houses (each roof, windows, door and chimney different), potted plants
//              of many kinds, paving samples, a lamp-post and a fountain model, all with price tags; on the walls
//              blueprints, a framed village map, a pegboard of tools and hanging planters; on the floor a display table
//              of house models, soil sacks, a crate of flower pots, a sapling barrel, a blueprint bin, a tall tree;
//              on the counter an old cash register, a bell, a ledger, a tape measure
//  TailorDecor  옷 가게: racks of clothes on hangers, folded stacks, a mannequin, a long mirror, hat stands, fabric bolts
// Room as Shop3D: w 7 (x ±3.5), d 5 (back wall z -2.5), h 3.6; the counter at z 0.2, the keeper at z -0.9.
import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {soft} from './materials';

const W=7,D=5,H=3.6,BACK=-D/2;
const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
const brass=()=><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/>;
function tex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void,rep?:[number,number]){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...rep)}return t;
}
function grain(g:CanvasRenderingContext2D,w:number,h:number,a=0.05){for(let i=0;i<w*h/6;i++){g.fillStyle=`rgba(${Math.random()<0.5?'255,255,255':'0,0,0'},${Math.random()*a})`;g.fillRect(Math.random()*w,Math.random()*h,1,1)}}
type Mats={floor:THREE.Material;wall:THREE.Material;side:THREE.Material;wains:THREE.Material;dispose:()=>void};
export function shopMats(kind:'builder'|'tailor'):Mats{
  const plank=kind==='builder'?['#b98a5e','#a97a50','#c49668','#b08256']:['#d8b48e','#caa47e','#e0bc96','#d2ac86'];
  const floor=tex(256,256,g=>{for(let r=0;r<8;r++){const off=(r%2)*90;for(let k=-1;k<3;k++){g.fillStyle=plank[(r+k+4)%4];g.fillRect(k*128+off,r*32,128,32);
      g.strokeStyle='rgba(90,60,35,0.35)';for(let l=0;l<4;l++){g.beginPath();g.moveTo(k*128+off+6,r*32+6+l*6);g.bezierCurveTo(k*128+off+50,r*32+3+l*6,k*128+off+80,r*32+10+l*6,k*128+off+122,r*32+6+l*6);g.stroke()}
      g.fillStyle='#5a3d2b';g.beginPath();g.arc(k*128+off+8,r*32+16,1.5,0,7);g.arc(k*128+off+120,r*32+16,1.5,0,7);g.fill()}}
    g.fillStyle='rgba(60,40,25,0.6)';for(let r=0;r<=8;r++)g.fillRect(0,r*32-1,256,2);grain(g,256,256)},[W/2,(D+7)/2]);
  const paper=(base:string,rep:number)=>tex(128,128,g=>{g.fillStyle=base;g.fillRect(0,0,128,128);
    if(kind==='builder'){// little houses and leaves in a soft repeat
      for(let y=0;y<128;y+=64)for(let x=0;x<128;x+=64){const ox=x+((y/64)%2)*32;g.fillStyle='rgba(160,110,70,0.18)';g.fillRect(ox+10,y+24,18,14);g.beginPath();g.moveTo(ox+7,y+24);g.lineTo(ox+19,y+13);g.lineTo(ox+31,y+24);g.fill();
        g.fillStyle='rgba(110,150,90,0.2)';g.beginPath();g.ellipse(ox+44,y+46,5,9,0.6,0,7);g.fill()}}
    else{g.fillStyle='rgba(212,106,140,0.12)';for(let x=0;x<128;x+=16)g.fillRect(x,0,6,128);g.fillStyle='rgba(255,255,255,0.4)';for(let y=8;y<128;y+=32)for(let x=11;x<128;x+=16){g.beginPath();g.arc(x,y,2,0,7);g.fill()}}
    grain(g,128,128,0.03)},[rep/0.9,(H-1)/0.9]);
  const bead=tex(64,64,g=>{g.fillStyle=kind==='builder'?'#7e9a72':'#e8c4cf';g.fillRect(0,0,64,64);g.fillStyle='rgba(0,0,0,0.14)';for(let x=0;x<64;x+=8)g.fillRect(x,0,1,64);g.fillStyle='rgba(255,255,255,0.15)';for(let x=1;x<64;x+=8)g.fillRect(x,0,1,64)},[W/0.6,1]);
  const wall=paper(kind==='builder'?'#f1e3c8':'#fbeef0',W),side=paper(kind==='builder'?'#ecdcbc':'#f6e4e8',D+7);
  const mats={floor:new THREE.MeshStandardMaterial({map:floor,roughness:0.75}),wall:new THREE.MeshStandardMaterial({map:wall,roughness:0.95}),side:new THREE.MeshStandardMaterial({map:side,roughness:0.95}),wains:new THREE.MeshStandardMaterial({map:bead,roughness:0.8})};
  return {...mats,dispose(){Object.values(mats).forEach(m=>{m.map?.dispose();m.dispose()})}};
}

function Pendant({x,z}:{x:number;z:number}){
  return <group position={[x,H,z]}>
    <mesh position-y={-0.3}><cylinderGeometry args={[0.008,0.008,0.6,6]}/>{M('#2a2420')}</mesh>
    <mesh position-y={-0.68}><cylinderGeometry args={[0.08,0.3,0.22,24,1,true]}/><meshStandardMaterial color="#2f5a48" metalness={0.3} roughness={0.4} side={THREE.DoubleSide}/></mesh>
    <mesh position-y={-0.72}><sphereGeometry args={[0.07,12,10]}/><meshStandardMaterial color="#fff4cc" emissive="#ffd98a" emissiveIntensity={1.5} toneMapped={false}/></mesh>
    <pointLight position-y={-0.85} intensity={2} distance={4.5} color="#ffd9a0"/>
  </group>;
}
export function ShopShell({kind,mats}:{kind:'builder'|'tailor';mats:Mats}){
  useEffect(()=>()=>mats.dispose(),[mats]);
  const view=useMemo(()=>tex(128,128,g=>{const s=g.createLinearGradient(0,0,0,80);s.addColorStop(0,'#8ec9ea');s.addColorStop(1,'#dff1ee');g.fillStyle=s;g.fillRect(0,0,128,128);
    g.fillStyle='#ffffffdd';g.beginPath();g.arc(30,24,8,0,7);g.arc(40,20,10,0,7);g.arc(50,25,7,0,7);g.fill();
    g.fillStyle='#9cc77a';g.beginPath();g.moveTo(0,80);g.quadraticCurveTo(60,60,128,76);g.lineTo(128,128);g.lineTo(0,128);g.fill();
    [[20,82,'#4f9a45'],[96,78,'#e9a6b8'],[64,90,'#6db24f']].forEach(([x,y,c])=>{g.fillStyle='#6b4a30';g.fillRect((x as number)-2,y as number,4,12);g.fillStyle=c as string;g.beginPath();g.arc(x as number,(y as number)-3,10,0,7);g.fill()});
    g.fillStyle='#d9c7a0';g.fillRect(0,110,128,18)}),[]);
  useEffect(()=>()=>view.dispose(),[view]);
  return <group name={'shop-shell-'+kind}>
    {/* wainscot and its rail on the back and side walls, crown moulding */}
    <mesh position={[0,0.55,BACK+0.07]}><boxGeometry args={[W,1.1,0.02]}/><primitive object={mats.wains} attach="material"/></mesh>
    <mesh position={[0,1.12,BACK+0.09]}><boxGeometry args={[W,0.06,0.05]}/>{M('#6f5040')}</mesh>
    {[-1,1].map(k=><group key={k}><mesh position={[k*(W/2-0.07),0.55,0.5]}><boxGeometry args={[0.02,1.1,D+2]}/><primitive object={mats.wains} attach="material"/></mesh>
      <mesh position={[k*(W/2-0.09),1.12,0.5]}><boxGeometry args={[0.05,0.06,D+2]}/>{M('#6f5040')}</mesh>
      <mesh position={[k*(W/2-0.1),H-0.12,0.5]}><boxGeometry args={[0.12,0.16,D+2]}/>{M('#f4eedf')}</mesh></group>)}
    <mesh position={[0,H-0.12,BACK+0.1]}><boxGeometry args={[W,0.16,0.12]}/>{M('#f4eedf')}</mesh>
    <mesh position={[0,0.06,BACK+0.08]}><boxGeometry args={[W,0.12,0.04]}/>{M('#5a3d2b')}</mesh>
    {/* ceiling beams */}
    {[-1.6,0.2,2.0].map(z=><mesh key={z} position={[0,H-0.06,z]} castShadow><boxGeometry args={[W,0.16,0.18]}/>{M('#7a573c')}</mesh>)}
    {kind==='builder'&&<><Pendant x={-1.4} z={-0.3}/><Pendant x={1.4} z={-0.3}/></>}
    {/* a window on the left wall with a flower box */}
    <group position={[-W/2+0.08,1.95,0.9]} rotation-y={Math.PI/2}>
      <mesh><planeGeometry args={[1.0,1.0]}/><meshBasicMaterial map={view} toneMapped={false}/></mesh>
      {[[0,0.52,1.1,0.06],[0,-0.52,1.1,0.06],[-0.53,0,0.06,1.1],[0.53,0,0.06,1.1],[0,0,0.04,1],[0,0,1,0.04]].map(([x,y,a,b],i)=><mesh key={i} position={[x,y,0.02]}><boxGeometry args={[a,b,0.05]}/>{M('#f4eedf')}</mesh>)}
      <mesh position={[0,-0.64,0.12]}><boxGeometry args={[1.0,0.18,0.2]}/>{M(kind==='builder'?'#8a5a3e':'#d46a8c')}</mesh>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[-0.4+i*0.13,-0.5,0.14]}><sphereGeometry args={[0.06,8,6]}/>{M(['#f48fb8','#ffd447','#6db24f','#ffffff'][i%4])}</mesh>)}
    </group>
  </group>;
}

// ------------------------------------------------------------ 건물 상점
const ROOFS=['#c44b3b','#4f7fb8','#6fbf4a','#e08a2e','#8a6a3a','#7a4f8f'],WALLS=['#f3e6cc','#fbefe0','#e9dcc2','#f6e6d6'];
function ModelHouse({i,s=1}:{i:number;s?:number}){
  const roof=ROOFS[i%ROOFS.length],wall=WALLS[i%WALLS.length],two=i%3===1;
  return <group scale={s}>
    <mesh position-y={two?0.17:0.12} castShadow><boxGeometry args={[0.3,two?0.34:0.24,0.26]}/>{M(wall)}</mesh>
    <mesh position-y={(two?0.34:0.24)+0.08} rotation-y={Math.PI/4} castShadow><coneGeometry args={[0.25,0.18,4]}/>{M(roof)}</mesh>
    <mesh position={[0,0.06,0.131]}><planeGeometry args={[0.07,0.11]}/>{M('#6a4a36')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*0.09,two?0.24:0.15,0.131]}><planeGeometry args={[0.05,0.05]}/><meshStandardMaterial color="#ffe9a8" emissive="#ffc867" emissiveIntensity={0.4}/></mesh>)}
    {i%2===0&&<mesh position={[0.08,(two?0.34:0.24)+0.12,-0.04]}><boxGeometry args={[0.04,0.1,0.04]}/>{M('#9a4a3a')}</mesh>}
  </group>;
}
function Potted({i}:{i:number}){
  const k=i%5;
  return <group>
    <mesh position-y={0.08} castShadow><cylinderGeometry args={[0.1,0.075,0.16,12]}/>{M(['#c27a55','#e9dcc2','#5f8ab8','#b4684a','#7e9a72'][i%5])}</mesh>
    <mesh position-y={0.16}><cylinderGeometry args={[0.09,0.09,0.01,12]}/>{M('#4a3426')}</mesh>
    {k===0&&<mesh position-y={0.28}><sphereGeometry args={[0.12,12,10]}/>{M('#4f9a45')}</mesh>}
    {k===1&&<><mesh position-y={0.27} scale={[1,1.6,1]}><sphereGeometry args={[0.06,10,8]}/>{M('#5f9a4f')}</mesh>{[-1,1].map(j=><mesh key={j} position={[j*0.06,0.3,0]} scale={[1,1.4,1]}><sphereGeometry args={[0.03,8,6]}/>{M('#5f9a4f')}</mesh>)}</>}
    {k===2&&[0,1,2].map(j=><group key={j} position={[(j-1)*0.05,0,0]}><mesh position-y={0.26}><cylinderGeometry args={[0.005,0.005,0.2,4]}/>{M('#4f9a45')}</mesh><mesh position-y={0.37}><sphereGeometry args={[0.03,8,6]}/>{M(['#f48fb8','#ffd447','#e85d5d'][j])}</mesh></group>)}
    {k===3&&<><mesh position-y={0.3}><cylinderGeometry args={[0.01,0.012,0.26,5]}/>{M('#6b4a30')}</mesh><mesh position-y={0.44} scale={[1.3,0.6,1.3]}><sphereGeometry args={[0.09,10,8]}/>{M('#3f7a3a')}</mesh></>}
    {k===4&&<><mesh position-y={0.3}><cylinderGeometry args={[0.008,0.008,0.28,4]}/>{M('#4f9a45')}</mesh><mesh position={[0,0.45,0.02]} rotation-x={0.3}><cylinderGeometry args={[0.07,0.07,0.015,12]}/>{M('#ffd447')}</mesh><mesh position={[0,0.45,0.03]} rotation-x={0.3}><cylinderGeometry args={[0.03,0.03,0.02,10]}/>{M('#6a4a36')}</mesh></>}
  </group>;
}
function Tag({p,label}:{p:[number,number,number];label:string}){
  const t=useMemo(()=>tex(64,32,g=>{g.fillStyle='#fffaf0';g.fillRect(0,0,64,32);g.strokeStyle='#c4432f';g.lineWidth=2;g.strokeRect(1,1,62,30);g.fillStyle='#3b2a20';g.font='bold 16px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(label,32,17)}),[label]);
  useEffect(()=>()=>t.dispose(),[t]);
  return <mesh position={p} rotation-x={-0.15}><planeGeometry args={[0.13,0.065]}/><meshBasicMaterial map={t}/></mesh>;
}
function Blueprint({seed}:{seed:number}){
  const t=useMemo(()=>tex(128,96,g=>{g.fillStyle='#2f5f9a';g.fillRect(0,0,128,96);g.strokeStyle='rgba(255,255,255,0.18)';for(let x=0;x<128;x+=8){g.beginPath();g.moveTo(x,0);g.lineTo(x,96);g.stroke()}for(let y=0;y<96;y+=8){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke()}
    g.strokeStyle='#ffffff';g.lineWidth=2;if(seed%2){g.strokeRect(30,40,68,40);g.beginPath();g.moveTo(26,40);g.lineTo(64,14);g.lineTo(102,40);g.stroke();g.strokeRect(56,58,16,22)}
    else{g.strokeRect(14,14,100,68);g.beginPath();g.moveTo(60,14);g.lineTo(60,82);g.moveTo(14,50);g.lineTo(60,50);g.stroke();g.beginPath();g.arc(60,50,14,Math.PI,Math.PI*1.5);g.stroke()}
    g.font='9px monospace';g.fillStyle='#ffffff';g.fillText(seed%2?'COTTAGE A-'+seed:'PLAN '+seed,8,92)}),[seed]);
  useEffect(()=>()=>t.dispose(),[t]);
  return <mesh><planeGeometry args={[0.7,0.52]}/><meshStandardMaterial map={t} roughness={0.9}/></mesh>;
}
function VillageMap(){
  const t=useMemo(()=>tex(128,96,g=>{g.fillStyle='#efe3c4';g.fillRect(0,0,128,96);g.fillStyle='#a9cf8e';g.fillRect(6,6,116,84);g.strokeStyle='#4f9ee0';g.lineWidth=6;g.beginPath();g.moveTo(6,60);g.bezierCurveTo(40,40,80,80,122,50);g.stroke();
    g.strokeStyle='#d9c7a0';g.lineWidth=3;g.beginPath();g.moveTo(64,6);g.lineTo(64,90);g.moveTo(6,30);g.lineTo(122,30);g.stroke();
    [[30,20,'#c4432f'],[90,22,'#4f7fb8'],[40,74,'#e08a2e'],[96,74,'#7a4f8f']].forEach(([x,y,c])=>{g.fillStyle=c as string;g.fillRect((x as number)-5,(y as number)-4,10,8)});
    g.fillStyle='#c4432f';g.beginPath();g.arc(64,46,4,0,7);g.fill()}),[]);
  useEffect(()=>()=>t.dispose(),[t]);
  return <group><mesh><boxGeometry args={[1.0,0.78,0.04]}/>{M('#6f5040')}</mesh><mesh position-z={0.025}><planeGeometry args={[0.88,0.66]}/><meshStandardMaterial map={t}/></mesh></group>;
}
function Register(){
  return <group>
    <mesh position-y={0.1} castShadow><boxGeometry args={[0.38,0.2,0.3]}/>{brass()}</mesh>
    <mesh position={[0,0.24,-0.06]} rotation-x={-0.5}><boxGeometry args={[0.34,0.16,0.12]}/>{brass()}</mesh>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[-0.12+(i%4)*0.08,0.2,0.05+Math.floor(i/4)*0.06]}><cylinderGeometry args={[0.018,0.018,0.03,10]}/>{M('#f4eedf')}</mesh>)}
    <mesh position={[0,0.36,-0.1]}><boxGeometry args={[0.2,0.08,0.02]}/>{M('#2a2420')}</mesh>
    <mesh position={[0.22,0.15,0]} rotation-z={-0.4}><cylinderGeometry args={[0.01,0.01,0.14,6]}/>{brass()}</mesh>
  </group>;
}
export function BuilderDecor(){
  const shelfZ=BACK+0.32;
  return <group name="builder-decor">
    {/* the back shelf: a carved unit with a cornice, three shelves */}
    <group position={[0,0,shelfZ]}>
      <mesh position={[0,1.35,-0.06]} receiveShadow><boxGeometry args={[4.6,2.7,0.1]}/>{M('#7a573c')}</mesh>
      {[-2.3,2.3].map(x=><mesh key={x} position={[x,1.38,0.08]} castShadow><boxGeometry args={[0.12,2.76,0.42]}/>{M('#6a4a36')}</mesh>)}
      <mesh position={[0,2.8,0.08]} castShadow><boxGeometry args={[4.8,0.14,0.5]}/>{M('#6a4a36')}</mesh>
      {[0.45,1.2,1.95].map((y,r)=><group key={r} position-y={y}>
        <mesh receiveShadow castShadow><boxGeometry args={[4.5,0.06,0.46]}/>{M('#a77d58')}</mesh>
        <mesh position={[0,-0.05,0.22]}><boxGeometry args={[4.5,0.05,0.02]}/>{M('#8a6448')}</mesh>
        {Array.from({length:8},(_,i)=>{const x=-1.95+i*0.56,kind=(i+r)%3;return <group key={i} position={[x,0.03,0]}>
          {kind===0?<ModelHouse i={i+r*3}/>:kind===1?<Potted i={i*2+r}/>
           :r===2?<group>{[0,1,2].map(j=><mesh key={j} position={[(j-1)*0.1,0.02+j*0.012,0]} rotation-y={j*0.3}><boxGeometry args={[0.12,0.03,0.12]}/>{M(['#c9b8a0','#b8a28a','#d9c7a0'][j])}</mesh>)}</group>
           :i%2?<group>{/* a lamp-post model */}<mesh position-y={0.18}><cylinderGeometry args={[0.012,0.018,0.36,8]}/>{M('#2f3a35')}</mesh><mesh position-y={0.38}><boxGeometry args={[0.07,0.08,0.07]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={0.8}/></mesh></group>
           :<group>{/* a fountain model */}<mesh position-y={0.04}><cylinderGeometry args={[0.15,0.16,0.08,16]}/>{M('#c9c2b4')}</mesh><mesh position-y={0.075}><cylinderGeometry args={[0.13,0.13,0.01,16]}/>{M('#7fc3e8')}</mesh><mesh position-y={0.14}><cylinderGeometry args={[0.025,0.03,0.12,8]}/>{M('#c9c2b4')}</mesh><mesh position-y={0.21}><sphereGeometry args={[0.04,8,6]}/>{M('#7fc3e8')}</mesh></group>}
          <Tag p={[0,-0.015,0.235]} label={`${(i*3+r*7)%9+1}0C`}/>
        </group>})}
      </group>)}
    </group>
    {/* the walls: blueprints pinned up, the village map, a pegboard of tools, hanging planters, a clock */}
    {[[-3.0,2.55,-0.6,1],[3.0,2.4,-1.1,2]].map(([x,y,z,sd],i)=><group key={i} position={[x+(x<0?-0.4:0.4),y,z]} rotation-y={x<0?Math.PI/2:-Math.PI/2} rotation-z={i?0.04:-0.03}>
      <Blueprint seed={sd}/>{[-1,1].map(k=><mesh key={k} position={[k*0.3,0.22,0.01]}><sphereGeometry args={[0.02,8,6]}/>{M('#c4432f')}</mesh>)}</group>)}
    <group position={[2.9,2.95,BACK+0.1]}><VillageMap/></group>
    <group position={[W/2-0.08,1.75,0.6]} rotation-y={-Math.PI/2}>
      <mesh><boxGeometry args={[1.2,0.8,0.03]}/>{M('#d9c19a')}</mesh>
      {Array.from({length:40},(_,i)=><mesh key={i} position={[-0.54+(i%10)*0.12,-0.33+Math.floor(i/10)*0.22,0.02]}><circleGeometry args={[0.012,6]}/>{M('#8a6448')}</mesh>)}
      {/* hammer, saw, trowel, a coil of string, a level */}
      <group position={[-0.4,0.05,0.04]} rotation-z={0.2}><mesh><boxGeometry args={[0.03,0.4,0.03]}/>{M('#a77d58')}</mesh><mesh position-y={0.2}><boxGeometry args={[0.16,0.05,0.05]}/>{M('#6f6f6f')}</mesh></group>
      <group position={[-0.1,0.0,0.04]}><mesh><boxGeometry args={[0.18,0.36,0.01]}/><meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3}/></mesh><mesh position-y={0.22}><boxGeometry args={[0.1,0.1,0.03]}/>{M('#c4432f')}</mesh></group>
      <group position={[0.18,0.05,0.04]}><mesh position-y={-0.08} rotation-z={Math.PI/4}><boxGeometry args={[0.1,0.1,0.01]}/><meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3}/></mesh><mesh position-y={0.08}><cylinderGeometry args={[0.02,0.02,0.18,8]}/>{M('#3f6a5a')}</mesh></group>
      <mesh position={[0.4,0.15,0.05]}><torusGeometry args={[0.08,0.025,8,16]}/>{M('#e8d6b0')}</mesh>
      <mesh position={[0.1,-0.28,0.04]}><boxGeometry args={[0.6,0.06,0.04]}/>{M('#f2c230')}</mesh><mesh position={[0.1,-0.28,0.065]}><boxGeometry args={[0.08,0.03,0.01]}/>{M('#8fd3ff')}</mesh>
    </group>
    {[-2.6,2.6].map(x=><group key={x} position={[x,H-0.1,BACK+0.6]}>
      <mesh position-y={-0.3}><cylinderGeometry args={[0.005,0.005,0.6,4]}/>{M('#5a3d2b')}</mesh>
      <mesh position-y={-0.66}><sphereGeometry args={[0.15,12,8,0,Math.PI*2,Math.PI/2,Math.PI/2]}/>{M('#c27a55')}</mesh>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i)*0.14,-0.68-(i%3)*0.1,Math.sin(i)*0.14]}><sphereGeometry args={[0.055,8,6]}/>{M(i%3?'#4f9a45':'#f48fb8')}</mesh>)}</group>)}
    {/* the floor: a display table of house models, soil sacks, a crate of pots, a sapling barrel, a blueprint bin, a tall tree */}
    <group position={[-2.35,0,0.9]}>
      <mesh position-y={0.62} castShadow receiveShadow><boxGeometry args={[1.1,0.06,0.8]}/>{M('#a77d58')}</mesh>
      {[[-0.48,-0.33],[0.48,-0.33],[-0.48,0.33],[0.48,0.33]].map(([x,z],i)=><mesh key={i} position={[x,0.3,z]}><boxGeometry args={[0.06,0.6,0.06]}/>{M('#6f5040')}</mesh>)}
      <mesh position={[0,0.66,0]}><boxGeometry args={[0.9,0.02,0.6]}/>{M('#9cc77a')}</mesh>
      {[[-0.25,-0.12,0],[0.2,-0.15,3],[0.0,0.15,4],[-0.32,0.18,1],[0.32,0.16,5]].map(([x,z,i])=><group key={i} position={[x,0.67,z]} rotation-y={i*0.4}><ModelHouse i={i} s={0.8}/></group>)}
      <Tag p={[0,0.6,0.42]} label="SALE"/>
    </group>
    <group position={[2.6,0,1.4]}>
      {[0,1,2].map(i=><mesh key={i} position={[(i%2)*0.1,0.13+i*0.22,0]} rotation={[0,i*0.2,Math.PI/2]} castShadow><capsuleGeometry args={[0.12,0.32,6,10]}/><meshStandardMaterial color={i%2?'#c9b48a':'#d9c49a'} roughness={1}/></mesh>)}
    </group>
    <group position={[2.9,0,0.2]}>
      <mesh position-y={0.2} castShadow><boxGeometry args={[0.6,0.4,0.5]}/>{M('#b08256')}</mesh>
      {[0.08,0.32].map(y=><mesh key={y} position={[0,y,0.255]}><boxGeometry args={[0.6,0.05,0.01]}/>{M('#8a6448')}</mesh>)}
      {[-0.15,0.15].map((x,i)=><group key={x} position={[x,0.4,(i-0.5)*0.12]}><Potted i={i+2}/></group>)}
    </group>
    <group position={[-2.9,0,-0.6]}>
      <mesh position-y={0.3} castShadow><cylinderGeometry args={[0.28,0.24,0.6,16]}/>{M('#8a5a3e')}</mesh>
      {[0.1,0.5].map(y=><mesh key={y} position-y={y} rotation-x={Math.PI/2}><torusGeometry args={[0.27,0.015,6,24]}/>{M('#3b3431')}</mesh>)}
      {[0,1,2,3].map(i=><group key={i} position={[Math.cos(i*1.6)*0.12,0.6,Math.sin(i*1.6)*0.12]}><mesh position-y={0.2}><cylinderGeometry args={[0.01,0.012,0.4,5]}/>{M('#6b4a30')}</mesh><mesh position-y={0.42}><sphereGeometry args={[0.08,8,6]}/>{M(i%2?'#6db24f':'#4f9a45')}</mesh></group>)}
    </group>
    <group position={[1.9,0,-1.6]}>
      <mesh position-y={0.25}><cylinderGeometry args={[0.16,0.14,0.5,14,1,true]}/><meshStandardMaterial color="#5a3d2b" side={THREE.DoubleSide}/></mesh>
      {[0,1,2,3].map(i=><mesh key={i} position={[Math.cos(i*1.7)*0.06,0.5,Math.sin(i*1.7)*0.06]} rotation={[Math.sin(i)*0.15,0,Math.cos(i)*0.15]}><cylinderGeometry args={[0.035,0.035,0.5,10]}/>{M(i%2?'#cfe0f2':'#f4eedf')}</mesh>)}
    </group>
    <group position={[-3.0,0,-1.9]}>
      <mesh position-y={0.25} castShadow><cylinderGeometry args={[0.3,0.24,0.5,16]}/>{M('#c27a55')}</mesh>
      <mesh position-y={0.9}><cylinderGeometry args={[0.04,0.06,1.0,8]}/>{M('#6b4a30')}</mesh>
      {[[0,1.6,0,0.42],[0.25,1.35,0.1,0.3],[-0.22,1.4,-0.05,0.32],[0.05,1.95,0,0.28]].map(([x,y,z,r],i)=><mesh key={i} position={[x,y,z]} castShadow><sphereGeometry args={[r,14,10]}/>{M(i%2?'#4f9a45':'#6db24f')}</mesh>)}
    </group>
  </group>;
}
// on the counter: a register, a bell, the ledger, a tape measure, a pot of pencils
export function BuilderCounter(){
  return <group>
    <group position={[-0.95,1.07,0]}><Register/></group>
    <group position={[-0.35,1.07,0.15]}><mesh position-y={0.04}><sphereGeometry args={[0.06,14,10,0,Math.PI*2,0,Math.PI/2]}/>{brass()}</mesh><mesh position-y={0.005}><cylinderGeometry args={[0.07,0.07,0.01,16]}/>{M('#3b2a20')}</mesh></group>
    <group position={[0.2,1.08,0.05]} rotation-y={0.2}><mesh><boxGeometry args={[0.36,0.04,0.26]}/>{M('#5a3d2b')}</mesh><mesh position-y={0.022}><boxGeometry args={[0.34,0.01,0.24]}/>{M('#fbf4e2')}</mesh></group>
    <group position={[1.35,1.1,0.1]}><mesh rotation-x={Math.PI/2}><cylinderGeometry args={[0.06,0.06,0.04,16]}/>{M('#f2c230')}</mesh><mesh position={[0.07,-0.015,0]}><boxGeometry args={[0.06,0.01,0.02]}/>{M('#c0c0c0')}</mesh></group>
  </group>;
}
// a planked counter front
export function counterFront(color:string){return tex(128,64,g=>{g.fillStyle=color;g.fillRect(0,0,128,64);g.fillStyle='rgba(0,0,0,0.25)';for(let x=0;x<128;x+=16)g.fillRect(x,0,2,64);grain(g,128,64,0.06)},[2,1])}

// ------------------------------------------------------------ 옷 가게
// 피드백 2026-11-26 "네모네모, 패턴 없음, 불 켜진 느낌 없음, 피팅룸 없음, 티셔츠마다 디테일": real tee shapes (sleeves, a
// neckline, a little thickness), each printed its own way (stripes, polka dots, a star, a heart, a cat, a pocket, a
// number, ringer collar, raglan sleeves, tie-dye); a wall of them on hooks, racks with hangers, folded stacks, hats on
// stands, shoes; lamps that glow with light pools; a fitting room with a pleated curtain, a mirror and a stool
const TEE_COL=['#6aa6d8','#f2d36a','#d46a8c','#4f8a5b','#f4eedf','#e8a5a0','#7a4f8f','#f08a4a','#9fd3c7','#2f3a52'];
function teeTex(i:number){return canvasTex(128,128,g=>{const base=TEE_COL[i%TEE_COL.length],alt=TEE_COL[(i+4)%TEE_COL.length];g.fillStyle=base;g.fillRect(0,0,128,128);
  const k=i%10;g.fillStyle=alt;g.strokeStyle=alt;
  if(k===0)for(let y=10;y<128;y+=16)g.fillRect(0,y,128,7);
  if(k===1)for(let y=8;y<128;y+=16)for(let x=(y/16%2)*8+4;x<128;x+=16){g.beginPath();g.arc(x,y,3.5,0,7);g.fill()}
  if(k===2){g.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-Math.PI/2,r=j%2?10:24;g.lineTo(64+Math.cos(a)*r,62+Math.sin(a)*r)}g.fill()}
  if(k===3){g.beginPath();g.moveTo(64,80);g.bezierCurveTo(30,58,40,34,64,48);g.bezierCurveTo(88,34,98,58,64,80);g.fill()}
  if(k===4){g.fillStyle='#3b2a20';g.beginPath();g.arc(64,64,20,0,7);g.fill();g.beginPath();g.moveTo(46,52);g.lineTo(50,34);g.lineTo(60,46);g.moveTo(82,52);g.lineTo(78,34);g.lineTo(68,46);g.fill();g.fillStyle='#f2d36a';g.beginPath();g.arc(56,62,3,0,7);g.arc(72,62,3,0,7);g.fill()}
  if(k===5){g.fillStyle='rgba(0,0,0,0.12)';g.fillRect(74,44,22,24);g.strokeStyle='#ffffff';g.setLineDash([3,3]);g.strokeRect(74,44,22,24);g.setLineDash([])}
  if(k===6){g.fillStyle='#ffffff';g.font='bold 44px "Jua",sans-serif';g.textAlign='center';g.fillText(String(7+i%3),64,82)}
  if(k===7){g.fillStyle='#ffffff';g.fillRect(0,0,128,10);g.fillStyle=alt;g.fillRect(0,118,128,10)}
  if(k===8){g.fillStyle=alt;g.beginPath();g.moveTo(0,0);g.lineTo(40,0);g.lineTo(70,40);g.lineTo(0,60);g.fill();g.beginPath();g.moveTo(128,0);g.lineTo(88,0);g.lineTo(58,40);g.lineTo(128,60);g.fill()}
  if(k===9)for(let r=60;r>4;r-=8){g.strokeStyle=['#d46a8c','#f2d36a','#6aa6d8','#9fd3c7'][(r/8)%4|0];g.lineWidth=5;g.beginPath();g.arc(64,64,r,0,7);g.stroke()}
  for(let n=0;n<900;n++){g.fillStyle=`rgba(${Math.random()<0.5?'255,255,255':'0,0,0'},0.05)`;g.fillRect(Math.random()*128,Math.random()*128,1,1)}})}
function canvasTex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void){return tex(w,h,draw)}
let teeGeo:THREE.ExtrudeGeometry|null=null;
function tee(){if(teeGeo)return teeGeo;const s=new THREE.Shape();
  s.moveTo(-0.13,-0.17);s.lineTo(0.13,-0.17);s.lineTo(0.13,0.07);s.lineTo(0.2,0.03);s.lineTo(0.24,0.1);s.lineTo(0.14,0.17);s.quadraticCurveTo(0,0.12,-0.14,0.17);s.lineTo(-0.24,0.1);s.lineTo(-0.2,0.03);s.lineTo(-0.13,0.07);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:0.015,bevelEnabled:true,bevelThickness:0.008,bevelSize:0.008,bevelSegments:2,curveSegments:8}),uv=g.attributes.uv,p=g.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+0.25)/0.5,(p.getY(i)+0.18)/0.36);teeGeo=g;return g}
function Tee({i}:{i:number}){const t=useMemo(()=>teeTex(i),[i]);useEffect(()=>()=>t.dispose(),[t]);
  return <group><mesh geometry={tee()} castShadow><meshStandardMaterial map={t} roughness={0.9}/></mesh>
    <mesh position={[0,0.135,0.026]} rotation-x={0} scale={[1,0.5,1]}><torusGeometry args={[0.055,0.008,6,16,Math.PI]}/>{M(i%10===7?'#ffffff':TEE_COL[(i+2)%TEE_COL.length])}</mesh></group>}
function Folded({i}:{i:number}){return <mesh castShadow><boxGeometry args={[0.3,0.05,0.24]}/>{M(TEE_COL[i%TEE_COL.length])}</mesh>}
function GlowLamp({p}:{p:[number,number,number]}){
  return <group position={p}>
    <mesh position-y={-0.32}><cylinderGeometry args={[0.006,0.006,0.64,6]}/>{M('#c9a23a')}</mesh>
    <mesh position-y={-0.72} rotation-x={Math.PI}><sphereGeometry args={[0.2,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#f6dfe6" emissive="#ffd2a0" emissiveIntensity={0.7} side={THREE.DoubleSide} transparent opacity={0.92}/></mesh>
    <mesh position-y={-0.76}><sphereGeometry args={[0.07,12,10]}/><meshBasicMaterial color="#fff4d6" toneMapped={false}/></mesh>
    <pointLight position-y={-0.85} intensity={2.4} distance={4} color="#ffd9b0"/>
    <mesh position-y={-0.73} rotation-x={-Math.PI/2}><circleGeometry args={[0.19,24]}/><meshBasicMaterial color="#fff1d0" toneMapped={false}/></mesh>
  </group>;
}
function FittingRoom(){
  const curtain=useMemo(()=>{const g=new THREE.PlaneGeometry(0.9,2.0,24,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin((x+0.45)/0.9*Math.PI*9)*0.035)}g.computeVertexNormals();return g},[]);
  const sign=useMemo(()=>tex(128,48,g=>{g.fillStyle='#fffaf4';g.fillRect(0,0,128,48);g.fillStyle='#d46a8c';g.font='bold 26px "Jua",sans-serif';g.textAlign='center';g.fillText('피팅룸',64,33)}),[]);
  useEffect(()=>()=>{curtain.dispose();sign.dispose()},[curtain,sign]);
  return <group position={[W/2-0.75,0,BACK+0.85]} rotation-y={-Math.PI/2} name="fitting-room">
    {/* two side walls and a back, a rod with rings, a half-drawn curtain, a mirror, a stool, a dress on a hook */}
    {[-0.6,0.6].map(x=><mesh key={x} position={[x,1.1,0]} castShadow><boxGeometry args={[0.06,2.2,1.1]}/>{M('#f6e4e8')}</mesh>)}
    <mesh position={[0,2.22,0]}><boxGeometry args={[1.32,0.06,1.12]}/>{M('#fffaf4')}</mesh>
    <mesh position={[0,2.12,0.54]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.014,0.014,1.2,8]}/>{brass()}</mesh>
    <mesh geometry={curtain} position={[0.18,1.1,0.54]}><meshStandardMaterial color="#c9577a" roughness={0.8} side={THREE.DoubleSide}/></mesh>
    <group position={[0,1.2,-0.5]}><mesh><boxGeometry args={[0.5,1.3,0.03]}/>{brass()}</mesh><mesh position-z={0.02}><planeGeometry args={[0.42,1.22]}/><meshStandardMaterial color="#e6eef4" metalness={0.9} roughness={0.06}/></mesh></group>
    <group position={[-0.3,0,-0.1]}><mesh position-y={0.42}><cylinderGeometry args={[0.16,0.16,0.08,16]}/>{M('#d46a8c')}</mesh>{[0,1,2].map(k=><mesh key={k} position={[Math.cos(k*2.1)*0.11,0.2,Math.sin(k*2.1)*0.11]}><cylinderGeometry args={[0.015,0.015,0.4,6]}/>{brass()}</mesh>)}</group>
    <group position={[0.45,1.5,-0.3]} rotation-y={-Math.PI/2}><mesh position-y={0.1}><torusGeometry args={[0.03,0.006,6,10]}/>{brass()}</mesh><mesh position-y={-0.2}><coneGeometry args={[0.16,0.55,16,1,true]}/><meshStandardMaterial color="#6aa6d8" side={THREE.DoubleSide}/></mesh></group>
    <mesh position={[0,2.38,0.57]}><planeGeometry args={[0.5,0.19]}/><meshBasicMaterial map={sign}/></mesh>
  </group>;
}
export function TailorDecor(){
  const rug=useMemo(()=>tex(256,256,g=>{g.fillStyle='#f6dfe6';g.beginPath();g.arc(128,128,124,0,7);g.fill();g.strokeStyle='#d46a8c';g.lineWidth=6;g.beginPath();g.arc(128,128,112,0,7);g.stroke();
    for(let k=0;k<24;k++){const a=k/24*Math.PI*2;g.fillStyle='#d46a8c';g.beginPath();g.arc(128+Math.cos(a)*96,128+Math.sin(a)*96,5,0,7);g.fill()}
    g.fillStyle='#fffaf4';g.beginPath();g.arc(128,128,60,0,7);g.fill();g.fillStyle='#f2c94c';for(let k=0;k<6;k++){const a=k/6*Math.PI*2;g.beginPath();g.ellipse(128+Math.cos(a)*30,128+Math.sin(a)*30,14,8,a,0,7);g.fill()}
    for(let n=0;n<8000;n++){g.fillStyle=`rgba(0,0,0,${Math.random()*0.05})`;g.fillRect(Math.random()*256,Math.random()*256,1,2)}}),[]);
  useEffect(()=>()=>rug.dispose(),[rug]);
  return <group name="tailor-decor">
    {/* the back wall: a pegboard of tees in three rows, a shelf of folded stacks under it */}
    <group position={[-0.4,0,BACK+0.12]}>
      <mesh position={[0,1.85,0]}><boxGeometry args={[3.6,1.75,0.04]}/>{M('#fffaf4')}</mesh>
      {Array.from({length:15},(_,i)=>{const r=Math.floor(i/5),c=i%5;return <group key={i} position={[-1.4+c*0.7,2.42-r*0.56,0.05]} rotation-z={((i*7)%5-2)*0.03}>
        <mesh position-y={0.2}><cylinderGeometry args={[0.012,0.012,0.08,6]}/>{brass()}</mesh><Tee i={i}/></group>})}
      <mesh position={[0,0.75,0.2]} castShadow><boxGeometry args={[3.6,0.05,0.42]}/>{M('#c49a7a')}</mesh>
      <mesh position={[0,0.38,0.2]}><boxGeometry args={[3.6,0.05,0.42]}/>{M('#c49a7a')}</mesh>
      {[-1.78,1.78].map(x=><mesh key={x} position={[x,0.4,0.2]}><boxGeometry args={[0.05,0.8,0.42]}/>{M('#b98a6e')}</mesh>)}
      {Array.from({length:6},(_,c)=>[0,1,2].map(j=><group key={c+'-'+j} position={[-1.45+c*0.58,0.8+j*0.055,0.2]} rotation-y={(j-1)*0.05}><Folded i={c*3+j}/></group>))}
      {Array.from({length:5},(_,c)=><group key={'s'+c} position={[-1.4+c*0.7,0.43,0.22]}><mesh position-y={0.05} scale={[1,0.6,1.6]}><sphereGeometry args={[0.08,12,10]}/>{M(TEE_COL[(c*3+1)%TEE_COL.length])}</mesh><mesh position={[0,0.02,0.04]}><boxGeometry args={[0.15,0.03,0.24]}/>{M('#fffaf4')}</mesh></group>)}
    </group>
    {/* a rack of hangers by the left wall */}
    <group position={[-W/2+0.6,0,0.2]} rotation-y={Math.PI/2}>
      {[-0.8,0.8].map(k=><mesh key={k} position={[k,0.8,0]}><cylinderGeometry args={[0.02,0.02,1.6,8]}/>{brass()}</mesh>)}
      <mesh position-y={1.6} rotation-z={Math.PI/2}><cylinderGeometry args={[0.018,0.018,1.7,8]}/>{brass()}</mesh>
      {Array.from({length:7},(_,i)=><group key={i} position={[-0.66+i*0.22,1.36,0]} rotation-y={Math.PI/2+(i%3-1)*0.12}>
        <mesh position-y={0.24}><torusGeometry args={[0.025,0.005,6,10,Math.PI*1.4]}/>{brass()}</mesh><Tee i={i+20}/></group>)}
    </group>
    {/* a round table of folded tees and a hat stand, the pink rug */}
    <mesh position={[-0.2,0.01,1.5]} rotation-x={-Math.PI/2}><circleGeometry args={[1.0,48]}/><meshStandardMaterial map={rug} roughness={1}/></mesh>
    <group position={[-1.8,0,1.6]}><mesh position-y={0.7}><cylinderGeometry args={[0.45,0.45,0.05,24]}/>{M('#fffaf4')}</mesh><mesh position-y={0.35}><cylinderGeometry args={[0.05,0.12,0.7,12]}/>{brass()}</mesh>
      {[0,1,2,3].map(k=>[0,1].map(j=><group key={k+'-'+j} position={[Math.cos(k*1.57)*0.22,0.75+j*0.055,Math.sin(k*1.57)*0.22]} rotation-y={k*1.57}><Folded i={k*2+j+5}/></group>))}</group>
    <group position={[2.6,0,-0.6]}>{[0,1,2].map(k=><group key={k} position={[Math.cos(k*2.1)*0.25,0,Math.sin(k*2.1)*0.25]}><mesh position-y={0.6+k*0.15}><cylinderGeometry args={[0.012,0.012,1.2+k*0.3,6]}/>{brass()}</mesh>
      <mesh position-y={1.22+k*0.3}><cylinderGeometry args={[0.1,0.12,0.12,16]}/>{M(['#f2d36a','#2f3a52','#d46a8c'][k])}</mesh><mesh position-y={1.17+k*0.3}><cylinderGeometry args={[0.2,0.2,0.015,20]}/>{M(['#f2d36a','#2f3a52','#d46a8c'][k])}</mesh></group>)}
      <mesh position-y={0.03}><cylinderGeometry args={[0.35,0.38,0.06,20]}/>{M('#c49a7a')}</mesh></group>
    {/* a mannequin in a dress by the window */}
    <group position={[-2.6,0,-0.6]}>
      <mesh position-y={0.04}><cylinderGeometry args={[0.2,0.22,0.06,16]}/>{M('#3b3431')}</mesh><mesh position-y={0.5}><cylinderGeometry args={[0.02,0.02,0.9,8]}/>{M('#3b3431')}</mesh>
      <mesh position-y={1.4} scale={[1,1.25,0.7]}><sphereGeometry args={[0.22,16,12]}/>{M('#efe3c8')}</mesh>
      <mesh position-y={1.0}><coneGeometry args={[0.38,0.75,24,1,true]}/><meshStandardMaterial color="#d46a8c" side={THREE.DoubleSide}/></mesh>
      <mesh position-y={1.22} rotation-x={Math.PI/2}><torusGeometry args={[0.19,0.025,8,20]}/>{M('#f2d36a')}</mesh>
      <mesh position-y={1.76}><cylinderGeometry args={[0.05,0.06,0.12,10]}/>{M('#c9a23a')}</mesh></group>
    {/* the long mirror, the fitting room, glowing lamps and wall sconces */}
    <group position={[W/2-0.08,0,1.6]} rotation-y={-Math.PI/2}><mesh position-y={1.0}><boxGeometry args={[0.7,1.9,0.06]}/>{brass()}</mesh>
      <mesh position={[0,1.0,0.035]}><planeGeometry args={[0.58,1.78]}/><meshStandardMaterial color="#dfe9f0" metalness={0.9} roughness={0.08}/></mesh></group>
    <FittingRoom/>
    {[-1.5,0.3].map(x=><GlowLamp key={x} p={[x,H,0.4]}/>)}
    {[-1,1].map(k=><group key={'w'+k} position={[k*(W/2-0.1),2.3,-1.1]} rotation-y={-k*Math.PI/2}>
      <mesh><boxGeometry args={[0.12,0.04,0.12]}/>{brass()}</mesh><mesh position={[0,0.08,0.06]}><sphereGeometry args={[0.08,12,10]}/><meshStandardMaterial color="#fff4d6" emissive="#ffd29a" emissiveIntensity={1.4} toneMapped={false}/></mesh>
      <pointLight position={[0,0.1,0.2]} intensity={0.9} distance={2.2} color="#ffd9b0"/></group>)}
  </group>;
}
