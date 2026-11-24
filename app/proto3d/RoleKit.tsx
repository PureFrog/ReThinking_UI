'use client';
// 피드백 2026-11-23 (시안 OK: /mnt/project-files/…/시안/마을사람_겉모습_시안.png): each of the village's people shows what
// they do from afar: a colour of their own, a hat and the thing in their hands, put on the figure's sockets (Explorer3D
// kit). Plain shapes in the shared soft material, in the figure's own units (the body socket's origin is the hips,
// the front is +z; the head socket sits 0.46 above, its top near 0.62 more; hands hang from the arms).
import type {ReactNode} from 'react';
import {soft} from './materials';
import * as THREE from 'three';

export type Kit={tint?:{primary:string;secondary:string;accent:string};hat?:ReactNode;head?:ReactNode;body?:ReactNode;handR?:ReactNode;handL?:ReactNode};
const M=(c:string)=><primitive object={soft(c)} attach="material"/>;
const M2=(c:string)=><primitive object={soft(c,{side:THREE.DoubleSide})} attach="material"/>;
const screen=new THREE.MeshStandardMaterial({color:'#7fe0c0',emissive:'#5fe0b0',emissiveIntensity:1.2,toneMapped:false});
const B=({p,s,c,r}:{p:[number,number,number];s:[number,number,number];c:string;r?:[number,number,number]})=>
  <mesh position={p} rotation={r} castShadow><boxGeometry args={s}/>{M(c)}</mesh>;
const C=({p,a,c,r,seg=14,flat}:{p:[number,number,number];a:[number,number,number];c:string;r?:[number,number,number];seg?:number;flat?:boolean})=>
  <mesh position={p} rotation={r} castShadow={!flat}><cylinderGeometry args={[a[0],a[1],a[2],seg]}/>{M(c)}</mesh>;
const Ball=({p,r,c,s}:{p:[number,number,number];r:number;c:string;s?:[number,number,number]})=>
  <mesh position={p} scale={s} castShadow><sphereGeometry args={[r,16,12]}/>{M(c)}</mesh>;
// a band round the torso (the torso is an ellipsoid 0.30 × 0.30 × 0.25 round body+0.2)
const Band=({y,c,w=0.035,rx=0.3,rz=0.255}:{y:number;c:string;w?:number;rx?:number;rz?:number})=>
  <mesh position-y={y} rotation-x={Math.PI/2} scale={[rx/0.3,rz/0.3,1]}><torusGeometry args={[0.3,w,8,32]}/>{M(c)}</mesh>;

