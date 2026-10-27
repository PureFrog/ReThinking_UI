import type * as Phaser from 'phaser';
export function burst(scene:Phaser.Scene,x:number,y:number){for(let i=0;i<8;i++){const star=scene.add.star(x,y,4,2,5,0xf6d385).setDepth(999);scene.tweens.add({targets:star,x:x+(Math.random()-.5)*95,y:y-35-Math.random()*45,alpha:0,duration:900,onComplete:()=>star.destroy()})}}
