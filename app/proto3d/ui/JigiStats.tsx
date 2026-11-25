'use client';
// The 분석 half of the 일지 tab (지기 J3, prototype "분석"): my graded hypotheses counted by code, in seven parts —
// 요약, 유형 (the style of judging, from what was written — not from hits), 분야·논리, 확신·기간, 판단 변화, 과제 (보완할 점
// from the numbers, each with a task), 학습 후 변화. Every rate shows k/n and its 95% interval; a group
// under 3 verdicts says "추가 관찰 필요". The sentences are rule-based (LLM call C rewords them once the server is in).
// While I have no journals of my own the demo pages stand in, and the screen says so.
import {useEffect,useState} from 'react';
import type {JigiAI} from '../supabase';
import {analyze,afterTask,explainGroups,observe,ends,pc,MIN_N,type Group,type Wilson,type Task} from '../../core/jigi/analysis';
import {HORIZONS,type Journal} from '../../core/jigi/journal';
import type {StudyTask} from '../../core/jigi/points';

const ymd=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const SECS=['요약','유형','분야·논리','확신·기간','판단 변화','과제','학습 후 변화'] as const;
const Ci=({w}:{w:Wilson|null})=>w?<span className="jg-ci" title={`${pc(w.lo)} ~ ${pc(w.hi)}`}><i style={{left:`${w.lo*100}%`,width:`${(w.hi-w.lo)*100}%`}}/><b style={{left:`${w.p*100}%`}}/></span>:null;
// a wide table scrolls sideways by touch, wheel, or dragging with the mouse
function DragX({children}:{children:React.ReactNode}){
  const drag=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerType!=='mouse')return;const el=e.currentTarget,x0=e.clientX,s0=el.scrollLeft;el.classList.add('dragging');
    const move=(m:PointerEvent)=>{el.scrollLeft=s0-(m.clientX-x0)},up=()=>{el.classList.remove('dragging');removeEventListener('pointermove',move);removeEventListener('pointerup',up)};
    addEventListener('pointermove',move);addEventListener('pointerup',up)};
  return <div className="jg-tw" onPointerDown={drag}>{children}</div>;
}
function Table({rows,head}:{rows:Group[];head:string}){
  if(!rows.length)return <p className="rt-empty">아직 기록이 없어요</p>;
  return <DragX><table className="jg-table"><thead><tr><th>{head}</th><th className="n">적중/판정</th><th>95% 구간</th><th className="n">제외</th></tr></thead>
    <tbody>{rows.map(o=><tr key={o.key}><td>{o.key}{o.n>0&&o.n<MIN_N&&<span className="jg-pill wait" style={{marginLeft:4}}>추가 관찰 필요</span>}</td>
      <td className="n rt-num">{o.k}/{o.n}{o.n?<small> · {pc(o.p!)}</small>:<small> · 결과 대기</small>}</td><td>{o.n?<Ci w={o.w}/>:null}</td><td className="n rt-num">{o.ex}</td></tr>)}</tbody></table></DragX>;
}
// 분석 설명 (call C): the rule-based sentence first; signed in, the server may reword it from the same facts (cached per facts)
const said=new Map<string,string|null>();
let AI:JigiAI|null=null;
function Note({text,title}:{text:string;title:string}){
  const key=title+'|'+text,[t,setT]=useState(said.get(key)??null);
  useEffect(()=>{if(!AI||said.has(key))return;said.set(key,null);void AI.explain(title,{관찰:title,계산:text}).then(r=>{said.set(key,r);if(r)setT(r)})},[key]);
  return <p className="jg-llm">{t??text}</p>;
}
const Card=({title,children,note,sug}:{title:string;children?:React.ReactNode;note?:string;sug?:string})=><div className="jg-acard"><h3>{title}</h3>{children}
  {note&&<Note text={note} title={title}/>}{sug&&<p className="jg-sug">{sug}</p>}</div>;

