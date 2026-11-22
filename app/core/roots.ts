// W2 뿌리 단면 (docs/brief-wow.md): above the ground is the price, below it the company's real strength. Three
// numbers (content/health.ts) become what the cut-away shows, so the difference reads at a glance:
//   재무 체력 (F-score 0–9) → how many roots and how thick · 부도 위험 (Ohlson %) → dark spots spreading on the roots
//   빚 부담 (debt ratio %) → the size of the stone caught in the roots
// A healthy company shows thick clean roots: the contrast is the point, not fear. Nothing here says sell.
import type {Health} from '../content/health';
export type Tone='good'|'mid'|'weak';
// where each number turns from good to middling to weak
export const ROOT_LINES={fscore:{good:6,mid:4}/* at least */,ohlson:{good:5,mid:12}/* % under */,debt:{good:100,mid:180}/* % under */};
export type Roots={count:number;thick:number;spots:number;stone:number};
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export function rootsOf(h:Health):Roots{
  const f=clamp(h.fscore,0,9);
  return {
    count:3+Math.round(f*5/9),// 3 roots at 0 points, 8 at 9
    thick:Math.round((0.055+0.11*f/9)*1000)/1000,// tube radius
    spots:Math.round(clamp((h.ohlson-ROOT_LINES.ohlson.good)/15)*12),// none under 5%, 12 at 20%
    stone:Math.round(clamp((h.debt-ROOT_LINES.debt.good)/150)*100)/100,// none under 100%, full at 250%
  };
}
export function toneOf(k:keyof typeof ROOT_LINES,v:number):Tone{
  if(k==='fscore')return v>=ROOT_LINES.fscore.good?'good':v>=ROOT_LINES.fscore.mid?'mid':'weak';
  const l=ROOT_LINES[k];return v<l.good?'good':v<l.mid?'mid':'weak';
}
// the three rows beside the cut: the plain word big, the model small, the number, and what it looks like down there
export type RootRow={id:keyof typeof ROOT_LINES;word:string;model:string;value:string;tone:Tone;shows:string};
export function rootRows(h:Health):RootRow[]{
  return [
    {id:'fscore',word:'회사 체력',model:'F-score',value:`${h.fscore}/9`,tone:toneOf('fscore',h.fscore),shows:'9개 항목 점수'},
    {id:'ohlson',word:'부도 위험',model:'올슨',value:`${h.ohlson}%`,tone:toneOf('ohlson',h.ohlson),shows:'1년 안 부도 확률'},
    {id:'debt',word:'빚 부담',model:'부채비율',value:`${h.debt}%`,tone:toneOf('debt',h.debt),shows:'빚 ÷ 자기자본'},
  ];
}
// which of tori's lines fits (content/analysts.ts LINES.roots): by strength, then the heaviest other thing
export function rootsSay(h:Health):{main:Tone;extra:'spots'|'stone'|null}{
  const main=toneOf('fscore',h.fscore),o=toneOf('ohlson',h.ohlson),d=toneOf('debt',h.debt);
  const extra=o==='weak'?'spots':d==='weak'?'stone':o==='mid'?'spots':d==='mid'?'stone':null;
  return {main,extra};
}
