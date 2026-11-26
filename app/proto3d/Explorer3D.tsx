'use client';
// The player's observer (tools/blender/explorer.py): the figure plus what it wears (core/wardrobe.ts), put on the
// figure's sockets (hat on the head, bag on the back, tool in the right hand, coat over the body), tinted from the
// colour set by material name (primary, secondary, accent) and drawn with the shared soft material. Animation is code
// on the named pivots: walking bob and arm swing, breathing, blinking, and an act for the stage (a twirl, a look).
import {useEffect,useMemo,useRef} from 'react';
import {useFrame,createPortal} from '@react-three/fiber';
import type {Kit} from './RoleKit';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {soft} from './materials';
import {MODELS} from './models';
import {PALETTES,WEAR,type Look} from '../core/wardrobe';

const eyeMat=new THREE.MeshStandardMaterial({color:'#1d1f24',roughness:0.3});
const glow=new THREE.MeshStandardMaterial({color:'#fff1c4',emissive:'#ffc867',emissiveIntensity:1.8,toneMapped:false});
const glass=new THREE.MeshStandardMaterial({color:'#dff3ff',transparent:true,opacity:0.55,roughness:0.05});
// the soft material for a model's material, with the colour set applied to the tintable ones
function dress(root:THREE.Object3D,pal:{primary:string;secondary:string;accent:string},coat?:THREE.Object3D|null,hair?:string){
  // no shadows received on the figure (2026-11-23): the wide hat brim under a high sun darkened the whole face and body
  root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=false;
    const src=m.material as THREE.MeshStandardMaterial,n=src.name.replace(/\.\d+$/,'');
    m.material=n==='hair'&&hair?soft(hair):n==='eye'?eyeMat:n==='lamp'?glow:n==='glass'?glass:
      n==='primary'?soft(coat?coatColor(coat,pal):pal.primary):n==='secondary'?soft(pal.secondary):n==='accent'?soft(pal.accent):soft('#'+src.color.getHexString(THREE.SRGBColorSpace))});
}
// sleeves match the coat when one is worn: its own primary colour (a white lab coat keeps white sleeves)
const coatColors=new WeakMap<THREE.Object3D,string>();
function coatColor(coat:THREE.Object3D,pal:{primary:string}){return coatColors.get(coat)??pal.primary}

