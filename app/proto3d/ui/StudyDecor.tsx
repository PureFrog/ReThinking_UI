'use client';
// 거장의 집 꾸미기 (피드백 2026-11-25 "지나치게 썰렁, 모동숲 분위기"): wallpaper, a parquet floor, wainscoting and mouldings,
// a window with curtains, pictures, a wall clock, a writing desk with reports and soda bottles, a globe, a plant and a
// pendant lamp. Room numbers come from LOOK.study (back wall at z=-d/2, left wall at x=-w/2). Nothing here is clickable.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from '../materials';
import {LOOK} from '../look';

const L=()=>LOOK.study;
function canvasTex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void,repeat?:[number,number]){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat)}return t;
}
const M=(c:string)=><primitive object={soft(c)} attach="material"/>;

export function wallpaper(base:string,w:number,h:number){
  return canvasTex(128,128,g=>{g.fillStyle=base;g.fillRect(0,0,128,128);
    g.fillStyle='#00000010';for(let x=0;x<128;x+=32)g.fillRect(x,0,10,128);
    g.fillStyle='#b8923f30';for(let y=16;y<128;y+=32)for(let x=21;x<128;x+=32){g.beginPath();g.moveTo(x,y-5);g.lineTo(x+4,y);g.lineTo(x,y+5);g.lineTo(x-4,y);g.fill()}},[w/0.8,h/0.8]);
}
export function parquet(w:number,d:number){
  return canvasTex(128,128,g=>{const cols=['#9a6f4c','#8c6242','#a77a54','#93684a'];
    for(let r=0;r<8;r++)for(let k=0;k<3;k++){const off=(r%2)*21;g.fillStyle=cols[(r*3+k)%cols.length];g.fillRect(k*43-off,r*16,43,16);g.fillRect(k*43-off+128,r*16,43,16)}
    g.strokeStyle='#5a3d2b55';g.lineWidth=1;for(let r=0;r<=8;r++){g.beginPath();g.moveTo(0,r*16);g.lineTo(128,r*16);g.stroke()}},[w/0.8,d/0.8]);
}
// 피드백 2026-11-26 "액자에 제대로 된 그림": an oil landscape (a lake under evening hills, a sailboat, birches), painted in
// short strokes so it reads as brushwork, not a flat drawing
function strokes(g:CanvasRenderingContext2D,x0:number,y0:number,w:number,h:number,cols:string[],n:number,len=7,th=3,ang=0){
  for(let i=0;i<n;i++){const x=x0+Math.random()*w,y=y0+Math.random()*h,a=ang+(Math.random()-0.5)*0.5,l=len*(0.6+Math.random()*0.8);
    g.strokeStyle=cols[(Math.random()*cols.length)|0];g.lineWidth=th*(0.6+Math.random()*0.7);g.lineCap='round';
    g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}}
