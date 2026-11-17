'use client';
// ReThink Garden: the R3F world plus the DOM overlay (weather, my numbers, the dock, sheets). The loop
// (redesign 4장): today's market as weather → an analyst stands at a flagged tree → research note → judgment →
// luon's counter → graded 30/90 days later. Around it: today's case, cooldown seeds, track record, league, game door,
// cart and drawer.
import {still} from './still';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Cross,Ledger,Scope,MapIcon,Sprout,More} from './ui/Icons';
import {MoreSheet,NextCard,Tutorial,type MoreId} from './ui/Home';
import {JigiBook} from './ui/JigiBook';
import {JigiWrite} from './ui/JigiWrite';
import {QUICK,live as liveJournals,type Quick} from '../core/jigi/journal';
import {needsReview} from '../core/jigi/hypothesis';
import {hypoCapsules,hypoCapsuleLabel,type HypoCapsule} from '../core/jigi/capsules';
import {capsuleLabel,type Capsule} from '../core/capsule';
import {JigiVerdict} from './ui/JigiVerdict';
import {JigiStats} from './ui/JigiStats';
import {Coin,BuildBar,BuildTags,BuildConfirm,CityBook} from './ui/Build';
import {Signs} from './ui/Signs';
import {BUILT0,CITIES,LANDS,BUILDINGS,type Want} from '../core/land';
// where a landmark stands (core/land.ts), so opening one walks over toward it
const CITY_SPOT=(id:string)=>CITIES.find(c=>c.id===id)?.at;
import {nextStep} from '../core/next';
import {Welcome} from './ui/Welcome';
import {authRepo} from './server';
import {missingConsents,boriTalk,boriOpen,jigiAI,readCapture,hasInvite,isMaster,type BoriLine} from './supabase';
import {searchNames,loadRealBars,fixturePrices,type PriceFixture} from './prices';
import {RealEntry,type RealPrices} from './ui/RealEntry';
import {refreshed} from '../core/real';
import {codeOf,bars,isReal} from '../core/jigi/stocks';
import {saveRepo,openedAt,markLocal} from './sync';
import {syncPlan,SYNC} from '../core/sync';
import type {GardenSave} from './state';
import type {Account} from '../core/auth';
import {tiltOffset} from '../core/tilt';
import {tilt as tiltNow} from './screen';
import {configure,unlock,cue,DEFAULT_SOUND,ambience} from '../core/sound';
import {streamZ} from './places';
import {spread,spreadXZ} from '../core/world';
import {treeState,defaultRules} from '../core/model';
import {weatherOf,isWeather,WEATHER_LABEL,WEATHER_NOTE,type Weather} from '../core/weather';
import {judgedToday,trackOf,lookbackPick} from '../core/judgment';
import {openFor,isReady,leftLabel,flowersOn} from '../core/cooldown';
import {caseOfDay,answeredToday} from '../core/cases';
import {weekPoints} from '../core/league';
import {shownCount} from '../core/streak';
import {isoDay} from '../core/items';
import {marketProvider} from '../content/market';
import {signalProvider,lookbackNote} from '../content/signals';
import {CASES} from '../content/cases';
import {CONDITION_LABEL,GROWTH_LABEL} from '../content/demo-garden';
import {ANALYSTS,UI,CURRENCY,line,type AnalystId} from '../content/analysts';
import {itemById} from '../content/garden-items';
import Scene3D,{type World} from './Scene3D';
import {LOOK} from './look';
import {useGarden,workOf,weekWorkOf} from './state';
import {Briefing,Grades,CaseView,LookBack,RewindView,type LookbackPick} from './ui/Loop';
import {paidLeft} from '../core/rewind';
import {todayTasks,dayDone,type TaskId} from '../core/today';
import {rankOf,xpOf} from '../core/rank';
import {Expedition} from './game/Expedition';
import {weekStart} from '../core/weekly';
import {Records,League,GameDoor,CartView,Drawer,AnalystCard,TodaySheet,LibrarySheet,weekCtx} from './ui/Panels';
import {MapSheet} from './ui/MapSheet';
import {RoomTags} from './ui/RoomTags';
import {routineOf} from '../core/routine';
import {chatOf} from '../content/routine-lines';
import {setMasterOn} from '../core/master';
import {MASTER} from '../core/ledger';
import {MyPage,wearCtx} from './ui/MyPage';
import {SkyView} from './ui/SkyView';
import {myPlanet,type Planet,type Share} from '../core/planets';
import {planetRepo} from './server';
import {habitOf} from '../core/profile';
import {PALETTES} from '../core/wardrobe';
import {fitLook} from '../core/wardrobe';
import {newStamps} from '../core/stamps';
import {daylightOf,mixHex} from '../core/daylight';
import {nextTip,tipText,type TipId} from '../core/tips';
import {Tip} from './ui/Tip';
import {SettingsSheet} from './ui/Settings';
import {weekGoals} from '../core/weekly';
import {LetterSheet} from './ui/Letter';
import {letterOf,letterDue,prevMonth,monthOf,monthLabel} from '../core/letter';
import {stampById} from '../core/stamps';
import {daysBetween as daysFrom} from '../core/judgment';
import {place,NARU,FISH_STAND,FISH_AT,type PlaceId} from './places';
import {Bubbles} from './ui/Bubbles';
import {FriendSheet} from './ui/Friend';
import {FRIEND,friendOpener,type BoriFace} from '../core/friend';
import {NaruTalk,FishingPlay,FishLog} from './ui/Fishing';
import {castsLeft,land} from '../core/fishing';
import {FlowerShop} from './ui/FlowerShop';
import {shopPlant} from '../content/flower-shop';
import {Intro} from './ui/Intro';
import {Onboarding} from './ui/Onboarding';
import {BirthCards} from './ui/Birth';
import {DeepSheet} from './ui/Deep';
import {healthProvider} from '../content/health';
import {rootsOf} from '../core/roots';
import {capsulesOf} from '../core/capsule';
import {CapsuleTags} from './ui/Capsules';
import {BURY} from './Capsule3D';
import {TimelapseBar} from './ui/Timelapse';
import {lapseFrames,holdingAt,dayBack,pinsAt} from '../core/history';
import {TIMING} from '../core/timing';
import {birthPlan,treeAt,stageAt,type BirthPlan,type BirthStage} from '../core/birth';
import {DEMO_HOLDINGS} from '../content/demo-garden';

// '?weather=storm' forces the sky (demo and tests); otherwise today's market decides
// '?slowmo=4' plays the wow scenes (birth, cut-away, capsules) 4× slower: for recording and checking them frame by frame
const SLOW_KEYS=['birthCard','birthCrack','birthGrow','birthSettle','birthStagger','birthSpan','birthOrbit','birthWalk','birthDust','cutawayOpen','cutawayClose','capsuleBury','capsuleBuryShort','capsuleDig','capsuleLook','lookbackJump'] as const;
if(typeof window!=='undefined'){const k=Number(new URLSearchParams(location.search).get('slowmo'));if(k>1)for(const key of SLOW_KEYS)(TIMING as Record<string,number>)[key]*=k}
// W6 (core/tilt.ts): the phone's tilt moves the camera a little. Phones that need permission (iPhone) ask only when the
// player presses the button; others start at once. Off with reduced motion. The rest angle is how the phone was held
// when it started (and again after turning it), so any comfortable hold is the middle.
type DOE={requestPermission?:()=>Promise<string>};
function useTilt(allowed:boolean){
  const [need,setNeed]=useState(false),[on,setOn]=useState(false),ok=useRef(allowed);ok.current=allowed;
  useEffect(()=>{if(!allowed){tiltNow.x=0;tiltNow.y=0}},[allowed]);
  const start=()=>{let rest:{beta:number;gamma:number}|null=null,angle=-1;
    const h=(e:DeviceOrientationEvent)=>{if(e.beta===null||e.gamma===null||!ok.current)return;const a=(screen.orientation?.angle??0)%360;if(a!==angle){angle=a;rest=null}
      // what is left-right and front-back depends on which way the phone is turned
      const [fb,lr]=a===90?[-e.gamma,e.beta]:a===270?[e.gamma,-e.beta]:[e.beta,e.gamma];
      rest??={beta:fb,gamma:lr};const t=tiltOffset(fb,lr,rest);tiltNow.x=t.x;tiltNow.y=t.y};
    addEventListener('deviceorientation',h);setOn(true);return()=>removeEventListener('deviceorientation',h)};
  useEffect(()=>{if(still())return;const D=(window as unknown as {DeviceOrientationEvent?:DOE}).DeviceOrientationEvent;if(!D)return;
    if(typeof D.requestPermission==='function'){setNeed(true);return}return start()},[]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const hk=((window as {__proto3d?:{tilt?:unknown}}).__proto3d??={} as {tilt?:unknown});hk.tilt={on,need,get x(){return tiltNow.x},get y(){return tiltNow.y}}},[on,need]);
  const ask=()=>{const D=(window as unknown as {DeviceOrientationEvent:DOE}).DeviceOrientationEvent;D.requestPermission?.().then(r=>{if(r==='granted'){setNeed(false);start()}}).catch(()=>{})};
  return {need,ask};
}
function useWeather(){
  const [w,setW]=useState<{weather:Weather;index:number}|null>(null);
  useEffect(()=>{const m=marketProvider.today(isoDay());const q=new URLSearchParams(location.search).get('weather');
    setW({weather:isWeather(q)?q:weatherOf(m),index:m.index})},[]);
  return w;
}
type SheetState={kind:'journal';openId?:string;stats?:boolean}|{kind:'more'}|{kind:'onboard';pick?:boolean}|{kind:'intro'}|{kind:'goods'}|{kind:'real'}|{kind:'letter';month:string}|{kind:'settings'}|{kind:'map'}|{kind:'library'}|{kind:'grades';start:string}|{kind:'deep';holdingId:number;back:SheetState}|{kind:'lookback'}|{kind:'brief';start:{signalId?:string;holdingId?:number}|null}|{kind:'grades'|'case'|'rewind'|'today'|'records'|'drawer'|'cart'|'league'|'game'}|{kind:'analyst';id:AnalystId}|{kind:'friend'}|{kind:'write';id:string}|{kind:'verdict';journalId:string;hypoId:string}|{kind:'cities'}|null;
// where each pointer points (core/tips.ts)
const TIP_AT:Record<TipId,{target?:string;point?:string}>={map:{target:'.proto3d-map'},me:{target:'.rt-me-chip'},house:{point:'house'},lapse:{target:'.rt-dock [data-tab="journal"]'}};
// which tab a sheet belongs to: the journal's sheets light 일지, the rest of the daily loop's extras light 더보기
const tabOf=(sh:SheetState)=>!sh?'garden':['journal','write','verdict','brief','grades','records','lookback','deep'].includes(sh.kind)?'journal':sh.kind==='game'?'game':
  ['more','case','rewind','drawer','cart','goods','league','settings','onboard','cities'].includes(sh.kind)?'more':'garden';
