'use client';
// 동물과 놀기 (피드백 2026-11-26 "모든 고양이와 강아지들이랑 interact: 밥을 챙겨주든, 쓰다듬든"):
//   PETS        who they are: 집고양이 치즈, 길고양이 회색이, 강아지 콩이
//   petPick     a tap on one: it stops, looks up and waits; the screen asks what to do (ui: Proto3D PetMenu)
//   petAct      쓰다듬기 or 간식 주기: the animal answers (hearts; purring or a happy hop; eating), the day's first of each
//               brings a few coins (core: g.ops.grant with a per-day key: caring is a sure thing, never a draw)
//   usePetCue   inside an animal: when it was picked, what it was given, so it can react
//   Hearts      hearts floating up over it
import {useEffect,useRef,useState} from 'react';
import {Html} from '@react-three/drei';

export type PetId='house-cat'|'stray-cat'|'dog';
export type PetAct='pet'|'treat';
export const PETS:Record<PetId,{name:string;kind:'cat'|'dog';treat:string;petLine:string;treatLine:string}>={
  'house-cat':{name:'치즈',kind:'cat',treat:'🐟 생선 간식',petLine:'치즈가 골골거려.',treatLine:'치즈가 간식을 싹 비웠어.'},
  'stray-cat':{name:'회색이',kind:'cat',treat:'🐟 생선 간식',petLine:'회색이가 머리를 손에 비벼.',treatLine:'회색이가 조심조심 다 먹었어.'},
  'dog':{name:'콩이',kind:'dog',treat:'🦴 뼈다귀 간식',petLine:'콩이가 꼬리를 마구 흔들어.',treatLine:'콩이가 간식 물고 빙글빙글 돌아.'},
};
// 피드백 2026-11-26 "쓰다듬고 돈 받는 게 물가랑 안 맞아": a small thank-you, not a wage (once a pet and an act a day)
export const PET_COINS:Record<PetAct,number>={pet:500,treat:1_000};// 원 (core/won.ts)
export function petPick(id:PetId,at:{x:number;z:number}){window.dispatchEvent(new CustomEvent('rt-pet-pick',{detail:{id,at}}))}
export function petAct(id:PetId,act:PetAct){window.dispatchEvent(new CustomEvent('rt-pet-act',{detail:{id,act}}))}
// in the animal: waiting (picked a moment ago) and its last reaction
export function usePetCue(id:PetId){
  const wait=useRef(0),react=useRef<{act:PetAct;at:number}|null>(null),[hearts,setHearts]=useState(0);
  useEffect(()=>{const pick=(e:Event)=>{const d=(e as CustomEvent).detail;if(d.id===id)wait.current=performance.now()+12000};
    const act=(e:Event)=>{const d=(e as CustomEvent).detail;if(d.id!==id)return;react.current={act:d.act,at:performance.now()};wait.current=performance.now()+6000;setHearts(n=>n+1)};
    addEventListener('rt-pet-pick',pick);addEventListener('rt-pet-act',act);return()=>{removeEventListener('rt-pet-pick',pick);removeEventListener('rt-pet-act',act)}},[id]);
  return {waiting:()=>performance.now()<wait.current,reacting:()=>react.current&&performance.now()-react.current.at<3500?react.current.act:null,hearts};
}
export function Hearts({n,y=0.6}:{n:number;y?:number}){
  if(!n)return null;
  return <Html key={n} position={[0,y,0]} center zIndexRange={[5,0]} style={{pointerEvents:'none'}}><div className="rt-pet-hearts" aria-hidden><i>💗</i><i>💕</i><i>💗</i></div></Html>;
}
