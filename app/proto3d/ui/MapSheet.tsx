'use client';
// The garden's map (places.ts): a hand-drawn page of where things are, with me on it. Tapping a place walks there
// (over the bridge if it is across the stream) and closes the map; the place's own sheet opens with the usual tap.
import {PLACES,PLOTS,PATHS,WORLD,streamZ,STREAM,BRIDGE,type PlaceId} from '../places';
import {Sheet} from './Sheet';
const SCALE=5.2,W=WORLD.walk+3;// map units per world unit, and how far out the page reaches
const X=(x:number)=>(x+W)*SCALE,Y=(z:number)=>(z+W)*SCALE;
// onSky: the way up to the other gardens (ui/SkyView.tsx)
// onBuild: 넓히기 mode (ui/Build.tsx): closed land and building lots show on the garden with their prices
export function MapSheet({me,onGo,onSky,onBuild,onClose}:{me:{x:number;z:number};onGo:(id:PlaceId)=>void;onSky?:()=>void;onBuild?:()=>void;onClose:()=>void}){
  const size=W*2*SCALE;
  const water=Array.from({length:STREAM.to-STREAM.from+1},(_,i)=>STREAM.from+i).map(x=>`${X(x)},${Y(streamZ(x))}`).join(' ');
  return <Sheet kicker="정원 지도" title="어디로 갈까요?" label="정원 지도" onClose={onClose}
    foot={(onSky||onBuild)&&<div className="rt-map-foot">{onBuild&&<button type="button" className="rt-btn primary" onClick={onBuild}>정원 넓히기</button>}
      {onSky&&<button type="button" className="rt-btn" onClick={onSky}>다른 유저 보기</button>}</div>}>
    <svg className="rt-map" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="정원 지도">
      <circle cx={X(0)} cy={Y(0)} r={WORLD.walk*SCALE} className="rt-map-land"/>
      <polyline points={water} className="rt-map-water"/>
      <line x1={X(BRIDGE.x)} y1={Y(streamZ(BRIDGE.x)-BRIDGE.half)} x2={X(BRIDGE.x)} y2={Y(streamZ(BRIDGE.x)+BRIDGE.half)} className="rt-map-bridge"/>
      {PATHS.map((l,i)=><polyline key={i} points={l.map(([x,z])=>`${X(x)},${Y(z)}`).join(' ')} className="rt-map-path"/>)}
      {PLOTS.map(([x,z],i)=><circle key={i} cx={X(x)} cy={Y(z)} r={3.4} className="rt-map-plot"/>)}
      <circle cx={X(me.x)} cy={Y(me.z)} r={6} className="rt-map-me"/>
    </svg>
    <div className="rt-map-places">{PLACES.map(p=><button key={p.id} type="button" className="rt-btn" onClick={()=>onGo(p.id)}>{p.label}</button>)}</div>
    <p className="rt-hint" style={{marginTop:8}}>누르면 그곳으로 이동해요</p>
  </Sheet>;
}
