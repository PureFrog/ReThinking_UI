'use client';
// 마을 자연 (피드백 2026-11-26 "연못에 연꽃·개구리, 모닥불 초라해, 길고양이·강아지, 강이 재미없어"): the pond's lily pads and
// lotus flowers, two frogs that hop pad to pad, reeds and cattails, rings on the water; the campfire's stone ring, a
// layered flickering flame with rising embers, stumps and a lantern; a stray dog; the stream's
// banks (pebbles, reeds, a few rocks) and its flowing water (World3D uses riverMaterial).
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {soft} from './materials';
import {OnGround,surfaceY} from './ground';
import {npcStep} from './places';
import {still} from './still';
import {usePetCue,petPick,Hearts,type PetId} from './Pets';

const M=(c:string)=><primitive object={soft(c)} attach="material"/>;

// ------------------------------------------------------------ the pond (an ellipse ~2.35 × 1.85 round POND_AT)
const PADS:[number,number,number][]=[[0.6,0.5,0.32],[-0.4,0.7,0.26],[1.1,-0.3,0.28],[-0.9,-0.5,0.3],[0.2,-0.8,0.24],[-1.3,0.2,0.22],[0.9,0.95,0.2]];
export function PondLife({at}:{at:{x:number;z:number}}){
  const y=surfaceY(at.x,at.z)+0.16;
  const frogs=useRef<(THREE.Group|null)[]>([]),rings=useRef<(THREE.Mesh|null)[]>([]),st=useRef([{pad:2,t:0,from:0},{pad:5,t:4,from:3}]);
  useFrame(({clock},dt)=>{const t=clock.elapsedTime;
    st.current.forEach((f,i)=>{const g=frogs.current[i];if(!g)return;if(!still())f.t+=dt;
      const hopping=f.t>7,k=hopping?Math.min(1,(f.t-7)/0.6):0,a=PADS[f.from],b=PADS[f.pad];
      if(hopping&&k>=1){f.from=f.pad;f.pad=(f.pad+2+i)%PADS.length;f.t=Math.random()*2}
      const kk=hopping?k:0;g.position.set(at.x+a[0]+(b[0]-a[0])*kk,y+0.03+Math.sin(kk*Math.PI)*0.5,at.z+a[1]+(b[1]-a[1])*kk);
      g.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);g.scale.y=1-Math.sin(t*3+i)*0.04});
    rings.current.forEach((m,i)=>{if(!m)return;const k=((t*0.35+i/3)%1);m.scale.setScalar(0.2+k*1.4);(m.material as THREE.MeshBasicMaterial).opacity=(1-k)*0.5})});
  const reeds=useMemo(()=>Array.from({length:26},(_,i)=>{const a=i/26*Math.PI*2+Math.sin(i)*0.2,r=1/Math.hypot(Math.cos(a)/2.35,Math.sin(a)/1.85)+0.15;
    return {x:at.x+Math.cos(a)*r,z:at.z+Math.sin(a)*r,h:0.45+((i*37)%10)/20,cat:i%3===0,lean:(Math.sin(i*3)*0.15)}}).filter((_,i)=>i%4!==1),[at.x,at.z]);
  return <group name="pond-life">
    {PADS.map(([dx,dz,s],i)=><group key={i} position={[at.x+dx,y,at.z+dz]} rotation-y={i*1.3}>
      <mesh rotation-x={-Math.PI/2}><circleGeometry args={[s,20,0.3,Math.PI*2-0.6]}/><meshStandardMaterial color={['#5fa548','#6db24f','#4f9a45'][i%3]} roughness={0.6} side={THREE.DoubleSide}/></mesh>
      {i%3===1&&<group position-y={0.02}>{Array.from({length:7},(_,j)=><mesh key={j} position={[Math.cos(j*0.9)*0.06,0.06,Math.sin(j*0.9)*0.06]} rotation={[Math.sin(j*0.9)*0.6,0,-Math.cos(j*0.9)*0.6]}><coneGeometry args={[0.04,0.14,6]}/><meshStandardMaterial color={j%2?'#f7a9c4':'#fbd0df'}/></mesh>)}
        <mesh position-y={0.07}><sphereGeometry args={[0.035,10,8]}/>{M('#f2c94c')}</mesh></group>}
    </group>)}
    {[0,1].map(i=><group key={'f'+i} ref={el=>{frogs.current[i]=el}}>
      <mesh position-y={0.07} scale={[1,0.75,1.15]}><sphereGeometry args={[0.1,14,10]}/>{M(i?'#7cc06a':'#9ccf6a')}</mesh>
      {[-1,1].map(k=><group key={k} position={[k*0.05,0.15,0.06]}><mesh><sphereGeometry args={[0.035,10,8]}/>{M(i?'#7cc06a':'#9ccf6a')}</mesh>
        <mesh position-z={0.025}><sphereGeometry args={[0.02,8,6]}/>{M('#1f1b1a')}</mesh></group>)}
      <mesh position={[0,0.08,0.11]} rotation-z={Math.PI}><torusGeometry args={[0.035,0.006,4,10,Math.PI]}/>{M('#3b5a2a')}</mesh>
      {[-1,1].map(k=><mesh key={'l'+k} position={[k*0.08,0.02,-0.03]} scale={[1,0.5,1.6]}><sphereGeometry args={[0.04,8,6]}/>{M('#5f9a4f')}</mesh>)}
    </group>)}
    {reeds.map((r,i)=><group key={'r'+i} position={[r.x,surfaceY(r.x,r.z),r.z]} rotation-z={r.lean}>
      {[0,1,2].map(j=><mesh key={j} position={[(j-1)*0.04,r.h/2,(j%2)*0.03]} rotation-z={(j-1)*0.12}><cylinderGeometry args={[0.008,0.012,r.h,4]}/>{M('#6b9a45')}</mesh>)}
      {r.cat&&<mesh position-y={r.h*0.85}><capsuleGeometry args={[0.025,0.12,4,8]}/>{M('#7a4f2e')}</mesh>}</group>)}
    {[0,1,2].map(i=><mesh key={'ring'+i} ref={el=>{rings.current[i]=el}} position={[at.x+[0.3,-0.8,0.9][i],y+0.005,at.z+[-0.2,0.3,0.4][i]]} rotation-x={-Math.PI/2}>
      <ringGeometry args={[0.28,0.3,32]}/><meshBasicMaterial color="#e8f6ff" transparent opacity={0.4} depthWrite={false}/></mesh>)}
  </group>;
}

