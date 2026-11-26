'use client';
// The first screens (docs/mockups/landing.html): the landing, log in and sign up, in the app's paper look with the
// rendered logo. Sign up goes on to putting in my holdings, then the tutorial (Proto3D); log in goes to the garden.
// Accounts go through authRepo (server.ts): on this device only until the server is connected, never the password.
import {useEffect,useState} from 'react';
import {Logo} from './Logo';
import {authRepo} from '../server';
import {authNotice,redeemInvite} from '../supabase';
import {CONSENTS,NICK_MAX,checkSignUp,type Account,type ConsentId} from '../../core/auth';
import {useInstall} from '../../pwa';

type View='land'|'login'|'signup';
// owing: an account signed in with Kakao or Google that has not agreed to the terms yet — it only sees that step
// invite: signed in but no invite code yet (private test, db/migrations/007) — it only sees the code step
// onGuest: null hides looking around without an account (open everywhere since 2026-11-23, B2C 기본)
export function Welcome({onAccount,onGuest,owing,invite,onInvited,shot='/brand/shot-home.webp'}:{onAccount:(a:Account,isNew:boolean)=>void;onGuest:(()=>void)|null;owing?:Account|null;invite?:boolean;onInvited?:()=>void;shot?:string}){
  const [view,setView]=useState<View>(()=>{try{const v=new URLSearchParams(location.search).get('welcome');return v==='login'||v==='signup'?v:'land'}catch{return 'land'}});
  if(owing)return <div className="rt-wel" data-testid="welcome" data-view="signup"><ConsentStep account={owing} onDone={a=>onAccount(a,true)}/></div>;
  if(invite)return <div className="rt-wel" data-testid="welcome" data-view="invite"><InviteStep onDone={()=>onInvited?.()}/></div>;
  return <div className="rt-wel" data-testid="welcome" data-view={view}>
    {view==='land'&&<Landing shot={shot} onSignup={()=>setView('signup')} onLogin={()=>setView('login')} onGuest={onGuest}/>}
    {view==='login'&&<LogIn onBack={()=>setView('land')} onSignup={()=>setView('signup')} onDone={a=>onAccount(a,false)}/>}
    {view==='signup'&&<SignUpForm onBack={()=>setView('land')} onLogin={()=>setView('login')} onDone={a=>onAccount(a,true)}/>}
  </div>;
}

// a title screen over the live garden: the logo, one line under it, two buttons and a link, the notice at the foot
function Landing({onSignup,onLogin,onGuest}:{shot:string;onSignup:()=>void;onLogin:()=>void;onGuest:(()=>void)|null}){
  return <section className="rt-wel-title" aria-label="시작">
    <button type="button" className="rt-wel-pill rt-wel-top" onClick={onLogin}>로그인</button>
    <div className="rt-wel-mark"><Logo animate height="var(--logo-h)"/><p className="rt-wel-tag">내 종목으로 키우는 투자 판단 정원</p></div>
    <Notice/>
    <div className="rt-wel-panel">
      <button type="button" className="rt-gbtn green" onClick={onSignup}>시작하기</button>
      <button type="button" className="rt-gbtn light" onClick={onLogin}>로그인</button>
      {onGuest&&<button type="button" className="rt-wel-guest" onClick={onGuest}>가입 없이 둘러보기</button>}
      <LandingInstall/>
    </div>
    <p className="rt-wel-legal">본 서비스는 투자 권유를 목적으로 하지 않으며, 제공되는 정보는 한국거래소 종가 등 과거 데이터와 일부 모의 데이터에 기반한 참고 자료입니다. 투자 판단과 그 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
  </section>;
}

// 앱으로 설치 on the first screen (PWA, app/pwa.tsx): Android·PC Chrome/Edge open the browser's own install dialog;
// iPhone Safari has none, so the button shows the three steps; already installed or no way to install → nothing
function LandingInstall(){
  const {state,install}=useInstall(),[steps,setSteps]=useState(false);
  if(state!=='offer'&&state!=='ios')return null;
  return <div className="rt-wel-install">
    <button type="button" className="rt-wel-pill rt-wel-inst" aria-expanded={state==='ios'?steps:undefined}
      onClick={()=>{if(state==='offer')void install();else setSteps(v=>!v)}}>📲 앱으로 설치</button>
    {state==='ios'&&steps&&<ol className="rt-wel-steps"><li>아래쪽 공유 버튼 <b>⎋</b>을 눌러요</li><li><b>홈 화면에 추가</b>를 골라요</li><li>오른쪽 위 <b>추가</b>를 눌러요</li></ol>}
  </div>;
}