const CART_FLAGS=['#c4452f','#36557e','#1e6b4a','#b9801a','#6a5aa8'];
// this week's league group on the square's flagpoles (the first is mine)
const LEAGUE_FLAGS=['#b8372b','#36557e','#4b6638','#b9801a','#6a5aa8','#c4652e','#2c5c92','#7a5238','#5c5447','#9c6c12','#4d4a8a','#1e6b4a'];
// the analysts come out of the house door when the garden is first born (W1)
const DOOR=spreadXZ({x:-4.2,z:-1.0});
// where 보리 waits for a talk: near the middle, between the campfire and the cart, clear of the analysts' spots
const FRIEND_SPOT=spreadXZ({x:-1.6,z:1.8});
const FIRE_AT=spread(-1.6,-1.2);
type Birth={ids:number[];t0:number;plan:BirthPlan;after?:()=>void};

export default function Proto3D(){
  const g=useGarden(),{s,clock}=g;
  const [picked,setPicked]=useState<number|null>(null);
  const [recenter,setRecenter]=useState(0);
  // a new player lands on the onboarding (ui/Onboarding.tsx); the garden stays empty until the first trees go in
  // (feedback 11-17: first the four introduce themselves, ui/Intro.tsx; e2e starts past it unless the address has ?intro)
  const [sheet,setSheet]=useState<SheetState>(()=>g.s.onboarded?null:typeof window!=='undefined'&&(window as {__noIntro?:boolean}).__noIntro?{kind:'onboard'}:{kind:'intro'});
  // the first screens (ui/Welcome.tsx): every visit that is not signed in starts on the landing (sign up / log in /
  // look around), even with a garden kept on this device; "가입 없이 둘러보기" lasts for this visit (sessionStorage).
  // Sign up and log in go through authRepo (server.ts). e2e pages skip it unless the address has ?landing (tests/e2e/fixtures.ts)
  const [account,setAccount]=useState<Account|null>(()=>typeof window==='undefined'?null:authRepo.current());
  // 부지·건물·랜드마크 (core/land.ts, ui/Build.tsx): 넓히기 mode shows the closed lots on the garden; a tap asks first
  const [buildMode,setBuildMode]=useState(false),[want,setWant]=useState<Want|null>(null);
  // looking around without an account: only with the device-only accounts (the private test closes it on the real server)
  const [guest,setGuest]=useState(()=>{try{return authRepo.local&&sessionStorage.getItem('rethink-guest')==='1'}catch{return false}});
  const [authKnown,setAuthKnown]=useState(()=>typeof window==='undefined'||authRepo.local||!authRepo.maybeSignedIn());
  useEffect(()=>authRepo.onChange(a=>{setAccount(a);setAuthKnown(true)}),[]);
  const owing=account&&missingConsents(account).length?account:null;
  // 입장코드 (private test, db/migrations/007): a server account must have entered one; null = not known yet / not asked
  const [invited,setInvited]=useState<boolean|null>(null),[master,setMaster]=useState(false);
  // set while rendering, so the wardrobe and notes below already see it on this render (a flag, not saved)
  setMasterOn(master);
  useEffect(()=>{if(!account||authRepo.local){setMaster(false);return}let on=true;void isMaster().then(v=>{if(on)setMaster(v)});return()=>{on=false}},[account?.email]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!account||authRepo.local||owing){setInvited(null);return}let on=true;void hasInvite().then(v=>{if(on)setInvited(v)});return()=>{on=false}},[account?.email,!!owing]);// eslint-disable-line react-hooks/exhaustive-deps
  const needInvite=!!account&&!authRepo.local&&!owing&&invited===false;
  // signed in with Supabase: the garden is kept on the server too (proto3d/sync.ts). First the two copies are compared
  // (core/sync.ts), then every change goes up after a quiet moment. Not for guests, device-only accounts or ?demo.
  const syncOn=!!account&&!authRepo.local&&!!saveRepo&&!owing&&invited!==false&&typeof window!=='undefined'&&!new URLSearchParams(location.search).has('demo');
  const [synced,setSynced]=useState(false);
  useEffect(()=>{if(!syncOn||!saveRepo){setSynced(false);return}let on=true;
    saveRepo.pull().then(remote=>{if(!on||remote==='error')return;
      const plan=syncPlan({body:g.s,at:openedAt??'1970-01-01T00:00:00Z'},remote);
      if(plan==='take-remote'&&remote){g.ops.adopt(remote.body as GardenSave);markLocal(remote.at)}
      setSynced(true)});
    return()=>{on=false}},[syncOn,account?.email]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!synced||!saveRepo)return;const repo=saveRepo;const t=setTimeout(()=>{void repo.push(g.s).then(at=>{if(at){markLocal(at);void repo.pushJigi(g.s.journals??[])}})},SYNC.pushAfter);return()=>clearTimeout(t)},[synced,g.s]);
  const welcome=!!owing||needInvite||(!account&&!guest&&authKnown&&!(typeof window!=='undefined'&&(window as {__noLanding?:boolean}).__noLanding));
  const [early,setEarly]=useState(false);
  // a grade being revealed makes its tree react in the garden (Scene3D Burst)
  const [burst,setBurst]=useState<World['burst']>(null),[focus,setFocus]=useState<number|null>(null);
  // W1: the holdings just planted are born one after another (core/birth.ts); a tap skips to the end
  const [birth,setBirth]=useState<Birth|null>(null),[bStage,setBStage]=useState<BirthStage>('done');
  const startBirth=(ids:number[],long:boolean,after?:()=>void)=>{if(!ids.length){after?.();return}const plan=birthPlan(ids.length,long);
    const quietNow=still();setBirth({ids,plan,t0:performance.now()-(quietNow?plan.total:0),after});setBStage('trees');if(long)g.ops.saw('birth')};
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
  // the analysts' day (core/routine.ts) follows the real clock; '?hour=14' (or 14.5) holds it at that time (screens and tests)
  const [minutes,setMinutes]=useState(()=>{const d=new Date();return d.getHours()*60+d.getMinutes()});
  useEffect(()=>{const q=Number(new URLSearchParams(location.search).get('hour'));const fixed=new URLSearchParams(location.search).has('hour')&&Number.isFinite(q);const at=()=>{if(fixed)return Math.round(q*60);const d=new Date();return d.getHours()*60+d.getMinutes()};
    setMinutes(at());const t=setInterval(()=>setMinutes(at()),20000);return()=>clearInterval(t)},[]);
  // my observer's page (ui/MyPage.tsx): the garden is put away for the stage while it is open
  const [me,setMe]=useState(false);
  // inside the house (Interior3D.tsx): a paper-coloured fade covers the swap between the garden and the room
  const [inside,setInside]=useState(false),[fading,setFading]=useState(false);
  const swapRoom=(into:boolean)=>{setPicked(null);setSheet(null);setFading(true);cue('door');setTimeout(()=>{setInside(into);setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const enterHouse=()=>swapRoom(true);
  // the map (ui/MapSheet.tsx) sends the player walking to a place
  const [goTo,setGoTo]=useState<World['goTo']>(null);
  // the camera goes along: nothing may keep it on a tree or a building while the player walks off (feedback 11-17)
  // 1인칭 (feedback 11-17): a button over the map one switches the camera to the player's eyes and back; kept per device
  const [fp,setFp]=useState(()=>{try{return localStorage.getItem('rethink-fp')==='1'}catch{return false}});
  const toggleFp=()=>setFp(v=>{const n=!v;try{localStorage.setItem('rethink-fp',n?'1':'0')}catch{/* this visit only */}return n});
  // the 꽃집: which decor is being placed (the next tap on open grass plants it, Scene3D plantBlock)
  const [planting,setPlanting]=useState<{item:string}|null>(null);
  // fishing with 나루 at the pond (ui/Fishing.tsx, core/fishing.ts): talking, fishing, or the log; the float's phase
  const [fish,setFish]=useState<'talk'|'play'|'log'|null>(null),[bob,setBob]=useState<'wait'|'bite'|null>(null);
  const goPlace=(id:PlaceId)=>{const p=place(id);setPicked(null);setFocus(null);setView(null);setGoTo({...p.walk,at:Date.now()});setSheet(null)};
  // W5 타임랩스 (core/history.ts): which weekly frame is shown, and whether it plays on by itself
  const [lapse,setLapse]=useState<{i:number;playing:boolean}|null>(null);
  const frames=useMemo(lapseFrames,[]);
  useEffect(()=>{if(!lapse?.playing)return;const t=setTimeout(()=>setLapse(l=>l&&(l.i>=frames.length-1?{...l,playing:false}:{...l,i:l.i+1})),TIMING.lapseStep);return()=>clearTimeout(t)},[lapse,frames.length]);
  // the garden at rest: no menus, bubbles or tags over a scene that plays by itself
  // 관측소 원정 (game/Expedition.tsx): ?game=<id> opens a 판 directly; the garden stops drawing while it is open
  const [expedition,setExpedition]=useState<{pack:string|null}|null>(()=>{try{const id=new URLSearchParams(location.search).get('game');return id===null?null:{pack:id||null}}catch{return null}});
  // G5: in and out through the observatory door (the paper fade, as for the house); the 판's market each day dresses the
  // garden behind on a wide screen, where the 판 is a column and the garden still shows; on a phone the garden stops drawing
  const [gameMarket,setGameMarket]=useState<number|null>(null);
  const enterGame=(pack:string|null)=>{setPicked(null);setSheet(null);setFading(true);cue('door');setTimeout(()=>{setExpedition({pack});setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const leaveGame=()=>{setFading(true);cue('door');setTimeout(()=>{setExpedition(null);setGameMarket(null);setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const [wide,setWide]=useState(false);
  useEffect(()=>{const q=matchMedia('(min-width:760px) and (min-height:521px)'),f=()=>setWide(q.matches);f();q.addEventListener('change',f);return()=>q.removeEventListener('change',f)},[]);
  // 다른 정원들 (ui/SkyView.tsx, Sky3D.tsx): ?sky opens it; the garden is put away while it is open
  const [skyOpen,setSkyOpen]=useState<{focus:string|null}|null>(()=>{try{return new URLSearchParams(location.search).has('sky')?{focus:null}:null}catch{return null}});
  const [neighbours,setNeighbours]=useState<{planets:Planet[];sample:boolean}>({planets:[],sample:true});
  useEffect(()=>{if(!skyOpen)return;let on=true;planetRepo.neighbours(weekStart(clock.today)).then(n=>{if(on)setNeighbours(n)});return()=>{on=false}},[!!skyOpen,clock.today]);// eslint-disable-line react-hooks/exhaustive-deps
  const quiet=calm||!!lapse||me||!!expedition||!!skyOpen;
  // W3 time capsules (core/capsule.ts): one marker per tree; burying after a judgment, digging up as a grade opens
  const capsules=useMemo(()=>capsulesOf(s.judgments,s.graded,clock.today,s.holdings.map(x=>x.id)),[s.judgments,s.graded,clock.today,s.holdings]);
  const [capFx,setCapFx]=useState<World['capsuleFx']>(null),[jump,setJump]=useState(false);
  // the first bury plays long (hole, hover, drop, soil, pin: Capsule3D BURY), every one after it short
  const bury=(holdingId:number,then?:()=>void)=>{const t0=performance.now(),long=s.seen.bury===0,len=long?TIMING.capsuleBury:TIMING.capsuleBuryShort;
    setSheet(null);setPicked(null);setCapFx({kind:'bury',holdingId,t0,len});setFocus(holdingId);g.ops.saw('bury');
    const j=s.judgments.filter(x=>x.holdingId===holdingId).at(-1);
    setTimeout(()=>cue('capsule-bury'),len*BURY.drop);
    setTimeout(()=>{cue('capsule-mark');if(!then&&j)g.say(line(UI.buried,{name:j.name,mark:30}))},len*(BURY.pin+0.09));
    setTimeout(()=>{setCapFx(f=>f&&f.t0===t0?null:f);setFocus(f=>f===holdingId?null:f);then?.()},len+TIMING.capsuleLook*(long?1.4:0.8))};
  const dig=(holdingId:number)=>{const t0=performance.now();setCapFx({kind:'dig',holdingId,t0,len:TIMING.capsuleDig});cue('capsule-dig');setTimeout(()=>cue('capsule-open'),TIMING.capsuleDig*0.72)};
  // a dug-up capsule stays open over its tree only while its grade is on screen
  useEffect(()=>{if(sheet?.kind!=='grades'&&sheet?.kind!=='verdict')setCapFx(f=>f&&f.kind==='dig'?null:f)},[sheet]);
  const onCapsule=(holdingId:number)=>{const m=markers.find(x=>x.holdingId===holdingId),hh=holdings.find(x=>x.id===holdingId);if(!m||!hh)return;
    // a 지기 hypothesis: dug up with its verdict, or how long until its end date
    if(m.hypo){const hc=m.hypo;if(hc.due){setPicked(null);dig(holdingId);setSheet({kind:'verdict',journalId:hc.journalId,hypoId:hc.hypoId})}else g.say(`${hh.name} 가설 판정까지 ${hc.inDays}일 남았어요`);return}
    const c=m.old!;
    if(c.due){setPicked(null);setSheet({kind:'grades',start:c.judgmentId})}else g.say(line(UI.capsuleWait,{name:hh.name,mark:c.mark,d:c.inDays}))};
  // the look-back: buried now, then "30일 뒤", then dug up with its grade
  // 지기: a practice journal as of 30 days ago (core/jigi/lookback.ts); buried, "30일 뒤", dug up with its verdict
  const lookJudged=(p:LookbackPick)=>{if(!lookSig||!lookHolding)return;const id=lookHolding.id;
    const r=g.ops.journalLookback({holdingId:id,...p,signalId:lookSig.id,analyst:lookSig.analyst});if(!r){setSheet(null);return}
    bury(id,()=>{setJump(true);setTimeout(()=>{setJump(false);dig(id);setSheet({kind:'verdict',journalId:r.journalId,hypoId:r.hypoId})},TIMING.lookbackJump)})};
  // W2: the ground opened under one tree (core/roots.ts, Roots3D.tsx); closing slides it shut, then it goes
  const [cut,setCut]=useState<World['cutaway']>(null);
  const openDeep=(holdingId:number,back:SheetState=null)=>{const hh=g.s.holdings.find(x=>x.id===holdingId);if(!hh)return;
    const health=healthProvider.of(hh,signals.find(x=>x.holdingId===holdingId)??null);
    // the ground no longer opens under the tree (feedback 11-17: the roots looked odd): just the numbers sheet
    void health;setPicked(null);setSheet({kind:'deep',holdingId,back});g.ops.saw('cutaway')};
  const closeDeep=(back:SheetState)=>{setSheet(back)};
  const w=useWeather(),tiltCtl=useTilt(g.s.settings.tilt);
  const lapseBack=lapse?frames[lapse.i]:0,lapseDay=dayBack(clock.today,lapseBack);
  const lapseMarket=lapse&&lapseBack>0?marketProvider.today(lapseDay):null;
  const weather=expedition&&gameMarket!==null?weatherOf({index:gameMarket,swing:Math.abs(gameMarket)*1.6}):lapseMarket?weatherOf(lapseMarket):w?.weather??'clear',wl=LOOK.weather[weather];
  const holdings=g.s.holdings,ready=g.s.onboarded;
  // real prices (private test, prices.ts): for a signed-in player with an invite code, or an e2e page with a fixture
  const fixture=typeof window!=='undefined'?(window as unknown as {__priceFixture?:PriceFixture}).__priceFixture:undefined;
  const realPrices=useMemo<RealPrices|null>(()=>fixture?fixturePrices(fixture):syncOn?{search:searchNames,load:loadRealBars}:null,[fixture,syncOn]);
  const [pricesAt,setPricesAt]=useState(0);
  const realKey=holdings.filter(h=>h.real&&h.code).map(h=>h.code).join(',');
  // load the bars of the trees on real prices, then bring their return up to the latest close
  useEffect(()=>{if(!realPrices||!realKey)return;let on=true;
    void realPrices.load(g.s.holdings.filter(h=>h.real&&h.code).map(h=>({code:h.code!,name:h.name}))).then(()=>{if(!on)return;
      const cur=g.s.holdings,next=cur.map(h=>h.real&&h.code&&isReal(h.code)?refreshed(h,bars(h.code)):h);
      if(next.some((h,i)=>h!==cur[i]))g.ops.setHoldings(next);setPricesAt(Date.now())});
    return()=>{on=false}},[realPrices,realKey]);// eslint-disable-line react-hooks/exhaustive-deps
  // what the garden draws: the holdings now, or as they stood in the timelapse week (absent before they were bought)
  // the first screens stand on the world itself: an example garden grows behind them (shown only, never saved)
  const shown=useMemo(()=>welcome?DEMO_HOLDINGS:lapse?holdings.flatMap(x=>{const p=holdingAt(x,lapseBack);return p?[p]:[]}):holdings,[holdings,lapse?.i,welcome]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const hk=((window as {__proto3d?:{lapse?:unknown}}).__proto3d??={} as {lapse?:unknown});hk.lapse=lapse?{day:lapseDay,back:lapseBack,trees:shown.length,weather}:null},[lapse,shown]);// eslint-disable-line react-hooks/exhaustive-deps
  const signals=useMemo(()=>signalProvider.today(holdings,clock.today),[holdings,clock.today,pricesAt]);// eslint-disable-line react-hooks/exhaustive-deps
  // a signal is answered by a journal saved today on its stock (or, before 지기, a judgment)
  const wroteToday=(holdingId:number)=>judgedToday(s.judgments,holdingId,clock.today)||(s.journals??[]).some(j=>j.holdingId===holdingId&&j.status==='saved'&&!j.demo&&!j.practice&&j.savedAt!=null&&isoDay(new Date(j.savedAt))===clock.today);
  const open=signals.filter(x=>!wroteToday(x.holdingId));
  // 보리's stop-loss talk (db/functions/bori-talk): today's loss signals by company code
  const boriHoldings=useMemo(()=>holdings.map(x=>({company_id:codeOf(x),name:x.name})),[holdings]);
  const lossCodes=useMemo(()=>signals.filter(x=>x.loss).map(x=>holdings.find(h=>h.id===x.holdingId)).flatMap(h=>h?[codeOf(h)]:[]),[signals,holdings]);
  // e2e: window.__boriOpen stands in for the server (it gets the loss codes)
  const testOpen=typeof window!=='undefined'?(window as unknown as {__boriOpen?:(codes:string[])=>Promise<string|null>}).__boriOpen:undefined;
  // the server opens a stop-loss talk once (a second open returns nothing), so the first line is kept for the day:
  // 보리 says it when it comes over, and the talk sheet starts from the same line
  const openedRef=useRef<{day:string;text:string;emotion?:string}|null>((()=>{try{return JSON.parse(localStorage.getItem('rethink-bori-open')??'null')}catch{return null}})());
  const boriOpening=useCallback(async():Promise<BoriLine|null>=>{const today=clock.today,c=openedRef.current;if(c&&c.day===today)return {text:c.text,emotion:c.emotion??'curious'};
    // (the e2e stand-in answers with a plain line)
    const t=testOpen?await testOpen(lossCodes).then(x=>x?{text:x,emotion:'curious'}:null):await boriOpen(boriHoldings,lossCodes);
    if(t){openedRef.current={day:today,text:t.text,emotion:t.emotion};try{localStorage.setItem('rethink-bori-open',JSON.stringify(openedRef.current))}catch{/* this visit only */}}
    return t},[boriHoldings,lossCodes,testOpen,clock.today]);
  const todayCase=useMemo(()=>caseOfDay(CASES,clock.today,s.cases.filter(a=>a.day!==clock.today).map(a=>a.caseId)),[clock.today,s.cases]);
  const caseDone=!!answeredToday(s.cases,clock.today);
  const track=trackOf(s.judgments,s.graded);
  // the first visit's look-back: a loss signal if there is one (ui/Loop.tsx LookBack)
  // nothing flagged (stocks typed in that are up): moa's plain chart note on the tree that moved most (content/signals.ts)
  const lookSig=s.lookedBack?null:lookbackPick(signals)??lookbackNote(holdings),lookHolding=lookSig?holdings.find(x=>x.id===lookSig.holdingId):undefined;

  // today's three (core/today.ts): ticked off as they happen; all three close the day once
  const tasks=todayTasks({signals:signals.length,judgedToday:s.judgments.filter(j=>j.day===clock.today).length+(s.journals??[]).filter(j=>j.status==='saved'&&!j.demo&&!j.practice&&j.savedAt!=null&&isoDay(new Date(j.savedAt))===clock.today).length,caseDone,due:g.due.length,
    gradedToday:s.graded.filter(x=>x.day===clock.today).length,rewindsToday:s.rewinds.filter(r=>r.day===clock.today).length});
  const tasksDone=tasks.filter(t=>t.done).length,allDone=ready&&dayDone(tasks);
  useEffect(()=>{if(allDone)g.ops.closeDay()},[allDone]);// eslint-disable-line react-hooks/exhaustive-deps
  // this week's goals (core/weekly.ts): all three done pays once
  const week=weekGoals(clock.today,weekCtx(g));
  useEffect(()=>{if(ready&&week.done)g.ops.closeWeek(week.start)},[ready,week.done,week.start]);// eslint-disable-line react-hooks/exhaustive-deps
  // a new title (core/rank.ts) brings its item
  const rank=rankOf(xpOf({graded:s.graded.length,cases:s.cases.length,rewinds:s.rewinds.length,work:workOf(s)}));
  useEffect(()=>{if(rank.index>s.rankSeen)g.ops.rankUp(rank.index,rank.name)},[rank.index,s.rankSeen]);// eslint-disable-line react-hooks/exhaustive-deps
  const goTask=(t:TaskId)=>setSheet(t==='judge'?{kind:'journal'}:{kind:t==='grade'?'grades':t});
  // nothing flagged in the new garden: no look-back to show
  useEffect(()=>{if(sheet?.kind==='lookback'&&!lookSig)setSheet(null)},[sheet,lookSig]);
  // sound (core/sound.ts, synthesised): on unless the player turned it off; the browser lets it start on the first press
  useEffect(()=>{configure({...DEFAULT_SOUND,on:s.sound,sfx:s.settings.sfx})},[s.sound,s.settings.sfx]);
  // the settings that every screen follows: keeping still, the text size
  useEffect(()=>{const d=document.documentElement.dataset;d.still=s.settings.still?'1':'0';d.text=s.settings.text},[s.settings.still,s.settings.text]);
  // a run of days that was rescued or lost is said once, as the garden opens
  useEffect(()=>{const n=s.streak.notice;if(n&&n.day===clock.today)g.say(n.kind==='reset'?line(UI.streakReset,{run:n.run}):UI.streakRescue)},[]);// eslint-disable-line react-hooks/exhaustive-deps

  // where the day has each analyst (signals first, luon by an arrived grade's capsule, then their own spots, home at night)
  const dueTree=g.due.find(d=>holdings.some(h=>h.id===d.judgment.holdingId))?.judgment.holdingId??null;
  const day=routineOf(minutes,{tori:open.filter(x=>x.analyst==='tori').map(x=>x.holdingId),moa:open.filter(x=>x.analyst==='moa').map(x=>x.holdingId),luon:[]},dueTree);
  const ctx=wearCtx(g),look=fitLook(s.look,ctx),light=daylightOf(minutes);
  // the garden's ambience (core/sound.ts): by where I stand and the time of day; quiet indoors, on the stage, in sheets
  useEffect(()=>{const t=setInterval(()=>{const p=(window as unknown as {__proto3d?:{player?:{x:number;z:number}}}).__proto3d?.player;
    if(!p||inside||me||!ready){ambience({stream:0,fire:0,birds:0,crickets:0});return}
    const near=(d:number,r:number)=>Math.max(0,1-d/r),fire=Math.hypot(p.x-FIRE_AT[0],p.z-FIRE_AT[1]),creek=Math.abs(p.z-streamZ(p.x));
    ambience({stream:near(creek,9),fire:near(fire,5),birds:light.day*(weather==='storm'?0.1:0.8),crickets:light.night*0.9})},1000);
    return()=>clearInterval(t)},[inside,me,ready,light.day,light.night,weather]);
  // a first-time pointer (core/tips.ts), only in a quiet moment out in the garden
  // last month's letter (core/letter.ts), once the new month has opened
  const letterFor=(m:string)=>letterOf(m,s.judgments,s.graded,{cases:s.cases,rewinds:s.rewinds,stamps:s.stamps,expeditions:s.expeditions??[],journals:s.journals??[]},id=>stampById(id as never).name);
  const lastLetter=letterFor(prevMonth(monthOf(clock.today))),letterWaiting=ready&&letterDue(clock.today,s.letters,lastLetter);
  const oldest=s.judgments.reduce((m,j)=>Math.max(m,daysFrom(j.day,clock.today)),0);
  // the first-run tutorial (ui/Home.tsx): once, in the first quiet moment after the garden is planted; 설정 plays it again.
  // e2e pages start with it off (tests/e2e/fixtures.ts) unless the address has ?tutorial
  const [tutAgain,setTutAgain]=useState(false);
  const tutAllowed=typeof window==='undefined'||!(window as {__noTutorial?:boolean}).__noTutorial;
  const tutOn=ready&&!quiet&&!inside&&!sheet&&!buildMode&&picked===null&&!capFx&&!jump&&(tutAgain||(tutAllowed&&!s.tips.includes('tutorial')));
  const tip=!tutOn&&ready&&!quiet&&!inside&&!sheet&&picked===null&&!g.due.length&&!letterWaiting&&!capFx&&!jump&&!buildMode?nextTip(s.tips,{judgments:s.judgments.length,oldestDays:oldest}):null;
  // the one next step on the home screen (core/next.ts)
  const firstOpen=open[0],firstHolding=firstOpen?holdings.find(x=>x.id===firstOpen.holdingId):undefined;
  const next=nextStep({due:g.due.length,signal:firstOpen&&firstHolding?{id:firstOpen.id,name:firstHolding.name,analyst:firstOpen.analyst,headline:firstOpen.headline}:null,
    letter:letterWaiting?monthLabel(lastLetter.month):null,caseOpen:!caseDone});
  const newStampDot=s.stamps.some(x=>x.day===clock.today);
  // one analyst bubble at a time over the garden; they take turns
  const [turn,setTurn]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTurn(n=>n+1),TIMING.bubbleTurn);return()=>clearInterval(t)},[]);
  // the sky behind the garden: the weather's, warmed at dawn and dusk, darkened at night
  const sky=(k:'top'|'mid'|'bottom')=>mixHex(mixHex(wl.sky[k],LOOK.daylight.dusk[k],light.warm*0.75),LOOK.daylight.night[k],light.night);
  // stamps (core/stamps.ts): whatever newly holds is stamped once, with today's date
  const fresh=ready?newStamps({judgments:s.judgments.length,graded:s.graded.map(x=>({hit:x.hit,confidence:s.judgments.find(j=>j.id===x.judgmentId)?.confidence??3})),
    bestStreak:s.streak.best,rewinds:s.rewinds.length,cases:s.cases.length,daysDone:s.daysDone.length,seen:s.seen,calibration:track.calibration,
    expeditions:(s.expeditions??[]).map(r=>({week:r.week,sureHit:r.decisions.some((d,i)=>d.chips>=4&&r.results?.[i]==='hit')}))},s.stamps.map(x=>x.id)):[];
  useEffect(()=>{if(fresh.length)g.ops.stamp(fresh)},[fresh.join(',')]);// eslint-disable-line react-hooks/exhaustive-deps
  const share:Share=s.settings.share??'hide';
  const myCtx={name:s.name,rank:rank.name,habit:habitOf(s.judgments,s.graded).name,color:(PALETTES.find(p=>p.id===look.palette)??PALETTES[0]).primary,
    hit:track.hitRate,calibration:track.calibration,best:(s.expeditions??[]).length?Math.max(...(s.expeditions??[]).map(r=>r.total)):null,stamps:s.stamps.length};
  // I always see my own planet; with sharing off it is marked so and nothing is published
  const mine=myPlanet(holdings,defaultRules,share==='off'?'hide':share,myCtx);
  const skyPlanets=useMemo(()=>mine?[{...mine,share},...neighbours.planets]:neighbours.planets,[JSON.stringify(mine),share,neighbours]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{planetRepo.publish(share==='off'?null:mine)},[share,JSON.stringify(mine)]);// eslint-disable-line react-hooks/exhaustive-deps
  const skyWorld=skyOpen?{planets:skyPlanets,focus:skyOpen.focus,onPick:(id:string)=>setSkyOpen({focus:id==='me'?null:id})}:null;
  useEffect(()=>{const hk=((window as {__proto3d?:{sky?:unknown}}).__proto3d??={} as {sky?:unknown});hk.sky=skyOpen?{focus:skyOpen.focus,planets:skyPlanets.length,share,sample:neighbours.sample}:null},[skyOpen,skyPlanets,share,neighbours.sample]);
  // 보리 (core/friend.ts): comes over once the garden is planted and starts a talk from what is going on today;
  // after one talk a day it stays but says nothing more until tomorrow
  const [friendDay,setFriendDay]=useState<string|null>(()=>{try{return localStorage.getItem('rethink-friend-day')}catch{return null}});
  // 보리 is only around in the plain garden (feedback 11-17: it talked over My Page): not on My Page, the sky, the
  // 넓히기 mode, while planting, in the timelapse or inside the house
  const friendHere=ready&&!lapse&&!calm&&!inside&&!me&&!skyOpen&&!buildMode&&!planting&&!fish;
  const friendCtx={hour:Math.floor(minutes/60),due:g.due.length,
    signal:firstOpen&&firstHolding?{name:firstHolding.name,analyst:ANALYSTS.find(a=>a.id===firstOpen.analyst)?.name??''}:null,holdings:holdings.map(x=>x.name)};
  const opener=friendOpener(friendCtx,clock.today);
  // 보리 comes over (feedback 11-17): on a day with a stop-loss signal, once the garden has settled, 보리 walks up to the
  // player and says the first line of the talk (the LLM one when signed in) in its bubble. Once a day; no nagging after.
  const boriTalks=(syncOn||!!testOpen)&&lossCodes.length>0;
  // text: undefined while the server is asked, then the line (or null: small talk instead)
  const [boriCame,setBoriCame]=useState<{at:{x:number;z:number};me:{x:number;z:number};text?:string|null}|null>(null);
  useEffect(()=>{if(!ready||!friendHere||!boriTalks||friendDay===clock.today||boriCame||sheet)return;
    const t=setTimeout(()=>{const me=(window as unknown as {__proto3d?:{player?:{x:number;z:number}}}).__proto3d?.player??{x:0,z:0};
      setBoriCame({at:{x:me.x+LOOK.boriCome.side,z:me.z+LOOK.boriCome.front},me:{x:me.x,z:me.z}});
      void boriOpening().then(l=>setBoriCame(b=>b&&{...b,text:l?.text??null}))},TIMING.boriCome);
    return()=>clearTimeout(t)},[ready,friendHere,boriTalks,friendDay,clock.today,boriCame,sheet,boriOpening]);
  // the dialogue (ui/Friend.tsx) has the two of them side by side: tapped from afar, the player walks up to 보리 first;
  // 보리 stays put until the talk is over, and the camera frames them (Scene3D world.talk)
  const [talkSpot,setTalkSpot]=useState<{at:{x:number;z:number};me:{x:number;z:number}}|null>(null);
  // the face 보리 wears (the talk box sets it per line; back to neutral when the talk is over)
  const [boriFace,setBoriFace]=useState<BoriFace>('neutral');
  const boriAt=boriCame&&friendDay!==clock.today?boriCame.at:FRIEND_SPOT;
  const talkFriend=()=>{const at=boriAt,me=(window as unknown as {__proto3d?:{player?:{x:number;z:number}}}).__proto3d?.player??{x:at.x,z:at.z+2};
    const d=Math.hypot(me.x-at.x,me.z-at.z)||1,B=LOOK.boriCome;let stand={x:me.x,z:me.z};
    if(d>B.reach||d<0.8){const k=B.stand/d;stand={x:at.x+(me.x-at.x)*k,z:at.z+(me.z-at.z)*k};setGoTo({...stand,at:Date.now()})}
    setTalkSpot({at,me:stand});setPicked(null);setSheet({kind:'friend'});setFriendDay(clock.today);try{localStorage.setItem('rethink-friend-day',clock.today)}catch{/* stays for this visit */}};
  useEffect(()=>{if(sheet?.kind!=='friend'){setTalkSpot(null);setBoriFace('neutral')}},[sheet]);
  // 보리 came over: once the server has answered, the dialogue opens by itself (nothing else open)
  // (also when the player comes back from My Page, the sky or the like: the talk waited)
  useEffect(()=>{if(boriCame&&boriCame.text!==undefined&&friendDay!==clock.today&&!sheet&&friendHere)talkFriend()},[boriCame?.text,friendHere]);// eslint-disable-line react-hooks/exhaustive-deps
  // 지기 투자일지 (docs/jigi.md): a new page from a tree, a quick chip, a signal or the book; the camera goes to its tree
  const journals=s.journals??[];
  // the master account gets its coins topped up once it is known (the save syncs as usual)
  // ...and after every spend, so they never run short; the rest is opened through core/master.ts
  useEffect(()=>{if(master&&s.currency<MASTER.coins)g.ops.masterCoins()},[master,s.currency]);// eslint-disable-line react-hooks/exhaustive-deps
  // writing looks at the tree; once the sheet closes the camera goes back to following the player (it used to stay)
  useEffect(()=>{if(sheet?.kind!=='write'&&!capFx)setFocus(null)},[sheet,capFx]);
  const writeNew=(o:{holdingId?:number|null;quick?:Quick;signalId?:string|null}={})=>{const id=g.ops.journalNew(o);setPicked(null);if(o.holdingId!=null)setFocus(o.holdingId);setSheet({kind:'write',id})};
  const toReview=liveJournals(journals).filter(j=>!j.demo&&needsReview(j,clock.today)).length;
  // one capsule marker per tree: an old judgment's grade or a hypothesis's verdict that has arrived, else the nearest to come
  const hypoCaps=useMemo(()=>hypoCapsules(journals,clock.today,s.holdings.map(x=>x.id)),[journals,clock.today,s.holdings]);
  type Marker={holdingId:number;due:boolean;label:string;old:Capsule|null;hypo:HypoCapsule|null};
  const markers:Marker[]=s.holdings.flatMap((hh):Marker[]=>{const old=capsules.find(c=>c.holdingId===hh.id),hy=hypoCaps.find(c=>c.holdingId===hh.id);
    const pickOld=old&&(old.due||!hy||(!hy.due&&old.inDays<=hy.inDays));
    return pickOld?[{holdingId:hh.id,due:old.due,label:capsuleLabel(old),old,hypo:null}]:hy?[{holdingId:hh.id,due:hy.due,label:hypoCapsuleLabel(hy),old:null,hypo:hy}]:[]});
  const confirmHypo=(id:string,hid:string)=>{const r=g.ops.journalConfirm(id,hid),j=journals.find(x=>x.id===id),hy=j?.hypos.find(x=>x.id===hid);
    if(r.buried&&j?.holdingId!=null){const name=j.stock?.name??'';bury(j.holdingId,()=>g.say(`${name} 가설을 나무 아래 묻었어요. ${hy?.endDate??''} 종가로 판정해요`))}return r.say};
  // 부지·건물·랜드마크 (core/land.ts, ui/Build.tsx): 넓히기 mode shows the closed lots on the garden; a tap asks first
  const built=s.built??BUILT0;
  // after opening a city or building something, the camera looks at it for a moment (Scene3D world.view)
  const [view,setView]=useState<{x:number;z:number;y?:number;az?:number}|null>(null);
  useEffect(()=>{if(!view)return;const t=setTimeout(()=>setView(null),TIMING.buildLook);return()=>clearTimeout(t)},[view]);
  const world:World={
    // the three come in with the first trees
    analysts:!ready||lapse||(calm&&(bStage==='trees'||bStage==='orbit'))?[]:ANALYSTS.map(a=>{
      // tori comes over to the open ground
      if(a.id==='tori'&&cut&&!cut.closing)return {id:a.id,at:cut.holdingId,bubble:null};
      const r=day[a.id];
      if(r.kind==='signal'){const sig=open.find(x=>x.analyst===a.id&&x.holdingId===r.holdingId)!,h=holdings.find(x=>x.id===sig.holdingId);return {id:a.id,at:r.holdingId,bubble:h?{text:`${h.name} · ${sig.headline}`,alert:sig.loss}:null}}
      if(r.kind==='grade')return {id:a.id,at:r.holdingId,near:true,bubble:{text:`채점 결과 ${g.due.length}건`,alert:true}};
      if(r.kind==='home')return {id:a.id,at:null,home:true,bubble:null};
      // two of them met: one says something, the other answers
      const talk=r.with?(()=>{const first=a.id<r.with!?a.id:r.with!,second=first===a.id?r.with!:a.id,c=chatOf(first as 'tori',second as 'tori',Math.floor(minutes/4));return first===a.id?c.a:c.b})():null;
      const dueBubble=a.id==='luon'&&g.due.length?{text:`채점 결과 ${g.due.length}건`,alert:true}:null;
      return {id:a.id,at:null,spot:r.spot,bubble:talk?{text:talk,alert:false}:dueBubble};
    }),
    pots:holdings.map(h=>({holdingId:h.id,open:!!openFor(s.cooldowns,h.id),flowers:flowersOn(s.cooldowns,h.id)})).filter(p=>p.open||p.flowers),
    decor:s.owned.filter(o=>o.slot).map(o=>({slot:o.slot!,shape:itemById(o.itemId)!.shape})),
    burst,focus,birth,enterFrom:calm?DOOR:null,cutaway:cut,onDeep:id=>{if(!calm&&ready)openDeep(id)},
    capsules:lapse?pinsAt(s.judgments,lapseDay,shown.map(x=>x.id)).map(id=>({holdingId:id,due:false})):markers.map(c=>({holdingId:c.holdingId,due:c.due})),capsuleFx:capFx,onCapsule:id=>{if(!calm)onCapsule(id)},hitRate:track.hitRate,cartFlag:CART_FLAGS[Number(clock.today.slice(-2))%CART_FLAGS.length],gameLit:!(s.expeditions??[]).some(r=>r.week===weekStart(clock.today)),
    onAnalyst:id=>{if(id==='luon'&&g.due.length){setSheet({kind:'grades'});return}const sig=open.find(x=>x.analyst===id);
      setSheet(sig?{kind:'brief',start:{signalId:sig.id}}:{kind:'analyst',id})},
    flags:LEAGUE_FLAGS,myFlag:0,caseOpen:!caseDone,goTo,inside,look,stage:me,light,sky:skyWorld,fp:fp&&!inside,
    plants:(s.plants??[]).map(p=>({...p,scale:shopPlant(p.item)?.scale??1})),planting:planting&&!sheet?planting:null,
    onPlant:(x,z,why)=>{if(!planting)return;const it=shopPlant(planting.item);if(!it)return;if(why){g.say(why);return}
      const r=g.ops.plant(it,x,z);if(r==='ok'){g.say(`${it.name} 심었어요 · 코인 -${it.price}`);setPlanting(null);cue('capsule-mark')}
      else g.say(r==='coins'?'코인이 모자라요':'다른 꽃·나무랑 너무 가까워요')},
    // 보리 came over and is talking: the camera comes close on the two of them until the talk opens or is answered
    // with 나루: the camera on the two of them while talking, over the player's shoulder onto the water while fishing
    talk:fish==='talk'?{x:(NARU.x+FISH_STAND.x)/2,z:(NARU.z+FISH_STAND.z)/2,az:Math.atan2(FISH_STAND.x-NARU.x,FISH_STAND.z-NARU.z)+LOOK.camera.talk.turn}
      :fish==='play'?{x:FISH_AT.x*0.8+FISH_STAND.x*0.2,z:FISH_AT.z*0.8+FISH_STAND.z*0.2,az:Math.atan2(FISH_STAND.x-FISH_AT.x,FISH_STAND.z-FISH_AT.z)+0.35,pitch:LOOK.camera.fish.pitch,dist:LOOK.camera.fish.dist}
      :talkSpot&&sheet?.kind==='friend'?{x:(talkSpot.at.x+talkSpot.me.x)/2,z:(talkSpot.at.z+talkSpot.me.z)/2,
      // from behind the player looking at 보리 (it faces the player, so its face shows), swung a little to the side
      az:Math.atan2(talkSpot.me.x-talkSpot.at.x,talkSpot.me.z-talkSpot.at.z)+LOOK.camera.talk.turn}:null,
    room:{books:s.judgments.slice(-36).map(j=>{const gr=s.graded.filter(x=>x.judgmentId===j.id).at(-1);return {state:gr?(gr.hit?'hit':'miss'):'waiting'} as const}),
      notes:capsules.map(c=>({holdingId:c.holdingId,due:c.due})),
      resting:ANALYSTS.filter(a=>day[a.id].kind==='home'||day[a.id].kind==='spot').map(a=>a.id),
      onDesk:()=>setSheet({kind:'today'}),onShelf:()=>setSheet({kind:'records'}),
      onBoard:()=>{if(g.due.length)setSheet({kind:'grades'});else g.say(capsules.length?line(UI.boardWait,{n:capsules.length}):UI.boardEmpty)},onDoor:()=>swapRoom(false)},
    naru:ready&&!lapse&&!calm&&!inside&&!me&&!skyOpen?{at:NARU,onPick:()=>{if(fish)return;setPicked(null);setSheet(null);setGoTo({...FISH_STAND,at:Date.now()});setFish('talk')}}:null,
    fishing:fish==='play'&&bob?{...FISH_AT,phase:bob}:null,
    friend:friendHere?{at:talkSpot&&sheet?.kind==='friend'?talkSpot.at:boriAt,onPick:talkFriend,face:boriFace}:null,
    view,
    build:ready?{built,mode:buildMode&&!quiet&&!inside,onLot:key=>{const [k,id]=key.split(':');if(k==='city'){setPicked(null);setSheet({kind:'cities'});return}setWant({kind:k as 'land'|'building',id})}}:null,
    onLandmark:k=>{if(k==='house'){enterHouse();return}setPicked(null);setSheet({kind:k==='observatory'?'game':k==='signpost'?'records':k==='library'?'library':k==='plaza'?'league':'cart'})},
  };

  // 보리 came over to talk: its line is the only bubble until it is answered
  const boriLine=friendHere&&friendDay!==clock.today&&boriCame?.text?{id:FRIEND.id,text:'보리 · '+boriCame.text,alert:true}:null;
  const bubbles:{id:string;text:string;alert:boolean}[]=boriLine?[boriLine]:[...(friendHere&&friendDay!==clock.today?[{id:FRIEND.id,text:'보리 · '+opener.short,alert:false}]:[]),
    ...world.analysts.flatMap(a=>a.bubble?[{id:a.id,...a.bubble}]:[])];
  // the bubbles hold still while the tutorial points at one
  const heldTurn=useRef(0);if(!tutOn)heldTurn.current=turn;
  const bubbleNow=bubbles.length?[bubbles[heldTurn.current%bubbles.length]]:[];
  const h=holdings.find(t=>t.id===picked);
  const st=h&&treeState(h,defaultRules);
  const cd=h?openFor(s.cooldowns,h.id):null;
  const close=()=>setSheet(null);
  const dock:['garden'|'journal'|'game'|'more',string,typeof Ledger,number][]=[
    ['garden','정원',Sprout,0],['journal','일지',Ledger,g.due.length+open.length+toReview],['game','챌린지',Scope,0],['more','더보기',More,caseDone?0:1]];
  const pickMore=(id:MoreId)=>{if(id==='build'){setSheet(null);setPicked(null);setBuildMode(true);return}if(id==='cities'){setSheet({kind:'cities'});return}
    if(id==='me'){setSheet(null);setMe(true)}else if(id==='sky'){setSheet(null);setSkyOpen({focus:null})}
    else setSheet(id==='holdings'?{kind:'onboard'}:id==='shop'?{kind:'cart'}:{kind:id})};
  const decideCooldown=()=>{if(!cd||!h)return;const waited=g.ops.finishCooldown(cd.id);if(waited)g.say(UI.cooldownBloom);setEarly(false);setPicked(null);setSheet({kind:'brief',start:{holdingId:h.id}})};

  return (
    <div className={`proto3d${ready&&!quiet?"":" no-dock"}`} data-testid="proto3d" data-weather={weather} onPointerDownCapture={unlock} onClickCapture={e=>{if((e.target as HTMLElement).closest('button'))cue('ui-button')}}
      data-night={light.night>0.5} style={{background:`linear-gradient(180deg,${sky('top')} 0%,${sky('mid')} 38%,${sky('bottom')} 100%)`}}>
      {light.night>0.05&&<div className="proto3d-stars" aria-hidden style={{opacity:light.night}}/>}
      {w&&<Canvas frameloop={expedition&&!wide?'never':'always'} shadows="soft" dpr={[1,1.5]} gl={{antialias:false,alpha:true,powerPreference:'high-performance'}}
        camera={{fov:46,near:0.5,far:120,position:[0,21,14.5]}}>
        <Scene3D holdings={shown} picked={picked} onPick={id=>{setPicked(id);setEarly(false)}} recenter={recenter} weather={weather} world={world}/>
      </Canvas>}
      <div className="proto3d-sun" aria-hidden hidden={!!skyOpen}
        style={{width:LOOK.sunGlow.size,height:LOOK.sunGlow.size,opacity:wl.glow*light.day,
          background:`radial-gradient(circle at center,${LOOK.sunGlow.color} 0%,${LOOK.sunGlow.color}88 22%,transparent 62%)`}}/>

      <div className="proto3d-top">
        <div className="rt-top-left">
        {w&&(!expedition||wide)&&!skyOpen&&!welcome&&!me&&<div className="rt-weather" aria-label="오늘 시장 날씨">
          <span className="rt-weather-k">{lapseMarket||(expedition&&gameMarket!==null)?'그날 시장':'오늘 시장'}</span>
          <strong>{WEATHER_LABEL[weather]}</strong>
          <span className="rt-num">{(()=>{const v=expedition&&gameMarket!==null?gameMarket:lapseMarket?.index??w.index;return (v>0?'+':'')+v.toFixed(2)})()}%</span>
          <small>{WEATHER_NOTE[weather]}</small>
        </div>}
        </div>
        {/* the top holds the weather, my coins and me; my numbers, sound and tilt live in 더보기 and 설정 */}
        {ready&&!quiet&&<div className="rt-top-right">
          {/* coins always in sight (2026-11-16 feedback); a tap opens 넓히기, where they are spent */}
          {!buildMode&&!me&&<button type="button" className="rt-coins rt-num" aria-label={`코인 ${s.currency} · 넓히기`} onClick={()=>{setPicked(null);setSheet(null);setBuildMode(true)}}><Coin/>{s.currency}</button>}
          <button type="button" className="rt-me-chip" aria-label={`내 프로필 · ${s.name||'이름 없음'} · ${rank.name}`} onClick={()=>{setPicked(null);setSheet(null);setMe(true)}}>
          <span className="rt-me-chip-face" aria-hidden/>{newStampDot&&<i className="rt-me-dot" aria-label="새 도장"/>}</button></div>}
      </div>
      {ready&&!h&&!quiet&&!inside&&!sheet&&!capFx&&!me&&<Signs built={built}/>}
      {ready&&!h&&!quiet&&!inside&&!sheet&&!capFx&&!buildMode&&<CapsuleTags items={markers} names={Object.fromEntries(holdings.map(x=>[x.id,x.name]))} onPick={onCapsule}/>}
      {jump&&<div className="rt-jump" role="status">{UI.jump}</div>}
      {!h&&!quiet&&!inside&&!buildMode&&!me&&!skyOpen&&!planting&&<Bubbles items={bubbleNow} onPick={id=>id===FRIEND.id?talkFriend():world.onAnalyst(id as AnalystId)}/>}
      {!ready&&!sheet&&<button type="button" className="rt-banner" onClick={()=>setSheet({kind:'onboard'})}><span>정원이 비어 있어</span><b>내 종목 넣기</b></button>}
      {ready&&!sheet&&!quiet&&!inside&&!capFx&&!jump&&!buildMode&&h===undefined&&<NextCard step={next} tasks={{done:tasksDone,total:tasks.length}} onToday={()=>setSheet({kind:'today'})}
        onGo={()=>{setPicked(null);setSheet(next.kind==='grades'?{kind:'grades'}:next.kind==='signal'?{kind:'brief',start:{signalId:next.id}}:next.kind==='letter'?{kind:'letter',month:lastLetter.month}:{kind:'case'})}}/>}
      {tutOn&&<Tutorial trees={holdings.map(x=>x.id)}onDone={then=>{g.ops.tipDone('tutorial');setTutAgain(false);if(then)setSheet({kind:'journal'})}}/>}
      {inside&&!sheet&&<RoomTags items={[{k:'room-desk',text:`책상 · 오늘 ${tasksDone}/${tasks.length}`,onClick:()=>setSheet({kind:'today'})},
        {k:'room-shelf',text:`판단 ${s.judgments.length}개`,onClick:()=>setSheet({kind:'records'})},
        {k:'room-board',text:g.due.length?`채점 완료 ${g.due.length}`:`채점 대기 ${capsules.length}`,alert:g.due.length>0,onClick:()=>g.due.length?setSheet({kind:'grades'}):g.say(capsules.length?line(UI.boardWait,{n:capsules.length}):UI.boardEmpty)},
        {k:'room-door',text:'밖으로',onClick:()=>swapRoom(false)}]}/>}
      {inside&&!sheet&&<button type="button" className="rt-btn rt-exit" onClick={()=>swapRoom(false)}>밖으로 나가기</button>}
      {fading&&<div className="rt-room-fade" aria-hidden/>}
      {tip&&<Tip text={tipText(tip)} target={TIP_AT[tip].target} point={TIP_AT[tip].point} onDone={()=>g.ops.tipDone(tip)}/>}
      {skyOpen&&!sheet&&<SkyView planets={skyPlanets} sample={neighbours.sample} share={share} focus={skyOpen.focus} onPick={id=>setSkyOpen({focus:id})}
        onShare={v=>g.ops.setSettings({...s.settings,share:v})} onClose={()=>setSkyOpen(null)}/>}
      {me&&!sheet&&<MyPage g={g} onClose={()=>setMe(false)} onRecords={()=>setSheet({kind:'records'})} onSettings={()=>setSheet({kind:'settings'})} onLetter={()=>setSheet({kind:'letter',month:monthOf(clock.today)})}/>}
      {sheet?.kind==='settings'&&<SettingsSheet g={g} onClose={close} tilt={tiltCtl} account={account?.email??null}
        onLogOut={account?()=>{void authRepo.logOut();setAccount(null);setSheet(null)}:undefined}
        onDelete={syncOn&&saveRepo?async()=>{const e=await saveRepo!.deleteMe();if(e)return e;try{localStorage.removeItem('rethink-account-v1');localStorage.removeItem('rethink-guest')}catch{/* nothing kept */}g.ops.wipe();return null}:undefined}
        onWipe={synced&&saveRepo?()=>{void saveRepo!.push({v:1,holdings:null,judgments:[]}).finally(()=>g.ops.wipe())}:undefined} onTutorial={()=>{setSheet(null);setPicked(null);setTutAgain(true)}}/>}
      {sheet?.kind==='journal'&&<JigiBook key={(sheet.openId??'book')+(sheet.stats?':stats':'')} openId={sheet.openId} startTab={sheet.stats?'stats':'book'} ai={syncOn?jigiAI:null} journals={journals} today={clock.today} now={clock.now} oldCount={s.judgments.length} onClose={close}
        onHypos={g.ops.journalHypos} onConfirm={confirmHypo} onReflect={g.ops.journalReflect}
        renderStats={(openJ,stock)=><JigiStats ai={syncOn?jigiAI:null} journals={journals} today={clock.today} now={clock.now} tasks={s.jigi?.tasks??[]} principles={s.jigi?.principles??[]} typeNo={s.jigi?.typeNo??{}}
          onTask={g.ops.jigiTask} onPrinciple={g.ops.jigiPrinciple} onTaskDone={g.ops.jigiTaskDone} onTaskDrop={g.ops.jigiTaskDrop} onTypeNo={g.ops.jigiTypeNo} onOpen={openJ} onStock={stock} onNew={()=>writeNew()}/>}
        oldDue={g.due.length} onOldGrades={()=>setSheet({kind:'grades'})} onSignal={id=>setSheet({kind:'brief',start:{signalId:id}})}
        signals={signals.flatMap(x=>{const hh=holdings.find(y=>y.id===x.holdingId),a=ANALYSTS.find(y=>y.id===x.analyst);if(!hh||!a)return [];
          return [{id:x.id,name:hh.name,who:a.id,whoName:a.name,line:x.headline,loss:x.loss,written:wroteToday(hh.id)}]})}
        onWrite={id=>setSheet({kind:'write',id})} onNew={code=>writeNew({holdingId:code?holdings.find(x=>x.code===code)?.id??null:null})}
        onArchive={g.ops.journalArchive} onTrash={g.ops.journalTrash} onPurge={g.ops.journalPurge} onOld={()=>setSheet({kind:'records'})}/>}
      {sheet?.kind==='verdict'&&(()=>{const j=journals.find(x=>x.id===sheet.journalId),hy=j?.hypos.find(x=>x.id===sheet.hypoId);if(!j||!hy)return null;
        return <JigiVerdict j={j} h={hy} today={clock.today} onClose={()=>{g.ops.journalOpened(j.id,hy.id);close()}} onReview={()=>{g.ops.journalOpened(j.id,hy.id);setSheet({kind:'journal',openId:j.id})}}/>})()}
      {sheet?.kind==='cities'&&<CityBook built={built} coins={s.currency} onClose={close} onOpen={id=>{if(g.ops.build({kind:'city',id})){setSheet(null);setBuildMode(false);
        const c=CITY_SPOT(id);if(c)setView({x:c[0],z:c[1],y:3.2,az:Math.atan2(-c[0],-c[1])})}}}/>}
      {buildMode&&ready&&!quiet&&!inside&&!sheet&&<><BuildBar coins={s.currency} onCities={()=>setSheet({kind:'cities'})} onDone={()=>{setBuildMode(false);setWant(null)}}/>
        {!want&&<BuildTags built={built} coins={s.currency} onPick={setWant}/>}
        {want&&<BuildConfirm want={want} coins={s.currency} onNo={()=>setWant(null)} onYes={()=>{const w=want;if(g.ops.build(w)){const at=w.kind==='land'?LANDS.find(l=>l.id===w.id)?.at:BUILDINGS.find(b=>b.id===w.id)?.at;if(at)setView({x:at[0],z:at[1],y:1.2})}setWant(null)}}/>}</>}
      {sheet?.kind==='write'&&(()=>{const j=journals.find(x=>x.id===sheet.id);if(!j)return null;
        const marks=liveJournals(journals).filter(x=>x.stock&&x.stock.code===j.stock?.code&&x.anchor).map(x=>({id:x.id,date:x.anchor!.date,price:x.anchor!.close}));
        return <JigiWrite key={j.id} ai={syncOn?jigiAI:null} j={j} today={clock.today} marks={marks} tasks={(s.jigi?.tasks??[]).filter(t=>!t.done)} edit={fn=>g.ops.journalEdit(j.id,fn)} onClose={()=>setSheet({kind:'journal'})} onSaved={()=>setSheet({kind:'journal',stats:true})}
          onSave={()=>{const r=g.ops.journalSave(j.id);if(!r)return {missing:[]};return r.ok?{version:r.version}:{missing:r.missing}}}/>})()}
      {sheet?.kind==='more'&&<MoreSheet currency={s.currency} streak={shownCount(s.streak,clock.today)} week={weekPoints(s.graded,s.cases,clock.today,weekWorkOf(s,clock.today))}
        dots={{case:!caseDone,rewind:paidLeft(s.rewinds,clock.today)>0}} onPick={pickMore} onClose={close}/>}
      {sheet?.kind==='letter'&&<LetterSheet letter={letterFor(sheet.month)} onClose={()=>{g.ops.letterRead(sheet.month);close()}}/>}
      {ready&&!quiet&&!inside&&<button type="button" className="proto3d-locate proto3d-map" aria-label="지도" onClick={()=>{setPicked(null);setSheet({kind:'map'})}}><MapIcon size={20}/></button>}
      {ready&&!quiet&&!inside&&<button type="button" className="proto3d-locate proto3d-view" aria-label={fp?'3인칭으로 보기':'1인칭으로 보기'} aria-pressed={fp} onClick={()=>{setPicked(null);toggleFp()}}><span className="rt-view-label">{fp?'3인칭':'1인칭'}</span></button>}

      {/* four tabs: 정원 closes whatever is open, 일지 is the journal only, 원정 the game, 더보기 the rest */}
      {ready&&!quiet&&<nav className="rt-dock" aria-label="메뉴">
        {dock.map(([k,label,Icon,count])=><button key={k} type="button" data-tab={k} aria-pressed={tabOf(sheet)===k} onClick={()=>{setPicked(null);
          if(k==='garden'){setSheet(null);setRecenter(n=>n+1);return}setSheet(tabOf(sheet)===k?null:{kind:k})}}>
          <Icon size={22}/>{label}{count>0&&<i className="rt-dock-n" aria-label={`새 소식 ${count}`}>{count}</i>}</button>)}
      </nav>}

      {h&&st&&!sheet&&(
        <section role="dialog" aria-label={`${h.name} 나무`} className="proto3d-card">
          <div>
            <h2>{h.name}</h2>
            <p>{CONDITION_LABEL[st.condition]} · {GROWTH_LABEL[st.growth]}</p>
            <small className="rt-num">{st.days}일 보유 · 수익률 {h.rate>0?'+':''}{h.rate}%</small>
          </div>
          <button type="button" aria-label="닫기" onClick={()=>setPicked(null)}><Cross size={18}/></button>
          {early&&cd&&<p className="rt-hint" style={{flexBasis:'100%',marginTop:8}}>{line(UI.cooldownEarly,{left:leftLabel(cd,clock.now)})}</p>}
          {!s.seen.cutaway&&<p className="rt-hint rt-deep-hint" style={{flexBasis:'100%',marginTop:8}}>{UI.deepHint}</p>}
          {/* the old one-tap judgment, now a quick start: a journal with 한 일 filled (손절 검토 opens the exit plan) */}
          <div className="rt-quick" role="group" aria-label="빠른 기록">{(Object.keys(QUICK) as Quick[]).map(q=><button key={q} type="button" onClick={()=>writeNew({holdingId:h.id,quick:q})}>{QUICK[q].label}</button>)}</div>
          <div className="rt-card-acts">
            <button type="button" className="rt-btn primary" onClick={()=>writeNew({holdingId:h.id})}>일지 쓰기</button>
            <button type="button" className="rt-btn" onClick={()=>openDeep(h.id)}>재무 체력</button>
            {!cd&&<button type="button" className="rt-btn" onClick={()=>g.ops.startCooldown(h.id)}>쿨다운 걸기</button>}
            {cd&&isReady(cd,clock.now)&&<button type="button" className="rt-btn" onClick={decideCooldown}>지금 결정하기</button>}
            {cd&&!isReady(cd,clock.now)&&(early
              ?<button type="button" className="rt-btn" onClick={decideCooldown}>지금 결정하기</button>
              :<button type="button" className="rt-btn" onClick={()=>setEarly(true)}>쿨다운 {leftLabel(cd,clock.now)} 남음</button>)}
          </div>
        </section>
      )}

      {sheet?.kind==='brief'&&<Briefing key={JSON.stringify(sheet.start)} g={g} signals={signals} holdings={holdings} start={sheet.start} onClose={close}
        onDeep={id=>openDeep(id,{kind:'brief',start:{holdingId:id}})} onBury={id=>bury(id)} onWrite={(id,sig)=>writeNew({holdingId:id,signalId:sig})}/>}
      {sheet?.kind==='deep'&&(()=>{const hh=holdings.find(x=>x.id===sheet.holdingId);const back=sheet.back;
        return hh&&<DeepSheet holding={hh} health={healthProvider.of(hh,signals.find(x=>x.holdingId===hh.id)??null)} onClose={()=>closeDeep(back)}/>})()}
      {sheet?.kind==='grades'&&<Grades g={g} onClose={close} start={'start' in sheet?sheet.start:undefined} onDig={dig} onStamp={(holdingId,hit)=>setBurst({holdingId,hit,stamp:Date.now()})} onFocus={setFocus} onRewind={()=>setSheet({kind:'rewind'})}/>}
      {sheet?.kind==='rewind'&&<RewindView g={g} onClose={close}/>}
      {sheet?.kind==='today'&&<TodaySheet g={g} tasks={tasks} onGo={goTask} onClose={close}/>}
      {sheet?.kind==='case'&&<CaseView g={g} c={caseDone?CASES.find(c=>c.id===answeredToday(s.cases,clock.today)!.caseId)??todayCase:todayCase} onClose={close}/>}
      {sheet?.kind==='real'&&!welcome&&realPrices&&<RealEntry g={g} prices={realPrices} onClose={close}
        onPlanted={(ids,first)=>{setSheet(null);setPricesAt(Date.now());startBirth(ids,first&&s.seen.birth===0,first?()=>setSheet({kind:'lookback'}):undefined)}}/>}
      {sheet?.kind==='intro'&&!welcome&&<Intro onCapture={()=>setSheet({kind:'onboard',pick:true})} onOther={()=>setSheet({kind:'onboard'})}/>}
      {sheet?.kind==='onboard'&&!welcome&&<Onboarding g={g} pick={!!sheet.pick} onClose={close} reader={syncOn?readCapture:null} real={realPrices} onReal={realPrices?()=>setSheet({kind:'real'}):null}
        onPlanted={(ids,first)=>{setSheet(null);startBirth(ids,first&&s.seen.birth===0,first?()=>setSheet({kind:'lookback'}):undefined)}}
        onDemo={()=>{setSheet(null);startBirth(DEMO_HOLDINGS.map(x=>x.id),s.seen.birth===0)}}/>}
      {birth&&<BirthCards birth={birth} holdings={holdings} onSkip={skipBirth}/>}
      {sheet?.kind==='lookback'&&lookSig&&lookHolding&&<LookBack g={g} sig={lookSig} holding={lookHolding} onJudged={lookJudged} onClose={close}/>}
      {sheet?.kind==='records'&&<Records g={g} onClose={close} onHoldings={()=>setSheet({kind:'onboard'})} onLapse={()=>{setSheet(null);setPicked(null);setLapse({i:0,playing:true})}}/>}
      {lapse&&<TimelapseBar i={lapse.i} n={frames.length} day={lapseDay} back={lapseBack} playing={lapse.playing}
        onSeek={i=>setLapse({i,playing:false})} onPlay={()=>setLapse(l=>l&&{i:l.playing||l.i<frames.length-1?l.i:0,playing:!l.playing})} onClose={()=>setLapse(null)}/>}
      {sheet?.kind==='league'&&<League g={g} onClose={close}/>}
      {sheet?.kind==='map'&&<MapSheet me={(window as unknown as {__proto3d?:{player?:{x:number;z:number}}}).__proto3d?.player??{x:0,z:0}} onGo={goPlace} onSky={()=>{setSheet(null);setPicked(null);setSkyOpen({focus:null})}}
        onBuild={()=>{setSheet(null);setPicked(null);setBuildMode(true)}} onClose={close}/>}
      {sheet?.kind==='library'&&<LibrarySheet caseDone={caseDone} rewindLeft={paidLeft(s.rewinds,clock.today)} onCase={()=>setSheet({kind:'case'})} onRewind={()=>setSheet({kind:'rewind'})} onClose={close}/>}
      {sheet?.kind==='game'&&<GameDoor runs={s.expeditions??[]} week={weekStart(clock.today)} onEnter={()=>enterGame(null)} onClose={close}/>}
      {expedition&&<Expedition packId={expedition.pack} today={clock.today} history={s.expeditions??[]} handle={s.name} onFinish={g.ops.finishExpedition} onClose={()=>leaveGame()}
        garden={open.map(x=>({holdingId:x.holdingId,name:holdings.find(h=>h.id===x.holdingId)?.name??'',model:x.model}))}
        onSimilar={id=>{leaveGame();setSheet({kind:'brief',start:{holdingId:id}})}} onMarket={setGameMarket}/>}
      {sheet?.kind==='cart'&&<FlowerShop coins={s.currency} plants={s.plants??[]} onClose={close} onGoods={()=>setSheet({kind:'goods'})}
        onRemove={id=>g.ops.unplant(id)} onPick={id=>{setSheet(null);setPicked(null);setPlanting({item:id})}}/>}
      {sheet?.kind==='goods'&&<CartView g={g} onClose={()=>setSheet({kind:'cart'})}/>}
      {fish==='talk'&&!sheet&&<NaruTalk left={castsLeft(s.fishing,clock.today,master)} onFish={()=>setFish('play')} onLog={()=>setFish('log')} onClose={()=>setFish(null)}/>}
      {fish==='play'&&!sheet&&<FishingPlay left={castsLeft(s.fishing,clock.today,master)} onCast={()=>g.ops.fishCast()} onPhase={setBob} onLog={()=>setFish('log')} onClose={()=>setFish(null)}
        onLand={(id,size)=>{const r=land(s.fishing,id,size);g.ops.fishLand(id,size);cue('capsule-mark');return {coins:r.coins,first:r.first,best:r.best}}}/>}
      {fish==='log'&&!sheet&&<FishLog fishing={s.fishing} onClose={()=>setFish(null)}/>}
      {planting&&!sheet&&<div className="rt-plant-bar" role="status"><span>{shopPlant(planting.item)?.name} 심을 풀밭을 눌러요</span>
        <button type="button" onClick={()=>setPlanting(null)}>취소</button></div>}
      {sheet?.kind==='friend'&&<FriendSheet opener={opener.text} topic={opener.topic} seed={clock.today} onClose={close}
        talk={syncOn?(_history,m)=>boriTalk(boriHoldings,m):null} opening={(syncOn||testOpen)&&lossCodes.length?boriOpening:null} onFace={setBoriFace}
        onGo={to=>setSheet(to==='grades'?{kind:'grades'}:to==='case'?{kind:'case'}:{kind:'journal'})}/>}
      {sheet?.kind==='drawer'&&<Drawer g={g} onClose={close} onCart={()=>setSheet({kind:'cart'})}/>}
      {sheet?.kind==='analyst'&&<AnalystCard g={g} id={sheet.id} signal={open.find(x=>x.analyst===sheet.id)??null} onClose={close}
        onBrief={()=>{const sig=open.find(x=>x.analyst===sheet.id);if(sig)setSheet({kind:'brief',start:{signalId:sig.id}})}}/>}
      {g.toast&&<div key={g.toast.id} className="rt-toast" role="status">{g.toast.text}</div>}
      {welcome&&<Welcome owing={owing} invite={needInvite} onInvited={()=>setInvited(true)} onAccount={(a,isNew)=>{setAccount(a);if(isNew||!s.name)g.ops.setName(a.nickname)}}
        onGuest={authRepo.local?()=>{try{sessionStorage.setItem('rethink-guest','1')}catch{/* this page only */}setGuest(true)}:null}/>}
    </div>
  );
}
