'use client';
// Name signs over the buildings (2026-11-16 feedback "건물 보고 무슨 건물인지 모르겠음"): a small board above each
// place (집, 사례 서고, 관측소, 수레, 리그 광장), each farm building that stands and each landmark bought. The 3D side
// puts a point 'sign-<id>' above the roof (Scene3D); this follows it on screen like the other tags (screen.ts).
// Not buttons: they only name things, so they never get in the way of a tap on the world.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
import {PLACES} from '../places';
import {BUILDINGS,CITIES,type Built} from '../../core/land';

// where the signs stand and how high above the ground (world units); shared with Scene3D
export const SIGN_PLACES:Record<string,number>={master:4.4,home:4.3,observatory:4.1,plaza:2.4,arcade:3.6};// 2026-11-23: the shops and the library carry their keeper's tag with the shop's name (Shop3D.tsx)
export const SIGN_BUILDINGS:Record<string,number>={greenhouse:3,silo:4.1,windmill:5.6};
export const SIGN_CITY=6.4;
// 피드백 2026-11-25 "집, 거장의 집도 저런식으로": each sign is two lines like the keepers' tags (사서: 📖 도서관 · 투자일지),
// the name, then what you do there
export const SIGN_NOTE:Record<string,string>={home:'🏠 내 방 · 퀴즈와 옷장',master:'📚 버핏의 서재 · 책 읽고 퀴즈',
  plaza:'🌌 다른 정원 구경 · 리그',arcade:'🕹️ 미니게임 · 닌자 포트폴리오',observatory:'🔭 오늘의 시장'};
export function signsOf(built:Built|null|undefined){
  return [...PLACES.filter(p=>p.id in SIGN_PLACES).map(p=>({id:p.id,label:p.label,note:SIGN_NOTE[p.id]??''})),
    ...BUILDINGS.filter(b=>built?.buildings.includes(b.id)).map(b=>({id:b.id,label:b.name,note:'🌿 '+b.desc})),
    ...CITIES.filter(c=>built?.cities.includes(c.id)).map(c=>({id:'city-'+c.id,label:`${c.landmark} · ${c.city}`,note:'📈 '+c.index+' 지수'}))];
}

export function Signs({built}:{built:Built|null}){
  const refs=useRef(new Map<string,HTMLSpanElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [k,el] of refs.current){const p=screenPoints.get('sign-'+k);
      const w=el.parentElement?.clientWidth??innerWidth,h=el.parentElement?.clientHeight??innerHeight;
      // off screen, behind the camera, or under the top bar: hidden
      if(!p||!p.visible||p.y<96||p.y>h-150||p.x<0||p.x>w){el.style.visibility='hidden';continue}
      el.style.visibility='visible';el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <div className="rt-signs" aria-hidden>{signsOf(built).map(s=>
    <span key={s.id} className="rt-sign" data-sign={s.id} style={{visibility:'hidden'}} ref={el=>{if(el)refs.current.set(s.id,el);else refs.current.delete(s.id)}}>{s.label}{s.note&&<small>{s.note}</small>}</span>)}</div>;
}
