'use client';
// 거장의 집 · 워런 버핏의 서재 (설계도 buffett_house_ui.md, 2026-11-24). One room seen from a fixed slanted seat: the
// bookshelf on the left (16 books, 01–08 above, 09–16 below), Buffett in his armchair on the right.
//   - a book is pointed at (label: 제 n권, its title, 이어 읽기 · p쪽) and taken out: it slides out along the shelf's depth
//     first, only then turns its cover to the camera and comes close (STUDY_T.out → turn), then opens (BookReader)
//   - the reader cuts the book's three sections into pages for this window (core/master-study.ts paginate), two pages
//     side by side on a wide screen, one on a narrow one; the leaf turns over the spine (STUDY_T.leaf)
//   - "다 읽고 덮기" on the last page finishes the book: it goes back to its slot, the room view comes back and Buffett
//     looks up once with "제 n권 퀴즈" over him; talking to him opens that book's quiz (by book_id and revision)
//   - the quiz goes one question at a time in front of him; finished (right or wrong) the first time, it pays
//     EARN.bookQuiz once per book (grant tag book-quiz:<book_id>)
// The save: core/master-study.ts StudySave under 'rethink-study-v1'. Kept off: walking about the room (the doors and
// the floor do nothing yet).
import {Suspense,useEffect,useMemo,useRef,useState,type KeyboardEvent as RKey} from 'react';
import {Explorer} from '../Explorer3D';
import {ROLE_KIT} from '../RoleKit';
import type {Look} from '../../core/wardrobe';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {Html,Edges} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from '../materials';
import {TalkBox,type Choice} from './Walk';
import {BOOKS,type Book} from '../../content/master-books';
import {STUDY0,readStudy,quizOf,paginate,pageOfPara,pageOfSec,pageBudget,putRead,finishRead,readState,isRight,startQuiz,submit,seeNext,markPaid,
  quizAt,rightCount,quizStatus,booksRead,firstOffer,offerLabel,type StudySave,type Para} from '../../core/master-study';
import {EARN} from '../../core/ledger';
import {won} from '../../core/won';
import {josa} from '../../core/memory';
import {STUDY_T} from '../../core/timing';
import {LOOK} from '../look';
import {still} from '../still';
import {cue} from '../../core/sound';
import type {useGarden} from '../state';
// 「title」 then the particle that fits the title's last syllable
const quoted=(t:string,p:string)=>`「${t}」${josa(t,p).slice(t.length)}`;
type G=ReturnType<typeof useGarden>;

const KEY='rethink-study-v1';
const loadStudy=():StudySave=>{try{return readStudy(JSON.parse(localStorage.getItem(KEY)??'null'))}catch{return STUDY0}};
const saveStudy=(s:StudySave)=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{/* this visit only */}};
const L=()=>LOOK.study;
const slow=()=>still()?0.15:1;
type V3=[number,number,number];
type View='room'|'shelf'|'talk';

// ---- the shelf's slots: 8 a row, the top row 01–08, the bottom 09–16, left to right
const slotOf=(no:number):V3=>{const s=L().shelf,k=(no-1)%8,row=no<=8?0:1;
  return [s.x-s.pitch*3.5+k*s.pitch,(row===0?s.rowTop:s.rowLow)+s.book[1]/2,s.z+s.depth/2-s.book[2]/2-0.02]};

