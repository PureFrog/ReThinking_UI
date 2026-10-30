import type * as Phaser from 'phaser';
import {EFFECT_IMAGES} from '../assets';
export function burst(scene:Phaser.Scene,x:number,y:number){for(let i=0;i<8;i++){const star=scene.add.star(x,y,4,2,5,0xf6d385).setDepth(999);scene.tweens.add({targets:star,x:x+(Math.random()-.5)*95,y:y-35-Math.random()*45,alpha:0,duration:900,onComplete:()=>star.destroy()})}}

export type Feeling='happy'|'surprised'|'sad';
type Fx=keyof typeof EFFECT_IMAGES;
// Feeling effects above a head at (0,top) inside the actor's container, so they follow it.
// Pieces are 003 sheet B art; a missing texture falls back to a simple shape of the same size.
export function feelingEffect(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,top:number,kind:Feeling,duration:number){
 const fx=scene.add.container(0,top);parent.add(fx);
 const piece=(name:Fx,x:number,y:number,size:number,color:number):Phaser.GameObjects.Image|Phaser.GameObjects.Arc=>{const key=EFFECT_IMAGES[name].key;const o=scene.textures.exists(key)?scene.add.image(x,y,key).setDisplaySize(size,size):scene.add.circle(x,y,size/5,color);fx.add(o);return o};
 const fadeOut=(targets:object|object[],lead=320)=>scene.tweens.add({targets,alpha:0,delay:duration-lead,duration:lead-20});
 if(kind==='happy'){
  // 짜잔: the fan of strokes pops up, sparkles fly outward
  const lines=piece('happyLines',0,2,84,0xf2c35b);const sx=lines.scaleX,sy=lines.scaleY;lines.setScale(sx*.4,sy*.4);scene.tweens.add({targets:lines,scaleX:sx,scaleY:sy,duration:220,ease:'Back.Out'});scene.tweens.add({targets:lines,alpha:0,delay:650,duration:300});
  for(let i=0;i<5;i++){const a=-Math.PI*(.15+i*.175);const st=piece('sparkle',0,8,i%2?16:22,0xf6d385);const k=st.scaleX;st.setScale(k*.3);scene.tweens.add({targets:st,x:Math.cos(a)*58,y:8+Math.sin(a)*58,scale:k,angle:45,duration:420,ease:'Quad.Out'});fadeOut(st,450)}
 }else if(kind==='surprised'){
  const bang=piece('bang',28,-10,34,0xd9735b);const k=bang.scaleX;bang.setScale(0);scene.tweens.add({targets:bang,scale:k,duration:200,ease:'Back.Out'});
  const lines=piece('surpriseLines',-30,4,26,0xd9735b);fadeOut([bang,lines],300);
 }else{
  // 시무룩: a little cloud with falling drops
  const cloud=piece('cloud',2,-6,50,0xa9b6c4).setAlpha(0);scene.tweens.add({targets:cloud,alpha:1,y:-2,duration:300});
  for(let i=0;i<3;i++){const d=piece('drop',-11+i*11,12,11,0x7f9fc0).setAlpha(0);scene.tweens.add({targets:d,y:34,alpha:{from:1,to:0},delay:250+i*180,duration:520,repeat:Math.max(0,Math.floor((duration-900)/700))})}
  fadeOut(cloud);
 }
 scene.time.delayedCall(duration,()=>fx.destroy());return fx;
}
