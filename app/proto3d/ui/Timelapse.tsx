'use client';
// W5 정원 타임랩스 (core/history.ts): a strip at the bottom with a year of weeks on a slider. Dragging it (or playing it)
// shows the garden as it stood that week: the trees younger, their returns then, the sky of that day's market, and
// a pin wherever a judgment was already buried. The garden itself is drawn by Scene3D from what Proto3D hands it.
import {Cross} from './Icons';
export function TimelapseBar({i,n,day,back,playing,onSeek,onPlay,onClose}:{i:number;n:number;day:string;back:number;playing:boolean;onSeek:(i:number)=>void;onPlay:()=>void;onClose:()=>void}){
  const when=back===0?'오늘':back>=360?'1년 전':`${Math.round(back/7)}주 전`;
  return <section className="rt-lapse" role="dialog" aria-label="타임랩스">
    <div className="rt-lapse-head">
      <div><span className="rt-kicker">타임랩스 · 모의 경로</span><strong><span className="rt-num">{day}</span> · {when}</strong></div>
      <button type="button" className="rt-btn" onClick={onPlay} aria-pressed={playing}>{playing?'멈춤':'재생'}</button>
      <button type="button" className="rt-close" aria-label="닫기" onClick={onClose}><Cross size={20}/></button>
    </div>
    <input type="range" className="rt-lapse-range" min={0} max={n-1} step={1} value={i} aria-label="타임랩스 날짜" onChange={e=>onSeek(Number(e.target.value))}/>
    <div className="rt-lapse-scale" aria-hidden><span>1년 전</span><span>6달 전</span><span>오늘</span></div>
  </section>;
}
