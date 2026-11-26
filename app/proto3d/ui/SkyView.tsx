'use client';
// 다른 정원들 (docs/planets.md) over the sky scene (Sky3D.tsx): a plate saying what this sky is, name tags pinned to the
// planets, a visit sheet for a tapped planet (its judging numbers, trees by state and sector, names only if its owner
// opened them, stamps, one cheer), and my own share setting with a preview of what others get.
import {useEffect,useRef,useState} from 'react';
import {CONDITION_COLOR,CONDITION_SHORT,SHARE_LABEL,presenceOf,type Planet,type Share} from '../../core/planets';
import {screenPoints} from '../screen';
import {Cross} from './Icons';
import {cue} from '../../core/sound';
import {cheer,myCheers,notesOf,addNote,deleteNote,myId,cleanNote,NOTE_MAX,type Note} from '../social';

// 방명록 on a planet (db/migrations/017_social.sql): the newest 30 notes, a short line of my own on someone else's,
// and a delete on the ones I wrote (or, on my planet, any). Only between real players: the examples have none.
function Guestbook({owner,write}:{owner:string;write:boolean}){
  const [notes,setNotes]=useState<Note[]|null>(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState<string|null>(null);
  const load=()=>notesOf(owner).then(n=>setNotes(n??[]));
  useEffect(()=>{setNotes(null);setText('');setErr(null);void load()},[owner]);// eslint-disable-line react-hooks/exhaustive-deps
  const send=async()=>{const b=cleanNote(text);if(!b||busy)return;setBusy(true);setErr(null);
    if(await addNote(owner,b)){setText('');cue('grade-stamp');await load()}else setErr('남기지 못했어요. 잠시 뒤에 다시 해 주세요');setBusy(false)};
  return <div className="sky-book">
    <div className="sky-sec"><span>방명록{notes?` · ${notes.length}`:''}</span></div>
    {write&&<div className="sky-book-in"><input id={`sky-note-${owner}`} type="text" maxLength={NOTE_MAX} value={text} placeholder="한마디 남기기 (80자)" aria-label="방명록 한마디"
      onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send()}}/>
      <button type="button" className="rt-btn primary" disabled={busy||!cleanNote(text)} onClick={()=>void send()}>남기기</button></div>}
    {err&&<p className="sky-note" role="alert">{err}</p>}
    {notes===null?<p className="sky-note">불러오는 중</p>:notes.length?<ul className="sky-notes">{notes.map(n=><li key={n.id}>
      <b>{n.handle}</b><span>{n.body}</span><small className="rt-num">{n.at.slice(5,10).replace('-','.')}</small>
      {n.mine&&<button type="button" className="sky-note-x" aria-label="이 글 지우기" onClick={()=>void deleteNote(n.id).then(ok=>{if(ok)void load()})}>지우기</button>}</li>)}</ul>
    :<p className="sky-note">{write?'아직 남긴 글이 없어요. 첫 한마디를 남겨 보세요':'아직 받은 글이 없어요'}</p>}
  </div>;
}

function Tags({planets,focus,onPick}:{planets:Planet[];focus:string|null;onPick:(id:string)=>void}){
  const box=useRef<HTMLDivElement>(null);
  useEffect(()=>{let id=0;const f=()=>{const el=box.current;if(el)for(const t of Array.from(el.children) as HTMLElement[]){const p=screenPoints.get('planet:'+t.dataset.id);
      if(!p||!p.visible){t.style.opacity='0';continue}t.style.left=p.x+'px';t.style.top=p.y+'px';t.style.opacity=''}id=requestAnimationFrame(f)};id=requestAnimationFrame(f);return()=>cancelAnimationFrame(id)},[]);
  return <div className="sky-tags" ref={box}>{planets.map(p=><button key={p.id} type="button" data-id={p.id} className={`sky-tag${p.me?' me':''}${focus?' dim':''}`} onClick={()=>onPick(p.id)}
    aria-label={p.me?'내 정원':`${p.name}의 정원`}>
    {p.me?<><b>나</b><small>{SHARE_LABEL[p.share]}</small></>:p.sample?<><b>{p.name}</b><small className="rt-num">적중 {p.hit??'—'}%</small></>
      :(()=>{const st=presenceOf(p.seenAt,Date.now());return <><b><i className={`sky-dot${st.online?' on':''}`} aria-hidden/>{p.name}</b><small>{st.online?'온라인':'오프라인'}</small></>})()}</button>)}</div>;
}