export const ROLE_KIT:Record<string,Kit>={
  // 농부: green shirt, blue bib overalls, straw hat (its own model), a hoe and a basket of sprouts
  farmer:{tint:{primary:'#7a9a4a',secondary:'#c9b98f',accent:'#4d6fa3'},
    body:<group><B p={[0,0.12,0.29]} s={[0.32,0.3,0.05]} c="#4d6fa3"/><B p={[-0.12,0.33,0.25]} s={[0.05,0.2,0.04]} r={[-0.45,0,0]} c="#4d6fa3"/><B p={[0.12,0.33,0.25]} s={[0.05,0.2,0.04]} r={[-0.45,0,0]} c="#4d6fa3"/>
      <Ball p={[-0.12,0.25,0.32]} r={0.025} c="#e0c060"/><Ball p={[0.12,0.25,0.32]} r={0.025} c="#e0c060"/></group>,
    handR:<group><C p={[0,0.2,0]} a={[0.025,0.025,1.05]} c="#8a6a3a"/><B p={[0,0.72,0.07]} s={[0.07,0.05,0.18]} c="#9aa3ab"/></group>,
    handL:<group position={[0,-0.02,0.05]}><C p={[0,0,0]} a={[0.13,0.1,0.12]} c="#a87a44"/><Ball p={[-0.04,0.08,0]} r={0.05} c="#6fbf4a" s={[0.6,1.4,0.6]}/><Ball p={[0.05,0.08,0.02]} r={0.05} c="#6fbf4a" s={[0.6,1.3,0.6]}/></group>},
  // 상인: purple waistcoat with a gold front, beret (its own model), a communicator with a lit screen, a coin pouch
  merchant:{tint:{primary:'#8a4f8f',secondary:'#5b2f60',accent:'#e1c45a'},
    body:<group><mesh position={[0,0.24,0.23]} rotation={[-0.2,0,Math.PI]}><coneGeometry args={[0.1,0.26,3]}/>{M('#e1c45a')}</mesh>
      <group position={[-0.27,0.0,0.1]}><Ball p={[0,0,0]} r={0.08} c="#e0b13a"/><C p={[0,0.07,0]} a={[0.03,0.05,0.04]} c="#c99a2a"/></group></group>,
    handR:<group position={[0,0.02,0.06]}><B p={[0,0,0]} s={[0.12,0.18,0.05]} c="#2c3440"/><mesh position={[0,0.025,0.027]}><planeGeometry args={[0.085,0.075]}/><primitive object={screen} attach="material"/></mesh>
      <C p={[0.04,0.15,0]} a={[0.008,0.008,0.14]} c="#2c3440"/><Ball p={[0.04,0.23,0]} r={0.022} c="#ff6a5a"/></group>},
  // 신문 배달: blue jacket, red cap, a satchel of papers on a strap, one paper held up
  paperboy:{tint:{primary:'#3f7fb8',secondary:'#2c5a85',accent:'#f4eedf'},
    hat:<group position-y={-0.08}><mesh scale={[1,0.62,1]}><sphereGeometry args={[0.33,20,14]}/>{M2('#c44b3b')}</mesh>
      <B p={[0,0.01,0.33]} s={[0.36,0.03,0.22]} c="#a33a2c"/><Ball p={[0,0.2,0]} r={0.035} c="#a33a2c"/></group>,
    body:<group><B p={[0,0.2,0.2]} s={[0.05,0.62,0.04]} r={[0,0,0.85]} c="#8a5a2a"/>
      <group position={[0.3,-0.02,0.08]} rotation-y={0.3}><B p={[0,0,0]} s={[0.1,0.24,0.28]} c="#b9874a"/><B p={[0,0.15,0]} s={[0.07,0.08,0.22]} c="#f3f0e6"/></group></group>,
    handL:<group position={[0,0.06,0.07]} rotation={[0,0.4,-0.2]}><B p={[0,0,0]} s={[0.2,0.26,0.012]} c="#f3f0e6"/>
      <B p={[0,0.07,0.008]} s={[0.15,0.03,0.004]} c="#3a3128"/><B p={[0,0.01,0.008]} s={[0.15,0.012,0.004]} c="#9a948a"/><B p={[0,-0.03,0.008]} s={[0.15,0.012,0.004]} c="#9a948a"/></group>},
  // 건물 점원: orange work vest with yellow bands, a yellow hard hat, a tool belt, a hammer and a little house
  builder:{tint:{primary:'#e08a2e',secondary:'#6b4a2a',accent:'#f1e05a'},
    hat:<group position-y={-0.1}><mesh scale={[1.08,0.72,1.12]} position-z={0.02}><sphereGeometry args={[0.36,20,14]}/><primitive object={soft('#f2c230')} attach="material"/></mesh>
      <C p={[0,-0.02,0.04]} a={[0.42,0.42,0.025]} c="#f2c230" seg={24} flat/></group>,
    body:<group><Band y={0.28} c="#f1e05a" w={0.022} rx={0.29}/><Band y={0.14} c="#f1e05a" w={0.022} rx={0.3}/><Band y={-0.03} c="#6b4a2a" w={0.03} rx={0.27} rz={0.23}/>
      <B p={[-0.12,-0.08,0.22]} s={[0.05,0.1,0.04]} c="#9aa3ab"/></group>,
    handR:<group rotation-x={0.5}><C p={[0,0.12,0]} a={[0.02,0.02,0.34]} c="#8a6a3a"/><B p={[0,0.3,0.02]} s={[0.07,0.07,0.17]} c="#6b7480"/></group>,
    handL:<group position={[0,0.02,0.08]}><B p={[0,0,0]} s={[0.17,0.13,0.15]} c="#f3e6cc"/><mesh position={[0,0.12,0]} rotation-y={Math.PI/4} castShadow><coneGeometry args={[0.15,0.12,4]}/>{M('#c44b3b')}</mesh><B p={[0,-0.02,0.077]} s={[0.05,0.08,0.01]} c="#8a5a2a"/></group>},
  // 옷 점원: pink apron, black beret with a pin, a tape measure round the neck, a hanger with a shirt, a pin cushion
  tailor:{tint:{primary:'#d46a8c',secondary:'#f3d0dc',accent:'#f2d36a'},
    hat:<group position-y={-0.04}><Ball p={[0.03,0.02,0]} r={0.3} c="#2b2620" s={[1.05,0.32,1.05]}/><Ball p={[0.03,0.1,0]} r={0.035} c="#2b2620"/><Ball p={[0.24,0.05,0.12]} r={0.05} c="#f3d0dc"/></group>,
    body:<group><B p={[0,0.08,0.235]} s={[0.3,0.34,0.03]} c="#f3d0dc"/><B p={[-0.1,0.3,0.205]} s={[0.035,0.14,0.03]} r={[-0.3,0,0.1]} c="#f2d36a"/><B p={[0.1,0.3,0.205]} s={[0.035,0.14,0.03]} r={[-0.3,0,-0.1]} c="#f2d36a"/></group>,
    handR:<group position={[0,0.05,0.06]}><mesh position-y={0.2} rotation-x={Math.PI/2}><torusGeometry args={[0.035,0.008,6,16,Math.PI*1.4]}/>{M('#777')}</mesh>
      <B p={[0,0.15,0]} s={[0.32,0.02,0.02]} c="#777"/><B p={[0,0.0,0]} s={[0.26,0.28,0.04]} c="#6aa6d8"/><B p={[-0.17,0.08,0]} s={[0.08,0.1,0.04]} r={[0,0,0.5]} c="#6aa6d8"/><B p={[0.17,0.08,0]} s={[0.08,0.1,0.04]} r={[0,0,-0.5]} c="#6aa6d8"/></group>,
    handL:<group position={[0,0.06,0]}><Ball p={[0,0,0]} r={0.07} c="#c44b3b"/><C p={[0.02,0.08,0]} a={[0.005,0.005,0.07]} c="#ccc"/><C p={[-0.03,0.07,0.02]} a={[0.005,0.005,0.07]} c="#ccc" r={[0,0,0.4]}/></group>},
  // 사서: green cardigan, round glasses, the journal book held open in front
  librarian:{tint:{primary:'#4f6b5a',secondary:'#d9cfa8',accent:'#c9a23a'},
    head:<group position={[0,0.31,0.3]}><mesh position-x={-0.11}><torusGeometry args={[0.075,0.014,8,24]}/>{M('#3a3128')}</mesh><mesh position-x={0.11}><torusGeometry args={[0.075,0.014,8,24]}/>{M('#3a3128')}</mesh>
      <B p={[0,0.01,0]} s={[0.07,0.016,0.016]} c="#3a3128"/></group>,
    body:<group position={[0,0.12,0.31]} rotation-x={-0.35}><B p={[-0.1,0,0]} s={[0.19,0.26,0.025]} r={[0,0.25,0]} c="#8a3a3a"/><B p={[0.1,0,0]} s={[0.19,0.26,0.025]} r={[0,-0.25,0]} c="#8a3a3a"/>
      <B p={[-0.095,0,0.02]} s={[0.17,0.23,0.02]} r={[0,0.25,0]} c="#f3ead3"/><B p={[0.095,0,0.02]} s={[0.17,0.23,0.02]} r={[0,-0.25,0]} c="#f3ead3"/><B p={[0.02,-0.15,0.02]} s={[0.025,0.12,0.005]} c="#c9a23a"/></group>},
  // 거장의 집 · 버핏 (피드백 2026-11-24 "흰머리 얘 우리 ui에 맞게"): the village figure in a navy suit, white shirt and red
  // tie, thin white hair round the back and sides, heavy white brows and round glasses
  master:{tint:{primary:'#2f3a52',secondary:'#f2efe6',accent:'#2a3348'},
    hat:<group position-y={-0.13}><Ball p={[0,0,-0.07]} r={0.31} c="#efeee8" s={[1.06,0.5,1.0]}/>
      <Ball p={[-0.27,-0.1,-0.02]} r={0.09} c="#efeee8" s={[0.8,1.1,1.2]}/><Ball p={[0.27,-0.1,-0.02]} r={0.09} c="#efeee8" s={[0.8,1.1,1.2]}/></group>,
    head:<group position={[0,0.31,0.3]}><mesh position-x={-0.11}><torusGeometry args={[0.078,0.016,8,24]}/>{M('#2a2622')}</mesh><mesh position-x={0.11}><torusGeometry args={[0.078,0.016,8,24]}/>{M('#2a2622')}</mesh>
      <B p={[0,0.01,0]} s={[0.07,0.018,0.016]} c="#2a2622"/>
      <B p={[-0.11,0.11,-0.01]} s={[0.12,0.035,0.03]} r={[0,0,0.12]} c="#efeee8"/><B p={[0.11,0.11,-0.01]} s={[0.12,0.035,0.03]} r={[0,0,-0.12]} c="#efeee8"/></group>,
    body:<group position={[0,0.16,0.27]}><B p={[0,0.02,0.02]} s={[0.16,0.24,0.02]} c="#f2efe6"/><B p={[0,0,0.04]} s={[0.06,0.22,0.02]} c="#b23a3a"/><B p={[0,0.11,0.045]} s={[0.075,0.045,0.025]} c="#9a2f2f"/></group>},
};
// what they wear from the wardrobe beside the kit (the kit's own hat and things replace the rest)
export const ROLE_LOOK:Record<string,{coat:string;hat:string|null}>={
  farmer:{coat:'coat_vest',hat:'hat_straw'},merchant:{coat:'coat_knit',hat:'hat_beret'},paperboy:{coat:'coat_vest',hat:null},
  builder:{coat:'coat_vest',hat:null},tailor:{coat:'coat_knit',hat:null},librarian:{coat:'coat_knit',hat:null},master:{coat:'coat_knit',hat:null},
};
