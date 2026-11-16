'use client';
// Putting my holdings in the garden (redesign 5장: capture onboarding, carried over from the 2D app). First visit: a
// capture of the brokerage screen, or typing them in, or the demo garden. Later (from the track record): the same list
// to recapture or edit. The rules are app/core/portfolio.ts; reading the picture is app/content/portfolio.ts (mock now).
// Nothing here buys or sells: removing a tree only takes it out of the garden.
import {useRef,useState} from 'react';
import {Lens,Plus,Strike} from './Icons';
import {drafts,applyDrafts,freePlots,blankDraft,HELD,type Draft,type HeldId} from '../../core/portfolio';
import {portfolioReader,kindOf,type ReadHolding} from '../../content/portfolio';
import {GARDEN_PLOTS} from '../../content/demo-garden';
import {UI,line} from '../../content/analysts';
import {Sheet} from './Sheet';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;

// onPlanted: the new trees (W1, they are born in the garden); onDemo: the demo garden was picked instead
// reader: the server's real reading when signed in (a list, or what went wrong); without it the example reader
export function Onboarding({g,onClose,onPlanted,onDemo,reader}:{g:G;onClose:()=>void;onPlanted?:(ids:number[],first:boolean)=>void;onDemo?:()=>void;reader?:((f:File)=>Promise<ReadHolding[]|string>)|null}){
  const first=!g.s.onboarded,holdings=g.s.holdings;
  // the confirm list; editing starts from the trees already planted
  const [rows,setRows]=useState<Draft[]|null>(()=>first?null:drafts(holdings.map(h=>({name:h.name,rate:h.rate})),holdings).rows);
  const [gone,setGone]=useState<number[]>([]);
  const [missing,setMissing]=useState<typeof holdings>([]);
  const [reading,setReading]=useState(false),[readErr,setReadErr]=useState<string|null>(null);
  const file=useRef<HTMLInputElement>(null);

  const read=async(f:File)=>{setReading(true);setReadErr(null);try{const got=reader?await reader(f):await portfolioReader.read(f);
    if(typeof got==='string'){setReadErr(got);return}const r=drafts(got,holdings);setRows(r.rows);setMissing(r.missing);setGone([])}finally{setReading(false)}};
  const edit=(i:number,patch:Partial<Draft>)=>setRows(rs=>rs!.map((r,j)=>j===i?{...r,...patch}:r));
  const kept=(rows??[]).filter(r=>r.keep&&r.name.trim());
  // rows dropped from an edit list take their tree out; so do missing trees the player ticked
  const removed=[...gone,...(rows??[]).filter(r=>r.existing!==null&&!r.keep).map(r=>r.existing!)];
  const staying=holdings.filter(h=>!removed.includes(h.id)).length,newOnes=kept.filter(r=>r.existing===null).length;
  const over=staying+newOnes>GARDEN_PLOTS;
  const plant=()=>{
    const clean=kept.map(r=>({...r,name:r.name.trim()}));
    const base=holdings.filter(h=>!removed.includes(h.id));
    const out=applyDrafts(holdings,clean,removed,freePlots(base,GARDEN_PLOTS),kindOf);
    g.ops.setHoldings(out.holdings);
    g.say(first?line(UI.planted,{n:out.holdings.length}):line(UI.replanted,{n:out.holdings.length}));
    if(onPlanted)onPlanted(out.planted.map(h=>h.id),first);else onClose();
  };

  const picker=<input ref={file} type="file" accept="image/*" hidden aria-label="캡처 파일" onChange={e=>{const f=e.target.files?.[0];if(f)void read(f);e.target.value=''}}/>;

  if(!rows)return <Sheet kicker="시작" title="내 종목부터" label="내 종목 넣기" onClose={onClose}
    foot={<button type="button" className="rt-btn wide" onClick={()=>{g.ops.useDemo();if(onDemo)onDemo();else onClose()}}>예시 정원으로 시작</button>}>
    {picker}
    <label className="rt-field" style={{marginTop:0}}>닉네임 <span className="rt-hint">나중에 바꿀 수 있어요</span>
      <input className="rt-input" value={g.s.name} maxLength={12} placeholder="닉네임 (선택)" aria-label="내 이름" onChange={e=>g.ops.setName(e.target.value)}/></label>
    <p className="rt-hint" style={{marginTop:14}}>종목 하나가 나무 하나예요. 분석가 셋이 손실 신호를 찾아 알려줘요.</p>
    <div className="rt-pick">
      <button type="button" className="rt-pick-card" disabled={reading} onClick={()=>file.current?.click()}>
        <Lens size={20}/><strong>{reading?'읽는 중':'캡처 올리기'}</strong><small>{reader?'증권 앱 보유 종목 화면. 여러 종목도 한 번에 읽어요.':'증권 앱 보유 종목 화면. 이 기기 밖으로 보내지 않아요.'}</small></button>
      <button type="button" className="rt-pick-card" onClick={()=>setRows([blankDraft()])}>
        <Plus size={20}/><strong>직접 입력</strong><small>종목명과 수익률만 있으면 돼요.</small></button>
    </div>
    {readErr&&<p className="rt-err" role="alert">{readErr}</p>}
    <p className="rt-hint" style={{marginTop:14}}>{reader?'올린 캡처는 종목을 읽으려고 OpenAI(미국)로 한 번 보내고 저장하지 않아요. 계좌번호·총액은 읽지 않아요.':'로그인하면 캡처를 실제로 읽어요. 지금은 올리면 예시 4종목이 나와요.'}</p>
  </Sheet>;

  return <Sheet kicker={first?'시작 · 확인':'내 종목'} title={`${kept.length}종목`} label="종목 확인" onClose={onClose}
    foot={<button type="button" className="rt-btn primary wide" disabled={(kept.length===0&&staying===0)||over} onClick={plant}>{first?`정원에 넣기 · ${kept.length}종목`:'반영'}</button>}>
    {picker}
    <p className="rt-hint">종목명과 수익률을 확인해 주세요. 보유 기간이 길수록 나무가 커요.</p>
    <ul className="rt-drafts">{rows.map((r,i)=>!r.keep&&r.existing===null?null:<li key={i} className={r.keep?'':'off'}>
      <div className="rt-draft-top">
        <input className="rt-input" value={r.name} placeholder="종목 이름" maxLength={20} aria-label={`${i+1}번 종목 이름`} disabled={!r.keep||r.existing!==null} onChange={e=>edit(i,{name:e.target.value})}/>
        <button type="button" className="rt-icon-btn" aria-label={r.keep?`${r.name||i+1+'번'} 빼기`:`${r.name} 되돌리기`} onClick={()=>edit(i,{keep:!r.keep})}>
          {r.keep?<Strike size={16}/>:'되돌리기'}</button></div>
      {r.keep&&<div className="rt-draft-bottom">
        <label>수익률<input className="rt-input rt-num" type="number" step="0.1" inputMode="decimal" value={Number.isFinite(r.rate)?r.rate:''} aria-label={`${r.name||i+1+'번'} 수익률`}
          onChange={e=>edit(i,{rate:e.target.value===''?0:Number(e.target.value)})}/>%</label>
        {r.existing===null&&<select className="rt-input" value={r.held} aria-label={`${r.name||i+1+'번'} 보유 기간`} onChange={e=>edit(i,{held:e.target.value as HeldId})}>
          {HELD.map(h=><option key={h.id} value={h.id}>{h.label}</option>)}</select>}
      </div>}
    </li>)}</ul>
    <div style={{display:'flex',gap:8,marginTop:10}}>
      <button type="button" className="rt-btn" onClick={()=>setRows(rs=>[...rs!,blankDraft()])}><Plus size={16}/>종목 추가</button>
      <button type="button" className="rt-btn" disabled={reading} onClick={()=>file.current?.click()}><Lens size={16}/>{reading?'읽는 중':'캡처 다시'}</button>
    </div>
    {missing.length>0&&<><div className="rt-section" style={{marginTop:18}}>캡처에 없는 나무</div>
      {missing.map(m=><label key={m.id} className="rt-row" style={{cursor:'pointer'}}>
        <input type="checkbox" checked={gone.includes(m.id)} onChange={e=>setGone(gs=>e.target.checked?[...gs,m.id]:gs.filter(x=>x!==m.id))}/>
        <div><strong>{m.name}</strong><small>정리했으면 체크. 정원에서 뺄게.</small></div></label>)}</>}
    {over&&<p className="rt-hint" style={{marginTop:12,color:'var(--rt-warn)'}}>정원 자리는 {GARDEN_PLOTS}개야. {staying+newOnes-GARDEN_PLOTS}개 빼 줘.</p>}
  </Sheet>;
}