// ------------------------------------------------------------ the campfire's surroundings (round FIRE)
export function CampfireDecor({at}:{at:[number,number]}){
  const fl=useRef<(THREE.Mesh|null)[]>([]),emb=useRef<(THREE.Mesh|null)[]>([]),seed=useMemo(()=>Array.from({length:12},()=>({a:Math.random()*6.3,s:0.5+Math.random()*0.6,o:Math.random()})),[]);
  useFrame(({clock})=>{const t=clock.elapsedTime;
    fl.current.forEach((m,i)=>{if(!m)return;m.scale.set(1+Math.sin(t*(9+i*2)+i)*0.12,1+Math.sin(t*(13+i)+i*2)*0.2,1+Math.cos(t*(7+i))*0.12);m.rotation.y=t*(0.6+i*0.3)});
    emb.current.forEach((m,i)=>{if(!m)return;const s=seed[i],k=((t*s.s*0.5+s.o)%1);m.position.set(Math.cos(s.a+t*0.5)*0.15*k,0.4+k*1.8,Math.sin(s.a+t*0.5)*0.15*k);(m.material as THREE.MeshBasicMaterial).opacity=1-k})});
  return <OnGround x={at[0]} z={at[1]}><group name="campfire-decor">
    {/* the stone ring and ash */}
    <mesh rotation-x={-Math.PI/2} position-y={0.015}><circleGeometry args={[0.6,24]}/>{M('#5a4e46')}</mesh>
    {Array.from({length:11},(_,i)=>{const a=i/11*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*0.66,0.08,Math.sin(a)*0.66]} rotation-y={a} scale={[1.1,0.7,0.9]} castShadow><dodecahedronGeometry args={[0.13,0]}/>{M(['#9a9088','#b0a69c','#8a8078'][i%3])}</mesh>})}
    {/* a layered flame: deep orange outside, gold, then a white-yellow heart */}
    {[['#ff6a1a',0.32,0.9,1.4],['#ffb02e',0.22,0.7,1.8],['#fff1a8',0.12,0.45,2.4]].map(([c,r,h,e],i)=><mesh key={i} ref={el=>{fl.current[i]=el}} position-y={0.2+(h as number)/2}>
      <coneGeometry args={[r as number,h as number,10]}/><meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={e as number} transparent opacity={0.88} toneMapped={false} depthWrite={false}/></mesh>)}
    {seed.map((_,i)=><mesh key={'e'+i} ref={el=>{emb.current[i]=el}}><sphereGeometry args={[0.02,6,4]}/><meshBasicMaterial color="#ffb347" transparent toneMapped={false}/></mesh>)}
    {/* 피드백 2026-11-26 "불이 주전자를 통과해 보여": no kettle or tripod over the fire any more */}
    {/* stumps to sit on, a lantern, a basket of logs, marshmallows on a stick (solid where places.ts FIRE_DECOR says) */}
    {[[1.4,0.6],[-1.3,0.8],[-0.4,1.5]].map(([x,z],i)=><group key={'s'+i} position={[x,0,z]}><mesh position-y={0.2} castShadow><cylinderGeometry args={[0.25,0.28,0.4,14]}/>{M('#8a6448')}</mesh>
      <mesh position-y={0.405} rotation-x={-Math.PI/2}><circleGeometry args={[0.25,16]}/>{M('#d9b88a')}</mesh>{[0.12,0.2].map(r=><mesh key={r} position-y={0.41} rotation-x={-Math.PI/2}><ringGeometry args={[r,r+0.012,20]}/>{M('#b08a5a')}</mesh>)}</group>)}
    <group position={[1.4,0.42,0.6]}><mesh position-y={0.1}><boxGeometry args={[0.14,0.2,0.14]}/><meshStandardMaterial color="#fff1c4" emissive="#ffc867" emissiveIntensity={1.3} toneMapped={false}/></mesh>
      <mesh position-y={0.22}><coneGeometry args={[0.12,0.08,4]}/>{M('#2f2a28')}</mesh><pointLight position-y={0.15} intensity={1.2} distance={2.5} color="#ffcf87"/></group>
    <group position={[-1.6,0,-0.6]}><mesh position-y={0.15}><cylinderGeometry args={[0.28,0.24,0.3,14,1,true]}/><meshStandardMaterial color="#b08a5a" side={THREE.DoubleSide}/></mesh>
      {[0,1,2,3].map(i=><mesh key={i} position={[Math.cos(i*1.6)*0.1,0.3,Math.sin(i*1.6)*0.1]} rotation={[Math.PI/2,0,i*0.8]}><cylinderGeometry args={[0.05,0.05,0.45,8]}/>{M('#9a6a4a')}</mesh>)}</group>
    <group position={[-0.4,0.42,1.5]} rotation={[0,0.6,0.9]}><mesh><cylinderGeometry args={[0.008,0.008,0.9,4]}/>{M('#a77d58')}</mesh>
      {[0,1].map(i=><mesh key={i} position-y={0.4+i*0.06}><cylinderGeometry args={[0.025,0.025,0.04,8]}/>{M(i?'#f4efe2':'#e8c6a0')}</mesh>)}</group>
  </group></OnGround>;
}

