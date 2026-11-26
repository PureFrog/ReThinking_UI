'use client';
// 상점 외관 (피드백 2026-11-26 "디테일 없음, 재질, 상점은 상점답게 옷가게는 옷가게답게, 각기 다른 모양, 지붕 거꾸로"):
//  건물 상점  a timber-framed workshop: a stone plinth, brick below and plaster with dark beams above, a shingled gable
//            roof the right way up with a brick chimney, a striped awning over a shop window of model houses, a
//            house-shaped sign, a plank door with iron straps, lumber, bricks and a wheelbarrow outside
//  옷 가게    a pink clapboard boutique under a rounded scalloped roof: two display windows (a dressed mannequin; folded
//            shirts and a hanging tee), a scalloped awning, a T-shirt sign on a bracket, flower boxes, a rack outside
//  도서관     stone blocks, steps up to four columns and a pediment with an open book, a copper roof with a cupola,
//            arched lit windows, tall double doors, lamp posts, ivy and a book drop
// Each keeps the old footprint (W×D) and the door in the middle of the front (+z), so the walk-up points don't move.
import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {soft} from './materials';
import {shingles,siding,stone,brick,planks,tmat} from './surfaces';

const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
const P=(m:THREE.Material)=><primitive object={m} attach="material"/>;
const G=0.16;// the slab's top
function canvas(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function useDisposeAll(o:Record<string,THREE.Material|THREE.Texture>){useEffect(()=>()=>Object.values(o).forEach(x=>{(x as THREE.MeshStandardMaterial).map?.dispose?.();x.dispose()}),[o])}
const stripes=(a:string,b:string,scallop=false)=>canvas(128,64,g=>{for(let x=0;x<128;x+=16){g.fillStyle=(x/16)%2?b:a;g.fillRect(x,0,16,scallop?52:64);if(scallop){g.beginPath();g.arc(x+8,52,8,0,Math.PI);g.fill()}}});

// a gable roof the right way up: two slopes falling to the front and back eaves, gable triangles, a ridge
function Gable({W,D,H,rise,over=0.3,roof,gable,ridge}:{W:number;D:number;H:number;rise:number;over?:number;roof:THREE.Material;gable:THREE.Material;ridge:string}){
  const a=Math.atan2(rise,D/2),L=Math.hypot(rise,D/2)+over;
  const tri=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-D/2,0);s.lineTo(D/2,0);s.lineTo(0,rise);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:0.06,bevelEnabled:false})},[D,rise]);
  useEffect(()=>()=>tri.dispose(),[tri]);
  return <group position-y={G+H}>
    {[-1,1].map(k=><mesh key={k} position={[0,rise/2-Math.sin(a)*over/2+0.04,k*(D/4+Math.cos(a)*over/2)]} rotation-x={k*a} castShadow receiveShadow><boxGeometry args={[W+over*2,0.1,L]}/>{P(roof)}</mesh>)}
    {[-1,1].map(k=><mesh key={'g'+k} geometry={tri} position={[k*W/2-(k>0?0.06:0)+(k>0?0:0),0,0]} rotation-y={Math.PI/2}>{P(gable)}</mesh>)}
    <mesh position-y={rise+0.06} rotation-z={Math.PI/2}><cylinderGeometry args={[0.09,0.09,W+over*2+0.05,10]}/>{M(ridge)}</mesh>
  </group>;
}
function Lantern({p}:{p:[number,number,number]}){
  return <group position={p}><mesh position-y={0.18}><boxGeometry args={[0.04,0.04,0.25]}/>{M('#2f2a28')}</mesh>
    <mesh position={[0,0.05,0.2]}><boxGeometry args={[0.16,0.22,0.16]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.2} toneMapped={false}/></mesh>
    <mesh position={[0,0.19,0.2]}><coneGeometry args={[0.13,0.1,4]}/>{M('#2f2a28')}</mesh></group>;
}
function Window({w,h,frame,lit,panes=[2,2],glow}:{w:number;h:number;frame:string;lit:boolean;panes?:[number,number];glow:THREE.Material}){
  return <group>
    <mesh><boxGeometry args={[w+0.12,h+0.12,0.06]}/>{M(frame)}</mesh>
    <mesh position-z={0.035}><planeGeometry args={[w,h]}/>{lit?P(glow):M('#5c6470')}</mesh>
    {Array.from({length:panes[0]-1},(_,i)=><mesh key={'v'+i} position={[-w/2+(i+1)*w/panes[0],0,0.045]}><boxGeometry args={[0.035,h,0.02]}/>{M(frame)}</mesh>)}
    {Array.from({length:panes[1]-1},(_,i)=><mesh key={'h'+i} position={[0,-h/2+(i+1)*h/panes[1],0.045]}><boxGeometry args={[w,0.035,0.02]}/>{M(frame)}</mesh>)}
    <mesh position={[0,-h/2-0.09,0.06]}><boxGeometry args={[w+0.22,0.06,0.14]}/>{M(frame)}</mesh>
  </group>;
}
function FlowerBox({w,color}:{w:number;color:string}){
  return <group><mesh><boxGeometry args={[w,0.16,0.18]}/>{M(color)}</mesh>
    {Array.from({length:Math.round(w/0.12)},(_,i)=><mesh key={i} position={[-w/2+0.06+i*0.12,0.12+(i%2)*0.03,0]}><sphereGeometry args={[0.055,8,6]}/>{M(['#f48fb8','#ffd447','#6db24f','#ffffff','#e85d5d'][i%5])}</mesh>)}</group>;
}

