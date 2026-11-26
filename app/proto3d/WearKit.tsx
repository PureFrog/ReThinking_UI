'use client';
// 피드백 2026-11-26 "갈아입을 수 있는 옷, 모자, 가방 등도 더 많이": the wardrobe pieces made in code (core/wardrobe.ts
// entries with kit:true), in the same plain-shape style as the villagers' kits (RoleKit.tsx) and in the figure's own
// units: the body socket's origin is the hips, the torso an ellipsoid ~0.30 × 0.30 × 0.25 round y 0.2, front +z; the
// hat socket sits on top of the head (head radius ~0.33); the hand socket hangs from the right arm, +y up.
// A coat's own colour (wardrobe tint) colours the torso and sleeves; what is here goes on top of it.
import type {ReactNode} from 'react';
import * as THREE from 'three';
import {soft} from './materials';

const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
const M2=(c:string)=><primitive object={soft(c,{side:THREE.DoubleSide})} attach="material"/>;
type V=[number,number,number];
const B=({p,s,c,r}:{p:V;s:V;c:string;r?:V})=><mesh position={p} rotation={r} castShadow><boxGeometry args={s}/>{M(c)}</mesh>;
const C=({p,a,c,r,seg=16}:{p:V;a:V;c:string;r?:V;seg?:number})=><mesh position={p} rotation={r} castShadow><cylinderGeometry args={[a[0],a[1],a[2],seg]}/>{M(c)}</mesh>;
const Ball=({p,r,c,s}:{p:V;r:number;c:string;s?:V})=><mesh position={p} scale={s} castShadow><sphereGeometry args={[r,16,12]}/>{M(c)}</mesh>;
const Band=({y,c,w=0.035,rx=0.3,rz=0.255}:{y:number;c:string;w?:number;rx?:number;rz?:number})=>
  <mesh position-y={y} rotation-x={Math.PI/2} scale={[rx/0.3,rz/0.3,1]}><torusGeometry args={[0.3,w,8,32]}/>{M(c)}</mesh>;
const glow=new THREE.MeshStandardMaterial({color:'#7fe0c0',emissive:'#4fd0a0',emissiveIntensity:1.1,toneMapped:false});

// which socket each slot's piece goes on
export const KIT_SOCKET={coat:'body',hat:'hat',bag:'body',tool:'hand'} as const;

