'use client';
// ReThink Garden: the R3F world plus the DOM overlay (weather, my numbers, the dock, sheets). The loop
// (redesign 4장): today's market as weather → an analyst stands at a flagged tree → research note → judgment →
// luon's counter → graded 30/90 days later. Around it: today's case, cooldown seeds, track record, league, game door,
// cart and drawer.
import {useEffect,useMemo,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {LocateFixed,X,Radar,Puzzle,BarChart3,Archive,Trophy,Telescope} from 'lucide-react';
import {treeState,defaultRules} from '../core/model';
import {weatherOf,isWeather,WEATHER_LABEL,WEATHER_NOTE,type Weather} from '../core/weather';
import {judgedToday,trackOf,lookbackPick} from '../core/judgment';
import {openFor,isReady,leftLabel,flowersOn} from '../core/cooldown';
import {caseOfDay,answeredToday} from '../core/cases';
import {weekPoints} from '../core/league';
import {shownCount} from '../core/streak';
import {isoDay} from '../core/items';
import {marketProvider} from '../content/market';
import {signalProvider} from '../content/signals';
import {CASES} from '../content/cases';
import {CONDITION_LABEL,GROWTH_LABEL} from '../content/demo-garden';
import {ANALYSTS,LINES,CURRENCY,line,type AnalystId} from '../content/analysts';
import {itemById} from '../content/garden-items';
import Scene3D,{type World} from './Scene3D';
import {LOOK} from './look';
import {useGarden} from './state';
import {Briefing,Grades,CaseView,LookBack} from './ui/Loop';
import {Records,League,GameDoor,CartView,Drawer,AnalystCard} from './ui/Panels';
import {Bubbles} from './ui/Bubbles';
import {Onboarding} from './ui/Onboarding';

// '?weather=storm' forces the sky (demo and tests); otherwise today's market decides
function useWeather(){
  const [w,setW]=useState<{weather:Weather;index:number}|null>(null);
  useEffect(()=>{const m=marketProvider.today(isoDay());const q=new URLSearchParams(location.search).get('weather');
    setW({weather:isWeather(q)?q:weatherOf(m),index:m.index})},[]);
  return w;
}
type SheetState={kind:'onboard'}|{kind:'lookback'}|{kind:'brief';start:{signalId?:string;holdingId?:number}|null}|{kind:'grades'|'case'|'records'|'drawer'|'cart'|'league'|'game'}|{kind:'analyst';id:AnalystId}|null;
const CART_FLAGS=['#c4452f','#36557e','#1e6b4a','#b9801a','#6a5aa8'];

export default function Proto3D(){
  const g=useGarden(),{s,clock}=g;
  const [picked,setPicked]=useState<number|null>(null);
  const [recenter,setRecenter]=useState(0);
  // a new player lands on the onboarding (ui/Onboarding.tsx); the garden stays empty until the first trees go in
  const [sheet,setSheet]=useState<SheetState>(()=>g.s.onboarded?null:{kind:'onboard'});
  const [early,setEarly]=useState(false);
  const w=useWeather();
  const weather=w?.weather??'clear',wl=LOOK.weather[weather];
  const holdings=g.s.holdings,ready=g.s.onboarded;
  const signals=useMemo(()=>signalProvider.today(holdings,clock.today),[holdings,clock.today]);
  const open=signals.filter(x=>!judgedToday(s.judgments,x.holdingId,clock.today));
  const todayCase=useMemo(()=>caseOfDay(CASES,clock.today,s.cases.filter(a=>a.day!==clock.today).map(a=>a.caseId)),[clock.today,s.cases]);
  const caseDone=!!answeredToday(s.cases,clock.today);
  const track=trackOf(s.judgments,s.graded);
  // the first visit's look-back: a loss signal if there is one (ui/Loop.tsx LookBack)
  const lookSig=s.lookedBack?null:lookbackPick(signals),lookHolding=lookSig?holdings.find(x=>x.id===lookSig.holdingId):undefined;

  // nothing flagged in the new garden: no look-back to show
  useEffect(()=>{if(sheet?.kind==='lookback'&&!lookSig)setSheet(null)},[sheet,lookSig]);
  // a run of days that was rescued or lost is said once, as the garden opens
  useEffect(()=>{const n=s.streak.notice;if(n&&n.day===clock.today)g.say(n.kind==='reset'?line(LINES.streakReset,{run:n.run}):LINES.streakRescue)},[]);// eslint-disable-line react-hooks/exhaustive-deps

  const world:World={
    // the three come in with the first trees
    analysts:!ready?[]:ANALYSTS.map(a=>{
      if(a.id==='luon')return {id:a.id,at:null,bubble:g.due.length?{text:`판정 ${g.due.length}건`,alert:true}:null};
      const sig=open.find(x=>x.analyst===a.id),h=sig&&holdings.find(x=>x.id===sig.holdingId);
      return {id:a.id,at:sig?.holdingId??null,bubble:h?{text:`${h.name} · ${sig!.headline}`,alert:sig!.loss}:null};
    }),
    pots:holdings.map(h=>({holdingId:h.id,open:!!openFor(s.cooldowns,h.id),flowers:flowersOn(s.cooldowns,h.id)})).filter(p=>p.open||p.flowers),
    decor:s.owned.filter(o=>o.slot).map(o=>({slot:o.slot!,shape:itemById(o.itemId)!.shape})),
    hitRate:track.hitRate,cartFlag:CART_FLAGS[Number(clock.today.slice(-2))%CART_FLAGS.length],gameLit:true,
    onAnalyst:id=>{if(id==='luon'&&g.due.length){setSheet({kind:'grades'});return}const sig=open.find(x=>x.analyst===id);
      setSheet(sig?{kind:'brief',start:{signalId:sig.id}}:{kind:'analyst',id})},
    onLandmark:k=>setSheet({kind:k==='observatory'?'game':k==='signpost'?'records':'cart'}),
  };

  const h=holdings.find(t=>t.id===picked);
  const st=h&&treeState(h,defaultRules);
  const cd=h?openFor(s.cooldowns,h.id):null;
  const close=()=>setSheet(null);
  const dock:[NonNullable<SheetState>['kind'],string,typeof Radar,boolean][]=[
    ['brief','브리핑',Radar,open.length>0],['case','케이스',Puzzle,!caseDone],['records','기록',BarChart3,g.due.length>0],
    ['drawer','서랍',Archive,false],['league','리그',Trophy,false],['game','모의투자',Telescope,false]];
  const decideCooldown=()=>{if(!cd||!h)return;const waited=g.ops.finishCooldown(cd.id);g.say(waited?LINES.cooldownBloom:LINES.recorded);setEarly(false);setPicked(null);setSheet({kind:'brief',start:{holdingId:h.id}})};

  return (
    <div className={`proto3d${ready?"":" no-dock"}`} data-testid="proto3d" data-weather={weather}
      style={{background:`linear-gradient(180deg,${wl.sky.top} 0%,${wl.sky.mid} 38%,${wl.sky.bottom} 100%)`}}>
      {w&&<Canvas shadows="soft" dpr={[1,1.5]} gl={{antialias:false,alpha:true,powerPreference:'high-performance'}}
        camera={{fov:46,near:0.5,far:120,position:[0,21,14.5]}}>
        <Scene3D holdings={holdings} picked={picked} onPick={id=>{setPicked(id);setEarly(false)}} recenter={recenter} weather={weather} world={world}/>
      </Canvas>}
      <div className="proto3d-sun" aria-hidden
        style={{width:LOOK.sunGlow.size,height:LOOK.sunGlow.size,opacity:wl.glow,
          background:`radial-gradient(circle at center,${LOOK.sunGlow.color} 0%,${LOOK.sunGlow.color}88 22%,transparent 62%)`}}/>

      <div className="proto3d-top">
        {w&&<div className="rt-weather" aria-label="오늘 시장 날씨">
          <span className="rt-weather-k">오늘 시장</span>
          <strong>{WEATHER_LABEL[weather]}</strong>
          <span className="rt-num">{w.index>0?'+':''}{w.index.toFixed(2)}%</span>
          <small>{WEATHER_NOTE[weather]}</small>
        </div>}
        {ready&&<div className="rt-hud" aria-label="내 숫자">
          <div className="rt-stat"><span>{CURRENCY}</span><b className="rt-num" data-testid="currency">{s.currency}</b></div>
          <div className="rt-stat"><span>연속</span><b className="rt-num">{shownCount(s.streak,clock.today)}일</b></div>
          <div className="rt-stat"><span>이번 주</span><b className="rt-num">{weekPoints(s.graded,s.cases,clock.today)}</b></div>
        </div>}
      </div>
      {!h&&<Bubbles items={world.analysts.flatMap(a=>a.bubble?[{id:a.id,...a.bubble}]:[])} onPick={world.onAnalyst}/>}
      {!ready&&!sheet&&<button type="button" className="rt-banner" onClick={()=>setSheet({kind:'onboard'})}><span>정원이 비어 있어</span><b>내 종목 넣기</b></button>}
      {g.due.length>0&&!sheet&&<button type="button" className="rt-banner" onClick={()=>setSheet({kind:'grades'})}>
        <span className="rt-face luon sm" aria-hidden>루</span><span>판정 <b className="rt-num">{g.due.length}</b>건 도착</span><b>열기</b></button>}
      {ready&&!sheet&&!h&&<p className="proto3d-hint">끌어서 둘러보기 · 땅을 눌러 걷기 · 나무와 분석가를 눌러 보기</p>}

      {ready&&<button type="button" className="proto3d-locate" aria-label="내 위치로" onClick={()=>setRecenter(n=>n+1)}><LocateFixed size={20}/></button>}

      {ready&&<nav className="rt-dock" aria-label="메뉴">
        {dock.map(([k,label,Icon,dot])=><button key={k} type="button" aria-pressed={sheet?.kind===k} onClick={()=>{setPicked(null);setSheet(sheet?.kind===k?null:k==='brief'?{kind:'brief',start:null}:{kind:k} as SheetState)}}>
          <Icon size={20}/>{label}{dot&&<i aria-label="새 소식"/>}</button>)}
      </nav>}

      {h&&st&&!sheet&&(
        <section role="dialog" aria-label={`${h.name} 나무`} className="proto3d-card">
          <div>
            <h2>{h.name}</h2>
            <p>{CONDITION_LABEL[st.condition]} · {GROWTH_LABEL[st.growth]}</p>
            <small className="rt-num">{st.days}일 보유 · 수익률 {h.rate>0?'+':''}{h.rate}%</small>
          </div>
          <button type="button" aria-label="닫기" onClick={()=>setPicked(null)}><X size={18}/></button>
          {early&&cd&&<p className="rt-hint" style={{flexBasis:'100%',marginTop:8}}>{line(LINES.cooldownEarly,{left:leftLabel(cd,clock.now)})}</p>}
          <div className="rt-card-acts">
            <button type="button" className="rt-btn primary" onClick={()=>{setPicked(null);setSheet({kind:'brief',start:{holdingId:h.id}})}}>판단 기록</button>
            {!cd&&<button type="button" className="rt-btn" onClick={()=>g.ops.startCooldown(h.id)}>팔고 싶어</button>}
            {cd&&isReady(cd,clock.now)&&<button type="button" className="rt-btn" onClick={decideCooldown}>결정하기</button>}
            {cd&&!isReady(cd,clock.now)&&(early
              ?<button type="button" className="rt-btn" onClick={decideCooldown}>지금 결정</button>
              :<button type="button" className="rt-btn" onClick={()=>setEarly(true)}>냉각 중 · {leftLabel(cd,clock.now)}</button>)}
          </div>
        </section>
      )}

      {sheet?.kind==='brief'&&<Briefing key={JSON.stringify(sheet.start)} g={g} signals={signals} holdings={holdings} start={sheet.start} onClose={close}/>}
      {sheet?.kind==='grades'&&<Grades g={g} onClose={close}/>}
      {sheet?.kind==='case'&&<CaseView g={g} c={caseDone?CASES.find(c=>c.id===answeredToday(s.cases,clock.today)!.caseId)??todayCase:todayCase} onClose={close}/>}
      {sheet?.kind==='onboard'&&<Onboarding g={g} onClose={close} onPlanted={()=>setSheet(g.s.lookedBack?null:{kind:'lookback'})}/>}
      {sheet?.kind==='lookback'&&lookSig&&lookHolding&&<LookBack g={g} sig={lookSig} holding={lookHolding} onJudged={()=>setSheet({kind:'grades'})} onClose={close}/>}
      {sheet?.kind==='records'&&<Records g={g} onClose={close} onHoldings={()=>setSheet({kind:'onboard'})}/>}
      {sheet?.kind==='league'&&<League g={g} onClose={close}/>}
      {sheet?.kind==='game'&&<GameDoor onClose={close}/>}
      {sheet?.kind==='cart'&&<CartView g={g} onClose={close}/>}
      {sheet?.kind==='drawer'&&<Drawer g={g} onClose={close} onCart={()=>setSheet({kind:'cart'})}/>}
      {sheet?.kind==='analyst'&&<AnalystCard g={g} id={sheet.id} signal={open.find(x=>x.analyst===sheet.id)??null} onClose={close}
        onBrief={()=>{const sig=open.find(x=>x.analyst===sheet.id);if(sig)setSheet({kind:'brief',start:{signalId:sig.id}})}}/>}
      {g.toast&&<div key={g.toast.id} className="rt-toast" role="status">{g.toast.text}</div>}
    </div>
  );
}