function Social({verb,onError}:{verb:string;onError:(e:string)=>void}){
  const go=async(p:'kakao'|'google')=>{const r=await authRepo.social(p);if(!r.ok&&r.error)onError(r.error)};
  return <div className="rt-wel-social">
    <button type="button" className="rt-gbtn kakao" onClick={()=>go('kakao')}><b>K</b>카카오로 {verb}</button>
    <button type="button" className="rt-gbtn google" onClick={()=>go('google')}><b>G</b>Google로 {verb}</button>
  </div>;
}

function LogIn({onBack,onSignup,onDone}:{onBack:()=>void;onSignup:()=>void;onDone:(a:Account)=>void}){
  const [email,setEmail]=useState(''),[pw,setPw]=useState(''),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const submit=async()=>{setBusy(true);const r=await authRepo.logIn(email,pw);setBusy(false);if(r.ok)onDone(r.account);else setErr(r.error)};
  return <section className="rt-wel-auth" aria-label="로그인">
    <button type="button" className="rt-wel-back" onClick={onBack}>‹ 처음으로</button>
    <Logo height={64}/>
    <form className="rt-wel-card" onSubmit={e=>{e.preventDefault();void submit()}}>
      <h2>로그인</h2>
      <label className="rt-wel-field">이메일<input type="email" aria-label="이메일" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label className="rt-wel-field">비밀번호<input type="password" aria-label="비밀번호" autoComplete="current-password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="8자 이상"/></label>
      {err&&<p className="rt-wel-err" role="alert">{err}</p>}
      <button type="submit" className="rt-gbtn green" disabled={busy}>로그인</button>
      <div className="rt-wel-or">또는</div>
      <Social verb="계속하기" onError={setErr}/>
      <div className="rt-wel-links"><span>비밀번호 찾기</span><button type="button" onClick={onSignup}>회원가입</button></div>
    </form>
    {authRepo.local&&<p className="rt-wel-fine">서버 연결 전이라 이 기기에서 가입한 계정만 로그인돼요</p>}
  </section>;
}

function SignUpForm({onBack,onLogin,onDone}:{onBack:()=>void;onLogin:()=>void;onDone:(a:Account)=>void}){
  const [email,setEmail]=useState(''),[pw,setPw]=useState(''),[nick,setNick]=useState('');
  const [agree,setAgree]=useState<ConsentId[]>([]),[tried,setTried]=useState(false),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const errors=checkSignUp({email,password:pw,nickname:nick,consents:agree});
  const show=(k:keyof typeof errors)=>tried?errors[k]:undefined;
  const allOn=CONSENTS.every(c=>agree.includes(c.id));
  const toggle=(id:ConsentId)=>setAgree(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);
  const submit=async()=>{setTried(true);if(Object.keys(errors).length)return;setBusy(true);
    const r=await authRepo.signUp({email,password:pw,nickname:nick,consents:agree});setBusy(false);if(r.ok)onDone(r.account);else setErr(r.error)};
  return <section className="rt-wel-auth" aria-label="회원가입">
    <button type="button" className="rt-wel-back" onClick={onBack}>‹ 처음으로</button>
    <Logo height={64}/>
    <form className="rt-wel-card" onSubmit={e=>{e.preventDefault();void submit()}} noValidate>
      <h2>회원가입</h2>
      <label className="rt-wel-field">이메일<input type="email" aria-label="이메일" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!show('email')}/>
        {show('email')&&<span className="rt-wel-err">{show('email')}</span>}</label>
      <label className="rt-wel-field">비밀번호<input type="password" aria-label="비밀번호" autoComplete="new-password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="8자 이상, 문자와 숫자" aria-invalid={!!show('password')}/>
        {show('password')&&<span className="rt-wel-err">{show('password')}</span>}</label>
      <label className="rt-wel-field">닉네임<input aria-label="닉네임" value={nick} maxLength={NICK_MAX} onChange={e=>setNick(e.target.value)} placeholder="다른 유저에게 보이는 이름" aria-invalid={!!show('nickname')}/>
        {show('nickname')&&<span className="rt-wel-err">{show('nickname')}</span>}</label>
      <fieldset className="rt-wel-agree">
        <legend className="sr-only">약관 동의</legend>
        <label className="all"><input type="checkbox" checked={allOn} onChange={()=>setAgree(allOn?[]:CONSENTS.map(c=>c.id))}/>모두 동의</label>
        {CONSENTS.map(c=><label key={c.id}><input type="checkbox" checked={agree.includes(c.id)} onChange={()=>toggle(c.id)}/>
          <span>{c.label} ({c.required?'필수':'선택'}){c.sub&&<small>{c.sub}</small>}</span></label>)}
        {show('consents')&&<span className="rt-wel-err">{show('consents')}</span>}
      </fieldset>
      {err&&<p className="rt-wel-err" role="alert">{err}</p>}
      <button type="submit" className="rt-gbtn green" disabled={busy}>가입하고 시작하기</button>
      <div className="rt-wel-or">또는</div>
      <Social verb="시작하기" onError={setErr}/>
      <div className="rt-wel-links"><span>이미 계정이 있어요</span><button type="button" onClick={onLogin}>로그인</button></div>
    </form>
    <p className="rt-wel-fine">가입하면 내 종목 넣기 → 튜토리얼로 바로 이어져요</p>
  </section>;
}