// spine and cover pictures, drawn once
function tex(draw:(c:CanvasRenderingContext2D,w:number,h:number)=>void,w:number,h:number){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d')!;draw(c,w,h);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function bookMats(b:Book,onShelf=false){const col=L().bookColors[(b.no-1)%L().bookColors.length],gold='#e8cf8a';
  const spine=tex((c,w,h)=>{c.fillStyle=col;c.fillRect(0,0,w,h);c.fillStyle=gold;c.fillRect(0,h*0.06,w,6);c.fillRect(0,h*0.22,w,6);c.fillRect(0,h*0.9,w,6);
    c.font=`bold ${w*0.42}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(b.no).padStart(2,'0'),w/2,h*0.14);
    // 피드백 2026-11-24 "제목 앞에다가 01 밑에": the title on the spine under the number, wrapped to its width (by
    // characters, Korean), smaller until it fits between the bands
    const lines=(px:number)=>{c.font=`bold ${px}px sans-serif`;const out:string[]=[];let line='';
      for(const ch of b.title){const t=line+ch;if(c.measureText(t).width>w*0.84&&line){out.push(line.trim());line=ch.trim()}else line=t}if(line.trim())out.push(line.trim());return out};
    const top=h*0.25,room=h*0.86-top;let px=w*0.17,ls=lines(px);while(ls.length*px*1.25>room&&px>9){px-=1;ls=lines(px)}
    const y0=top+(room-ls.length*px*1.25)/2+px*0.62;ls.forEach((t,i)=>c.fillText(t,w/2,y0+i*px*1.25))},128,512);
  const cover=tex((c,w,h)=>{c.fillStyle=col;c.fillRect(0,0,w,h);c.strokeStyle=gold;c.lineWidth=6;c.strokeRect(14,14,w-28,h-28);
    c.fillStyle=gold;c.textAlign='center';c.font='bold 26px sans-serif';c.fillText(`제 ${b.no}권`,w/2,70);
    c.font='bold 30px sans-serif';const words=b.title.split(' ');let line='',y=150;
    for(const wd of words){const t=line?line+' '+wd:wd;if(c.measureText(t).width>w-60){c.fillText(line,w/2,y);y+=40;line=wd}else line=t}
    if(line)c.fillText(line,w/2,y);c.font='20px sans-serif';c.fillText('버핏의 서재',w/2,h-40)},256,360);
  const page=soft('#f3ead2'),side=soft(col);
  const m=(t:THREE.Texture)=>new THREE.MeshStandardMaterial({map:t,roughness:0.8});
  // box faces: +x (front cover), −x (back cover), +y, −y (page edges), +z (spine), −z (page edge)
  // on the shelf the cover's side stays plain (the title reads on the spine); the book taken out shows its cover
  return [onShelf?side:m(cover),side,page,page,m(spine),page]}

function Shelf({study,hover,picked,onHover,onPick,onShelf}:{study:StudySave;hover:string|null;picked:string|null;onHover:(id:string|null)=>void;onPick:(id:string,touch:boolean)=>void;onShelf:()=>void}){
  const s=L().shelf,wood=useMemo(()=>soft(L().color.wood),[]),dark=useMemo(()=>soft(L().color.woodDark),[]);
  const mats=useMemo(()=>Object.fromEntries(BOOKS.map(b=>[b.book_id,bookMats(b,true)])),[]);
  const touch=useRef(false);
  const frame=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onShelf()};
  const W=s.pitch*8+0.2,H=s.height;
  return <group>
    {/* the case: back, sides, top, the two shelves and the plinth (a press on any of them comes up close) */}
    <mesh position={[s.x,H/2,s.z-s.depth/2+0.02]} receiveShadow onClick={frame}><boxGeometry args={[W,H,0.04]}/><primitive object={dark} attach="material"/></mesh>
    {[-1,1].map(k=><mesh key={k} position={[s.x+k*W/2,H/2,s.z]} castShadow onClick={frame}><boxGeometry args={[0.07,H,s.depth]}/><primitive object={wood} attach="material"/></mesh>)}
    {[H-0.04,s.rowTop-0.025,s.rowLow-0.025,0.06].map((y,i)=><mesh key={i} position={[s.x,y,s.z]} castShadow receiveShadow onClick={frame}><boxGeometry args={[W,i===3?0.12:0.05,s.depth]}/><primitive object={wood} attach="material"/></mesh>)}
    {BOOKS.map(b=>{const p=slotOf(b.no),on=hover===b.book_id,gone=picked===b.book_id,st=readState(study,b.book_id);
      return <mesh key={b.book_id} position={[p[0],p[1],p[2]+(on&&!gone?0.04:0)]} visible={!gone} castShadow material={mats[b.book_id]}
        onPointerDown={e=>{touch.current=e.pointerType==='touch'}}
        onPointerOver={e=>{e.stopPropagation();if(!touch.current)onHover(b.book_id)}} onPointerOut={()=>{if(!touch.current)onHover(null)}}
        onClick={e=>{e.stopPropagation();onPick(b.book_id,touch.current)}}>
        <boxGeometry args={s.book}/>
        {on&&!gone&&<Edges color="#ffe9a0" lineWidth={2.5}/>}
        {st==='done'&&<mesh position={[0,s.book[1]/2-0.03,s.book[2]/2+0.002]}><planeGeometry args={[s.book[0]*0.7,0.03]}/><meshBasicMaterial color="#f2d36b"/></mesh>}
      </mesh>})}
  </group>;
}

// the book on its way out of (and back into) its slot
function FlyingBook({id,t0,dir}:{id:string;t0:number;dir:'out'|'back'}){
  const ref=useRef<THREE.Mesh>(null),b=BOOKS.find(x=>x.book_id===id)!,mats=useMemo(()=>bookMats(b),[b]);
  const {camera}=useThree(),s=L().shelf;
  const q0=useMemo(()=>new THREE.Quaternion(),[]),q1=useMemo(()=>new THREE.Quaternion(),[]),turn=useMemo(()=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2),[]);
  const v=useMemo(()=>new THREE.Vector3(),[]),fwd=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(()=>{const m=ref.current;if(!m)return;const k=slow(),out=STUDY_T.out*k,tn=STUDY_T.turn*k,all=out+tn;
    let t=performance.now()-t0;if(dir==='back')t=all-t;t=Math.max(0,Math.min(all,t));
    const e=(x:number)=>x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2,a=e(Math.min(1,t/Math.max(1,out))),c=e(Math.max(0,Math.min(1,(t-out)/Math.max(1,tn))));
    const p=slotOf(b.no);v.set(p[0],p[1],p[2]+s.pull*a);
    camera.getWorldDirection(fwd);const to=camera.position.clone().addScaledVector(fwd,L().holdAt);
    m.position.copy(v).lerp(to,c);q1.copy(camera.quaternion).multiply(turn);m.quaternion.copy(q0).slerp(q1,c)});
  return <mesh ref={ref} material={mats} castShadow><boxGeometry args={s.book}/></mesh>;
}

// Buffett in his armchair (plain shapes; his head turns to me while we talk, nods once after a book is finished)
// Buffett in his armchair: the village's figure (Explorer3D) in his own kit (RoleKit master: navy suit, red tie, white
// hair, round glasses), sat on the cushion; he turns to me while we talk and nods once after a book is finished
const MASTER_LOOK:Look={coat:'coat_vest',hat:null,bag:null,tool:null,palette:'ink'};
function Buffett({look,nod,onTalk,hover,setHover,bubble}:{look:boolean;nod:number;onTalk:()=>void;hover:boolean;setHover:(b:boolean)=>void;bubble:string|null}){
  const B=L().buffett,c=L().color,fig=useRef<THREE.Group>(null);
  const m=useMemo(()=>({chair:soft(c.chair),chairDark:soft(c.chairDark),leg:soft('#3a2a22'),suit:soft(c.suit)}),[c]);
  const {camera}=useThree();
  useFrame(()=>{const f=fig.current;if(!f)return;let yaw=0,pitch=0;
    if(look){const loc=f.parent!.worldToLocal(camera.position.clone());yaw=Math.atan2(loc.x,loc.z)*0.6}
    const since=performance.now()-nod;if(nod&&since<1400){const x=since/1400;pitch=Math.sin(x*Math.PI*2)*0.12*(1-x)}
    f.rotation.y+=(Math.max(-0.6,Math.min(0.6,yaw))-f.rotation.y)*0.12;f.rotation.x+=(pitch-f.rotation.x)*0.2});
  const X=(p:V3,sz:V3,mt:THREE.Material)=><mesh position={p} castShadow receiveShadow><boxGeometry args={sz}/><primitive object={mt} attach="material"/></mesh>;
  const talk=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onTalk()};
  return <group position={B.at} rotation-y={B.rot} onClick={talk} onPointerOver={e=>{e.stopPropagation();setHover(true)}} onPointerOut={()=>setHover(false)}>
    {X([0,0.3,0],[1.0,0.28,0.9],m.chair)}{X([0,0.95,-0.38],[1.0,1.05,0.2],m.chair)}{X([-0.47,0.58,0.02],[0.16,0.34,0.84],m.chairDark)}{X([0.47,0.58,0.02],[0.16,0.34,0.84],m.chairDark)}
    {[[-0.4,0.32],[0.4,0.32],[-0.4,-0.34],[0.4,-0.34]].map(([x,z],i)=><mesh key={i} position={[x,0.08,z]}><cylinderGeometry args={[0.035,0.03,0.16,8]}/><primitive object={m.leg} attach="material"/></mesh>)}
    <group ref={fig} position={[0,B.sitY,-0.08]} scale={LOOK.explorer.scale*B.scale}><Suspense fallback={null}><Explorer look={MASTER_LOOK} kit={ROLE_KIT.master} hair="#eeede8" seated/></Suspense></group>
    {/* his lap and shoes over the cushion's edge, in the suit's colour */}
    {[-0.13,0.13].map(x=><group key={x}><mesh position={[x,0.52,0.25]} rotation-x={Math.PI/2} castShadow><capsuleGeometry args={[0.095,0.4,6,12]}/><primitive object={m.suit} attach="material"/></mesh>
      <mesh position={[x,0.32,0.53]} castShadow><capsuleGeometry args={[0.08,0.2,6,12]}/><primitive object={m.suit} attach="material"/></mesh>
      <mesh position={[x,0.1,0.6]} scale={[1,0.7,1.5]} castShadow><sphereGeometry args={[0.09,14,10]}/><primitive object={m.leg} attach="material"/></mesh></group>)}
    {bubble&&<Html position={[0,B.tagY,0]} center zIndexRange={[20,10]}><div className="ms-bubble">{bubble}</div></Html>}
    {hover&&!bubble&&!look&&<Html position={[0,B.tagY,0]} center zIndexRange={[20,10]}><div className="ms-tag">말 걸기</div></Html>}
  </group>;
}

function Room({children}:{children:React.ReactNode}){
  const c=L().color,m=useMemo(()=>({floor:soft(c.floor),wall:soft(c.wall),wall2:soft(c.wall2),trim:soft(c.trim),rug:soft(c.rug),lamp:soft('#e9d8a6'),metal:soft('#5a4a3a'),
    door:soft(c.door),table:soft(c.woodDark),glow:new THREE.MeshStandardMaterial({color:'#fff2c8',emissive:'#ffdf9a',emissiveIntensity:1.1})}),[c]);
  const r=L().room,lamp=L().lamp,table=L().table;
  return <group>
    <mesh rotation-x={-Math.PI/2} position-z={2} receiveShadow><planeGeometry args={[r.w+4,r.d+4]}/><primitive object={m.floor} attach="material"/></mesh>
    <mesh position={[0,r.h/2,-r.d/2]} receiveShadow><planeGeometry args={[r.w,r.h]}/><primitive object={m.wall} attach="material"/></mesh>
    <mesh position={[-r.w/2,r.h/2,0]} rotation-y={Math.PI/2} receiveShadow><planeGeometry args={[r.d,r.h]}/><primitive object={m.wall2} attach="material"/></mesh>
    <mesh position={[0,0.06,-r.d/2+0.02]}><boxGeometry args={[r.w,0.12,0.04]}/><primitive object={m.trim} attach="material"/></mesh>
    <mesh position={[-r.w/2+0.02,0.06,0]}><boxGeometry args={[0.04,0.12,r.d]}/><primitive object={m.trim} attach="material"/></mesh>
    <mesh position={[0.3,0.012,0.1]} rotation-x={-Math.PI/2} receiveShadow><circleGeometry args={[1.5,40]}/><primitive object={m.rug} attach="material"/></mesh>
    {/* the door on the left wall, near the front */}
    <mesh position={[-r.w/2+0.03,1.05,1.6]} rotation-y={Math.PI/2}><boxGeometry args={[0.95,2.1,0.05]}/><primitive object={m.door} attach="material"/></mesh>
    <mesh position={[-r.w/2+0.07,1.0,1.95]}><sphereGeometry args={[0.04,10,8]}/><primitive object={m.lamp} attach="material"/></mesh>
    {/* reading lamp behind him and a low table on his far side */}
    <group position={lamp.at}><mesh position={[0,0.03,0]}><cylinderGeometry args={[0.18,0.2,0.06,16]}/><primitive object={m.metal} attach="material"/></mesh>
      <mesh position={[0,0.8,0]}><cylinderGeometry args={[0.02,0.02,1.6,8]}/><primitive object={m.metal} attach="material"/></mesh>
      <mesh position={[0,1.62,0]}><cylinderGeometry args={[0.16,0.27,0.3,20,1,true]}/><primitive object={m.lamp} attach="material"/></mesh>
      <mesh position={[0,1.55,0]}><sphereGeometry args={[0.06,12,8]}/><primitive object={m.glow} attach="material"/></mesh>
      <pointLight position={[0,1.5,0.1]} intensity={1.4} distance={4} color="#ffd9a0"/></group>
    <group position={table.at}><mesh position={[0,0.42,0]} castShadow><cylinderGeometry args={[0.34,0.34,0.05,24]}/><primitive object={m.table} attach="material"/></mesh>
      <mesh position={[0,0.2,0]}><cylinderGeometry args={[0.05,0.08,0.4,10]}/><primitive object={m.table} attach="material"/></mesh>
      <mesh position={[0.05,0.5,0]}><cylinderGeometry args={[0.05,0.045,0.1,14]}/><primitive object={m.wall} attach="material"/></mesh></group>
    {children}
  </group>;
}

function Cam({view}:{view:View}){
  const {camera,size}=useThree(),look=useRef(new THREE.Vector3(...L().cam.room.look)),want=useMemo(()=>({p:new THREE.Vector3(),l:new THREE.Vector3()}),[]);
  useEffect(()=>{const c=camera as THREE.PerspectiveCamera,a=size.width/size.height,d=Math.PI/180;
    const fromH=2*Math.atan(Math.tan(L().cam.hfov*d/2)/a)/d;c.fov=Math.min(L().cam.fovMax,Math.max(L().cam.fov,fromH));c.updateProjectionMatrix()},[camera,size.width,size.height]);
  useFrame((_,dt)=>{const c=camera as THREE.PerspectiveCamera,a=size.width/size.height,v=L().cam[view],tall=a<0.9;
    want.p.set(...v.pos);want.l.set(...v.look);
    if(view==='shelf'){// back off until the whole shelf fits across
      const h=2*Math.atan(Math.tan(c.fov*Math.PI/360)*a),need=(L().shelf.pitch*8+0.3)/2/Math.tan(h/2);want.p.z=Math.max(v.pos[2],L().shelf.z+need)}
    if(view==='room'&&tall){want.p.set(...L().cam.roomTall.pos);want.l.set(...L().cam.roomTall.look)}
    if(view==='talk'&&tall){want.p.set(...L().cam.talkTall.pos);want.l.set(...L().cam.talkTall.look)}
    const k=still()?1:1-Math.exp(-dt*4);camera.position.lerp(want.p,k);look.current.lerp(want.l,k);camera.lookAt(look.current)});
  return null;
}

// ---------------------------------------------------------------- the open book
// a label pinned over a book stays on the screen: the end books' labels would run off the side on a phone
function KeepIn({children,className,role}:{children:React.ReactNode;className:string;role?:string}){
  const r=useRef<HTMLDivElement>(null);
  useEffect(()=>{const id=requestAnimationFrame(()=>{const el=r.current;if(!el)return;el.style.translate='0px';
    const b=el.getBoundingClientRect(),m=8,vw=window.innerWidth;el.style.translate=`${b.left<m?m-b.left:b.right>vw-m?vw-m-b.right:0}px 0px`});
    return()=>cancelAnimationFrame(id)});
  return <div ref={r} className={className} role={role}>{children}</div>;
}
// the last page's source line and button, in the same characters pageBudget counts (about four lines)
const endRoom=(pw:number)=>Math.round((pw-64)/15.5*4);
function useSize(){const [s,setS]=useState({w:typeof window!=='undefined'?innerWidth:1200,h:typeof window!=='undefined'?innerHeight:800});
  useEffect(()=>{const f=()=>setS({w:innerWidth,h:innerHeight});addEventListener('resize',f);return ()=>removeEventListener('resize',f)},[]);return s}
function PageBody({pg,book,n,last,onFinish}:{pg:Para[]|undefined;book:Book;n:number;last:boolean;onFinish?:()=>void}){
  if(!pg)return <div className="ms-page-body"/>;
  return <div className="ms-page-body">
    {pg.map(p=><div key={p.i+(p.cont?'c':'')}>{p.head&&<h4 className="ms-sec">{book.sections[p.sec]&&`${p.sec+1}. ${p.head}`}</h4>}<p>{p.text}</p></div>)}
    {last&&<div className="ms-end"><small>{book.source}</small>{onFinish&&<button type="button" className="ms-finish" onClick={onFinish}>다 읽고 덮기</button>}</div>}
    <span className="ms-pno rt-num">{n}</span>
  </div>;
}
function BookReader({book,para,peekSec,onClose,onFinish,onBack}:{book:Book;para:number;peekSec?:number;onClose:(para:number)=>void;onFinish:(para:number)=>void;onBack?:()=>void}){
  const {w,h}=useSize(),wide=w>=760,k=slow();
  const pw=wide?Math.min(430,(w-140)/2):Math.min(460,w-40),ph=Math.min(wide?600:640,h-(wide?170:190));
  const pages=useMemo(()=>paginate(book,pageBudget(pw-64,ph-120),endRoom(pw)),[book,pw,ph]);
  const per=wide?2:1,views=Math.ceil(pages.length/per);
  const at=useRef(para);
  const viewOf=(p:number)=>Math.floor(pageOfPara(pages,p)/per);
  const [v,setV]=useState(()=>peekSec!=null?Math.floor(pageOfSec(pages,peekSec)/per):viewOf(para));
  // a new size cuts new pages: open on the page holding the paragraph read last
  useEffect(()=>{setV(viewOf(at.current))},[pages]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const pg=pages[v*per];if(pg?.[0])at.current=pg[0].i},[v,pages,per]);
  const [turn,setTurn]=useState<null|{dir:1|-1}>(null),[phase,setPhase]=useState<'opening'|'open'|'closing'>(k<1?'open':'opening');
  useEffect(()=>{if(phase==='opening'){const t=setTimeout(()=>setPhase('open'),STUDY_T.open*k);return ()=>clearTimeout(t)}},[phase,k]);
  const go=(dir:1|-1)=>{if(turn||phase!=='open')return;const n=v+dir;if(n<0||n>=views)return;
    if(k<1){setV(n);return}cue('talk-next');setTurn({dir});setTimeout(()=>{setV(n);setTurn(null)},STUDY_T.leaf)};
  const close=(done:boolean)=>{if(phase==='closing')return;const p=done?(pages[pages.length-1]?.[0]?.i??0):at.current;
    if(peekSec!=null&&onBack){onBack();return}
    setPhase('closing');setTimeout(()=>done?onFinish(p):onClose(p),STUDY_T.open*k)};
  const isLast=(i:number)=>i===pages.length-1;
  const key=(e:RKey)=>{if(e.key==='ArrowRight'){e.preventDefault();go(1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}else if(e.key==='Escape'){e.preventDefault();close(false)}};
  const box=useRef<HTMLDivElement>(null);useEffect(()=>{box.current?.focus()},[]);
  const sw=useRef<number|null>(null);
  const L0=v*per,R0=v*per+1;
  // what the leaf carries: forward, the right page over to the next left; back, the left page over to the previous right
  const nextL=(v+1)*per,prevR=(v-1)*per+1;
  const body=(i:number)=><PageBody pg={pages[i]} book={book} n={i+1} last={isLast(i)} onFinish={isLast(i)&&peekSec==null?()=>close(true):undefined}/>;
  return <div className={`ms-read ${wide?'wide':'narrow'}`} role="dialog" aria-label={`제 ${book.no}권 ${book.title}`} tabIndex={-1} ref={box} onKeyDown={key}
    onPointerDown={e=>{sw.current=e.clientX}} onPointerUp={e=>{if(sw.current==null)return;const dx=e.clientX-sw.current;sw.current=null;if(Math.abs(dx)>50)go(dx<0?1:-1)}}>
    <div className="ms-read-top"><span>제 {book.no}권 · {book.title}</span>
      {peekSec!=null?<button type="button" className="ms-close" onClick={onBack}>문제로 돌아가기</button>
        :<button type="button" className="ms-close" onClick={()=>close(false)}>책 덮기</button>}</div>
    <div className="ms-book" data-phase={phase} style={{['--pw' as string]:pw+'px',['--ph' as string]:ph+'px',['--leaf' as string]:STUDY_T.leaf+'ms',['--open' as string]:STUDY_T.open*k+'ms'}}>
      {wide?<>
        <div className="ms-page left">{body(turn?.dir===-1?(v-1)*per:L0)}</div>
        <div className="ms-page right">{body(turn?.dir===1?nextL+1:R0)}</div>
        {turn?.dir===1&&<div className="ms-leaf fwd"><div className="ms-face front ms-page">{body(R0)}</div><div className="ms-face back ms-page">{body(nextL)}</div></div>}
        {turn?.dir===-1&&<div className="ms-leaf bwd"><div className="ms-face front ms-page">{body(L0)}</div><div className="ms-face back ms-page">{body(prevR)}</div></div>}
      </>:<>
        <div className="ms-page right">{body(turn?.dir===1?v+1:v)}</div>
        {turn?.dir===1&&<div className="ms-leaf fwd"><div className="ms-face front ms-page">{body(v)}</div><div className="ms-face back ms-page blank"/></div>}
        {turn?.dir===-1&&<div className="ms-leaf bwd one"><div className="ms-face front ms-page">{body(v-1)}</div><div className="ms-face back ms-page blank"/></div>}
      </>}
      <div className="ms-cover" aria-hidden><b>제 {book.no}권</b><span>{book.title}</span></div>
      <button type="button" className="ms-turn prev" aria-label="이전 쪽" disabled={v===0} onClick={()=>go(-1)}/>
      <button type="button" className="ms-turn next" aria-label="다음 쪽" disabled={v>=views-1} onClick={()=>go(1)}/>
    </div>
    <p className="ms-read-hint">{wide?'모서리를 누르거나 ← → 키로 넘겨요':'옆으로 밀거나 모서리를 눌러 넘겨요'}</p>
  </div>;
}

// ---------------------------------------------------------------- the quiz in front of him
function QuizPanel({book,study,onSubmit,onNext,onRead,onEnd,paidNow}:{book:Book;study:StudySave;onSubmit:(a:number|string)=>void;onNext:()=>void;onRead:(sec:number)=>void;onEnd:()=>void;paidNow:boolean|null}){
  const q=quizOf(book.book_id)!,n=q.questions.length,r=study.quiz[book.book_id],at=quizAt(r,n),qu=q.questions[at.i];
  const [pick,setPick]=useState<number|null>(null),[txt,setTxt]=useState('');
  useEffect(()=>{setPick(null);setTxt('')},[at.i]);
  const head=<div className="ms-q-head"><b>제 {book.no}권 · {book.title}</b>{!at.result&&<span className="rt-num">{at.i+1} / {n}</span>}</div>;
  if(at.result&&r){const k=rightCount(q.questions,r);
    return <div className="ms-quiz" role="dialog" aria-label="퀴즈 결과">{head}
      <div className="ms-result"><p className="ms-score"><b className="rt-num">{n}문제 중 {k}개</b> 맞혔어요</p>
        {paidNow===true?<p className="ms-coin-got">코인 <b>+{won(EARN.bookQuiz)}</b> 받았어요</p>
          :paidNow===null&&!r.paid?<p className="ms-coin-wait">보상 확인 중…</p>
          :<p className="ms-coin-old">이 권의 코인은 이미 받았어요 · 복습 완료</p>}
        {q.keywords?.length?<dl className="ms-keywords"><dt>이 권의 핵심 낱말</dt>{q.keywords.map(k=><dd key={k.keyword}><b>{k.keyword}</b> {k.definition}</dd>)}</dl>:null}</div>
      <div className="ms-q-acts"><button type="button" className="ms-btn primary" onClick={onEnd}>대화 마치기</button></div></div>}
  const sent=at.explain&&r?r.answers[at.i]:undefined,ok=sent!==undefined&&isRight(qu,sent);
  const can=qu.kind==='mc'?pick!==null:txt.trim().length>0;
  const send=()=>{if(!can||sent!==undefined)return;onSubmit(qu.kind==='mc'?pick!:txt.trim())};
  return <div className="ms-quiz" role="dialog" aria-label={`제 ${book.no}권 퀴즈`}>{head}
    <p className="ms-q">{qu.q}</p>
    {qu.kind==='mc'?<div className="ms-opts" role="radiogroup">{qu.options.map((o,i)=>{const mine=sent!==undefined?sent===i:pick===i,right=sent!==undefined&&i===qu.answer;
      return <button key={i} type="button" role="radio" aria-checked={mine} disabled={sent!==undefined} className={'ms-opt'+(mine?' on':'')+(right?' right':'')+(mine&&sent!==undefined&&!right?' wrong':'')} onClick={()=>setPick(i)}>
        <span className="rt-num">{i+1}</span>{o}</button>})}</div>
      :<div className="ms-word"><input value={sent!==undefined?String(sent):txt} disabled={sent!==undefined} placeholder="한 단어로 입력" aria-label="한 단어로 입력" autoFocus
          onChange={e=>setTxt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/><small>한 단어로 입력</small></div>}
    {sent!==undefined?<div className={'ms-why '+(ok?'ok':'no')} role="status"><b>{ok?'✓ 정답':'✗ 오답'}</b>{!ok&&<span> · 정답: {qu.kind==='mc'?qu.options[qu.answer]:qu.answer}</span>}<p>{qu.why}</p></div>:null}
    <div className="ms-q-acts">
      {sent===undefined?<button type="button" className="ms-btn primary" disabled={!can} onClick={send}>답 제출</button>
        :<><button type="button" className="ms-btn" onClick={()=>onRead(qu.sec)}>본문 다시 보기</button>
          <button type="button" className="ms-btn primary" onClick={onNext}>{at.i===n-1?'결과 보기':'다음 문제'}</button></>}
    </div></div>;
}

export function MasterStudy({g,onOut,hud}:{g:G;onOut:()=>void;hud?:React.ReactNode}){
  const [study,setStudy]=useState<StudySave>(loadStudy);
  const put=(f:(s:StudySave)=>StudySave)=>setStudy(x=>{const n=f(x);if(n!==x)saveStudy(n);return n});
  const [view,setView]=useState<View>('room'),[hover,setHover]=useState<string|null>(null),[tap,setTap]=useState<string|null>(null);
  const [pull,setPull]=useState<null|{id:string;t0:number;dir:'out'|'back'}>(null),[reading,setReading]=useState<string|null>(null);
  const [talk,setTalk]=useState<null|'menu'|'list'>(null),[quiz,setQuiz]=useState<string|null>(null),[peek,setPeek]=useState<number|null>(null);
  const [bHover,setBHover]=useState(false),[nod,setNod]=useState(0),[paidNow,setPaidNow]=useState<boolean|null>(null),[fly,setFly]=useState(0);
  const busy=useRef(false),k=slow();
  const shelfBtn=useRef<HTMLButtonElement>(null),buffBtn=useRef<HTMLButtonElement>(null),[kb,setKb]=useState(0);
  const bookById=(id:string)=>BOOKS.find(b=>b.book_id===id)!;
  // what to say about a book on its label: its pages counted at this size
  const {w,h}=useSize(),wide=w>=760,pw=wide?Math.min(430,(w-140)/2):Math.min(460,w-40),ph=Math.min(wide?600:640,h-(wide?170:190));
  const pageNo=(b:Book)=>pageOfPara(paginate(b,pageBudget(pw-64,ph-120),endRoom(pw)),study.read[b.book_id]?.para??0)+1;

  const pick=(id:string,touch=false)=>{if(busy.current||talk||quiz)return;
    if(touch&&tap!==id){setTap(id);setHover(id);if(!study.hint)put(s=>({...s,hint:true}));return}
    busy.current=true;setTap(null);setHover(null);if(!study.hint)put(s=>({...s,hint:true}));cue('ui-button');
    // 피드백 2026-11-24 "책 클릭할 때 책장 확대되고 책 펼쳐지게": from the room the camera first comes up to the shelf
    // (STUDY_T.zoom), then the book slides out and opens
    const go=()=>{setPull({id,t0:performance.now(),dir:'out'});setTimeout(()=>setReading(id),(STUDY_T.out+STUDY_T.turn)*k)};
    if(view!=='shelf'){setView('shelf');setTimeout(go,STUDY_T.zoom*k)}else go()};
  const back=(id:string,done:boolean)=>{setReading(null);setPull({id,t0:performance.now(),dir:'back'});
    setTimeout(()=>{setPull(null);busy.current=false;
      if(done){setView('room');setNod(performance.now())}else{setView('shelf');shelfBtn.current?.focus()}},(STUDY_T.out+STUDY_T.turn)*k)};
  const offer=firstOffer(study),read=booksRead(study);
  const nodBook=study.nod?bookById(study.nod):null;
  const openQuiz=(b:Book)=>{const q=quizOf(b.book_id);if(!q)return;setPaidNow(null);put(s=>startQuiz(s,b.book_id,q.revision));put(s=>s.nod===b.book_id?{...s,nod:null}:s);setTalk(null);setQuiz(b.book_id)};
  const endTalk=()=>{setTalk(null);setQuiz(null);setView('room');setTimeout(()=>buffBtn.current?.focus(),50)};
  const onTalk=()=>{if(busy.current||quiz)return;setTalk('menu');setView('talk')};
  // the quiz finished: paid once a book (the grant's tag keeps it once even across a reload)
  const qRun=quiz?study.quiz[quiz]:undefined;
  useEffect(()=>{if(!quiz||!qRun?.finished)return;
    if(qRun.paid){setPaidNow(p=>p===null?false:p);return}
    const given=g.ops.grant('book-quiz:'+quiz,EARN.bookQuiz);put(s=>markPaid(s,quiz));setPaidNow(given);if(given){cue('capsule-mark');setFly(Date.now())}},[quiz,qRun?.finished]);// eslint-disable-line react-hooks/exhaustive-deps

  const talkLine=():{line:string;choices:Choice[]}=>{
    if(!offer)return {line:'어서 오게. 저 책장에서 아무 책이나 한 권 꺼내 읽어 보게. 다 읽고 오면 내가 몇 가지 물어보지.',
      choices:[{label:'책장 살펴보기',go:()=>{setTalk(null);setView('shelf');setTimeout(()=>shelfBtn.current?.focus(),50)}},{label:'대화 마치기',go:endTalk}]};
    const st=quizStatus(study,offer.book_id);
    const line=st.kind==='missing'?`제 ${offer.no}권 퀴즈를 불러올 수 없어요. 잠시 뒤 다시 해 보거나 다른 책을 골라 보게.`
      :st.kind==='progress'?`「${offer.title}」 퀴즈를 하다 말았지? ${st.k}/${st.n}까지 왔네. 이어서 해 보세.`
      :st.kind==='done'?`${quoted(offer.title,'은')} 이미 끝냈군. ${st.paid?'코인은 받았으니 이번엔 복습이야.':''} 다시 풀어 볼 텐가?`
      :`${quoted(offer.title,'을')} 다 읽었군. 제 ${offer.no}권에서 몇 가지 물어보지. 틀려도 괜찮아, 끝까지만 풀게.`;
    const first:Choice=st.kind==='missing'?{label:'다시 시도',go:()=>{setTalk('menu')}}:{label:st.kind==='done'?`제 ${offer.no}권 다시 풀기`:offerLabel(offer,st),go:()=>openQuiz(offer)};
    return {line,choices:[first,...(read.length>1?[{label:'다른 권 고르기',go:()=>setTalk('list')}]:[]),{label:'나중에',go:endTalk}]}};

  // keyboard: Tab reaches the shelf, Buffett and the door; arrows go along the shelf, Enter takes the book out
  const shelfKey=(e:RKey)=>{const mv=(d:number)=>{e.preventDefault();const n=Math.max(0,Math.min(15,kb+d));setKb(n);setHover(BOOKS[n].book_id);if(view==='room')setView('shelf')};
    if(e.key==='ArrowRight')mv(1);else if(e.key==='ArrowLeft')mv(-1);else if(e.key==='ArrowDown')mv(8);else if(e.key==='ArrowUp')mv(-8);
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(BOOKS[kb].book_id)}};
  useEffect(()=>{const t=(window as unknown as {__proto3d?:Record<string,unknown>});(t.__proto3d??={}).study={pick:(id:string)=>pick(id),talk:onTalk,state:()=>study}});

  const label=(id:string)=>{const b=bookById(id),st=readState(study,id);return {b,more:st==='reading'?`이어 읽기 · ${pageNo(b)}쪽`:st==='done'?'다 읽음':null}};
  const hb=hover&&!pull?label(hover):null;
  return <div className="ms" data-testid="master-study" data-view={view}>
    <Canvas className="ms-canvas" shadows dpr={[1,1.75]} gl={{antialias:true}} camera={{fov:46,near:0.05,far:40,position:L().cam.room.pos}}>
      <color attach="background" args={[L().color.wall2]}/>
      <hemisphereLight args={['#fff4e2','#7a5a40',1.0]}/><ambientLight intensity={0.3}/>
      <directionalLight position={[2,4,3]} intensity={1.3} color="#ffe2b8" castShadow shadow-mapSize={[1024,1024]}/>
      <Cam view={view}/>
      <Room>
        <Shelf study={study} hover={hover} picked={pull?.id??null} onHover={id=>{setHover(id);if(id&&!study.hint)put(s=>({...s,hint:true}))}} onPick={pick} onShelf={()=>{if(!busy.current&&!talk&&!quiz)setView('shelf')}}/>
        {hb&&<Html position={(()=>{const p=slotOf(hb.b.no);return [p[0],p[1]+0.34,p[2]+0.15] as V3})()} center zIndexRange={[25,10]}>
          <KeepIn className="ms-label" role="tooltip"><small>제 {hb.b.no}권</small><b>{hb.b.title}</b>{hb.more&&<em>{hb.more}</em>}
            {tap===hb.b.book_id&&<button type="button" className="ms-take" onClick={()=>pick(hb.b.book_id)}>꺼내 읽기</button>}</KeepIn></Html>}
        <Buffett look={!!talk||!!quiz} nod={nod} onTalk={onTalk} hover={bHover} setHover={setBHover}
          bubble={nodBook&&!talk&&!quiz&&!reading&&!pull?`제 ${nodBook.no}권 퀴즈`:null}/>
      </Room>
      {pull&&<FlyingBook key={pull.id+pull.dir+pull.t0} {...pull}/>}
    </Canvas>
    <div className="ms-top">
      <button type="button" className="ms-door" onClick={onOut}>← 마을로</button>
      <span className="ms-title"><span className="ms-title-pre">거장의 집 · </span>버핏의 서재</span>
      <span className={'ms-hud'+(fly?' got':'')} key={fly}>{hud??<span className="ms-coins rt-num">{won(g.s.currency)}</span>}</span>
    </div>
    {!study.hint&&!reading&&!talk&&!quiz&&<p className="ms-hint">{typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches?'책을 눌러 보세요':'책에 마우스를 올려 보세요'}</p>}
    {view==='shelf'&&!reading&&!pull&&!busy.current&&!talk&&!quiz&&<button type="button" className="ms-btn ms-room" onClick={()=>{setView('room');setTap(null);setHover(null)}}>방 전체 보기</button>}
    {/* keyboard way through the room (and a screen reader's) */}
    <div className="ms-keys">
      <button ref={shelfBtn} type="button" onKeyDown={shelfKey} onFocus={()=>setHover(BOOKS[kb].book_id)} onBlur={()=>setHover(null)} onClick={()=>pick(BOOKS[kb].book_id)}
        aria-label={`책장: 제 ${BOOKS[kb].no}권 ${BOOKS[kb].title}. 방향키로 고르고 Enter로 꺼내요`}>책장</button>
      <button ref={buffBtn} type="button" onClick={onTalk}>버핏에게 말 걸기</button>
    </div>
    {reading&&<BookReader book={bookById(reading)} para={study.read[reading]?.para??0}
      onClose={p=>{put(s=>putRead(s,reading,p));back(reading,false)}} onFinish={p=>{put(s=>finishRead(s,reading,p));cue('capsule-mark');back(reading,true)}}/>}
    {quiz&&peek!==null&&<BookReader book={bookById(quiz)} para={0} peekSec={peek} onBack={()=>setPeek(null)} onClose={()=>setPeek(null)} onFinish={()=>setPeek(null)}/>}
    {talk==='menu'&&(()=>{const t=talkLine();return <TalkBox className="ms-talk" name="버핏" role="거장의 집 · 서재 주인" line={t.line} choices={t.choices}/>})()}
    {talk==='list'&&<div className="ms-list" role="dialog" aria-label="다 읽은 책">
      <div className="ms-q-head"><b>어느 권 퀴즈를 풀까?</b></div>
      {read.map(b=>{const st=quizStatus(study,b.book_id);return <button key={b.book_id} type="button" className="ms-list-row" onClick={()=>st.kind==='missing'?setTalk('list'):openQuiz(b)}>
        <span className="rt-num">{String(b.no).padStart(2,'0')}</span><b>{b.title}</b>
        <em>{st.kind==='missing'?'퀴즈를 불러올 수 없어요 · 다시 시도':st.kind==='progress'?`이어 풀기 · ${st.k}/${st.n}`:st.kind==='done'?(st.paid?'완료 · 코인 수령':'완료'):'아직 안 풂'}</em></button>})}
      <div className="ms-q-acts"><button type="button" className="ms-btn" onClick={()=>setTalk('menu')}>뒤로</button></div></div>}
    {quiz&&peek===null&&<QuizPanel book={bookById(quiz)} study={study} paidNow={paidNow}
      onSubmit={a=>{const n=quizOf(quiz)!.questions.length;put(s=>submit(s,quiz,n,a))}} onNext={()=>put(s=>seeNext(s,quiz))} onRead={sec=>setPeek(sec)} onEnd={endTalk}/>}
    {fly>0&&<span className="ms-coin-fly" key={'f'+fly} aria-hidden>C</span>}
  </div>;
}
