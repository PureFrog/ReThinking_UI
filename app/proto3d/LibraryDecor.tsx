'use client';
// 도서관 꾸미기 (피드백 2026-11-26 "누가 봐도 도서관"): floor-to-ceiling bookcases with real-looking spines (gold bands, a
// title plate, mixed heights, a few leaning or lying flat), a rolling ladder, a card catalogue, green banker's lamps, a
// reading table, a runner rug, a "조용히" plaque and a wall clock. The 사서 gets a name plate, a book in hand and a
// stamp on the counter. Room: w 7, d 5, h 3.6 (Shop3D ROOM), back wall at z=-2.5, side walls at x=±3.5.
import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {soft} from './materials';

const W=7,D=5,H=3.6,BACK=-D/2;
const S=(c:string)=><primitive object={soft(c)} attach="material"/>;
export const SPINES=['#7a2e26','#2f4a6a','#3f5f3a','#8a6a2e','#5a3d6b','#2e5f5f','#9a4a3a','#3d3d52','#6b4a2e','#a0522d'];
// one spine texture per colour: the cloth, two gold bands, a small title plate
function spineTex(col:string){
  const cv=document.createElement('canvas');cv.width=32;cv.height=128;const g=cv.getContext('2d')!;
  g.fillStyle=col;g.fillRect(0,0,32,128);g.fillStyle='#00000022';g.fillRect(0,0,4,128);g.fillRect(28,0,4,128);
  g.fillStyle='#d9b45a';g.fillRect(2,12,28,4);g.fillRect(2,110,28,4);g.fillRect(2,20,28,2);g.fillRect(2,104,28,2);
  g.fillStyle='#f1e4c0';g.fillRect(7,44,18,34);g.fillStyle='#5a4a3a';for(let i=0;i<3;i++)g.fillRect(10,50+i*9,12,3);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function useSpineMats(){
  const mats=useMemo(()=>SPINES.map(c=>{const side=soft(c),tex=spineTex(c);const front=new THREE.MeshToonMaterial({map:tex});
    // box faces: +x,-x,+y,-y,+z(spine),-z
    return {mats:[side,side,soft('#efe3c4'),side,front,side],tex,front}}),[]);
  useEffect(()=>()=>mats.forEach(m=>{m.tex.dispose();m.front.dispose()}),[mats]);
  return mats;
}
// a bookcase: `cols` wide, `rows` shelves, books of mixed heights with a few leaning and a few lying flat
function Bookcase({position,rotY=0,width,height,rows,seed}:{position:[number,number,number];rotY?:number;width:number;height:number;rows:number;seed:number}){
  const sp=useSpineMats(),dep=0.42,gap=(height-0.2)/rows;
  const books=useMemo(()=>{const out:{x:number;y:number;h:number;w:number;c:number;lean:number;flat:boolean}[]=[];let r=seed;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280};
    for(let row=0;row<rows;row++){let x=-width/2+0.08;const y=0.14+row*gap;
      while(x<width/2-0.12){const flat=rnd()<0.06,w=flat?0.3:0.07+rnd()*0.06,h=flat?0.06:Math.min(gap-0.08,0.28+rnd()*0.16);
        if(rnd()<0.05){x+=0.12;continue}
        const lean=!flat&&rnd()<0.05?0.22:0;out.push({x:x+w/2,y,h,w,c:Math.floor(rnd()*SPINES.length),lean,flat});x+=w+(lean?0.06:0.004)}}
    return out},[width,rows,gap,seed]);
  return <group position={position} rotation-y={rotY}>
    <mesh position={[0,height/2,-dep/2]} receiveShadow><boxGeometry args={[width,height,0.04]}/>{S('#3e2a1e')}</mesh>
    {[-1,1].map(k=><mesh key={k} position={[k*width/2,height/2,0]} castShadow><boxGeometry args={[0.07,height,dep]}/>{S('#5a3a26')}</mesh>)}
    {Array.from({length:rows+1},(_,i)=><mesh key={i} position={[0,0.1+i*gap,0]} receiveShadow><boxGeometry args={[width,0.05,dep]}/>{S('#6a4630')}</mesh>)}
    <mesh position={[0,height+0.04,0.02]}><boxGeometry args={[width+0.12,0.1,dep+0.06]}/>{S('#5a3a26')}</mesh>
    {books.map((b,i)=><mesh key={i} position={[b.x,b.y+(b.flat?b.h/2:b.h/2),0.02]} rotation-z={b.lean} castShadow material={sp[b.c].mats}>
      <boxGeometry args={b.flat?[b.w,b.h,0.26]:[b.w,b.h,0.28]}/></mesh>)}
  </group>;
}
function plaqueTex(text:string,bg:string,fg:string,w=256,h=80){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d')!;
  g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle='#d9b45a';g.lineWidth=5;g.strokeRect(5,5,w-10,h-10);
  g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font=`bold ${Math.round(h*0.45)}px "Gowun Batang","Jua",serif`;g.fillText(text,w/2,h/2+2);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function BankerLamp({position}:{position:[number,number,number]}){
  return <group position={position}>
    <mesh position-y={0.02}><cylinderGeometry args={[0.08,0.09,0.04,14]}/>{S('#c9a23a')}</mesh>
    <mesh position-y={0.14}><cylinderGeometry args={[0.012,0.012,0.24,8]}/>{S('#c9a23a')}</mesh>
    <mesh position-y={0.27} rotation-z={Math.PI/2}><cylinderGeometry args={[0.07,0.07,0.32,16,1,true,0,Math.PI]}/><meshStandardMaterial color="#1f6b45" side={THREE.DoubleSide} emissive="#0d3a24" emissiveIntensity={0.4}/></mesh>
    <mesh position-y={0.24} rotation-z={Math.PI/2}><cylinderGeometry args={[0.03,0.03,0.26,10]}/><meshStandardMaterial color="#fff2c8" emissive="#ffd78a" emissiveIntensity={1.2}/></mesh>
    <pointLight position-y={0.15} intensity={0.9} distance={2.2} color="#ffe0a0"/>
  </group>;
}
export function LibraryDecor(){
  const quiet=useMemo(()=>plaqueTex('조용히','#2f4a3a','#f1e4c0'),[]),name=useMemo(()=>plaqueTex('사서','#2f4a3a','#f1e4c0',192,64),[]);
  useEffect(()=>()=>{quiet.dispose();name.dispose()},[quiet,name]);
  return <group name="library-decor">
    {/* the back wall: three tall bookcases, a rolling ladder on a brass rail */}
    <Bookcase position={[-2.3,0,BACK+0.26]} width={2.1} height={H-0.15} rows={6} seed={7}/>
    <Bookcase position={[0,0,BACK+0.26]} width={2.3} height={H-0.15} rows={6} seed={21}/>
    <Bookcase position={[2.3,0,BACK+0.26]} width={2.1} height={H-0.15} rows={6} seed={33}/>
    <mesh position={[0,3.0,BACK+0.5]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.02,0.02,W-0.4,8]}/>{S('#c9a23a')}</mesh>
    <group position={[1.15,0,BACK+0.7]} rotation-x={-0.12}>
      {[-0.22,0.22].map(x=><mesh key={x} position={[x,1.5,0]}><boxGeometry args={[0.05,3.0,0.05]}/>{S('#7a5236')}</mesh>)}
      {Array.from({length:9},(_,i)=><mesh key={i} position={[0,0.25+i*0.32,0]}><boxGeometry args={[0.44,0.03,0.06]}/>{S('#7a5236')}</mesh>)}
    </group>
    {/* side walls: bookcases toward the front, the plaque and a clock */}
    <Bookcase position={[-W/2+0.25,0,0.2]} rotY={Math.PI/2} width={2.6} height={2.6} rows={4} seed={51}/>
    <Bookcase position={[W/2-0.25,0,0.2]} rotY={-Math.PI/2} width={2.6} height={2.6} rows={4} seed={63}/>
    <mesh position={[-W/2+0.08,3.05,0.2]} rotation-y={Math.PI/2}><planeGeometry args={[0.9,0.28]}/><meshBasicMaterial map={quiet}/></mesh>
    {/* a card catalogue by the left front */}
    <group position={[-2.6,0,2.2]} rotation-y={0.5}>
      <mesh position-y={0.55} castShadow><boxGeometry args={[0.9,1.1,0.5]}/>{S('#6a4630')}</mesh>
      {Array.from({length:12},(_,i)=><group key={i} position={[-0.3+(i%4)*0.2,0.25+Math.floor(i/4)*0.3,0.26]}>
        <mesh><boxGeometry args={[0.17,0.24,0.02]}/>{S('#7d573c')}</mesh><mesh position={[0,0.04,0.015]}><boxGeometry args={[0.08,0.04,0.01]}/>{S('#f1e4c0')}</mesh>
        <mesh position={[0,-0.05,0.02]}><sphereGeometry args={[0.018,8,6]}/>{S('#c9a23a')}</mesh></group>)}
    </group>
    {/* a reading table with a lamp, open books and two chairs, front right */}
    <group position={[2.3,0,2.0]} rotation-y={-0.35}>
      <mesh position-y={0.74} castShadow receiveShadow><boxGeometry args={[1.4,0.06,0.8]}/>{S('#6a4630')}</mesh>
      {[[-0.62,-0.32],[0.62,-0.32],[-0.62,0.32],[0.62,0.32]].map(([x,z],i)=><mesh key={i} position={[x,0.37,z]}><boxGeometry args={[0.06,0.74,0.06]}/>{S('#4a3022')}</mesh>)}
      <BankerLamp position={[-0.4,0.77,-0.15]}/>
      <mesh position={[0.25,0.785,0.05]} rotation-y={0.2}><boxGeometry args={[0.46,0.02,0.32]}/>{S('#f6efdc')}</mesh>
      <mesh position={[0.25,0.79,0.05]} rotation-y={0.2}><boxGeometry args={[0.01,0.02,0.32]}/>{S('#b8a888')}</mesh>
      {[-1,1].map(k=><group key={k} position={[k*0.45,0,0.75]}><mesh position-y={0.45}><boxGeometry args={[0.42,0.05,0.42]}/>{S('#7d573c')}</mesh>
        <mesh position={[0,0.75,0.19]}><boxGeometry args={[0.42,0.6,0.05]}/>{S('#7d573c')}</mesh>
        {[[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]].map(([x,z],i)=><mesh key={i} position={[x,0.22,z]}><boxGeometry args={[0.04,0.44,0.04]}/>{S('#4a3022')}</mesh>)}</group>)}
    </group>
    {/* a long green runner from the door to the counter */}
    <mesh rotation-x={-Math.PI/2} position={[0,0.005,1.9]} receiveShadow><planeGeometry args={[1.5,3.4]}/>{S('#2f5a3e')}</mesh>
    <mesh rotation-x={-Math.PI/2} position={[0,0.006,1.9]}><planeGeometry args={[1.3,3.2]}/>{S('#3c6e4c')}</mesh>
    {/* pendant lights */}
    {[-1.8,0,1.8].map(x=><group key={x} position={[x,H,0.4]}>
      <mesh position-y={-0.3}><cylinderGeometry args={[0.008,0.008,0.6,6]}/>{S('#2a2a2a')}</mesh>
      <mesh position-y={-0.68}><sphereGeometry args={[0.14,16,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#1f6b45" side={THREE.DoubleSide}/></mesh>
      <mesh position-y={-0.7}><sphereGeometry args={[0.05,10,8]}/><meshStandardMaterial color="#fff2c8" emissive="#ffd78a" emissiveIntensity={1.5}/></mesh>
      <pointLight position-y={-0.8} intensity={1.6} distance={4} color="#ffe2a8"/></group>)}
    {/* on the counter (Shop3D: counter at z 0.2, top at 1.06): the name plate, a green lamp, a stamp and a stack of books */}
    <group position={[0,1.07,0.2]}>
      <mesh position={[-0.7,0.08,0.33]} rotation-x={-0.25}><planeGeometry args={[0.42,0.14]}/><meshBasicMaterial map={name}/></mesh>
      <mesh position={[-0.7,0.04,0.3]}><boxGeometry args={[0.44,0.08,0.06]}/>{S('#3e2a1e')}</mesh>
      <BankerLamp position={[-1.3,0,-0.1]}/>
      <group position={[0.35,0,0.05]}><mesh position-y={0.04}><cylinderGeometry args={[0.05,0.06,0.06,12]}/>{S('#7a2e26')}</mesh><mesh position-y={0.12}><sphereGeometry args={[0.04,10,8]}/>{S('#3e2a1e')}</mesh></group>
      {[0,1,2].map(i=><mesh key={i} position={[1.25,0.03+i*0.06,0]} rotation-y={i*0.15} castShadow><boxGeometry args={[0.32,0.055,0.24]}/>{S(SPINES[i*3])}</mesh>)}
    </group>
    {/* the 사서 holds a book */}
    <mesh position={[0.28,1.28,-0.55]} rotation={[0.3,0,-0.3]} castShadow><boxGeometry args={[0.28,0.36,0.06]}/>{S('#2f4a6a')}</mesh>
  </group>;
}
