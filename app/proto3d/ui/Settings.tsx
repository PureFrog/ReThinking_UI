'use client';
// Settings (from my observer's page): how loud the effects are, keeping things still, how big the text is, whether the
// phone's tilt moves the camera, and starting over. Saved with the garden (state.ts settings); applied on <html>
// (data-still, data-text) so every screen follows.
import {useState} from 'react';
import {Sheet} from './Sheet';
import type {useGarden} from '../state';
type G=ReturnType<typeof useGarden>;
export function SettingsSheet({g,onClose}:{g:G;onClose:()=>void}){
  const st=g.s.settings,[sure,setSure]=useState(false);
  const set=(p:Partial<typeof st>)=>g.ops.setSettings({...st,...p});
  return <Sheet kicker="설정" title="설정" label="설정" onClose={onClose}>
    <label className="rt-field">효과음 크기 <span className="rt-hint">{g.s.sound?`${Math.round(st.sfx*100)}%`:'소리 꺼짐 · 위쪽 스피커 버튼'}</span>
      <input type="range" min={0} max={1} step={0.05} value={st.sfx} aria-label="효과음 크기" onChange={e=>set({sfx:Number(e.target.value)})}/></label>
    <div className="rt-field">글자 크기<div className="rt-seg" role="group" aria-label="글자 크기">
      {([['m','보통'],['l','크게'],['xl','더 크게']] as const).map(([k,l])=><button key={k} type="button" aria-pressed={st.text===k} onClick={()=>set({text:k})}>{l}</button>)}</div></div>
    <label className="rt-row" style={{cursor:'pointer'}}><input type="checkbox" checked={st.still} onChange={e=>set({still:e.target.checked})}/>
      <div><strong>움직임 줄이기</strong><small>연출을 건너뛰고 끝 화면만 보여줘. 폰 설정이 켜져 있으면 늘 줄여.</small></div></label>
    <label className="rt-row" style={{cursor:'pointer'}}><input type="checkbox" checked={st.tilt} onChange={e=>set({tilt:e.target.checked})}/>
      <div><strong>폰 기울이면 시점 움직이기</strong><small>권한을 묻는 폰은 위쪽 "기울이기 켜기"도 눌러야 해.</small></div></label>
    <div className="rt-section" style={{marginTop:22}}>처음부터</div>
    {!sure?<button type="button" className="rt-btn" style={{width:'100%'}} onClick={()=>setSure(true)}>정원을 처음부터 다시 시작</button>
      :<div className="rt-quote"><p>판단 기록, 도장, 꾸민 옷이 전부 지워지고 되돌릴 수 없어.</p>
        <div className="rt-quote-acts"><button type="button" className="rt-btn primary" onClick={()=>g.ops.wipe()}>지우고 처음부터</button>
          <button type="button" className="rt-btn" onClick={()=>setSure(false)}>그만둘래</button></div></div>}
    <p className="rt-hint" style={{marginTop:14}}>모의 데이터로 돌아가는 시연판이야. 투자 권유가 아니야.</p>
  </Sheet>;
}
