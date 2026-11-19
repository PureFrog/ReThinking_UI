// W4 공유 카드 (docs/brief-wow.md): a grade turned into a portrait picture to show someone. What goes on it, and
// how the lines wrap; drawing it is ui/Share.tsx. Only the move in %: never amounts, accounts or quantities. A small
// line at the bottom says it is mock data and not advice.
import {CHOICE_LABEL,type Judgment,type Graded} from './judgment';
export type ShareCard={name:string;mark:number;hit:boolean;stamp:string;move:number;then:string;memo:string;line:string;who:string;footer:string;size:{w:number;h:number}};
export const SHARE={w:1080,h:1920,footer:'모의 데이터 · 투자 권유 아님 · ReThink Garden'};
export function shareCard(j:Judgment,g:Graded,line:string,who:string):ShareCard{
  return {name:j.name,mark:g.mark,hit:g.hit,stamp:g.hit?'적중':'빗나감',move:g.after,
    then:`${g.mark}일 전 내 판단 · ${CHOICE_LABEL[j.choice]} · 확신 ${j.confidence}`,memo:j.reason,line,who,footer:SHARE.footer,size:{w:SHARE.w,h:SHARE.h}};
}
// the move as printed on the card: sign, one decimal at most, %
export const moveText=(v:number)=>`${v>0?'+':v<0?'-':''}${Math.abs(Math.round(v*10)/10)}%`;
// Korean wraps between words (a word longer than the line breaks by letters); measure gives a string's width
export function wrapLines(text:string,width:number,measure:(s:string)=>number,max=Infinity):string[]{
  const out:string[]=[];let cur='';
  const push=(s:string)=>{out.push(s)};
  for(const word of text.split(/\s+/).filter(Boolean)){
    const next=cur?cur+' '+word:word;
    if(measure(next)<=width){cur=next;continue}
    if(cur)push(cur);
    if(measure(word)<=width){cur=word;continue}
    cur='';for(const ch of word){if(measure(cur+ch)>width){push(cur);cur=ch}else cur+=ch}
  }
  if(cur)push(cur);
  if(out.length>max){const kept=out.slice(0,max);kept[max-1]=kept[max-1].replace(/.$/,'…');return kept}
  return out;
}
