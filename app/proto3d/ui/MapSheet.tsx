'use client';
// 마을 지도 (피드백 2026-11-26 "지도 탭 안이 redundant하고 복잡해, 간단하고 기능 겹치지 않게, 아이콘은 직관적으로"):
// one picture of the village and nothing else. Every thing to do lives at one place, shown once as a pin with its
// sign and what you do there; a tap walks me there (a door is gone in through on arrival). The 통신기 and the 수첩 are
// their own buttons on the screen, so they are not here.
import {PLACES,PLOTS,PATHS,WORLD,streamZ,STREAM,BRIDGE,POND_AT,type PlaceId} from '../places';
import {MERCHANT_STALL,TAILOR_STALL} from '../../content/villagers';
import {useState} from 'react';
import {Sheet} from './Sheet';
const SCALE=5.2,W=WORLD.walk+3;// map units per world unit, and how far out the page reaches
const X=(x:number)=>(x+W)*SCALE,Y=(z:number)=>(z+W)*SCALE,size=W*2*SCALE;
const pc=(v:number)=>`${(v/size*100).toFixed(2)}%`;
// each place: its sign and the one thing (or two) done there
export const PIN:Partial<Record<PlaceId,{icon:string;does:string}>>={
  home:{icon:'🏠',does:'오늘의 퀴즈 · 시나리오'},master:{icon:'📚',does:'버핏의 책'},library:{icon:'📖',does:'투자일지 · 채점'},
  farm:{icon:'🌳',does:'내 실제 종목'},orchard:{icon:'🍎',does:'연습 종목'},cart:{icon:'🔨',does:'건물 · 꾸미기'},
  arcade:{icon:'🕹️',does:'미니게임'},plaza:{icon:'🏆',does:'리그 · 이웃'},pond:{icon:'🎣',does:'낚시'}};
export type Spot={id:string;label:string;icon:string;does:string;x:number;z:number};
// the stalls that are not places (they stand by the path): the merchant and the clothes shop
const EXTRA:Spot[]=[{id:'merchant',label:'상인',icon:'📟',does:'가상 종목',x:MERCHANT_STALL.x,z:MERCHANT_STALL.z},{id:'tailor',label:'옷 가게',icon:'👕',does:'옷',x:TAILOR_STALL.x,z:TAILOR_STALL.z}];
export function MapSheet({me,onGo,onSpot,onBuild,onClose}:{me:{x:number;z:number};onGo:(id:PlaceId)=>void;onSpot?:(id:string)=>void;onBuild?:()=>void;onClose:()=>void}){
  const water=Array.from({length:STREAM.to-STREAM.from+1},(_,i)=>STREAM.from+i).map(x=>`${X(x)},${Y(streamZ(x))}`).join(' ');
  const pins:Spot[]=[...PLACES.filter(p=>PIN[p.id]).map(p=>({id:p.id,label:p.label,icon:PIN[p.id]!.icon,does:PIN[p.id]!.does,x:p.id==='pond'?POND_AT.x:p.x,z:p.id==='pond'?POND_AT.z:p.z})),...(onSpot?EXTRA:[])];
  const [sel,setSel]=useState<string|null>(null),cur=pins.find(p=>p.id===sel)??null;
  // pins that would sit on each other (the fields and the merchant, the two shops) are nudged apart on the page
  const at=pins.map(p=>({x:X(p.x)/size,y:Y(p.z)/size}));
  for(let it=0;it<40;it++)for(let i=0;i<at.length;i++)for(let j=i+1;j<at.length;j++){const dx=at[j].x-at[i].x,dy=at[j].y-at[i].y,ox=0.16-Math.abs(dx),oy=0.1-Math.abs(dy);
    if(ox>0&&oy>0){if(oy<ox){const k=oy/2*(dy<0?-1:1);at[i].y-=k;at[j].y+=k}else{const k=ox/2*(dx<0?-1:1);at[i].x-=k;at[j].x+=k}}}
  return <Sheet kicker="마을" title="어디로 갈까요?" label="정원 지도" onClose={onClose}
    foot={onBuild&&<div className="rt-map-foot one"><button type="button" className="rt-btn" onClick={onBuild}>정원 넓히기</button></div>}>
    <div className="rt-vmap">
      <svg className="rt-map" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={X(0)} cy={Y(0)} r={WORLD.walk*SCALE} className="rt-map-land"/>
        <polyline points={water} className="rt-map-water"/>
        <line x1={X(BRIDGE.x)} y1={Y(streamZ(BRIDGE.x)-BRIDGE.half)} x2={X(BRIDGE.x)} y2={Y(streamZ(BRIDGE.x)+BRIDGE.half)} className="rt-map-bridge"/>
        {PATHS.map((l,i)=><polyline key={i} points={l.map(([x,z])=>`${X(x)},${Y(z)}`).join(' ')} className="rt-map-path"/>)}
        {PLOTS.map(([x,z],i)=><circle key={i} cx={X(x)} cy={Y(z)} r={3.4} className="rt-map-plot"/>)}
      </svg>
      {/* 피드백 2026-11-26 "아이콘이 너무 많아 지도가 안 보여": a small sign and the name only; a tap shows what is done
          there and the way to go, under the map */}
      {pins.map((p,i)=><button key={p.id} type="button" className="rt-vpin" data-on={sel===p.id} style={{left:`${(at[i].x*100).toFixed(2)}%`,top:`${(at[i].y*100).toFixed(2)}%`}} aria-label={p.label} aria-pressed={sel===p.id}
        onClick={()=>setSel(p.id)}><span className="rt-vpin-ic" aria-hidden>{p.icon}</span><b>{p.label}</b></button>)}
      <span className="rt-vme" style={{left:pc(X(me.x)),top:pc(Y(me.z))}} aria-label="나"><i/>나</span>
    </div>
    {cur?<div className="rt-vcard"><span className="rt-vcard-ic" aria-hidden>{cur.icon}</span><div><b>{cur.label}</b><small>{cur.does}</small></div>
      <button type="button" className="rt-btn primary" onClick={()=>PIN[cur.id as PlaceId]?onGo(cur.id as PlaceId):onSpot?.(cur.id)}>여기로 가기</button></div>
      :<p className="rt-hint" style={{marginTop:8}}>장소를 누르면 거기서 하는 일이 나와요.</p>}
  </Sheet>;
}
