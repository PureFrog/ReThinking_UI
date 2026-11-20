'use client';
// 사건철 조사대 (PM 설계 2026-11-19 4장), over the house desk leaned in on. The 관측소 판 runs underneath (core/game/play.ts):
//   inner cover        the master's principle and when it applies, the starting holdings and the 판's trading rules
//   market clock+board run / speed / next decision; days go by and the price line draws; it stops on a decision day
// Two steps (2026-11-20): 자료 읽기 = the tray and the compare spot together, 판단 쓰기 = the notebook.
//   left tray          the papers that had arrived by then (headlines, crash and report memos) — nothing later
//   middle             two papers side by side; tapping a line puts it in the notebook as evidence
//   right notebook     direction, reason (+ counter-example, period as mastery grows), keep · 1/8 · 1/4 · 1/2 sell,
//                      판단 확정 → 보리 turns the page and time runs again; earlier pages are read only
//   back of the file   my return · holding on · notebook score · the real company and time; the index tab opens the
//                      page-by-page review
// Closing midway keeps everything in a bookmark ('rethink-casefile-v1'); the end is recorded when the back is opened.
import {useEffect,useMemo,useRef,useState} from 'react';
import type {GamePack} from '../../core/game/pack';
import {company,marketName} from '../../core/game/pack';
import {begin,skipToMoment,startPlay,step,seedOf,type Play} from '../../core/game/play';
import {simulate} from '../../core/game/engine';
import {docsAt,confirmPage,MASTERS,missing,caseResult,boriAsk,masterOf,fscoreLine,DRAFT0,DIRECTION_LABEL,SELL_LABEL,PERIODS,
  type Bookmark,type Doc,type Draft,type Mastery,type Page,type Direction} from '../../core/casefile';
import {GameChart} from '../game/Chart';
import {TIMING} from '../../core/timing';
import {still} from '../still';