function pictureTex(){return canvasTex(512,384,g=>{
  const s=g.createLinearGradient(0,0,0,200);s.addColorStop(0,'#5b7fa6');s.addColorStop(0.55,'#e9b48a');s.addColorStop(1,'#f4d7a1');g.fillStyle=s;g.fillRect(0,0,512,384);
  strokes(g,0,0,512,90,['#6a8db3','#7d9cc0','#8aa6c4','#5b7fa6'],900,12,4);
  strokes(g,0,80,512,110,['#f0c08f','#eaa97e','#f6d4a2','#e39a78','#f7dcb0'],1100,12,4);
  g.fillStyle='#fff1c8';g.beginPath();g.arc(360,150,22,0,7);g.fill();strokes(g,330,125,60,50,['#fff6d8','#ffe7a8'],120,6,3);
  // far hills, near hills
  const hill=(pts:number[][],c:string[],base:string)=>{g.fillStyle=base;g.beginPath();g.moveTo(0,384);pts.forEach(([x,y])=>g.lineTo(x,y));g.lineTo(512,384);g.fill();
    g.save();g.clip();strokes(g,0,Math.min(...pts.map(p=>p[1])),512,200,c,1400,9,4);g.restore()};
  hill([[0,190],[80,160],[170,182],[250,150],[340,178],[430,158],[512,176],[512,215],[0,215]],['#8a7fa0','#9a8aa8','#7d7494','#a896ab'],'#8c80a0');
  hill([[0,205],[60,190],[140,214],[220,196],[300,215],[380,200],[512,212],[512,228],[0,228]],['#5f7d5a','#6e8a5e','#56714f','#7b9563'],'#61805a');
  // the lake, with the sky in it
  g.fillStyle='#d9a988';g.fillRect(0,226,512,80);strokes(g,0,226,512,80,['#e2b48f','#c99c84','#7d9cc0','#efc69b','#b98f7f'],1600,14,2.5,0);
  strokes(g,335,226,50,70,['#fff1c8','#ffe2a0'],140,10,2,0);
  // the near bank, grass and reeds
  g.fillStyle='#4e6b3d';g.beginPath();g.moveTo(0,300);g.quadraticCurveTo(200,282,512,306);g.lineTo(512,384);g.lineTo(0,384);g.fill();
  g.save();g.beginPath();g.moveTo(0,300);g.quadraticCurveTo(200,282,512,306);g.lineTo(512,384);g.lineTo(0,384);g.clip();
  strokes(g,0,280,512,104,['#4e6b3d','#5f7d45','#6e8c4d','#3f5a33','#8a9a55'],2200,10,3.5,-1.4);g.restore();
  // birches on the left
  [[70,120],[96,150],[40,170]].forEach(([x,top])=>{g.strokeStyle='#efe9dc';g.lineWidth=6;g.beginPath();g.moveTo(x,310);g.lineTo(x+4,top);g.stroke();
    for(let y=top+10;y<300;y+=16){g.strokeStyle='#3b3128';g.lineWidth=2;g.beginPath();g.moveTo(x-2,y);g.lineTo(x+4,y+2);g.stroke()}
    strokes(g,x-40,top-30,90,90,['#c7a64a','#d9b85a','#a88a3a','#e6c76d'],260,7,4)});
  // a little sailboat
  g.fillStyle='#5a3d2b';g.beginPath();g.moveTo(232,258);g.lineTo(270,258);g.lineTo(262,266);g.lineTo(238,266);g.fill();
  g.fillStyle='#fbf3e2';g.beginPath();g.moveTo(250,256);g.lineTo(250,214);g.lineTo(268,254);g.fill();g.fillStyle='#e6d6bd';g.beginPath();g.moveTo(248,256);g.lineTo(248,222);g.lineTo(234,254);g.fill();
  // varnish and canvas grain
  for(let i=0;i<9000;i++){g.fillStyle=`rgba(${Math.random()<0.5?'255,240,210':'40,25,10'},0.05)`;g.fillRect(Math.random()*512,Math.random()*384,1,1)}
  const v=g.createRadialGradient(256,192,120,256,192,330);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(40,20,5,0.35)');g.fillStyle=v;g.fillRect(0,0,512,384);
  g.fillStyle='#3b2a20';g.font='italic 12px serif';g.fillText('W.B.',470,372)})}