export type ExplorerAct='idle'|'walk'|'look'|'twirl';
// sitting on the log by the fire (sit): the thighs come forward, the shins hang down, the hands rest on the knees
const SIT_POSE:[RegExp,number,number,number][]=[[/^leg_b/,-0.06,0.07,-Math.PI/2],[/^leg_a/,-0.17,0.25,0],[/^leg(\.|$)/,-0.07,0.17,-Math.PI/2],[/^boot/,-0.29,0.27,0]];
// kit (RoleKit.tsx): a villager's own colours and the things put on the sockets (hat, head, body, both hands)
// hair: another hair colour (거장의 집's Buffett is white haired); seated: the legs and boots are left off (a chair's
// own thighs and shoes stand in for them)
// wish (피드백 2026-11-26 별똥별): hands together in front of the chest, head bowed a little, eyes shut
export function Explorer({look,act='idle',moving,kit,hair,seated,sit,wish}:{sit?:React.MutableRefObject<boolean>;wish?:React.MutableRefObject<boolean>;look:Look;act?:ExplorerAct;moving?:React.MutableRefObject<boolean>;kit?:Kit;hair?:string;seated?:boolean}){
  const pal0=PALETTES.find(p=>p.id===look.palette)??PALETTES[0],pal=kit?.tint?{...pal0,id:pal0.id+':'+kit.tint.primary,...kit.tint}:pal0;
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
    dress(root,pal,coat,hair);
    if(seated)root.traverse(o=>{if(/^(leg|boot)/.test(o.name))o.visible=false});
    // the left hand has no socket of its own: one where the right one is, mirrored
    const al=get('arm_l');if(al&&!al.getObjectByName('hand_lk')){const o=new THREE.Object3D();o.name='hand_lk';o.position.set(-0.1,-0.3,0.1);al.add(o)}
    return root},[scene,items,files.join(','),pal.id,hair,seated]);// eslint-disable-line react-hooks/exhaustive-deps
  const parts=useMemo(()=>{const g=(n:string)=>model.getObjectByName(n)??null;
    const legs:{o:THREE.Object3D;p:THREE.Vector3;r:number;to:[number,number,number]}[]=[];
    model.traverse(o=>{const m=SIT_POSE.find(([re])=>re.test(o.name));if(m&&o.parent?.name==='body')legs.push({o,p:o.position.clone(),r:o.rotation.x,to:[m[1],m[2],m[3]]})});
    return {legs,body:g('body'),head:g('head'),armL:g('arm_l'),armR:g('arm_r'),eyes:[g('eye_l'),g('eye_r')].filter(Boolean) as THREE.Object3D[],
      rest:{armL:g('arm_l')?.rotation.clone(),armR:g('arm_r')?.rotation.clone(),headX:g('head')?.rotation.x??0,side:{l:Math.sign(g('arm_l')?.position.x??1)||1,r:Math.sign(g('arm_r')?.position.x??-1)||-1},body:g('body')?.position.y??0,eye:g('eye_l')?.scale.y??1}}},[model]);
  const blink=useRef(2),spin=useRef<THREE.Group>(null),sat=useRef(0),wished=useRef(0);
  useEffect(()=>()=>{model.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh&&m.geometry&&m.geometry.userData.owned)m.geometry.dispose()})},[model]);
  useFrame(({clock},dt)=>{const t=clock.elapsedTime,{body,head,armL,armR,eyes,rest,legs}=parts,walking=act==='walk'||!!moving?.current;
    // sitting down: a little hop up and onto the seat, legs folding; then a slow happy sway by the fire
    const k0=sat.current,k=sat.current=THREE.MathUtils.clamp(k0+(sit?.current?1:-1)*Math.min(dt,0.05)*3.2,0,1);
    const hop=k>0&&k<1&&sit?.current?Math.sin(k*Math.PI)*0.14:0;
    for(const l of legs){l.o.position.y=THREE.MathUtils.lerp(l.p.y,l.to[0],k);l.o.position.z=THREE.MathUtils.lerp(l.p.z,l.to[1],k);l.o.rotation.x=THREE.MathUtils.lerp(l.r,l.to[2],k)}
    if(body){body.position.y=rest.body+hop+(walking?Math.abs(Math.sin(t*10))*0.06:Math.sin(t*2)*0.012);body.rotation.z=walking?Math.sin(t*10)*0.05:Math.sin(t*1.3)*0.05*k}
    const wk=wished.current=THREE.MathUtils.clamp(wished.current+(wish?.current?1:-1)*Math.min(dt,0.05)*5,0,1);
    const swing=walking?Math.sin(t*10)*0.7:Math.sin(t*1.6)*0.05*(1-k)-0.55*k;
    if(armL&&rest.armL){armL.rotation.x=THREE.MathUtils.lerp(rest.armL.x+swing,rest.armL.x-1.15,wk);armL.rotation.z=rest.armL.z-rest.side.l*0.42*wk}
    // the stage: holding the tool up to look through it, now and then
    const lookUp=act==='look'?Math.max(0,Math.sin(t*0.7))*-1.4:0;
    if(armR&&rest.armR){armR.rotation.x=THREE.MathUtils.lerp(rest.armR.x+(k>0.01?swing:-swing)+lookUp,rest.armR.x-1.15,wk);armR.rotation.z=rest.armR.z-rest.side.r*0.42*wk}
    if(head){head.rotation.y=walking?0:act==='look'?Math.sin(t*0.5)*0.35:Math.sin(t*0.4)*0.2*(1-wk);head.rotation.x=rest.headX+0.22*wk}
    if(spin.current)spin.current.rotation.y=act==='twirl'?spin.current.rotation.y+Math.min(dt,0.05)*9:THREE.MathUtils.lerp(spin.current.rotation.y,0,0.08);
    blink.current-=Math.min(dt,0.05);const shut=blink.current<0.12;if(blink.current<0)blink.current=2.5+Math.random()*3;
    for(const e of eyes)e.scale.y=rest.eye*(shut||wk>0.6?0.15:1)});
  const sock=(n:string)=>model.getObjectByName(n)??null;
  const put=(node:React.ReactNode,n:string)=>{const at=node?sock(n):null;return at?createPortal(<>{node}</>,at):null};
  return <group ref={spin}><primitive object={model}/>{kit&&<>{put(kit.hat,'hat')}{put(kit.head,'head')}{put(kit.body,'body')}{put(kit.handR,'hand')}{put(kit.handL,'hand_lk')}</>}</group>;
}
useGLTF.preload(MODELS.explorer);
