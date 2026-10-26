import * as Phaser from 'phaser';
export const bus = new EventTarget();
export const emit=(type:string,detail?:any)=>bus.dispatchEvent(new CustomEvent(type,{detail}));
export type Holding={id:number;name:string;kind:number;price:number;quantity:number;date:string;rate:number;plot:number};
const iso=(x:number,y:number)=>({x:550+(x-y)*43,y:235+(x+y)*21.5});
export class GardenScene extends Phaser.Scene{
 chars:Phaser.GameObjects.Container[]=[]; trees:Phaser.GameObjects.Container[]=[]; decor:Phaser.GameObjects.Container[]=[]; plots:Phaser.GameObjects.Container[]=[]; holdings:Holding[]=[]; selected=''; listeners: [string,EventListener][]=[]; zoom=1; night=false;
 constructor(){super('garden')}
 preload(){this.load.image('atlas','/assets/garden-atlas.png')}
 create(){
  const tex=this.textures.get('atlas');for(let i=0;i<6;i++)tex.add('item'+i,0,(i%3)*512,Math.floor(i/3)*512,512,512);
  this.cameras.main.setBackgroundColor('#edf1e5');
  this.add.ellipse(550,543,865,270,0x819576,.10);
  for(let x=0;x<13;x++)for(let y=0;y<11;y++){
   const p=iso(x,y);const g=this.add.graphics();
   if(x===12||y===10){g.fillStyle(0xadc390).fillPoints([{x:p.x,y:p.y},{x:p.x+43,y:p.y+21},{x:p.x,y:p.y+44},{x:p.x-43,y:p.y+21}],true)}
   g.fillStyle((x+y)%3===0?0xc6d8ab:0xcdddaf).fillPoints([{x:p.x,y:p.y-21},{x:p.x+43,y:p.y},{x:p.x,y:p.y+21},{x:p.x-43,y:p.y}],true);
   if(x>5||y>5){g.fillStyle(0xb3c99b,.5);for(let a=0;a<3;a++)g.fillCircle(p.x-20+a*17,p.y+(a%2)*6,1.5)}
  }
  // House floor and two open cutaway walls
  const house=this.add.graphics();const p0=iso(0,0),pr=iso(5.8,0),pl=iso(0,5.6);
  house.fillStyle(0xd6c2a3).fillPoints([{x:p0.x,y:p0.y-10},{x:pr.x,y:pr.y-10},{x:iso(5.8,5.6).x,y:iso(5.8,5.6).y-10},{x:pl.x,y:pl.y-10}],true);
  for(let x=0;x<6;x++)for(let y=0;y<6;y++){const p=iso(x,y);house.lineStyle(1,0xbda888,.55).strokePoints([{x:p.x,y:p.y-28},{x:p.x+42,y:p.y-7},{x:p.x,y:p.y+14},{x:p.x-42,y:p.y-7}],true)}
  house.fillStyle(0xebe0c9).fillPoints([{x:p0.x,y:p0.y-155},{x:pl.x,y:pl.y-155},{x:pl.x,y:pl.y-10},{x:p0.x,y:p0.y-10}],true);
  house.fillStyle(0xf7edda).fillPoints([{x:p0.x,y:p0.y-155},{x:pr.x,y:pr.y-155},{x:pr.x,y:pr.y-10},{x:p0.x,y:p0.y-10}],true);
  house.lineStyle(8,0xc6ac83).lineBetween(pl.x,pl.y-155,p0.x,p0.y-155).lineBetween(p0.x,p0.y-155,pr.x,pr.y-155);
  house.lineStyle(5,0xc7b28e).lineBetween(pl.x,pl.y-10,p0.x,p0.y-10).lineBetween(p0.x,p0.y-10,pr.x,pr.y-10);
  // Window on left wall
  const w=iso(0,2.7);house.fillStyle(0xbba47e).fillPoints([{x:w.x-45,y:w.y-114},{x:w.x+44,y:w.y-158},{x:w.x+44,y:w.y-85},{x:w.x-45,y:w.y-41}],true);
  house.fillStyle(0xc0d7d0).fillPoints([{x:w.x-38,y:w.y-111},{x:w.x+37,y:w.y-149},{x:w.x+37,y:w.y-89},{x:w.x-38,y:w.y-51}],true);house.lineStyle(5,0xf7efd9).lineBetween(w.x,w.y-131,w.x,w.y-70).lineBetween(w.x-37,w.y-80,w.x+37,w.y-119);
  // Framed wall art
  const a=iso(3.5,0);house.fillStyle(0x9a825d).fillPoints([{x:a.x-23,y:a.y-120},{x:a.x+23,y:a.y-97},{x:a.x+23,y:a.y-43},{x:a.x-23,y:a.y-66}],true);house.fillStyle(0xe4ead5).fillPoints([{x:a.x-18,y:a.y-112},{x:a.x+18,y:a.y-94},{x:a.x+18,y:a.y-51},{x:a.x-18,y:a.y-69}],true);house.fillStyle(0x88a480).fillEllipse(a.x,a.y-82,19,26);
  const rug=iso(3.3,3.5);this.add.ellipse(rug.x,rug.y-8,188,79,0xd8c4a4).setStrokeStyle(4,0xece0c8);this.add.ellipse(rug.x,rug.y-8,164,64).setStrokeStyle(1,0xbca78c);
  const lamp=iso(.5,4.7);const lg=this.add.graphics().setDepth(lamp.y);lg.fillStyle(0xc5a77f).fillEllipse(lamp.x,lamp.y,29,12).fillRect(lamp.x-2,lamp.y-78,4,77).fillStyle(0xf6e6bc).fillTriangle(lamp.x,lamp.y-100,lamp.x-22,lamp.y-64,lamp.x+22,lamp.y-64).fillStyle(0xffefd0,.12).fillCircle(lamp.x,lamp.y-74,40);
  this.furniture('소파',1.25,3.4,0x8da88f);this.furniture('테이블',3.2,3.3,0xc69c6c);this.furniture('책장',1.25,.6,0xb79a72);this.furniture('화분',4.8,.7,0xb78668);
  // Garden path
  for(let y=5;y<10;y++){const p=iso(5.4,y);this.add.ellipse(p.x,p.y,64,27,0xe8dec6).setStrokeStyle(2,0xd4ceb5)}
  for(let x=6;x<12;x++){const p=iso(x,5.2);this.add.ellipse(p.x,p.y,64,26,0xe8dec6).setStrokeStyle(2,0xd4ceb5)}
  // Small white fences along sides
  for(let y=0;y<=10;y++){const p=iso(12.3,y);this.fence(p.x,p.y,'left')}
  for(let x=0;x<=12;x++){if(x===5||x===6)continue;const p=iso(x,10.3);this.fence(p.x,p.y,'right')}
  for(let i=0;i<6;i++){const pos=this.plotPosition(i);const c=this.add.container(pos.x,pos.y).setDepth(pos.y-35);const g=this.add.graphics();g.fillStyle(0xb69a72).fillPoints([{x:0,y:-27},{x:53,y:0},{x:0,y:34},{x:-53,y:7}],true);g.fillStyle(0xe0c9a5).fillPoints([{x:0,y:-32},{x:53,y:-5},{x:0,y:22},{x:-53,y:-5}],true);g.fillStyle(0x9e835e).fillPoints([{x:0,y:-24},{x:42,y:-4},{x:0,y:15},{x:-42,y:-4}],true);const t=this.add.text(0,-5,'＋',{fontSize:'23px',color:'#f4e5cb'}).setOrigin(.5);c.add([g,t]);c.setSize(100,60).setInteractive({useHandCursor:true}).on('pointerdown',()=>{const h=this.holdings.find(h=>h.plot===i);emit(h?'tree':'plant',h||i);this.particles(pos.x,pos.y)}).on('pointerover',()=>c.setAlpha(.8)).on('pointerout',()=>c.setAlpha(1));this.plots.push(c)}
  // Flower patches
  for(const [x,y] of [[1,8],[2,9],[11,1],[12,7],[.4,7],[11,9]]){const p=iso(x,y);const g=this.add.graphics().setDepth(p.y);g.fillStyle(0x8fab7e).fillEllipse(p.x,p.y,48,18);for(let i=0;i<6;i++){g.fillStyle(i%2?0xf3d7a9:0xe7a99c).fillCircle(p.x-17+(i%3)*16,p.y-7-Math.floor(i/3)*9,5);g.fillStyle(0xffedbd).fillCircle(p.x-17+(i%3)*16,p.y-7-Math.floor(i/3)*9,2)}}
  const mail=iso(6,10);const m=this.add.container(mail.x,mail.y).setDepth(mail.y);const mg=this.add.graphics();mg.fillStyle(0x9d815f).fillRoundedRect(-4,-50,8,55,3).fillStyle(0x688d7b).fillRoundedRect(-21,-70,42,27,8).lineStyle(2,0xe4ead8).strokeRoundedRect(-15,-64,23,15,3).fillStyle(0xdd997e).fillRect(20,-70,16,9);m.add(mg).setSize(65,100).setInteractive({useHandCursor:true}).on('pointerdown',()=>emit('gift'));
  const cp=[[4.6,6.3],[10.7,3.4],[3,6.6]];for(let i=0;i<3;i++){const p=iso(cp[i][0],cp[i][1]);const c=this.add.container(p.x,p.y).setDepth(p.y);const shadow=this.add.ellipse(0,-1,43,15,0x576f48,.16);const im=this.add.image(0,0,'atlas','item'+i).setOrigin(.5,1).setDisplaySize(95,95);const name=this.add.text(0,9,['모아','토리','루온'][i],{fontFamily:'sans-serif',fontSize:'12px',color:'#53644f',backgroundColor:'#fffff0',padding:{x:8,y:4}}).setOrigin(.5,0);c.add([shadow,im,name]).setSize(70,105).setInteractive(new Phaser.Geom.Rectangle(0,-42.5,70,115),Phaser.Geom.Rectangle.Contains).on('pointerdown',()=>{emit('character',i);this.particles(c.x,c.y-60)});this.tweens.add({targets:im,scaleY:im.scaleY*1.025,y:-2,duration:1300+i*180,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});this.chars.push(c);this.time.addEvent({delay:6500+i*1800,loop:true,callback:()=>{const target=iso(cp[i][0]+(Math.random()-.5)*.8,cp[i][1]+(Math.random()-.5)*.8);im.setFlipX(target.x<c.x);this.tweens.add({targets:c,x:target.x,y:target.y,duration:1800,onUpdate:()=>c.setDepth(c.y)});this.tweens.add({targets:im,angle:3,yoyo:true,repeat:5,duration:150,onComplete:()=>im.setAngle(0)})}})}
  this.listen('sync',d=>this.drawHoldings(d));this.listen('decorate',d=>this.placeDecor(d));this.listen('visit',d=>this.visit(d));this.listen('zoom',d=>{this.zoom=Phaser.Math.Clamp(this.zoom+d,.8,1.3);this.cameras.main.setZoom(this.zoom)});this.listen('night',d=>{this.night=d;this.cameras.main.setBackgroundColor(d?'#cbd7d1':'#edf1e5')});this.events.once('shutdown',()=>this.listeners.forEach(([n,f])=>bus.removeEventListener(n,f)));emit('ready');
 }
 listen(n:string,fn:(d:any)=>void){const f=((e:CustomEvent)=>fn(e.detail)) as EventListener;bus.addEventListener(n,f);this.listeners.push([n,f])}
 plotPosition(i:number){return iso(7.6+(i%3)*1.65,6.4+Math.floor(i/3)*2)}
 fence(x:number,y:number,dir:string){const g=this.add.graphics().setDepth(y-5);const s=dir==='left'?1:-1;g.lineStyle(5,0xe8e5cf).lineBetween(x,y-18,x+s*40,y-38).lineBetween(x,y-31,x+s*40,y-51);g.fillStyle(0xf8f5e4).fillRoundedRect(x-4,y-48,9,54,4)}
 cube(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,d:number,h:number,color:number){g.fillStyle(color).fillPoints([{x,y:y-h},{x:x+w,y:y+w*.5-h},{x:x+w-d,y:y+(w+d)*.5-h},{x:x-d,y:y+d*.5-h}],true);g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(15).color).fillPoints([{x:x-d,y:y+d*.5-h},{x:x+w-d,y:y+(w+d)*.5-h},{x:x+w-d,y:y+(w+d)*.5},{x:x-d,y:y+d*.5}],true);g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(25).color).fillPoints([{x:x+w,y:y+w*.5-h},{x:x+w-d,y:y+(w+d)*.5-h},{x:x+w-d,y:y+(w+d)*.5},{x:x+w,y:y+w*.5}],true)}
 furniture(kind:string,x:number,y:number,col:number){const p=iso(x,y);const c=this.add.container(p.x,p.y-15).setDepth(p.y);const g=this.add.graphics();if(kind==='소파'){this.cube(g,0,0,98,39,25,col);this.cube(g,0,-5,98,10,58,col);this.cube(g,-2,0,12,40,40,col);this.cube(g,85,44,12,40,40,col);g.fillStyle(0xd7cda5).fillRoundedRect(18,0,24,18,5)}else if(kind==='책장'){this.cube(g,0,0,68,22,88,col);for(let j=0;j<2;j++)for(let i=0;i<6;i++){g.fillStyle([0x82947b,0xc1836b,0xe0d2ab][i%3]).fillRect(-15+i*9, -55+j*29+i*4.5,7,22)}}else if(kind==='화분'){this.cube(g,0,0,21,21,25,col);g.fillStyle(0x77966c).fillEllipse(0,-30,46,43).fillStyle(0x92aa7a).fillEllipse(-8,-41,27,30)}else if(kind==='러그'){g.fillStyle(col,.8).fillEllipse(0,0,150,66).lineStyle(3,0xe4d7ba).strokeEllipse(0,0,130,50)}else{this.cube(g,0,0,56,40,27,col);g.fillStyle(0xf7efdb).fillEllipse(6,-11,25,12).fillStyle(0xa7b497).fillCircle(6,-15,6)}c.add(g).setSize(100,90).setInteractive({useHandCursor:true}).on('pointerdown',()=>emit('furniture',kind));return c}
 drawHoldings(h:Holding[]){this.holdings=h;this.trees.forEach(t=>t.destroy());this.trees=[];h.forEach(v=>{const p=this.plotPosition(v.plot);const c=this.add.container(p.x,p.y).setDepth(p.y);const days=Math.max(0,(Date.now()-new Date(v.date).getTime())/86400000);const size=days>90?145:days>30?125:106;const im=this.add.image(0,0,'atlas','item'+(v.kind+3)).setOrigin(.5,1).setDisplaySize(size,size);if(v.rate<0)im.setTint(0xc9be8e);const label=this.add.text(0,17,v.name,{fontSize:'11px',color:'#59654f',backgroundColor:'#fcf9ec',padding:{x:8,y:4}}).setOrigin(.5);c.add([im,label]).setSize(105,130).setInteractive(new Phaser.Geom.Rectangle(4.5,-45,96,145),Phaser.Geom.Rectangle.Contains).on('pointerdown',()=>emit('tree',v)).on('pointerover',()=>im.setAlpha(.85)).on('pointerout',()=>im.setAlpha(1));this.tweens.add({targets:im,angle:1,duration:1800+v.id%400,yoyo:true,repeat:-1});this.trees.push(c)});}
 particles(x:number,y:number){for(let i=0;i<8;i++){const s=this.add.star(x,y,4,2,5,0xf6d385).setDepth(999);this.tweens.add({targets:s,x:x+(Math.random()-.5)*95,y:y-35-Math.random()*45,alpha:0,duration:900,onComplete:()=>s.destroy()})}}
 placeDecor(items:any[]){this.decor.forEach(d=>d.destroy());this.decor=[];items.forEach((item,i)=>{const positions=[[4.5,4.6],[1,5],[4.6,1.8]];const p=positions[item.slot??i];if(p)this.decor.push(this.furniture(item.name,p[0],p[1],item.color))})}
 visit(i:number){const c=this.chars[i];this.tweens.killTweensOf(c);const p=iso(6,9.4);this.tweens.add({targets:c,x:p.x,y:p.y,duration:1300,ease:'Sine.easeInOut',onUpdate:()=>c.setDepth(c.y),onComplete:()=>{this.particles(c.x,c.y-60);emit('arrived',i)}})}
}
export function createGame(parent:HTMLElement){return new Phaser.Game({type:Phaser.AUTO,parent,width:1100,height:800,backgroundColor:'#edf1e5',scene:GardenScene,fps:{target:30,forceSetTimeOut:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}})}