// after a first Kakao or Google sign-in: the nickname (from the provider, editable) and the same consents as sign-up
// 입장코드 (private test): one code, once; the server counts its uses (redeem_invite)
function InviteStep({onDone}:{onDone:()=>void}){
  const [code,setCode]=useState(''),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const submit=async()=>{if(!code.trim())return;setBusy(true);setErr(null);const r=await redeemInvite(code);setBusy(false);
    if(r==='ok'||r==='already')onDone();
    else setErr(r==='bad'?'맞지 않거나 다 쓴 코드예요. 받은 코드를 다시 확인해 주세요':r==='signin'?'로그인이 풀렸어요. 다시 로그인해 주세요':'지금 확인하지 못했어요. 잠시 뒤에 다시 시도해 주세요')};
  return <section className="rt-wel-auth" aria-label="입장코드">
    <Logo height={64}/>
    <form className="rt-wel-card" onSubmit={e=>{e.preventDefault();void submit()}}>
      <h2>입장코드</h2>
      <p className="rt-wel-sub">지금은 초대받은 분만 쓸 수 있어요. 받은 코드를 넣어 주세요.</p>
      <label className="rt-wel-field">코드<input aria-label="입장코드" autoCapitalize="characters" autoComplete="off" value={code} maxLength={32} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
      {err&&<p className="rt-wel-err" role="alert">{err}</p>}
      <button type="submit" className="rt-gbtn green" disabled={busy||!code.trim()}>들어가기</button>
      <div className="rt-wel-links"><button type="button" onClick={()=>void authRepo.logOut()}>다른 계정으로 로그인</button></div>
    </form>
  </section>;
}

function ConsentStep({account,onDone}:{account:Account;onDone:(a:Account)=>void}){
  const [nick,setNick]=useState(account.nickname.slice(0,NICK_MAX)),[agree,setAgree]=useState<ConsentId[]>(account.consents);
  const [tried,setTried]=useState(false),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const errors=checkSignUp({email:account.email||'x@x.xx',password:'checked1',nickname:nick,consents:agree});
  const allOn=CONSENTS.every(c=>agree.includes(c.id));
  const toggle=(id:ConsentId)=>setAgree(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);
  const submit=async()=>{setTried(true);if(errors.nickname||errors.consents)return;setBusy(true);
    const r=await authRepo.saveConsents(nick,agree);setBusy(false);if(r.ok)onDone(r.account);else setErr(r.error)};
  return <section className="rt-wel-auth" aria-label="약관 동의">
    <Logo height={64}/>
    <form className="rt-wel-card" onSubmit={e=>{e.preventDefault();void submit()}} noValidate>
      <h2>거의 다 왔어요</h2>
      <label className="rt-wel-field">닉네임<input aria-label="닉네임" value={nick} maxLength={NICK_MAX} onChange={e=>setNick(e.target.value)}/>
        {tried&&errors.nickname&&<span className="rt-wel-err">{errors.nickname}</span>}</label>
      <fieldset className="rt-wel-agree">
        <legend className="sr-only">약관 동의</legend>
        <label className="all"><input type="checkbox" checked={allOn} onChange={()=>setAgree(allOn?[]:CONSENTS.map(c=>c.id))}/>모두 동의</label>
        {CONSENTS.map(c=><label key={c.id}><input type="checkbox" checked={agree.includes(c.id)} onChange={()=>toggle(c.id)}/>
          <span>{c.label} ({c.required?'필수':'선택'}){c.sub&&<small>{c.sub}</small>}</span></label>)}
        {tried&&errors.consents&&<span className="rt-wel-err">{errors.consents}</span>}
      </fieldset>
      {err&&<p className="rt-wel-err" role="alert">{err}</p>}
      <button type="submit" className="rt-gbtn green" disabled={busy}>동의하고 시작하기</button>
      <div className="rt-wel-links"><span>{account.email}</span><button type="button" onClick={()=>void authRepo.logOut()}>다른 계정으로</button></div>
    </form>
  </section>;
}

// a sign-in that came back unfinished says why (supabase.ts authNotice); checked again shortly after load
function Notice(){
  const [n,setN]=useState<string|null>(()=>authNotice());
  useEffect(()=>{const t=setTimeout(()=>setN(authNotice()),1500);return()=>clearTimeout(t)},[]);
  return n?<p className="rt-wel-notice" role="alert">{n}</p>:null;
}
