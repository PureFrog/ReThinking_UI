'use client';
// The drawer's 설정 tab (ux-spec 7장, 8장): sound on or off with a volume each for effects and voices, the music
// waiting for its tracks, and 움직임 줄이기 for the decorative motion.
import type {SoundSettings} from '../core/sound';
import {TEXT_SIZES,TYPE_SPEEDS,type TextSize,type TypeSpeed} from '../core/reading';

export function SettingsTab({sound,onSound,calm,onCalm,follow,onFollow,textSize,onTextSize,typeSpeed,onTypeSpeed}:{sound:SoundSettings;onSound:(s:Partial<SoundSettings>)=>void;calm:boolean;onCalm:(on:boolean)=>void;follow:boolean;onFollow:(on:boolean)=>void;textSize:TextSize;onTextSize:(s:TextSize)=>void;typeSpeed:TypeSpeed;onTypeSpeed:(s:TypeSpeed)=>void}){
 // 8장: three choices in a row, one pressed
 const choice=<T extends string>(label:string,options:{id:T;label:string}[],value:T,on:(v:T)=>void)=><div className="setting-row choice" role="group" aria-label={label}><span>{label}</span><div className="setting-choices">{options.map(o=><button type="button" key={o.id} aria-pressed={value===o.id} className={value===o.id?'selected':''} onClick={()=>on(o.id)}>{o.label}</button>)}</div></div>;
 const slider=(key:'sfx'|'voice',label:string)=><label className="setting-row"><span>{label}</span><input type="range" min={0} max={1} step={.1} value={sound[key]} disabled={!sound.on} aria-label={label} onChange={e=>onSound({[key]:Number(e.target.value)})}/><output>{Math.round(sound[key]*10)}</output></label>;
 return <div className="settings">
  <p className="intro">소리와 글자, 움직임을 내 마음에 맞게 바꿔요.</p>
  {choice('글자 크기',TEXT_SIZES,textSize,onTextSize)}
  {choice('대사 속도',TYPE_SPEEDS,typeSpeed,onTypeSpeed)}
  <label className="setting-row toggle"><span>소리</span><input type="checkbox" role="switch" checked={!!sound.on} onChange={e=>onSound({on:e.target.checked})}/></label>
  {slider('sfx','효과음')}{slider('voice','친구 목소리')}
  <label className="setting-row"><span>배경음</span><input type="range" min={0} max={1} step={.1} value={sound.music} disabled aria-label="배경음"/><small>곡이 오면 들을 수 있어요.</small></label>
  <label className="setting-row toggle"><span>움직임 줄이기</span><input type="checkbox" role="switch" checked={calm} onChange={e=>onCalm(e.target.checked)}/></label>
  <small className="setting-note">켜면 나비·먼지·흔들림 같은 꾸밈 움직임이 멈춰요.</small>
  <label className="setting-row toggle"><span>화면이 나를 따라오기</span><input type="checkbox" role="switch" checked={follow} onChange={e=>onFollow(e.target.checked)}/></label>
  <small className="setting-note">화면은 끌어서 옮기고, 휠이나 두 손가락으로 크게·작게 볼 수 있어요.</small>
 </div>}
