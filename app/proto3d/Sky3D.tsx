'use client';
// 다른 정원들 (core/planets.ts, ui/SkyView.tsx): the garden is put away and the camera pulls back into the night sky. My
// garden floats low and near; the neighbours' gardens float in loose rows above it, each turning slowly, its trees in
// their state colours, its roof in its owner's colour. Tapping one flies the camera to it. Name tags are DOM, pinned to
// screenPoints 'planet:<id>'. Drag turns the sky a little.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {CONDITION_COLOR,type Planet} from '../core/planets';
import {screenPoints} from './screen';
import {still} from './still';
import {LOOK} from './look';
const L=()=>LOOK.space;
// my garden low and near; the others in two loose rows above it, further back
const SLOTS:[number,number,number][]=[[0,-10,6],[-8,-1,-2],[7,1,-5],[-2,6,-9],[9,9,-12],[-9,11,-13],[2,16,-18],[-4,19,-22]];
export type SkyWorld={planets:Planet[];focus:string|null;onPick:(id:string)=>void};

// 피드백 2026-11-26 "행성 부분 wow factor": a painted night: nebula clouds and a milky band on the dome, three layers of
// round stars (the near ones twinkle), a shooting star now and then, a ringed giant and a warm sun far off
function canvasTex(w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t}
let dotTex:THREE.Texture|null=null;
const dot=()=>dotTex??=canvasTex(64,64,g=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.2,'rgba(255,255,255,0.8)');r.addColorStop(0.5,'rgba(255,255,255,0.15)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
function Backdrop(){
  const sky=useMemo(()=>canvasTex(1024,512,g=>{const s=g.createLinearGradient(0,0,0,512);s.addColorStop(0,'#070b1c');s.addColorStop(0.45,'#141a3c');s.addColorStop(0.7,'#2a2552');s.addColorStop(1,'#3b4a74');g.fillStyle=s;g.fillRect(0,0,1024,512);
    let sd=11;const r=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
    g.globalCompositeOperation='lighter';
    const cloud=(x:number,y:number,rad:number,c:string,a:number)=>{const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,`rgba(${c},${a})`);gr.addColorStop(1,`rgba(${c},0)`);g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,7);g.fill()};
    // the milky band: a tilted stream of soft light and fine dust
    for(let i=0;i<160;i++){const t=i/160,x=t*1024,y=150+Math.sin(t*Math.PI*2)*70+(r()-0.5)*50;cloud(x,y,40+r()*60,['180,170,255','140,200,255','255,190,230'][i%3],0.045)}
    for(let i=0;i<5000;i++){const t=r(),x=t*1024,y=150+Math.sin(t*Math.PI*2)*70+(r()-0.5)*(r()*110);g.fillStyle=`rgba(255,255,255,${r()*0.35})`;g.fillRect(x,y,1,1)}
    // nebulae
    [[180,250,170,'190,90,220'],[230,290,120,'90,160,255'],[760,320,190,'60,200,200'],[820,260,120,'255,120,170'],[520,90,140,'120,110,255'],[960,120,110,'255,170,120']].forEach(([x,y,rad,c])=>{for(let k=0;k<9;k++)cloud((x as number)+(r()-0.5)*(rad as number),(y as number)+(r()-0.5)*(rad as number)*0.6,(rad as number)*(0.35+r()*0.5),c as string,0.07)});
    g.globalCompositeOperation='source-over'}),[]);
  const layer=(n:number,R0:number,seed:number)=>{const g=new THREE.BufferGeometry(),a=new Float32Array(n*3),col=new Float32Array(n*3);let s=seed;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
    const tints=['#ffffff','#cfe0ff','#ffe9c8','#ffd0e8','#d8fff4'].map(c=>new THREE.Color(c));
    for(let i=0;i<n;i++){const R=R0+r()*8,t=r()*Math.PI*2,ph=Math.acos(2*r()-1);a.set([R*Math.sin(ph)*Math.cos(t),R*Math.cos(ph),R*Math.sin(ph)*Math.sin(t)],i*3);const c=tints[(r()*tints.length)|0];col.set([c.r,c.g,c.b],i*3)}
    g.setAttribute('position',new THREE.BufferAttribute(a,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));return g};
  const far=useMemo(()=>layer(1600,86,7),[]),mid=useMemo(()=>layer(420,80,19),[]),near=useMemo(()=>layer(70,74,31),[]);
  const mA=useRef<THREE.PointsMaterial>(null),mB=useRef<THREE.PointsMaterial>(null);
  useFrame(({clock})=>{if(still())return;const t=clock.elapsedTime;if(mA.current)mA.current.opacity=0.65+Math.sin(t*1.3)*0.25;if(mB.current)mB.current.opacity=0.75+Math.sin(t*2.1+1)*0.25});
  useEffect(()=>()=>{sky.dispose();far.dispose();mid.dispose();near.dispose()},[sky,far,mid,near]);
  return <>
    <mesh><sphereGeometry args={[100,48,24]}/><meshBasicMaterial map={sky} side={THREE.BackSide} depthWrite={false} toneMapped={false}/></mesh>
    <points geometry={far}><pointsMaterial size={0.55} map={dot()} vertexColors transparent opacity={0.8} depthWrite={false} sizeAttenuation toneMapped={false}/></points>
    <points geometry={mid}><pointsMaterial ref={mA} size={1.1} map={dot()} vertexColors transparent opacity={0.8} depthWrite={false} sizeAttenuation toneMapped={false} blending={THREE.AdditiveBlending}/></points>
    <points geometry={near}><pointsMaterial ref={mB} size={2.2} map={dot()} vertexColors transparent opacity={0.9} depthWrite={false} sizeAttenuation toneMapped={false} blending={THREE.AdditiveBlending}/></points>
    <ShootingStar/>
    <Giant/>
  </>;
}
function ShootingStar(){
  const ref=useRef<THREE.Mesh>(null),st=useRef({t0:2,from:new THREE.Vector3(),dir:new THREE.Vector3()});
  const tex=useMemo(()=>canvasTex(128,8,g=>{const gr=g.createLinearGradient(0,0,128,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=gr;g.fillRect(0,2,128,4)}),[]);
  useEffect(()=>()=>tex.dispose(),[tex]);
  useFrame(({clock})=>{const m=ref.current;if(!m)return;const t=clock.elapsedTime,s=st.current,k=(t-s.t0)/1.1;
    if(k>1||still()){m.visible=false;if(t-s.t0>5+Math.random()*4&&!still()){s.t0=t;s.from.set(-40+Math.random()*60,25+Math.random()*20,-70);s.dir.set(1,-0.45,0).normalize()}return}
    if(k<0){m.visible=false;return}
    m.visible=true;m.position.copy(s.from).addScaledVector(s.dir,k*45);m.rotation.z=Math.atan2(s.dir.y,s.dir.x);(m.material as THREE.MeshBasicMaterial).opacity=Math.sin(k*Math.PI)});
  return <mesh ref={ref} visible={false}><planeGeometry args={[9,0.18]}/><meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/></mesh>;
}
// far off: a banded ringed giant and a warm sun with a halo
function Giant(){
  const bands=useMemo(()=>canvasTex(64,256,g=>{const cs=['#e9b98a','#d99a6a','#f3d7a8','#c98a5e','#f0c890','#dba070'];for(let y=0;y<256;y+=8){g.fillStyle=cs[(y/8)%cs.length];g.fillRect(0,y,64,8+Math.random()*6)}}),[]);
  const ring=useMemo(()=>canvasTex(256,8,g=>{for(let x=0;x<256;x++){g.fillStyle=`rgba(240,220,190,${0.15+0.5*Math.abs(Math.sin(x*0.09))*Math.min(1,x/40)*Math.min(1,(256-x)/40)})`;g.fillRect(x,0,1,8)}}),[]);
  const g=useRef<THREE.Group>(null);useFrame((_,dt)=>{if(g.current&&!still())g.current.rotation.y+=dt*0.02});
  useEffect(()=>()=>{bands.dispose();ring.dispose()},[bands,ring]);
  const ringGeo=useMemo(()=>{const r=new THREE.RingGeometry(17,28,96),p=r.attributes.position,uv=r.attributes.uv,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);uv.setXY(i,(v.length()-17)/11,0.5)}return r},[]);
  return <>
    <group position={[-62,26,-70]} rotation={[0.3,0,0.35]}>
      <group ref={g}><mesh><sphereGeometry args={[12,48,32]}/><meshStandardMaterial map={bands} roughness={0.9}/></mesh></group>
      <mesh geometry={ringGeo} rotation-x={Math.PI/2.2}><meshBasicMaterial map={ring} transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/></mesh>
    </group>
    <group position={[55,40,-80]}>
      <mesh><sphereGeometry args={[5,32,20]}/><meshBasicMaterial color="#fff1c8" toneMapped={false}/></mesh>
      <sprite scale={[34,34,1]}><spriteMaterial map={dot()} color="#ffcf8a" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/></sprite>
    </group>
  </>;
}
// a soft glow round a planet (fresnel)
function Atmosphere({R,color}:{R:number;color:string}){
  const mat=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,uniforms:{c:{value:new THREE.Color(color)}},
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 c;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.2);gl_FragColor=vec4(c*f*1.6,f);}'}),[color]);
  useEffect(()=>()=>mat.dispose(),[mat]);
  return <mesh scale={1.14}><sphereGeometry args={[R,40,28]}/><primitive object={mat} attach="material"/></mesh>;
}
// puffy clouds circling a planet
function Clouds({R,seed}:{R:number;seed:number}){
  const g=useRef<THREE.Group>(null);useFrame((_,dt)=>{if(g.current&&!still())g.current.rotation.y+=dt*0.12});
  const puffs=useMemo(()=>Array.from({length:6},(_,k)=>{const lon=k/6*Math.PI*2+seed,lat=0.6+((k*37+seed*11)%10)/10*1.6;return new THREE.Vector3(Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon)).multiplyScalar(R*1.17)}),[R,seed]);
  return <group ref={g} rotation-z={0.3}>{puffs.map((p,k)=><group key={k} position={p} scale={R*0.12}>
    {[[0,0,0,1],[0.9,-0.1,0.2,0.75],[-0.85,-0.1,-0.1,0.7],[0.3,0.4,0,0.7]].map(([x,y,z,r],j)=><mesh key={j} position={[x,y,z]}><sphereGeometry args={[r,12,10]}/><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92}/></mesh>)}</group>)}</group>;
}
// an asteroid ring (dust and pebbles) in the planet's colour
function Belt({R,color,me}:{R:number;color:string;me:boolean}){
  const geo=useMemo(()=>{const n=me?700:260,a=new Float32Array(n*3);for(let i=0;i<n;i++){const t=Math.random()*Math.PI*2,r=R*(1.3+Math.random()*0.35);a.set([Math.cos(t)*r,(Math.random()-0.5)*R*0.03,Math.sin(t)*r],i*3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));return g},[R,me]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  const g=useRef<THREE.Group>(null);useFrame((_,dt)=>{if(g.current&&!still())g.current.rotation.y-=dt*0.06});
  return <group rotation-x={0.42}><group ref={g}>
    <points geometry={geo}><pointsMaterial size={R*0.035} map={dot()} color={color} transparent opacity={0.95} depthWrite={false} sizeAttenuation toneMapped={false} blending={THREE.AdditiveBlending}/></points>
    <mesh rotation-x={Math.PI/2}><ringGeometry args={[R*1.3,R*1.65,96]}/><meshBasicMaterial color={color} transparent opacity={me?0.07:0.08} side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/></mesh></group></group>;
}
function Moon({R,i}:{R:number;i:number}){
  const g=useRef<THREE.Group>(null);useFrame(({clock})=>{if(!g.current)return;const t=still()?0:clock.elapsedTime*0.35+i;g.current.position.set(Math.cos(t)*R*2.1,Math.sin(t*0.7)*R*0.5,Math.sin(t)*R*2.1)});
  return <group ref={g}><mesh><icosahedronGeometry args={[R*0.16,1]}/><meshStandardMaterial color="#d9d2c4" flatShading roughness={1}/></mesh>
    <mesh position={[R*0.05,R*0.08,R*0.1]}><sphereGeometry args={[R*0.04,8,6]}/><meshStandardMaterial color="#b8b0a2"/></mesh></group>;
}

function PlanetMesh({p,slot,i,portrait,onPick}:{p:Planet;slot:[number,number,number];i:number;portrait:boolean;onPick:()=>void}){
  const g=useRef<THREE.Group>(null);
  const R=p.me?5.2:2.4+p.trees.length*.12,big=p.me?1:1.5;
  const land=useMemo(()=>{const geo=new THREE.IcosahedronGeometry(R,4),pos=geo.attributes.position,v=new THREE.Vector3();
    const col=new Float32Array(pos.count*3),base=new THREE.Color(L().land).lerp(new THREE.Color(p.color),p.me?0:.18),c=new THREE.Color();
    for(let k=0;k<pos.count;k++){v.fromBufferAttribute(pos,k);const n=Math.sin(v.x*1.7+i)*Math.cos(v.z*1.3)+Math.sin(v.y*2.3+i*2)*.5;v.multiplyScalar(1+n*.03);pos.setXYZ(k,v.x,v.y,v.z);
      // meadows in a few greens, sandy patches, darker woods, snow near the top
      c.copy(base);if(n>.9)c.lerp(new THREE.Color('#3f6b3a'),.45);else if(n<-.95)c.lerp(new THREE.Color('#e8d49a'),.55);else c.offsetHSL(0,0,(n*.05));
      if(v.y/R>.9)c.lerp(new THREE.Color('#ffffff'),.75);col.set([c.r,c.g,c.b],k*3)}
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();return geo},[R,i,p.color,p.me]);
    const trees=useMemo(()=>p.trees.map((t,k)=>{const lat=.35+((k*53)%100)/100*1.1,lon=k/Math.max(1,p.trees.length)*Math.PI*2+i;
    const dir=new THREE.Vector3(Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon));
    return {dir,q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir),h:(R*.22+((k*37)%5)*.04)*big,c:t.condition}}),[p.trees,R,i,big]);
  const houseDir=new THREE.Vector3(-.3,1,.5).normalize(),houseQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),houseDir);
  const base=useRef(new THREE.Vector3()),v=useRef(new THREE.Vector3());
  const {camera,size}=useThree();
  useFrame(({clock},dt)=>{const o=g.current;if(!o)return;const t=still()?0:clock.elapsedTime;
    const s=portrait?.72:1.3;base.current.set(slot[0]*s+(p.me?0:Math.sin(t*.3+i)*.4),slot[1]*(portrait?.9:.8)+Math.sin(t*.6+i*3)*.35,slot[2]);
    o.position.copy(base.current);if(!still())o.rotation.y+=(p.me?.09:.18)*Math.min(dt,.1);
    v.current.copy(o.position).add(new THREE.Vector3(0,R*1.15,0)).project(camera);
    screenPoints.set('planet:'+p.id,{x:(v.current.x*.5+.5)*size.width,y:(-v.current.y*.5+.5)*size.height,visible:v.current.z<1});
  });
  useEffect(()=>()=>{screenPoints.delete('planet:'+p.id)},[p.id]);
  const click=(e:{stopPropagation:()=>void})=>{e.stopPropagation();onPick()};
  return <group ref={g} name={'planet-'+p.id} onClick={click}>
    <mesh geometry={land} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.9} flatShading/></mesh>
    <Atmosphere R={R} color={p.me?'#8fd3ff':p.color}/>
    <Clouds R={R} seed={i}/>
    {i%2===1&&<Moon R={R} i={i}/>}
    <group quaternion={new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.6).normalize(),.55)}>
      <mesh position-y={R*.995} rotation-x={-Math.PI/2}><circleGeometry args={[R*.22,20]}/><meshStandardMaterial color={L().pond} roughness={.3}/></mesh>
    </group>
    {trees.map((t,k)=><group key={k} position={t.dir.clone().multiplyScalar(R*.98)} quaternion={t.q}>
      <mesh position-y={t.h/2}><cylinderGeometry args={[.06*big,.09*big,t.h,6]}/><meshStandardMaterial color="#6a4a32"/></mesh>
      {t.c!=='dead'&&<mesh position-y={t.h+R*.08*big}>{t.c==='wilt'||t.c==='rot'?<coneGeometry args={[R*.11*big,R*.2*big,6]}/>:<icosahedronGeometry args={[R*.13*big,1]}/>}
        <meshStandardMaterial color={CONDITION_COLOR[t.c]} flatShading roughness={.8}/></mesh>}
    </group>)}
    <group position={houseDir.clone().multiplyScalar(R*.98)} quaternion={houseQ}>
      <mesh position-y={R*.08}><boxGeometry args={[R*.22,R*.16,R*.18]}/><meshStandardMaterial color="#efe6d2"/></mesh>
      <mesh position-y={R*.23} rotation-y={Math.PI/4}><coneGeometry args={[R*.18,R*.14,4]}/><meshStandardMaterial color={p.color} flatShading/></mesh>
    </group>
    <Belt R={R} color={p.me?'#ffe2a0':p.color} me={!!p.me}/>
  </group>;
}

