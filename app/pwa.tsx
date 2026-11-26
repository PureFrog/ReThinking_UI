'use client';
// 앱으로 설치 (PWA, 2026-11-26 "앱 위주 서비스라 PWA 먼저"). Registers public/sw.js in a production build only (the dev
// server's hot reload and a service worker fight), and keeps the browser's install offer so a button can show it.
//   Android·PC Chrome/Edge: the browser offers it (beforeinstallprompt) → "앱 설치" opens the browser's own dialog
//   iPhone·iPad Safari: no such offer → the button explains 공유 → 홈 화면에 추가
//   already opened as the installed app (standalone): nothing to offer
import {useEffect,useState} from 'react';

type Offer=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let offer:Offer|null=null;
const listeners=new Set<()=>void>();
const tell=()=>listeners.forEach(f=>f());

export function PwaSetup(){
  useEffect(()=>{
    const onOffer=(e:Event)=>{e.preventDefault();offer=e as Offer;tell()};
    const onInstalled=()=>{offer=null;tell()};
    addEventListener('beforeinstallprompt',onOffer);addEventListener('appinstalled',onInstalled);
    if(process.env.NODE_ENV==='production'&&'serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{/* the site works without it */});
    return()=>{removeEventListener('beforeinstallprompt',onOffer);removeEventListener('appinstalled',onInstalled)};
  },[]);
  return null;
}

export type InstallState='installed'|'offer'|'ios'|'none';
export function installState():InstallState{
  if(typeof window==='undefined')return 'none';
  if(matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone)return 'installed';
  if(offer)return 'offer';
  const ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(ua.includes('Macintosh')&&navigator.maxTouchPoints>1);
  return ios?'ios':'none';
}
export function useInstall(){
  const [st,setSt]=useState<InstallState>('none');
  useEffect(()=>{const f=()=>setSt(installState());f();listeners.add(f);return()=>{listeners.delete(f)}},[]);
  const install=async()=>{if(!offer)return false;const o=offer;await o.prompt();const {outcome}=await o.userChoice;offer=null;tell();return outcome==='accepted'};
  return {state:st,install};
}

// the settings row: what installing does here, and the one step it takes on this phone
export function InstallRow(){
  const {state,install}=useInstall(),[ios,setIos]=useState(false);
  if(state==='installed')return <div className="rt-row"><div><strong>앱으로 쓰는 중</strong><small>홈 화면에서 연 앱이에요</small></div></div>;
  return <div className="rt-field">앱으로 설치 <span className="rt-hint">홈 화면에 아이콘이 생기고, 주소창 없이 전체 화면으로 열려요</span>
    {state==='offer'&&<button type="button" className="rt-btn primary" style={{width:'100%',marginTop:6}} onClick={()=>void install()}>앱 설치</button>}
    {state==='ios'&&<><button type="button" className="rt-btn primary" style={{width:'100%',marginTop:6}} aria-expanded={ios} onClick={()=>setIos(v=>!v)}>설치 방법 보기</button>
      {ios&&<ol className="rt-hint" style={{margin:'8px 0 0',paddingLeft:18,lineHeight:1.7}}><li>Safari 아래쪽(아이패드는 위쪽)의 공유 버튼 <b>⎋</b>을 눌러요</li><li><b>홈 화면에 추가</b>를 골라요</li><li>오른쪽 위 <b>추가</b>를 눌러요</li></ol>}</>}
    {state==='none'&&<span className="rt-hint" style={{display:'block',marginTop:6}}>크롬이나 엣지에서 열면 설치 버튼이 나와요. 이미 설치했다면 홈 화면의 아이콘으로 열어 주세요</span>}
  </div>;
}