// ------------------------------------------------------------ 건물 상점
export function BuilderFacade({W,D,H,lit,glow}:{W:number;D:number;H:number;lit:boolean;glow:THREE.Material}){
  const m=useMemo(()=>({stone:tmat(stone(),W/1.2,0.5/1.2),brick:tmat(brick(),W/0.7,1/0.7),plaster:tmat(siding([240,228,206]),W/2.5,1/2.5,0.95),roof:tmat(shingles([196,104,52]),3,3,0.8),
    gable:tmat(siding([240,228,206]),1,1),door:tmat(planks([118,74,48]),1,1),awn:new THREE.MeshStandardMaterial({map:stripes('#e08a2e','#fbefe0'),side:THREE.DoubleSide}),
    sign:new THREE.MeshStandardMaterial({map:canvas(256,160,g=>{g.fillStyle='#f6ead0';g.fillRect(0,0,256,160);g.strokeStyle='#6a4a36';g.lineWidth=10;g.strokeRect(5,5,246,150);
      g.fillStyle='#c4432f';g.beginPath();g.moveTo(40,70);g.lineTo(80,36);g.lineTo(120,70);g.fill();g.fillStyle='#fbefe0';g.fillRect(54,70,52,40);g.fillStyle='#6a4a36';g.fillRect(74,86,14,24);
      g.save();g.translate(180,80);g.rotate(-0.6);g.fillStyle='#8a5a3e';g.fillRect(-6,-10,12,60);g.fillStyle='#6f6f6f';g.fillRect(-24,-24,48,18);g.restore();
      g.fillStyle='#3b2a20';g.font='bold 30px "Jua",sans-serif';g.textAlign='center';g.fillText('건물 상점',128,146)})})}),[W]);
  useDisposeAll(m);
  const fz=D/2+0.01,beam='#5a3d2b';
  return <group>
    <mesh position-y={G+0.25} castShadow receiveShadow><boxGeometry args={[W+0.08,0.5,D+0.08]}/>{P(m.stone)}</mesh>
    <mesh position-y={G+0.5+0.3} castShadow receiveShadow><boxGeometry args={[W,0.6,D]}/>{P(m.brick)}</mesh>
    <mesh position-y={G+1.1+(H-1.1)/2} castShadow receiveShadow><boxGeometry args={[W,H-1.1,D]}/>{P(m.plaster)}</mesh>
    {/* timber framing on the front and the sides */}
    {[[0,1.12,W,0.1],[0,H-0.05,W+0.02,0.1]].map(([x,y,w,h],i)=><mesh key={i} position={[x,G+y,fz+0.02]}><boxGeometry args={[w,h,0.06]}/>{M(beam)}</mesh>)}
    {[-W/2+0.05,-0.65,0.65,W/2-0.05].map(x=><mesh key={x} position={[x,G+1.1+(H-1.1)/2,fz+0.02]}><boxGeometry args={[0.1,H-1.1,0.06]}/>{M(beam)}</mesh>)}
    {[-1,1].map(k=><mesh key={'d'+k} position={[k*1.22,G+1.65,fz+0.02]} rotation-z={k*0.75}><boxGeometry args={[0.08,1.05,0.05]}/>{M(beam)}</mesh>)}
    {[-1,1].map(k=><group key={'s'+k} position={[k*(W/2+0.01),G+1.1+(H-1.1)/2,0]} rotation-y={k*Math.PI/2}>
      {[-D/2+0.05,0,D/2-0.05].map(x=><mesh key={x} position-x={x}><boxGeometry args={[0.1,H-1.1,0.06]}/>{M(beam)}</mesh>)}
      <mesh position-y={(H-1.1)/2-0.05}><boxGeometry args={[D,0.1,0.06]}/>{M(beam)}</mesh>
      <group position-y={0.05}><Window w={0.55} h={0.45} frame="#f4eedf" lit={lit} glow={glow}/></group></group>)}
    <Gable W={W} D={D} H={H} rise={1.25} roof={m.roof} gable={m.gable} ridge="#7a3f2c"/>
    <mesh position={[1.05,G+H+1.0,-0.4]} castShadow><boxGeometry args={[0.36,1.3,0.36]}/>{P(m.brick)}</mesh>
    <mesh position={[1.05,G+H+1.68,-0.4]}><boxGeometry args={[0.44,0.08,0.44]}/>{M('#7a3f2c')}</mesh>
    {/* the door: planks, an arched head, iron straps, a step */}
    <group position={[0,G,fz]}>
      <mesh position={[0,0.75,0.02]}><boxGeometry args={[0.9,1.5,0.06]}/>{P(m.door)}</mesh>
      <mesh position={[0,1.5,0.02]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.45,0.45,0.06,20,1,false,Math.PI/2,Math.PI]}/>{P(m.door)}</mesh>
      {[0.35,1.15].map(y=><mesh key={y} position={[-0.12,y,0.06]}><boxGeometry args={[0.55,0.05,0.02]}/>{M('#2f2a28')}</mesh>)}
      <mesh position={[0.3,0.78,0.08]}><torusGeometry args={[0.05,0.012,6,14]}/>{M('#2f2a28')}</mesh>
      <mesh position={[0,0.04,0.3]}><boxGeometry args={[1.2,0.08,0.5]}/>{P(m.stone)}</mesh>
    </group>
    <Lantern p={[0.65,G+1.75,fz]}/>
    {/* the shop window on the left with model houses, under a striped awning; a shuttered window on the right */}
    <group position={[-1.15,G+1.25,fz+0.03]}>
      <Window w={1.0} h={0.75} frame="#5a3d2b" lit={lit} panes={[3,1]} glow={glow}/>
      {[-0.3,0,0.3].map((x,i)=><group key={x} position={[x,-0.3,0.08]} scale={0.6}>
        <mesh position-y={0.12}><boxGeometry args={[0.3,0.24,0.2]}/>{M('#fbefe0')}</mesh><mesh position-y={0.3} rotation-y={Math.PI/4}><coneGeometry args={[0.24,0.16,4]}/>{M(['#c44b3b','#4f7fb8','#6fbf4a'][i])}</mesh></group>)}
      <mesh position={[0,0.62,0.28]} rotation-x={0.55}><planeGeometry args={[1.35,0.62]}/>{P(m.awn)}</mesh>
    </group>
    <group position={[1.15,G+1.3,fz+0.03]}><Window w={0.62} h={0.62} frame="#f4eedf" lit={lit} glow={glow}/>
      {[-1,1].map(k=><mesh key={k} position={[k*0.5,0,0.02]}><boxGeometry args={[0.3,0.75,0.04]}/>{M('#5f8a7a')}</mesh>)}
      <group position={[0,-0.5,0.12]}><FlowerBox w={0.75} color="#8a5a3e"/></group></group>
    {/* 피드백 2026-11-26 "간판 왜 가려져 있어": the sign used to hang under the eave, where the roof hid its top and the
        lantern and awning crossed it; it stands on the front of the roof now, on two posts, clear of everything */}
    {(()=>{const sz=D/2-0.55,ry=G+H+1.25*(1-sz/(D/2)),lift=0.14;
      return <group position={[0,ry,sz]}>
        {[-0.42,0.42].map(x=><mesh key={x} position={[x,lift/2,0]}><boxGeometry args={[0.07,lift+0.2,0.07]}/>{M('#5a3d2b')}</mesh>)}
        <mesh position-y={lift+0.31} castShadow><boxGeometry args={[1.1,0.62,0.06]}/>{P(m.sign)}</mesh></group>})()}
    {/* outside: lumber, a brick pile, a wheelbarrow, shrubs */}
    <group position={[W/2+0.4,G,D/2-0.3]}>{[0,1,2,3,4].map(i=><mesh key={i} position={[0,0.06+Math.floor(i/2)*0.12,(i%2)*0.2]} rotation-y={0.05*i}><boxGeometry args={[0.14,0.1,1.2]}/>{M(['#c9a27a','#b58e66','#d4b088'][i%3])}</mesh>)}</group>
    <group position={[-W/2-0.35,G,D/2-0.4]}>{[0,1,2,3,4,5].map(i=><mesh key={i} position={[(i%3)*0.22-0.22,0.06+Math.floor(i/3)*0.11,0]}><boxGeometry args={[0.2,0.1,0.1]}/>{M('#b5523b')}</mesh>)}</group>
    <group position={[W/2+0.3,G,D/2+0.6]} rotation-y={-0.6}>
      <mesh position-y={0.35} rotation-x={0.15}><boxGeometry args={[0.45,0.2,0.6]}/>{M('#5f8a7a')}</mesh>
      <mesh position={[0,0.15,0.3]} rotation-x={Math.PI/2}><torusGeometry args={[0.13,0.04,8,16]}/>{M('#2f2a28')}</mesh>
      {[-1,1].map(k=><mesh key={k} position={[k*0.18,0.35,-0.45]} rotation-x={-0.4}><cylinderGeometry args={[0.02,0.02,0.6,6]}/>{M('#8a5a3e')}</mesh>)}</group>
    {[-1,1].map(k=><group key={'b'+k} position={[k*0.85,G,fz+0.35]}><mesh position-y={0.15}><cylinderGeometry args={[0.15,0.12,0.3,12]}/>{M('#c27a55')}</mesh><mesh position-y={0.42}><sphereGeometry args={[0.2,12,10]}/>{M('#4f9a45')}</mesh></group>)}
  </group>;
}

