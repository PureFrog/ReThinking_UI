'use client';
// The daily chart on a journal (지기 docs/jigi.md 5): mock bars as candles (red up, blue down, Korean custom), with a
// mark where each journal of this stock was written; this page's mark is the main one. Plain SVG, no chart package.
import {useMemo,useState} from 'react';
import {RANGES,window_,isReal,type Range} from '../../core/jigi/stocks';

export type ChartMark={date:string;price:number;main?:boolean};
export function JigiChart({code,name,today,marks,range:start='6개월'}:{code:string;name:string;today:string;marks:ChartMark[];range?:Range}){
  const [range,setRange]=useState<Range>(start);
  const bars=useMemo(()=>window_(code,today,RANGES[range]),[code,today,range]);
  const W=340,H=150,L=4,R=52,T=10,B=18,pw=W-L-R,ph=H-T-B;
  const body=(()=>{if(!bars.length)return null;
    let lo=Infinity,hi=-Infinity;for(const b of bars){lo=Math.min(lo,b.l);hi=Math.max(hi,b.h)}const pad=(hi-lo)*.06||1;lo-=pad;hi+=pad;
    const n=bars.length,bw=pw/n,x=(i:number)=>L+(i+.5)*bw,y=(v:number)=>T+(hi-v)/(hi-lo)*ph;
    const grid=[0,1,2,3].map(i=>{const v=lo+(hi-lo)*(i+.5)/4;return <g key={i}><line x1={L} x2={L+pw} y1={y(v)} y2={y(v)} className="jg-grid"/>
      <text x={L+pw+4} y={y(v)+3} className="jg-ax">{Math.round(v).toLocaleString('ko-KR')}</text></g>});
    const candles=bars.map((b,i)=>{const up=b.c>=b.o,cls=up?'jg-up':'jg-down',w=Math.max(1,bw*.62),y1=y(Math.max(b.o,b.c)),y2=y(Math.min(b.o,b.c));
      return <g key={b.d} className={cls}><line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)}/>{bw>=2.5&&<rect x={x(i)-w/2} y={y1} width={w} height={Math.max(1,y2-y1)}/>}</g>});
    const pins=marks.flatMap((m,k)=>{let i=-1;for(let j=n-1;j>=0;j--)if(bars[j].d<=m.date){i=j;break}if(i<0)return [];
      return [<g key={k} className={`jg-mark${m.main?' main':''}`}><line x1={x(i)} x2={x(i)} y1={T} y2={T+ph}/><circle cx={x(i)} cy={y(m.price)} r={m.main?4.5:3}/>
        {m.main&&<text x={x(i)+(x(i)>W-R-30?-6:6)} y={T+8} textAnchor={x(i)>W-R-30?'end':'start'}>기록</text>}</g>]});
    return <>{grid}{candles}{pins}
      <text x={L} y={H-4} className="jg-ax">{bars[0].d}</text><text x={L+pw} y={H-4} textAnchor="end" className="jg-ax">{bars[n-1].d}</text></>})();
  return <div className="jg-chart">
    <div className="jg-chart-head"><b>{name} 일봉</b><span className="jg-mock">{isReal(code)?'실제 시세 · 종가':'모의 시세'}</span>
      <div className="jg-ranges" role="group" aria-label="차트 기간">{(Object.keys(RANGES) as Range[]).map(r=><button key={r} type="button" aria-pressed={r===range} onClick={()=>setRange(r)}>{r}</button>)}</div></div>
    {body?<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name} 일봉 차트와 기록 위치`}>{body}</svg>:<p className="rt-hint">가격을 못 불러왔어요. 글은 계속 쓸 수 있어요.</p>}
  </div>;
}