// ------------------------------------------------------------ a stray dog (and the cat is HouseMore's Cat outside)
export function Dog({spots,id='dog'}:{spots:[number,number][];id?:PetId}){
  const cue=usePetCue(id);
  const root=useRef<THREE.Group>(null),tail=useRef<THREE.Mesh>(null),head=useRef<THREE.Group>(null),legs=useRef<(THREE.Mesh|null)[]>([]);
  const st=useRef({x:spots[0][0],z:spots[0][1],to:1,mode:'sit' as 'walk'|'sit'|'sniff',until:3,yaw:0,ph:0});
  useFrame(({clock,camera},dt0)=>{const r=root.current;if(!r)return;const dt=Math.min(dt0,0.05),t=clock.elapsedTime,s=st.current;
    // picked: sits and looks up; petted it hops and wags hard; a treat it eats, then spins round once
    const react=cue.reacting(),waiting=cue.waiting();
    if(waiting){s.mode='sit';s.until=t+2;const ya=Math.atan2(camera.position.x-s.x,camera.position.z-s.z);s.yaw+=Math.atan2(Math.sin(ya-s.yaw),Math.cos(ya-s.yaw))*Math.min(1,5*dt)}
    if(s.mode==='walk'){const [tx,tz]=spots[s.to],dx=tx-s.x,dz=tz-s.z,d=Math.hypot(dx,dz);
      if(d<0.1){s.mode=Math.random()<0.5?'sit':'sniff';s.until=t+4+Math.random()*5}else{const sp=Math.min(d,1.1*dt);if(!npcStep(s,tx,tz,sp,undefined,0.2)){s.x+=dx/d*sp;s.z+=dz/d*sp}
        const ya=Math.atan2(dx,dz);s.yaw+=Math.atan2(Math.sin(ya-s.yaw),Math.cos(ya-s.yaw))*Math.min(1,6*dt);s.ph+=dt*11}}
    else if(t>s.until&&!still()){let n=s.to;while(n===s.to)n=Math.floor(Math.random()*spots.length);s.to=n;s.mode='walk'}
    r.position.set(s.x,surfaceY(s.x,s.z)+(react==='pet'?Math.abs(Math.sin(t*8))*0.12:0),s.z);r.rotation.y=s.yaw+(react==='treat'&&cue.hearts%2===0?Math.min(1,Math.max(0,(t%3.5)-2))*Math.PI*2:0);
    if(tail.current)tail.current.rotation.x=-0.6+Math.sin(t*(react?26:s.mode==='walk'?14:8))*0.35;
    if(head.current)head.current.rotation.x=THREE.MathUtils.lerp(head.current.rotation.x,react==='treat'?0.6+Math.abs(Math.sin(t*10))*0.2:waiting||react==='pet'?-0.25:s.mode==='sniff'?0.7:0,0.12);
    legs.current.forEach((l,i)=>{if(l)l.rotation.x=s.mode==='walk'?Math.sin(s.ph+(i===0||i===3?0:Math.PI))*0.6:0})});
  const coat='#f2e2c4',ear='#b98a5a';
  return <group ref={root} name="stray-dog" scale={0.95} onClick={e=>{e.stopPropagation();if(e.delta>6)return;petPick(id,{x:st.current.x,z:st.current.z})}}
    onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
    <Hearts n={cue.hearts} y={0.8}/>
    <mesh position={[0,0.35,0]} visible={false}><boxGeometry args={[0.7,0.8,0.9]}/></mesh>
    <mesh position={[0,0.3,0]} rotation-x={Math.PI/2} castShadow><capsuleGeometry args={[0.13,0.26,8,14]}/>{M(coat)}</mesh>
    <mesh position={[0.05,0.36,-0.05]} scale={[0.8,0.6,1]}><sphereGeometry args={[0.1,10,8]}/>{M('#d9a06a')}</mesh>
    {[[-0.08,0.16],[0.08,0.16],[-0.08,-0.15],[0.08,-0.15]].map(([x,z],i)=><mesh key={i} ref={el=>{legs.current[i]=el}} position={[x,0.15,z]}><capsuleGeometry args={[0.04,0.14,4,8]}/>{M(coat)}</mesh>)}
    <mesh ref={tail} position={[0,0.38,-0.25]}><capsuleGeometry args={[0.025,0.16,4,8]}/>{M(coat)}</mesh>
    <group ref={head} position={[0,0.45,0.25]}>
      <mesh scale={[1,0.95,1.05]} castShadow><sphereGeometry args={[0.13,16,12]}/>{M(coat)}</mesh>
      <mesh position={[0,-0.03,0.12]} scale={[0.9,0.7,1]}><sphereGeometry args={[0.07,12,10]}/>{M('#fff6e6')}</mesh>
      <mesh position={[0,0,0.19]}><sphereGeometry args={[0.025,8,6]}/>{M('#2a2420')}</mesh>
      {[-1,1].map(k=><group key={k}><mesh position={[k*0.05,0.04,0.11]}><sphereGeometry args={[0.02,8,6]}/>{M('#2a2420')}</mesh>
        <mesh position={[k*0.12,0.03,0]} rotation-z={k*0.4} scale={[0.5,1,0.8]}><sphereGeometry args={[0.07,10,8]}/>{M(ear)}</mesh></group>)}
      <mesh position={[0,-0.11,0.02]} rotation-x={Math.PI/2}><torusGeometry args={[0.09,0.015,6,16]}/>{M('#4f7fb8')}</mesh>
    </group>
  </group>;
}