export const WEAR_KIT:Record<string,ReactNode>={
  // ------------------------------------------------------------------ coats (on the body, over the tinted torso)
  coat_hoodie:<group>
    <Ball p={[0,0.43,-0.2]} r={0.17} c="#d9784c" s={[1.35,0.8,0.75]}/>{/* the hood down the back */}
    <B p={[0,0.06,0.255]} s={[0.26,0.12,0.03]} c="#d9784c"/>{/* the front pocket */}
    <C p={[-0.05,0.31,0.27]} a={[0.008,0.008,0.14]} c="#fff6ea"/><C p={[0.05,0.31,0.27]} a={[0.008,0.008,0.14]} c="#fff6ea"/>
    <Ball p={[-0.05,0.24,0.27]} r={0.016} c="#fff6ea"/><Ball p={[0.05,0.24,0.27]} r={0.016} c="#fff6ea"/>
    <Band y={-0.04} c="#d9784c" w={0.03} rx={0.29} rz={0.245}/></group>,
  coat_denim:<group>
    <Band y={0.42} c="#4a6a90" w={0.04} rx={0.2} rz={0.17}/>{/* collar */}
    <B p={[-0.11,0.27,0.258]} s={[0.09,0.07,0.02]} c="#4a6a90"/><B p={[0.11,0.27,0.258]} s={[0.09,0.07,0.02]} c="#4a6a90"/>
    <Ball p={[-0.11,0.29,0.27]} r={0.012} c="#d8b25a"/><Ball p={[0.11,0.29,0.27]} r={0.012} c="#d8b25a"/>
    {[0.32,0.2,0.08].map(y=><Ball key={y} p={[0,y,0.272]} r={0.014} c="#d8b25a"/>)}
    <B p={[0,0.2,0.262]} s={[0.012,0.38,0.01]} c="#e8d8a8"/>{/* the stitched front */}
    <Band y={-0.04} c="#4a6a90" w={0.032} rx={0.29} rz={0.245}/></group>,
  coat_trench:<group>
    <Band y={0.0} c="#9a7a48" w={0.032} rx={0.3} rz={0.26}/><B p={[0,0.0,0.29]} s={[0.07,0.06,0.02]} c="#d8b25a"/>
    <mesh position={[-0.08,0.33,0.24]} rotation={[-0.25,0,0.35]} castShadow><coneGeometry args={[0.07,0.2,3]}/>{M('#b08a54')}</mesh>
    <mesh position={[0.08,0.33,0.24]} rotation={[-0.25,0,-0.35]} castShadow><coneGeometry args={[0.07,0.2,3]}/>{M('#b08a54')}</mesh>
    {[[-0.07,0.2],[0.07,0.2],[-0.07,0.1],[0.07,0.1]].map(([x,y])=><Ball key={x+'-'+y} p={[x,y,0.27]} r={0.018} c="#5a3d2b"/>)}
    <C p={[0,-0.13,0]} a={[0.28,0.33,0.2]} c="#c8a26a" seg={20}/>{/* the skirt of the coat */}</group>,
  coat_suit:<group>
    <B p={[0,0.24,0.262]} s={[0.15,0.24,0.02]} c="#f2efe6"/><B p={[0,0.22,0.276]} s={[0.055,0.22,0.015]} c="#b23a3a"/><B p={[0,0.33,0.28]} s={[0.07,0.04,0.02]} c="#9a2f2f"/>
    <mesh position={[-0.1,0.3,0.25]} rotation={[-0.2,0,0.3]} castShadow><coneGeometry args={[0.06,0.22,3]}/>{M('#26304a')}</mesh>
    <mesh position={[0.1,0.3,0.25]} rotation={[-0.2,0,-0.3]} castShadow><coneGeometry args={[0.06,0.22,3]}/>{M('#26304a')}</mesh>
    <B p={[0.15,0.27,0.24]} s={[0.06,0.015,0.02]} c="#f2efe6"/>{/* a pocket square */}
    <Ball p={[0,0.08,0.27]} r={0.016} c="#c9c3b0"/></group>,
  coat_aloha:<group>
    {([[-0.15,0.3,'#fff6ea'],[0.12,0.33,'#f2d36a'],[-0.05,0.17,'#f2d36a'],[0.16,0.14,'#fff6ea'],[-0.17,0.06,'#f2d36a'],[0.05,0.02,'#fff6ea'],[0.0,0.32,'#7ac0a0']] as [number,number,string][])
      .map(([x,y,c],i)=><group key={i} position={[x,y,0.25+0.03*(1-Math.abs(x)*2)]}>{[0,1.26,2.51,3.77,5.03].map(a=><Ball key={a} p={[Math.cos(a)*0.025,Math.sin(a)*0.025,0]} r={0.02} c={c}/>)}<Ball p={[0,0,0.01]} r={0.014} c="#e0a030"/></group>)}
    <mesh position={[0,0.4,0.18]} rotation={[0.9,0,0]}><torusGeometry args={[0.13,0.025,6,20,Math.PI]}/>{M('#c84f46')}</mesh></group>,
  coat_puffer:<group>
    {[-0.02,0.11,0.24,0.36].map(y=><Band key={y} y={y} c="#335d78" w={0.045} rx={0.31-Math.abs(y-0.17)*0.25} rz={0.265-Math.abs(y-0.17)*0.2}/>)}
    <C p={[0,0.45,0]} a={[0.17,0.2,0.1]} c="#335d78" seg={20}/>{/* the high collar */}
    <B p={[0,0.2,0.285]} s={[0.012,0.4,0.012]} c="#c9c3b0"/></group>,

  // ------------------------------------------------------------------ hats (on top of the head)
  hat_cap:<group position-y={-0.08}><mesh scale={[1,0.6,1]}><sphereGeometry args={[0.335,20,14,0,Math.PI*2,0,Math.PI/2]}/>{M2('#3a6fb0')}</mesh>
    <B p={[0,0.0,0.33]} s={[0.36,0.03,0.24]} r={[0.12,0,0]} c="#2f5c94"/><Ball p={[0,0.2,0]} r={0.035} c="#f2efe6"/>
    <B p={[0,0.1,0.29]} s={[0.12,0.07,0.02]} r={[-0.5,0,0]} c="#f2efe6"/></group>,
  hat_beanie:<group position-y={-0.1}><mesh scale={[1.02,0.78,1.02]}><sphereGeometry args={[0.34,20,14,0,Math.PI*2,0,Math.PI/2]}/>{M2('#d65a5a')}</mesh>
    <mesh position-y={0.0} rotation-x={Math.PI/2}><torusGeometry args={[0.34,0.05,8,28]}/>{M('#c04848')}</mesh><Ball p={[0,0.3,0]} r={0.09} c="#fff6ea"/></group>,
  hat_fedora:<group position-y={-0.05}><C p={[0,0,0]} a={[0.5,0.5,0.03]} c="#4a3a30" seg={28}/><C p={[0,0.13,0]} a={[0.25,0.3,0.24]} c="#4a3a30" seg={22}/>
    <C p={[0,0.04,0]} a={[0.305,0.305,0.06]} c="#2a2420" seg={22}/><Ball p={[0.2,0.08,0.18]} r={0.035} c="#c44b3b" s={[0.5,1.6,0.5]}/></group>,
  hat_flower:<group position-y={-0.07}><mesh rotation-x={Math.PI/2}><torusGeometry args={[0.32,0.03,8,28]}/>{M('#5f8f4a')}</mesh>
    {Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,c=['#f2a6c0','#fff6ea','#f2d36a'][i%3];return <group key={i} position={[Math.cos(a)*0.32,0.03,Math.sin(a)*0.32]}>
      <Ball p={[0,0,0]} r={0.06} c={c} s={[1,0.6,1]}/><Ball p={[0,0.03,0]} r={0.025} c="#e0a030"/></group>})}</group>,
  hat_cat:<group position-y={-0.1}><mesh rotation={[0,0,0]}><torusGeometry args={[0.33,0.022,6,24,Math.PI]}/>{M('#3a3128')}</mesh>
    {[-1,1].map(k=><group key={k} position={[k*0.2,0.25,0]} rotation-z={-k*0.35}><mesh castShadow><coneGeometry args={[0.1,0.18,4]}/>{M('#3a3128')}</mesh>
      <mesh position={[0,-0.01,0.03]} scale={[0.6,0.7,0.4]}><coneGeometry args={[0.1,0.18,4]}/>{M('#f2a6c0')}</mesh></group>)}</group>,
  hat_phones:<group position-y={-0.16}><mesh><torusGeometry args={[0.36,0.035,8,28,Math.PI]}/>{M('#2b2f3a')}</mesh>
    {[-1,1].map(k=><group key={k} position={[k*0.36,-0.04,0]}><C p={[0,0,0]} a={[0.11,0.11,0.08]} r={[0,0,Math.PI/2]} c="#2b2f3a"/><C p={[k*0.045,0,0]} a={[0.075,0.075,0.02]} r={[0,0,Math.PI/2]} c="#e86a8a"/></group>)}</group>,
  hat_crown:<group position-y={-0.06}><C p={[0,0.05,0]} a={[0.3,0.3,0.1]} c="#f2c230" seg={20}/>
    {Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*0.27,0.16,Math.sin(a)*0.27]} castShadow><coneGeometry args={[0.07,0.14,4]}/>{M('#f2c230')}</mesh>})}
    {[0,2.1,4.2].map(a=><Ball key={a} p={[Math.cos(a+Math.PI/2)*0.3,0.05,Math.sin(a+Math.PI/2)*0.3]} r={0.03} c={a===0?'#c44b3b':'#3f7fb8'}/>)}</group>,

  // ------------------------------------------------------------------ bags (on the body: the back is -z, the side is ±x)
  bag_back:<group position={[0,0.2,-0.3]}><B p={[0,0,0]} s={[0.34,0.38,0.17]} c="#e0a03a"/><B p={[0,-0.08,-0.1]} s={[0.24,0.14,0.05]} c="#c98a2a"/>
    <B p={[0,0.2,0]} s={[0.3,0.05,0.18]} c="#c98a2a"/><Ball p={[0,-0.02,-0.13]} r={0.018} c="#5a3d2b"/>
    {[-1,1].map(k=><B key={k} p={[k*0.12,0.03,0.33]} s={[0.04,0.34,0.02]} r={[-0.15,0,0]} c="#8a5a2a"/>)}
    <C p={[0,-0.22,0]} a={[0.06,0.06,0.3]} r={[0,0,Math.PI/2]} c="#5f8f4a"/>{/* a rolled mat underneath */}</group>,
  bag_eco:<group><B p={[0,0.2,0.2]} s={[0.04,0.6,0.03]} r={[0,0,0.85]} c="#e8dcc0"/>
    <group position={[0.31,-0.05,0.05]} rotation-y={0.3}><B p={[0,0,0]} s={[0.06,0.3,0.27]} c="#efe4c8"/><Ball p={[0.035,0.02,0]} r={0.045} c="#5f8f4a" s={[0.3,1,1]}/>
      <B p={[0,0.19,0]} s={[0.04,0.08,0.03]} c="#e8dcc0"/></group></group>,
  bag_cross:<group><B p={[0,0.2,0.21]} s={[0.03,0.6,0.025]} r={[0,0,-0.85]} c="#7a4a2a"/>
    <group position={[-0.3,0.0,0.1]} rotation={[0,-0.3,Math.PI/2]}><C p={[0,0,0]} a={[0.11,0.11,0.07]} c="#c46a5a" seg={24}/><C p={[0,0.04,0]} a={[0.07,0.07,0.01]} c="#f2d36a" seg={20}/></group></group>,
  bag_wings:<group position={[0,0.28,-0.27]}>{[-1,1].map(k=><group key={k} position-x={k*0.1} rotation={[0.1,k*0.5,k*0.3]}>
    <Ball p={[k*0.17,0.05,0]} r={0.16} c="#fbf6ee" s={[1.2,0.8,0.25]}/><Ball p={[k*0.27,-0.06,0]} r={0.11} c="#f2ece2" s={[1.1,0.8,0.25]}/><Ball p={[k*0.08,0.12,0.01]} r={0.08} c="#ffffff" s={[1,0.8,0.3]}/></group>)}</group>,

  // ------------------------------------------------------------------ in the hand (+y up)
  tool_coffee:<group position={[0,0.05,0.05]}><C p={[0,0,0]} a={[0.055,0.045,0.15]} c="#f4f1ea"/><C p={[0,-0.005,0]} a={[0.052,0.042,0.11]} c="#8a5a3a"/>
    <C p={[0,0.08,0]} a={[0.06,0.06,0.02]} c="#f4f1ea"/><C p={[0.015,0.14,0]} a={[0.007,0.007,0.12]} r={[0,0,-0.2]} c="#e86a5a"/><B p={[0,0.0,0.05]} s={[0.05,0.05,0.005]} c="#5f8f4a"/></group>,
  tool_umbrella:<group><C p={[0,0.38,0]} a={[0.012,0.012,0.86]} c="#5a3d2b"/><mesh position-y={-0.05} rotation-z={Math.PI}><torusGeometry args={[0.04,0.012,6,12,Math.PI]}/>{M('#5a3d2b')}</mesh>
    <mesh position-y={0.82}><coneGeometry args={[0.46,0.2,8,1,true]}/>{M2('#d84a40')}</mesh><Ball p={[0,0.93,0]} r={0.02} c="#5a3d2b"/></group>,
  tool_balloon:<group><C p={[0,0.36,0]} a={[0.004,0.004,0.72]} c="#f4f1ea"/><Ball p={[0,0.86,0]} r={0.16} c="#e84a5a" s={[1,1.15,1]}/><mesh position-y={0.7}><coneGeometry args={[0.025,0.04,8]}/>{M('#c83a4a')}</mesh>
    <Ball p={[-0.05,0.92,0.13]} r={0.03} c="#ffd0d8"/></group>,
  tool_bouquet:<group position={[0,0.06,0.06]}><mesh position-y={0.02} rotation-x={Math.PI}><coneGeometry args={[0.1,0.24,10,1,true]}/>{M2('#f3ead3')}</mesh>
    {([[0,0.17,0,'#e8607a'],[-0.06,0.15,0.03,'#f2d36a'],[0.06,0.16,0.02,'#fff6ea'],[0.02,0.15,-0.06,'#c86ad8'],[-0.04,0.19,-0.03,'#e8607a']] as [number,number,number,string][])
      .map(([x,y,z,c],i)=><Ball key={i} p={[x,y,z]} r={0.045} c={c}/>)}<B p={[0,-0.02,0.07]} s={[0.09,0.04,0.01]} c="#d84a40"/></group>,
  tool_tablet:<group position={[0,0.06,0.07]} rotation-x={-0.5}><B p={[0,0,0]} s={[0.26,0.19,0.018]} c="#2c3440"/>
    <mesh position-z={0.011}><planeGeometry args={[0.23,0.16]}/><primitive object={glow} attach="material"/></mesh>
    {[[-0.08,-0.03],[-0.03,0.0],[0.02,-0.02],[0.07,0.04]].map(([x,y],i)=><B key={i} p={[x,y,0.014]} s={[0.035,0.012,0.002]} r={[0,0,0.5]} c="#1d6a50"/>)}</group>,
  tool_icecream:<group position={[0,0.06,0.04]}><mesh position-y={0.02} rotation-x={Math.PI}><coneGeometry args={[0.055,0.17,12]}/>{M('#d9a35a')}</mesh>
    <Ball p={[0,0.13,0]} r={0.065} c="#f6c6d4"/><Ball p={[0,0.21,0]} r={0.055} c="#fff6ea"/><Ball p={[0.02,0.26,0.02]} r={0.015} c="#c44b3b"/></group>,
};