export function SkyView({planets,sample,share,focus,week,onPick,onShare,onClose,onLeague}:{planets:Planet[];sample:boolean;share:Share;focus:string|null;week:string;
  onPick:(id:string|null)=>void;onShare:(s:Share)=>void;onClose:()=>void;onLeague?:()=>void}){
  const [privacy,setPrivacy]=useState(false),[cheered,setCheered]=useState<string[]>([]),[received,setReceived]=useState<number|null>(null),[me,setMe]=useState<string|null>(null);
  // real players: who I cheered this week and how many cheered me (kept on the server, one per neighbour per week)
  useEffect(()=>{if(sample)return;let on=true;void myCheers(week).then(c=>{if(on&&c){setCheered(c.given);setReceived(c.received)}});void myId().then(id=>{if(on)setMe(id)});return()=>{on=false}},[sample,week]);
  const doCheer=(id:string)=>{cue('grade-stamp');setCheered(c=>[...c,id]);if(!sample)void cheer(id,week).then(ok=>{if(!ok)setCheered(c=>c.filter(x=>x!==id))})};
  const p=planets.find(x=>x.id===focus&&!x.me)??null;
  const pick=(id:string)=>{const x=planets.find(y=>y.id===id);cue('panel-open');if(x?.me){onPick(null);setPrivacy(true)}else{setPrivacy(false);onPick(id)}};
  return <div className="sky" data-testid="sky">
    <div className="sky-top">
      <div className="sky-plate"><div className="rt-kicker">이번 주 리그 그룹</div><div className="sky-title">다른 유저</div>{sample?<span className="sky-sample">예시 화면 · 입장코드를 넣은 계정으로 로그인하면 실제 유저가 보여요</span>:<span className="sky-sample">입장코드를 넣은 유저 {planets.filter(x=>!x.me).length}명{received!==null?` · 이번 주 받은 응원 ${received}`:''}</span>}</div>
      <div className="sky-right">{onLeague&&<button type="button" className="sky-pill" onClick={onLeague}>리그 순위</button>}<button type="button" className="sky-pill" onClick={()=>{onPick(null);setPrivacy(true)}}>공개 설정 · <b>{SHARE_LABEL[share]}</b></button>
        <button type="button" className="sky-pill" aria-label="닫기" onClick={onClose}><Cross size={16}/></button></div>
    </div>
    <Tags planets={planets} focus={focus} onPick={pick}/>
    {!p&&!privacy&&<div className="sky-hint">행성을 누르면 정원을 볼 수 있어요 · 끌어서 회전</div>}
    <section className={`sky-sheet${p?' on':''}`} aria-label={p?`${p.name}의 정원`:undefined} aria-hidden={!p}>
      {p&&<div className="sky-body">
        <div className="sky-name"><span className="sky-avatar" style={{['--c' as string]:p.color}}/><div>{p.rank&&<span className="sky-seal">{p.rank}</span>}<span className="sky-who">{p.name}</span>
          {!p.sample?(()=>{const st=presenceOf(p.seenAt,Date.now());return <span className={`sky-status${st.online?' on':''}`}><i className={`sky-dot${st.online?' on':''}`} aria-hidden/>{st.label}</span>})():<span className="sky-habit">{p.habit}</span>}</div></div>
        {p.closed?<p className="sky-note sky-closed">{p.name}님은 아직 정원을 공개하지 않았어요. 응원과 방명록은 남길 수 있어요</p>:<>
        <div className="sky-grid"><div><span>적중률</span><b>{p.hit??'—'}<small>%</small></b></div><div><span>확신 보정</span><b>{p.calibration??'—'}</b></div>
          <div><span>챌린지 최고</span><b>{p.best===null?'—':(p.best>0?'+':'')+p.best}</b></div><div><span>업적</span><b>{p.stamps}<small>/15</small></b></div></div>
        <div className="sky-sec"><span>정원 · 나무 {p.trees.length}그루</span><span className="sky-note">{p.share==='open'?'종목명 공개':'종목명 비공개 · 업종만 표시'}</span></div>
        <div className="sky-trees">{p.trees.map((t,k)=><div key={k} className="sky-tree" style={{['--c' as string]:CONDITION_COLOR[t.condition]}}><i/>
          <span>{t.name?<b>{t.name} · </b>:<span className="sky-ink" aria-label="숨긴 종목명"/>}{t.sector}</span><small>{CONDITION_SHORT[t.condition]}</small></div>)}</div>
        <p className="sky-note">금액·수량·수익률·메모는 공개되지 않아요</p></>}
        <div className="sky-row"><button type="button" className="rt-btn" onClick={()=>onPick(null)}>뒤로</button>
          <button type="button" className="rt-btn primary" disabled={cheered.includes(p.id)} onClick={()=>doCheer(p.id)}>{cheered.includes(p.id)?'이번 주 응원함':'응원하기'}</button>
          {cheered.includes(p.id)&&<span className="sky-cheer" aria-hidden>응</span>}</div>
        {sample?<p className="sky-note">예시 행성이라 방명록은 없어요</p>:<Guestbook owner={p.id} write/>}
      </div>}
    </section>
    <section className={`sky-sheet${privacy?' on':''}`} aria-label={privacy?'내 공개 범위':undefined} aria-hidden={!privacy}>
      {privacy&&<div className="sky-body">
        <div className="rt-kicker">내 공개 범위</div><div className="sky-title">다른 유저에게 보이는 내 정원</div>
        <div className="sky-opts" role="radiogroup">{(['off','hide','open'] as Share[]).map(k=><button key={k} type="button" role="radio" aria-checked={share===k} className="sky-opt" onClick={()=>onShare(k)}>
          <span className="dot"/><strong>{k==='hide'?'이름 가림 (기본)':SHARE_LABEL[k]}</strong>
          <small>{k==='off'?'내 정원 내용은 보이지 않아요. 하늘에는 이름과 접속 상태만 있는 빈 행성으로 나와요':k==='hide'?'나무 상태, 업종, 판단 점수, 등급, 업적이 보여요. 종목명은 숨겨요':'위 내용에 종목명까지 보여요'}</small></button>)}</div>
        <div className="sky-sec"><span>항상 비공개</span></div>
        <div className="sky-never">{['금액','수량','수익률','판단 메모','캡처 이미지'].map(x=><span key={x}>{x}</span>)}</div>
        <p className="sky-note">나무 색으로 손익 정도가 대략 드러나요. 이것도 숨기려면 비공개를 고르세요</p>
        {!sample&&me&&<><div className="sky-sec"><span>내 정원에 온 것</span><span className="sky-note">이번 주 응원 {received??0}</span></div><Guestbook owner={me} write={false}/></>}
        <button type="button" className="rt-btn primary wide" onClick={()=>setPrivacy(false)}>뒤로</button>
      </div>}
    </section>
  </div>;
}