// ------------------------------------------------------------ 옷 가게
export function TailorFacade({W,D,H,lit,glow}:{W:number;D:number;H:number;lit:boolean;glow:THREE.Material}){
  const m=useMemo(()=>({wall:tmat(siding([246,206,218]),W/1.6,H/1.6),roof:tmat(shingles([186,118,170]),4,2,0.8),door:tmat(planks([212,106,140]),1,1),
    awn:new THREE.MeshStandardMaterial({map:stripes('#d46a8c','#fffaf4',true),side:THREE.DoubleSide,transparent:true}),
    sign:new THREE.MeshStandardMaterial({map:canvas(160,160,g=>{g.fillStyle='#fffaf4';g.beginPath();g.moveTo(40,20);g.lineTo(60,10);g.quadraticCurveTo(80,30,100,10);g.lineTo(120,20);g.lineTo(150,50);g.lineTo(125,70);g.lineTo(118,60);g.lineTo(118,150);g.lineTo(42,150);g.lineTo(42,60);g.lineTo(35,70);g.lineTo(10,50);g.closePath();g.fill();
      g.strokeStyle='#d46a8c';g.lineWidth=5;g.stroke();g.fillStyle='#d46a8c';g.font='bold 26px "Jua",sans-serif';g.textAlign='center';g.fillText('옷',80,95);g.font='bold 20px "Jua",sans-serif';g.fillText('가게',80,125)}),transparent:true,alphaTest:0.1,side:THREE.DoubleSide})}),[W,H]);
  useDisposeAll(m);
  const fz=D/2+0.01;
  return <group>
    <mesh position-y={G+0.15}><boxGeometry args={[W+0.06,0.3,D+0.06]}/>{M('#f4eedf')}</mesh>
    <mesh position-y={G+H/2} castShadow receiveShadow><boxGeometry args={[W,H,D]}/>{P(m.wall)}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*W/2,G+H/2,fz]}><boxGeometry args={[0.12,H,0.12]}/>{M('#fffaf4')}</mesh>)}
    <mesh position={[0,G+H+0.04,0]}><boxGeometry args={[W+0.2,0.1,D+0.2]}/>{M('#fffaf4')}</mesh>
    {/* the rounded roof and its scalloped edge */}
    <mesh position-y={G+H+0.08} rotation-z={Math.PI/2} scale={[0.85,1,1]} castShadow><cylinderGeometry args={[D/2+0.15,D/2+0.15,W+0.3,28,1,false,0,Math.PI]}/>{P(m.roof)}</mesh>
    {[-1,1].map(k=><mesh key={'e'+k} position={[k*(W/2+0.15),G+H+0.08,0]} rotation-y={Math.PI/2} scale={[1,0.85,1]}><circleGeometry args={[D/2+0.15,28,0,Math.PI]}/>{M('#fbe0ea')}</mesh>)}
    {Array.from({length:14},(_,i)=><mesh key={'sc'+i} position={[-W/2-0.1+i*(W+0.2)/13,G+H+0.02,fz+0.12]}><circleGeometry args={[0.13,12,Math.PI,Math.PI]}/>{M('#fffaf4')}</mesh>)}
    <mesh position={[0,G+H+0.08+(D/2+0.15)*0.85,0]}><sphereGeometry args={[0.12,12,10]}/>{M('#f2c94c')}</mesh>
    {/* door with a round window */}
    <group position={[0,G,fz]}>
      <mesh position={[0,0.8,0.02]}><boxGeometry args={[0.85,1.6,0.06]}/>{P(m.door)}</mesh>
      <mesh position={[0,1.2,0.06]}><circleGeometry args={[0.18,20]}/>{lit?P(glow):M('#5c6470')}</mesh>
      <mesh position={[0,1.2,0.055]}><torusGeometry args={[0.18,0.025,8,24]}/>{M('#fffaf4')}</mesh>
      <mesh position={[0.28,0.8,0.08]}><sphereGeometry args={[0.045,10,8]}/>{M('#f2c94c')}</mesh>
      <mesh position={[0,0.05,0.25]}><boxGeometry args={[1.1,0.1,0.4]}/>{M('#fffaf4')}</mesh></group>
    {/* two display windows: a dressed mannequin; shirts and a hanging tee */}
    {[-1,1].map(k=><group key={'w'+k} position={[k*1.15,G+1.15,fz+0.03]}>
      <Window w={0.9} h={1.1} frame="#fffaf4" lit={lit} panes={[1,1]} glow={glow}/>
      {k<0?<group position={[0,-0.42,0.1]}>
        <mesh position-y={0.55} scale={[1,1.2,0.7]}><sphereGeometry args={[0.1,12,10]}/>{M('#efe3c8')}</mesh>
        <mesh position-y={0.3}><coneGeometry args={[0.2,0.4,16,1,true]}/><meshStandardMaterial color="#6aa6d8" side={THREE.DoubleSide}/></mesh>
        <mesh position-y={0.72}><sphereGeometry args={[0.07,10,8]}/>{M('#efe3c8')}</mesh>
        <mesh position-y={0.8}><cylinderGeometry args={[0.12,0.12,0.02,16]}/>{M('#f2c94c')}</mesh></group>
      :<group position={[0,-0.1,0.1]}>
        <mesh position-y={0.25}><boxGeometry args={[0.28,0.3,0.03]}/>{M('#f2d36a')}</mesh>{[-1,1].map(j=><mesh key={j} position={[j*0.18,0.35,0]} rotation-z={j*-0.6}><boxGeometry args={[0.1,0.12,0.03]}/>{M('#f2d36a')}</mesh>)}
        {[0,1,2].map(j=><mesh key={j} position={[0,-0.35+j*0.05,0]}><boxGeometry args={[0.36,0.045,0.18]}/>{M(['#d46a8c','#4f8a5b','#6aa6d8'][j])}</mesh>)}</group>}
      <group position={[0,-0.7,0.12]}><FlowerBox w={0.95} color="#fffaf4"/></group></group>)}
    <mesh position={[0,G+2.05,fz+0.35]} rotation-x={0.45}><planeGeometry args={[W+0.1,0.6]}/>{P(m.awn)}</mesh>
    {/* the T-shirt sign on a bracket at the corner */}
    <group position={[W/2+0.05,G+2.2,fz-0.2]}><mesh position-x={0.25}><boxGeometry args={[0.55,0.04,0.04]}/>{M('#2f2a28')}</mesh>
      <mesh position={[0.4,-0.33,0]} rotation-y={Math.PI/2}><planeGeometry args={[0.6,0.6]}/>{P(m.sign)}</mesh></group>
    {/* a little rack outside and a bench */}
    <group position={[-W/2-0.45,G,D/2-0.2]}>{[-1,1].map(k=><mesh key={k} position={[0,0.6,k*0.35]}><cylinderGeometry args={[0.02,0.02,1.2,6]}/>{M('#c9a23a')}</mesh>)}
      <mesh position-y={1.2} rotation-x={Math.PI/2}><cylinderGeometry args={[0.02,0.02,0.75,6]}/>{M('#c9a23a')}</mesh>
      {[-0.22,0,0.22].map((z,i)=><mesh key={z} position={[0,0.92,z]}><boxGeometry args={[0.05,0.4,0.2]}/>{M(['#6aa6d8','#f2d36a','#4f8a5b'][i])}</mesh>)}</group>
    <group position={[W/2+0.5,G,D/2+0.5]} rotation-y={-0.4}><mesh position-y={0.4}><boxGeometry args={[0.9,0.06,0.32]}/>{M('#fffaf4')}</mesh>
      {[-0.38,0.38].map(x=><mesh key={x} position={[x,0.2,0]}><boxGeometry args={[0.05,0.4,0.28]}/>{M('#d46a8c')}</mesh>)}</group>
  </group>;
}