// 피드백 2026-11-26 "창문 너머로 우리 게임 풍경": the village as seen from the study (green hills, the blue stream, round
// trees, cottages with shingled roofs, a fence, the stadium's flags far off)
function viewTex(){return canvasTex(256,256,g=>{
  const s=g.createLinearGradient(0,0,0,150);s.addColorStop(0,'#8ec9ea');s.addColorStop(1,'#d8eef0');g.fillStyle=s;g.fillRect(0,0,256,256);
  const cloud=(x:number,y:number,k:number)=>{g.fillStyle='#ffffffe6';[[0,0,12],[12,-5,15],[26,0,11],[13,4,12]].forEach(([a,b,r])=>{g.beginPath();g.arc(x+a*k,y+b*k,r*k,0,7);g.fill()})};
  cloud(30,40,1);cloud(170,28,0.8);cloud(120,70,0.6);
  g.fillStyle='#a9cf8e';g.beginPath();g.moveTo(0,140);g.quadraticCurveTo(70,105,140,130);g.quadraticCurveTo(200,112,256,128);g.lineTo(256,256);g.lineTo(0,256);g.fill();
  // stadium far off: a ring and flags
  g.fillStyle='#c94a3a';g.fillRect(176,116,46,10);g.fillStyle='#e9e2d0';g.fillRect(176,112,46,4);
  ['#e85d5d','#f2c14e','#5da0e8','#6cc46c'].forEach((c,i)=>{g.strokeStyle='#5a3d2b';g.lineWidth=1;g.beginPath();g.moveTo(180+i*12,112);g.lineTo(180+i*12,98);g.stroke();g.fillStyle=c;g.fillRect(181+i*12,98,8,5)});
  g.fillStyle='#86bf62';g.beginPath();g.moveTo(0,170);g.quadraticCurveTo(90,140,170,165);g.quadraticCurveTo(220,175,256,160);g.lineTo(256,256);g.lineTo(0,256);g.fill();
  // the stream
  g.strokeStyle='#4f9ee0';g.lineWidth=14;g.beginPath();g.moveTo(-10,215);g.bezierCurveTo(70,190,140,230,266,196);g.stroke();
  g.strokeStyle='#bfe3ff';g.lineWidth=2;g.beginPath();g.moveTo(20,206);g.lineTo(44,201);g.moveTo(150,214);g.lineTo(176,210);g.stroke();
  // cottages
  const house=(x:number,y:number,roof:string,wall:string,k:number)=>{g.fillStyle=wall;g.fillRect(x,y,22*k,15*k);g.fillStyle=roof;g.beginPath();g.moveTo(x-3*k,y);g.lineTo(x+11*k,y-11*k);g.lineTo(x+25*k,y);g.fill();
    g.strokeStyle='rgba(0,0,0,0.18)';g.lineWidth=1;for(let i=1;i<4;i++){g.beginPath();g.moveTo(x-3*k+i*2.5*k,y-i*2.6*k);g.lineTo(x+25*k-i*2.5*k,y-i*2.6*k);g.stroke()}
    g.fillStyle='#6a4a36';g.fillRect(x+9*k,y+6*k,5*k,9*k);g.fillStyle='#ffe9a8';g.fillRect(x+3*k,y+4*k,4*k,4*k);g.fillRect(x+16*k,y+4*k,4*k,4*k)};
  house(40,150,'#c9584a','#f3e5c8',1);house(120,146,'#4f7fb8','#efe2c6',0.8);house(214,150,'#7a9a4a','#f5ead2',0.9);
  // round trees
  const tree=(x:number,y:number,r:number,c:string)=>{g.fillStyle='#6a4a36';g.fillRect(x-2,y,4,r);g.fillStyle=c;g.beginPath();g.arc(x,y-r*0.2,r,0,7);g.fill();g.fillStyle='rgba(255,255,255,0.18)';g.beginPath();g.arc(x-r*0.35,y-r*0.55,r*0.4,0,7);g.fill()};
  tree(18,175,13,'#5aa34a');tree(96,168,11,'#6db24f');tree(160,170,10,'#e9a6b8');tree(240,180,14,'#4f9a45');tree(196,136,7,'#f2c14e');
  // a fence along the near field, flowers
  g.fillStyle='#f6f0e2';for(let x=0;x<256;x+=10){g.fillRect(x,232,3,16)}g.fillRect(0,236,256,2);g.fillRect(0,243,256,2);
  for(let i=0;i<40;i++){g.fillStyle=['#ffd54a','#ff8fa3','#ffffff','#9fc5ff'][i%4];g.beginPath();g.arc(Math.random()*256,250+Math.random()*6,1.6,0,7);g.fill()}})}
function letterTex(){return canvasTex(160,200,g=>{g.fillStyle='#fbf4e2';g.fillRect(0,0,160,200);g.fillStyle='#5a3d2b';g.textAlign='center';
  g.font='bold 18px "Gowun Batang",serif';g.fillText('주주에게 보내는',80,40);g.fillText('편지',80,62);g.fillStyle='#8a7a66';
  for(let i=0;i<9;i++)g.fillRect(24,86+i*11,112-(i%3)*14,3);g.strokeStyle='#b8923f';g.lineWidth=3;g.strokeRect(8,8,144,184)})}

function Clock({position,rotY}:{position:[number,number,number];rotY:number}){
  const m=useRef<THREE.Group>(null),h=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(m.current)m.current.rotation.z=-clock.elapsedTime*0.2;if(h.current)h.current.rotation.z=-clock.elapsedTime*0.02});
  return <group position={position} rotation-y={rotY}>
    <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[0.32,0.32,0.06,28]}/>{M('#6f5040')}</mesh>
    <mesh position-z={0.035}><circleGeometry args={[0.27,28]}/>{M('#fbf4e2')}</mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i/12*Math.PI*2)*0.22,Math.cos(i/12*Math.PI*2)*0.22,0.04]}><circleGeometry args={[0.015,8]}/>{M('#5a3d2b')}</mesh>)}
    <group ref={h} position-z={0.045}><mesh position-y={0.07}><boxGeometry args={[0.025,0.14,0.01]}/>{M('#3b2a20')}</mesh></group>
    <group ref={m} position-z={0.05}><mesh position-y={0.1}><boxGeometry args={[0.016,0.2,0.01]}/>{M('#3b2a20')}</mesh></group>
  </group>;
}

