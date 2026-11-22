'use client';
// The player's observer (tools/blender/explorer.py): the figure plus what it wears (core/wardrobe.ts), put on the
// figure's sockets (hat on the head, bag on the back, tool in the right hand, coat over the body), tinted from the
// colour set by material name (primary, secondary, accent) and drawn with the shared soft material. Animation is code
// on the named pivots: walking bob and arm swing, breathing, blinking, and an act for the stage (a twirl, a look).
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from './materials';
import {MODELS} from './models';
import {PALETTES,WEAR,type Look} from '../core/wardrobe';

const eyeMat=new THREE.MeshStandardMaterial({color:'#1d1f24',roughness:0.3});
const glow=new THREE.MeshStandardMaterial({color:'#fff1c4',emissive:'#ffc867',emissiveIntensity:1.8,toneMapped:false});
const glass=new THREE.MeshStandardMaterial({color:'#dff3ff',transparent:true,opacity:0.55,roughness:0.05});
// the soft material for a model's material, with the colour set applied to the tintable ones
function dress(root:THREE.Object3D,pal:{primary:string;secondary:string;accent:string},coat?:THREE.Object3D|null){
  root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
    const src=m.material as THREE.MeshStandardMaterial,n=src.name.replace(/\.\d+$/,'');
    m.material=n==='eye'?eyeMat:n==='lamp'?glow:n==='glass'?glass:
      n==='primary'?soft(coat?coatColor(coat,pal):pal.primary):n==='secondary'?soft(pal.secondary):n==='accent'?soft(pal.accent):soft('#'+src.color.getHexString(THREE.SRGBColorSpace))});
}
// sleeves match the coat when one is worn: its own primary colour (a white lab coat keeps white sleeves)
const coatColors=new WeakMap<THREE.Object3D,string>();
function coatColor(coat:THREE.Object3D,pal:{primary:string}){return coatColors.get(coat)??pal.primary}

export type ExplorerAct='idle'|'walk'|'look'|'twirl';
export function Explorer({look,act='idle',moving}:{look:Look;act?:ExplorerAct;moving?:React.MutableRefObject<boolean>}){
  const pal=PALETTES.find(p=>p.id===look.palette)??PALETTES[0];
  const files=[look.coat,look.hat,look.bag,look.tool].filter(Boolean) as string[];
  const {scene}=useGLTF(MODELS.explorer);
  const items=useGLTF(files.map(f=>MODELS.wear(f)));
  const model=useMemo(()=>{
    const root=scene.clone(true),get=(n:string)=>root.getObjectByName(n);
    // a worn coat colours the sleeves: the lab coat and the raincoat keep their own colour, the others follow the set
    const coatFile=files.findIndex(f=>f.startsWith('coat_'));let coat:THREE.Object3D|null=null;
    files.forEach((f,i)=>{const w=WEAR.find(x=>x.id===f);if(!w)return;const part=(Array.isArray(items)?items[i]:items).scene.clone(true);
      const at=get(w.slot==='coat'?'body':w.slot==='hat'?'hat':w.slot==='bag'?'back':'hand');if(!at)return;
      if(i===coatFile){coat=part;coatColors.set(part,f==='coat_lab'?'#f4f1e8':f==='coat_rain'?'#e6b93a':pal.primary)}
      dress(part,pal);at.add(part)});
    dress(root,pal,coat);
    return root},[scene,items,files.join(','),pal.id]);// eslint-disable-line react-hooks/exhaustive-deps
  const parts=useMemo(()=>{const g=(n:string)=>model.getObjectByName(n)??null;
    return {body:g('body'),head:g('head'),armL:g('arm_l'),armR:g('arm_r'),eyes:[g('eye_l'),g('eye_r')].filter(Boolean) as THREE.Object3D[],
      rest:{armL:g('arm_l')?.rotation.clone(),armR:g('arm_r')?.rotation.clone(),body:g('body')?.position.y??0,eye:g('eye_l')?.scale.y??1}}},[model]);
  const blink=useRef(2),spin=useRef<THREE.Group>(null);
  useEffect(()=>()=>{model.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh&&m.geometry&&m.geometry.userData.owned)m.geometry.dispose()})},[model]);
  useFrame(({clock},dt)=>{const t=clock.elapsedTime,{body,head,armL,armR,eyes,rest}=parts,walking=act==='walk'||!!moving?.current;
    if(body){body.position.y=rest.body+(walking?Math.abs(Math.sin(t*10))*0.06:Math.sin(t*2)*0.012);body.rotation.z=walking?Math.sin(t*10)*0.05:0}
    const swing=walking?Math.sin(t*10)*0.7:Math.sin(t*1.6)*0.05;
    if(armL&&rest.armL)armL.rotation.x=rest.armL.x+swing;
    // the stage: holding the tool up to look through it, now and then
    const lookUp=act==='look'?Math.max(0,Math.sin(t*0.7))*-1.4:0;
    if(armR&&rest.armR)armR.rotation.x=rest.armR.x-swing+lookUp;
    if(head)head.rotation.y=walking?0:act==='look'?Math.sin(t*0.5)*0.35:Math.sin(t*0.4)*0.2;
    if(spin.current)spin.current.rotation.y=act==='twirl'?spin.current.rotation.y+Math.min(dt,0.05)*9:THREE.MathUtils.lerp(spin.current.rotation.y,0,0.08);
    blink.current-=Math.min(dt,0.05);const shut=blink.current<0.12;if(blink.current<0)blink.current=2.5+Math.random()*3;
    for(const e of eyes)e.scale.y=rest.eye*(shut?0.15:1)});
  return <group ref={spin}><primitive object={model}/></group>;
}
useGLTF.preload(MODELS.explorer);