// ------------------------------------------------------------ the stream's water and banks
export function riverMaterial(deep:string,light:string){
  return new THREE.ShaderMaterial({uniforms:{t:{value:0},deep:{value:new THREE.Color(deep)},light:{value:new THREE.Color(light)}},side:THREE.DoubleSide,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    // 피드백 2026-11-26 "강이 일괄적으로 흘러서 에스컬레이터 같다": no more evenly spaced stripes. The surface is warped noise
    // carried downstream faster in the middle than at the banks, with slow eddies; glints ride on the ridges of the
    // noise; the bank foam breaks up and breathes; a darker channel winds along the deep line.
    fragmentShader:`uniform float t;uniform vec3 deep;uniform vec3 light;varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
      void main(){float v=vUv.y,x=vUv.x,mid=1.0-pow(abs(v-0.5)*2.0,2.0);
        float sp=0.35+0.9*mid;
        vec2 q=vec2(x*1.6-t*sp*0.55,v*3.0);
        vec2 warp=vec2(fbm(q+vec2(0.0,t*0.05)),fbm(q*1.3+vec2(5.2,-t*0.07)));
        float f=fbm(q+warp*1.6);
        float chan=smoothstep(0.25,0.0,abs(v-0.5-0.12*sin(x*0.35+fbm(vec2(x*0.2,1.0))*3.0)));
        float edge=smoothstep(0.0,0.2,v)*smoothstep(1.0,0.8,v);
        vec3 c=mix(light,deep,edge*(0.55+0.45*f)+chan*0.18);
        float ridge=1.0-abs(fbm(q*2.2+warp*2.5)*2.0-1.0);
        c+=vec3(0.16,0.2,0.24)*smoothstep(0.78,0.95,ridge)*edge;
        float gl=n(vec2(x*7.0-t*sp*2.2,v*24.0))*n(vec2(x*3.1+t*0.3,v*9.0+t*0.5));
        c+=vec3(1.0)*smoothstep(0.62,0.8,gl)*edge*(0.6+0.4*sin(t*5.0+x*3.0));
        float br=fbm(vec2(x*2.5-t*0.25,t*0.15));
        float foam=smoothstep(0.1+0.07*br,0.0,v)+smoothstep(0.1+0.07*fbm(vec2(x*2.3+7.0-t*0.22,t*0.13)),0.0,1.0-v);
        foam*=0.55+0.45*n(vec2(x*6.0-t*0.6,v*20.0));
        c=mix(c,vec3(0.93,0.97,1.0),clamp(foam,0.0,1.0)*0.85);
        gl_FragColor=vec4(c,1.0);}`});
}
export function RiverBanks({zAt,from,to,half}:{zAt:(x:number)=>number;from:number;to:number;half:number}){
  const items=useMemo(()=>{const out:{x:number;z:number;k:'pebble'|'reed'|'rock';s:number}[]=[];let r=7;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647};
    for(let x=from;x<to;x+=0.45)for(const side of [-1,1]){const z=zAt(x)+side*(half+0.25+rnd()*0.5),q=rnd();
      if(q<0.45)out.push({x:x+rnd()*0.3,z,k:'pebble',s:0.05+rnd()*0.07});else if(q<0.62)out.push({x,z:z+side*0.15,k:'reed',s:0.4+rnd()*0.35});else if(q<0.66)out.push({x,z:z+side*0.2,k:'rock',s:0.16+rnd()*0.16})}
    return out},[zAt,from,to,half]);
  const pebRef=useRef<THREE.InstancedMesh>(null),reedRef=useRef<THREE.InstancedMesh>(null),rockRef=useRef<THREE.InstancedMesh>(null);
  useEffect(()=>{const o=new THREE.Object3D();const put=(ref:React.RefObject<THREE.InstancedMesh|null>,kind:string,fn:(it:typeof items[0],o:THREE.Object3D)=>void)=>{const m=ref.current;if(!m)return;let i=0;
      for(const it of items)if(it.k===kind){o.position.set(it.x,surfaceY(it.x,it.z),it.z);o.rotation.set(0,it.x*3,0);o.scale.set(1,1,1);fn(it,o);o.updateMatrix();m.setMatrixAt(i++,o.matrix)}m.count=i;m.instanceMatrix.needsUpdate=true};
    put(pebRef,'pebble',(it,o)=>{o.scale.set(it.s*1.3,it.s*0.6,it.s);o.position.y+=0.02});
    put(reedRef,'reed',(it,o)=>{o.scale.set(1,it.s,1);o.position.y+=it.s/2;o.rotation.z=Math.sin(it.x)*0.15});
    put(rockRef,'rock',(it,o)=>{o.scale.set(it.s*1.3,it.s*0.8,it.s);o.position.y+=it.s*0.3})},[items]);
  const n=(k:string)=>items.filter(i=>i.k===k).length;
  return <group name="river-banks">
    <instancedMesh ref={pebRef} args={[undefined,undefined,n('pebble')]} receiveShadow><sphereGeometry args={[1,8,6]}/>{M('#c9beb0')}</instancedMesh>
    <instancedMesh ref={reedRef} args={[undefined,undefined,n('reed')]}><cylinderGeometry args={[0.012,0.02,1,4]}/>{M('#6b9a45')}</instancedMesh>
    <instancedMesh ref={rockRef} args={[undefined,undefined,n('rock')]} castShadow><dodecahedronGeometry args={[1,0]}/>{M('#a89e92')}</instancedMesh>
  </group>;
}
