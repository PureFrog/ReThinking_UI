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
import type {AnalystId} from '../content/analysts';

export type AnalystSpot={x:number;z:number};
type Props={id:AnalystId;to:AnalystSpot;from?:AnalystSpot|null;face:React.MutableRefObject<THREE.Vector3>;surface:(x:number,z:number)=>number;tilt:(x:number,z:number)=>THREE.Quaternion;
  bubble:{text:string;alert:boolean}|null;onPick:()=>void;report:(id:AnalystId,v:THREE.Vector3)=>void};
const SPEED=2.2;
const eyeMat=new THREE.MeshStandardMaterial({color:'#1d1f24',roughness:0.3});

export function Analyst({id,to,from,face,surface,tilt,bubble,onPick,report}:Props){
  const {scene}=useGLTF(MODELS.analyst(id));
  const model=useMemo(()=>{const root=scene.clone(true);
    root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
      const src=m.material as THREE.MeshStandardMaterial;
      m.material=src.name==='eye'||src.name==='frame'||src.name==='brow'?eyeMat:soft('#'+src.color.getHexString(THREE.SRGBColorSpace))});
    return root},[scene]);
  const parts=useMemo(()=>{const get=(n:string)=>model.getObjectByName(n)??null;
    return {body:get('body'),head:get('head'),armL:get('arm_l'),armR:get('arm_r'),eyes:[get('eye_l'),get('eye_r')].filter(Boolean) as THREE.Object3D[],
      rest:{armL:get('arm_l')?.rotation.clone(),armR:get('arm_r')?.rotation.clone(),eyeY:get('eye_l')?.scale.y??1}}},[model]);
  const g=useRef<THREE.Group>(null),turn=useRef<THREE.Group>(null);
  const pos=useRef(new THREE.Vector3((from??to).x,0,(from??to).z)),heading=useRef(0),blink=useRef(2+Math.random()*3);
  const v=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{if(g.current)g.current.name=`analyst-${id}`},[id]);
  useFrame(({clock},dt)=>{const gr=g.current,tr=turn.current;if(!gr||!tr)return;const t=clock.elapsedTime,d=Math.min(dt,0.05),p=pos.current;
    const dx=to.x-p.x,dz=to.z-p.z,dist=Math.hypot(dx,dz),moving=dist>0.05;
    if(moving){const step=Math.min(dist,SPEED*d);p.x+=dx/dist*step;p.z+=dz/dist*step;heading.current=Math.atan2(dx,dz)}
    else{// face the player when standing
      heading.current=THREE.MathUtils.lerp(heading.current,Math.atan2(face.current.x-p.x,face.current.z-p.z),0.04)}
    gr.position.set(p.x,surface(p.x,p.z),p.z);gr.quaternion.copy(tilt(p.x,p.z));
    tr.rotation.y=THREE.MathUtils.lerp(tr.rotation.y,heading.current,moving?0.2:1);
    const {body,head,armL,armR,eyes,rest}=parts;
    if(body){body.position.y=0.42+(moving?Math.abs(Math.sin(t*9))*0.08:Math.sin(t*2+id.length)*0.012);body.rotation.z=moving?Math.sin(t*9)*0.06:0}
    if(head){head.rotation.x=bubble?.alert?Math.sin(t*3)*0.06-0.05:Math.sin(t*0.7)*0.04;head.rotation.y=moving?0:Math.sin(t*0.4+id.length)*0.25}
    const swing=moving?Math.sin(t*9)*0.6:Math.sin(t*1.6)*0.05;
    if(armL&&rest.armL)armL.rotation.x=rest.armL.x+swing;
    if(armR&&rest.armR)armR.rotation.x=rest.armR.x-swing+(bubble?.alert&&!moving&&id==='tori'?-0.5:0);
    // blink every few seconds
    blink.current-=d;const shut=blink.current<0.12;if(blink.current<0)blink.current=2.5+Math.random()*3;
    for(const e of eyes)e.scale.y=rest.eyeY*(shut?0.15:1);
    v.set(p.x,surface(p.x,p.z)+2.3,p.z);report(id,v)});
  return <group ref={g}>
    <group ref={turn} onClick={e=>{e.stopPropagation();onPick()}} scale={1.45}><primitive object={model}/></group>
  </group>;
}
(['tori','moa','luon'] as AnalystId[]).forEach(a=>useGLTF.preload(MODELS.analyst(a)));
