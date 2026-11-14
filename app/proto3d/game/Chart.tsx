'use client';
// The 판's chart on one canvas (docs/game.md 7-2 #3·#7). Flow: the line draws on a day at a time, the range only knows
// the days already seen (no peeking), the end dot pulses. Moment: zoomed to the last 25 days, and each analyst's note
// draws in as they speak — moa's mark on the day of the news, tori's F-score tag, luon's market line from the same start.
import {useEffect,useRef} from 'react';
import {barAt,type GamePack} from '../../core/game/pack';
import {still} from '../still';
export type Notes={on:{moa:boolean;tori:boolean;luon:boolean};hl:string|null;mark:{tick:number;label:string}|null;fTag:string|null};
const PRE_SHOWN=40,ZOOM=25;
const css=(el:Element,n:string)=>getComputedStyle(el).getPropertyValue(n).trim()||'#2a2620';
// ghost: the last run of this 판 (core/game/run.ts ghostOf), its decisions on this company as dashed marks
export function GameChart({pack,code,tick,notes,label,ghost}:{pack:GamePack;code:string;tick:number;notes?:Notes|null;label?:React.ReactNode;ghost?:{tick:number;label:string}[]}){
  const cv=useRef<HTMLCanvasElement>(null),tags=useRef<HTMLDivElement>(null);
  const anim=useRef({shown:tick,lo:0,hi:0,mkt:0,mark:0,code});
  useEffect(()=>{
    const c=cv.current;if(!c)return;const g=c.getContext('2d');if(!g)return;
    const a=anim.current;if(a.code!==code){a.code=code;a.shown=tick;a.lo=0}
    const zoom=!!notes,from=zoom?Math.max(-pack.preDays,tick-ZOOM+1):-PRE_SHOWN;
    const ticks:number[]=[];for(let t=from;t<=tick;t++)ticks.push(t);
    const px=ticks.map(t=>barAt(pack,code,t)?.[4]??0);
    const iAt=(t:number)=>{const d=barAt(pack,code,t)?.[0];return pack.index.find(r=>r[0]===d)?.[1]??0};
    const ix=zoom?ticks.map(t=>iAt(t)/iAt(from)*px[0]):[];
    let raf=0;const quiet=still();
    const draw=(now:number)=>{
      const dpr=Math.min(2,devicePixelRatio||1),W=c.clientWidth,H=c.clientHeight;if(c.width!==W*dpr){c.width=W*dpr;c.height=H*dpr}
      g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
      const ink=css(c,'--rt-ink'),rule=css(c,'--rt-rule'),mute=css(c,'--rt-mute'),up=css(c,'--rt-up'),down=css(c,'--rt-down'),seal=css(c,'--rt-seal');
      // ease toward the target: the day being drawn on, the widened range, the notes switching on
      const k=quiet?1:.18;a.shown+=(tick-a.shown)*k;if(Math.abs(tick-a.shown)<.01)a.shown=tick;
      const upto=Math.floor(a.shown-from);const seen=px.slice(0,Math.max(2,upto+2)).concat(notes?.on.luon?ix:[]);
      const lo2=Math.min(...seen)*.97,hi2=Math.max(...seen)*1.03;if(!a.lo){a.lo=lo2;a.hi=hi2}a.lo+=(lo2-a.lo)*k;a.hi+=(hi2-a.hi)*k;
      a.mkt+=((notes?.on.luon?1:0)-a.mkt)*(quiet?1:.08);a.mark+=((notes?.on.moa?1:0)-a.mark)*(quiet?1:.12);
      const right=notes?78:14,X=(i:number)=>12+(W-12-right)*i/Math.max(1,ticks.length-1),Y=(v:number)=>24+(H-40)*(1-(v-a.lo)/(a.hi-a.lo||1));
      g.strokeStyle=rule;g.lineWidth=1;g.setLineDash([2,4]);for(let q=1;q<4;q++){const y=24+(H-40)*q/4;g.beginPath();g.moveTo(12,y);g.lineTo(W-12,y);g.stroke()}g.setLineDash([]);
      if(!notes&&ghost)for(const gh of ghost){const i=gh.tick-from;if(i<0||i>upto)continue;g.save();g.globalAlpha=.6;g.strokeStyle=mute;g.setLineDash([3,3]);g.beginPath();g.moveTo(X(i),20);g.lineTo(X(i),H-14);g.stroke();g.setLineDash([]);g.fillStyle=mute;g.font='10px "Gowun Dodum"';g.fillText(gh.label,Math.min(X(i)+4,W-70),30);g.restore()}
      if(!notes){const z=-from;if(z>0&&z<ticks.length){g.strokeStyle=rule;g.beginPath();g.moveTo(X(z),18);g.lineTo(X(z),H-14);g.stroke();g.fillStyle=mute;g.font='10px "Gowun Dodum"';g.fillText('시작',X(z)+4,H-16)}}
      if(notes?.mark&&a.mark>.01){const i=notes.mark.tick-from;if(i>=0&&i<ticks.length){g.globalAlpha=a.mark;g.strokeStyle=seal;g.setLineDash([3,3]);g.beginPath();g.moveTo(X(i),H-14);g.lineTo(X(i),H-14-(H-38)*a.mark);g.stroke();g.setLineDash([]);
        g.fillStyle=seal;g.beginPath();g.arc(X(i),Y(px[i]),3.5,0,7);g.fill();g.globalAlpha=1}}
      if(zoom&&a.mkt>.01){const n=Math.max(1,Math.round((ticks.length-1)*a.mkt));g.strokeStyle=mute;g.lineWidth=1.4;g.setLineDash([4,3]);g.beginPath();for(let i=0;i<=n;i++)i?g.lineTo(X(i),Y(ix[i])):g.moveTo(X(i),Y(ix[i]));g.stroke();g.setLineDash([])}
      // the line, the last segment drawn part way
      const f=Math.max(0,Math.min(ticks.length-1,upto)),fr=Math.max(0,Math.min(1,a.shown-from-f));
      g.beginPath();for(let i=0;i<=f;i++)i?g.lineTo(X(i),Y(px[i])):g.moveTo(X(i),Y(px[i]));
      let ex=X(f),ey=Y(px[f]);if(f<ticks.length-1&&fr>0){ex=X(f)+(X(f+1)-X(f))*fr;ey=Y(px[f])+(Y(px[f+1])-Y(px[f]))*fr;g.lineTo(ex,ey)}
      g.strokeStyle=ink;g.lineWidth=1.9;g.lineJoin='round';g.stroke();
      if(!notes){g.lineTo(ex,H-14);g.lineTo(X(0),H-14);g.closePath();const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,ink+'22');gr.addColorStop(1,ink+'00');g.fillStyle=gr;g.fill()}
      const last=px[ticks.length-1],prev=px[ticks.length-2]??last,col=last>=prev?up:down,pulse=notes||quiet?0:Math.sin(now/260)*1.5;
      g.fillStyle=col+'33';g.beginPath();g.arc(ex,ey,7+pulse,0,7);g.fill();g.fillStyle=col;g.beginPath();g.arc(ex,ey,3.2,0,7);g.fill();
      // DOM notes sit where the drawing is
      const t=tags.current;if(t){for(const el of Array.from(t.children) as HTMLElement[]){const w=el.dataset.a;
        if(w==='moa'&&notes?.mark){const i=notes.mark.tick-from;el.style.left=X(Math.max(0,i))+'px';el.style.top=(Y(px[Math.max(0,i)]??last)-8)+'px'}
        if(w==='luon'&&ix.length){el.style.left=(X(ticks.length-1)+4)+'px';el.style.top=Y(ix[ix.length-1])+'px'}
        if(w==='me'){el.style.left=(X(ticks.length-1)+4)+'px';el.style.top=Y(last)+'px'}}}
      if(!quiet)raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
  },[pack,code,tick,notes,ghost]);
  const on=notes?.on,last=barAt(pack,code,tick),prev=barAt(pack,code,tick-1),ch=last&&prev?(last[4]/prev[4]-1)*100:0;
  return <div className="gx-chart gx-panel">
    <canvas ref={cv} aria-label="가격 차트"/>
    {label&&<div className="gx-chart-h">{label}</div>}
    <div className="gx-anno" ref={tags}>
      {notes?.mark&&<span className={`tag${on?.moa?' on':''}${notes.hl==='moa'?' hl':''}`} data-a="moa">{notes.mark.label}</span>}
      {notes?.fTag&&<span className={`tag left${on?.tori?' on':''}${notes.hl==='tori'?' hl':''}`} data-a="tori" style={{left:8,top:16}}>{notes.fTag}</span>}
      {notes&&<span className={`tag left${on?.luon?' on':''}${notes.hl==='luon'?' hl':''}`} data-a="luon">시장</span>}
      {notes&&<span className="tag left on" data-a="me"><b>{ch>0?'+':ch<0?'−':''}{Math.abs(ch).toFixed(2)}%</b></span>}
    </div>
  </div>;
}