// the camera: starts close on my garden and pulls back; flies to a planet being visited; dragging turns the sky a little
function SkyCam({planets,focus}:{planets:Planet[];focus:string|null}){
  const {camera,size,gl,scene}=useThree(),portrait=size.width<size.height;
  const st=useRef({yaw:0,pitch:.12,dist:portrait?66:46,t0:performance.now(),look:new THREE.Vector3(0,-6,6),drag:null as null|{x:number;y:number;yaw:number;pitch:number}});
  // the night dome is wider than the garden's far plane: open it up while the sky is shown, put it back after
  useEffect(()=>{const c=camera as THREE.PerspectiveCamera,far=c.far,fov=c.fov;c.fov=42;c.far=400;c.clearViewOffset();c.updateProjectionMatrix();st.current.t0=performance.now();return()=>{c.far=far;c.fov=fov;c.updateProjectionMatrix()}},[camera]);
  useEffect(()=>{const el=gl.domElement,s=st.current;
    const down=(e:PointerEvent)=>{s.drag={x:e.clientX,y:e.clientY,yaw:s.yaw,pitch:s.pitch}},up=()=>{s.drag=null},
      move=(e:PointerEvent)=>{if(!s.drag||focus)return;s.yaw=s.drag.yaw-(e.clientX-s.drag.x)*.004;s.pitch=Math.max(-.15,Math.min(.7,s.drag.pitch+(e.clientY-s.drag.y)*.003))};
    el.addEventListener('pointerdown',down);addEventListener('pointerup',up);addEventListener('pointermove',move);
    return()=>{el.removeEventListener('pointerdown',down);removeEventListener('pointerup',up);removeEventListener('pointermove',move)}},[gl,focus]);
  const want=useRef(new THREE.Vector3()),cur=useRef({dist:10,yaw:0,pitch:.12});
  useFrame((_,dt)=>{const s=st.current,k=1-Math.exp(-Math.min(dt,.25)*(still()?60:4));
    const intro=Math.min(1,(performance.now()-s.t0)/1600),ease=1-Math.pow(1-intro,3);
    let dist=(portrait?66:46);want.current.set(0,portrait?2.5:0,-4);
    const f=focus?scene.getObjectByName('planet-'+focus):null;
    if(f){const p=planets.find(x=>x.id===focus),R=p?.me?5.2:2.4+(p?.trees.length??0)*.12;want.current.copy(f.position).add(new THREE.Vector3(0,portrait?-R*1.6:0,0));dist=R*(portrait?9.5:6)}
    else if(intro<1){const me=scene.getObjectByName('planet-'+planets[0]?.id);if(me)want.current.lerp(me.position,1-ease);dist=10+(dist-10)*ease}
    s.look.lerp(want.current,k);cur.current.dist+=(dist-cur.current.dist)*k;cur.current.yaw+=(s.yaw-cur.current.yaw)*k;cur.current.pitch+=(s.pitch-cur.current.pitch)*k;
    const c=cur.current;camera.position.set(s.look.x+Math.sin(c.yaw)*Math.cos(c.pitch)*c.dist,s.look.y+Math.sin(c.pitch)*c.dist,s.look.z+Math.cos(c.yaw)*Math.cos(c.pitch)*c.dist);camera.lookAt(s.look);
  });
  return null;
}

export function SkyScene({sky}:{sky:SkyWorld}){
  const {size}=useThree(),portrait=size.width<size.height;
  return <group name="sky">
    <Backdrop/>
    <hemisphereLight args={['#fff4dd','#26304f',1.05]}/>
    <directionalLight position={[40,30,-40]} intensity={1.4} color="#ffe2b0"/>
    <directionalLight position={[-20,30,25]} intensity={1.1} color="#fff4e2"/>
    <directionalLight position={[-30,-10,-40]} intensity={0.9} color="#7f9cff"/>
    {sky.planets.map((p,i)=><PlanetMesh key={p.id} p={p} slot={SLOTS[i%SLOTS.length]} i={i} portrait={portrait} onPick={()=>sky.onPick(p.id)}/>)}
    <SkyCam planets={sky.planets} focus={sky.focus}/>
  </group>;
}