// 피드백 2026-11-26 "지구본 디테일": an antique globe: a parchment map (continents, lat/long lines, a compass rose),
// tilted on its axis inside a brass meridian ring, a horizon band, and a turned wooden stand on three feet. It turns slowly.
const LANDS:number[][][]=[
  [[-165,65],[-140,70],[-95,72],[-75,62],[-60,50],[-70,42],[-80,30],[-82,25],[-97,20],[-88,15],[-80,8],[-105,22],[-118,32],[-125,48],[-150,58]],
  [[-80,10],[-60,8],[-35,-7],[-40,-22],[-55,-35],[-68,-55],[-75,-45],[-72,-20],[-80,-5]],
  [[-10,36],[-10,44],[-5,48],[-10,55],[5,58],[10,63],[30,70],[70,73],[110,76],[140,72],[170,66],[160,58],[142,48],[130,40],[122,30],[108,20],[105,10],[98,16],[92,22],[80,8],[72,20],[57,25],[50,30],[40,15],[35,30],[28,36],[22,40],[12,44],[3,42]],
  [[-17,15],[-6,35],[10,37],[32,31],[43,12],[51,11],[40,-12],[35,-25],[20,-35],[12,-18],[9,4],[-8,5]],
  [[114,-22],[122,-15],[130,-12],[137,-12],[142,-11],[146,-19],[153,-28],[150,-37],[140,-38],[130,-32],[115,-34]],
  [[-50,60],[-25,70],[-20,80],[-45,83],[-60,78],[-55,68]],[[47,-14],[50,-17],[48,-25],[43,-22]],[[130,32],[136,34],[141,40],[141,44],[135,36]],
];
function globeTex(){return canvasTex(512,256,g=>{g.fillStyle='#9fbfb2';g.fillRect(0,0,512,256);
  for(let i=0;i<3000;i++){g.fillStyle=`rgba(${Math.random()<0.5?'255,250,230':'60,80,70'},0.06)`;g.fillRect(Math.random()*512,Math.random()*256,2,1)}
  const X=(lon:number)=>(lon+180)/360*512,Y=(lat:number)=>(90-lat)/180*256;
  g.strokeStyle='rgba(90,70,50,0.35)';g.lineWidth=0.8;for(let lo=-180;lo<=180;lo+=30){g.beginPath();g.moveTo(X(lo),0);g.lineTo(X(lo),256);g.stroke()}
  for(let la=-60;la<=60;la+=30){g.beginPath();g.moveTo(0,Y(la));g.lineTo(512,Y(la));g.stroke()}
  g.strokeStyle='rgba(150,40,30,0.5)';g.setLineDash([4,3]);g.beginPath();g.moveTo(0,Y(0));g.lineTo(512,Y(0));g.stroke();g.setLineDash([]);
  LANDS.forEach((pts,i)=>{g.fillStyle=['#e7d3a4','#d9c48e','#ead8ae','#e0c690','#dcc38a','#f0e6d0','#e0c690','#e7d3a4'][i];g.strokeStyle='#7a5a3a';g.lineWidth=1.2;
    g.beginPath();pts.forEach(([lo,la],k)=>k?g.lineTo(X(lo),Y(la)):g.moveTo(X(lo),Y(la)));g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(120,140,80,0.25)';for(let j=0;j<20;j++){const [lo,la]=pts[(Math.random()*pts.length)|0];g.beginPath();g.arc(X(lo)+(Math.random()-0.5)*20,Y(la)+(Math.random()-0.5)*14,3,0,7);g.fill()}});
  g.fillStyle='#f0e6d0';g.fillRect(0,236,512,20);g.fillRect(0,0,512,8);
  // a compass rose in the Pacific
  g.save();g.translate(X(-140),Y(-15));g.fillStyle='#8a3a2e';for(let k=0;k<4;k++){g.rotate(Math.PI/2);g.beginPath();g.moveTo(0,-14);g.lineTo(3,0);g.lineTo(-3,0);g.fill()}g.restore();
  g.fillStyle='#5a3d2b';g.font='italic 9px serif';g.fillText('MARE PACIFICUM',X(-170),Y(-30));g.fillText('OCEANUS ATLANTICUS',X(-52),Y(25))})}
function Globe(){
  const t=useMemo(globeTex,[]),ref=useRef<THREE.Mesh>(null);useEffect(()=>()=>t.dispose(),[t]);
  useFrame((_,dt)=>{if(ref.current)ref.current.rotation.y+=dt*0.12});
  const brass=<meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/>;
  return <group>
    {/* turned stand on three feet */}
    {[0,1,2].map(i=><mesh key={i} position={[Math.sin(i*2.09)*0.07,0.015,Math.cos(i*2.09)*0.07]} rotation-y={i*2.09}><boxGeometry args={[0.03,0.03,0.1]}/>{M('#5a3d2b')}</mesh>)}
    <mesh position-y={0.05}><cylinderGeometry args={[0.03,0.06,0.05,16]}/>{M('#6a4a36')}</mesh>
    <mesh position-y={0.1}><sphereGeometry args={[0.035,14,10]}/>{M('#6a4a36')}</mesh>
    <mesh position-y={0.15}><cylinderGeometry args={[0.018,0.03,0.08,12]}/>{M('#6a4a36')}</mesh>
    <group position-y={0.34} rotation-z={0.41}>
      <mesh ref={ref} castShadow><sphereGeometry args={[0.15,40,28]}/><meshStandardMaterial map={t} roughness={0.55}/></mesh>
      <mesh rotation-y={Math.PI/2}><torusGeometry args={[0.168,0.007,8,48,Math.PI*1.25]}/>{brass}</mesh>
      {[-1,1].map(k=><mesh key={k} position-y={k*0.16}><cylinderGeometry args={[0.006,0.006,0.03,8]}/>{brass}</mesh>)}
    </group>
    <mesh position-y={0.34} rotation-x={Math.PI/2}><torusGeometry args={[0.175,0.01,6,48]}/>{brass}</mesh>
    {[0,1,2].map(i=><mesh key={i} position={[Math.sin(i*2.09)*0.1,0.25,Math.cos(i*2.09)*0.1]} rotation={[Math.cos(i*2.09)*0.55,0,-Math.sin(i*2.09)*0.55]}><cylinderGeometry args={[0.006,0.008,0.2,6]}/>{M('#6a4a36')}</mesh>)}
  </group>;
}
// 피드백 2026-11-26 "러그에 텍스쳐": a Persian rug (borders, a field of small motifs, a medallion, wool grain, fringes)
export function persianRug(){return canvasTex(512,352,g=>{const W=512,H=352;g.fillStyle='#7a2d2a';g.fillRect(0,0,W,H);
  const band=(m:number,c:string,w:number)=>{g.strokeStyle=c;g.lineWidth=w;g.strokeRect(m,m,W-2*m,H-2*m)};
  band(8,'#1f2f4a',16);band(18,'#e8d6b0',4);band(34,'#2e4a6b',26);band(50,'#e8d6b0',3);
  g.fillStyle='#e8c46a';for(let x=30;x<W-20;x+=22){[[x,34],[x,H-34]].forEach(([a,b])=>{g.beginPath();g.moveTo(a,b-6);g.lineTo(a+6,b);g.lineTo(a,b+6);g.lineTo(a-6,b);g.fill()})}
  for(let y=56;y<H-40;y+=22){[[34,y],[W-34,y]].forEach(([a,b])=>{g.beginPath();g.moveTo(a,b-6);g.lineTo(a+6,b);g.lineTo(a,b+6);g.lineTo(a-6,b);g.fill()})}
  for(let y=70;y<H-60;y+=26)for(let x=70;x<W-60;x+=26){g.fillStyle=(x+y)%52?'#a8443a':'#5e2422';g.beginPath();g.arc(x,y,4,0,7);g.fill();g.fillStyle='#d9b86a';g.fillRect(x-1,y-8,2,4)}
  g.save();g.translate(W/2,H/2);[[110,'#1f2f4a'],[90,'#e8d6b0'],[80,'#b8483a'],[58,'#2e4a6b'],[40,'#e8c46a'],[22,'#7a2d2a'],[10,'#e8d6b0']].forEach(([r,c])=>{g.fillStyle=c as string;g.beginPath();
    for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=(r as number)*(k%2?0.82:1);g.lineTo(Math.cos(a)*rr*1.35,Math.sin(a)*rr*0.85)}g.fill()});g.restore();
  [[60,60],[W-60,60],[60,H-60],[W-60,H-60]].forEach(([x,y])=>{g.fillStyle='#2e4a6b';g.beginPath();g.arc(x,y,16,0,7);g.fill();g.fillStyle='#e8c46a';g.beginPath();g.arc(x,y,6,0,7);g.fill()});
  for(let i=0;i<26000;i++){g.fillStyle=`rgba(${Math.random()<0.5?'255,240,220':'20,5,0'},${0.05+Math.random()*0.05})`;g.fillRect(Math.random()*W,Math.random()*H,1,2)}})}
export function Rug({at,size}:{at:[number,number,number];size:[number,number]}){
  const t=useMemo(persianRug,[]);useEffect(()=>()=>t.dispose(),[t]);
  return <group position={at}>
    <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={size}/><meshStandardMaterial map={t} color="#d9cbbb" roughness={0.95}/></mesh>
    {[-1,1].map(k=><group key={k}>{Array.from({length:30},(_,i)=><mesh key={i} position={[k*(size[0]/2+0.04),0.003,-size[1]/2+0.04+i*(size[1]-0.08)/29]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.006,0.006,0.08,4]}/>{M('#efe3c8')}</mesh>)}</group>)}
  </group>;
}

