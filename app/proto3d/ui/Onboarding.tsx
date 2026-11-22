'use client';
// Putting my holdings in the garden (redesign 5장: capture onboarding, carried over from the 2D app). First visit: a
// capture of the brokerage screen, or typing them in, or the demo garden. Later (from the track record): the same list
// to recapture or edit. The rules are app/core/portfolio.ts; reading the picture is app/content/portfolio.ts (mock now).
// Nothing here buys or sells: removing a tree only takes it out of the garden.
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Lens,Plus,Strike} from './Icons';
import {drafts,applyDrafts,freePlots,blankDraft,HELD,matchName,draftToReal,plantReal,type Draft,type HeldId,type RealDraft} from '../../core/portfolio';
import {buyClose,refreshed} from '../../core/real';
import {bars,isReal} from '../../core/jigi/stocks';
import {realToday} from '../../core/model';
import type {RealPrices} from './RealEntry';
import {portfolioReader,kindOf,type ReadHolding} from '../../content/portfolio';
import {fieldPlots} from '../../core/land';
import {UI,line} from '../../content/analysts';
import {Sheet} from './Sheet';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;

// onPlanted: the new trees (W1, they are born in the garden); onDemo: the demo garden was picked instead
// reader: the server's real reading when signed in (a list, or what went wrong); without it the example reader
// onReal: 실제 시세로 넣기 (ui/RealEntry.tsx), when real prices are there (private test)
// real: the KRX names and bars: a captured or typed line whose name is found goes in on real prices (core/real.ts)
export function Onboarding({g,onClose,onPlanted,onDemo,reader,onReal,real,pick=false}:{pick?:boolean;g:G;onClose:()=>void;onPlanted?:(ids:number[],first:boolean)=>void;onDemo?:()=>void;reader?:((f:File)=>Promise<ReadHolding[]|string>)|null;onReal?:(()=>void)|null;real?:RealPrices|null}){
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
  // the open plots (core/land.ts): 14 at first, more with each piece of land opened
  const open=fieldPlots(g.s.built?.land??[],'farm')/* real stocks go in the 밭 only */,cap=open.length;
  const over=staying+newOnes>cap;
  // each new line's stock among the KRX names (undefined: not looked up yet, null: not found → a mock tree)
  const [found,setFound]=useState<Record<string,{code:string;name:string}|null>>({});
  const names=(rows??[]).filter(r=>r.keep&&r.existing===null).map(r=>r.name.trim()).filter(Boolean);
  useEffect(()=>{if(!real)return;const todo=names.filter(n=>!(n in found));if(!todo.length)return;let on=true;
    const t=setTimeout(()=>{void Promise.all(todo.map(async n=>[n,matchName(n,await real.search(n))] as const)).then(r=>{if(on)setFound(f=>({...f,...Object.fromEntries(r)}))})},300);
    return()=>{on=false;clearTimeout(t)}},[real,names.join('|')]);// eslint-disable-line react-hooks/exhaustive-deps
  const [planting,setPlanting]=useState(false);
  const plant=async()=>{
    const clean=kept.map(r=>({...r,name:r.name.trim()}));
    const base=holdings.filter(h=>!removed.includes(h.id));
    // lines found among the KRX names go in on real prices; the rest stay as typed (mock)
    const today=realToday(),onReal=real?clean.filter(r=>r.existing===null&&found[r.name]):[];
    let reals:RealDraft[]=[];
    if(onReal.length){setPlanting(true);await real!.load(onReal.map(r=>found[r.name]!));setPlanting(false);
      reals=onReal.flatMap(r=>{const s=found[r.name]!,d=draftToReal(r,s,today,day=>isReal(s.code)?buyClose(bars(s.code),day)?.c??null:null);return d?[d]:[]})}
    const realNames=new Set(onReal.filter(r=>reals.some(x=>x.code===found[r.name]!.code)).map(r=>r.name));
    const mock=applyDrafts(holdings,clean.filter(r=>!realNames.has(r.name)),removed,freePlots(base,open),kindOf);
    const both=plantReal(mock.holdings,reals,freePlots(mock.holdings,open),kindOf);
    const next=both.holdings.map(h=>h.real&&h.code&&isReal(h.code)?refreshed(h,bars(h.code)):h);
    const out={holdings:next,planted:[...mock.planted,...both.planted]};
    g.ops.setHoldings(out.holdings);
    g.say(first?line(UI.planted,{n:out.holdings.length}):line(UI.replanted,{n:out.holdings.length}));
    if(onPlanted)onPlanted(out.planted.map(h=>h.id),first);else onClose();
  };

  // came from the intro's "캡처 올리기": the picture picker opens straight away (still inside the tap's activation)
  useLayoutEffect(()=>{if(pick&&first)file.current?.click()},[]);// eslint-disable-line react-hooks/exhaustive-deps
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
      {onReal&&<button type="button" className="rt-pick-card" onClick={onReal}>
        <Plus size={20}/><strong>실제 시세로</strong><small>종목·산 날짜·수량만. 가격은 실제 종가로 채워요.</small></button>}
      {/* 유저 워크플로우 1장: not investing yet → an empty list into the room (the virtual field has a free tree) */}
      {first&&<button type="button" className="rt-pick-card" onClick={()=>{g.ops.setHoldings([]);if(onPlanted)onPlanted([],true);else onClose()}}>
        <Strike size={20}/><strong>아직 투자 안 해요</strong><small>빈 목록으로 시작해요. 가상 밭에서 무료 나무로 연습할 수 있어요.</small></button>}
    </div>
    {readErr&&<p className="rt-err" role="alert">{readErr}</p>}
    <p className="rt-hint" style={{marginTop:14}}>{reader?'올린 캡처는 종목을 읽으려고 OpenAI(미국)로 한 번 보내고 저장하지 않아요. 계좌번호·총액은 읽지 않아요.':'로그인하면 캡처를 실제로 읽어요. 지금은 올리면 예시 4종목이 나와요.'}</p>
  </Sheet>;

  return <Sheet kicker={first?'시작 · 확인':'내 종목'} title={`${kept.length}종목`} label="종목 확인" onClose={onClose}
    foot={<button type="button" className="rt-btn primary wide" disabled={(kept.length===0&&staying===0)||over||planting} onClick={()=>void plant()}>{planting?'시세 불러오는 중':first?`정원에 넣기 · ${kept.length}종목`:'반영'}</button>}>
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
      {real&&r.keep&&r.existing===null&&r.name.trim()&&(()=>{const f=found[r.name.trim()];
        return <small className="rt-real-tag" data-real={f?'yes':f===null?'no':'wait'}>{f===undefined?'실제 시세 찾는 중':f?`실제 시세 · ${f.name} ${f.code}${r.price>0?' · 평균단가로':' · 그때 종가로'}`:'실제 시세에 없는 이름이에요 · 모의 시세로 들어가요'}</small>})()}
    </li>)}</ul>
    <div style={{display:'flex',gap:8,marginTop:10}}>
      <button type="button" className="rt-btn" onClick={()=>setRows(rs=>[...rs!,blankDraft()])}><Plus size={16}/>종목 추가</button>
      {onReal&&<button type="button" className="rt-btn" onClick={onReal}><Plus size={16}/>실제 시세로 추가</button>}
      <button type="button" className="rt-btn" disabled={reading} onClick={()=>file.current?.click()}><Lens size={16}/>{reading?'읽는 중':'캡처 다시'}</button>
    </div>
    {missing.length>0&&<><div className="rt-section" style={{marginTop:18}}>캡처에 없는 나무</div>
      {missing.map(m=><label key={m.id} className="rt-row" style={{cursor:'pointer'}}>
        <input type="checkbox" checked={gone.includes(m.id)} onChange={e=>setGone(gs=>e.target.checked?[...gs,m.id]:gs.filter(x=>x!==m.id))}/>
        <div><strong>{m.name}</strong><small>정리했으면 체크. 정원에서 뺄게.</small></div></label>)}</>}
    {over&&<p className="rt-hint" style={{marginTop:12,color:'var(--rt-warn)'}}>정원 자리는 {cap}개예요. {staying+newOnes-cap}개를 빼거나, 지도에서 부지를 넓혀 주세요.</p>}
  </Sheet>;
}
