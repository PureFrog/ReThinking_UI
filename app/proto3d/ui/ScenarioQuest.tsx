'use client';
// 시나리오 퀘스트 (PM 설계 "시나리오 퀘스트 상세 설계" 2026-11-22), over the house desk leaned in on. It starts at ① as
// the file is picked in the house; no cover to open again, no lines of 보리's to click through.
//   ① 오늘의 거장     the portrait plate in the middle, then it slides left and the principle shows on the right; 넘기기
//   ② 포트폴리오      rises from below: the alias, the quantity, the start value and why it is exposed; 시작하기
//   ③ 사건            the market stops on the decision day; a rolled newspaper and the other papers land on the desk;
//                     the paper unrolls into pages, the others open to compare; closing them stays on the same day
//   ④ 수첩            the notebook at the right edge slides in when tapped; 보리's question in the margin; 작성 완료
//   ⑤ 통신기          the device comes up in the middle: chart, what is left, 유지 / 매도; 확정 → the market runs on
//   ⑥ 내 성과         my return and the notebook score first, holding on and the total below; 거장은 어떻게 했을까?
//   ⑦ 거장의 결과     the alias turns into the name, the filings of the two quarters; 내 일지 피드백 · 책상으로
// Closing midway keeps everything ('rethink-scenario-v1'); an unconfirmed order is never sent by itself.
import {useEffect,useMemo,useRef,useState} from 'react';
import {SCENARIO_PACKS,type SqPack,type SqDoc} from '../../content/scenario-practice';
import {DIR_LABEL,SELLS,newBook,position,nextStop,leftAfter,result,gradeNote,verdict,filingWord,readBook,lastDay,startValue,type SqBook,type SqDir} from '../../core/scenario';
import {still} from '../still';
import type {CaseFocus} from './CaseDesk';
import {SpotCoach,sqTutorialOn,sqTutorialDone} from './SpotCoach';

const KEY='rethink-scenario-v1';
const load=(p:SqPack,day:string)=>{try{return readBook(JSON.parse(localStorage.getItem(KEY)??'null'),p,day)}catch{return null}};
const save=(b:SqBook)=>{try{localStorage.setItem(KEY,JSON.stringify(b))}catch{/* this visit only */}};
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const pct=(x:number)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(1)}%`;
const speed=()=>{try{return Number(new URLSearchParams(location.search).get('gameSpeed'))||1}catch{return 1}};
// a market day while it runs (ms at 1×), and the beats of the opening
const DAY_MS=140,PORTRAIT_HOLD=1100,SLIDE=480;

export const scenarioOfDay=(day:string)=>SCENARIO_PACKS[0];

function Chart({p,tick}:{p:SqPack;tick:number}){
  const c=p.market.close,lo=Math.min(...c)*0.985,hi=Math.max(...c)*1.015,W=320,H=120,n=c.length-1;
  const x=(i:number)=>i/n*W,y=(v:number)=>H-(v-lo)/(hi-lo)*H;
  const line=c.slice(0,tick+1).map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return <svg className="sq-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${p.market.days[tick]} 종가 ${won(c[tick])}원`}>
    {p.turns.map((t,i)=><line key={i} x1={x(t.day)} x2={x(t.day)} y1={0} y2={H} className="sq-chart-day"/>)}
    <path d={line} className="sq-chart-line"/><circle cx={x(tick)} cy={y(c[tick])} r={3.5} className="sq-chart-dot"/>
  </svg>;
}

