'use client';
// Settings (from my observer's page): how loud the effects are, keeping things still, how big the text is, whether the
// phone's tilt moves the camera, and starting over. Saved with the garden (state.ts settings); applied on <html>
// (data-still, data-text) so every screen follows.
import {useState} from 'react';
import {Sheet} from './Sheet';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;
// tilt: the phone's permission ask (iPhone) lives here; onTutorial plays the first-run tutorial again
export function SettingsSheet({g,onClose,tilt,onTutorial,account,onLogOut,onDelete,onWipe}:{g:G;onClose:()=>void;tilt?:{need:boolean;ask:()=>void};onTutorial?:()=>void;account?:string|null;onLogOut?:()=>void;
  // onDelete: removes the account and everything of it on the server (Play Store asks for this inside the app); onWipe: start over
  onDelete?:()=>Promise<string|null>;onWipe?:()=>void}){
  const st=g.s.settings,[sure,setSure]=useState(false),[del,setDel]=useState<'ask'|'busy'|string|null>(null);
  const set=(p:Partial<typeof st>)=>g.ops.setSettings({...st,...p});
  return <Sheet kicker="설정" title="설정" label="설정" onClose={onClose}>
    <div className="rt-field">소리 <span className="rt-hint">{g.s.sound?'켜짐':'꺼짐'}</span>
      <button type="button" className="rt-btn" style={{width:'100%',marginTop:6}} aria-label={g.s.sound?'소리 끄기':'소리 켜기'} aria-pressed={!g.s.sound} onClick={()=>g.ops.setSound(!g.s.sound)}>{g.s.sound?'소리 끄기':'소리 켜기'}</button></div>
    <label className="rt-field">효과음 크기 <span className="rt-hint">{g.s.sound?`${Math.round(st.sfx*100)}%`:'소리 꺼짐'}</span>
      <input type="range" min={0} max={1} step={0.05} value={st.sfx} aria-label="효과음 크기" onChange={e=>set({sfx:Number(e.target.value)})}/></label>
    <div className="rt-field">글자 크기<div className="rt-seg" role="group" aria-label="글자 크기">
      {([['m','보통'],['l','크게'],['xl','더 크게']] as const).map(([k,l])=><button key={k} type="button" aria-pressed={st.text===k} onClick={()=>set({text:k})}>{l}</button>)}</div></div>
    <label className="rt-row" style={{cursor:'pointer'}}><input type="checkbox" checked={st.still} onChange={e=>set({still:e.target.checked})}/>
      <div><strong>움직임 줄이기</strong><small>애니메이션을 건너뛰어요. 폰의 동작 줄이기 설정을 따라요</small></div></label>
    <label className="rt-row" style={{cursor:'pointer'}}><input type="checkbox" checked={st.tilt} onChange={e=>set({tilt:e.target.checked})}/>
      <div><strong>폰 기울이면 시점 움직이기</strong><small>권한을 묻는 폰은 아래 "기울이기 켜기"도 눌러 주세요</small></div></label>
    {tilt?.need&&<button type="button" className="rt-btn" style={{width:'100%',marginTop:8}} onClick={tilt.ask}>기울이기 켜기</button>}
    {onTutorial&&<button type="button" className="rt-btn" style={{width:'100%',marginTop:14}} onClick={onTutorial}>튜토리얼 다시 보기</button>}
    {onLogOut&&<><div className="rt-section" style={{marginTop:22}}>계정</div>
      <div className="rt-row"><div><strong>{account}</strong><small>로그인됨</small></div><button type="button" className="rt-btn" onClick={onLogOut}>로그아웃</button></div>
      {onDelete&&(del===null?<button type="button" className="rt-link" style={{marginTop:10}} onClick={()=>setDel('ask')}>계정 삭제</button>
        :<div className="rt-quote" role="group" aria-label="계정 삭제 확인"><p>계정과 서버에 저장된 정원, 판단 기록이 모두 지워지고 되돌릴 수 없어요</p>
          {del!=='ask'&&del!=='busy'&&<p className="rt-err" role="alert">{del}</p>}
          <div className="rt-quote-acts"><button type="button" className="rt-btn primary danger" disabled={del==='busy'} onClick={()=>{setDel('busy');void onDelete().then(e=>setDel(e))}}>{del==='busy'?'삭제하는 중…':'계정 삭제하기'}</button>
            <button type="button" className="rt-btn" onClick={()=>setDel(null)}>취소</button></div></div>)}</>}
    <div className="rt-section" style={{marginTop:22}}>초기화</div>
    {!sure?<button type="button" className="rt-btn" style={{width:'100%'}} onClick={()=>setSure(true)}>처음부터 다시 시작</button>
      :<div className="rt-quote"><p>판단 기록, 업적, 꾸미기가 모두 지워지고 되돌릴 수 없어요</p>
        <div className="rt-quote-acts"><button type="button" className="rt-btn primary" onClick={()=>(onWipe??g.ops.wipe)()}>지우고 다시 시작</button>
          <button type="button" className="rt-btn" onClick={()=>setSure(false)}>취소</button></div></div>}
    <p className="rt-hint" style={{marginTop:14}}>모의 데이터로 동작하는 시연 버전이에요. 투자 권유가 아니에요</p>
  </Sheet>;
}
