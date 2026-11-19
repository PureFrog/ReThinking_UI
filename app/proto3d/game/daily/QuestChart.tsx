'use client';
// The scene's chart (daily_quest_design 3-4): the company's closes up to the scene's day and the market from the same
// start as a dashed line — never a day past it, no ticker, no dates (the period is revealed at the end). Past scenes
// and my fills are marked. The result draws it on to the evaluation day.
import {aliasOf,closeOf,fval,splitFactor,type DailyPack,type Fill,type Slot} from '../../../core/game/daily/model';
const W=600,H=170,PAD=10;
// slot: which company to draw (A by default); the market line starts from the same point
export function QuestChart({pack,upto,fills=[],label,slot='A'}:{pack:DailyPack;upto:number;fills?:Fill[];label?:string;slot?:Slot}){
  const from=0,n=upto-from+1,px:number[]=[],ix:number[]=[];
  // raw prices drawn on the latest split's basis, so a split is not a cliff (the ledger moves the shares, not the line)
  const adj=(t:number)=>closeOf(pack,slot,t)/fval(splitFactor(pack,t,upto,slot)),name=aliasOf(pack,slot);
  for(let t=from;t<=upto;t++){px.push(adj(t));ix.push(pack.index[t]/pack.index[from]*adj(from))}
  const lo=Math.min(...px,...ix)*.985,hi=Math.max(...px,...ix)*1.015;
  const X=(i:number)=>PAD+(W-2*PAD)*i/Math.max(1,n-1),Y=(v:number)=>PAD+(H-2*PAD-14)*(1-(v-lo)/(hi-lo||1));
  const line=(a:number[])=>a.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const last=px[px.length-1],prev=px[px.length-2]??last;
  return <figure className="dq-chart gx-panel" aria-label={label??'주가 차트'}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${name} 주가와 시장, 기록 시작부터 ${upto===pack.evalTick?'평가일':'이 장면'}까지`}>
      {[.25,.5,.75].map(q=><line key={q} x1={PAD} x2={W-PAD} y1={PAD+(H-2*PAD-14)*q} y2={PAD+(H-2*PAD-14)*q} className="dq-grid"/>)}
      {pack.scenes.filter(s=>s.tick>=0&&s.tick<=upto).map(s=><g key={s.id}><line x1={X(s.tick-from)} x2={X(s.tick-from)} y1={PAD} y2={H-18} className="dq-scene"/>
        {/* a mark near the right edge writes its words to its left, so they are not cut off */}
        <text x={X(s.tick-from)+(X(s.tick-from)>W-60?-3:3)} y={H-6} textAnchor={X(s.tick-from)>W-60?'end':'start'} className="dq-tick">장면 {s.no}</text></g>)}
      {upto>=pack.evalTick&&<text x={X(pack.evalTick-from)-3} y={H-6} textAnchor="end" className="dq-tick">평가일</text>}
      <path d={line(ix)} className="dq-mkt"/>
      <path d={line(px)} className="dq-px"/>
      {fills.filter(f=>f.slot===slot&&f.tick<=upto&&fval(f.sold)>0).map(f=><circle key={f.scene} cx={X(f.tick-from)} cy={Y(adj(f.tick))} r={4} className="dq-fill"/>)}
      <circle cx={X(n-1)} cy={Y(last)} r={3.5} className={last>=prev?'dq-end up':'dq-end down'}/>
    </svg>
    <figcaption className="gx-note"><span className="dq-key px"/>{name} <span className="dq-key mkt"/>시장(같은 출발점) {fills.some(f=>f.slot===slot&&fval(f.sold)>0)&&<><span className="dq-key fill"/>내 매도 체결</>}</figcaption>
  </figure>;
}