export function ScenarioQuest({day,onEnd,onClose,onFocus}:{day:string;onEnd:()=>void;onClose:()=>void;onFocus?:(f:CaseFocus)=>void}){
  const p=useMemo(()=>scenarioOfDay(day),[day]);
  const [b,setB]=useState<SqBook>(()=>load(p,day)??newBook(p.id,day));
  useEffect(()=>save(b),[b]);
  const set=(f:(x:SqBook)=>SqBook)=>setB(x=>f(x));
  const calm=still();
  // ① the portrait: centre first, then left with the principle (automatic); leaving slides both out
  const [beat,setBeat]=useState<'center'|'left'|'out'>(calm?'left':'center');
  useEffect(()=>{if(b.step!=='mentor'||beat!=='center')return;const t=setTimeout(()=>setBeat('left'),PORTRAIT_HOLD);return()=>clearTimeout(t)},[b.step,beat]);
  const [down,setDown]=useState(false);
  const later=(f:()=>void)=>{if(calm)f();else setTimeout(f,SLIDE)};
  // the market runs a day at a time to its stop
  useEffect(()=>{if(b.step!=='run')return;const stop=nextStop(p,b);
    const t=setTimeout(()=>set(x=>{if(x.tick+1>=stop)return {...x,tick:stop,step:x.turn<p.turns.length?'turn':'result',sub:'desk'};return {...x,tick:x.tick+1}}),calm?20:DAY_MS/speed());
    return()=>clearTimeout(t)},[b.step,b.tick]);// eslint-disable-line react-hooks/exhaustive-deps
  // what is open on the desk: the newspaper (with its page) or another paper
  const [open,setOpen]=useState<{paper:number}|{doc:string}|null>(null);
  useEffect(()=>{setOpen(null)},[b.turn,b.step]);
  useEffect(()=>{onFocus?.(b.step==='run'||b.sub==='device'?'board':b.sub==='note'?'note':open?'compare':'docs')},[b.step,b.sub,open]);// eslint-disable-line react-hooks/exhaustive-deps
  // the end is recorded as the results come in (before the reveal is asked for)
  useEffect(()=>{if(b.step==='result'&&!b.ended){set(x=>({...x,ended:true}));onEnd()}},[b.step]);// eslint-disable-line react-hooks/exhaustive-deps
  const turn=p.turns[Math.min(b.turn,p.turns.length-1)];
  const pos=position(p,b.orders,b.tick);
  const res=useMemo(()=>b.step==='result'||b.step==='reveal'||b.step==='feedback'?result(p,b):null,[b.step,b.notes.length,b.orders.length]);// eslint-disable-line react-hooks/exhaustive-deps
  const [scene,setScene]=useState(0);
  // the e2e hook
  useEffect(()=>{const w=window as {__proto3d?:{scenario?:unknown}};(w.__proto3d??={}).scenario={step:b.step,turn:b.turn,sub:b.sub,tick:b.tick,day:p.market.days[b.tick],
    notes:b.notes.length,orders:b.orders.length,ended:b.ended,qty:pos.qty,beat,open:open?('paper' in open?'paper':'doc'):null};return()=>{(w.__proto3d??={}).scenario=null}},[b,beat,open,pos.qty,p]);
  // 시나리오 튜토리얼: the first run is walked through, one lit thing at a time (the first scene fully, then the results)
  const [tut,setTut]=useState(()=>sqTutorialOn());
  const [seen,setSeen]=useState({paper:false,doc:false});
  useEffect(()=>{setSeen({paper:false,doc:false})},[b.turn]);
  useEffect(()=>{if(open)setSeen(s=>'paper' in open?{...s,paper:true}:{...s,doc:true})},[open]);
  useEffect(()=>{if(tut&&b.step==='feedback')sqTutorialDone()},[tut,b.step]);
  const skip=()=>{sqTutorialDone();setTut(false)};
  const coach=tut?tutorialCoach(p,b,beat,open,seen):null;
  const coachEl=coach&&<SpotCoach sel={coach.sel} text={coach.text} onSkip={skip}/>;
  const close=<button type="button" className="rt-btn ghost sq-close" onClick={onClose}>책갈피 끼우고 덮기</button>;

  // ① 오늘의 거장
  if(b.step==='mentor')return <div className="sq" data-step="mentor">{close}
    <section className="sq-mentor" data-beat={beat} aria-label="오늘의 거장">
      <figure className="sq-portrait" aria-label={`${p.mentor.name} 초상 문패`}><span className="sq-plate">{p.mentor.initials}</span>
        <figcaption><small>오늘의 거장</small><b>{p.mentor.name}</b><span>{p.mentor.firm}</span></figcaption></figure>
      <article className="sq-philo" aria-hidden={beat==='center'}>
        <p className="sq-kick">오늘의 원칙</p><h2>{p.mentor.principle}</h2>
        {p.mentor.body.map((t,i)=><p key={i}>{t}</p>)}
        <dl>{p.mentor.lines.map(l=><div key={l.k}><dt>{l.k}</dt><dd>{l.v}</dd></div>)}</dl>
        <p className="sq-note">{p.mentor.note}</p>
        <div className="sq-acts"><button type="button" className="rt-btn primary sq-next" disabled={beat!=='left'} onClick={()=>{setBeat('out');later(()=>{set(x=>({...x,step:'portfolio'}));setBeat('left')})}}>넘기기</button></div>
      </article>
    </section>{coachEl}</div>;

  // ② 오늘의 포트폴리오
  if(b.step==='portfolio')return <div className="sq" data-step="portfolio">{close}
    <section className="sq-portfolio" data-down={down} aria-label="오늘의 포트폴리오">
      <p className="sq-kick">오늘의 포트폴리오 · {p.practice?'가상 연습판':'과거 분기'}</p>
      <table><thead><tr><th>종목</th><th>보유 수량</th><th>시작 평가액</th></tr></thead>
        <tbody><tr><td><b>{p.holding.alias}</b></td><td className="rt-num">{won(p.holding.qty)}주</td><td className="rt-num">{won(startValue(p))}원</td></tr></tbody></table>
      <p>{p.holding.sells}</p><p>{p.holding.exposed}</p>
      <p className="sq-rule">세 번 시장이 멈춰. 그때마다 신문을 읽고 수첩에 쓰고 통신기로 유지·매도를 정해. 주문은 다음 거래일 시가에 체결 · 수수료 0.1%. 결과 점수는 투자일지 70% + 수익률 30%(계속 보유와 비교)야. 회사 이름은 끝나고 공개돼.</p>
      <div className="sq-acts"><button type="button" className="rt-btn primary sq-start" onClick={()=>{setDown(true);later(()=>{setDown(false);set(x=>({...x,step:'run'}))})}}>시작하기</button></div>
    </section>{coachEl}</div>;

  // ⑥ 내 성과
  if(b.step==='result'&&res)return <div className="sq" data-step="result">{close}
    <section className="sq-result" aria-label="내 성과">
      <p className="sq-kick">{p.market.days[lastDay(p)]} 평가일 · {p.holding.alias}</p>
      <div className="sq-big"><div><span>내 투자 수익률</span><b className="rt-num">{pct(res.me)}</b></div><div><span>투자일지 점수</span><b className="rt-num">{res.J}점</b></div></div>
      <div className="sq-small"><div><span>계속 보유 수익률</span><b className="rt-num">{pct(res.hold)}</b></div><div><span>수익률 점수</span><b className="rt-num">{res.R}점</b></div><div><span>종합 점수</span><b className="rt-num">{res.total.toFixed(1)}점</b></div></div>
      <p className="sq-note">종합 = 일지 70% + 수익률 30%. 수익률 점수 = 50 + 5 × (내 수익률 − 계속 보유 수익률), 0~100. 일지 점수는 AI 채점을 붙이기 전의 임시 채점이야.</p>
      <div className="sq-acts"><button type="button" className="rt-btn primary sq-ask-master" onClick={()=>set(x=>({...x,step:'reveal'}))}>거장은 어떻게 했을까?</button></div>
    </section>{coachEl}</div>;

  // ⑦ 거장의 결과
  if(b.step==='reveal'&&res){const f=p.reveal.filing;
    return <div className="sq" data-step="reveal">{close}
    <section className="sq-reveal" aria-label="거장의 결과">
      <p className="sq-kick">{p.mentor.name} · {p.mentor.firm}</p>
      <h2><s>{p.holding.alias}</s> → {p.reveal.name}</h2>
      <p>{p.reveal.what}</p>
      {f&&<table><thead><tr><th>신고 주체</th><th>전분기 ({f.asOf[0]})</th><th>대상 분기 ({f.asOf[1]})</th><th>변화</th></tr></thead>
        <tbody><tr><td>{f.firm}</td><td className="rt-num">{won(f.before)}주</td><td className="rt-num">{won(f.after)}주</td><td>{filingWord(f.before,f.after)}</td></tr></tbody></table>}
      {f&&<p className="sq-note">분기 말 기준일과 실제 공개일은 달라 ({f.public}). 13F로 알 수 있는 건 두 시점의 신고 잔고뿐이고, 거장과 같은 결정을 했는지는 점수에 넣지 않아.</p>}
      <div className="sq-acts"><button type="button" className="rt-btn sq-to-fb" onClick={()=>{setScene(0);set(x=>({...x,step:'feedback'}))}}>내 일지 피드백</button><button type="button" className="rt-btn primary" onClick={onClose}>책상으로</button></div>
    </section>{coachEl}</div>}

  // 내 일지 피드백
  if(b.step==='feedback'&&res){const n=b.notes[scene],g=n?gradeNote(p,scene,n):null,t=p.turns[scene],v=n?verdict(p,scene,n):'hold',fill=res.end.fills.find(x=>x.turn===scene);
    return <div className="sq" data-step="feedback">{close}
    <section className="sq-feedback" aria-label="내 일지 피드백">
      <nav className="sq-tabs" aria-label="장면">{p.turns.map((_,i)=><button key={i} type="button" aria-pressed={scene===i} onClick={()=>setScene(i)}>장면 {i+1}</button>)}</nav>
      {n&&g&&<>
        <p className="sq-kick">{p.market.days[t.day]} · {t.paper.pages[0].title}</p>
        <dl className="sq-fb">
          <div><dt>내 가설</dt><dd>{t.printed.target}이 {t.printed.when}에 {t.printed.base} 대비 <b>{DIR_LABEL[n.dir]}</b>. “{n.reason}”</dd></div>
          <div><dt>주문</dt><dd>{SELLS.find(s=>s[0]===b.orders[scene])?.[1]??'—'}{fill?` · ${p.market.days[fill.day]} 시가 ${won(fill.price)}원에 ${won(fill.qty)}주 체결`:''}</dd></div>
          <div><dt>철학 적용</dt><dd>{t.applies}</dd></div>
          <div><dt>점수</dt><dd>{g.score}점 · 자료 읽기 {Math.round(g.e*40)}/40 · 논리 연결 {Math.round(g.w*60)}/60{g.quoteFact?` · 짚은 사실 “${g.quoteFact}”`:''}</dd></div>
          {g.fix.length>0&&<div><dt>보완점</dt><dd>{g.fix.join(' ')}</dd></div>}
          <div><dt>예측 결과</dt><dd><b className={v==='hit'?'hs-ok':v==='miss'?'hs-no':''}>{v==='hit'?'적중':v==='miss'?'빗나감':'보류'}</b> · {t.actual.note} (±{p.similar}%는 ‘비슷’)</dd></div>
        </dl></>}
      <div className="sq-acts"><button type="button" className="rt-btn" onClick={()=>set(x=>({...x,step:'result'}))}>결과로 돌아가기</button><button type="button" className="rt-btn primary sq-to-desk" onClick={()=>{if(tut)skip();onClose()}}>책상으로</button></div>
    </section>{coachEl}</div>}

  // ③④⑤ the turns, and the market running between them
  const today=p.market.days[b.tick],running=b.step==='run';
  const doc=(id:string):SqDoc|undefined=>turn.docs.find(d=>d.id===id);
  const ready=!!b.draftDir&&b.draftReason.trim().length>=4;
  return <div className="sq" data-step={b.step} data-sub={b.sub}>{close}
    <header className="sq-clock" aria-label="시장 시계"><span className="rt-num">{today}</span><span>{b.tick+1}/{p.market.days.length}거래일</span>
      <span className="rt-num">{p.holding.alias} {won(p.market.close[b.tick])}원 · {won(pos.qty)}주</span>
      {running?<span className="sq-running" role="status">시장이 흐르는 중…</span>:<span className="sq-stop" role="status">장면 {b.turn+1}/3 · 시장이 멈췄어</span>}</header>
    {running&&<div className="sq-board"><Chart p={p} tick={b.tick}/></div>}
    {!running&&b.sub!=='device'&&<section className="sq-desk" aria-label="책상">
      <button type="button" className="sq-roll" aria-label={`${turn.paper.masthead} ${today}자 펼치기`} onClick={()=>setOpen({paper:0})}>
        <b>{turn.paper.masthead}</b><small>{today}</small></button>
      <ul className="sq-docs">{turn.docs.map(d=><li key={d.id}><button type="button" data-kind={d.kind} onClick={()=>setOpen({doc:d.id})}><small>{d.from}</small>{d.title}</button></li>)}</ul>
      {b.sub!=='note'&&<button type="button" className="sq-notebook" aria-label="수첩 펼치기" onClick={()=>set(x=>({...x,sub:'note'}))}><b>수첩</b><small>{b.notes.length}장</small></button>}
    </section>}
    {/* the newspaper unrolled, or a paper picked up */}
    {open&&'paper' in open&&<div className="sq-read" role="dialog" aria-label={turn.paper.masthead}>
      <article className="sq-paper"><header><b>{turn.paper.masthead}</b><small>{today}</small></header>
        <nav className="sq-tabs" aria-label="면">{turn.paper.pages.map((pg,i)=><button key={i} type="button" aria-pressed={open.paper===i} onClick={()=>setOpen({paper:i})}>{pg.name}</button>)}</nav>
        {(()=>{const pg=turn.paper.pages[open.paper];return <><h3>{pg.title}</h3>{pg.body.map((t,i)=><p key={i}>{t}</p>)}
          {pg.table&&<table><thead><tr>{pg.table.head.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{pg.table.rows.map((r,i)=><tr key={i}>{r.map((c,k)=><td key={k}>{c}</td>)}</tr>)}</tbody></table>}</>})()}
        <div className="sq-acts">{open.paper<turn.paper.pages.length-1&&<button type="button" className="rt-btn sq-pg-next" onClick={()=>setOpen({paper:open.paper+1})}>다음 면</button>}<button type="button" className="rt-btn primary sq-fold" onClick={()=>setOpen(null)}>신문 접기</button></div>
      </article></div>}
    {open&&'doc' in open&&(()=>{const d=doc(open.doc);return d?<div className="sq-read" role="dialog" aria-label={d.title}>
      <article className="sq-sheet"><header><small>{d.from}</small><b>{d.title}</b></header>{d.lines.map((t,i)=><p key={i}>{t}</p>)}
        {d.table&&<table><thead><tr>{d.table.head.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{d.table.rows.map((r,i)=><tr key={i}>{r.map((c,k)=><td key={k}>{c}</td>)}</tr>)}</tbody></table>}
        <div className="sq-acts"><button type="button" className="rt-btn primary sq-put" onClick={()=>setOpen(null)}>내려놓기</button></div></article></div>:null})()}
    {/* ④ the notebook */}
    {!running&&b.sub==='note'&&!open&&<section className="sq-note-book" aria-label="수첩">
      <p className="sq-margin"><b>보리</b> {turn.ask}</p>
      {b.notes.length>0&&<div className="sq-past"><p className="sq-kick">지난 장 (읽기만)</p>{b.notes.map((n,i)=><p key={i}><b>장면 {i+1}</b> {DIR_LABEL[n.dir]} · {n.reason} · {SELLS.find(s=>s[0]===b.orders[i])?.[1]}</p>)}</div>}
      <p className="sq-printed">대상 <b>{turn.printed.target}</b> · 확인 시점 <b>{turn.printed.when}</b> · 비교 기준 <b>{turn.printed.base}</b> (±{p.similar}%는 비슷)</p>
      <div className="rt-seg sq-dir" role="radiogroup" aria-label="방향">{(Object.keys(DIR_LABEL) as SqDir[]).map(k=><button key={k} type="button" role="radio" aria-checked={b.draftDir===k} onClick={()=>set(x=>({...x,draftDir:k}))}>{DIR_LABEL[k]}</button>)}</div>
      <div className="sq-compose"><label className="sq-field">이유 한 줄<textarea rows={2} maxLength={200} value={b.draftReason} placeholder="오늘 자료에서 본 것 → 그래서 이렇게 본다" onChange={e=>{const v=e.target.value;set(x=>({...x,draftReason:v}))}}/></label>
      <div className="sq-acts"><button type="button" className="rt-btn ghost" onClick={()=>set(x=>({...x,sub:'desk'}))}>수첩 덮기</button>
        <button type="button" className="rt-btn primary sq-write" disabled={!ready} onClick={()=>set(x=>({...x,notes:[...x.notes,{dir:x.draftDir!,reason:x.draftReason.trim()}],draftDir:null,draftReason:'',sub:'device',sell:null}))}>작성 완료</button></div></div>
    </section>}
    {/* ⑤ the device */}
    {!running&&b.sub==='device'&&<section className="sq-device" aria-label="통신기">
      <p className="sq-kick">{p.holding.alias} · 종목 상세</p>
      <Chart p={p} tick={b.tick}/>
      <p className="sq-qty">현재 {won(pos.qty)}주 · 종가 {won(p.market.close[b.tick])}원</p>
      <div className="sq-order"><div className="rt-seg" role="radiogroup" aria-label="유지 또는 매도">{SELLS.map(([v,l])=><button key={l} type="button" role="radio" aria-checked={b.sell===v} onClick={()=>set(x=>({...x,sell:v}))}>{l}</button>)}</div>
      {b.sell!==null&&<p className="sq-left">예상 잔량 {won(leftAfter(pos.qty,b.sell))}주 · 다음 거래일 시가에 체결돼</p>}
      <div className="sq-acts"><button type="button" className="rt-btn primary sq-confirm" disabled={b.sell===null} onClick={()=>set(x=>({...x,orders:[...x.orders,x.sell!],sell:null,turn:x.turn+1,sub:'desk',step:'run'}))}>확정</button></div></div>
    </section>}
    {coachEl}
  </div>;
}

// the tutorial's one lit thing for where the run is now (null sel: 보리 only talks)
type Seen={paper:boolean;doc:boolean};
export function tutorialCoach(p:SqPack,b:SqBook,beat:'center'|'left'|'out',open:{paper:number}|{doc:string}|null,seen:Seen):{sel:string|null;text:string}|null{
  if(b.step==='mentor')return beat==='center'?{sel:null,text:`시나리오 퀘스트야! 판마다 거장 한 명의 원칙을 배워. 오늘은 ${p.mentor.name}이야.`}
    :beat==='left'?{sel:'.sq-philo',text:`오른쪽이 오늘의 원칙 ‘${p.mentor.principle}’이야. 이 원칙으로 세 장면을 판단할 거야. 읽고 넘기기를 눌러.`}:null;
  if(b.step==='portfolio')return {sel:'.sq-portfolio',text:`이게 네가 들고 있는 종목이야. 회사 이름은 끝날 때까지 가려 둬. 시작하기를 누르면 시장이 흘러.`};
  if(b.step==='run')return b.turn===0?{sel:null,text:'시장이 흐르는 중이야. 판단할 날이 오면 저절로 멈춰.'}
    :b.turn===1?{sel:null,text:'잘했어! 남은 두 장면은 같은 순서야. 이번엔 혼자 해 봐. 결과가 나오면 다시 올게.'}:null;
  if(b.step==='turn'){if(b.turn>0)return null;
    if(open&&'paper' in open)return open.paper<p.turns[0].paper.pages.length-1?{sel:'.sq-pg-next',text:'오늘 신문이야. 다음 면도 넘겨 봐.'}:{sel:'.sq-fold',text:'다 읽었으면 신문을 접어.'};
    if(open)return {sel:'.sq-put',text:'같이 온 자료야. 숫자를 봤으면 내려놓기.'};
    if(b.sub==='desk'){if(!seen.paper)return {sel:'.sq-roll',text:'시장이 멈췄어. 책상에 신문이 왔어. 먼저 펼쳐 봐.'};
      if(!seen.doc&&p.turns[0].docs.length)return {sel:'.sq-docs button',text:'신문 말고 온 자료도 있어. 이것도 열어 봐.'};
      return {sel:'.sq-notebook',text:'다 읽었지? 이제 수첩을 펼쳐서 네 예상을 적자.'}}
    if(b.sub==='note')return !b.draftDir?{sel:'.sq-dir',text:'대상·시점·기준은 위에 적혀 있어. 늘어날지, 비슷할지, 줄어들지 하나 골라.'}
      :{sel:'.sq-compose',text:b.draftReason.trim().length<4?'이유를 한 줄 써. 자료에서 본 사실 하나 → 그래서 이렇게 본다.':'좋아. 다 썼으면 작성 완료를 눌러.'};
    return {sel:'.sq-order',text:b.sell===null?'통신기야. 계속 들고 갈지, 얼마나 팔지 골라. 주문은 다음 거래일 시가에 체결돼.':'남을 수량을 확인하고 확정을 눌러.'}}
  if(b.step==='result')return {sel:'.sq-ask-master',text:'평가일이야. 위가 네 수익률과 일지 점수야. 이제 거장은 어떻게 했는지 보자.'};
  if(b.step==='reveal')return {sel:'.sq-to-fb',text:'가려 둔 회사 이름과 거장의 공시야. 네 일지가 어땠는지도 보자.'};
  if(b.step==='feedback')return {sel:'.sq-feedback',text:'장면마다 점수와 보완점이야. 탭으로 세 장면을 다 봐. 다음 판부턴 혼자야. 책상으로 누르면 끝!'};
  return null;
}
