'use client';
// 다른 정원들 (docs/planets.md) over the sky scene (Sky3D.tsx): a plate saying what this sky is, name tags pinned to the
// planets, a visit sheet for a tapped planet (its judging numbers, trees by state and sector, names only if its owner
// opened them, stamps, one cheer), and my own share setting with a preview of what others get.
import {useEffect,useRef,useState} from 'react';
import {CONDITION_COLOR,CONDITION_SHORT,SHARE_LABEL,type Planet,type Share} from '../../core/planets';
import {screenPoints} from '../screen';
import {Cross} from './Icons';
import {cue} from '../../core/sound';

function Tags({planets,focus,onPick}:{planets:Planet[];focus:string|null;onPick:(id:string)=>void}){
  const box=useRef<HTMLDivElement>(null);
  useEffect(()=>{let id=0;const f=()=>{const el=box.current;if(el)for(const t of Array.from(el.children) as HTMLElement[]){const p=screenPoints.get('planet:'+t.dataset.id);
      if(!p||!p.visible){t.style.opacity='0';continue}t.style.left=p.x+'px';t.style.top=p.y+'px';t.style.opacity=''}id=requestAnimationFrame(f)};id=requestAnimationFrame(f);return()=>cancelAnimationFrame(id)},[]);
  return <div className="sky-tags" ref={box}>{planets.map(p=><button key={p.id} type="button" data-id={p.id} className={`sky-tag${p.me?' me':''}${focus?' dim':''}`} onClick={()=>onPick(p.id)}
    aria-label={p.me?'내 정원':`${p.name}의 정원`}>
    {p.me?<><b>나</b><small>{SHARE_LABEL[p.share]}</small></>:<><b>{p.name}</b><small className="rt-num">적중 {p.hit??'—'}%</small></>}</button>)}</div>;
}

export function SkyView({planets,sample,share,focus,onPick,onShare,onClose}:{planets:Planet[];sample:boolean;share:Share;focus:string|null;
  onPick:(id:string|null)=>void;onShare:(s:Share)=>void;onClose:()=>void}){
  const [privacy,setPrivacy]=useState(false),[cheered,setCheered]=useState<string[]>([]);
  const p=planets.find(x=>x.id===focus&&!x.me)??null;
  const pick=(id:string)=>{const x=planets.find(y=>y.id===id);cue('panel-open');if(x?.me){onPick(null);setPrivacy(true)}else{setPrivacy(false);onPick(id)}};
  return <div className="sky" data-testid="sky">
    <div className="sky-top">
      <div className="sky-plate"><div className="rt-kicker">이번 주 리그 그룹</div><div className="sky-title">다른 유저</div>{sample&&<span className="sky-sample">예시 데이터 · 서버 연결 전</span>}</div>
      <div className="sky-right"><button type="button" className="sky-pill" onClick={()=>{onPick(null);setPrivacy(true)}}>공개 설정 · <b>{SHARE_LABEL[share]}</b></button>
        <button type="button" className="sky-pill" aria-label="닫기" onClick={onClose}><Cross size={16}/></button></div>
    </div>
    <Tags planets={planets} focus={focus} onPick={pick}/>
    {!p&&!privacy&&<div className="sky-hint">행성을 누르면 정원을 볼 수 있어요 · 끌어서 회전</div>}
    <section className={`sky-sheet${p?' on':''}`} aria-label={p?`${p.name}의 정원`:undefined} aria-hidden={!p}>
      {p&&<div className="sky-body">
        <div className="sky-name"><span className="sky-avatar" style={{['--c' as string]:p.color}}/><div><span className="sky-seal">{p.rank}</span><span className="sky-who">{p.name}</span><span className="sky-habit">{p.habit}</span></div></div>
        <div className="sky-grid"><div><span>적중률</span><b>{p.hit??'—'}<small>%</small></b></div><div><span>확신 보정</span><b>{p.calibration??'—'}</b></div>
          <div><span>챌린지 최고</span><b>{p.best===null?'—':(p.best>0?'+':'')+p.best}</b></div><div><span>업적</span><b>{p.stamps}<small>/15</small></b></div></div>
        <div className="sky-sec"><span>정원 · 나무 {p.trees.length}그루</span><span className="sky-note">{p.share==='open'?'종목명 공개':'종목명 비공개 · 업종만 표시'}</span></div>
        <div className="sky-trees">{p.trees.map((t,k)=><div key={k} className="sky-tree" style={{['--c' as string]:CONDITION_COLOR[t.condition]}}><i/>
          <span>{t.name?<b>{t.name} · </b>:<span className="sky-ink" aria-label="숨긴 종목명"/>}{t.sector}</span><small>{CONDITION_SHORT[t.condition]}</small></div>)}</div>
        <p className="sky-note">금액·수량·수익률·메모는 공개되지 않아요</p>
        <div className="sky-row"><button type="button" className="rt-btn" onClick={()=>onPick(null)}>뒤로</button>
          <button type="button" className="rt-btn primary" disabled={cheered.includes(p.id)} onClick={()=>{cue('grade-stamp');setCheered(c=>[...c,p.id])}}>{cheered.includes(p.id)?'응원함':'응원하기'}</button>
          {cheered.includes(p.id)&&<span className="sky-cheer" aria-hidden>응</span>}</div>
      </div>}
    </section>
    <section className={`sky-sheet${privacy?' on':''}`} aria-label={privacy?'내 공개 범위':undefined} aria-hidden={!privacy}>
      {privacy&&<div className="sky-body">
        <div className="rt-kicker">내 공개 범위</div><div className="sky-title">다른 유저에게 보이는 내 정원</div>
        <div className="sky-opts" role="radiogroup">{(['off','hide','open'] as Share[]).map(k=><button key={k} type="button" role="radio" aria-checked={share===k} className="sky-opt" onClick={()=>onShare(k)}>
          <span className="dot"/><strong>{k==='hide'?'이름 가림 (기본)':SHARE_LABEL[k]}</strong>
          <small>{k==='off'?'다른 유저에게 내 정원이 보이지 않아요. 리그 순위에는 이름만 나와요':k==='hide'?'나무 상태, 업종, 판단 점수, 등급, 업적이 보여요. 종목명은 숨겨요':'위 내용에 종목명까지 보여요'}</small></button>)}</div>
        <div className="sky-sec"><span>항상 비공개</span></div>
        <div className="sky-never">{['금액','수량','수익률','판단 메모','캡처 이미지'].map(x=><span key={x}>{x}</span>)}</div>
        <p className="sky-note">나무 색으로 손익 정도가 대략 드러나요. 이것도 숨기려면 비공개를 고르세요</p>
        <button type="button" className="rt-btn primary wide" onClick={()=>setPrivacy(false)}>뒤로</button>
      </div>}
    </section>
  </div>;
}