const KEY='rethink-casefile-v1';
const readMark=(packId:string,day:string):Bookmark|null=>{try{const b=JSON.parse(localStorage.getItem(KEY)??'null') as Bookmark|null;return b&&b.v===1&&b.packId===packId&&b.day===day?b:null}catch{return null}};
const writeMark=(b:Bookmark)=>{try{localStorage.setItem(KEY,JSON.stringify(b))}catch{/* this visit only */}};
const pct=(x:number)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(1)}%`;
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const speedParam=()=>{try{return Number(new URLSearchParams(location.search).get('gameSpeed'))||1}catch{return 1}};

// where the player is working, for 보리's right paw (설계 9-3): the tray, the compare spot, the notebook, or the board while the clock runs
export type CaseFocus='docs'|'compare'|'note'|'board';
export function CaseDesk({packId,day,mastery,solved,onEnd,onClose,onFocus}:{packId:string;day:string;mastery:Mastery;solved:number;onEnd:()=>void;onClose:()=>void;onFocus?:(f:CaseFocus)=>void}){
  const [pack,setPack]=useState<GamePack|null>(null),[err,setErr]=useState(false);
  useEffect(()=>{let on=true;fetch(`/game/packs/${packId}.json`).then(r=>r.json()).then(p=>{if(on)setPack(p as GamePack)}).catch(()=>on&&setErr(true));return()=>{on=false}},[packId]);
  const [b,setB]=useState<Bookmark|null>(null);
  useEffect(()=>{if(!pack)return;setB(readMark(packId,day)??{v:1,packId,day,master:masterOf(pack.id,solved).id,play:startPlay(pack,seedOf(pack.id,solved)),pages:[],draft:DRAFT0,compare:[null,null],asked:[],cover:true,ended:false})},[pack]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(b)writeMark(b)},[b]);
  const [running,setRunning]=useState(false),[fast,setFast]=useState(false),[tab,setTab]=useState<'read'|'write'>('read'),[spread,setSpread]=useState<1|2>(1),[read,setRead]=useState<string|null>(null);
  const play=b?.play;
  const [area,setArea]=useState<'docs'|'compare'|'note'>('docs');
  useEffect(()=>{setArea(tab==='write'?'note':'docs')},[tab]);
  useEffect(()=>{onFocus?.(running&&play?.phase==='flow'?'board':area)},[running,area,play?.phase]);// eslint-disable-line react-hooks/exhaustive-deps
  // the clock: one trading day per tick while it runs; it stops by itself on a decision day
  useEffect(()=>{if(!pack||!b||!play||play.phase!=='flow'||!running)return;const t=setTimeout(()=>setB(x=>x&&{...x,play:step(pack,x.play)}),TIMING.caseDay/(fast?TIMING.caseFast:1)/speedParam());return()=>clearTimeout(t)},[pack,b,play,running,fast]);
  useEffect(()=>{if(play?.phase!=='flow')setRunning(false)},[play?.phase]);
  // a decision day: the moment's own memo comes onto the compare spot when 보리 is still showing the way (first file)
  const m=play?.moment??null;
  useEffect(()=>{if(!pack||!b||!m)return;setTab('read');if(mastery.guided){const id=`ev:${m.d}:${m.code}`;setB(x=>x&&x.compare[0]!==id?{...x,compare:[id,x.compare[1]]}:x)}},[m?.tick,m?.code]);// eslint-disable-line react-hooks/exhaustive-deps
  // the end: recorded as the back is opened
  useEffect(()=>{if(play?.phase==='reveal'&&b&&!b.ended){setB({...b,ended:true});onEnd()}},[play?.phase]);// eslint-disable-line react-hooks/exhaustive-deps
  const docs=useMemo(()=>pack&&play?docsAt(pack,Math.max(0,play.tick),m?.code??null):[],[pack,play?.tick,m?.code]);// eslint-disable-line react-hooks/exhaustive-deps
  const allDocs=useMemo(()=>pack&&play?docsAt(pack,Math.max(0,play.tick),null,40):[],[pack,play?.tick]);// eslint-disable-line react-hooks/exhaustive-deps
  const docById=(id:string|null)=>id?allDocs.find(d=>d.id===id)??null:null;
  // the e2e hooks
  useEffect(()=>{const w=window as {__proto3d?:{caseFile?:unknown}};(w.__proto3d??={}).caseFile=pack&&b?{phase:b.cover?'cover':b.play.phase,tick:b.play.tick,pages:b.pages.length,ended:b.ended,
    docs:docs.map(d=>d.d),lastDay:pack.days[Math.max(0,b.play.tick)],moment:b.play.moment?{code:b.play.moment.code,kind:b.play.moment.kind}:null}:null;return()=>{(w.__proto3d??={}).caseFile=null}},[pack,b,docs]);
  if(err)return <div className="cd cd-msg"><p>사건철을 펼치지 못했어.</p><button type="button" className="rt-btn" onClick={onClose}>덮기</button></div>;
  if(!pack||!b||!play)return <div className="cd cd-msg" aria-busy><p>보리가 끈을 푸는 중…</p></div>;
  const master=MASTERS.find(x=>x.id===b.master)??masterOf(pack.id,solved);
  const set=(f:(x:Bookmark)=>Bookmark)=>setB(x=>x&&f(x));
  const setDraft=(f:(d:Draft)=>Draft)=>set(x=>({...x,draft:f(x.draft)}));
  const held=pack.companies.filter(c=>c.start==='held');
  const pos=simulate(pack,play.orders,Math.max(0,play.tick)).positions;
  const code=m?.code??held.find(c=>pos[c.code])?.code??held[0].code;
  const slot=(c:string)=>'회사 '+(company(pack,c)?.slot??'?');
  const ask=boriAsk(docById(b.compare[0])??(m?docs[0]:null),mastery.guided&&b.pages.length===0);
  const lack=missing(b.draft,mastery);

  // ── inner cover ──
  if(b.cover)return <div className="cd" data-phase="cover">
    <section className="cd-cover" aria-label="사건철 안쪽 표지">
      <p className="cd-kick">{pack.titleHidden} · {marketName(pack)} · {pack.days.length}거래일</p>
      <h2>오늘의 거장 수업 · {master.name}</h2>
      <blockquote>{master.principle}</blockquote>
      <p className="cd-when"><b>언제 쓰는 원칙</b>{master.when}</p>
      <div className="cd-start"><b>시작 포트폴리오</b>
        <ul>{held.map(c=><li key={c.code}><span>{slot(c.code)}</span>{c.qty.toLocaleString('ko-KR')}주</li>)}<li><span>현금</span>{won(pack.cash)}원</li></ul></div>
      <p className="cd-rule">거래 규칙: 확정한 주문은 다음 거래일 시가에 체결 · 수수료 0.1% · 상·하한가 시가에는 체결되지 않음. 회사 이름은 결말에서 공개돼.</p>
      <div className="cd-acts"><button type="button" className="rt-btn" onClick={onClose}>덮기</button>
        <button type="button" className="rt-btn primary" onClick={()=>set(x=>({...x,cover:false,play:begin(x.play)}))}>표지 젖히기</button></div>
    </section>
  </div>;

  // ── the back of the file ──
  if(play.phase==='reveal'){const r=caseResult(pack,play,b.pages);
    return <div className="cd" data-phase="reveal">
      <section className="cd-back" aria-label="사건철 뒷장">
        <nav className="cd-index" aria-label="색인"><button type="button" aria-pressed={spread===1} onClick={()=>setSpread(1)}>결과</button><button type="button" aria-pressed={spread===2} onClick={()=>setSpread(2)}>장면별 돌아보기</button></nav>
        {spread===1?<>
          <p className="cd-kick">봉한 뒷장 · {pack.titleRevealed}</p>
          <div className="cd-score">
            <div><span>내 수익률</span><b className="rt-num">{pct(r.me)}</b></div>
            <div><span>계속 보유했다면</span><b className="rt-num">{pct(r.hold)}</b></div>
            <div><span>수첩 점수</span><b className="rt-num">{r.score}점</b></div>
          </div>
          <p className="cd-what">{pack.summaryRevealed}</p>
          <table className="cd-held"><thead><tr><th>회사</th><th>실제 종목</th><th>내 보유 변화</th><th>운용사 공시상 보유량</th></tr></thead>
            <tbody>{r.held.map(c=><tr key={c.code}><td>{c.slot}</td><td>{c.name}</td><td className="rt-num">{c.start.toLocaleString('ko-KR')} → {c.end.toLocaleString('ko-KR')}주</td><td className="cd-na">자료 연결 전</td></tr>)}</tbody></table>
          <p className="cd-note">실제 과거 시세·공시로 만든 판이야. 거장의 실제 거래 이유는 출처가 확인된 경우에만 적어.</p>
        </>:<>
          <p className="cd-kick">장면별 돌아보기 · 예측 {r.hits}/{r.verdicts.length}</p>
          <ol className="cd-review">{r.verdicts.map((v,i)=><li key={i}>
            <p className="cd-r-head"><b>{pack.days[v.page.tick]}</b> {company(pack,v.page.code)?.name} · {v.page.kind==='crash'?'급락':'실적'}</p>
            <p>내 문장: “{v.page.reason}” → {DIRECTION_LABEL[v.page.direction]} · {SELL_LABEL.find(s=>s[0]===v.page.sell)?.[1]}</p>
            <p>철학 적용: {master.name} — {master.ask}</p>
            <p>예측 판정: {v.page.days??20}거래일 뒤 {pct(v.move)} → <b className={v.hit?'hs-ok':'hs-no'}>{v.hit?'맞음':'빗나감'}</b></p>
            {v.fix.length>0&&<p className="cd-fix">보완점: {v.fix.join(' ')}</p>}
          </li>)}</ol>
        </>}
        <div className="cd-acts"><button type="button" className="rt-btn primary" onClick={onClose}>사건철 덮기</button></div>
      </section>
    </div>}

  // ── the desk ──
  const day0=pack.days[Math.max(0,play.tick)];
  const ev=(e:{docId:string;line:number})=>b.draft.evidence.some(x=>x.docId===e.docId&&x.line===e.line);
  const toggle=(d:Doc,i:number)=>{if(!m)return;setDraft(x=>ev({docId:d.id,line:i})?{...x,evidence:x.evidence.filter(y=>!(y.docId===d.id&&y.line===i))}:{...x,evidence:[...x.evidence,{docId:d.id,line:i,text:d.lines[i]}]})};
  const place=(id:string)=>{set(x=>{const c=[...x.compare];if(c.includes(id))return x;const at=c[0]===null?0:c[1]===null?1:1;c[at]=id;return {...x,compare:c}});setArea('compare')};
  const confirm=()=>{if(!m||lack.length||!b.draft.direction||b.draft.sell===null)return;
    const r=confirmPage(pack,play,{direction:b.draft.direction,reason:b.draft.reason.trim(),evidence:b.draft.evidence,counter:b.draft.counter.trim(),sell:b.draft.sell,days:b.draft.days});if(!r)return;
    set(x=>({...x,play:r.play,pages:[...x.pages,r.page],draft:DRAFT0,compare:[null,null]}));if(!still())setRunning(true)};
  return <div className="cd" data-phase={play.phase} data-tab={tab}>
    <header className="cd-board" aria-label="시장 시계와 차트 보드">
      <div className="cd-clock"><span className="cd-day rt-num">{day0}</span><span className="cd-tick">{Math.max(0,play.tick)+1}/{pack.days.length}일</span>
        {play.phase==='flow'&&<>
          <button type="button" className="rt-btn" aria-pressed={running} onClick={()=>setRunning(r=>!r)}>{running?'시계 멈추기':'시계 돌리기'}</button>
          <button type="button" className="rt-btn ghost" aria-pressed={fast} onClick={()=>setFast(f=>!f)}>{fast?'빠르게 ×'+TIMING.caseFast:'보통 속도'}</button>
          <button type="button" className="rt-btn ghost" onClick={()=>{setRunning(false);set(x=>({...x,play:skipToMoment(pack,x.play)}))}}>다음 결정일로</button></>}
        {play.phase==='moment'&&<span className="cd-stop" role="status">시계가 멎었어 · {slot(m!.code)} {m!.kind==='crash'?'급락':'실적 발표'}</span>}
        <button type="button" className="rt-btn ghost cd-close" onClick={()=>{setRunning(false);onClose()}}>책갈피 끼우고 덮기</button>
      </div>
      <div className="cd-chart"><GameChart pack={pack} code={code} tick={Math.max(0,play.tick)} label={<span>{slot(code)} · {fscoreLine(pack,code,day0)}</span>}/></div>
    </header>
    <nav className="cd-tabs" aria-label="두 단계">{(['read','write'] as const).map((k,i)=><button key={k} type="button" aria-pressed={tab===k} onClick={()=>setTab(k)}>
      <i>{i+1}</i>{k==='read'?`자료 읽기 · ${docs.length}장`:`판단 쓰기${b.draft.evidence.length?' · 근거 '+b.draft.evidence.length:''}`}</button>)}</nav>
    <section className="cd-tray" aria-label="자료받이" onPointerDown={()=>setArea('docs')}>
      <h3>자료받이 <small>{day0}까지 도착한 것만</small></h3>
      <ul>{docs.map(d=><li key={d.id}><button type="button" data-kind={d.kind} aria-pressed={read===d.id} onClick={()=>setRead(r=>r===d.id?null:d.id)}><small>{d.d} · {d.from}</small>{d.title}</button>
        {read===d.id&&<div className="cd-read"><p>{d.lines.join(' ')}</p><button type="button" className="rt-btn" onClick={()=>{place(d.id);setRead(null)}}>비교 자리에 놓기</button></div>}</li>)}</ul>
    </section>
    <section className="cd-compare" aria-label="비교 자리" onPointerDown={()=>setArea('compare')}>
      <h3>비교 자리 <small>{m?'문장을 짚으면 수첩에 끼워져':'결정일에 근거를 고를 수 있어'}</small></h3>
      {ask&&m&&!b.asked.includes(`${m.tick}:${m.code}:${b.compare[0]}`)&&<p className="cd-ask" role="note"><b>보리</b> {ask}
        <button type="button" className="rt-btn ghost" onClick={()=>set(x=>({...x,asked:[...x.asked,`${m.tick}:${m.code}:${x.compare[0]}`]}))}>응</button></p>}
      <div className="cd-pair">{[0,1].map(i=>{const d=docById(b.compare[i]);return <article key={i} className="cd-doc" data-empty={!d}>
        {d?<><header><small>{d.d} · {d.from}</small><button type="button" aria-label="자료 치우기" onClick={()=>set(x=>{const c=[...x.compare];c[i]=null;return {...x,compare:c}})}>×</button></header>
          <ol>{d.lines.map((l,k)=><li key={k}><button type="button" disabled={!m} aria-pressed={ev({docId:d.id,line:k})} onClick={()=>toggle(d,k)}>{l}</button></li>)}</ol></>
          :<p>{i===0?'자료받이에서 하나 골라 놓아 봐':'옆에 대조할 자료'}</p>}
      </article>})}</div>
      {m&&<button type="button" className="rt-btn primary cd-next" onClick={()=>setTab('write')}>판단 쓰러 가기{b.draft.evidence.length?` · 근거 ${b.draft.evidence.length}줄`:''}</button>}
    </section>
    <section className="cd-note" aria-label="판단 수첩" onPointerDown={()=>setArea('note')}>
      <h3>판단 수첩 <small>{b.pages.length}장 확정</small><button type="button" className="rt-btn ghost cd-back" onClick={()=>setTab('read')}>자료 다시 보기</button></h3>
      {b.pages.length>0&&<details className="cd-past"><summary>앞 장 읽기 ({b.pages.length})</summary>{b.pages.map((p,i)=><p key={i}><b>{pack.days[p.tick]} {slot(p.code)}</b> {DIRECTION_LABEL[p.direction]} · {p.reason} · {SELL_LABEL.find(s=>s[0]===p.sell)?.[1]}</p>)}</details>}
      {m?<div className="cd-page">
        <p className="cd-printed">대상 {slot(m.code)} · {mastery.choosePeriod?<label>확인 기간 <select value={b.draft.days} onChange={e=>setDraft(x=>({...x,days:Number(e.target.value)}))}>{PERIODS.map(n=><option key={n} value={n}>{n}거래일</option>)}</select></label>:<>확인 기간 다음 {b.draft.days}거래일</>}</p>
        <div className="rt-seg cd-dir" role="radiogroup" aria-label="방향">{(Object.keys(DIRECTION_LABEL) as Direction[]).map(k=><button key={k} type="button" role="radio" aria-checked={b.draft.direction===k} onClick={()=>setDraft(x=>({...x,direction:k}))}>{DIRECTION_LABEL[k]}</button>)}</div>
        <label className="cd-field">이유 한 줄<textarea rows={2} value={b.draft.reason} maxLength={200} placeholder={master.ask} onChange={e=>setDraft(x=>({...x,reason:e.target.value}))}/></label>
        {mastery.needCounter&&<label className="cd-field">반례 · 반대로 볼 이유<textarea rows={2} value={b.draft.counter} maxLength={200} onChange={e=>setDraft(x=>({...x,counter:e.target.value}))}/></label>}
        {b.draft.evidence.length>0&&<ul className="cd-ev">{b.draft.evidence.map((e,i)=><li key={i}>“{e.text}”</li>)}</ul>}
        <div className="cd-qty"><p>보유 수량표 · {slot(m.code)} {(pos[m.code]?.qty??0).toLocaleString('ko-KR')}주</p>
          <div className="rt-seg" role="radiogroup" aria-label="남은 주식">{SELL_LABEL.map(([v,l])=><button key={l} type="button" role="radio" aria-checked={b.draft.sell===v} onClick={()=>setDraft(x=>({...x,sell:v}))}>{l}</button>)}</div></div>
        <button type="button" className="rt-btn primary cd-confirm" disabled={lack.length>0} onClick={confirm}>판단 확정</button>
        {lack.length>0&&<p className="cd-lack">남은 칸: {lack.join(' · ')}</p>}
      </div>:<p className="cd-wait">시계를 돌리면 다음 결정일에 멎어. 그때 이 장에 적어.</p>}
    </section>
  </div>;
}
export type {Page,Play};