// a velvet drape: a pleated sheet that hangs from the rod, is drawn in at the tieback (toward the outer edge) and falls
// out again below it
let velvetMat:THREE.MeshPhysicalMaterial|null=null;
function velvet(){if(velvetMat)return velvetMat;const t=canvasTex(128,256,g=>{g.fillStyle='#7a2a24';g.fillRect(0,0,128,256);
  g.fillStyle='rgba(255,200,170,0.07)';for(let y=10;y<256;y+=40)for(let x=(y/40%2)*32;x<128;x+=64){g.beginPath();g.ellipse(x+16,y,8,14,0,0,7);g.fill();g.beginPath();g.ellipse(x+16,y+18,3,5,0,0,7);g.fill()}
  for(let i=0;i<4000;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*0.08})`;g.fillRect(Math.random()*128,Math.random()*256,1,3)}});
  velvetMat=new THREE.MeshPhysicalMaterial({map:t,roughness:0.85,sheen:1,sheenColor:new THREE.Color('#ff9a8a'),sheenRoughness:0.5,side:THREE.DoubleSide});return velvetMat}
function Drape({side,x}:{side:-1|1;x:number}){
  const geo=useMemo(()=>{const W=0.46,H=1.78,g=new THREE.PlaneGeometry(W,H,28,40),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),u=px/W+0.5,v=(H/2-py)/H;// u 0..1 across, v 0 top .. 1 bottom
      const tie=0.62,d=Math.abs(v-tie),gather=v<tie?THREE.MathUtils.lerp(0.95,0.4,Math.pow(v/tie,1.6)):THREE.MathUtils.lerp(0.4,0.75,Math.min(1,d/0.38));
      const anchor=side<0?0:1,nu=anchor+(u-anchor)*gather;// pulled toward the outer edge
      const amp=0.018+(1-gather)*0.05;p.setX(i,(nu-0.5)*W);p.setZ(i,Math.sin(u*Math.PI*2*5)*amp+(v>tie?Math.sin(v*9)*0.01:0))}
    g.computeVertexNormals();return g},[side]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <group position={[x,-0.05,0.09]}>
    <mesh geometry={geo} position-y={0.0} castShadow><primitive object={velvet()} attach="material"/></mesh>
    {/* the tieback: a gold cord round the gathered drape and a tassel */}
    <group position={[side*0.14,-0.21,0.03]}>
      <mesh rotation-x={Math.PI/2} scale={[1,0.5,1]}><torusGeometry args={[0.11,0.012,8,20]}/><meshStandardMaterial color="#d9b44a" metalness={0.6} roughness={0.35}/></mesh>
      <mesh position={[-side*0.06,-0.08,0.05]}><sphereGeometry args={[0.03,10,8]}/><meshStandardMaterial color="#d9b44a" metalness={0.5} roughness={0.4}/></mesh>
      <mesh position={[-side*0.06,-0.17,0.05]}><coneGeometry args={[0.035,0.14,12,1,true]}/><meshStandardMaterial color="#c9a24a" roughness={0.6} side={THREE.DoubleSide}/></mesh></group>
  </group>;
}
// a swagged valance across the top: three soft swags and a fringe
function Valance(){
  return <group position={[0,0.72,0.12]}>
    {[-0.62,0,0.62].map(x=><mesh key={x} position={[x,0.06,0]} rotation-z={Math.PI} scale={[1,0.55,0.35]}><torusGeometry args={[0.32,0.07,10,24,Math.PI]}/><primitive object={velvet()} attach="material"/></mesh>)}
    {Array.from({length:30},(_,i)=>{const x=-0.92+i*0.0635,lx=((x+0.93)%0.62)/0.62,y=0.06-Math.sin(lx*Math.PI)*0.18;return <mesh key={i} position={[x,y-0.05,0.02]}><cylinderGeometry args={[0.005,0.005,0.07,4]}/><meshStandardMaterial color="#d9b44a"/></mesh>})}
  </group>;
}

export function StudyDecor(){
  const r=L().room,w=r.w,d=r.h,back=-r.d/2,left=-w/2;
  const pic=useMemo(pictureTex,[]),letter=useMemo(letterTex,[]);
  useEffect(()=>()=>{pic.dispose();letter.dispose()},[pic,letter]);
  const sky=useMemo(viewTex,[]);
  useEffect(()=>()=>sky.dispose(),[sky]);
  return <group name="study-decor">
    {/* wainscoting below a chair rail, and a crown moulding, on the back and left walls */}
    <mesh position={[0,0.5,back+0.02]}><boxGeometry args={[w,1.0,0.03]}/>{M('#7d573c')}</mesh>
    <mesh position={[0,1.02,back+0.04]}><boxGeometry args={[w,0.06,0.06]}/>{M('#5a3d2b')}</mesh>
    <mesh position={[0,d-0.08,back+0.05]}><boxGeometry args={[w,0.16,0.1]}/>{M('#f3e7cf')}</mesh>
    <mesh position={[left+0.02,0.5,0]}><boxGeometry args={[0.03,1.0,r.d]}/>{M('#7d573c')}</mesh>
    <mesh position={[left+0.04,1.02,0]}><boxGeometry args={[0.06,0.06,r.d]}/>{M('#5a3d2b')}</mesh>
    <mesh position={[left+0.05,d-0.08,0]}><boxGeometry args={[0.1,0.16,r.d]}/>{M('#f3e7cf')}</mesh>
    {/* the window on the back wall, right, with its curtains */}
    <group position={[0.55,2.55,back+0.03]}>
      <mesh><planeGeometry args={[1.1,1.2]}/><meshBasicMaterial map={sky} toneMapped={false}/></mesh>
      {[[0,0.62,1.22,0.07],[0,-0.62,1.22,0.09],[-0.57,0,0.07,1.3],[0.57,0,0.07,1.3],[0,0,0.04,1.2],[0,0,1.1,0.04]].map(([x,y,a,b],i)=>
        <mesh key={i} position={[x,y,0.03]}><boxGeometry args={[a,b,0.05]}/>{M('#f3e7cf')}</mesh>)}
      {/* 피드백 2026-11-26 "진짜 커튼처럼": pleated velvet drapes gathered by tasselled tiebacks, a swagged valance, rings
          and finials on the rod */}
      {[-1,1].map(k=><Drape key={k} side={k as -1|1} x={k*0.8}/>)}
      <Valance/>
      {[-1,1].map(k=><mesh key={'f'+k} position={[k*1.02,0.86,0.1]}><sphereGeometry args={[0.05,12,10]}/><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/></mesh>)}
      {Array.from({length:12},(_,i)=><mesh key={'r'+i} position={[(i<6?-0.98+i*0.07:0.63+(i-6)*0.07),0.86,0.1]} rotation-y={Math.PI/2}><torusGeometry args={[0.035,0.008,6,12]}/><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/></mesh>)}
      <mesh position={[0,0.86,0.1]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.025,0.025,2.0,8]}/>{M('#b8923f')}</mesh>
      {/* a sill with a little cactus pot */}
      <mesh position={[0,-0.68,0.08]} castShadow><boxGeometry args={[1.36,0.05,0.18]}/>{M('#f3e7cf')}</mesh>
      <group position={[0.32,-0.65,0.1]}><mesh position-y={0.05}><cylinderGeometry args={[0.05,0.04,0.09,12]}/>{M('#b4684a')}</mesh>
        <mesh position-y={0.14} scale={[1,1.3,1]}><sphereGeometry args={[0.04,12,10]}/>{M('#5f9a4f')}</mesh></group>
    </group>
    {/* a landscape over the shelf, in a gold frame */}
    <group position={[L().shelf.x,3.15,back+0.04]}>
      <mesh><boxGeometry args={[1.5,1.15,0.05]}/><meshStandardMaterial color="#b8923f" metalness={0.55} roughness={0.35}/></mesh>
      {[[0,0.53,1.5,0.06],[0,-0.53,1.5,0.06],[-0.72,0,0.06,1.1],[0.72,0,0.06,1.1]].map(([x,y,a,b],i)=><mesh key={i} position={[x,y,0.04]}><boxGeometry args={[a,b,0.05]}/><meshStandardMaterial color="#d6b25e" metalness={0.6} roughness={0.3}/></mesh>)}
      <mesh position-z={0.03}><boxGeometry args={[1.3,0.95,0.03]}/>{M('#6f5040')}</mesh>
      <mesh position-z={0.05}><planeGeometry args={[1.24,0.9]}/><meshStandardMaterial map={pic} roughness={0.6}/></mesh>
      {/* a brass picture light over it */}
      <mesh position={[0,0.66,0.14]} rotation-z={Math.PI/2}><cylinderGeometry args={[0.04,0.04,0.5,14]}/><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/></mesh>
      <mesh position={[0,0.62,0.07]}><boxGeometry args={[0.04,0.08,0.12]}/><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.3}/></mesh>
      <spotLight position={[0,0.66,0.3]} target-position={[0,-0.2,0]} angle={0.8} penumbra={0.8} intensity={1.6} distance={2.5} color="#ffe2b0"/>
    </group>
    {/* the left wall: a clock and a framed letter */}
    <Clock position={[left+0.05,3.0,-1.2]} rotY={Math.PI/2}/>
    <group position={[left+0.04,2.25,-0.1]} rotation-y={Math.PI/2}>
      <mesh><boxGeometry args={[0.62,0.76,0.04]}/>{M('#5a3d2b')}</mesh>
      <mesh position-z={0.025}><planeGeometry args={[0.52,0.66]}/><meshBasicMaterial map={letter}/></mesh>
    </group>
    {/* a writing desk by the left wall: reports, two soda bottles and a globe */}
    <group position={[left+0.55,0,0.35]} rotation-y={Math.PI/2}>
      <mesh position-y={0.74} castShadow receiveShadow><boxGeometry args={[1.3,0.06,0.62]}/>{M('#6a4a36')}</mesh>
      {[[-0.58,-0.25],[0.58,-0.25],[-0.58,0.25],[0.58,0.25]].map(([x,z],i)=><mesh key={i} position={[x,0.37,z]}><boxGeometry args={[0.06,0.74,0.06]}/>{M('#5a3d2b')}</mesh>)}
      {[0,1,2,3].map(i=><mesh key={i} position={[-0.32,0.79+i*0.035,0.02]} rotation-y={i*0.12} castShadow><boxGeometry args={[0.34,0.03,0.44]}/>{M(i%2?'#f3ead6':'#e6d9bc')}</mesh>)}
      {[0,1].map(i=><group key={i} position={[0.12+i*0.11,0.77,-0.1]}><mesh position-y={0.11} castShadow><cylinderGeometry args={[0.035,0.04,0.22,12]}/>{M('#b5302a')}</mesh>
        <mesh position-y={0.1}><cylinderGeometry args={[0.041,0.041,0.035,12]}/>{M('#f6efe2')}</mesh><mesh position-y={0.24}><cylinderGeometry args={[0.018,0.03,0.05,10]}/>{M('#b5302a')}</mesh></group>)}
<group position={[0.42,0.77,0.08]}><Globe/></group>
      <mesh position={[0,0.45,-0.55]} castShadow><boxGeometry args={[0.46,0.06,0.42]}/>{M('#8a3a2e')}</mesh>
    </group>
    {/* a tall plant in the back right corner */}
    <group position={[w/2-0.45,0,back+0.5]}>
      <mesh position-y={0.25} castShadow><cylinderGeometry args={[0.2,0.16,0.5,16]}/>{M('#b4684a')}</mesh>
      {[[0,1.0,0,0.35],[0.15,1.35,0.05,0.28],[-0.14,1.25,-0.04,0.3],[0.02,1.62,0,0.22]].map(([x,y,z,s],i)=><mesh key={i} position={[x,y,z]} castShadow><sphereGeometry args={[s,14,10]}/>{M(i%2?'#4f9a45':'#6db24f')}</mesh>)}
      <mesh position-y={0.7}><cylinderGeometry args={[0.025,0.03,0.6,6]}/>{M('#5a3d2b')}</mesh>
    </group>
    {/* a pendant lamp over the room's middle */}
    <group position={[0.2,d,-0.6]}>
      <mesh position-y={-0.35}><cylinderGeometry args={[0.01,0.01,0.7,6]}/>{M('#3b2a20')}</mesh>
      <mesh position-y={-0.8}><cylinderGeometry args={[0.12,0.34,0.26,24,1,true]}/><meshStandardMaterial color="#e8cf8a" side={THREE.DoubleSide} emissive="#ffd78a" emissiveIntensity={0.35}/></mesh>
      <pointLight position-y={-0.95} intensity={2.2} distance={6} color="#ffdca8"/>
    </group>
  </group>;
}

// first visit: the shelf glows softly until a book is looked at
export function ShelfGlow({on}:{on:boolean}){
  const m=useRef<THREE.MeshBasicMaterial>(null),s=L().shelf;
  useFrame(({clock})=>{if(m.current)m.current.opacity=on?0.16+Math.sin(clock.elapsedTime*3)*0.1:0});
  if(!on)return null;
  const W=s.pitch*8+0.5;
  return <mesh position={[s.x,s.height/2+0.1,s.z+s.depth/2+0.03]} name="shelf-glow">
    <planeGeometry args={[W,s.height*0.75]}/><meshBasicMaterial ref={m} color="#ffe08a" transparent opacity={0.2} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending}/>
  </mesh>;
}
