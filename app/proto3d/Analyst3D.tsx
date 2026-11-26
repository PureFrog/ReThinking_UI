'use client';
// R3 the analysts in the world (models from tools/blender/analysts.py). Each one walks to the tree its model flagged
// and waits there with a bubble; with nothing flagged they hang around the campfire. Animation is code on the named
// pivots (body, head, arm_l, arm_r, eye_l, eye_r): breathing, walking bob and arm swing, blinking, looking at the player.
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from './materials';
import {MODELS} from './models';
import {route,npcStep,NPC_FIRE_SEATS,NPC_LIVE,npcAround} from './places';
import {surfaceY} from './ground';
import {LOOK} from './look';
import type {AnalystId} from '../content/analysts';

export type AnalystSpot={x:number;z:number};
// act: what they do where their day has them (core/routine.ts) · faceTo: which way they look while doing it
// id: an analyst, or 'bori' the guinea pig friend (core/friend.ts), who walks and blinks the same way
// mood: the face to wear (보리 only so far: x_<emotion>_ pieces in its model, tools/blender/analysts.py bori_faces) and
// the gesture that goes with it
type Props={mood?:string;id:AnalystId|'bori'|'naru';to:AnalystSpot;from?:AnalystSpot|null;act?:string;faceTo?:number;face:React.MutableRefObject<THREE.Vector3>;surface:(x:number,z:number)=>number;tilt:(x:number,z:number)=>THREE.Quaternion;
  bubble:{text:string;alert:boolean}|null;onPick:()=>void;report:(id:string,v:THREE.Vector3)=>void};
const SPEED=2.2;
const eyeMat=new THREE.MeshStandardMaterial({color:'#1d1f24',roughness:0.3});

