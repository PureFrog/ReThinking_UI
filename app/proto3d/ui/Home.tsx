'use client';
// The home screen cut down to one job (docs/mockups/home.html): one next step over four tabs (정원 · 일지 · 원정 ·
// 더보기), the 일지 that only holds the journal, 더보기 for everything outside the daily loop, and the first-run
// tutorial: a spotlight on the real screen, one sentence at a time.
import {useEffect,useRef,useState} from 'react';
import {Sheet,Face} from './Sheet';
import {screenPoints} from '../screen';
import {CHOICE_LABEL,type Judgment,type Graded,type Mark} from '../../core/judgment';
import {MODEL_INFO,analystById,CURRENCY} from '../../content/analysts';
import type {NextStep} from '../../core/next';
import type {Holding} from '../../core/model';
import type {Signal} from '../../content/signals';

const md=(day:string)=>day.slice(5).replace('-','.');

// 일지: what came back, what to write, what I wrote. Nothing else.
export function JournalSheet({due,signals,judgedToday,holdings,judgments,graded,onGrade,onSignal,onRecords,onClose}:{
  due:{judgment:Judgment;mark:Mark}[];signals:Signal[];judgedToday:(holdingId:number)=>boolean;holdings:Holding[];judgments:Judgment[];graded:Graded[];
  onGrade:(judgmentId:string)=>void;onSignal:(signalId:string)=>void;onRecords:()=>void;onClose:()=>void}){
  const open=signals.filter(s=>!judgedToday(s.holdingId)),closed=signals.filter(s=>judgedToday(s.holdingId));
  const recent=[...judgments].sort((a,b)=>b.day.localeCompare(a.day)).slice(0,5);
  const verdict=(j:Judgment)=>{const gr=graded.filter(x=>x.judgmentId===j.id).at(-1);return gr?(gr.hit?['hit','맞음']:['miss','빗나감']):['wait','채점 대기']};
  const toWrite=due.length+open.length;
  return <Sheet kicker="투자일지" title={toWrite?`할 일 ${toWrite}`:'오늘 할 일 완료'} label="투자일지" onClose={onClose}
    foot={<button type="button" className="rt-btn wide" onClick={onRecords}>지난 일지 전체 · {judgments.length}개</button>}>
    {due.length>0&&<>
      <div className="rt-section rt-jr-sec"><span>채점 결과</span><span>먼저 확인</span></div>
      {due.map(d=><button key={d.judgment.id+d.mark} type="button" className="rt-row" onClick={()=>onGrade(d.judgment.id)}>
        <Face id="luon" name="루온" sm/><div><strong>{d.judgment.name} · {d.mark}일 채점</strong>
          <small>내 판단 {CHOICE_LABEL[d.judgment.choice]} · 확신 {d.judgment.confidence}</small></div><span className="rt-tag signal">결과</span></button>)}</>}
    <div className="rt-section rt-jr-sec"><span>새 신호 · 판단 적기</span><span>{open.length?`신호 ${open.length}건`:'모두 기록함'}</span></div>
    {signals.length===0&&<p className="rt-empty">오늘은 신호가 없어요</p>}
    {[...open,...closed].map(s=>{const a=analystById(s.analyst),h=holdings.find(x=>x.id===s.holdingId);if(!h)return null;
      return <button key={s.id} type="button" className="rt-row" onClick={()=>onSignal(s.id)}>
        <Face id={a.id} name={a.name} sm/><div><strong>{h.name}</strong><small>{a.name} · {MODEL_INFO[s.model].name} · {s.headline}</small></div>
        {judgedToday(s.holdingId)?<span className="rt-tag ok">기록함</span>:<span className={`rt-tag ${s.loss?'signal':''}`}>{s.loss?'신호':'참고'}</span>}</button>})}
    {recent.length>0&&<>
      <div className="rt-section rt-jr-sec"><span>최근 일지</span></div>
      <ul className="rt-jr-past">{recent.map(j=>{const [k,l]=verdict(j);return <li key={j.id}>
        <span className="rt-num">{md(j.day)}</span><span>{j.name} · {CHOICE_LABEL[j.choice]}</span><span className={`rt-jr-v ${k}`}>{l}</span></li>})}</ul></>}
  </Sheet>;
}

