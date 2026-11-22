'use client';
// The editors' screen (/editor; daily_quest_design 7 편집 UI): left the sources and their numbers, middle the Korean
// cards with the alias dictionary, right the scene as a player sees it at a chosen level — and the publish checks
// re-running on every change. It opens a bundle written by tools/content/build-pack.mjs (draft + evidence + what the
// sources returned), so nothing here needs a key; the sample case opens by default. Upload goes to quest-content and
// only works for a signed-in editor; the 운영 tab reads the model-call log and the revision rate.
import '../rethink.css';
import './editor.css';
import {useEffect,useMemo,useState} from 'react';
import {buildPack,gather,llmRevision,publishable,type DraftCard,type EditBundle,type Issue} from '../../core/content/pipeline';
import {fixtureProviders,SOLBIT_DRAFT,SOLBIT_OBSERVATIONS} from '../../content/daily/solbit-sources';
import {FIELD_LABEL,type CardKind,type QuestDef} from '../../core/game/daily/model';
import {SAMPLE_REQUEST} from '../../content/daily/request';
import type {OpsLine} from '../../core/content/ops';
import {supabase,supabaseReady} from '../supabase';
const KINDS:CardKind[]=['재무','공시','회사 설명','뉴스','시장'],RELS=['support','weaken','alt','context'] as const;
const REL_KO:Record<string,string>={support:'지지',weaken:'약화',alt:'대안 설명',context:'맥락'};

