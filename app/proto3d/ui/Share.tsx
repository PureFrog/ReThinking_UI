'use client';
// W4 공유 카드 (docs/brief-wow.md, core/share.ts): a grade drawn as a 1080×1920 notebook page: the company, a shot of
// my garden, the move, the seal, my memo in my hand, the analyst's line, and "mock data · not advice". Shared as a
// file (Web Share API) where the phone allows it, otherwise saved as a PNG. Drawn with the 2D canvas, no library.
import {useEffect,useState} from 'react';
import {SHARE,moveText,wrapLines,type ShareCard} from '../../core/share';
import {snapshot} from '../screen';
import {Sheet} from './Sheet';

const C={paper:'#f4eedf',paper2:'#fbf7ec',rule:'#e3d8bd',frame:'#d8ccae',ink:'#2a2620',sub:'#5c5447',mute:'#6f6656',seal:'#b8372b',graphite:'#5c5447',
  up:'#b8372b',down:'#2c5c92',pen:'#3e4a6e',margin:'#d9a497'};
const F={title:'"Gowun Batang", serif',text:'"Gowun Dodum", sans-serif',mono:'"IBM Plex Mono", monospace',pen:'"Nanum Pen Script", cursive'};
const loadImg=(src:string)=>new Promise<HTMLImageElement|null>(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});

export async function drawCard(card:ShareCard,shot:string|null):Promise<Blob>{
  // the notebook fonts must be in before drawing (a canvas does not wait for them)
  await Promise.race([Promise.all(['700 80px "Gowun Batang"','40px "Gowun Dodum"','600 40px "IBM Plex Mono"','70px "Nanum Pen Script"'].map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,2500))]);
  const {w,h}=card.size,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d')!;
  // paper, a faint rule every line, the margin line
  x.fillStyle=C.paper;x.fillRect(0,0,w,h);
  x.strokeStyle=C.rule;x.lineWidth=2;for(let y=1000;y<h-160;y+=64){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}
  x.strokeStyle=C.margin;x.lineWidth=3;x.beginPath();x.moveTo(64,960);x.lineTo(64,h-150);x.stroke();
  // head
  x.fillStyle=C.mute;x.font=`500 30px ${F.mono}`;x.fillText('ReThink Garden · 판정 기록',80,108);
  x.fillStyle=C.ink;x.font=`700 84px ${F.title}`;x.fillText(card.name,80,214);
  x.fillStyle=C.sub;x.font=`500 38px ${F.mono}`;x.fillText(`그 뒤 ${card.mark}일`,80,276);
  // my garden, pasted in like a photograph
  const img=shot?await loadImg(shot):null;const gx=80,gy=320,gw=w-160,gh=560;
  x.fillStyle=C.paper2;x.fillRect(gx-14,gy-14,gw+28,gh+28);x.strokeStyle=C.frame;x.lineWidth=2;x.strokeRect(gx-14,gy-14,gw+28,gh+28);
  // the canvas sky is see-through (the page draws it): paint it in behind the shot
  const sky=x.createLinearGradient(0,gy,0,gy+gh);sky.addColorStop(0,'#7cc9e6');sky.addColorStop(0.5,'#c3e4ec');sky.addColorStop(1,'#f2eedc');x.fillStyle=sky;x.fillRect(gx,gy,gw,gh);
  if(img){const k=Math.max(gw/img.width,gh/img.height),iw=img.width*k,ih=img.height*k;x.save();x.beginPath();x.rect(gx,gy,gw,gh);x.clip();x.drawImage(img,gx+(gw-iw)/2,gy+(gh-ih)/2,iw,ih);x.restore()}
  else{x.fillStyle=C.rule;x.fillRect(gx,gy,gw,gh)}
  // the move, then the seal pressed a little crooked beside it
  x.fillStyle=card.move<0?C.down:card.move>0?C.up:C.ink;x.font=`600 210px ${F.mono}`;const mv=moveText(card.move);x.fillText(mv,72,1150);
  // the seal goes on the photograph's corner, as if stamped across the page
  x.save();x.translate(w-210,gy+gh-10);x.rotate(-0.14);
  const sc=card.hit?C.seal:C.graphite;x.strokeStyle=sc;x.fillStyle=sc;x.font=`700 76px ${F.title}`;const sw=x.measureText(card.stamp).width+56;
  x.lineWidth=6;x.strokeRect(-sw/2,-62,sw,124);x.lineWidth=2;x.strokeRect(-sw/2+10,-52,sw-20,104);x.textAlign='center';x.textBaseline='middle';x.fillText(card.stamp,0,6);x.restore();
  x.textAlign='left';x.textBaseline='alphabetic';
  // what I wrote then, in my own hand
  x.fillStyle=C.sub;x.font=`500 34px ${F.mono}`;x.fillText(card.then,96,1250);
  x.fillStyle=C.pen;x.font=`76px ${F.pen}`;
  wrapLines(card.memo,w-190,s=>x.measureText(s).width,3).forEach((l,i)=>x.fillText(l,96,1352+i*64));
  // the analyst's line
  x.fillStyle=C.ink;x.font=`700 38px ${F.title}`;x.fillText(card.who,96,1600);
  x.font=`40px ${F.text}`;wrapLines(card.line,w-190,s=>x.measureText(s).width,3).forEach((l,i)=>x.fillText(l,96,1664+i*62));
  // the small print
  x.strokeStyle=C.ink;x.lineWidth=2;x.beginPath();x.moveTo(80,h-120);x.lineTo(w-80,h-120);x.stroke();
  x.fillStyle=C.mute;x.font=`500 28px ${F.mono}`;x.fillText(card.footer,80,h-70);
  return await new Promise<Blob>(ok=>cv.toBlob(b=>ok(b!),'image/png'));
}

export function ShareSheet({card,onClose}:{card:ShareCard;onClose:()=>void}){
  const [blob,setBlob]=useState<Blob|null>(null),[url,setUrl]=useState<string|null>(null),[note,setNote]=useState('');
  useEffect(()=>{let live=true,u='';const shot=snapshot.take?.()??null;
    drawCard(card,shot).then(b=>{if(!live)return;u=URL.createObjectURL(b);setBlob(b);setUrl(u)});
    return()=>{live=false;if(u)URL.revokeObjectURL(u)}},[card]);
  const file=()=>new File([blob!],`rethink-${card.mark}일판정.png`,{type:'image/png'});
  const save=()=>{const a=document.createElement('a');a.href=url!;a.download=file().name;document.body.appendChild(a);a.click();a.remove();setNote('사진으로 저장했어.')};
  const share=async()=>{const f=file();
    if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:`${card.name} ${card.mark}일 판정`});setNote('')}catch{/* the player closed the share sheet */}}
    else save()};
  return <Sheet kicker="공유 카드 · 수익률만 들어가" title={`${card.name} · ${card.mark}일 판정`} label="공유 카드" onClose={onClose}
    foot={<><button type="button" className="rt-btn primary wide" disabled={!blob} onClick={share}>공유하기</button>
      <button type="button" className="rt-btn" disabled={!blob} onClick={save}>저장</button></>}>
    <div className="rt-share-preview">{url?<img src={url} alt={`${card.name} ${card.mark}일 판정 공유 카드`}/>:<p className="rt-empty">그리는 중</p>}</div>
    {note&&<p className="rt-hint" role="status" style={{marginTop:8}}>{note}</p>}
    <p className="rt-hint" style={{marginTop:8}}>금액·계좌·수량은 안 들어가. 아래에 "모의 데이터 · 투자 권유 아님"이 붙어.</p>
  </Sheet>;
}
