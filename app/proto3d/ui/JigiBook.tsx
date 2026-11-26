'use client';
// The 일지 tab (docs/jigi.md, prototype "내 투자일기장 | 분석"): my journals by stock, a stock's journals on a time
// bar, drafts, the ones to review, archive and trash, and one journal opened (원문, 당시 차트, 가설과 판정, 손절·청산
// 계획, 수정 이력). Old 판단 records (before 지기) are read-only behind "이전 판단". 분석 comes in J3.
import {useState} from 'react';
import {Sheet} from './Sheet';
import {JigiChart} from './JigiChart';
import {OPTS,byStock,live,ofStock,TRASH_DAYS,type Journal} from '../../core/jigi/journal';
import {VERDICT_LABEL,needsReview,verdict,type Verdict} from '../../core/jigi/hypothesis';
import {JigiHypos} from './JigiHypos';
import {PaperCard,CapsuleShelf,CapsuleOpen,SignalCard} from './JigiFun';
import {priceLegal} from '../../core/jigi/stocks';
import type {JigiAI} from '../supabase';
import type {Hypo,Reflection} from '../../core/jigi/journal';

const DAY=864e5;
const ymd=(ms:number)=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const hm=(ms:number)=>{const d=new Date(ms);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
const won=(n:number)=>n.toLocaleString('ko-KR')+'원';
const pillCls=(s:Verdict['s'])=>s==='hit'?'hit':s==='fail'?'fail':s==='wait'||s==='data'||s==='hold'?'wait':'';
export const Pill=({s,n}:{s:Verdict['s'];n?:number})=><span className={`jg-pill ${pillCls(s)}`}>{VERDICT_LABEL[s]}{n!=null?' '+n:''}</span>;

type View={k:'shelf'}|{k:'stock';code:string}|{k:'list';which:'draft'|'review'|'arch'|'trash'}|{k:'one';id:string;back:View};
// signals: today's analyst notes (a row opens the note, whose button starts a journal); oldDue: grades of the old judgments still to open
export type BookSignal={id:string;name:string;who:string;whoName:string;line:string;loss:boolean;written:boolean};
export function JigiBook({startStock,stockName,startTab='book',journals,today,now,oldCount,signals=[],oldDue=0,onSignal,onOldGrades,openId,renderStats,ai,onHypos,onConfirm,onReflect,onWrite,onNew,onArchive,onTrash,onPurge,onOld,onClose,onOpened}:{startStock?:string|null;stockName?:string|null;startTab?:'book'|'stats';journals:Journal[];today:string;now:number;oldCount:number;signals?:BookSignal[];oldDue?:number;onSignal?:(id:string)=>void;onOldGrades?:()=>void;
  // the 분석 half (ui/JigiStats.tsx), given a way to open a journal or a stock's time bar from it
  renderStats?:(open:(id:string)=>void,stock:(code:string)=>void)=>React.ReactNode;
  // the server's LLM (signed in): hypothesis drafts from my words; without it the rule-based split
  ai?:JigiAI|null;
  openId?:string|null;onHypos?:(id:string,h:Hypo[])=>void;onConfirm?:(id:string,hypoId:string)=>string;onReflect?:(id:string,r:Reflection)=>void;
  onWrite:(id:string)=>void;onNew:(code?:string)=>void;onArchive:(id:string,on:boolean)=>void;onTrash:(id:string,on:boolean)=>void;onPurge:(id:string)=>void;onOld:()=>void;onClose:()=>void;onOpened?:(id:string,hypoId:string)=>void}){
  const [tab,setTab]=useState<'book'|'stats'>(startTab),[view,setView]=useState<View>(openId?{k:'one',id:openId,back:{k:'shelf'}}:startStock?{k:'stock',code:startStock}:{k:'shelf'}),[sel,setSel]=useState<string|null>(null),[purge,setPurge]=useState<string|null>(null);
  const L=live(journals),drafts=L.filter(j=>j.status==='draft'),saved=L.filter(j=>j.status==='saved'&&!j.archivedAt),arch=L.filter(j=>j.archivedAt),trash=journals.filter(j=>j.deletedAt),rev=saved.filter(j=>needsReview(j,today));
  // 피드백 C: a journal is a taped paper card with its capsule's state (ui/JigiFun.tsx)
  let ci=0;const card=(j:Journal,back:View)=><PaperCard key={j.id} j={j} today={today} i={ci++} demo={j.demo} practice={j.practice} onOpen={()=>j.status==='draft'?onWrite(j.id):setView({k:'one',id:j.id,back})}/>;
  const [opening,setOpening]=useState<Journal|null>(null);
  const back=(to:View,label='← 일기장')=><button type="button" className="jg-back" onClick={()=>setView(to)}>{label}</button>;

  let title='내 투자일기장',body:React.ReactNode=null;
  if(tab==='stats'){title='분석';
    body=renderStats?.(id=>{setTab('book');setView({k:'one',id,back:{k:'shelf'}})},code=>{setTab('book');setSel(null);setView({k:'stock',code})})??null}
  else if(view.k==='shelf'){
    const groups=byStock(journals);
    body=<>
      {oldDue>0&&onOldGrades&&<button type="button" className="rt-row" onClick={onOldGrades}><div><strong>이전 판단 채점 결과 {oldDue}건</strong><small>일지 기능이 생기기 전에 적은 판단이에요</small></div><span className="rt-tag signal">결과</span></button>}
      <CapsuleShelf list={rev} onOpen={setOpening}/>
      {signals.length>0&&<><div className="rt-section rt-jr-sec"><span>분석가 신호</span><span>{signals.filter(x=>!x.written).length?`신호 ${signals.filter(x=>!x.written).length}건 · 눌러서 뒤집어요`:'모두 적음'}</span></div>
        <div className="jf-sigs">{signals.map(x=><SignalCard key={x.id} x={x} onWrite={()=>onSignal?.(x.id)}/>)}</div></>}
      <button type="button" className="rt-btn primary wide" style={{marginTop:14}} onClick={()=>onNew()}>{L.some(j=>!j.demo)?'새 일지 쓰기':'첫 일지 쓰기'}</button>
      {drafts.length>0&&<><div className="rt-section">이어 쓰기</div><div className="jg-list">{drafts.slice(-2).reverse().map(j=>card(j,view))}</div></>}
      <div className="rt-section">종목별 일지</div>
      {groups.length?<div className="jg-shelf">{groups.map(gr=><button key={gr.code} type="button" className="jg-stock" onClick={()=>{setSel(null);setView({k:'stock',code:gr.code})}}>
        <strong>{gr.name}</strong><small>일지 {gr.list.length}편 · 최근 {ymd(gr.last).slice(2).replace(/-/g,'.')}</small></button>)}</div>:<p className="rt-empty">아직 일지가 없어요</p>}
      <div className="jg-links">
        
        {drafts.length>0&&<button type="button" onClick={()=>setView({k:'list',which:'draft'})}>작성 중 <b className="rt-num">{drafts.length}</b></button>}
        {arch.length>0&&<button type="button" onClick={()=>setView({k:'list',which:'arch'})}>보관함 <b className="rt-num">{arch.length}</b></button>}
        {trash.length>0&&<button type="button" onClick={()=>setView({k:'list',which:'trash'})}>휴지통 <b className="rt-num">{trash.length}</b></button>}
        {oldCount>0&&<button type="button" onClick={onOld}>이전 판단 <b className="rt-num">{oldCount}</b></button>}
      </div></>}
  else if(view.k==='stock'){const list=ofStock(journals,view.code);
    // 9-5 a stock's page: the date on the left, that day on the right, and a blank line at the bottom to write today
    title=list[0]?.stock?.name??stockName??'종목';
    body=<>{back({k:'shelf'})}
      <p className="rt-hint">{list.length?`일지 ${list.length}편 · ${ymd(list[0].createdAt)}${list.length>1?' → '+ymd(list[list.length-1].createdAt):''}`:'아직 이 종목에 쓴 일지가 없어요'}</p>
      <div className="jg-list jg-page">{list.map(j=>card(j,view))}
        <button type="button" className="jg-today" onClick={()=>onNew(view.code)}><span className="jg-when rt-num">{today.slice(2).replace(/-/g,'.')}</span><span>여기에 오늘 쓰기</span></button></div></>}
  else if(view.k==='list'){const w=view.which;
    title=w==='draft'?'작성 중':w==='review'?'복기할 일지':w==='arch'?'보관함':'휴지통';
    const list=w==='draft'?drafts:w==='review'?rev:w==='arch'?arch:trash;
    body=<>{back({k:'shelf'})}
      {w==='arch'&&<p className="rt-hint">목록에서만 숨겨요. 판정과 통계에는 그대로 들어가요.</p>}
      {!list.length?<p className="rt-empty">비어 있어요</p>:w==='trash'?list.map(j=><div key={j.id} className="jg-trash">
        <strong>{ymd(j.createdAt)} · {j.stock?.name??'종목 미정'}</strong><small>삭제 {ymd(j.deletedAt!)} · {ymd(j.deletedAt!+TRASH_DAYS*DAY)}에 완전히 지워져요</small>
        <div className="jg-row"><button type="button" className="rt-btn" onClick={()=>onTrash(j.id,false)}>복구</button>
          <button type="button" className="rt-btn" onClick={()=>{if(purge===j.id){onPurge(j.id);setPurge(null)}else setPurge(j.id)}}>{purge===j.id?'한 번 더 누르면 영구 삭제':'영구 삭제'}</button></div></div>)
      :<div className="jg-list">{list.map(j=>card(j,view))}</div>}</>}
  else{const j=journals.find(x=>x.id===view.id);
    if(!j){body=<>{back({k:'shelf'})}<p className="rt-empty">일지를 찾지 못했어요</p></>}else{title=`${j.stock?.name??'종목 미정'} · ${j.f.action}`;const f=j.f,x=f.exit,hasExit=!!(x.stop||x.target||x.expire);
    const others=L.filter(o=>o.stock?.code===j.stock?.code&&o.anchor&&o.id!==j.id).map(o=>({date:o.anchor!.date,price:o.anchor!.close}));
    body=<>{back(view.back,view.back.k==='stock'?'← 종목':'← 일기장')}
      <p className="rt-hint rt-num">작성 {ymd(j.createdAt)} {hm(j.createdAt)} · {j.tz}{j.demo?' · 예시 기록':''}{j.archivedAt?' · 보관됨':''}</p>
      <div className="jg-row"><button type="button" className="rt-btn" onClick={()=>onWrite(j.id)}>수정(새 버전)</button>
        <button type="button" className="rt-btn" onClick={()=>onArchive(j.id,!j.archivedAt)}>{j.archivedAt?'보관 해제':'보관'}</button>
        <button type="button" className="rt-btn" onClick={()=>{onTrash(j.id,true);setView(view.back)}}>휴지통으로</button></div>
      <details className="jg-sec" open><summary>원문</summary><dl className="jg-kv">
        <dt>컨디션</dt><dd>몸 {f.phys} · 마음 {f.ment}{f.mood?' · 기분 '+f.mood:''}</dd><dt>이해 정도</dt><dd>{f.understand}</dd><dt>한 일</dt><dd>{f.action}</dd>
        <dt>가설</dt><dd className="jg-orig">{f.hypo}</dd><dt>확신</dt><dd>{f.conf||<span className="rt-mute">미입력</span>}</dd>
        <dt>기간</dt><dd>{f.horizon||'미정'}{f.checkDate&&<span className="rt-hint rt-num"> 다시 볼 날 {f.checkDate}</span>}</dd>
        <dt>이유</dt><dd className="jg-orig">{f.reason}</dd><dt>다시 볼 조건</dt><dd className="jg-orig">{f.recheckUnknown?'아직 모르겠음':f.recheck}</dd>
        {OPTS.filter(([k])=>k!=='exit'&&(f.opt[k]??'').trim()).map(([k,l])=><div key={k} className="jg-kv-row"><dt>{l}</dt><dd className="jg-orig">{f.opt[k]}</dd></div>)}</dl></details>
      {j.stock&&j.anchor&&<details className="jg-sec" open><summary>당시 차트 위치</summary>
        <JigiChart code={j.stock.code} name={j.stock.name} today={today} range={now-j.createdAt>300*DAY?'5년':now-j.createdAt>150*DAY?'1년':'6개월'} marks={[...others,{date:j.anchor.date,price:j.anchor.close,main:true}]}/></details>}
      <details className="jg-sec" open><summary>가설</summary><div>
        <JigiHypos ai={ai} j={j} today={today} newId={()=>'h'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)} onHypos={h=>onHypos?.(j.id,h)}
          onConfirm={hid=>onConfirm?.(j.id,hid)??''} onReflect={r=>onReflect?.(j.id,r)}/></div></details>
      <details className="jg-sec" open={hasExit}><summary>손절·청산 계획</summary>{hasExit?<dl className="jg-kv"><dt>손절 조건</dt><dd>{x.stop||'미정'}</dd><dt>청산 조건</dt><dd>{x.target||'미정'}</dd><dt>기간 만료 시</dt><dd>{x.expire||'미정'}</dd></dl>:<p className="rt-hint">적지 않았어요</p>}</details>
      <details className="jg-sec"><summary>수정 이력</summary><ol className="jg-vers">{j.versions.map((v,i)=><li key={i} className="rt-num">v{i+1} · {ymd(v.at)} {hm(v.at)} · {v.label}</li>)}</ol></details></>}}

  return <Sheet kicker="투자일지" title={title} label="투자일지" onClose={onClose}>
    <div className="rt-seg jg-tabs" role="tablist" aria-label="일지 보기">
      <button type="button" role="tab" aria-selected={tab==='book'} aria-pressed={tab==='book'} onClick={()=>{setTab('book')}}>일기장</button>
      <button type="button" role="tab" aria-selected={tab==='stats'} aria-pressed={tab==='stats'} onClick={()=>setTab('stats')}>분석</button></div>
    {body}
    {opening&&<CapsuleOpen j={opening} today={today} onSeen={ids=>ids.forEach(h=>onOpened?.(opening.id,h))} onClose={()=>setOpening(null)}
      onReview={()=>{const j=opening;setOpening(null);setTab('book');setView({k:'one',id:j.id,back:{k:'shelf'}})}}/>}
    <p className="jg-legal">{priceLegal(startStock?[startStock]:journals.map(x=>x.stock?.code))}</p>
  </Sheet>;
}