// ------------------------------------------------------------ 도서관
export function LibraryFacade({W,D,H,lit,glow}:{W:number;D:number;H:number;lit:boolean;glow:THREE.Material}){
  const m=useMemo(()=>({stone:tmat(stone(),W/1.0,H/1.0),step:tmat(stone(),2,0.3),door:tmat(planks([96,62,40]),1,1),
    copper:new THREE.MeshStandardMaterial({color:'#6f9a88',metalness:0.35,roughness:0.55}),white:new THREE.MeshStandardMaterial({color:'#f4f1ea',roughness:0.7}),
    book:new THREE.MeshStandardMaterial({map:canvas(256,96,g=>{g.fillStyle='#f4f1ea';g.fillRect(0,0,256,96);g.fillStyle='#3f6a5a';g.font='bold 44px "Gowun Batang",serif';g.textAlign='center';g.fillText('도 서 관',128,64)})})}),[W,H]);
  useDisposeAll(m);
  const fz=D/2+0.01,cz=D/2+0.6;
  const ped=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-1.5,0);s.lineTo(1.5,0);s.lineTo(0,0.6);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:0.25,bevelEnabled:false})},[]);
  useEffect(()=>()=>ped.dispose(),[ped]);
  return <group>
    <mesh position-y={G+H/2} castShadow receiveShadow><boxGeometry args={[W,H,D]}/>{P(m.stone)}</mesh>
    <mesh position-y={G+0.12}><boxGeometry args={[W+0.15,0.24,D+0.15]}/>{P(m.step)}</mesh>
    <mesh position-y={G+H+0.06}><boxGeometry args={[W+0.25,0.14,D+0.25]}/>{P(m.white)}</mesh>
    {/* copper hip roof and a cupola */}
    <mesh position-y={G+H+0.6} rotation-y={Math.PI/4} scale={[(W+0.3)/Math.SQRT2/1.0,1,(D+0.3)/Math.SQRT2/1.0]} castShadow><coneGeometry args={[1,1.0,4]}/>{P(m.copper)}</mesh>
    <group position-y={G+H+1.0}><mesh position-y={0.25}><cylinderGeometry args={[0.32,0.32,0.5,12]}/>{P(m.white)}</mesh>
      <mesh position-y={0.5}><sphereGeometry args={[0.36,16,10,0,Math.PI*2,0,Math.PI/2]}/>{P(m.copper)}</mesh><mesh position-y={0.92}><coneGeometry args={[0.04,0.2,8]}/>{M('#c9a23a')}</mesh>
      {[0,1,2,3].map(i=><mesh key={i} position={[Math.sin(i*Math.PI/2)*0.33,0.25,Math.cos(i*Math.PI/2)*0.33]} rotation-y={i*Math.PI/2}><planeGeometry args={[0.16,0.28]}/>{lit?P(glow):M('#5c6470')}</mesh>)}</group>
    {/* steps, columns, a pediment with the open book */}
    {[0,1,2].map(i=><mesh key={i} position={[0,G+0.06+i*0.08,fz+0.95-i*0.22]} receiveShadow><boxGeometry args={[2.9-i*0.1,0.12,0.5]}/>{P(m.step)}</mesh>)}
    <mesh position={[0,G+0.3,cz]}><boxGeometry args={[3.2,0.08,0.7]}/>{P(m.white)}</mesh>
    {[-1.35,-0.5,0.5,1.35].map(x=><group key={x} position={[x,G+0.3,cz]}>
      <mesh position-y={0.06}><boxGeometry args={[0.32,0.1,0.32]}/>{P(m.white)}</mesh>
      <mesh position-y={0.95} castShadow><cylinderGeometry args={[0.11,0.13,1.75,14]}/>{P(m.white)}</mesh>
      {Array.from({length:6},(_,j)=><mesh key={j} position={[Math.cos(j)*0.12,0.95,Math.sin(j)*0.12]}><boxGeometry args={[0.015,1.7,0.015]}/>{M('#dcd6c8')}</mesh>)}
      <mesh position-y={1.87}><boxGeometry args={[0.32,0.12,0.32]}/>{P(m.white)}</mesh></group>)}
    <mesh position={[0,G+2.45,cz]}><boxGeometry args={[3.3,0.2,0.75]}/>{P(m.white)}</mesh>
    <mesh geometry={ped} position={[0,G+2.55,cz-0.12]}>{P(m.white)}</mesh>
    <group position={[0,G+2.75,cz+0.14]}>{[-1,1].map(k=><mesh key={k} position-x={k*0.1} rotation-y={k*-0.3}><boxGeometry args={[0.2,0.16,0.02]}/>{M('#fbf7ec')}</mesh>)}
      <mesh position-z={-0.01}><boxGeometry args={[0.44,0.2,0.02]}/>{M('#7a3f2c')}</mesh></group>
    <mesh position={[0,G+2.25,cz+0.38]}><planeGeometry args={[1.3,0.24]}/>{P(m.book)}</mesh>
    {/* tall double doors, arched lit windows */}
    <group position={[0,G,fz]}>{[-1,1].map(k=><mesh key={k} position={[k*0.27,0.95,0.03]}><boxGeometry args={[0.52,1.9,0.06]}/>{P(m.door)}</mesh>)}
      {[-1,1].map(k=><mesh key={'k'+k} position={[k*0.08,0.95,0.08]}><sphereGeometry args={[0.04,8,6]}/>{M('#c9a23a')}</mesh>)}
      <mesh position={[0,2.0,0.03]}><boxGeometry args={[1.2,0.16,0.08]}/>{P(m.white)}</mesh></group>
    {[-1,1].map(k=><group key={'w'+k} position={[k*1.6,G+1.3,fz+0.02]}>
      <mesh><boxGeometry args={[0.66,1.0,0.06]}/>{P(m.white)}</mesh>
      <mesh position-z={0.035}><planeGeometry args={[0.52,0.86]}/>{lit?P(glow):M('#5c6470')}</mesh>
      <mesh position={[0,0.5,0.03]} rotation-x={Math.PI/2}><cylinderGeometry args={[0.33,0.33,0.06,18,1,false,Math.PI/2,Math.PI]}/>{P(m.white)}</mesh>
      <mesh position={[0,0.5,0.065]}><circleGeometry args={[0.26,16,0,Math.PI]}/>{lit?P(glow):M('#5c6470')}</mesh>
      <mesh position={[0,0,0.07]}><boxGeometry args={[0.03,0.86,0.02]}/>{P(m.white)}</mesh></group>)}
    {/* ivy on the corners, lamp posts, a book drop */}
    {[-1,1].map(k=><group key={'i'+k} position={[k*(W/2+0.02),G,fz-0.1]}>{Array.from({length:12},(_,j)=><mesh key={j} position={[0,0.2+j*0.18,-(j%3)*0.15]}><sphereGeometry args={[0.13-(j%4)*0.015,8,6]}/>{M(j%2?'#4f8a3f':'#5f9a4f')}</mesh>)}</group>)}
    {[-1,1].map(k=><group key={'l'+k} position={[k*1.85,G,fz+1.45]}><mesh position-y={0.8}><cylinderGeometry args={[0.035,0.05,1.6,8]}/>{M('#2f3a35')}</mesh>
      <mesh position-y={1.7}><boxGeometry args={[0.2,0.24,0.2]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={lit?1.2:0.2} toneMapped={false}/></mesh>
      <mesh position-y={1.87}><coneGeometry args={[0.17,0.12,4]}/>{M('#2f3a35')}</mesh></group>)}
    <group position={[W/2+0.45,G,fz+0.3]}><mesh position-y={0.45}><boxGeometry args={[0.45,0.9,0.4]}/>{M('#3f6a5a')}</mesh><mesh position-y={0.95} rotation-z={Math.PI/2}><cylinderGeometry args={[0.2,0.2,0.45,12,1,false,0,Math.PI]}/>{M('#3f6a5a')}</mesh>
      <mesh position={[0,0.65,0.205]}><boxGeometry args={[0.3,0.05,0.01]}/>{M('#1f1b1a')}</mesh></group>
  </group>;
}