// 더보기: everything that is not the daily loop, in four groups, with my numbers on top
export type MoreId='case'|'rewind'|'me'|'drawer'|'league'|'sky'|'holdings'|'settings'|'build'|'cities';
export function MoreSheet({currency,streak,week,dots,onPick,onClose}:{currency:number;streak:number;week:number;dots:Partial<Record<MoreId,boolean>>;onPick:(id:MoreId)=>void;onClose:()=>void}){
  const groups:[string,[MoreId,string,string][]][]=[
    ['매일',[['case','오늘의 케이스','과거 사례 맞히기'],['rewind','되감기','과거 사례로 판단 연습']]],
    ['나',[['me','내 프로필','등급 · 업적 · 월간 리포트'],['drawer','꾸미기','정원 꾸미기 · 상점']]],
    ['정원',[['build','정원 넓히기','부지 · 건물'],['cities','도시 수첩','세계 증시 랜드마크']]],
    ['함께',[['league','리그','이번 주 순위'],['sky','다른 유저','다른 유저의 정원']]],
    ['설정',[['holdings','내 종목','캡처 · 직접 입력'],['settings','설정','소리 · 기울이기 · 튜토리얼']]]];
  return <Sheet kicker="더보기" title="더보기" label="더보기" onClose={onClose}>
    <div className="rt-more-nums" aria-label="내 숫자">
      <span>{CURRENCY} <b className="rt-num" data-testid="currency">{currency}</b></span><span>연속 <b className="rt-num">{streak}일</b></span><span>이번 주 <b className="rt-num">{week}</b></span></div>
    {groups.map(([g,items])=><div key={g}><div className="rt-section">{g}</div>
      <div className="rt-more-grid">{items.map(([id,t,sub])=><button key={id} type="button" className="rt-more-tile" onClick={()=>onPick(id)}>
        <strong>{t}</strong><small>{sub}</small>{dots[id]&&<i aria-label="새 소식"/>}</button>)}</div></div>)}
  </Sheet>;
}

// the one next step (core/next.ts); its kicker opens today's three
export function NextCard({step,tasks,onGo,onToday}:{step:NextStep;tasks:{done:number;total:number};onGo:()=>void;onToday:()=>void}){
  const face=step.kind==='signal'?analystById(step.analyst):analystById('luon');
  const [title,sub,go]:[string,string,string|null]=
    step.kind==='grades'?[`채점 결과 ${step.n}건`,'30일 전 내 판단이 맞았는지 확인해요','확인']:
    step.kind==='signal'?[`${step.name} · 새 신호`,`${face.name} · ${step.headline}`,'기록하기']:
    step.kind==='letter'?[`${step.month} 월간 리포트`,'지난달 내 판단을 정리했어요','보기']:
    step.kind==='case'?['오늘의 케이스','과거 사례 하나를 맞혀 보세요','풀기']:
    ['오늘 할 일 완료','내일 새 신호가 오면 알려 드려요',null];
  return <section className="rt-next" aria-label="다음 할 일">
    <Face id={face.id} name={face.name}/>
    <div className="rt-next-text">
      <button type="button" className="rt-next-k" aria-label={`오늘 할 일 ${tasks.done}/${tasks.total}`} onClick={onToday}>
        다음 할 일 · 오늘 <span className="rt-num">{tasks.done}/{tasks.total}</span></button>
      <strong>{title}</strong><small>{sub}</small></div>
    {go&&<button type="button" className="rt-btn primary rt-next-go" onClick={onGo}>{go}</button>}
  </section>;
}

// The first-run tutorial: four steps on the real screen. Each frame the spotlight follows its target (a tree's screen
// point, the bubble, the 일지 tab, the next-step card); the paper card sits beside it.
type Step={title:string;text:string;target:()=>{x:number;y:number;w:number;h:number;round:boolean}|null};
const rectOf=(sel:string,pad:number)=>{const el=document.querySelector(sel) as HTMLElement|null;const r=el?.getBoundingClientRect();
  if(!el||!r||!r.width||getComputedStyle(el).visibility==='hidden')return null;return {x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2,round:false}};