export function JigiStats({ai,journals,today,now,tasks,principles,typeNo,onTask,onPrinciple,onTaskDone,onTaskDrop,onTypeNo,onOpen,onStock,onNew}:{journals:Journal[];today:string;now:number;
  tasks:StudyTask[];principles:{text:string;at:number}[];typeNo:Record<string,boolean>;onTask:(t:Task)=>void;onPrinciple:(text:string)=>void;onTaskDone:(id:string)=>void;onTaskDrop:(id:string)=>void;
  onTypeNo:(id:string)=>void;onOpen:(id:string)=>void;onStock:(code:string)=>void;onNew:()=>void;ai?:JigiAI|null}){
  AI=ai??null;
  const [sec,setSec]=useState(0),[period,setPeriod]=useState(0),[code,setCode]=useState(''),[hz,setHz]=useState('');
  const A=analyze(journals,{now,today,periodDays:period,code:code||undefined,horizon:hz||undefined});
  const stocks=[...new Map(A.journals.concat(journals.filter(j=>j.status==='saved')).filter(j=>j.stock).map(j=>[j.stock!.code,j.stock!.name])).entries()];
  const t0=A.findings[0],dE=ends(A.dom),st=A.style;
  if(!journals.some(j=>j.status==='saved'&&!j.practice))return <Card title="아직 일지가 없어요">
    <p>첫 일지를 쓰면 여기서 판단을 돌아볼 수 있어요.</p><button type="button" className="rt-btn primary" onClick={onNew}>첫 일지 쓰기</button></Card>;
  const open=(ids:string[])=>ids.length?<div className="jg-links" style={{marginTop:8}}>{[...new Set(ids)].map(id=>{const j=journals.find(x=>x.id===id);return j&&<button key={id} type="button" onClick={()=>onOpen(id)}>
    {ymd(j.createdAt).slice(2)} {j.stock?.name}</button>})}</div>:null;
  let body:React.ReactNode;
  if(!A.journals.length)body=<Card title="이 조건에 맞는 일지가 없어요"><p>기간이나 종목 조건을 넓혀 보세요.</p></Card>;
  else if(sec===0)body=!A.n?<Card title="아직 결과가 나온 가설이 없어요"><p>일지 {A.journals.length}편, 결과를 기다리는 가설 {A.wait}개가 있어요. {A.dom.length>0&&<> 지금까지 {A.dom.map(o=>`${o.key} ${o.n+o.ex}개`).join(', ')}를 적었어요.</>}</p></Card>
    :<Card title="내 투자 판단 요약" note={dE?`'${dE[0].key}' 전망은 ${dE[0].k}/${dE[0].n}로 결과가 가장 좋았고, '${dE[1].key}' 전망은 ${dE[1].k}/${dE[1].n}로 가장 자주 빗나갔어요. 전체 적중률 하나로 실력을 말하기는 어렵고, 표본이 적어 구간도 넓어요.`:`판정된 가설이 ${A.n}개라 분야별 차이를 말하기엔 아직 일러요. 기록과 복기를 조금 더 쌓아 보세요.`}>
      <div className="jg-big-row"><span className="jg-big rt-num">{pc(A.k/A.n)}</span><span className="rt-num">{A.k} / {A.n}</span>{A.w&&<span className="rt-hint rt-num">95% 구간 {pc(A.w.lo)}~{pc(A.w.hi)}</span>}</div>
      <Ci w={A.w}/>
      <p className="rt-num rt-hint" style={{marginTop:8}}>일지 {A.journals.length}편 · 판정 {A.n}개 · 결과 대기 {A.wait}개 · 판정불가 {A.voided}개</p>
      <div className="jg-three"><div><b>잘하고 있는 점</b><p>{dE?`'${dE[0].key}' 전망 (${dE[0].k}/${dE[0].n})`:'아직 고르기 어려워요'}</p></div>
        <div><b>먼저 보완할 점</b><p>{t0?t0.task.fix:dE?`'${dE[1].key}' 전망 (${dE[1].k}/${dE[1].n})`:'아직 고르기 어려워요'}</p></div>
        <div><b>이번 과제</b><p>{t0?t0.task.act:'일지를 더 쓰고 복기하기'}</p>{t0&&<button type="button" className="jg-chip" onClick={()=>setSec(5)}>과제 보기</button>}</div></div></Card>;
  // 유형: how I judge, read from what I wrote (the hits are only a side note, they never decide it)
  else if(sec===1)body=st?<Card title={st.name} note={`일지 ${st.journals}편에 쓴 내용으로 정했어요. 맞혔는지는 유형을 정하는 데 쓰지 않아요.${st.enough?'':' 일지가 더 쌓이면 바뀔 수 있어요.'}`}>
      <p>{st.one}</p>
      <dl className="jg-kv" data-testid="jg-style">{st.traits.flatMap(t=>[<dt key={t.key+'l'}>{t.label}</dt>,<dd key={t.key+'v'}><b>{t.value}</b><small className="rt-hint rt-num" style={{display:'block'}}>{t.ev}</small></dd>])}</dl>
      {A.n>0&&<p className="rt-hint rt-num" style={{marginTop:8}}>참고 · 이 기간 판정된 가설 {A.k}/{A.n} 적중</p>}
      <button type="button" className="jg-chip" aria-pressed={!!typeNo.style} onClick={()=>onTypeNo('style')}>{typeNo.style?'다르다고 알려 주셨어요':'내 상황과 달라요'}</button></Card>
    :<Card title="아직 유형을 말하기 어려워요"><p>일지가 {A.journals.length}편이에요. 3편 이상 쌓이면 어떤 스타일로 판단하는지 보여 드릴게요.</p></Card>;
  else if(sec===2){const rE=ends(A.role);body=<>
    <Card title={observe(A.dom,'분야')} note={explainGroups(A.dom)} sug={dE?`'${dE[1].key}'에서 빗나간 일지를 하나 골라, 그때 쓴 자료와 실제 결과를 나란히 적어 보세요.`:undefined}><Table rows={A.dom} head="분야"/>{dE&&open([dE[0].hitJ,dE[1].failJ].filter(Boolean) as string[])}</Card>
    <Card title={observe(A.role,'논리 단계')} note={explainGroups(A.role)} sug={rE?`'${rE[1].key}' 단계의 가설을 쓸 때 앞 단계와 어떻게 이어지는지 한 문장으로 적어 보세요.`:undefined}><Table rows={A.role} head="논리 단계"/></Card></>}
  else if(sec===3)body=<>
    <Card title={observe(A.conf,'확신')} note={explainGroups(A.conf)} sug="확신이 높은 날에는 가장 강한 반대 근거 하나를 남겨 보세요."><Table rows={A.conf} head="확신"/></Card>
    <Card title={observe(A.ment,'마음 상태')} note={explainGroups(A.ment)+' 컨디션 때문이라고 단정할 수는 없어요.'}><Table rows={A.ment} head="마음"/></Card>
    <Card title={observe(A.hz,'기간')} note={explainGroups(A.hz)} sug="빗나간 전망은 방향이 틀렸는지, 시점이 틀렸는지 나눠서 복기해 보세요."><Table rows={A.hz} head="기간"/></Card></>;
  else if(sec===4)body=<>{A.changes.length?A.changes.map(c=><Card key={c.code} title={`${c.name}: ${c.steps.length}번 쓰는 동안 주가 전망 방향을 ${c.flips}번 바꿨어요`}
      note={c.flips?`방향을 바꾼 ${c.flips}번 중 ${c.why}번은 그 일지에 근거가 적혀 있어요. 새 정보 때문인지, 가격이 움직여서인지는 원문을 봐야 구분할 수 있어요.`:'같은 방향을 유지했어요. 그 사이 근거가 그대로였는지, 새로 확인한 게 있었는지 일지를 이어서 읽어 보세요.'}
      sug="생각을 바꿀 때는 무엇을 새로 알게 됐는지 한 문장으로 남겨 보세요.">
      <div className="jg-steps">{c.steps.map(s=><button key={s.id} type="button" onClick={()=>onOpen(s.id)}><span className="rt-num">{ymd(s.day).slice(2)}</span>
        <b className={s.dir==='상승'?'rt-up':s.dir==='하락'?'rt-down':''}>{s.dir||'전망 없음'}</b><small>{s.action} · {s.horizon}</small></button>)}</div>
      <button type="button" className="jg-chip" onClick={()=>onStock(c.code)}>시간 막대로 보기</button></Card>)
    :<Card title="같은 종목을 두 번 이상 쓰면 판단 변화를 보여 드려요"/>}
    {A.reviews.n?<Card title={`복기 ${A.reviews.n}편 중 ${A.reviews.yes}편에서 계획대로 했다고 답했어요`} note="스스로 답한 결과예요. 실제 매매 기록이 없어서 계획과 실행의 차이는 아직 확인할 수 없어요."/>
      :<Card title="계획을 지켰는지는 아직 알 수 없어요"><p>판정이 나온 일지에서 복기를 남기면 보여 드려요.</p></Card>}</>;
  // 과제: what the numbers say to work on (보완할 점), each with one study task
  else if(sec===5)body=A.findings.length?A.findings.map(t=>{const on=tasks.some(x=>x.id===t.task.id),pr=principles.some(x=>x.text===t.task.act);
      return <Card key={t.id} title={`보완할 점 · ${t.name}`} note={t.enough?undefined:'표본이 적어서 기록이 쌓이면 바뀔 수 있어요.'}><p>{t.one}</p><ul className="jg-ev">{t.ev.map(e=><li key={e} className="rt-num">{e}</li>)}</ul>
        <div className="jg-three"><div><b>지키면 좋은 점</b><p>{t.keep}</p></div><div><b>보완할 것</b><p>{t.fix}</p></div><div><b>데이터</b><p>{t.enough?'근거가 충분한 편이에요':'아직 적어서 바뀔 수 있어요'}</p></div></div>
        {open(t.journals)}<dl className="jg-kv"><dt>추천 이유</dt><dd>{t.task.why}</dd><dt>공부할 개념</dt><dd>{t.task.concepts.join(' · ')}</dd>
        <dt>볼 자료</dt><dd>{t.task.src}</dd><dt>실천 과제</dt><dd><b>{t.task.act}</b></dd><dt>확인 방법</dt><dd>{t.task.check}</dd></dl>
        <div className="jg-row" style={{justifyContent:'flex-start',marginTop:10}}><button type="button" className={`rt-btn${on?'':' primary'}`} disabled={on} onClick={()=>onTask(t.task)}>{on?'체크리스트에 있어요':'다음 일지 체크리스트에 추가'}</button>
          <button type="button" className="rt-btn" disabled={pr} onClick={()=>onPrinciple(t.task.act)}>{pr?'내 원칙에 있어요':'내 원칙으로 저장'}</button></div></Card>})
    :<Card title="아직 보완할 점을 고르기 어려워요"><p>판정된 가설이 {A.n}개예요. 분야·확신·기간별로 비교할 만큼 쌓이면 보완할 점과 과제를 골라 드릴게요.</p></Card>;
  else body=tasks.length?tasks.map(t=>{const a=afterTask(journals,t.at,today);
      return <Card key={t.id} title={t.text} note={a.n?`과제를 시작한 뒤 일지 ${a.journals}편을 썼고 ${a.n}개가 판정됐어요. 결과가 달라졌더라도 공부 때문이라고 단정할 수는 없어요.`:`과제를 시작한 뒤 일지 ${a.journals}편을 썼어요. 아직 결과가 없어서 기록 과정의 변화만 보여 드려요.`}>
        <dl className="jg-kv"><dt>시작일</dt><dd className="rt-num">{ymd(t.at)}</dd><dt>공부</dt><dd>{t.done?'완료했다고 표시함':'아직 표시 안 함'}</dd>
          <dt>이후 일지</dt><dd className="rt-num">{a.journals}편 · 반대 근거 {a.counters}편</dd><dt>이후 결과</dt><dd className="rt-num">{a.n?`${a.k} / ${a.n}${a.w?` · 95% 구간 ${pc(a.w.lo)}~${pc(a.w.hi)}`:''}`:'아직 없음'}</dd></dl>
        <div className="jg-row" style={{justifyContent:'flex-start',marginTop:10}}><button type="button" className="rt-btn" disabled={t.done} onClick={()=>onTaskDone(t.id)}>{t.done?'공부 완료':'공부했어요'}</button>
          <button type="button" className="rt-btn" onClick={()=>onTaskDrop(t.id)}>과제 빼기</button></div></Card>})
    :<Card title="아직 고른 과제가 없어요"><p>과제를 체크리스트에 추가하면 그 뒤의 변화를 여기서 보여 드려요.</p><button type="button" className="jg-chip" onClick={()=>setSec(5)}>과제 보러 가기</button></Card>;
  return <div className="jg-stats">
    {A.demoOnly&&<p className="jg-demo-note">예시 기록으로 보여 드려요. 내 일지가 쌓이면 내 기록으로 바뀌어요.</p>}
    <div className="jg-filters">
      <select aria-label="분석 기간" value={period} onChange={e=>setPeriod(Number(e.target.value))}><option value={0}>전체 날짜</option><option value={92}>최근 3개월</option><option value={183}>최근 6개월</option><option value={366}>최근 1년</option></select>
      <select aria-label="종목" value={code} onChange={e=>setCode(e.target.value)}><option value="">전체 종목</option>{stocks.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select>
      <select aria-label="기한별" value={hz} onChange={e=>setHz(e.target.value)}><option value="">모든 기한</option>{Object.keys(HORIZONS).map(h=><option key={h}>{h}</option>)}</select></div>
    <div className="jg-secs" role="tablist" aria-label="분석 항목">{SECS.map((l,i)=><button key={l} type="button" role="tab" aria-selected={sec===i} onClick={()=>setSec(i)}>{l}</button>)}</div>
    {body}
    {principles.length>0&&sec===1&&<Card title="내 원칙"><ul className="jg-ev">{principles.map(p=><li key={p.text}>{p.text}</li>)}</ul></Card>}
    {A.journals.length>0&&<p className="rt-hint rt-num" style={{marginTop:10}}>{ymd(Math.min(...A.journals.map(j=>j.createdAt)))} ~ {ymd(Math.max(...A.journals.map(j=>j.createdAt)))} 일지 기준</p>}
  </div>;
}