// 피드백 2026-11-24 "웃는 표정일 때 보리 눈 한쪽이 사라져": 보리's brown patch sat over its right eye, so the closed-eye
// arcs (and the other line eyes) sank into it; the patch moves out to the side of the head, off the eye
export function fixBoriPatch(root:THREE.Object3D){const p=root.getObjectByName('patch');if(p){p.position.set(0.25,0.42,0.2);p.scale.x=0.11;p.scale.y=0.13}return root}
export function Analyst({id,to,from,act,faceTo,face,surface,tilt,bubble,onPick,report,mood}:Props){
  const {scene}=useGLTF(MODELS.analyst(id));
  const model=useMemo(()=>{const root=scene.clone(true);
    root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
      const src=m.material as THREE.MeshStandardMaterial;
      m.material=src.name==='eye'||src.name==='frame'||src.name==='brow'?eyeMat:soft('#'+src.color.getHexString(THREE.SRGBColorSpace))});
    if(id==='bori')fixBoriPatch(root);
    return root},[scene,id]);
  const parts=useMemo(()=>{const get=(n:string)=>model.getObjectByName(n)??null;
    return {body:get('body'),head:get('head'),armL:get('arm_l'),armR:get('arm_r'),eyes:[get('eye_l'),get('eye_r')].filter(Boolean) as THREE.Object3D[],
      rest:{armL:get('arm_l')?.rotation.clone(),armR:get('arm_r')?.rotation.clone(),eyeY:get('eye_l')?.scale.y??1}}},[model]);
  // the face pieces by emotion, and which emotions bring their own eyes (the round ones hide meanwhile)
  const faces=useMemo(()=>{const by=new Map<string,THREE.Object3D[]>(),eyes=new Set<string>();
    model.traverse(o=>{const m=/^x_([a-z]+)_(.*)$/.exec(o.name);if(!m)return;const e=m[1];if(!by.has(e))by.set(e,[]);by.get(e)!.push(o);if(m[2].startsWith('eye'))eyes.add(e)});
    return {by,eyes}},[model]);
  const cur=faces.by.size?(faces.by.has(mood??'')?mood!:'neutral'):'';
  useEffect(()=>{if(!faces.by.size)return;for(const [e,list] of faces.by)for(const o of list)o.visible=e===cur;
    for(const o of parts.eyes)o.visible=!faces.eyes.has(cur);
    // e2e: the face 보리 shows now
    const w=window as {__proto3d?:{boriFace?:string}};(w.__proto3d??={}).boriFace=cur},[cur,faces,parts]);
  const g=useRef<THREE.Group>(null),turn=useRef<THREE.Group>(null);
  const pos=useRef(new THREE.Vector3((from??to).x,0,(from??to).z)),heading=useRef(0),blink=useRef(2+Math.random()*3);
  const v=useMemo(()=>new THREE.Vector3(),[]),seatK=useRef(0),gaveUp=useRef<string|null>(null);
  const solid=surface===surfaceY;
  useEffect(()=>{if(g.current)g.current.name=`analyst-${id}`},[id]);
  // a new place to go: by the bridge if it is across the stream (places.ts route)
  const stops=useRef<AnalystSpot[]>([]),goal=useRef<AnalystSpot>(to);
  useEffect(()=>{const r=route(pos.current,to,()=>false);stops.current=r?r.slice(1):[];goal.current=r?r[0]:to},[to.x,to.z]);// eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({clock},dt)=>{const gr=g.current,tr=turn.current;if(!gr||!tr)return;const t=clock.elapsedTime,d=Math.min(dt,0.25)/* by time */,p=pos.current;
    let gl=goal.current;if(Math.hypot(gl.x-p.x,gl.z-p.z)<0.05&&stops.current.length){gl=goal.current=stops.current.shift()!}
    const dx=gl.x-p.x,dz=gl.z-p.z,dist=Math.hypot(dx,dz),gk=gl.x.toFixed(2)+','+gl.z.toFixed(2);
    // gave up on this goal (blocked, places.ts npcStep): stand still until the goal changes
    if(gaveUp.current&&gaveUp.current!==gk)gaveUp.current=null;
    const moving=dist>0.05&&!gaveUp.current;
    // 피드백 2026-11-26 "NPC가 나무·바위 통과": in the village they walk round things (places.ts npcStep); rooms are clear
    if(moving){const step=Math.min(dist,SPEED*d),ox=p.x,oz=p.z;
      if(solid){if(!npcStep(p,gl.x,gl.z,step,npcAround(id)))gaveUp.current=gk}else{p.x+=dx/dist*step;p.z+=dz/dist*step}
      // turn smoothly toward the way it walks (no snapping when going round)
      const want=Math.atan2(p.x-ox||dx,p.z-oz||dz);heading.current+=Math.atan2(Math.sin(want-heading.current),Math.cos(want-heading.current))*(1-Math.exp(-d*10))}
    else{// standing: face the way their act points, or the player
      // the short way round, by time (it used to creep 4% a frame, the long way at times: on a slow phone 보리 kept its
      // back to the player for seconds after coming over)
      const want=faceTo!==undefined&&act&&act!=='stand'?faceTo:Math.atan2(face.current.x-p.x,face.current.z-p.z);
      const diff=Math.atan2(Math.sin(want-heading.current),Math.cos(want-heading.current));
      heading.current+=diff*(1-Math.exp(-d*LOOK.analystTurn))}
    // by the fire on a seat (places.ts NPC_FIRE_SEATS), not talking: sits down facing the fire, hands out to its warmth
    const fs=solid&&!moving&&!mood?NPC_FIRE_SEATS.find(q=>Math.hypot(q.x-p.x,q.z-p.z)<0.2):undefined;
    seatK.current+=((fs?1:0)-seatK.current)*(1-Math.exp(-d*6));const sk=seatK.current;
    if(fs)heading.current+=Math.atan2(Math.sin(fs.face-heading.current),Math.cos(fs.face-heading.current))*(1-Math.exp(-d*5));
    if(solid)NPC_LIVE[id]={x:p.x,z:p.z};
    gr.position.set(p.x,surface(p.x,p.z)+sk*0.24,p.z);gr.quaternion.copy(tilt(p.x,p.z));
    tr.rotation.y=THREE.MathUtils.lerp(tr.rotation.y,heading.current,moving?0.2:1);
    const {body,head,armL,armR,eyes,rest}=parts;
    // the gesture that goes with the face (보리 talking): a tilt when curious, a hop when happy, a slow sway when tired
    const hop=!moving&&cur==='happy'?Math.abs(Math.sin(t*6))*0.05:0,sway=!moving&&cur==='tired'?Math.sin(t*0.8)*0.06:0;
    if(body){body.position.y=0.42+hop+(moving?Math.abs(Math.sin(t*9))*0.08:Math.sin(t*2+id.length)*0.012);body.rotation.z=moving?Math.sin(t*9)*0.06:sway}
    // what they do at their spot (core/routine.ts Act), only while standing there
    const doing=moving?'':act??'';
    const headDown=doing==='read'||doing==='note'?0.32:doing==='scope'?-0.25:0;
    const moodDown=cur==='concerned'?0.18:cur==='tired'?0.14:cur==='thinking'?-0.12:0;
    const moodTilt=moving?0:cur==='curious'?0.24:cur==='thinking'?-0.14:cur==='playful'?Math.sin(t*3)*0.12:cur==='concerned'?0.08:0;
    // talking (a face is on): it looks at the player instead of round about
    const talking=!!cur&&cur!=='';
    if(head){head.rotation.x=headDown+moodDown+(bubble?.alert?Math.sin(t*3)*0.06-0.05:Math.sin(t*0.7)*0.04);
      head.rotation.y=moving?0:talking&&mood?Math.sin(t*0.5)*0.08:doing==='look'?Math.sin(t*0.45+id.length)*0.6:Math.sin(t*0.4+id.length)*0.25;
      head.rotation.z+=(moodTilt-head.rotation.z)*(1-Math.exp(-d*8))}
    const swing=moving?Math.sin(t*9)*0.6:Math.sin(t*1.6)*0.05;
    const l=doing==='read'?-0.7:doing==='scope'?-1.7:doing==='arms'?-0.55:0,r=doing==='read'?-0.7:doing==='board'?-1.25+Math.sin(t*1.3)*0.15:doing==='note'?-0.8+Math.sin(t*6)*0.08:doing==='arms'?-0.55:0;
    if(armL&&rest.armL){armL.rotation.x=rest.armL.x+swing+l-seatK.current*0.9;armL.rotation.z=(rest.armL.z??0)+(doing==='arms'?0.6:0)}
    if(armR&&rest.armR){armR.rotation.x=rest.armR.x-swing+r-seatK.current*0.9+(bubble?.alert&&!moving&&id==='tori'?-0.5:0)+(!moving&&cur==='thinking'?-1.9:!moving&&cur==='happy'?-0.6+Math.sin(t*6)*0.2:0);armR.rotation.z=(rest.armR.z??0)+(doing==='arms'?-0.6:0)}
    // blink every few seconds
    blink.current-=d;const shut=blink.current<0.12;if(blink.current<0)blink.current=2.5+Math.random()*3;
    for(const e of eyes)e.scale.y=rest.eyeY*(shut?0.15:1);
    v.set(p.x,surface(p.x,p.z)+2.3,p.z);report(id,v)});
  return <group ref={g}>
    <group ref={turn} onClick={e=>{e.stopPropagation();onPick()}} scale={1.45}><primitive object={model}/></group>
  </group>;
}
(['tori','moa','luon','bori','naru'] as const).forEach(a=>useGLTF.preload(MODELS.analyst(a)));
