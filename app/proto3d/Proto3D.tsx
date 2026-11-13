'use client';
// ReThink Garden: the R3F world plus the DOM overlay (weather, my numbers, the dock, sheets). The loop
// (redesign 4장): today's market as weather → an analyst stands at a flagged tree → research note → judgment →
// luon's counter → graded 30/90 days later. Around it: today's case, cooldown seeds, track record, league, game door,
// cart and drawer.
import {useEffect,useMemo,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {LocateFixed,X,Radar,Puzzle,BarChart3,Archive,Trophy,Telescope,Volume2,VolumeX,History} from 'lucide-react';
import {configure,unlock,cue,DEFAULT_SOUND} from '../core/sound';
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
import {ANALYSTS,UI,CURRENCY,line,type AnalystId} from '../content/analysts';
import {itemById} from '../content/garden-items';
import Scene3D,{type World} from './Scene3D';
import {LOOK} from './look';
import {useGarden} from './state';
import {Briefing,Grades,CaseView,LookBack,RewindView} from './ui/Loop';
import {paidLeft} from '../core/rewind';
import {todayTasks,dayDone,type TaskId} from '../core/today';
import {rankOf,xpOf} from '../core/rank';
import {Records,League,GameDoor,CartView,Drawer,AnalystCard,TodaySheet} from './ui/Panels';
import {Bubbles} from './ui/Bubbles';
import {Onboarding} from './ui/Onboarding';
import {BirthCards} from './ui/Birth';
import {DeepSheet} from './ui/Deep';
import {healthProvider} from '../content/health';
import {rootsOf} from '../core/roots';
import {capsulesOf} from '../core/capsule';
import {CapsuleTags} from './ui/Capsules';
import {TIMING} from '../core/timing';
import {birthPlan,treeAt,stageAt,type BirthPlan,type BirthStage} from '../core/birth';
import {DEMO_HOLDINGS} from '../content/demo-garden';

// '?weather=storm' forces the sky (demo and tests); otherwise today's market decides
// '?slowmo=4' plays the wow scenes (birth, cut-away, capsules) 4× slower: for recording and checking them frame by frame
const SLOW_KEYS=['birthCard','birthCrack','birthGrow','birthSettle','birthStagger','birthSpan','birthOrbit','birthWalk','birthDust','cutawayOpen','cutawayClose','capsuleBury','capsuleDig','capsuleLook','lookbackJump'] as const;
if(typeof window!=='undefined'){const k=Number(new URLSearchParams(location.search).get('slowmo'));if(k>1)for(const key of SLOW_KEYS)(TIMING as Record<string,number>)[key]*=k}
function useWeather(){
  const [w,setW]=useState<{weather:Weather;index:number}|null>(null);
  useEffect(()=>{const m=marketProvider.today(isoDay());const q=new URLSearchParams(location.search).get('weather');
    setW({weather:isWeather(q)?q:weatherOf(m),index:m.index})},[]);
  return w;
}
type SheetState={kind:'onboard'}|{kind:'grades';start:string}|{kind:'deep';holdingId:number;back:SheetState}|{kind:'lookback'}|{kind:'brief';start:{signalId?:string;holdingId?:number}|null}|{kind:'grades'|'case'|'rewind'|'today'|'records'|'drawer'|'cart'|'league'|'game'}|{kind:'analyst';id:AnalystId}|null;
const CART_FLAGS=['#c4452f','#36557e','#1e6b4a','#b9801a','#6a5aa8'];
// the analysts come out of the house door when the garden is first born (W1)
const DOOR={x:-4.2,z:-1.0};
type Birth={ids:number[];t0:number;plan:BirthPlan;after?:()=>void};

export default function Proto3D(){
  const g=useGarden(),{s,clock}=g;
  const [picked,setPicked]=useState<number|null>(null);
  const [recenter,setRecenter]=useState(0);
  // a new player lands on the onboarding (ui/Onboarding.tsx); the garden stays empty until the first trees go in
  const [sheet,setSheet]=useState<SheetState>(()=>g.s.onboarded?null:{kind:'onboard'});
  const [early,setEarly]=useState(false);
  // a grade being revealed makes its tree react in the garden (Scene3D Burst)
  const [burst,setBurst]=useState<World['burst']>(null),[focus,setFocus]=useState<number|null>(null);
  // W1: the holdings just planted are born one after another (core/birth.ts); a tap skips to the end
  const [birth,setBirth]=useState<Birth|null>(null),[bStage,setBStage]=useState<BirthStage>('done');
  const startBirth=(ids:number[],long:boolean,after?:()=>void)=>{if(!ids.length){after?.();return}const plan=birthPlan(ids.length,long);
    const still=matchMedia('(prefers-reduced-motion: reduce)').matches;setBirth({ids,plan,t0:performance.now()-(still?plan.total:0),after});setBStage('trees');if(long)g.ops.saw('birth')};
  const skipBirth=()=>setBirth(b=>b&&{...b,t0:performance.now()-b.plan.total});
  useEffect(()=>{if(!birth)return;let raf=0,chord=false;const cracked=new Set<number>();let last:BirthStage|null=null;
    const tick=()=>{const ms=performance.now()-birth.t0,st=stageAt(birth.plan,ms);
      // a low thud as each tree breaks the ground (not a pile of them when skipped)
      birth.ids.forEach((_,i)=>{const b=treeAt(birth.plan,i,ms);if(b.phase!=='wait'&&b.phase!=='card'&&!cracked.has(i)){cracked.add(i);if(b.phase==='crack')cue('plant')}});
      if(st!==last){last=st;setBStage(st);if(!chord&&(st==='orbit'||st==='done')){chord=true;cue('garden-born')}}
      const h=((window as {__proto3d?:{births?:unknown}}).__proto3d??={} as {births?:unknown});h.births={active:st!=='done',stage:st,long:birth.plan.long,n:birth.ids.length,ms:Math.round(ms)};
      if(st==='done'){setBirth(null);birth.after?.();return}
      raf=requestAnimationFrame(tick)};
    tick();return()=>cancelAnimationFrame(raf)},[birth]);// eslint-disable-line react-hooks/exhaustive-deps
  const calm=!!birth;
  // W3 time capsules (core/capsule.ts): one marker per tree; burying after a judgment, digging up as a grade opens
  const capsules=useMemo(()=>capsulesOf(s.judgments,s.graded,clock.today,s.holdings.map(x=>x.id)),[s.judgments,s.graded,clock.today,s.holdings]);
  const [capFx,setCapFx]=useState<World['capsuleFx']>(null),[jump,setJump]=useState(false);
  const bury=(holdingId:number,then?:()=>void)=>{const t0=performance.now(),long=s.seen.bury===0;setSheet(null);setPicked(null);setCapFx({kind:'bury',holdingId,t0});setFocus(holdingId);g.ops.saw('bury');
    const j=s.judgments.filter(x=>x.holdingId===holdingId).at(-1);
    setTimeout(()=>{cue('capsule-bury');if(!then&&j)g.say(line(UI.buried,{name:j.name,mark:30}))},TIMING.capsuleBury*0.68);
    setTimeout(()=>{setCapFx(f=>f&&f.t0===t0?null:f);setFocus(f=>f===holdingId?null:f);then?.()},TIMING.capsuleBury+TIMING.capsuleLook*(long?1.6:1))};
  const dig=(holdingId:number)=>{const t0=performance.now();setCapFx({kind:'dig',holdingId,t0});cue('capsule-dig');setTimeout(()=>cue('capsule-open'),TIMING.capsuleDig*0.72)};
  // a dug-up capsule stays open over its tree only while its grade is on screen
  useEffect(()=>{if(sheet?.kind!=='grades')setCapFx(f=>f&&f.kind==='dig'?null:f)},[sheet]);
  const onCapsule=(holdingId:number)=>{const c=capsules.find(x=>x.holdingId===holdingId),hh=holdings.find(x=>x.id===holdingId);if(!c||!hh)return;
    if(c.due){setPicked(null);setSheet({kind:'grades',start:c.judgmentId})}else g.say(line(UI.capsuleWait,{name:hh.name,mark:c.mark,d:c.inDays}))};
  // the look-back: buried now, then "30일 뒤", then dug up with its grade
  const lookJudged=(j:{holdingId:number})=>bury(j.holdingId,()=>{setJump(true);setTimeout(()=>{setJump(false);setSheet({kind:'grades'})},TIMING.lookbackJump)});
  // W2: the ground opened under one tree (core/roots.ts, Roots3D.tsx); closing slides it shut, then it goes
  const [cut,setCut]=useState<World['cutaway']>(null);
  const openDeep=(holdingId:number,back:SheetState=null)=>{const hh=g.s.holdings.find(x=>x.id===holdingId);if(!hh)return;
    const health=healthProvider.of(hh,signals.find(x=>x.holdingId===holdingId)??null);
    setCut({holdingId,roots:rootsOf(health),t0:performance.now(),closing:null});setPicked(null);setSheet({kind:'deep',holdingId,back});cue('cutaway-open');g.ops.saw('cutaway')};
  const closeDeep=(back:SheetState)=>{const at=performance.now();setCut(c=>c&&{...c,closing:at});cue('cutaway-close');setSheet(back);
    setTimeout(()=>setCut(c=>c&&c.closing===at?null:c),TIMING.cutawayClose+80)};
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

  // today's three (core/today.ts): ticked off as they happen; all three close the day once
  const tasks=todayTasks({signals:signals.length,judgedToday:s.judgments.filter(j=>j.day===clock.today).length,caseDone,due:g.due.length,
    gradedToday:s.graded.filter(x=>x.day===clock.today).length,rewindsToday:s.rewinds.filter(r=>r.day===clock.today).length});
  const tasksDone=tasks.filter(t=>t.done).length,allDone=ready&&dayDone(tasks);
  useEffect(()=>{if(allDone)g.ops.closeDay()},[allDone]);// eslint-disable-line react-hooks/exhaustive-deps
  // a new title (core/rank.ts) brings its item
  const rank=rankOf(xpOf({graded:s.graded.length,cases:s.cases.length,rewinds:s.rewinds.length}));
  useEffect(()=>{if(rank.index>s.rankSeen)g.ops.rankUp(rank.index,rank.name)},[rank.index,s.rankSeen]);// eslint-disable-line react-hooks/exhaustive-deps
  const goTask=(t:TaskId)=>setSheet(t==='judge'?{kind:'brief',start:null}:{kind:t==='grade'?'grades':t});
  // nothing flagged in the new garden: no look-back to show
  useEffect(()=>{if(sheet?.kind==='lookback'&&!lookSig)setSheet(null)},[sheet,lookSig]);
  // sound (core/sound.ts, synthesised): on unless the player turned it off; the browser lets it start on the first press
  useEffect(()=>{configure({...DEFAULT_SOUND,on:s.sound})},[s.sound]);
  // a run of days that was rescued or lost is said once, as the garden opens
  useEffect(()=>{const n=s.streak.notice;if(n&&n.day===clock.today)g.say(n.kind==='reset'?line(UI.streakReset,{run:n.run}):UI.streakRescue)},[]);// eslint-disable-line react-hooks/exhaustive-deps

  const world:World={
    // the three come in with the first trees
    analysts:!ready||(calm&&(bStage==='trees'||bStage==='orbit'))?[]:ANALYSTS.map(a=>{
      // tori comes over to the open ground
      if(a.id==='tori'&&cut&&!cut.closing)return {id:a.id,at:cut.holdingId,bubble:null};
      if(a.id==='luon')return {id:a.id,at:null,bubble:g.due.length?{text:`판정 ${g.due.length}건`,alert:true}:null};
      const sig=open.find(x=>x.analyst===a.id),h=sig&&holdings.find(x=>x.id===sig.holdingId);
      return {id:a.id,at:sig?.holdingId??null,bubble:h?{text:`${h.name} · ${sig!.headline}`,alert:sig!.loss}:null};
    }),
    pots:holdings.map(h=>({holdingId:h.id,open:!!openFor(s.cooldowns,h.id),flowers:flowersOn(s.cooldowns,h.id)})).filter(p=>p.open||p.flowers),
    decor:s.owned.filter(o=>o.slot).map(o=>({slot:o.slot!,shape:itemById(o.itemId)!.shape})),
    burst,focus,birth,enterFrom:calm?DOOR:null,cutaway:cut,onDeep:id=>{if(!calm&&ready)openDeep(id)},
    capsules:capsules.map(c=>({holdingId:c.holdingId,due:c.due})),capsuleFx:capFx,onCapsule:id=>{if(!calm)onCapsule(id)},hitRate:track.hitRate,cartFlag:CART_FLAGS[Number(clock.today.slice(-2))%CART_FLAGS.length],gameLit:true,
    onAnalyst:id=>{if(id==='luon'&&g.due.length){setSheet({kind:'grades'});return}const sig=open.find(x=>x.analyst===id);
      setSheet(sig?{kind:'brief',start:{signalId:sig.id}}:{kind:'analyst',id})},
    onLandmark:k=>setSheet({kind:k==='observatory'?'game':k==='signpost'?'records':'cart'}),
  };

  const h=holdings.find(t=>t.id===picked);
  const st=h&&treeState(h,defaultRules);
  const cd=h?openFor(s.cooldowns,h.id):null;
  const close=()=>setSheet(null);
  const dock:[NonNullable<SheetState>['kind'],string,typeof Radar,boolean][]=[
    ['brief','브리핑',Radar,open.length>0],['case','케이스',Puzzle,!caseDone],['rewind','되감기',History,paidLeft(s.rewinds,clock.today)>0],['records','기록',BarChart3,g.due.length>0],
    ['drawer','서랍',Archive,false],['league','리그',Trophy,false],['game','모의투자',Telescope,false]];
  const decideCooldown=()=>{if(!cd||!h)return;const waited=g.ops.finishCooldown(cd.id);if(waited)g.say(UI.cooldownBloom);setEarly(false);setPicked(null);setSheet({kind:'brief',start:{holdingId:h.id}})};

  return (
    <div className={`proto3d${ready&&!calm?"":" no-dock"}`} data-testid="proto3d" data-weather={weather} onPointerDownCapture={unlock} onClickCapture={e=>{if((e.target as HTMLElement).closest('button'))cue('ui-button')}}
      style={{background:`linear-gradient(180deg,${wl.sky.top} 0%,${wl.sky.mid} 38%,${wl.sky.bottom} 100%)`}}>
      {w&&<Canvas shadows="soft" dpr={[1,1.5]} gl={{antialias:false,alpha:true,powerPreference:'high-performance'}}
        camera={{fov:46,near:0.5,far:120,position:[0,21,14.5]}}>
        <Scene3D holdings={holdings} picked={picked} onPick={id=>{setPicked(id);setEarly(false)}} recenter={recenter} weather={weather} world={world}/>
      </Canvas>}
      <div className="proto3d-sun" aria-hidden
        style={{width:LOOK.sunGlow.size,height:LOOK.sunGlow.size,opacity:wl.glow,
          background:`radial-gradient(circle at center,${LOOK.sunGlow.color} 0%,${LOOK.sunGlow.color}88 22%,transparent 62%)`}}/>

      <div className="proto3d-top">
        <div className="rt-top-left">
        {w&&<div className="rt-weather" aria-label="오늘 시장 날씨">
          <span className="rt-weather-k">오늘 시장</span>
          <strong>{WEATHER_LABEL[weather]}</strong>
          <span className="rt-num">{w.index>0?'+':''}{w.index.toFixed(2)}%</span>
          <small>{WEATHER_NOTE[weather]}</small>
        </div>}
        {ready&&!calm&&<button type="button" className="rt-today" data-done={allDone} aria-label={`오늘 할 일 ${tasksDone}/${tasks.length}`} onClick={()=>setSheet({kind:'today'})}>
          <span className="rt-today-dots" aria-hidden>{tasks.map((t,i)=><i key={i} data-on={t.done}/>)}</span>{allDone?'오늘 끝':`오늘 ${tasksDone}/${tasks.length}`}</button>}
        </div>
        {ready&&!calm&&<div className="rt-hud" aria-label="내 숫자">
          <button type="button" className="rt-sound" aria-label={s.sound?'소리 끄기':'소리 켜기'} aria-pressed={!s.sound} onClick={()=>g.ops.setSound(!s.sound)}>{s.sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
          <div className="rt-stat"><span>{CURRENCY}</span><b className="rt-num" data-testid="currency">{s.currency}</b></div>
          <div className="rt-stat"><span>연속</span><b className="rt-num">{shownCount(s.streak,clock.today)}일</b></div>
          <div className="rt-stat"><span>이번 주</span><b className="rt-num">{weekPoints(s.graded,s.cases,clock.today)}</b></div>
        </div>}
      </div>
      {ready&&!h&&!calm&&!sheet&&!capFx&&<CapsuleTags items={capsules} names={Object.fromEntries(holdings.map(x=>[x.id,x.name]))} onPick={onCapsule}/>}
      {jump&&<div className="rt-jump" role="status">{UI.jump}</div>}
      {!h&&!calm&&<Bubbles items={world.analysts.flatMap(a=>a.bubble?[{id:a.id,...a.bubble}]:[])} onPick={world.onAnalyst}/>}
      {!ready&&!sheet&&<button type="button" className="rt-banner" onClick={()=>setSheet({kind:'onboard'})}><span>정원이 비어 있어</span><b>내 종목 넣기</b></button>}
      {g.due.length>0&&!sheet&&!calm&&!capFx&&!jump&&<button type="button" className="rt-banner" onClick={()=>setSheet({kind:'grades'})}>
        <span className="rt-face luon sm" aria-hidden>루</span><span>판정 <b className="rt-num">{g.due.length}</b>건 도착</span><b>열기</b></button>}
      {ready&&!sheet&&!h&&!calm&&<p className="proto3d-hint">끌어서 둘러보기 · 땅을 눌러 걷기 · 나무와 분석가를 눌러 보기</p>}

      {ready&&!calm&&<button type="button" className="proto3d-locate" aria-label="내 위치로" onClick={()=>setRecenter(n=>n+1)}><LocateFixed size={20}/></button>}

      {ready&&!calm&&<nav className="rt-dock" aria-label="메뉴">
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
          {early&&cd&&<p className="rt-hint" style={{flexBasis:'100%',marginTop:8}}>{line(UI.cooldownEarly,{left:leftLabel(cd,clock.now)})}</p>}
          {!s.seen.cutaway&&<p className="rt-hint rt-deep-hint" style={{flexBasis:'100%',marginTop:8}}>{UI.deepHint}</p>}
          <div className="rt-card-acts">
            <button type="button" className="rt-btn primary" onClick={()=>{setPicked(null);setSheet({kind:'brief',start:{holdingId:h.id}})}}>판단 기록</button>
            <button type="button" className="rt-btn" onClick={()=>openDeep(h.id)}>땅 속</button>
            {!cd&&<button type="button" className="rt-btn" onClick={()=>g.ops.startCooldown(h.id)}>팔고 싶어</button>}
            {cd&&isReady(cd,clock.now)&&<button type="button" className="rt-btn" onClick={decideCooldown}>결정하기</button>}
            {cd&&!isReady(cd,clock.now)&&(early
              ?<button type="button" className="rt-btn" onClick={decideCooldown}>지금 결정</button>
              :<button type="button" className="rt-btn" onClick={()=>setEarly(true)}>냉각 중 · {leftLabel(cd,clock.now)}</button>)}
          </div>
        </section>
      )}

      {sheet?.kind==='brief'&&<Briefing key={JSON.stringify(sheet.start)} g={g} signals={signals} holdings={holdings} start={sheet.start} onClose={close}
        onDeep={id=>openDeep(id,{kind:'brief',start:{holdingId:id}})} onBury={id=>bury(id)}/>}
      {sheet?.kind==='deep'&&(()=>{const hh=holdings.find(x=>x.id===sheet.holdingId);const back=sheet.back;
        return hh&&<DeepSheet holding={hh} health={healthProvider.of(hh,signals.find(x=>x.holdingId===hh.id)??null)} onClose={()=>closeDeep(back)}/>})()}
      {sheet?.kind==='grades'&&<Grades g={g} onClose={close} start={'start' in sheet?sheet.start:undefined} onDig={dig} onStamp={(holdingId,hit)=>setBurst({holdingId,hit,stamp:Date.now()})} onFocus={setFocus} onRewind={()=>setSheet({kind:'rewind'})}/>}
      {sheet?.kind==='rewind'&&<RewindView g={g} onClose={close}/>}
      {sheet?.kind==='today'&&<TodaySheet g={g} tasks={tasks} onGo={goTask} onClose={close}/>}
      {sheet?.kind==='case'&&<CaseView g={g} c={caseDone?CASES.find(c=>c.id===answeredToday(s.cases,clock.today)!.caseId)??todayCase:todayCase} onClose={close}/>}
      {sheet?.kind==='onboard'&&<Onboarding g={g} onClose={close}
        onPlanted={(ids,first)=>{setSheet(null);startBirth(ids,first&&s.seen.birth===0,first?()=>setSheet({kind:'lookback'}):undefined)}}
        onDemo={()=>{setSheet(null);startBirth(DEMO_HOLDINGS.map(x=>x.id),s.seen.birth===0)}}/>}
      {birth&&<BirthCards birth={birth} holdings={holdings} onSkip={skipBirth}/>}
      {sheet?.kind==='lookback'&&lookSig&&lookHolding&&<LookBack g={g} sig={lookSig} holding={lookHolding} onJudged={lookJudged} onClose={close}/>}
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