export function Editor(){
  // the course is the server's (an editor account fetches it for the preview); with no server, the sample request only
  const [course,setCourse]=useState<QuestDef[]>([SAMPLE_REQUEST]);
  useEffect(()=>{if(!supabaseReady)return;void supabase().functions.invoke('quest-content',{body:{action:'course'}}).then(({data})=>{if(Array.isArray(data?.course))setCourse(data.course)})},[]);
  const [bundle,setBundle]=useState<EditBundle|null>(null),[sc,setSc]=useState(0),[level,setLevel]=useState(1),[tab,setTab]=useState<'edit'|'ops'>('edit'),[msg,setMsg]=useState<string|null>(null);
  useEffect(()=>{void gather(fixtureProviders(),SOLBIT_DRAFT,SOLBIT_OBSERVATIONS).then(g=>setBundle({draft:structuredClone(SOLBIT_DRAFT),observations:SOLBIT_OBSERVATIONS,gathered:g}))},[]);
  const built=useMemo(()=>bundle?buildPack(bundle.draft,bundle.gathered):null,[bundle]);
  if(!bundle||!built)return <main className="ed"><p>자료를 불러오는 중…</p></main>;
  const d=bundle.draft,s=d.scenes[sc],asOf=Date.parse(`${s.date}T${d.sessionClose}`),q=course[Math.min(level,course.length)-1];
  const editCard=(i:number,patch:Partial<DraftCard>)=>setBundle({...bundle,draft:{...d,scenes:d.scenes.map((x,k)=>k!==sc?x:{...x,cards:x.cards.map((c,j)=>j===i?{...c,...patch}:c)})}});
  const editScene=(patch:Partial<typeof s>)=>setBundle({...bundle,draft:{...d,scenes:d.scenes.map((x,k)=>k===sc?{...x,...patch}:x)}});
  const issues=built.issues,errs=issues.filter(i=>i.level==='error'),ok=publishable(issues);
  const open=async(f:File)=>{try{const b=JSON.parse(await f.text()) as EditBundle;if(!b.draft||!b.gathered)throw new Error('bundle');setBundle(b);setSc(0);setMsg(`${f.name}을 열었어요.`)}catch{setMsg('묶음 파일(*.bundle.json)이 아니에요.')}};
  const download=()=>{if(!built.pack)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(built.pack)],{type:'application/json'}));a.download=`${d.packId}-v${d.version}.json`;a.click()};
  const upload=async()=>{if(!supabaseReady){setMsg('서버가 연결되지 않았어요.');return}if(!built.pack||!ok){setMsg('검사 오류가 남아 있어서 올릴 수 없어요.');return}
    const {data,error}=await supabase().functions.invoke('quest-content',{body:{action:'upload',pack:built.pack,report:issues,llm:llmRevision(d)}});
    setMsg(error?'올리지 못했어요(편집자 권한·로그인·같은 버전 여부를 확인해 주세요).':data?.status==='draft'?'초안으로 올렸어요. 다른 승인자가 승인해야 발행할 수 있어요.':'올리지 못했어요.')};
  const at=(i:Issue)=>i.where.startsWith(`장면 ${s.no}`);
  return <main className="ed" data-testid="editor">
    <header className="ed-top"><div><div className="rt-kicker">관측소 편집</div><h1>{d.packId} · v{d.version}{d.sample?' · 예시':''}</h1></div>
      <div className="ed-acts"><label className="rt-btn">묶음 열기<input type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void open(f)}}/></label>
        <button type="button" className="rt-btn" onClick={download} disabled={!built.pack}>팩 내보내기</button>
        <button type="button" className="rt-btn primary" onClick={()=>void upload()} disabled={!ok}>서버에 올리기</button></div></header>
    <div className="rt-tabs" role="tablist">{([['edit','편집'],['ops','운영']] as const).map(([k,l])=><button key={k} type="button" role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {msg&&<p className="rt-hint" role="status">{msg}</p>}
    {tab==='ops'?<Ops/>:<>
      <section className={`ed-report ${ok?'ok':'bad'}`} data-testid="ed-report"><strong>{ok?'발행 가능':`발행 불가 · 오류 ${errs.length}`}</strong> · 경고 {issues.length-errs.length}
        {(() => {const r=llmRevision(d);return r.drafted?<span> · 모델 초안 {r.drafted}장 중 {r.edited}장 고침</span>:null})()}
        <ul>{issues.slice(0,40).map((i,k)=><li key={k} data-level={i.level}>[{i.code}] {i.where}: {i.message}</li>)}</ul></section>
      <nav className="rt-tabs ed-scenes" role="tablist">{d.scenes.map((x,k)=><button key={x.id} type="button" role="tab" aria-selected={sc===k} onClick={()=>setSc(k)}>장면 {x.no} · {x.title}{issues.some(i=>i.level==='error'&&i.where.startsWith(`장면 ${x.no}`))?' ●':''}</button>)}</nav>
      <div className="ed-panes">
        <section className="ed-pane" aria-label="원문과 숫자"><h2>원문 · 숫자</h2>
          <p className="rt-hint">장면 기준 {s.date} 장 마감({d.sessionClose}). 이보다 늦게 공개된 자료는 빨간색이에요.</p>
          {bundle.observations.filter(o=>s.cards.some(c=>c.sourceIds.includes(o.ref.sourceId))).map(o=><div key={o.ref.sourceId} className="ed-src" data-late={Date.parse(o.ref.publishedAt)>asOf}>
            <strong>{o.ref.title}</strong><small>{o.ref.sourceId} · {o.ref.publisher} · 공개 {o.ref.publishedAt} · {o.ref.license}</small>
            <small>{o.value!==undefined?`값 ${o.value}${o.unit??''} (${o.basis??''})`:o.calc?`시세 계산 ${o.calc.series} ${o.calc.from}→${o.calc.to}`:'값 없음'}{o.estimate?' · 추정':''}</small>
            {o.text&&<p>{o.text}</p>}</div>)}
          <h3>가명 사전</h3><ul className="ed-alias">{[[d.instrument.alias,d.instrument.realNames],...(d.others??[]).map(o=>[o.alias,o.realNames] as const)].map(([a,rs])=><li key={a as string}><b>{a as string}</b> ← {(rs as readonly string[]).join(', ')||'(실명 없음)'}</li>)}</ul></section>
        <section className="ed-pane" aria-label="한국어 카드"><h2>한국어 카드</h2>
          <label className="ed-f"><span>질문</span><textarea value={s.ask} rows={2} onChange={e=>editScene({ask:e.target.value})}/></label>
          <label className="ed-f"><span>상황</span><textarea value={s.situation} rows={2} onChange={e=>editScene({situation:e.target.value})}/></label>
          {s.cards.map((c,i)=><div key={c.id} className="ed-card" data-testid={`ed-card-${c.id}`}>
            <div className="ed-row"><b>{c.id}</b><select value={c.kind} onChange={e=>editCard(i,{kind:e.target.value as CardKind})}>{KINDS.map(k=><option key={k}>{k}</option>)}</select>
              <select value={c.rel} onChange={e=>editCard(i,{rel:e.target.value as DraftCard['rel']})}>{RELS.map(r=><option key={r} value={r}>{REL_KO[r]}</option>)}</select>
              {c.llmText!==undefined&&<small className="ed-llm">{c.fact===c.llmText?'모델 초안 · 검수 필요':'모델 초안을 고침'}</small>}</div>
            <label className="ed-f"><span>사실</span><textarea value={c.fact} rows={2} onChange={e=>editCard(i,{fact:e.target.value})}/></label>
            <label className="ed-f"><span>비교 기준</span><input value={c.compare??''} onChange={e=>editCard(i,{compare:e.target.value||undefined})}/></label>
            <label className="ed-f"><span>시점 표시</span><input value={c.when} onChange={e=>editCard(i,{when:e.target.value})}/></label>
            <label className="ed-f"><span>출처 id (쉼표)</span><input value={c.sourceIds.join(',')} onChange={e=>editCard(i,{sourceIds:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
            <label className="ed-f"><span>숫자 주장 (줄마다 문구|출처|값|단위)</span><textarea rows={2} value={c.claims.map(x=>`${x.text}|${x.sourceId}|${x.value}|${x.unit}`).join('\n')}
              onChange={e=>editCard(i,{claims:e.target.value.split('\n').filter(Boolean).map(l=>{const [text,sourceId,value,unit]=l.split('|');return {text:text??'',sourceId:sourceId??'',value:Number(value),unit:unit??''}})})}/></label>
            {issues.filter(x=>at(x)&&x.where.endsWith(c.id)).map((x,k)=><p key={k} className="ed-issue" data-level={x.level}>[{x.code}] {x.message}</p>)}</div>)}</section>
        <section className="ed-pane" aria-label="미리보기"><h2>미리보기</h2>
          <div className="rt-tabs">{course.map((_,i)=>i+1).map(l=><button key={l} type="button" aria-selected={level===l} onClick={()=>setLevel(l)}>Lv.{l}</button>)}</div>
          <div className="ed-phone" data-testid="ed-preview">
            <small>{s.no}/3 · {s.title}</small><h3>{s.target&&s.target!=='A'?d.others?.find(o=>o.slot===s.target)?.alias:d.instrument.alias}</h3>
            <p>{s.situation}</p>
            {s.cards.map(c=><div key={c.id} className={`ed-pcard${level<=2&&s.focus.includes(c.id)?' focus':''}`}><small>{c.kind} · {c.when}{level<=2&&s.focus.includes(c.id)?' · 먼저 볼 자료':''}</small><p>{c.fact}</p>{c.compare&&<small>{c.compare}</small>}</div>)}
            <p className="ed-ask">{s.ask}</p>
            <p className="rt-hint">이 레벨에서 쓰는 칸: {q.fields.map(f=>FIELD_LABEL[f]).join(' · ')}{q.aid?` (대상 ${q.aid.target==='given'?'제공':'선택'} · 기간 ${q.aid.period==='given'?'제공':'선택'} · 방향 선택${s.observe?'':' — 이 장면에 확인할 대상 목록이 없어 자유 작성'})`:''}</p></div></section>
      </div></>}
  </main>;
}

function Ops(){
  const [data,setData]=useState<{since:string;lines:OpsLine[];revision:{drafted:number;edited:number;rate:number|null};recentFailures:{at:string;task:string;model:string;error:string}[]}|null>(null),[err,setErr]=useState<string|null>(null);
  useEffect(()=>{if(!supabaseReady){setErr('서버가 연결되지 않았어요. 서버에 올린 뒤 편집자 계정으로 보면 모델 호출 기록이 보여요.');return}
    void supabase().functions.invoke('quest-content',{body:{action:'ops',days:7}}).then(({data,error})=>{if(error||!data?.lines)setErr('편집자 권한이 있는 계정으로 로그인해야 볼 수 있어요.');else setData(data)})},[]);
  if(err)return <p className="rt-hint" data-testid="ed-ops">{err}</p>;
  if(!data)return <p className="rt-hint">불러오는 중…</p>;
  return <section data-testid="ed-ops"><h2>최근 7일 모델 호출</h2>
    <table className="ed-table"><thead><tr><th>작업</th><th>모델</th><th>호출</th><th>실패율</th><th>평균·중간 지연(ms)</th><th>토큰 입력/출력</th></tr></thead>
      <tbody>{data.lines.map(l=><tr key={l.task+l.model}><td>{l.task}</td><td>{l.model}</td><td>{l.calls}</td><td>{Math.round(l.failRate*100)}%</td><td>{l.avgMs} · {l.p50Ms}</td><td>{l.input} / {l.output}</td></tr>)}</tbody></table>
    <p>편집자 수정률: {data.revision.rate===null?'아직 모델 초안 없음':`${Math.round(data.revision.rate*100)}% (모델 초안 ${data.revision.drafted}장 중 ${data.revision.edited}장 고침)`}</p>
    {data.recentFailures.length>0&&<><h3>최근 실패</h3><ul>{data.recentFailures.map((f,i)=><li key={i}>{f.at} · {f.task} · {f.model} · {f.error}</li>)}</ul></>}</section>;
}
