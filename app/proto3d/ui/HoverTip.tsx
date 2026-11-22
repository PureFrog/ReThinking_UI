'use client';
// 게임 구성 3 (2026-11-20): put the mouse on a thing in the village and a small bubble says what it is and what it does.
// Scene3D sends the name of the thing under the mouse ('rt-hover'); the words for each are here.
import {useEffect,useState} from 'react';
import {ANALYSTS,MODEL_INFO} from '../../content/analysts';
export type HoverWords={title:string;sub?:string};
export function hoverWords(name:string,tree:(id:number)=>{name:string;virtual?:boolean}|null):HoverWords|null{
  if(name==='house')return {title:'집',sub:'매일 여기서 오늘의 퀴즈를 풀어요'};
  if(name==='cart')return {title:'상점',sub:'가상 종목, 나무와 꽃, 소품을 코인으로 사요'};
  if(name.startsWith('signpost'))return {title:'표지판',sub:'마을 지도를 펼쳐요'};
  if(name==='observatory')return {title:'퀘스트 게시판',sub:'오늘과 이번 주에 할 일, 마치면 코인'};
  if(name==='plaza')return {title:'광장',sub:'다른 사람 마을을 구경해요'};
  if(name==='library')return {title:'서고',sub:'지금은 문을 닫았어요'};
  if(name==='player')return {title:'나',sub:'눌러서 옷을 갈아입어요'};
  if(name==='bridge')return {title:'다리',sub:'건너면 연못과 광장이에요'};
  if(name.startsWith('decor-'))return {title:'꾸미기',sub:'상점에서 산 소품이에요'};
  const t=/^tree-(\d+)$/.exec(name);
  if(t){const h=tree(Number(t[1]));return h?{title:h.name,sub:h.virtual?'가상 종목 나무 · 눌러서 시세 보기':'내 실제 종목 나무 · 눌러서 일지 쓰기'}:null}
  const a=/^analyst-(\w+)$/.exec(name);
  if(a){if(a[1]==='bori')return {title:'보리',sub:'안내 친구 · 퀴즈와 손절 신호 이야기'};
    if(a[1]==='naru')return {title:'나루 · 낚시터',sub:'하루 몇 번 낚시해서 코인을 벌어요'};
    const x=ANALYSTS.find(y=>y.id===a[1]);if(x){const m=MODEL_INFO[x.models[0]];return {title:`${x.name} · ${m.name}`,sub:`${m.what} 담당 · 눌러서 대화`}}}
  return null;
}
export function HoverTip({tree,off}:{tree:(id:number)=>{name:string;virtual?:boolean}|null;off?:boolean}){
  const [at,setAt]=useState<{w:HoverWords;x:number;y:number}|null>(null);
  useEffect(()=>{const on=(e:Event)=>{const d=(e as CustomEvent<{name:string;x:number;y:number}|null>).detail;const w=d?hoverWords(d.name,tree):null;
      setAt(w&&d?{w,x:d.x,y:d.y}:null);document.body.style.cursor=w?'pointer':''};
    window.addEventListener('rt-hover',on);return()=>{window.removeEventListener('rt-hover',on);document.body.style.cursor=''}},[tree]);
  if(!at||off)return null;
  return <div className="vl-hover" role="tooltip" data-testid="hover-tip" style={{left:at.x,top:at.y}}><b>{at.w.title}</b>{at.w.sub&&<small>{at.w.sub}</small>}</div>;
}