// trees: the garden's holdings; the first step lights the one nearest the middle of the screen (picked once)
export function Tutorial({trees,onDone}:{trees:number[];onDone:(then:'journal'|null)=>void}){
  const pick=useRef<number|null>(null);
  const treeAt=()=>{const W=innerWidth,H=innerHeight,on=(id:number)=>{const p=screenPoints.get('tree-'+id);return p&&p.visible&&p.x>W*.12&&p.x<W*.88&&p.y>H*.25&&p.y<H*.8?p:null};
    if(pick.current===null||!on(pick.current)){let best=Infinity;for(const id of trees){const p=on(id);if(!p)continue;const d=Math.hypot(p.x-W/2,p.y-H*.45);if(d<best){best=d;pick.current=id}}}
    return pick.current===null?null:on(pick.current)};
  const steps:Step[]=[
    {title:'나무 하나가 종목 하나예요',text:'잎 색이 종목 상태예요. 초록은 양호, 노랑·갈색은 손실 신호가 있다는 뜻이에요.',
      target:()=>{const p=treeAt();if(!p)return null;const r=Math.min(innerWidth,innerHeight)*.17;return {x:p.x-r,y:p.y-r*1.75,w:r*2,h:r*2,round:true}}},
    {title:'분석가가 신호를 알려줘요',text:'토리·모아·루온이 우리 모델이 본 걸 설명해요. 사라, 팔라는 말은 하지 않아요. 판단은 직접 해요.',
      target:()=>rectOf('.rt-bubble[style*="visible"]',8)??rectOf('.rt-bubble',8)},
    {title:'일지에 내 생각을 적어요',text:'종목, 오늘 한 일, 앞으로 어떻게 될지와 그 이유. 일지 탭에서 써요.',target:()=>rectOf('.rt-dock [data-tab="journal"]',2)},
    {title:'정한 기간이 끝나면 판정돼요',text:'주가가 오를지 내릴지 적은 가설은 기간 끝 종가로 자동 판정해요. 결과가 나오면 여기에 떠요.',target:()=>rectOf('.rt-next',6)},
  ];
  const [i,setI]=useState(0),spot=useRef<HTMLDivElement>(null),card=useRef<HTMLDivElement>(null);
  useEffect(()=>{let raf=0;const tick=()=>{const s=spot.current,c=card.current;if(s&&c){const t=steps[i].target(),W=innerWidth,H=innerHeight;
      if(t){Object.assign(s.style,{left:t.x+'px',top:t.y+'px',width:t.w+'px',height:t.h+'px',borderRadius:t.round?'50%':'14px',opacity:'1'})}else s.style.opacity='0';
      const cw=c.offsetWidth,ch=c.offsetHeight,cx=t?t.x+t.w/2:W/2,cy=t?t.y+t.h/2:H/2;let left:number,top:number;
      if(W>H&&W-cw>360){// sideways and wide: beside the target
        left=cx<W/2?Math.min(W-cw-16,(t?t.x+t.w:cx)+24):Math.max(16,(t?t.x:cx)-cw-24);top=Math.max(16,Math.min(H-ch-16,cy-ch/2))}
      else{left=Math.max(16,Math.min(W-cw-16,cx-cw/2));top=cy<H/2?(t?t.y+t.h:cy)+18:(t?t.y:cy)-ch-18;top=Math.max(16,Math.min(H-ch-16,top))}
      c.style.left=left+'px';c.style.top=top+'px'}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[i,trees.join()]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const hk=((window as {__proto3d?:{tutorial?:unknown}}).__proto3d??={} as {tutorial?:unknown});hk.tutorial={step:i+1};return()=>{hk.tutorial=null}},[i]);
  const last=i===steps.length-1;
  return <div className="rt-tut" role="dialog" aria-label="튜토리얼" onPointerDown={e=>e.stopPropagation()}>
    <div ref={spot} className="rt-tut-spot" aria-hidden/>
    <div ref={card} className="rt-tut-card">
      <div className="rt-tut-n"><span className="rt-num">{i+1} / {steps.length}</span><span className="rt-tut-pips" aria-hidden>{steps.map((_,j)=><i key={j} data-on={j<=i}/>)}</span></div>
      <h3>{steps[i].title}</h3><p>{steps[i].text}</p>
      <div className="rt-tut-acts"><button type="button" className="rt-tut-skip" onClick={()=>onDone(null)}>건너뛰기</button>
        <button type="button" className="rt-btn primary" onClick={()=>last?onDone('journal'):setI(i+1)}>{last?'첫 일지 쓰기':'다음'}</button></div>
    </div>
  </div>;
}
