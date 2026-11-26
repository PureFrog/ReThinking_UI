// Surface textures drawn on canvases (피드백 2026-11-26 "재질이 드러나게": wood is wood, stone is stone, brick is brick).
// Each is made once and shared; repeat is set per use with a clone when a mesh needs a different scale.
import * as THREE from 'three';

const cache=new Map<string,THREE.CanvasTexture>();
function make(key:string,w:number,h:number,draw:(g:CanvasRenderingContext2D)=>void){
  let t=cache.get(key);if(t)return t;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d')!);
  t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;cache.set(key,t);return t;
}
const jitter=(base:[number,number,number],k:number,seed:number)=>{const r=((Math.sin(seed*12.9898)*43758.5453)%1+1)%1;const d=(r-0.5)*k;return `rgb(${base.map(v=>Math.max(0,Math.min(255,Math.round(v+d)))).join(',')})`};

// roof shingles: rows of rounded tiles, each a little different
export const shingles=(base:[number,number,number]=[160,82,58])=>make('shingle'+base,256,256,g=>{
  g.fillStyle=`rgb(${base.map(v=>v*0.6).join(',')})`;g.fillRect(0,0,256,256);
  for(let r=0;r<10;r++)for(let c=-1;c<9;c++){const x=c*32+(r%2)*16,y=r*26;g.fillStyle=jitter(base,40,r*31+c);
    g.beginPath();g.moveTo(x,y);g.lineTo(x+30,y);g.lineTo(x+30,y+20);g.quadraticCurveTo(x+15,y+32,x,y+20);g.closePath();g.fill();
    g.strokeStyle='#00000030';g.lineWidth=1.5;g.stroke();g.fillStyle='#ffffff14';g.fillRect(x+3,y+2,24,3)}});
// clapboard siding: horizontal boards with a shadow under each and a faint grain
export const siding=(base:[number,number,number]=[241,230,212])=>make('siding'+base,256,256,g=>{
  for(let r=0;r<8;r++){g.fillStyle=jitter(base,14,r*7);g.fillRect(0,r*32,256,32);g.fillStyle='#00000026';g.fillRect(0,r*32+29,256,3);g.fillStyle='#ffffff30';g.fillRect(0,r*32,256,2);
    g.strokeStyle='#8a6a4a14';for(let k=0;k<3;k++){g.beginPath();g.moveTo(0,r*32+8+k*7);for(let x=0;x<=256;x+=32)g.lineTo(x,r*32+8+k*7+Math.sin(x*0.05+r)*1.5);g.stroke()}}});
// fieldstone: rounded stones of greys and browns set in mortar
export const stone=()=>make('stone',256,256,g=>{g.fillStyle='#8f877c';g.fillRect(0,0,256,256);
  for(let r=0;r<6;r++)for(let c=0;c<6;c++){const x=c*44+(r%2)*22-10,y=r*44-4,w=38+((r*c)%3)*4,h=36;g.fillStyle=jitter([182,172,158],40,r*13+c*7);
    g.beginPath();g.ellipse(x+w/2,y+h/2,w/2,h/2,((r+c)%3-1)*0.2,0,7);g.fill();g.strokeStyle='#5f574d66';g.lineWidth=2;g.stroke();g.fillStyle='#ffffff18';g.beginPath();g.ellipse(x+w/2-6,y+h/2-8,w/4,h/6,0,0,7);g.fill()}});
// brick: running bond, mortar lines, a few darker bricks
export const brick=()=>make('brick',128,128,g=>{g.fillStyle='#d8cbb8';g.fillRect(0,0,128,128);
  for(let r=0;r<8;r++)for(let c=-1;c<4;c++){const x=c*32+(r%2)*16,y=r*16;g.fillStyle=jitter([168,84,62],36,r*5+c*3);g.fillRect(x+1,y+1,30,14);g.fillStyle='#00000018';g.fillRect(x+1,y+12,30,3)}});
// planks (doors, decks): vertical boards with grain and nail dots
export const planks=(base:[number,number,number]=[107,65,48])=>make('planks'+base,128,256,g=>{
  for(let c=0;c<4;c++){g.fillStyle=jitter(base,22,c*9);g.fillRect(c*32,0,32,256);g.fillStyle='#00000035';g.fillRect(c*32+30,0,2,256);
    g.strokeStyle='#00000022';for(let k=0;k<4;k++){g.beginPath();g.moveTo(c*32+6+k*6,0);for(let y=0;y<=256;y+=32)g.lineTo(c*32+6+k*6+Math.sin(y*0.04+c+k)*2,y);g.stroke()}
    g.fillStyle='#2a1a12';[[c*32+16,20],[c*32+16,236]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,2,0,7);g.fill()})}});
// a texture clone with its own repeat (the shared one stays as it is)
export function rep(t:THREE.Texture,x:number,y:number){const c=t.clone();c.needsUpdate=true;c.repeat.set(x,y);return c}
export const tmat=(t:THREE.Texture,x:number,y:number,rough=0.9)=>new THREE.MeshStandardMaterial({map:rep(t,x,y),roughness:rough});
