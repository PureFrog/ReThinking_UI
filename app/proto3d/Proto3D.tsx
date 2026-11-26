'use client';
// ReThink Garden: the R3F world plus the DOM overlay (weather, my numbers, the dock, sheets). The loop
// (redesign 4장): today's market as weather → an analyst stands at a flagged tree → research note → judgment →
// luon's counter → graded 30/90 days later. Around it: today's case, cooldown seeds, track record, league, game door,
// cart and drawer.
import {won,wonShort,wonCompact} from '../core/won';
import {still} from './still';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {PETS,PET_COINS,petAct,type PetId,type PetAct} from './Pets';
import {Cross,Ledger,Scope,MapIcon,Sprout,More} from './ui/Icons';
import {MoreSheet,NextCard,Tutorial,type MoreId} from './ui/Home';
import {Tour,tourSteps,type TourStep} from './ui/Tour';
import {EARN,START_GRANT} from '../core/ledger';
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
import {BUILT0,CITIES,LANDS,BUILDINGS,fieldPlots,type Want} from '../core/land';
// where a landmark stands (core/land.ts), so opening one walks over toward it
const CITY_SPOT=(id:string)=>CITIES.find(c=>c.id===id)?.at;
import {nextStep} from '../core/next';
import {Welcome} from './ui/Welcome';
import {authRepo} from './server';
import {boriChat} from '../core/bori-chat';
import {debateChat} from '../core/debate-chat';
import {missingConsents,boriTalk,boriOpen,stockSignal,jigiAI,readCapture,hasInvite,isMaster,observatoryServer,type BoriLine} from './supabase';
import {searchNames,loadRealBars,loadMarket,loadVirtualBars,fixturePrices,type PriceFixture} from './prices';
import {rowFor} from '../core/model-signals';
import {loadModelSignals,fixtureModelSignals,type ModelSignalFixture} from './model-signals';
import {RealEntry,type RealPrices} from './ui/RealEntry';
import {refreshed} from '../core/real';
import {codeOf,bars,isReal,KOSDAQ_STOCKS,setOwnCodes} from '../core/jigi/stocks';
import {saveRepo,openedAt,markLocal} from './sync';
import {syncPlan,SYNC} from '../core/sync';
import type {GardenSave} from './state';
import type {Account} from '../core/auth';
import {tiltOffset} from '../core/tilt';
import {tilt as tiltNow} from './screen';
import {configure,unlock,cue,DEFAULT_SOUND,ambience,roomMusic,musicOff} from '../core/sound';
import {streamZ,PLOTS,FIRE as FIRE_AT,NPC_FIRE_SEATS,NPC_LIVE} from './places';
import {spread,spreadXZ} from '../core/world';
import {treeState,defaultRules} from '../core/model';
import {weatherOf,isWeather,closeWord,type Weather} from '../core/weather';
import {judgedToday,trackOf,lookbackPick} from '../core/judgment';
import {openFor,isReady,leftLabel,flowersOn} from '../core/cooldown';
import {caseOfDay,answeredToday} from '../core/cases';
import {weekPoints} from '../core/league';
import {shownCount} from '../core/streak';
import {isoDay} from '../core/items';
import {marketProvider} from '../content/market';
import {signalProvider,lookbackNote} from '../content/signals';
import {CASES} from '../content/cases';
import {recheckCard} from '../content/recheck';
import {ANALYSTS,UI,CURRENCY,line,type AnalystId} from '../content/analysts';
import {itemById} from '../content/garden-items';
import Scene3D,{type World} from './Scene3D';
import {LOOK} from './look';
import {useGarden,workOf,weekWorkOf} from './state';
import {Briefing,Grades,CaseView,LookBack,RewindView,type LookbackPick} from './ui/Loop';
import {paidLeft} from '../core/rewind';
import {todayQuests,dayDone,QUEST_LABEL,type QuestId} from '../core/today';
import {didList,markDid} from '../core/did';
import {viewWeather,viewHour} from './viewPrefs';
import {mondayOf,weekOver,weekResult,WEEKLY_COINS} from '../core/challenge';
import {indexWeek} from '../content/market';
const QUEST_COINS=3_000,ARCADE_DAY_CAP=15_000;// 원: each of today's quests as it is done (피드백 2026-11-26 "벌 수 있는 기회가 적다")
import {rankOf,xpOf} from '../core/rank';
import {Expedition} from './game/Expedition';
import {DailyQuest} from './game/daily/DailyQuest';
import {ObservatoryDoor} from './game/daily/Door';
import {localToday} from '../content/daily/request';
import {weekStart} from '../core/weekly';
import {Records,League,CartView,Drawer,AnalystCard,TodaySheet,LibrarySheet,weekCtx} from './ui/Panels';
import {MapSheet} from './ui/MapSheet';
import {RoomTags} from './ui/RoomTags';
import {routineOf,SPOTS} from '../core/routine';
import {chatOf} from '../content/routine-lines';
import {setMasterOn} from '../core/master';
import {MasterStudy} from './ui/MasterStudy';
import {Arcade} from './ui/Arcade';
import {MASTER} from '../core/ledger';
import {MyPage,wearCtx} from './ui/MyPage';
import {SkyView} from './ui/SkyView';
import {Peek} from './Peek';
import {myPlanet,type Planet,type Share} from '../core/planets';
import {planetRepo} from './server';
import {startPresence} from './social';
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
import type {Routine} from './Village3D';
import {Bubbles} from './ui/Bubbles';
import {FriendSheet} from './ui/Friend';
import {VirtualShop} from './ui/VirtualShop';
import {HoverTip} from './ui/HoverTip';
import {quote,lotQuote,buyQuote,virtualTree,VIRTUAL_ID,VIRTUAL_STOCKS} from '../core/virtual';
import {change,history as barsOf,type VirtualLot} from '../core/virtual';
import {VILLAGE_SPEAKERS} from '../content/village-talk';
import {FRIEND,friendOpener,type BoriFace} from '../core/friend';
import {NaruTalk,FishingPlay,FishLog} from './ui/Fishing';
import {castsLeft,land} from '../core/fishing';
import {FlowerShop} from './ui/FlowerShop';
import {shopPlant} from '../content/flower-shop';
import {Intro} from './ui/Intro';
import {WALK0,readWalk,walkDone,stepOf,passStep,mayTalk,merchantHere,nextOpenLabel,candidates,waiting,WALK_STEPS,PERSON_OF,type WalkSave,type WalkStep} from '../core/walk';
import {VILLAGERS,villager,WALK_LINES,STEP_GOAL,MERCHANT_STALL,TAILOR_STALL,FARM_CART,ROLE,INTRO,INTRO_WALK,type VillagerId} from '../content/villagers';
import {INTRO_NAME} from '../content/intro';
import {QuizReview} from './ui/QuizReview';
// 피드백 2026-11-22: the librarian lives in the house now (Interior3D); the village shows the others
// 피드백 2026-11-23: the shop keepers (and the 사서) are inside their buildings (Shop3D.tsx); the rest stand outside
const OUTSIDE=VILLAGERS.filter(v=>!(SHOP_IDS as string[]).includes(v.id));
const isShop=(id:string):id is ShopId=>(SHOP_IDS as string[]).includes(id);

const ROOM_TOUR=['흐음~ 다시 왔구나! 첫 퀴즈 다음부터 집은 이렇게 방으로 보여. 나는 책상 뒤에 있을게. 나를 누르면 지금까지 푼 퀴즈랑 해설을 다시 볼 수 있고, 오늘 퀴즈도 거기서 풀러 가.',
  '옆 책장엔 네 투자일지가 종목마다 책으로 꽂혀. 일지는 마을 도서관 사서한테 쓰고, 여기서도 책장을 누르면 펼쳐 볼 수 있어.'];
// the first lesson done (ui/House.tsx keeps its day): from then on the house is the room seen from outside (3인칭)
const lessonDone=()=>{try{return !!localStorage.getItem('rethink-lesson-v1')}catch{return false}};
import {SHOP_IDS,SHOP_DOOR,type ShopId} from './Shop3D';
import {Comm,type CommTab} from './ui/Comm';
import {commAccount} from '../content/comm';
import {VillagerTalk,WalkGuide,Harvest,NewsBoard,TreeStatus,VillagerTags,type Choice} from './ui/Walk';
import {hear,deskOf,caseOf,kstDay} from '../core/house';
import {House,loadHouse,saveHouse} from './ui/House';
import {TreeTags} from './ui/TreeTags';
import {CoinCalendar,CoinPay} from './ui/CoinSheets';
import {Onboarding} from './ui/Onboarding';
import {BuyDates} from './ui/BuyDates';
import {EmbedBridge} from './ui/EmbedBridge';
import {badgesFor} from '../content/broker/badges';
import {isEmbed} from './state';
import {readyMsg,readHoldingsMsg} from '../core/embed';
import {stdToHoldings,withDates,needsDate,type HoldingsInput} from '../core/holdings-in';
import {kindOf} from '../content/portfolio';
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
import {DEMO_HOLDINGS,DEMO_KOSDAQ} from '../content/demo-garden';

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
// asOf: the real KOSDAQ bar's date once the index is loaded (prices.ts loadMarket); none while the weather is a mock
function useWeather(prices:RealPrices|null){
  const [w,setW]=useState<{weather:Weather;index:number;asOf?:string}|null>(null),[loaded,setLoaded]=useState(0);
  useEffect(()=>{if(!prices?.market)return;let on=true;void prices.market().then(n=>{if(on&&n)setLoaded(n)});return()=>{on=false}},[prices]);
  const [vt,setVt]=useState(0);useEffect(()=>{const f=()=>setVt(n=>n+1);addEventListener('rt-view',f);return()=>removeEventListener('rt-view',f)},[]);
  useEffect(()=>{const m=marketProvider.today(isoDay());const pick=viewWeather(),q=new URLSearchParams(location.search).get('weather')??(pick!=='auto'?pick:null);
    setW({weather:isWeather(q)?q:weatherOf(m)/* the village's weather is today's market (restored 2026-11-20) */,index:m.index,asOf:m.asOf})},[loaded,vt]);
  return w;
}
// the quest lines under the weather, short (the board itself says them in full)
type SheetState={kind:'tree';id:number}|{kind:'comm';tab?:CommTab}|{kind:'harvest';practice?:boolean}|{kind:'news'}|{kind:'journal';openId?:string;stats?:boolean;stock?:string}|{kind:'more'}|{kind:'onboard';pick?:boolean}|{kind:'intro'}|{kind:'quizlog'}|{kind:'goods'}|{kind:'real'}|{kind:'letter';month:string}|{kind:'settings'}|{kind:'map'}|{kind:'library'}|{kind:'grades';start:string}|{kind:'deep';holdingId:number;back:SheetState}|{kind:'lookback'}|{kind:'brief';start:{signalId?:string;holdingId?:number}|null}|{kind:'grades'|'case'|'rewind'|'today'|'records'|'drawer'|'cart'|'league'|'game'}|{kind:'analyst';id:AnalystId}|{kind:'friend'}|{kind:'talk';id:'tori'|'moa'|'luon'}|{kind:'write';id:string}|{kind:'verdict';journalId:string;hypoId:string}|{kind:'cities'}|{kind:'coincal'}|{kind:'coinpay'}|{kind:'stocks';focus?:number}|{kind:'dates'}|null;
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
type Birth={ids:number[];t0:number;plan:BirthPlan;after?:()=>void};

export default function Proto3D(){
  const g=useGarden(),{s,clock}=g;
  const [picked,setPicked]=useState<number|null>(null);
  const [recenter,setRecenter]=useState(0);
  // a new player lands on the onboarding (ui/Onboarding.tsx); the garden stays empty until the first trees go in
  // (feedback 11-17: first the four introduce themselves, ui/Intro.tsx; e2e starts past it unless the address has ?intro)
  // PM 설계 2026-11-19: every visit starts at the desk in the house (ui/House.tsx); the door goes out to the village.
  // e2e written for the village start there (tests/e2e/fixtures.ts sets __noHouse unless the address has ?house)
  // 게임 구성 2026-11-20: a new player registers the real stocks in the village first (the house's door comes after);
  // e2e can still open a new player in the house with ?house
  // inside a brokerage's web view (/?embed=mts): the balance comes from the broker, so no landing, onboarding or house start
  const embed=typeof window!=='undefined'&&isEmbed();
  const firstRun=!embed&&!g.s.onboarded&&typeof window!=='undefined'&&!new URLSearchParams(location.search).has('house');
  // ?play (튜토리얼없이_보기.bat): no landing, no lesson, the village with the first walk done (state.ts loadSave)
  const playMode=typeof window!=='undefined'&&new URLSearchParams(location.search).has('play');
  // 피드백 2026-11-26 "시작할 때 '오늘 퀴즈 끝'으로 이상하게 시작": once today's quiz (and, when open, today's file) is done,
  // a new launch or a return opens in the village, not at the finished desk
  const houseDoneToday=()=>{try{if(new URLSearchParams(location.search).has('house'))return false;const h=loadHouse(),d=deskOf(h,clock.today);if(!d?.done)return false;if(!h.unlocked)return true;const c=caseOf(h,clock.today);return !c||c.status==='done'}catch{return false}};
  const [where,setWhere]=useState<'house'|'village'|'master'|'arcade'>(()=>typeof window!=='undefined'&&(embed||playMode||(window as {__noHouse?:boolean;__startVillage?:boolean}).__noHouse||(window as {__startVillage?:boolean}).__startVillage||firstRun||houseDoneToday())?'village':'house');
  // 종목 등록 waits for the village (설계 1장): no first-run sheets over the house
  // 피드백 2026-11-22: no introductions at the very start (the teacher in the room is the first to speak; the rest are met
  // outside after the quiz), so a new player goes straight to putting in the stocks. ?intro still shows the old one
  const [sheet,setSheet]=useState<SheetState>(()=>embed||g.s.onboarded||!(typeof window!=='undefined'&&((window as {__noHouse?:boolean}).__noHouse||firstRun))?null:typeof window!=='undefined'&&!new URLSearchParams(location.search).has('intro')?{kind:'onboard'}:{kind:'intro'});
  // the first screens (ui/Welcome.tsx): every visit that is not signed in starts on the landing (sign up / log in /
  // look around), even with a garden kept on this device; "가입 없이 둘러보기" lasts for this visit (sessionStorage).
  // Sign up and log in go through authRepo (server.ts). e2e pages skip it unless the address has ?landing (tests/e2e/fixtures.ts)
  const [account,setAccount]=useState<Account|null>(()=>typeof window==='undefined'?null:authRepo.current());
  // 부지·건물·랜드마크 (core/land.ts, ui/Build.tsx): 넓히기 mode shows the closed lots on the garden; a tap asks first
  const [buildMode,setBuildMode]=useState(false),[want,setWant]=useState<Want|null>(null);
  // looking around without an account (B2C 기본, 2026-11-23: open on the real server again): the garden stays on this
  // device, nothing goes to the server, and what needs it (보리 free talk, reading a capture, the observatory's server)
  // says it opens with a log-in (syncOn is false without an account)
  const [guest,setGuest]=useState(()=>{try{return sessionStorage.getItem('rethink-guest')==='1'}catch{return false}});
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
  const syncOn=!embed&&!!account&&!authRepo.local&&!!saveRepo&&!owing&&invited!==false&&typeof window!=='undefined'&&!new URLSearchParams(location.search).has('demo')&&!playMode;
  const [synced,setSynced]=useState(false);
  useEffect(()=>{if(!syncOn||!saveRepo){setSynced(false);return}let on=true;
    saveRepo.pull().then(remote=>{if(!on||remote==='error')return;
      const plan=syncPlan({body:g.s,at:openedAt??'1970-01-01T00:00:00Z'},remote);
      if(plan==='take-remote'&&remote){g.ops.adopt(remote.body as GardenSave);markLocal(remote.at)}
      setSynced(true)});
    return()=>{on=false}},[syncOn,account?.email]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!synced||!saveRepo)return;const repo=saveRepo;const t=setTimeout(()=>{void repo.push(g.s).then(at=>{if(at){markLocal(at);void repo.pushJigi(g.s.journals??[])}})},SYNC.pushAfter);return()=>clearTimeout(t)},[synced,g.s]);
  const welcome=!embed&&!playMode&&(!!owing||needInvite||(!account&&!guest&&authKnown&&!(typeof window!=='undefined'&&(window as {__noLanding?:boolean}).__noLanding)));
  const [early,setEarly]=useState(false);
  // a grade being revealed makes its tree react in the garden (Scene3D Burst)
  const [burst,setBurst]=useState<World['burst']>(null),[focus,setFocus]=useState<number|null>(null);
  // W1: the holdings just planted are born one after another (core/birth.ts); a tap skips to the end
  const [birth,setBirth]=useState<Birth|null>(null),[bStage,setBStage]=useState<BirthStage>('done');
  const startBirth=(ids:number[],long:boolean,after?:()=>void)=>{if(!ids.length){after?.();return}const plan=birthPlan(ids.length,long);
    const quietNow=still();setBirth({ids,plan,t0:performance.now()-(quietNow?plan.total:0),after});setBStage('trees');if(long)g.ops.saw('birth')};
  const skipBirth=()=>setBirth(b=>b&&{...b,t0:performance.now()-b.plan.total});
  // 가상 MTS (core/embed.ts): say ready to the broker app that opened this web view; its balance comes back in the
  // standard lines (core/holdings-in.ts) and becomes the garden as it is, then the notes open (on the tapped stock,
  // when a badge was tapped). Lines without a buying day are asked once first (ui/BuyDates.tsx).
  const [mtsIn,setMtsIn]=useState<HoldingsInput|null>(null);
  const plantMts=(input:HoldingsInput,known:Record<string,string>)=>{
    const list=withDates(input.holdings,known);
    const out=stdToHoldings(g.s.holdings,list,fieldPlots(g.s.built?.land??[],'farm'),kindOf,g.clock.today);
    g.ops.setHoldings(out.holdings);setMtsIn(null);
    const focusId=input.focus?out.holdings.find(h=>h.code===input.focus)?.id??null:null;
    const hk=((window as {__proto3d?:{embed?:unknown}}).__proto3d??={} as {embed?:unknown});
    hk.embed={source:input.source,broker:input.broker,holdings:out.holdings.length,codes:out.holdings.map(h=>h.code),focus:input.focus??null};
    setSheet(null);startBirth(out.planted.map(h=>h.id),false,()=>setSheet({kind:'brief',start:focusId!=null?{holdingId:focusId}:null}));
    if(!out.planted.length)setSheet({kind:'brief',start:focusId!=null?{holdingId:focusId}:null})};
  // the hand-off (ui/EmbedBridge.tsx): the broker's white list first, the garden after it slides away
  const [bridge,setBridge]=useState<{input:HoldingsInput|null;lift:boolean}|null>(()=>embed?{input:null,lift:false}:null);
  const bridgeBadges=useMemo(()=>bridge?.input?badgesFor(bridge.input.holdings,g.clock.today):{},[bridge?.input]);// eslint-disable-line react-hooks/exhaustive-deps
  const goMts=(input:HoldingsInput,known:Record<string,string>)=>{setBridge(b=>b&&{...b,lift:true});plantMts(input,known)};
  const bridgeShown=()=>{const input=bridge?.input;if(!input)return;const known=g.s.buyDates??{};
    if(needsDate(input.holdings,known).length){setMtsIn(input);setSheet({kind:'dates'});return}
    goMts(input,known)};
  const onMts=useRef<(i:HoldingsInput)=>void>(()=>{});
  onMts.current=input=>setBridge({input,lift:false});
  useEffect(()=>{if(!embed||window.parent===window)return;
    const on=(e:MessageEvent)=>{if(e.source!==window.parent||e.origin!==location.origin)return;const input=readHoldingsMsg(e.data);if(input)onMts.current(input)};
    window.addEventListener('message',on);window.parent.postMessage(readyMsg(),location.origin);
    return()=>window.removeEventListener('message',on)},[embed]);
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
  // (or the time picked in 설정, viewPrefs.ts)
  const [viewTick,setViewTick]=useState(0);useEffect(()=>{const f=()=>setViewTick(n=>n+1);addEventListener('rt-view',f);return()=>removeEventListener('rt-view',f)},[]);
  useEffect(()=>{const sp=new URLSearchParams(location.search),pick=viewHour(),q=sp.has('hour')?Number(sp.get('hour')):pick!=='auto'?Number(pick):NaN;const fixed=Number.isFinite(q);
    const at=()=>{if(fixed)return Math.round(q*60);const d=new Date();return d.getHours()*60+d.getMinutes()};
    setMinutes(at());const t=setInterval(()=>setMinutes(at()),20000);return()=>clearInterval(t)},[viewTick]);
  // my observer's page (ui/MyPage.tsx): the garden is put away for the stage while it is open
  const [me,setMe]=useState(false);
  // inside the house (Interior3D.tsx): a paper-coloured fade covers the swap between the garden and the room
  const [inside,setInside]=useState(false),[fading,setFading]=useState(false);
  // the room's first visit (after the first walk): the teacher, then the librarian, say what each is for (tips 'room')
  const [roomTour,setRoomTour]=useState(0);
  // the house is the room (3인칭) once the first lesson is behind me: its day kept by the room, or the first walk done
  const roomMode=()=>walkAllowed&&(lessonDone()||g.s.tips.includes('tour'));
  useEffect(()=>{if(inside&&!fading&&roomMode()&&!g.s.tips.includes('room'))setRoomTour(n=>n||1)},[inside,fading]);// eslint-disable-line react-hooks/exhaustive-deps
  // 피드백 2026-11-23: inside a shop (Shop3D.tsx ShopRoom): the same paper fade as the house
  const [shop,setShop]=useState<ShopId|null>(null);
  const swapShop=(id:ShopId|null)=>{setFading(true);cue('door');setTimeout(()=>{setShop(id);setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const swapRoom=(into:boolean)=>{setPicked(null);setSheet(null);setFading(true);cue('door');setTimeout(()=>{setInside(into);setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  // 거장의 집 · 버핏의 서재 (ui/MasterStudy.tsx): in through the same paper fade as the house
  const enterMaster=()=>{markDid(clock.today,'master');setPicked(null);setSheet(null);setVt(null);setMe(false);setFading(true);cue('door');setTimeout(()=>{setWhere('master');setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  // 오락실 (ui/Arcade.tsx): in through the same paper fade
  // 오락실 점수 → 코인 (피드백 2026-11-26 "적절한 보상"): a fixed rate for skill (100원 per 10 points), up to a daily cap,
  // never a draw. What is left today is said on the result card.
  const arcadePay=(game:string,score:number)=>{const k='rethink-arcade-paid-'+clock.today;let paid=0;try{paid=+(localStorage.getItem(k)??0)}catch{/* none */}
    const left=Math.max(0,ARCADE_DAY_CAP-paid),coins=Math.min(left,Math.floor(score/10)*100);
    if(coins>0){g.ops.earn(coins);try{localStorage.setItem(k,String(paid+coins))}catch{/* this visit */}}
    return {coins,note:left<=0?'오늘 받을 수 있는 코인을 다 받았어요. 내일 또 와요!':coins===0?'10점마다 코인 100원':undefined}};
  // 주간 챌린지 (core/challenge.ts): my practice lots this week against the KOSDAQ index
  const monday=mondayOf(clock.today),weekKey='weekly:'+monday;
  const weekly=useMemo(()=>{const ix=indexWeek(monday,clock.today);
    const r=weekResult((s.virtual??[]).map(l=>({...l,src:l.src})),monday,(code,before)=>[...barsOf(code,clock.today,40)].reverse().find(b=>b.d<before)?.c??null,
      l=>lotQuote(l as VirtualLot,clock.today)?.price??null,ix.rate);
    return {...r,real:ix.real,over:weekOver(clock.today,Math.floor(minutes/60)),paid:(s.grants??[]).includes(weekKey),medals:(s.grants??[]).filter(k=>k.startsWith('weekly-medal:')).length,coins:WEEKLY_COINS}},
    [s.virtual,s.grants,monday,clock.today,Math.floor(minutes/60)]);// eslint-disable-line react-hooks/exhaustive-deps
  const claimWeek=()=>{if(!weekly.over||weekly.paid||!weekly.joined)return;g.ops.grant(weekKey,WEEKLY_COINS.joined);if(weekly.beat)g.ops.grant('weekly-medal:'+monday,0);
    cue('capsule-mark');g.say(weekly.beat?`이번 주는 코스닥을 이겼어! 🏅 코인 +${WEEKLY_COINS.joined.toLocaleString()}`:`이번 주는 코스닥에 졌어. 다음 주에 또 해 보자. 코인 +${WEEKLY_COINS.joined.toLocaleString()}`)};
  const enterArcade=()=>{markDid(clock.today,'arcade');setPicked(null);setSheet(null);setVt(null);setMe(false);setFading(true);cue('door');setTimeout(()=>{setWhere('arcade');setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const enterHouse=()=>{setPicked(null);setSheet(null);setMe(false);setFading(true);cue('door');setTimeout(()=>{setWhere('house');setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  // the map (ui/MapSheet.tsx) sends the player walking to a place
  const [goTo,setGoTo]=useState<World['goTo']>(null);
  // the camera goes along: nothing may keep it on a tree or a building while the player walks off (feedback 11-17)
  // 1인칭 (feedback 11-17): a button over the map one switches the camera to the player's eyes and back; kept per device
  const [fp,setFp]=useState(()=>{try{return localStorage.getItem('rethink-fp')==='1'}catch{return false}});
  const toggleFp=()=>setFp(v=>{const n=!v;try{localStorage.setItem('rethink-fp',n?'1':'0')}catch{/* this visit only */}return n});
  // the 꽃집: which decor is being placed (the next tap on open grass plants it, Scene3D plantBlock)
  const [planting,setPlanting]=useState<{item:string}|null>(null);
  // 피드백 2026-11-24: a building chosen at the 건물 상인 (or on its lot) waits to be set down in the village; paid when it is
  const [placing,setPlacing]=useState<{id:string}|null>(null);
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
  // 오늘의 관측소 (game/daily): the door opens a run; ?quest opens the open quest straight away (tests)
  const [quest,setQuest]=useState<string|null>(null);
  useEffect(()=>{try{if(new URLSearchParams(location.search).has('quest')){const id=g.ops.questOpen();if(id)setQuest(id)}}catch{}},[]);// eslint-disable-line react-hooks/exhaustive-deps
  const enterQuest=(id:string)=>{setPicked(null);setSheet(null);setFading(true);cue('door');setTimeout(()=>{setQuest(id);setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const leaveQuest=(back:boolean)=>{setFading(true);cue('door');setTimeout(()=>{setQuest(null);if(back)setSheet({kind:'game'});setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const leaveGame=()=>{setFading(true);cue('door');setTimeout(()=>{setExpedition(null);setGameMarket(null);setTimeout(()=>setFading(false),80)},TIMING.roomFade)};
  const [wide,setWide]=useState(false);
  useEffect(()=>{const q=matchMedia('(min-width:760px) and (min-height:521px)'),f=()=>setWide(q.matches);f();q.addEventListener('change',f);return()=>q.removeEventListener('change',f)},[]);
  // 다른 정원들 (ui/SkyView.tsx, Sky3D.tsx): ?sky opens it; the garden is put away while it is open
  const [skyOpen,setSkyOpen]=useState<{focus:string|null}|null>(()=>{try{return new URLSearchParams(location.search).has('sky')?{focus:null}:null}catch{return null}});
  const [neighbours,setNeighbours]=useState<{planets:Planet[];sample:boolean}>({planets:[],sample:true});
  // the sky reads the planets when it opens and again every minute, so who is 온라인 stays current (018_presence)
  useEffect(()=>{if(!skyOpen)return;let on=true;const read=()=>planetRepo.neighbours(weekStart(clock.today)).then(n=>{if(on)setNeighbours(n)});void read();
    const t=setInterval(()=>void read(),60e3);return()=>{on=false;clearInterval(t)}},[!!skyOpen,clock.today]);// eslint-disable-line react-hooks/exhaustive-deps
  // "I'm here" every minute while the app is open and in front (signed in with an invite code only)
  useEffect(()=>startPresence(),[]);
  const quiet=calm||!!lapse||me||!!expedition||!!quest||!!skyOpen;
  // W3 time capsules (core/capsule.ts): one marker per tree; burying after a judgment, digging up as a grade opens
  const capsules=useMemo(()=>capsulesOf(s.judgments,s.graded,clock.today,s.holdings.map(x=>x.id),(j,m)=>g.due.some(d=>d.judgment.id===j.id&&d.mark===m)),[s.judgments,s.graded,clock.today,s.holdings,g.due]);// eslint-disable-line react-hooks/exhaustive-deps
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
  // real prices (private test, prices.ts): for a signed-in player with an invite code, or an e2e page with a fixture
  const fixture=typeof window!=='undefined'?(window as unknown as {__priceFixture?:PriceFixture}).__priceFixture:undefined;
  const realPrices=useMemo<RealPrices|null>(()=>fixture?fixturePrices(fixture):syncOn?{search:searchNames,load:loadRealBars,market:loadMarket,virtual:loadVirtualBars}:null,[fixture,syncOn]);
  const w=useWeather(realPrices),tiltCtl=useTilt(g.s.settings.tilt);
  const lapseBack=lapse?frames[lapse.i]:0,lapseDay=dayBack(clock.today,lapseBack);
  const lapseMarket=lapse&&lapseBack>0?marketProvider.today(lapseDay):null;
  const weather=expedition&&gameMarket!==null?weatherOf({index:gameMarket,swing:Math.abs(gameMarket)*1.6}):lapseMarket?weatherOf(lapseMarket):w?.weather??'clear',wl=LOOK.weather[weather];
  const holdings=g.s.holdings,ready=g.s.onboarded;
  // the journal's stock search also finds my own trees (core/jigi/stocks.ts setOwnCodes)
  useEffect(()=>{setOwnCodes(holdings.map(h=>codeOf(h)))},[holdings]);
  const [pricesAt,setPricesAt]=useState(0);
  const realKey=holdings.filter(h=>h.real&&h.code).map(h=>h.code).join(',');
  // load the bars of the trees on real prices, then bring their return up to the latest close
  useEffect(()=>{if(!realPrices||!realKey)return;let on=true;
    void realPrices.load(g.s.holdings.filter(h=>h.real&&h.code).map(h=>({code:h.code!,name:h.name}))).then(()=>{if(!on)return;
      const cur=g.s.holdings,next=cur.map(h=>h.real&&h.code&&isReal(h.code)?refreshed(h,bars(h.code)):h);
      if(next.some((h,i)=>h!==cur[i]))g.ops.setHoldings(next);setPricesAt(Date.now())});
    return()=>{on=false}},[realPrices,realKey]);// eslint-disable-line react-hooks/exhaustive-deps
  // the team's verdicts and 반박 results (model-signals.ts): once per sign-in and whenever the real holdings change
  const modelFixture=typeof window!=='undefined'?(window as unknown as {__modelSignalFixture?:ModelSignalFixture}).__modelSignalFixture:undefined;
  const [modelAt,setModelAt]=useState(0);
  const realDates=holdings.filter(h=>h.real&&h.code).map(h=>`${h.code}|${h.date}`).join(',');
  useEffect(()=>{const load=modelFixture?fixtureModelSignals(modelFixture):syncOn?loadModelSignals:null;if(!load)return;let on=true;
    void load().then(n=>{if(!on)return;setModelAt(Date.now());((window as {__proto3d?:{modelSignals?:unknown}}).__proto3d??={} as {modelSignals?:unknown}).modelSignals=n}).catch(()=>{});
    return()=>{on=false}},[modelFixture,syncOn,realDates]);// eslint-disable-line react-hooks/exhaustive-deps
  // what the garden draws: the holdings now, or as they stood in the timelapse week (absent before they were bought)
  // the first screens stand on the world itself: an example garden grows behind them (shown only, never saved)
  const hoverTree=useCallback((id:number)=>shownRef.current.find(x=>x.id===id)??null,[]);
  // 게임 구성 2026-11-20: my real stocks in the 밭, virtual ones bought with coins in the 과수원
  // a lot on real closes not loaded yet stands at its cost (0%) rather than vanishing
  const vtrees=useMemo(()=>(g.s.virtual??[]).map(l=>virtualTree(l,lotQuote(l,clock.today)?.price??l.cost)),[g.s.virtual,clock.today,pricesAt]);
  // 유저 워크플로우 3장: on the first walk my real trees are kept, not drawn, until the farmer plants them
  const [walk,setWalkS]=useState<WalkSave>(()=>{try{return readWalk(JSON.parse(localStorage.getItem('rethink-walk-v1')??'null'))}catch{return WALK0}});
  const putWalk=(f:(w:WalkSave)=>WalkSave)=>setWalkS(w=>{const n=f(w);if(n!==w)try{localStorage.setItem('rethink-walk-v1',JSON.stringify(n))}catch{/* this visit only */}return n});
  const walkAllowed=typeof window==='undefined'||!(window as {__noTutorial?:boolean}).__noTutorial;
  // on until 보리's last line is answered (the walk's steps may all be done by then)
  const walkOn=walkAllowed&&g.s.onboarded&&!g.s.tips.includes('tour');
  const walkStep:WalkStep|null=walkOn?stepOf(walk):null;
  const realShown=walkOn&&!walk.planted?[]:holdings;
  const shown=useMemo(()=>welcome?DEMO_KOSDAQ:lapse?holdings.flatMap(x=>{const p=holdingAt(x,lapseBack);return p?[p]:[]}):[...realShown,...vtrees],[realShown,vtrees,lapse?.i,welcome]);// eslint-disable-line react-hooks/exhaustive-deps
  const shownRef=useRef(shown);shownRef.current=shown;
  useEffect(()=>{const hk=((window as {__proto3d?:{lapse?:unknown}}).__proto3d??={} as {lapse?:unknown});hk.lapse=lapse?{day:lapseDay,back:lapseBack,trees:shown.length,weather}:null},[lapse,shown]);// eslint-disable-line react-hooks/exhaustive-deps
  const signals=useMemo(()=>signalProvider.today(holdings,clock.today),[holdings,clock.today,pricesAt,modelAt]);// eslint-disable-line react-hooks/exhaustive-deps
  // a signal is answered by a journal saved today on its stock (or, before 지기, a judgment)
  const wroteToday=(holdingId:number)=>judgedToday(s.judgments,holdingId,clock.today)||(s.journals??[]).some(j=>j.holdingId===holdingId&&j.status==='saved'&&!j.demo&&!j.practice&&j.savedAt!=null&&isoDay(new Date(j.savedAt))===clock.today);
  // e2e hooks: today's notes, and a way to open one (or a holding's 재무 체력) without walking to it
  useEffect(()=>{const w=window as unknown as {__proto3d?:Record<string,unknown>};const h=(w.__proto3d??={});
    h.signals=signals.map(x=>({id:x.id,holdingId:x.holdingId,analyst:x.analyst,model:x.model,loss:x.loss,headline:x.headline}));
    h.openBrief=(signalId:string)=>{setPicked(null);setSheet({kind:'brief',start:{signalId}})}},[signals]);
  const open=signals.filter(x=>!wroteToday(x.holdingId));
  // 보리's stop-loss talk (db/functions/bori-talk): today's loss signals by company code
  // the stock pickers (보리, 루온) list real holdings first: only six fit
  const realFirst=useMemo(()=>[...holdings].sort((a,b)=>Number(!!b.real)-Number(!!a.real)),[holdings]);
  const boriHoldings=useMemo(()=>holdings.map(x=>({company_id:codeOf(x),name:x.name})),[holdings]);
  // 루온 (2026-11-24): a stock picked → the server turns the talk to detection mode on it (supabase.ts stockSignal); signed out, the
  // placeholder lines (core/debate-chat.ts). e2e: window.__luonSignal / __luonTalk stand in for the server
  const testLuon=typeof window!=='undefined'?(window as unknown as {__luonSignal?:(code:string,name:string)=>Promise<BoriLine|null>;__luonTalk?:(m:string)=>Promise<BoriLine>}):undefined;
  const luonOn=syncOn||!!testLuon?.__luonSignal;
  const luonPick=useCallback((id:number,name:string)=>{const h=holdings.find(x=>x.id===id),code=h?codeOf(h):name;
    return testLuon?.__luonSignal?testLuon.__luonSignal(code,name):stockSignal(boriHoldings,code,'luon')},[holdings,boriHoldings,testLuon]);
  // with the server, only real holdings' signals go to it (a mock tree's made-up signal must not start a real analysis)
  const lossCodes=useMemo(()=>signals.filter(x=>x.loss).map(x=>holdings.find(h=>h.id===x.holdingId)).flatMap(h=>h&&(!syncOn||h.real)?[codeOf(h)]:[]),[signals,holdings,syncOn]);
  // e2e: window.__boriOpen stands in for the server (it gets the loss codes)
  const testOpen=typeof window!=='undefined'?(window as unknown as {__boriOpen?:(codes:string[])=>Promise<string|null>}).__boriOpen:undefined;
  // the server opens a stop-loss talk once (a second open returns nothing), so the first line is kept for the day:
  // 보리 says it when it comes over, and the talk sheet starts from the same line
  const openedRef=useRef<{day:string;text:string;emotion?:string}|null>((()=>{try{return JSON.parse(localStorage.getItem('rethink-bori-open')??'null')}catch{return null}})());
  // 설계 5장: on a stop-loss signal of a stock I hold, 보리 comes up at the house door and asks why I still hold it. One
  // event is asked once (house save 'heard'); with several, the newest first and the rest when I tap 보리 again. A demo
  // holding's signal says so (예시 신호). Without the server the line is this one; with it, the server's first line.
  const [heard,setHeard]=useState<string[]>(()=>typeof window==='undefined'?[]:loadHouse().heard);
  const lossNow=useMemo(()=>signals.filter(x=>x.loss&&!heard.includes(x.id)).slice().reverse()[0]??null,[signals,heard]);
  const lossHolding=lossNow?holdings.find(h=>h.id===lossNow.holdingId)??null:null;
  const [askedAbout,setAskedAbout]=useState<string|null>(null);
  const markHeard=(id:string)=>{const h=hear(loadHouse(),id);saveHouse(h);setHeard(h.heard)};
  const boriOpening=useCallback(async():Promise<BoriLine|null>=>{const today=clock.today,c=openedRef.current;
    if(!syncOn&&!testOpen){if(!lossNow||!lossHolding)return null;markHeard(lossNow.id);setAskedAbout(codeOf(lossHolding));
      return {text:`${lossHolding.name}에서 위험 신호가 잡혔어${lossHolding.real?'':' (예시 신호)'}. 지금도 이 종목을 보유하는 이유가 뭐야?`,emotion:'concerned'}}
    if(c&&c.day===today)return {text:c.text,emotion:c.emotion??'curious'};
    // (the e2e stand-in answers with a plain line)
    const t=testOpen?await testOpen(lossCodes).then(x=>x?{text:x,emotion:'curious'}:null):await boriOpen(boriHoldings,lossCodes);
    if(t){openedRef.current={day:today,text:t.text,emotion:t.emotion};try{localStorage.setItem('rethink-bori-open',JSON.stringify(openedRef.current))}catch{/* this visit only */}}
    return t},[boriHoldings,lossCodes,testOpen,clock.today,syncOn,lossNow,lossHolding]);// eslint-disable-line react-hooks/exhaustive-deps
  const todayCase=useMemo(()=>caseOfDay(CASES,clock.today,s.cases.filter(a=>a.day!==clock.today).map(a=>a.caseId)),[clock.today,s.cases]);
  const caseDone=!!answeredToday(s.cases,clock.today);
  const track=trackOf(s.judgments,s.graded);
  // the first visit's look-back: a loss signal if there is one (ui/Loop.tsx LookBack)
  // nothing flagged (stocks typed in that are up): moa's plain chart note on the tree that moved most (content/signals.ts)
  const lookSig=s.lookedBack?null:lookbackPick(signals)??lookbackNote(holdings),lookHolding=lookSig?holdings.find(x=>x.id===lookSig.holdingId):undefined;

  // today's three (core/today.ts): ticked off as they happen; all three close the day once
  // 퀘스트 게시판 (게임 구성 2026-11-20): today's quiz at the desk, one journal on a real stock, one cast at the pond
  const quizDone=where==='village'&&(()=>{const h=loadHouse();return !!deskOf(h,kstDay(clock.now))?.done})();
  // 피드백 2026-11-26 "매일 조금씩 변해야": three that change with the day (core/today.ts questsFor); what the save does
  // not know is marked as it happens (core/did.ts markDid)
  useEffect(()=>{const f=()=>markDid(clock.today,'fire');addEventListener('rt-sat-fire',f);return()=>removeEventListener('rt-sat-fire',f)},[clock.today]);
  const [didTick,setDidTick]=useState(0);useEffect(()=>{const f=()=>setDidTick(n=>n+1);addEventListener('rt-did',f);return()=>removeEventListener('rt-did',f)},[]);
  const judgedN=s.judgments.filter(j=>j.day===clock.today).length+(s.journals??[]).filter(j=>j.status==='saved'&&!j.demo&&!j.practice&&j.savedAt!=null&&isoDay(new Date(j.savedAt))===clock.today).length;
  const did=useMemo(()=>didList(clock.today),[clock.today,didTick]);// eslint-disable-line react-hooks/exhaustive-deps
  const tasks=todayQuests(clock.today,id=>id==='quiz'?quizDone:id==='judge'?judgedN>0:id==='fish'?(s.fishing?.day===clock.today?s.fishing.casts:0)>0:did.includes(id));
  const didIt=(id:QuestId)=>markDid(clock.today,id);
  // each quest done pays a little at once (the day's three together still pay EARN.dayDone on top)
  const questKey=tasks.filter(t=>t.done).map(t=>t.id).join(',');
  useEffect(()=>{if(!ready)return;for(const t of tasks)if(t.done){const k=`quest:${clock.today}:${t.id}`;if(!(s.grants??[]).includes(k)){g.ops.grant(k,QUEST_COINS);g.say(`퀘스트 완료: ${QUEST_LABEL[t.id]} · 코인 +${QUEST_COINS.toLocaleString()}`)}}},[questKey,ready]);// eslint-disable-line react-hooks/exhaustive-deps
  // the quest list under the weather folds and unfolds with a tap on its title; kept on this device
  const [questsFolded,setQuestsFolded]=useState(()=>{try{return localStorage.getItem('rethink-quests-folded')!=='0'}catch{return true}});/* 피드백 2026-11-25: folded to one line unless opened */
  const toggleQuests=()=>setQuestsFolded(v=>{const n=!v;try{localStorage.setItem('rethink-quests-folded',n?'1':'0')}catch{/* this visit only */}return n});
  const tasksDone=tasks.filter(t=>t.done).length,allDone=ready&&dayDone(tasks);
  useEffect(()=>{if(allDone)g.ops.closeDay()},[allDone]);// eslint-disable-line react-hooks/exhaustive-deps
  // this week's goals (core/weekly.ts): all three done pays once
  const week=weekGoals(clock.today,weekCtx(g));
  useEffect(()=>{if(ready&&week.done)g.ops.closeWeek(week.start)},[ready,week.done,week.start]);// eslint-disable-line react-hooks/exhaustive-deps
  // a new title (core/rank.ts) brings its item
  const rank=rankOf(xpOf({graded:s.graded.length,cases:s.cases.length,rewinds:s.rewinds.length,work:workOf(s)}));
  useEffect(()=>{if(rank.index>s.rankSeen)g.ops.rankUp(rank.index,rank.name)},[rank.index,s.rankSeen]);// eslint-disable-line react-hooks/exhaustive-deps
  const goTask=(t:QuestId)=>{if(t==='quiz'){setSheet(null);enterHouse();return}if(t==='fish'){setSheet(null);setGoTo({...FISH_STAND,at:Date.now()});setFish('talk');return}
    if(t==='news'){setSheet({kind:'comm',tab:'news'});return}if(t==='vbuy'){setSheet({kind:'comm',tab:'order'});return}if(t==='chart'){setSheet({kind:'comm',tab:'quote'});return}
    if(t==='master'){setSheet(null);world.onLandmark('master');return}if(t==='arcade'){setSheet(null);world.onLandmark('arcade');return}
    if(t==='fire'){setSheet(null);(window as unknown as {__proto3d?:{sitFire?:()=>void}}).__proto3d?.sitFire?.();return}
    if(t==='pet'){setSheet(null);g.say('마을의 고양이나 강아지를 눌러 봐. 집에도 고양이가 있어.');return}
    setSheet({kind:'journal'})};
  // nothing flagged in the new garden: no look-back to show
  useEffect(()=>{if(sheet?.kind==='lookback'&&!lookSig)setSheet(null)},[sheet,lookSig]);
  // sound (core/sound.ts, synthesised): on unless the player turned it off; the browser lets it start on the first press
  useEffect(()=>{configure({...DEFAULT_SOUND,on:s.sound,sfx:s.settings.sfx});if(s.sound)unlock()},[s.sound,s.settings.sfx]);
  // the browser keeps a page silent until it is pressed: the first press (and any after the sound comes back on) wakes the
  // audio (core/sound.ts unlock). Without this the 3D garden never made a sound, and 소리 끄기 had nothing to turn off.
  useEffect(()=>{const wake=()=>unlock();addEventListener('pointerdown',wake,true);addEventListener('keydown',wake,true);
    return()=>{removeEventListener('pointerdown',wake,true);removeEventListener('keydown',wake,true)}},[]);
  // the settings that every screen follows: keeping still, the text size
  useEffect(()=>{const d=document.documentElement.dataset;d.still=s.settings.still?'1':'0';d.text=s.settings.text},[s.settings.still,s.settings.text]);
  // a run of days that was rescued or lost is said once, as the garden opens
  useEffect(()=>{const n=s.streak.notice;if(n&&n.day===clock.today)g.say(n.kind==='reset'?line(UI.streakReset,{run:n.run}):UI.streakRescue)},[]);// eslint-disable-line react-hooks/exhaustive-deps

  // where the day has each analyst (signals first, luon by an arrived grade's capsule, then their own spots, home at night)
  const dueTree=g.due.find(d=>holdings.some(h=>h.id===d.judgment.holdingId))?.judgment.holdingId??null;
  // 모아 moved from the lookout to the virtual field when the pond took the lookout's place (2026-11-20)
  const FIXED_SPOT={tori:SPOTS.tori[2],moa:SPOTS.moa[1],luon:SPOTS.luon[2]};
  const day=routineOf(minutes,{tori:open.filter(x=>x.analyst==='tori').map(x=>x.holdingId),moa:open.filter(x=>x.analyst==='moa').map(x=>x.holdingId),luon:[]},dueTree);
  const ctx=wearCtx(g),look=fitLook(s.look,ctx),light=daylightOf(minutes);
  // the garden's ambience (core/sound.ts): by where I stand and the time of day; quiet indoors, on the stage, in sheets
  useEffect(()=>{const t=setInterval(()=>{const h=(window as unknown as {__proto3d?:{player?:{x:number;z:number};sitting?:boolean}}).__proto3d,p=h?.player;
    if(!p||inside||me||!ready||where!=='village'||skyOpen||shop){ambience({stream:0,fire:0,birds:0,crickets:0});return}
    const near=(d:number,r:number)=>Math.max(0,1-d/r),fire=Math.hypot(p.x-FIRE_AT[0],p.z-FIRE_AT[1]),creek=Math.abs(p.z-streamZ(p.x));
    ambience({stream:near(creek,9),fire:h?.sitting?1:near(fire,5)*0.5,birds:light.day*(weather==='storm'?0.1:0.8),crickets:light.night*0.9})},1000);
    return()=>clearInterval(t)},[inside,me,ready,light.day,light.night,weather,where,skyOpen,shop]);
  // 피드백 2026-11-26: my house plays its own quiet piece, the neighbours' planets theirs (the arcade starts its own)
  const hourNow=((minutes/60)%24+24)%24,dawn=hourNow<12,glowSky=wl.glow>0?light.warm:light.warm*0.4;
  const roomTrack=where==='house'?'home':where==='village'&&!shop&&!skyOpen&&!inside&&glowSky>0.45?(dawn?'dawn':'dusk'):where==='village'&&shop?(shop==='librarian'?'library':shop):skyOpen&&where==='village'?'space':null;
  useEffect(()=>{if(!roomTrack)return;const t=setInterval(()=>roomMusic(roomTrack),1500);roomMusic(roomTrack);return()=>{clearInterval(t);musicOff(roomTrack)}},[roomTrack]);
  // a first-time pointer (core/tips.ts), only in a quiet moment out in the garden
  // last month's letter (core/letter.ts), once the new month has opened
  const letterFor=(m:string)=>letterOf(m,s.judgments,s.graded,{cases:s.cases,rewinds:s.rewinds,stamps:s.stamps,expeditions:s.expeditions??[],journals:s.journals??[]},id=>stampById(id as never).name);
  const lastLetter=letterFor(prevMonth(monthOf(clock.today))),letterWaiting=ready&&letterDue(clock.today,s.letters,lastLetter);
  const oldest=s.judgments.reduce((m,j)=>Math.max(m,daysFrom(j.day,clock.today)),0);
  // the first-run tutorial (ui/Home.tsx): once, in the first quiet moment after the garden is planted; 설정 plays it again.
  // e2e pages start with it off (tests/e2e/fixtures.ts) unless the address has ?tutorial
  const [tutAgain,setTutAgain]=useState(false);
  const tutAllowed=typeof window==='undefined'||!(window as {__noTutorial?:boolean}).__noTutorial;
  const tutOn=false&&ready&&!quiet&&!inside&&!sheet&&!buildMode&&picked===null&&!capFx&&!jump&&(tutAgain||(tutAllowed&&!s.tips.includes('tutorial')));
  // 마을 안내 (게임 구성 2026-11-20, ui/Tour.tsx): the first time out of the door, 보리 shows the village round, once.
  // A step's button opens its sheet and the tour goes on when it is closed. e2e: off unless the address has ?tutorial
  const [tourN,setTourN]=useState(0);
  const tourOn=false&&where==='village'&&ready&&!calm&&!fading&&tutAllowed&&!s.tips.includes('tour')&&!me&&!skyOpen&&!fish&&!buildMode&&!lapse;
  const tour=tourSteps({journal:EARN.journal,grant:START_GRANT,firstTree:holdings[0]?.name??null});
  const tourStep=tour[Math.min(tourN,tour.length-1)];
  const tourShow=tourOn&&!sheet;
  // a friend's step: first seen from afar, then the camera comes down close in front of it (feedback 2026-11-20)
  const [tourNear,setTourNear]=useState(false);
  useEffect(()=>{setTourNear(false);if(!tourShow||!(tourStep.at==='tori'||tourStep.at==='moa'||tourStep.at==='luon'))return;
    const t=setTimeout(()=>setTourNear(true),TIMING.tourZoom);return()=>clearTimeout(t)},[tourShow,tourStep.id]);// eslint-disable-line react-hooks/exhaustive-deps
  const tip=!tutOn&&!tourOn&&!walkOn&&ready&&!quiet&&!inside&&!sheet&&picked===null&&!g.due.length&&!letterWaiting&&!capFx&&!jump&&!buildMode?nextTip(s.tips,{judgments:s.judgments.length,oldestDays:oldest}):null;
  // the one next step on the home screen (core/next.ts)
  const firstOpen=open[0],firstHolding=firstOpen?holdings.find(x=>x.id===firstOpen.holdingId):undefined;
  const next=nextStep({due:g.due.length,signal:firstOpen&&firstHolding?{id:firstOpen.id,name:firstHolding.name,analyst:firstOpen.analyst,headline:firstOpen.headline}:null,
    letter:letterWaiting?monthLabel(lastLetter.month):null,caseOpen:!caseDone});
  const newStampDot=s.stamps.some(x=>x.day===clock.today);
  // one analyst bubble at a time over the garden; they take turns
  const [turn,setTurn]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTurn(n=>n+1),TIMING.bubbleTurn);return()=>clearInterval(t)},[]);
  // the sky behind the garden: the weather's, warmed at dawn and dusk, darkened at night
  // 피드백 2026-11-26 "일출·일몰 때 펼쳐지는 아름다운 하늘": dawn pastel (lilac, rose, peach), dusk glowing (violet, coral,
  // gold), a low sun and lit cloud streaks over the horizon (proto3d-horizon), and their own music (core/sound.ts)
  const sky=(k:'top'|'mid'|'bottom')=>mixHex(mixHex(wl.sky[k],(dawn?LOOK.daylight.dawnSky:LOOK.daylight.dusk)[k],glowSky*0.95),LOOK.daylight.night[k],light.night);
  // stamps (core/stamps.ts): whatever newly holds is stamped once, with today's date
  const fresh=ready?newStamps({judgments:s.judgments.length,graded:s.graded.map(x=>({hit:x.hit,confidence:s.judgments.find(j=>j.id===x.judgmentId)?.confidence??3})),
    bestStreak:s.streak.best,rewinds:s.rewinds.length,cases:s.cases.length,daysDone:s.daysDone.length,seen:s.seen,calibration:track.calibration,
    expeditions:(s.expeditions??[]).map(r=>({week:r.week,sureHit:r.decisions.some((d,i)=>d.chips>=4&&r.results?.[i]==='hit')})),
    observatoryClears:(s.observatory?.grants??[]).some(x=>x.rule==='first-clear')?1:0},s.stamps.map(x=>x.id)):[];
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
  const friendHere=where==='village'&&ready&&!tourOn&&!walkOn&&!lapse&&!calm&&!inside&&!me&&!skyOpen&&!buildMode&&!planting&&!placing&&!fish;
  const friendCtx={hour:Math.floor(minutes/60),due:g.due.length,
    signal:firstOpen&&firstHolding?{name:firstHolding.name,analyst:ANALYSTS.find(a=>a.id===firstOpen.analyst)?.name??''}:null,holdings:holdings.map(x=>x.name)};
  const opener=friendOpener(friendCtx,clock.today);
  // 보리 comes over (feedback 11-17): on a day with a stop-loss signal, once the garden has settled, 보리 walks up to the
  // player and says the first line of the talk (the LLM one when signed in) in its bubble. Once a day; no nagging after.
  const boriTalks=(syncOn||!!testOpen)?lossCodes.length>0:!!lossNow;
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
  // 피드백 2026-11-26 "보리랑 루온도 움직이고 할 일을 하는 것처럼": every few seconds they stroll to a nearby point around
  // their spot and back (paused while talking, on the first walk, and in e2e unless the address has ?wander)
  const [wanderTick,setWanderTick]=useState(0);
  const wanderOn=typeof window!=='undefined'&&(!(window as {__noWander?:boolean}).__noWander);
  useEffect(()=>{if(!wanderOn)return;const t=setInterval(()=>setWanderTick(n=>n+1),TIMING.npcWander);return()=>clearInterval(t)},[wanderOn]);
  // 피드백 2026-11-26: the farmer tends the fields and carries to his cart; the paperboy rides round the houses with the paper
  const ROUTINES=useMemo<Record<string,Routine>>(()=>{const w=(id:PlaceId,dx=0,dz=0)=>{const p=place(id).walk;return {x:p.x+dx,z:p.z+dz}};
    return {farmer:{speed:1.4,pts:[{x:10.9,z:-1.3,act:'water',hold:4},{x:10.6,z:1.9,act:'prune',hold:4},{x:13.5,z:0.9,act:'carry',hold:1.6},{x:11.7,z:2.7,act:'water',hold:3.5},{x:12.4,z:0.1,act:'look',hold:5}]},
      paperboy:{ride:true,speed:4.2,pts:[{...w('home',1.2,1.0),act:'toss',hold:1.2},{...w('master',1.4,1.2),act:'toss',hold:1.2},{...w('library',-1.2,1.4),act:'toss',hold:1.2},{...w('cart',1.6,-1.2),act:'toss',hold:1.2},{x:NPC_FIRE_SEATS[2].x,z:NPC_FIRE_SEATS[2].z,act:'sit',hold:12}]}}},[]);
  // 피드백 2026-11-26 "반경이 너무 좁아, 자기 삶이 있어야지": each has a day round the village (their spot, then places they
  // like, back to the spot), walking on every TIMING.npcWander; a little to the side of each place's own walk point
  const DOOR_OF:Record<string,PlaceId>={house:'home',master:'master',arcade:'arcade',plaza:'plaza'};
  const near=(id:PlaceId,dx=1.1,dz=0.7)=>{const w=place(id).walk;return {x:w.x+dx,z:w.z+dz}};
  const ROUND:Record<number,{x:number;z:number}[]>={
    0:[{x:0,z:0},near('pond',1.6,1.2),near('farm',-1.2,1.4),{x:NPC_FIRE_SEATS[0].x,z:NPC_FIRE_SEATS[0].z},{x:0,z:0},near('arcade',1.4,-1.0),near('pond',-2.2,-0.6),near('home',1.6,1.4)],
    3:[{x:0,z:0},near('library',1.4,1.4),{x:NPC_FIRE_SEATS[1].x,z:NPC_FIRE_SEATS[1].z},near('master',1.6,-1.2),{x:0,z:0},near('orchard',-1.4,1.2),near('plaza',1.6,-1.6),near('cart',1.4,1.4)]};
  const wander=<T extends {x:number;z:number}>(b:T,salt:number,hold:boolean):T=>{if(!wanderOn||hold)return b;const r=ROUND[salt]??ROUND[0],w=r[wanderTick%r.length];
    return w.x===0&&w.z===0?b:{...b,x:w.x,z:w.z}};
  // 피드백 2026-11-26 "루온이나 보리를 누르면 원래 자리를 비춰": a talk holds them where they are now (their live spot,
  // places.ts NPC_LIVE), not back at home; the camera and the talk look there
  const frozen=useRef<Record<string,{x:number;z:number}>>({});
  const freeze=<T extends {x:number;z:number}>(id:string,b:T,talking:boolean,go:()=>T):T=>{if(!talking||!wanderOn){delete frozen.current[id];return go()}
    frozen.current[id]??=NPC_LIVE[id]?{...NPC_LIVE[id]}:{x:b.x,z:b.z};return {...b,...frozen.current[id]}};
  const boriHome=boriCame&&friendDay!==clock.today?boriCame.at:FRIEND_SPOT;
  const boriAt=freeze('bori',boriHome,(sheet?.kind==='friend'||!!talkSpot)&&!(boriCame&&friendDay!==clock.today),()=>wander(boriHome,0,!!boriCame&&friendDay!==clock.today||sheet?.kind==='friend'||!!talkSpot||walkOn));
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
  // where the camera looks for each step of the tour
  const tourView=(at:TourStep['at']):{x:number;z:number;y?:number}|null=>{if(at==='none')return null;
    if(at==='tori'||at==='moa'||at==='luon'){const p=FIXED_SPOT[at];return {x:p.x,z:p.z,y:1.4}}
    if(at==='player'){const h=(window as unknown as {__proto3d?:{player?:{x:number;z:number};sitting?:boolean}}).__proto3d,p=h?.player;return p?{x:p.x,z:p.z,y:1.4}:null}
    const p=place(at);return {x:p.x,z:p.z,y:1.6}};
  useEffect(()=>{if(tourShow&&tourStep.id==='shop')g.ops.grant('tour',START_GRANT)},[tourShow,tourStep.id]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const w=window as unknown as {__proto3d?:{tour?:unknown}};(w.__proto3d??={}).tour={on:tourOn,shown:tourShow,step:tourStep.id,n:tourN}},[tourOn,tourShow,tourStep.id,tourN]);
  // the first trees in: into the house for the first quiz (its door opens on the village tour); e2e without the tour as before
  const afterFirst=()=>{if(tutAllowed&&!s.tips.includes('tour'))enterHouse();else setSheet({kind:'lookback'})};
  // 유저 워크플로우 1장: the list confirmed at the account's entry goes with me into the room; the farmer plants it later
  const firstIn=(ids:number[],first:boolean)=>{setSheet(null);if(first&&walkAllowed&&!s.tips.includes('tour')){enterHouse();return}
    // the farmer's stop: my own stocks put in there go back to him, and he plants them
    if(walkStep==='farmer'&&!walk.planted){setVt({id:'farmer',phase:'talk',stand:meNow(),at:villager('farmer')});return}startBirth(ids,first&&s.seen.birth===0,first?afterFirst:undefined)};
  const tourNext=()=>{if(tourN>=tour.length-1){g.ops.tipDone('tour');setTourN(0);return}setTourN(n=>n+1)};
  const tourAct=(go:'journal'|'shop'|'quests')=>{tourNext();if(go==='journal'){const t=holdings[0];if(t)openTree(t.id);else setSheet({kind:'journal'})}
    else if(go==='shop')setSheet({kind:'comm',tab:'order'});else setSheet({kind:'today'})};
  // ── 유저 워크플로우 (PM 2026-11-21, core/walk.ts, content/villagers.ts) ──────────────────────────────────────────
  // The village's people: tapped from afar, I walk up to them first (nothing is said on the way); standing in front of
  // them, we turn to each other and the camera goes to my eyes on their face, then the talk opens. Walking off or a
  // blocked way cancels it. On the first walk only the current station's person opens; the others send 보리's hint and
  // I walk on to the current one.
  type Talk={id:VillagerId|'bori'|'naru'|'tori'|'moa'|'luon';phase:'walk'|'talk';stand:{x:number;z:number};at:{x:number;z:number};stage?:string};
  const [vt,setVt]=useState<Talk|null>(null);
  const meNow=()=>(window as unknown as {__proto3d?:{player?:{x:number;z:number}}}).__proto3d?.player??{x:0,z:0};
  const pendingDoor=useRef<{k:string;at:number}|null>(null);
  // 피드백 2026-11-26 "고양이·강아지랑 interact": a tap on an animal walks me beside it (in the village) and asks what to do
  const [pet,setPet]=useState<PetId|null>(null);
  useEffect(()=>{const pick=(e:Event)=>{const d=(e as CustomEvent).detail as {id:PetId;at:{x:number;z:number}};setPet(d.id);
      if(where==='village'&&!shop){const me=meNow(),dx=me.x-d.at.x,dz=me.z-d.at.z,k=Math.hypot(dx,dz)||1;if(k>1.2)setGoTo({x:d.at.x+dx/k*0.9,z:d.at.z+dz/k*0.9,at:Date.now()})}};
    addEventListener('rt-pet-pick',pick);return()=>removeEventListener('rt-pet-pick',pick)},[where,shop]);
  const petDo=(act:PetAct)=>{if(!pet)return;markDid(clock.today,'pet');const P=PETS[pet];petAct(pet,act);cue('heart');
    const key=`pet:${pet}:${act}:${clock.today}`,got=!(s.grants??[]).includes(key);if(got)g.ops.grant(key,PET_COINS[act]);
    g.say((act==='pet'?P.petLine:P.treatLine)+(got?` 코인 +${PET_COINS[act].toLocaleString()}`:''));setPet(null)};
  const nearDoor=(id:PlaceId)=>{const w=place(id).walk,me=meNow();return Math.hypot(me.x-w.x,me.z-w.z)<=LOOK.doorReach};
  const merchantOpen=merchantHere(minutes);
  const goalOf=(st:WalkStep|null)=>{const who=st?PERSON_OF[st]:null;return st==='fisher'?{x:NARU.x,z:NARU.z}:who&&isShop(who)?SHOP_DOOR[who]:who?villager(who as VillagerId):null};
  const approach=(id:VillagerId,stage?:string)=>{const v=villager(id),me=meNow(),d=Math.hypot(me.x-v.x,me.z-v.z);
    setPicked(null);setSheet(null);setFocus(null);setView(null);
    // a shop keeper: I walk to the shop's door, and go in when I am there (below)
    if(isShop(id)){if(shop===id){setVt({id,phase:'talk',stand:me,at:v,stage});return}const dr=SHOP_DOOR[id];
      if(Math.hypot(me.x-dr.x,me.z-dr.z)<1.3){setVt({id,phase:'talk',stand:me,at:v,stage});return}
      setGoTo({...dr,at:Date.now()});setVt({id,phase:'walk',stand:dr,at:v,stage});return}
    if(d<=LOOK.villager.reach&&d>0.5){setVt({id,phase:'talk',stand:me,at:v,stage});return}
    const k=d>0.01?1/d:0,stand={x:v.x+(me.x-v.x)*k*LOOK.villager.stand+(d>0.01?0:LOOK.villager.stand),z:v.z+(me.z-v.z)*k*LOOK.villager.stand};
    setGoTo({...stand,at:Date.now()});setVt({id,phase:'walk',stand,at:v,stage})};
  // 보리's hint on the first walk: who to go to now; then I walk on to them
  // 피드백 2026-11-22 (튜토리얼 느낌): nobody is walked anywhere. 보리 says where, the way there is lit (world.lead), and a
  // step off it, or a tap on someone else, only brings this line back
  const walkHint=()=>{if(meet!==null){meetHint();return}if(!walkStep)return;const goal=STEP_GOAL[walkStep];if(goal)g.say('보리 · '+WALK_LINES.hint(goal.who,goal.what)+' 빛이 비치는 길을 따라가 봐.')};
  const onVillager=(id:VillagerId)=>{if(meet!==null){if(id===MEET[meet])goMeet();else meetHint();return}if(walkOn&&!mayTalk(walk,id)){walkHint();return}approach(id)};
  // arriving: in front of them and stopped → the talk opens; stopped somewhere else → it is called off
  useEffect(()=>{if(!vt||vt.phase!=='walk')return;let last={...meNow()},still=0,went=false;
    const t=setInterval(()=>{const p=meNow();if(Math.hypot(p.x-vt.stand.x,p.z-vt.stand.z)<0.35){setVt(v=>v&&{...v,phase:'talk',stand:{x:p.x,z:p.z}});return}
      const moved=Math.hypot(p.x-last.x,p.z-last.z);last={...p};if(moved>=0.01)went=true;still=moved<0.01?still+1:0;
      // stopped short after walking (I went elsewhere), or never set off (no way there)
      // an introduction never stalls: stopped on the way (no path), the talk opens where I am
      if((went&&still>8)||still>25)setVt(v=>v&&v.stage==='meet'?{...v,phase:'talk',stand:{x:p.x,z:p.z}}:null)},120);
    return()=>clearInterval(t)},[vt?.phase,vt?.id,vt?.stand.x]);// eslint-disable-line react-hooks/exhaustive-deps
  const talkOver=()=>setVt(null);
  // 유저 워크플로우 (2026-11-23) 토론 캐릭터: tapped, I walk up to 루온; face to face, from my eyes, then a stock to talk over
  const debate=()=>{if(walkOn){walkHint();return}const v=wanderOn&&NPC_LIVE.luon?{...NPC_LIVE.luon}:FIXED_SPOT.luon,me=meNow(),d=Math.hypot(me.x-v.x,me.z-v.z);setPicked(null);setSheet(null);setFocus(null);
    if(d<=LOOK.villager.reach&&d>0.5){setVt({id:'luon',phase:'talk',stand:me,at:{x:v.x,z:v.z}});return}
    const k=d>0.01?1/d:0,stand={x:v.x+(me.x-v.x)*k*LOOK.villager.stand+(d>0.01?0:LOOK.villager.stand),z:v.z+(me.z-v.z)*k*LOOK.villager.stand};
    setGoTo({...stand,at:Date.now()});setVt({id:'luon',phase:'walk',stand,at:{x:v.x,z:v.z}})};
  // there: in through the door
  useEffect(()=>{if(vt&&vt.phase==='talk'&&isShop(vt.id)&&shop!==vt.id&&where==='village')swapShop(vt.id)},[vt?.phase,vt?.id]);// eslint-disable-line react-hooks/exhaustive-deps
  const say=(stage:string)=>setVt(v=>v&&{...v,stage});
  // 피드백 2026-11-21: selling is the farmer's errand. He walks to the virtual tree, picks, and carries the fruit to the cart
  // (Village3D Villager errand); the talk goes on when he is back
  const errandLoad=useRef<(()=>void)|null>(null);
  const [errand,setErrand]=useState<{lotId:number;to:{x:number;z:number};key:number;after:string|null}|null>(null);
  const todays=useMemo(()=>candidates(KOSDAQ_STOCKS,clock.today).map(st=>{const q=buyQuote(s.virtual??[],st.code,clock.today);return {code:st.code,name:st.name,mkt:st.mkt,price:q?.price??null,real:!!q?.real}}),[clock.today,pricesAt,s.virtual]);
  // the virtual stocks' real closes (core/virtual.ts, kept apart from the journals' bars): the shop's stocks, today's
  // picks and the ones in the orchard, once per sign-in and whenever a new one is planted
  const virtualKey=[...new Set([...VIRTUAL_STOCKS.map(x=>x.code),...todays.map(x=>x.code),...(s.virtual??[]).map(l=>l.code)])].sort().join(',');
  useEffect(()=>{if(!realPrices?.virtual||!virtualKey)return;let on=true;
    void realPrices.virtual(virtualKey.split(',')).then(n=>{if(on&&n)setPricesAt(Date.now())});return()=>{on=false}},[realPrices,virtualKey]);
  // 통신기 (ui/Comm.tsx) and the merchant/farmer share these: a coin buy plants a virtual tree, a sell goes on the farmer's cart
  const commRoom=fieldPlots(s.built?.land??[],'orchard').filter(i=>!holdings.some(h=>h.plot===i)&&!(s.virtual??[]).some(l=>l.plot===i)).length;
  const commBuy=(code:string,n:number):string|null=>{const name=todays.find(c=>c.code===code)?.name??'';
          const r=g.ops.buyVirtual(code,n);
          if(r.ok)markDid(clock.today,'vbuy');
          // the first walk's buy: planted before the eyes, then the merchant says what comes next
          if(r.ok&&walkStep==='merchant'){const lot=r.lot;putWalk(w=>({...w,freeTree:lot.id}));setSheet(null);setVt(null);cue('plant');
            startBirth([VIRTUAL_ID+lot.id],false,()=>setVt({id:'merchant',phase:'talk',stand:meNow(),at:villager('merchant'),stage:'planted'}));return null}
          if(r.ok){cue('capsule-mark');return `${name} ${n}주를 샀어요. 가상 밭에 심었어요.`}
          return r.why==='coins'?`코인이 ${won(r.need??0)} 모자라요`:r.why==='room'?'가상 밭에 빈칸이 없어요':'지금은 살 수 없어요'};
  // 피드백 2026-11-26 (B. 연습 과수원): first steps with a reward each, shown in the 통신기's 잔고
  const flag=(k:string)=>{try{return !!localStorage.getItem('rethink-mis-'+k)}catch{return false}},setFlag=(k:string)=>{try{localStorage.setItem('rethink-mis-'+k,'1')}catch{/* this visit */}};
  const vlots=s.virtual??[],paid=(id:string)=>(s.grants??[]).includes('mis:'+id);
  const missions=[{id:'first-buy',label:'첫 매수 해 보기',done:vlots.length>0,coins:20000},{id:'read-news',label:'뉴스 탭에서 기사 하나 읽기',done:flag('read'),coins:10000},
    {id:'spread3',label:'세 종목에 나눠 담기 (분산 투자)',done:new Set(vlots.map(l=>l.code)).size>=3,coins:30000},{id:'profit',label:'수익 난 종목 매도해 보기',done:flag('profit'),coins:30000}].map(m=>({...m,paid:paid(m.id)}));
  // the morning's note (B): how the practice orchard did on the last trading day, once a day
  useEffect(()=>{if(!ready||!vlots.length)return;try{if(localStorage.getItem('rethink-orchard-day')===clock.today)return;localStorage.setItem('rethink-orchard-day',clock.today)}catch{return}
    let now=0,prev=0;for(const l of vlots){const c=change(l.code,clock.today);if(!c)continue;now+=c.price*l.qty;prev+=c.prev*l.qty}
    if(prev>0){const r=(now/prev-1)*100;g.say(`🍎 연습 과수원 · 지난 거래일 ${r>=0?'+':''}${r.toFixed(2)}% (${r>=0?'+':''}${Math.round(now-prev).toLocaleString('ko-KR')}원)`)}},[ready,clock.today]);// eslint-disable-line react-hooks/exhaustive-deps
  const claim=(id:string)=>{const m=missions.find(x=>x.id===id);if(m&&m.done&&g.ops.grant('mis:'+id,m.coins))cue('capsule-mark')};
  const commSell=(lotId:number,n:number)=>{setSheet(null);const l=(s.virtual??[]).find(x=>x.id===lotId);if(!l)return;{const q=lotQuote(l,clock.today);if(q&&q.price>l.cost)setFlag('profit')}
          // the farmer goes for it: the talk closes, he walks to the tree, picks, carries it to the cart; then it is loaded
          const [tx,tz]=PLOTS[l.plot]??[0,0];setVt(null);
          setErrand({lotId,to:{x:tx,z:tz},key:Date.now(),after:null});
          errandLoad.current=()=>{if(g.ops.cartLoad(lotId,n)){cue('capsule-mark');g.say(`${l.name} ${n}주를 수레에 실었어요 · 다음 거래일 종가로 정산돼요`)}
            setVt({id:'farmer',phase:'talk',stand:meNow(),at:villager('farmer'),stage:'loaded'})}};
  const freeLot=(s.virtual??[]).find(l=>l.id===walk.freeTree)??(s.virtual??[])[0]??null;
  // the cart is paid at the next trading day's close: checked as the village opens and now and then
  useEffect(()=>{if(ready&&(s.cart??[]).some(c=>c.paid==null))g.ops.cartSettle()},[ready,clock.today]);// eslint-disable-line react-hooks/exhaustive-deps
  const pile=waiting(s.cart??[]).filter(c=>!c.practice).reduce((n,c)=>n+c.qty,0);
  // the first walk's square (보리 shows the way): the camera looks at the two fields and the library in turn
  const [lookAt,setLookAt]=useState(0);
  // 피드백 2026-11-21: on the square 보리 introduces the village's people one by one: the camera goes from behind me down
  // to the eye in front of each (3인칭 → 1인칭), each says who they are, then it eases back out before the next
  // 피드백 2026-11-22: I walk up to each one myself (3인칭, the camera behind me), and only the talk is seen from my eyes (1인칭);
  // the three analysts first, then the village's people
  // 유저 워크플로우 (2026-11-23 "문서에 없는 캐릭터는 빼"): only the people of the workflow, in its order
  const MEET=['farmer','merchant','librarian','paperboy','naru','builder','tailor'] as const;
  const meetSpot=(id:typeof MEET[number])=>isShop(id)?SHOP_DOOR[id]:id==='naru'?{x:NARU.x,z:NARU.z}:villager(id as VillagerId);
  const [meet,setMeet]=useState<number|null>(null);
  const meetName=(id:string)=>id==='naru'?'나루':id==='tori'||id==='moa'||id==='luon'?INTRO_NAME[id]:VILLAGERS.find(v=>v.id===id)?.name??'';
  // where the light falls for each: in front of them (나루: the fishing stand, the pond lies between)
  const meetLead=(id:typeof MEET[number])=>id==='naru'?{x:FISH_STAND.x,z:FISH_STAND.z}:meetSpot(id);
  const meetHint=()=>{if(meet!==null)g.say(`보리 · 그쪽 말고! 빛이 비치는 ${meetName(MEET[meet])}한테 먼저 가 보자.`)};
  // a tap on the one to meet: I walk over myself (my own tap), and the talk opens when I am there (below)
  const goMeet=()=>{if(meet===null)return;const at=meetLead(MEET[meet]),me0=meNow(),dx=me0.x-at.x,dz=me0.z-at.z,d=Math.hypot(dx,dz)||1,R=MEET[meet]==='naru'?0:LOOK.villager.stand;
    setGoTo({x:at.x+dx/d*R,z:at.z+dz/d*R,at:Date.now()})};
  // 피드백 2026-11-22: the merchant is there 08:00–20:00 only, so at night the introductions pass him by (보리 says when he comes)
  const meetNext=()=>{let n=(meet??-1)+1;setVt(null);if(shop)swapShop(null);const away=MEET[n]==='merchant'&&!merchantOpen;if(away)n++;
    if(n>=MEET.length){setMeet(null);pass('square');return}
    setMeet(n);g.say(`보리 · ${away?`상인은 ${nextOpenLabel(minutes)}에 와서 지금은 없어. 대신 `:n?'이번엔 ':'먼저 '}${meetName(MEET[n])}! 빛이 비치는 길을 따라 걸어가 봐.`)};
  // 피드백 2026-11-24 "자기소개 한 다음 따로 심어 보기 말고 소개하면서 같이 한 번에": no round of introductions first; the
  // walk goes straight to the first station, and each one's first talk there starts with who they are (introLine below)
  const startStations=()=>{setVt(null);if(shop)swapShop(null);pass('square');g.say('보리 · 먼저 농부한테 가 보자! 빛이 비치는 길을 따라 걸어가 봐.')};
  const [introduced,setIntroduced]=useState<string[]>([]);
  const squareOn=walkStep==='square'&&where==='village'&&!sheet&&!vt&&meet===null&&!calm&&!fading;
  // the tutorial's lead (Scene3D world.lead): the one place to go now, from where I stood when it was set
  const leadOn=walkOn&&where==='village'&&!sheet&&!vt&&!calm&&!fading&&!fish&&!me&&!shop;
  const leadTo=leadOn?(meet!==null?meetLead(MEET[meet]):walkStep&&walkStep!=='square'?(walkStep==='fisher'?{x:FISH_STAND.x,z:FISH_STAND.z}:goalOf(walkStep)):null):null;
  const leadKey=leadTo?`${meet}:${walkStep}`:'';
  const leadFrom=useRef<{k:string;p:{x:number;z:number}}>({k:'',p:{x:0,z:0}});
  if(leadFrom.current.k!==leadKey)leadFrom.current={k:leadKey,p:{...meNow()}};
  // there: the talk opens by itself (the eye camera comes down only now)
  const leadNow=useRef('');leadNow.current=leadOn?leadKey:'';
  // 피드백 2026-11-23 "대화하고 X 눌렀는데 처음부터 다시 대화": a talk this lead already opened and I closed does not open
  // again where I stand; I step away first (out of reach), and coming back opens it
  const leadOpened=useRef('');
  useEffect(()=>{if(!leadTo)return;const to=leadTo,key=leadKey;let armed=leadOpened.current!==key;
    const t=setInterval(()=>{if(leadNow.current!==key)return;const p=meNow(),d=Math.hypot(p.x-to.x,p.z-to.z);if(!armed){if(d>LOOK.villager.reach+0.6)armed=true;return}
      if(d>LOOK.villager.reach)return;clearInterval(t);leadOpened.current=key;
      if(meet!==null){const id=MEET[meet],at=meetSpot(id);setGoTo({x:p.x,z:p.z,at:Date.now()});setVt({id:id as Talk['id'],phase:'talk',stand:{x:p.x,z:p.z},at:{x:at.x,z:at.z},stage:'meet'});return}
      const who=walkStep?PERSON_OF[walkStep]:null;if(who==='naru')naruPick();else if(who)approach(who as VillagerId)},200);
    return()=>clearInterval(t)},[leadKey,leadOn]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!squareOn)return;const t=setInterval(()=>setLookAt(n=>n+1),TIMING.walkLook);return()=>clearInterval(t)},[squareOn]);
  const squareView=squareOn?(()=>{const p=[place('farm'),place('orchard'),place('pond')][lookAt%3];return {x:p.x,z:p.z,y:1.6}})():null;
  const endWalk=()=>setVt({id:'bori',phase:'talk',stand:meNow(),at:meNow(),stage:'end'});
  const pass=(id:WalkStep)=>{if(shop)swapShop(null);putWalk(w=>passStep(w,id));if(id===WALK_STEPS[WALK_STEPS.length-1])endWalk()};
  // the first walk's step after a sheet closes (the board, the shop, the wardrobe)
  const afterSheet=useRef<WalkStep|null>(null);
  useEffect(()=>{if(!sheet&&!me&&afterSheet.current){const id=afterSheet.current;afterSheet.current=null;pass(id)}},[sheet,me]);// eslint-disable-line react-hooks/exhaustive-deps
  // 피드백 2026-11-22 "밤에 만날 수 없는 상인에게 가라고 안내됨": outside his hours the first walk skips the merchant (and the
  // selling after him) instead of lighting the way to an empty stall; he waits for the next opening (merchantWait)
  useEffect(()=>{if(walkStep==='merchant'&&!merchantOpen&&where==='village'&&!vt&&!sheet){
    putWalk(w=>({...passStep(passStep(w,'merchant'),'sell'),merchantWait:true}));
    g.say(`보리 · 상인은 아침 8시부터 저녁 8시까지만 와. 지금은 없으니까 ${nextOpenLabel(minutes)}에 만나자. 먼저 신문 배달한테 가 보자.`)}},[walkStep,merchantOpen,where,vt,sheet]);// eslint-disable-line react-hooks/exhaustive-deps
  // fishing once with 나루 passes the pond station
  const fished=useRef(false);
  useEffect(()=>{if(fish==='play')fished.current=true;if(fish===null&&fished.current&&walkStep==='fisher'){fished.current=false;pass('fisher')}},[fish]);// eslint-disable-line react-hooks/exhaustive-deps
  const writeFor=(st:{code:string;name:string}|null)=>{const hh=st?[...holdings,...vtrees].find(x=>x.code===st.code):undefined;
    const id=g.ops.journalNew(hh&&!hh.virtual?{holdingId:hh.id}:{stock:st});setSheet({kind:'write',id})};
  // what each one says now: by the first walk's station and the talk's stage
  const talkOf=(t:Talk):{name:string;line:string;choices:Choice[]}=>{const st=t.stage;
    if(t.id==='bori'){if(st==='end')return {name:'보리',line:WALK_LINES.done,choices:[{label:'좋아',go:()=>{talkOver();g.ops.tipDone('tour')}}]};
      return {name:'보리',line:WALK_LINES.square,choices:[{label:'가 보자',go:()=>startStations()}]}}
    if(t.id==='luon')return {name:'루온',line:'어떤 종목 얘기할래? 고르면 반대 근거를 같이 찾아볼게.',
      choices:[{label:'종목 골라 토론하기',go:()=>{talkOver();setSheet({kind:'talk',id:'luon'})}}]};
    if(t.id==='farmer'){
      if(walkStep==='farmer'){
        if(st==='planted')return {name:'농부',line:'다 심었어. 나무 크기는 금액, 열매는 수익률이야. 나무를 누르면 자세히 보여.',choices:[{label:'알겠어',go:()=>say('edit')}]};
        if(st==='edit')return {name:'농부',line:'여긴 기록만 하는 밭이야. 실제로 사고팔았으면 나한테 와서 고쳐. 코인으로 사고파는 건 가상 밭에서.',choices:[{label:'가상 밭으로',go:()=>{talkOver();pass('farmer')}}]};
        // 피드백 2026-11-22 "입력 안 했는데 알아서 채운다": the example garden's stocks are not mine, so he asks first
        if(holdings.length&&!walk.planted&&s.example&&st!=='ok')return {name:'농부',line:`지금 있는 ${holdings.length}개는 예시 종목이야. 네 종목을 넣을래?`,
          choices:[{label:'내 종목 넣기',go:()=>{talkOver();g.ops.setHoldings([]);setSheet({kind:'onboard'})}},{label:'예시로 두기',go:()=>say('ok')},{label:'비워 두기',go:()=>{g.ops.setHoldings([]);putWalk(w=>({...w,planted:true}));say('edit')}}]};
        if(holdings.length&&!walk.planted)return {name:'농부',line:s.example?`예시 종목 ${holdings.length}개 심어 줄게. 나중에 네 걸로 바꿀 수 있어.`:`${holdings.length}개 심어 줄게.`,choices:[{label:'심어 줘',go:()=>{
          putWalk(w=>({...w,planted:true}));talkOver();
          startBirth(holdings.map(x=>x.id),s.seen.birth===0,()=>setVt({id:'farmer',phase:'talk',stand:meNow(),at:villager('farmer'),stage:'planted'}))}}]};
        return {name:'농부',line:'아직 비었네. 종목이 생기면 나한테 넣어 줘.',choices:[{label:'알겠어',go:()=>say('edit')}]};
      }
      if(walkStep==='sell'){const lots=s.virtual??[];
        if(st==='loaded'){const c=(s.cart??[]).filter(x=>x.paid==null&&!x.practice).slice(-1)[0];
          return {name:'농부',line:`수레에 실었어.${c?` ${c.name} ${c.qty}주, ${c.settleDay.slice(5).replace('-','월 ')}일 장 끝나면 팔려.`:' 다음 거래일 장 끝나면 팔려.'} 이제 도서관으로 가 봐.`,
            choices:[{label:'도서관으로',go:()=>{talkOver();pass('sell')}}]}}
        if(!lots.length)return {name:'농부',line:'팔 가상 나무가 아직 없네. 도서관부터 가 봐.',choices:[{label:'도서관으로',go:()=>{talkOver();pass('sell')}}]};
        return {name:'농부',line:'아까 산 가상 나무, 몇 주 팔지 정해 줘. 다음 거래일 장 끝나면 팔려.',
          choices:[{label:'팔 수량 정하기',go:()=>setSheet({kind:'harvest'})}]};
      }
      if(st==='loaded')return {name:'농부',line:'수레에 실었어. 다음 거래일 장 끝나면 코인이 들어와.',choices:[{label:'알겠어',go:talkOver}]};
      return {name:'농부',line:'뭘 도와줄까?',
        choices:[{label:'내 종목 고치기',go:()=>{talkOver();setSheet({kind:'onboard'})}},{label:'가상 종목 팔기',go:()=>setSheet({kind:'harvest'})}]};
    }
    if(t.id==='merchant'){
      // 피드백 2026-11-26 "가상 종목 추가가 불가능": out of hours the stall still takes an order through the 통신기
      if(!merchantOpen)return {name:'보리',line:walkStep==='merchant'?`상인은 ${nextOpenLabel(minutes)}에 와. 그동안 신문 배달부터 만나 볼까?`:`상인은 ${nextOpenLabel(minutes)}에 와. 주문은 지금 통신기로 넣어 둘 수 있어.`,
        choices:walkStep==='merchant'?[{label:'신문 배달 먼저',go:()=>{talkOver();putWalk(w=>({...passStep(passStep(w,'merchant'),'sell'),merchantWait:true}))}}]
          :[{label:'통신기로 주문',go:()=>{setVt(null);setSheet({kind:'comm',tab:'order'})}},{label:'알겠어',go:talkOver}]};
      if(st==='planted')return {name:'상인',line:'심었어! 가상 나무 값은 실제 주가를 따라가. 팔 땐 농부한테 가면 돼.',
        choices:[{label:walkStep==='merchant'?'농부한테 가기':'고마워',go:()=>{talkOver();if(walkStep==='merchant')pass('merchant');else putWalk(w=>({...w,merchantWait:false}))}}]};
      const first=!(s.grants??[]).includes('tour');
      return {name:'상인',line:first?`코인으로 사고파는 건 여기서 해. 시작 코인 ${(START_GRANT/10000).toLocaleString()}만 원 줄게. 오늘 후보 다섯 개 중에 골라 봐.`:'오늘 후보 다섯 개야. 통신기에서 골라 봐.',
        choices:[{label:first?'코인 받고 통신기 보기':'통신기 받기',go:()=>{if(first)g.ops.grant('tour',START_GRANT);setVt(null);setSheet({kind:'comm',tab:'order'})}},]};
    }
    if(t.id==='librarian'){const fs=freeLot?{code:freeLot.code,name:freeLot.name}:holdings[0]?{code:codeOf(holdings[0]),name:holdings[0].name}:null;
      return {name:'사서',line:walkStep==='librarian'?`${fs?`${fs.name} 나무`:'아까 심은 나무'}, 왜 심었는지 한 줄 써 보자.`:'일지 쓰러 왔구나. 펼쳐 볼까?',
        choices:[{label:'일지 펼치기',go:()=>{if(walkStep==='librarian')afterSheet.current='librarian';// the first walk opens that tree's page, where today's journal starts with it
          setSheet(walkStep==='librarian'&&fs?{kind:'journal',stock:fs.code}:{kind:'journal'})}}]};
    }
    if(t.id==='paperboy'){
      if(walkStep==='news')return {name:'신문 배달',line:'네 종목 소식 모아 왔어. 표지판에 꽂아 뒀어.',
        choices:[{label:'표지판 보기',go:()=>{afterSheet.current='news';setSheet({kind:'news'})}}]};
      return {name:'신문 배달',line:'오늘 소식 왔어. 표지판에 있어.',choices:[{label:'표지판 보기',go:()=>setSheet({kind:'news'})}]};
    }
    if(t.id==='builder'){const line='건물이랑 길, 꽃과 나무를 코인으로 팔아요. 산 건 마을 꾸미기에서 놓으면 돼요.';
      return {name:'건물 상인',line,choices:[{label:'물건 보기',go:()=>{if(walkStep==='shop-build')afterSheet.current='shop-build';setSheet({kind:'cart'})}},
        // 피드백 2026-11-22 "튜토리얼 중에 이 화면에서 벗어날 수가 없다": a way out on the first walk too (the stop counts as seen)
        ...(walkStep==='shop-build'?[{label:'다음에 볼게',go:()=>{talkOver();pass('shop-build')}}]:[])]}}
    if(t.id==='tailor')return {name:'옷 상인',line:'옷 구경해 볼래? 산 옷은 너를 누르면 언제든 갈아입을 수 있어.',
      choices:[{label:'옷 보기',go:()=>{if(walkStep==='shop-wear')afterSheet.current='shop-wear';talkOver();setMe(true)}},...(walkStep==='shop-wear'?[{label:'다음에 볼게',go:()=>{talkOver();pass('shop-wear')}}]:[])]};
    return {name:'',line:'',choices:[]};
  };
  // every station done but 보리's last line not answered yet (a reload in between): it is said again
  useEffect(()=>{if(walkOn&&walkDone(walk)&&!vt&&where==='village'&&!sheet&&!me&&!calm)endWalk()},[walkOn,walk.step,vt,where,sheet,me,calm]);// eslint-disable-line react-hooks/exhaustive-deps
  // the square: 보리 starts the first walk as soon as I come out of the door
  useEffect(()=>{if(squareOn&&!vt)setVt({id:'bori',phase:'talk',stand:meNow(),at:meNow()})},[squareOn]);// eslint-disable-line react-hooks/exhaustive-deps
  // the introductions on the square (above): who each is and what they do here
  // (2026-11-25) 보리's square talk waits for 가 보자: it used to close by itself after TIMING.meetLead, a leftover from the
  // introductions round (gone since 2026-11-22), so a slow reader lost the first line of the walk
  const naruPick=()=>{if(fish)return;if(meet!==null){if(MEET[meet]==='naru')goMeet();else meetHint();return}if(walkOn&&!mayTalk(walk,'naru')){walkHint();return}setPicked(null);setSheet(null);setGoTo({...FISH_STAND,at:Date.now()});setFish('talk')};
  const meetOf=(t:Talk)=>t.stage!=='meet'?null:{name:meetName(t.id),
    line:INTRO[t.id]+(t.id==='merchant'&&!merchantOpen?` 지금은 자리에 없어. ${nextOpenLabel(minutes)}에 와.`:''),
    choices:[{label:meet!==null&&meet>=MEET.length-1?'산책 시작':'다음 사람',go:meetNext}]};
  // the station's person, met for the first time on the walk: their introduction and the first line of the task as one
  // talk; any answer counts as met
  const introLine=(t:Talk,x:{name:string;line:string;choices:Choice[]}|null)=>{
    if(!x||!walkOn||!walkStep||PERSON_OF[walkStep]!==t.id||introduced.includes(t.id)||!INTRO_WALK[t.id]||x.name==='보리')return x;
    return {...x,line:INTRO_WALK[t.id]+' '+x.line.replace(/^(어, 왔어\? |어서 와\. |어, 너구나! |어서 오세요\. |Oh, welcome~ )/,''),choices:x.choices.map(c=>({...c,go:()=>{setIntroduced(a=>[...a,t.id]);c.go()}}))}};
  const vtTalk=vt&&vt.phase==='talk'&&!sheet&&!me?meetOf(vt)??introLine(vt,talkOf(vt)):null;
  // a sheet opened from a talk goes back to the talk when it closes (unless the talk moved on)
  // e2e: pass the current station as its own last step would (the journal's nine blanks are tested elsewhere)
  useEffect(()=>{const h=(window as unknown as {__proto3d?:Record<string,unknown>});(h.__proto3d??={}).walkPass=(id:WalkStep)=>{setSheet(null);setVt(null);pass(id)};(h.__proto3d as Record<string,unknown>).meet=(id:VillagerId)=>onVillager(id);(h.__proto3d as Record<string,unknown>).landmark=(k:string)=>landmarkNow(k);(h.__proto3d as Record<string,unknown>).landmarkTap=(k:string)=>world.onLandmark(k as never);(h.__proto3d as Record<string,unknown>).goTo=(x:number,z:number)=>setGoTo({x,z,at:Date.now()});(h.__proto3d as Record<string,unknown>).room=(into:boolean)=>{setMe(false);swapRoom(into)};(h.__proto3d as Record<string,unknown>).shop=(id:ShopId|null)=>swapShop(id)});
  useEffect(()=>{const h=(window as unknown as {__proto3d?:Record<string,unknown>});(h.__proto3d??={}).walk={on:walkOn,step:walkStep,n:walk.step,planted:walk.planted,talk:vt?{id:vt.id,phase:vt.phase,stage:vt.stage??null}:null,merchant:merchantOpen,pile,errand:!!errand,lead:leadTo,meet}},[walkOn,walkStep,walk,vt,merchantOpen,pile,errand,leadKey,meet]);
  const world:World={
    // the three come in with the first trees
    // 게임 구성 2026-11-20: each friend keeps its own place (토리 by the real field, 모아 by the virtual field, 루온 by the bridge)
    // 유저 워크플로우 (2026-11-23): the three analysts are not in the village (signals come with 보리)
    // 피드백 2026-11-23 "없앤 캐릭터 모습 중 하나를 토론 캐릭터로": 루온 (the skeptic's look and voice) stays as the debate partner
    analysts:!ready||lapse||(calm&&(bStage==='trees'||bStage==='orbit'))?[]:[{id:'luon' as AnalystId,at:null,spot:(()=>{const hold=vt?.id==='luon'||sheet?.kind==='talk'||walkOn;return freeze('luon',FIXED_SPOT.luon,(vt?.id==='luon'||sheet?.kind==='talk')&&!walkOn,()=>{const w=wander(FIXED_SPOT.luon,3,hold);return w===FIXED_SPOT.luon?w:{...w,act:wanderTick%2?'look':w.act}})})(),bubble:null,talking:vt?.id==='luon'}],
    pots:holdings.filter(()=>false).map(h=>({holdingId:h.id,open:!!openFor(s.cooldowns,h.id),flowers:flowersOn(s.cooldowns,h.id)})).filter(p=>p.open||p.flowers),
    decor:s.owned.filter(o=>o.slot).map(o=>({slot:o.slot!,shape:itemById(o.itemId)!.shape})),
    burst,focus,birth,enterFrom:calm?DOOR:null,cutaway:cut,onDeep:id=>{if(!calm&&ready)openDeep(id)},
    capsules:[],capsuleFx:capFx,onCapsule:id=>{if(!calm)onCapsule(id)},hitRate:track.hitRate,cartFlag:CART_FLAGS[Number(clock.today.slice(-2))%CART_FLAGS.length],gameLit:!(s.observatory?.runs??[]).some(r=>r.finishedAt!==null&&r.mode==='ranked'&&r.day===kstDay(clock.now)),
    // 설계 5장: the friends are talked to face to face (the briefing and the grade badges are gone)
    // 9-5: each friend talks in its own voice: small talk or one of my holdings
    onAnalyst:id=>{if(walkOn){if(meet!==null&&(id as string)===MEET[meet]){goMeet();return}walkHint();return}if(id==='luon'){debate();return}if(id in VILLAGE_SPEAKERS){setPicked(null);setSheet({kind:'talk',id:id as 'tori'|'moa'|'luon'})}else talkFriend()},
    // 피드백 2026-11-22: during the first walk a tap that lands on my own figure (it stands mid-screen) no longer opens the
    // wardrobe; the tailor's stop opens it, and afterwards a tap on me does
    onPlayer:()=>{if(walkOn&&!walkDone(walk))return;setPicked(null);setSheet(null);setMe(true)},
    // 유저 워크플로우: the village's people, the guide to the next one, the board, the cart and the merchant's stall
    villagers:ready&&!lapse&&!inside&&!me&&!skyOpen&&!(calm&&bStage==='trees')?OUTSIDE.map(v=>({id:v.id,x:v.x,z:v.z,face:v.face,look:v.look,hl:!!walkStep&&PERSON_OF[walkStep]===v.id&&!vtTalk,
      talking:vt?.id===v.id,away:v.id==='merchant'&&!merchantOpen,onPick:()=>onVillager(v.id),routine:wanderOn&&!walkOn&&!errand?ROUTINES[v.id]??null:null,
      ...(v.id==='farmer'&&errand?{errand:{to:errand.to,cart:{x:FARM_CART.x,z:FARM_CART.z},key:errand.key},onErrandDone:()=>{setErrand(null);const f=errandLoad.current;errandLoad.current=null;f?.()}}:{})})):undefined,
    guide:walkStep&&walkStep!=='square'&&!vt&&!sheet&&!calm&&!fish?goalOf(walkStep):null,
    // the light falls on 나루 himself, not on the spot I fish from (피드백 2026-11-23)
    lead:leadTo?{from:leadFrom.current.p,to:leadTo,mark:(meet!==null?MEET[meet]==='naru':walkStep==='fisher')?NARU:undefined,off:walkHint}:null,
    onNews:()=>{if(walkOn&&walkStep!=='news'&&walk.step<=WALK_STEPS.indexOf('news')){walkHint();return}onVillager('paperboy')},
    cartPile:pile,merchantOpen,shop,onShop:id=>onVillager(id),
    flags:LEAGUE_FLAGS,myFlag:0,caseOpen:!caseDone,goTo,inside,look,stage:me,light,sky:skyWorld,fp:fp&&!inside,
    plants:(s.plants??[]).map(p=>({...p,scale:shopPlant(p.item)?.scale??1})),planting:planting&&!sheet?planting:null,placing:placing&&!sheet?placing:null,
    onPlace:(x,z,why)=>{if(!placing)return;if(why){g.say(why);return}if(g.ops.build({kind:'building',id:placing.id},[x,z])){setPlacing(null);cue('capsule-mark')}},
    onPlant:(x,z,why)=>{if(!planting)return;const it=shopPlant(planting.item);if(!it)return;if(why){g.say(why);return}
      const r=g.ops.plant(it,x,z);if(r==='ok'){g.say(`${it.name} 심었어요 · -${won(it.price)}`);setPlanting(null);cue('capsule-mark')}
      else g.say(r==='coins'?'코인이 모자라요':'다른 꽃·나무랑 너무 가까워요')},
    // 보리 came over and is talking: the camera comes close on the two of them until the talk opens or is answered
    // with 나루: the camera on the two of them while talking, over the player's shoulder onto the water while fishing
    talk:vtTalk&&vt&&vt.id!=='bori'&&!shop?{x:vt.at.x,z:vt.at.z,az:0,eye:{x:vt.stand.x,z:vt.stand.z,ax:vt.at.x,az:vt.at.z}}
      :tourShow&&tourNear&&(tourStep.at==='tori'||tourStep.at==='moa'||tourStep.at==='luon')?(()=>{const sp=FIXED_SPOT[tourStep.at];const T=LOOK.camera.tour;return {x:sp.x,z:sp.z,az:sp.face+(T.turn[tourStep.at]??0),pitch:T.pitchOf[tourStep.at]??T.pitch,dist:T.dist,lift:T.lift}})()
      :fish==='talk'?{x:(NARU.x+FISH_STAND.x)/2,z:(NARU.z+FISH_STAND.z)/2,az:Math.atan2(FISH_STAND.x-NARU.x,FISH_STAND.z-NARU.z)+LOOK.camera.talk.turn}
      :fish==='play'?{x:FISH_AT.x*0.8+FISH_STAND.x*0.2,z:FISH_AT.z*0.8+FISH_STAND.z*0.2,az:Math.atan2(FISH_STAND.x-FISH_AT.x,FISH_STAND.z-FISH_AT.z)+0.35,pitch:LOOK.camera.fish.pitch,dist:LOOK.camera.fish.dist}
      :talkSpot&&sheet?.kind==='friend'?{x:(talkSpot.at.x+talkSpot.me.x)/2,z:(talkSpot.at.z+talkSpot.me.z)/2,
      // from behind the player looking at 보리 (it faces the player, so its face shows), swung a little to the side
      az:Math.atan2(talkSpot.me.x-talkSpot.at.x,talkSpot.me.z-talkSpot.at.z)+LOOK.camera.talk.turn}:null,
    room:{books:s.judgments.slice(-36).map(j=>{const gr=s.graded.filter(x=>x.judgmentId===j.id).at(-1);return {state:gr?(gr.hit?'hit':'miss'):'waiting'} as const}),
      notes:capsules.map(c=>({holdingId:c.holdingId,due:c.due})),
      resting:[],
      // 피드백 2026-11-22: the teacher's desk keeps the quizzes I did; the librarian's shelf is the journal
      people:true,onDesk:()=>setSheet({kind:'quizlog'}),onShelf:()=>setSheet({kind:'journal'}),
      onBoard:()=>{if(g.due.length)setSheet({kind:'grades'});else g.say(capsules.length?line(UI.boardWait,{n:capsules.length}):UI.boardEmpty)},onDoor:()=>swapRoom(false)},
    naru:ready&&!lapse&&!calm&&!inside&&!me&&!skyOpen?{at:NARU,onPick:naruPick}:null,
    fishing:fish==='play'&&bob?{...FISH_AT,phase:bob}:null,
    friend:friendHere?{at:talkSpot&&sheet?.kind==='friend'?talkSpot.at:boriAt,onPick:talkFriend,face:boriFace}:null,
    view:squareView??(placing&&!sheet?{x:3,z:0,y:2}:null)??(errand?{x:(errand.to.x+FARM_CART.x)/2,z:(errand.to.z+FARM_CART.z)/2,y:1.6}:null)??(tourShow?tourView(tourStep.at)??view:view),
    build:ready?{built,mode:false,onLot:key=>{const [k,id]=key.split(':');if(k==='city'){setPicked(null);setSheet({kind:'cities'});return}setWant({kind:k as 'land'|'building',id})}}:null,
    // 게임 구성 2026-11-20: 집 (the quiz), 상점, 표지판 (the map), 퀘스트 게시판 (the old 관측소), 광장 (other people's villages)
    onLandmark:k=>{if(walkOn&&k!=='signpost'&&!(k==='cart'&&walkStep==='shop-build')){walkHint();return}
      // 피드백 2026-11-26 "destination에 어느 정도 가까워야 클릭해서 들어갈 수": a door far away is walked to first; I go in
      // when I get there (another tap elsewhere on the way calls it off)
      const door=DOOR_OF[k as string];if(door&&!nearDoor(door)){setPicked(null);setSheet(null);const w=place(door).walk,at=Date.now();setGoTo({...w,at});pendingDoor.current={k:k as string,at};return}
      landmarkNow(k as string)},
  };
  function landmarkNow(k:string){
      if(k==='house'){if(roomMode()){setMe(false);swapRoom(true)}else enterHouse();return}setPicked(null);if(k==='cart'){onVillager('builder');return}if(k==='library'){onVillager('librarian');return}
      if(k==='signpost'){setSheet({kind:'map'});return}if(k==='observatory'){setSheet({kind:'today'});return}if(k==='plaza'){setSheet(null);setSkyOpen({focus:null});return}
      if(k==='master'){enterMaster();return}
      if(k==='arcade'){enterArcade();return}
      g.say('여기는 지금 문을 닫았어. 사건 조사는 집 책상에서 해')}
  // walking to a door: in once I am there (checked a few times a second), unless the walk went somewhere else meanwhile
  useEffect(()=>{const t=setInterval(()=>{const pd=pendingDoor.current;if(!pd)return;if(goTo&&goTo.at!==pd.at){pendingDoor.current=null;return}
    const door=DOOR_OF[pd.k],w=place(door).walk,me=meNow();if(Math.hypot(me.x-w.x,me.z-w.z)<0.8){pendingDoor.current=null;landmarkNow(pd.k)}},150);return()=>clearInterval(t)});

  // 보리 came over to talk: its line is the only bubble until it is answered
  const boriLine=friendHere&&friendDay!==clock.today&&boriCame?.text?{id:FRIEND.id,text:boriCame.text,alert:true}:null;
  const bubbles:{id:string;text:string;alert:boolean}[]=boriLine?[boriLine]:[...(friendHere&&friendDay!==clock.today?[{id:FRIEND.id,text:opener.short,alert:false}]:[]),
    ...world.analysts.flatMap(a=>a.bubble?[{id:a.id,...a.bubble}]:[])].filter(b=>b.id===FRIEND.id);
  // the bubbles hold still while the tutorial points at one
  const heldTurn=useRef(0);if(!tutOn)heldTurn.current=turn;
  const bubbleNow=bubbles.length?[bubbles[heldTurn.current%bubbles.length]]:[];
  const h=holdings.find(t=>t.id===picked);
  const st=h&&treeState(h,defaultRules);
  const rc=useMemo(()=>h?recheckCard(h,holdings,clock.today):null,[h,holdings,clock.today]);
  const cd=h?openFor(s.cooldowns,h.id):null;
  // the coins, the coin calendar and the settings at the top right: the village's, and the same in 거장의 집 (피드백 2026-11-24)
  const topRight=(<div className="rt-top-right">
          {/* coins always in sight (2026-11-16 feedback); a tap opens 넓히기, where they are spent */}
          {!me&&<button type="button" className="rt-coins rt-num" aria-label={`코인 ${won(s.currency)} · 충전`} onClick={()=>{setPicked(null);setSheet({kind:'coinpay'})}}>{/* 피드백 2026-11-24 "돈을 누르면 결제창": the coins open the payment window, not the shop */}<Coin/><span className="rt-coins-full">{wonShort(s.currency)}</span><span className="rt-coins-short">{wonCompact(s.currency)}</span></button>}
          {/* 피드백 2026-11-23: beside the coins, the calendar of what came in each day (and from it, the payment window) */}
          {!me&&<button type="button" className="rt-me-chip rt-coin-cal" aria-label="코인 달력" onClick={()=>{setPicked(null);setSheet({kind:'coincal'})}}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><rect x="3.5" y="5" width="17" height="15" rx="3" fill="#fffaf0" stroke="#22281f" strokeWidth="1.6"/><path d="M3.5 9.5h17" stroke="#22281f" strokeWidth="1.6"/><rect x="3.5" y="5" width="17" height="4.5" rx="2" fill="#c2463a"/><path d="M8 3.5v3M16 3.5v3" stroke="#22281f" strokeWidth="1.6" strokeLinecap="round"/><text x="12" y="17.6" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#22281f">{Number(clock.today.slice(8))}</text></svg></button>}
          {/* 설계 7장: account, sound, text size and motion live behind the small corner button */}
          <button type="button" className="rt-me-chip vl-gear" aria-label="설정" onClick={()=>{setPicked(null);setSheet({kind:'settings'})}}>⚙</button></div>);
  // 피드백 2026-11-24 "X 누르면 대화창 말고 아무 창도 안 뜨게": closing a sheet also ends the talk that opened it
  const close=()=>{setSheet(null);setFocus(null);setVt(null)};
  // 설계 6장: a tree opens my notebook at its stock, the camera close on that tree (the tree and its name stay above the book)
  // e2e: talk to a friend as a tap on it would (the 3D figures move about the village)
  useEffect(()=>{const w=window as unknown as {__proto3d?:{talkTo?:(id:string)=>void}};(w.__proto3d??={}).talkTo=id=>world.onAnalyst(id as AnalystId)});
  // e2e: open a tree's card as a tap on it would (core/recheck.ts card)
  useEffect(()=>{const w=window as unknown as {__proto3d?:{pickTree?:(id:number)=>void}};(w.__proto3d??={}).pickTree=id=>setPicked(id)});
  // e2e only: the old 더보기 list (케이스, 되감기, 리그, 서랍, …) has no door in the new village yet, so its tests open
  // those as the old dock did and keep checking the sheet itself. `more` takes a MoreId (ui/Home.tsx), `open` a sheet,
  // `pick` opens the tree card as a tap on it would
  useEffect(()=>{const w=window as unknown as {__proto3d?:{open?:(sh:SheetState)=>void;more?:(id:string)=>void;pick?:(id:number)=>void}};const hk=(w.__proto3d??={});
    hk.open=sh=>{setPicked(null);setSheet(sh)};hk.more=id=>{setPicked(null);pickMore(id as MoreId)};hk.pick=id=>{setSheet(null);setPicked(id)}});
  // 9-5: the player walks over beside the tree, the camera goes to it, and that stock's notebook opens there
  const openTree=(id:number)=>{const hh=holdings.find(x=>x.id===id)??vtrees.find(x=>x.id===id);if(!hh)return;setPicked(null);setFocus(id);
    const w=(window as unknown as {__proto3d?:{player?:{x:number;z:number};treeAt?:Record<number,{x:number;z:number}>}}).__proto3d,t=w?.treeAt?.[id],me=w?.player;
    if(t){const dx=(me?.x??t.x)-t.x,dz=(me?.z??t.z+1)-t.z,d=Math.hypot(dx,dz)||1;setGoTo({x:t.x+dx/d*1.3,z:t.z+dz/d*1.3,at:Date.now()})}
    // 유저 워크플로우 3장: a tree opens its stock's status, read only (the journal is the library's)
    setSheet({kind:'tree',id})};
  // today's request (feedback 2026-11-19): it arrives in the garden; untouched today → a notice above the dock and a 1
  const qDay=kstDay(clock.now),qToday=localToday(s.observatory?.runs??[],qDay),qWaiting=!qToday.done&&!qToday.open&&!(s.observatory?.runs??[]).some(r=>r.day===qDay&&r.finishedAt!==null&&r.mode==='ranked');
  const qNotice=qWaiting&&s.onboarded&&s.observatory?.noticed!==qDay;
  // the notice sits just above the next-task card (its height changes with its text), never on top of it
  // the same moments as the next-task card: not inside the house, not while building, not over a capsule or a jump
  const showReq=ready&&!quiet&&!walkOn&&qNotice&&!sheet&&!picked&&!inside&&!capFx&&!jump&&!buildMode&&h===undefined,[reqBottom,setReqBottom]=useState<number|null>(null);
  useEffect(()=>{if(!showReq)return;
    const f=()=>{const host=document.querySelector('.proto3d'),n=host?.querySelector('.rt-next');
      if(!host||!n){setReqBottom(null);return}const hr=host.getBoundingClientRect(),r=n.getBoundingClientRect();
      // landscape: the card sits left of the centre column, so the notice keeps its own place
      setReqBottom(r.right<hr.left+hr.width/2-40?null:Math.round(hr.bottom-r.top+10))};
    f();const t=setTimeout(f,450);window.addEventListener('resize',f);return()=>{clearTimeout(t);window.removeEventListener('resize',f)}},[showReq,next.kind]);
  const openRequest=()=>{g.ops.questNoticed(qDay);if(syncOn){setPicked(null);setSheet({kind:'game'});return}const id=g.ops.questOpen();if(id)enterQuest(id)};
  const dock:['garden'|'journal'|'game'|'more',string,typeof Ledger,number][]=[
    ['garden','정원',Sprout,0],['journal','일지',Ledger,g.due.length+open.length+toReview],['game','관측소',Scope,qWaiting?1:0],['more','더보기',More,caseDone?0:1]];
  const pickMore=(id:MoreId)=>{if(id==='build'){setSheet(null);setPicked(null);setBuildMode(true);return}if(id==='cities'){setSheet({kind:'cities'});return}
    if(id==='me'){setSheet(null);setMe(true)}else if(id==='sky'){setSheet(null);setSkyOpen({focus:null})}
    else setSheet(id==='holdings'?{kind:'onboard'}:id==='shop'?{kind:'cart'}:{kind:id})};
  const decideCooldown=()=>{if(!cd||!h)return;const waited=g.ops.finishCooldown(cd.id);if(waited)g.say(UI.cooldownBloom);setEarly(false);setPicked(null);setSheet({kind:'brief',start:{holdingId:h.id}})};

  return (
    <div className={`proto3d${ready&&!quiet?"":" no-dock"}`} data-testid="proto3d" data-place={where} data-shop={shop??undefined} data-weather={weather} onPointerDownCapture={unlock} onClickCapture={e=>{if((e.target as HTMLElement).closest('button'))cue('ui-button')}}
      data-night={light.night>0.5} style={{background:`linear-gradient(180deg,${sky('top')} 0%,${sky('mid')} 38%,${sky('bottom')} 100%)`}}>
      {light.night>0.05&&<div className="proto3d-stars" aria-hidden style={{opacity:light.night}}/>}
      {glowSky>0.05&&!skyOpen&&<div className={`proto3d-horizon ${dawn?'dawn':'dusk'}`} aria-hidden style={{opacity:Math.min(1,glowSky*1.3)}}><i/><b/><b/><b/></div>}
      {w&&<Canvas frameloop={((expedition||quest)&&!wide)||where!=='village'?'never':'always'} shadows="soft" dpr={[1,1.5]} gl={{antialias:false,alpha:true,powerPreference:'high-performance'}}
        camera={{fov:46,near:0.5,far:120,position:[0,21,14.5]}}>
        <Scene3D holdings={shown} picked={picked} onPick={id=>{if(id===null){setPicked(null);return}openTree(id)}} recenter={recenter} weather={weather} world={world}/>
        <Peek/>
      </Canvas>}
      <div className="proto3d-sun" aria-hidden hidden={!!skyOpen}
        style={{width:LOOK.sunGlow.size,height:LOOK.sunGlow.size,opacity:wl.glow*light.day,
          background:`radial-gradient(circle at center,${LOOK.sunGlow.color} 0%,${LOOK.sunGlow.color}88 22%,transparent 62%)`}}/>

      {/* in the arcade its own top bar carries the coins (ui/Arcade.tsx), and nothing covers the game */}
      <div className="proto3d-top" style={where==='arcade'?{display:'none'}:undefined}>
        <div className="rt-top-left">
        {/* today's market as weather, top left (restored 2026-11-20: the PM never asked for it to go) */}
        {w&&where==='village'&&(!expedition||wide)&&!quest&&!skyOpen&&!welcome&&!me&&<div className="rt-weather" aria-label="오늘 시장 날씨">
          {(()=>{const game=expedition&&gameMarket!==null,v=game?gameMarket!:lapseMarket?.index??w.index,asOf=game?undefined:lapseMarket?lapseMarket.asOf:w.asOf,today=isoDay();
            return <>
          {/* 피드백 2026-11-25 "필요한 것만": which close, and the index move. The sky already shows the mood. */}
          <span className="rt-weather-k">{game?'그날':lapseMarket?(asOf?closeWord(asOf,today):'그날 · 예시'):asOf?closeWord(asOf,today):'예시 숫자'}</span>
          <span className="rt-num">코스닥 {(v>0?'+':'')+v.toFixed(2)}%</span></>})()}
        </div>}
        {/* today's quests under the weather (feedback 2026-11-20); a line goes to it, the title opens the board */}
        {where==='village'&&ready&&!walkOn&&!quiet&&!expedition&&!inside&&!welcome&&<div className="rt-quests" role="group" aria-label="오늘 퀘스트">
          <button type="button" className="rt-quests-h" aria-expanded={!questsFolded} onClick={toggleQuests}>
            <span>오늘 퀘스트 <b className="rt-num">{tasksDone}/{tasks.length}</b></span><i aria-hidden className="rt-quests-fold">{questsFolded?'▾':'▴'}</i>
            <span className="rt-sr">{questsFolded?'펼치기':'접기'}</span></button>
          {!questsFolded&&tasks.map(t=><button key={t.id} type="button" className="rt-quest" data-done={t.done} disabled={t.done} onClick={()=>goTask(t.id)}>
            <i aria-hidden>{t.done?'✓':''}</i>{QUEST_LABEL[t.id]}</button>)}
        </div>}
        </div>
        {/* the top holds the weather, my coins and me; my numbers, sound and tilt live in 더보기 and 설정 */}
        {ready&&!quiet&&topRight}
      </div>
      {ready&&!h&&!quiet&&!inside&&!shop&&!sheet&&!capFx&&!me&&<Signs built={built}/>}
      {where==='village'&&<HoverTip tree={hoverTree} off={!!sheet||inside}/>}
      {ready&&!quiet&&!inside&&!sheet&&!capFx&&!planting&&!placing&&where==='village'&&<TreeTags items={shown.map(x=>({id:x.id,name:x.name,virtual:x.virtual}))} onPick={openTree}/>}
      {jump&&<div className="rt-jump" role="status">{UI.jump}</div>}
      {!h&&!quiet&&!inside&&!tourShow&&!buildMode&&!me&&!skyOpen&&!planting&&!placing&&<Bubbles items={bubbleNow} onPick={id=>id===FRIEND.id?talkFriend():world.onAnalyst(id as AnalystId)}/>}
      {!ready&&!sheet&&<button type="button" className="rt-banner" onClick={()=>setSheet({kind:'onboard'})}><span>정원이 비어 있어</span><b>내 종목 넣기</b></button>}
      
      {walkOn&&where==='village'&&meet!==null&&!vt&&!sheet&&!calm&&!me&&<WalkGuide who={meetName(MEET[meet])} what="빛이 비치는 길을 따라 걸어가 봐. 가까이 가면 인사해." n={meet+1} total={MEET.length}/>}
      {walkOn&&where==='village'&&walkStep&&walkStep!=='square'&&!vt&&!sheet&&!calm&&!me&&STEP_GOAL[walkStep]&&<WalkGuide who={STEP_GOAL[walkStep].who} what={STEP_GOAL[walkStep].what} n={walk.step} total={WALK_STEPS.length-1}/>}
      {where==='village'&&ready&&!quiet&&!inside&&!shop&&!sheet&&!vtTalk&&!planting&&!placing&&<VillagerTags items={[...[...OUTSIDE,...VILLAGERS.filter(v=>isShop(v.id))].map(v=>({id:v.id,name:v.name,hl:meet!==null?MEET[meet]===v.id:!!walkStep&&PERSON_OF[walkStep]===v.id,note:v.id==='merchant'&&!merchantOpen?nextOpenLabel(minutes)+'에 와요':null})),{id:'naru',name:'나루',hl:meet!==null?MEET[meet]==='naru':walkStep==='fisher',note:null},{id:'luon',name:'루온',hl:false,note:null}]} onPick={id=>id==='naru'?naruPick():id==='luon'?debate():onVillager(id as VillagerId)}/>}
      {/* 피드백 2026-11-23: in a shop with no talk open: talk to the keeper again, or go back out */}
      {shop&&!vtTalk&&!sheet&&!me&&!fading&&<div className="vl-shop-acts">
        <button type="button" className="rt-btn primary" onClick={()=>onVillager(shop)}>{VILLAGERS.find(v=>v.id===shop)?.name}에게 말 걸기</button>
        <button type="button" className="rt-btn" onClick={()=>{setVt(null);swapShop(null)}}>밖으로 나가기</button></div>}
      {vtTalk&&where==='village'&&<VillagerTalk key={(vt?.id??'')+(vt?.stage??'')} name={vtTalk.name} who={vt?.id==='bori'||!merchantOpen&&vt?.id==='merchant'&&vt?.stage!=='meet'?'bori':vt?.id} role={ROLE[vt?.id==='bori'||!merchantOpen&&vt?.id==='merchant'&&vt?.stage!=='meet'?'bori':vt?.id??'']} line={vtTalk.line} choices={vtTalk.choices} onLeave={walkOn?undefined:talkOver}/>}
      {sheet?.kind==='tree'&&(()=>{const hh=[...holdings,...vtrees].find(x=>x.id===sheet.id);if(!hh)return null;const lot=hh.virtual?(s.virtual??[]).find(l=>VIRTUAL_ID+l.id===hh.id):null;
        const q=lot?lotQuote(lot,clock.today):hh.code?quote(hh.code,clock.today):null;
        return <TreeStatus h={hh} price={q?.price??null} onClose={close}/>})()}
      {sheet?.kind==='comm'&&<Comm key={sheet.tab??'balance'} start={sheet.tab} acct={commAccount(holdings,s.virtual??[],s.currency,clock.today,id=>VIRTUAL_ID+id)} cands={todays}
        lots={(s.virtual??[]).map(l=>{const q=lotQuote(l,clock.today);return {id:l.id,name:l.name,qty:l.qty,price:q?.price??null,rate:q?Math.round((q.price/l.cost-1)*1000)/10:null}})}
        day={clock.today} room={commRoom} open={true/* 피드백 2026-11-26: orders any time; they settle at the next close either way */} openNote={`상인이 ${nextOpenLabel(minutes)}에 와요. 주문은 상인이 있는 동안(8시~20시)만 돼요.`}
        onBuy={commBuy} onSell={commSell} onTree={id=>{setSheet(null);openTree(id)}} onClose={close} missions={missions} onClaim={claim} onRead={()=>{setFlag('read');didIt('news')}} onChart={()=>didIt('chart')} weekly={weekly} onWeekly={claimWeek}/>}
      {sheet?.kind==='harvest'&&<Harvest today={clock.today} cart={s.cart??[]} onClose={close}
        lots={(s.virtual??[]).map(l=>({id:l.id,name:l.name,qty:l.qty,price:lotQuote(l,clock.today)?.price??null}))}
        onLoad={commSell}/>}
      {sheet?.kind==='news'&&<NewsBoard day={clock.today} onClose={close}
        stocks={[...realShown.map(h=>({code:codeOf(h),name:h.name})),...(s.virtual??[]).map(l=>({code:l.code,name:l.name}))].filter((x,i,a)=>a.findIndex(y=>y.code===x.code)===i)}/>}
      {tourShow&&<Tour step={tourStep} n={tourN} total={tour.length} onNext={tourNext} onAct={tourAct} onSkip={()=>{g.ops.tipDone('tour');setTourN(0)}}/>}
      {tutOn&&<Tutorial trees={holdings.map(x=>x.id)}onDone={then=>{g.ops.tipDone('tutorial');setTutAgain(false);if(then)setSheet({kind:'journal'})}}/>}
      {inside&&!sheet&&!roomTour&&<RoomTags items={[{k:'room-desk',text:'선생님 · 지난 퀴즈',onClick:()=>setSheet({kind:'quizlog'})},
        {k:'room-shelf',text:'사서 · 투자일지',onClick:()=>setSheet({kind:'journal'})},
        // 피드백 2026-11-26 "채점 대기 0이 뭐야": the board holds judgments waiting for their 30·90-day grade; with none it is
        // just the wall's cork board (no tag)
        ...(g.due.length||capsules.length?[{k:'room-board',text:g.due.length?`채점 완료 ${g.due.length}`:`채점 기다리는 판단 ${capsules.length}`,alert:g.due.length>0,onClick:()=>g.due.length?setSheet({kind:'grades'}):g.say(line(UI.boardWait,{n:capsules.length}))}]:[]),
        {k:'room-door',text:'밖으로',onClick:()=>swapRoom(false)}]}/>}
      {inside&&!sheet&&!roomTour&&<button type="button" className="rt-btn rt-exit" onClick={()=>swapRoom(false)}>밖으로 나가기</button>}
      {/* 피드백 2026-11-22: the first time back in, the teacher and the librarian say what they do in here */}
      {inside&&!sheet&&roomTour&&<VillagerTalk key={'room'+roomTour} name={roomTour===1?'선생님':'사서'} who={roomTour===1?'teacher':'librarian'} role={ROLE[roomTour===1?'teacher':'librarian']}
        line={ROOM_TOUR[roomTour-1]} choices={[roomTour===1?{label:'다음',go:()=>setRoomTour(2)}:{label:'알겠어',go:()=>{setRoomTour(0);g.ops.tipDone('room')}}]}/>}
      {sheet?.kind==='quizlog'&&<QuizReview onClose={close} onQuiz={()=>{setSheet(null);setInside(false);enterHouse()}}/>}
      {fading&&<div className="rt-room-fade" aria-hidden/>}
      {tip&&<Tip text={tipText(tip)} target={TIP_AT[tip].target} point={TIP_AT[tip].point} onDone={()=>g.ops.tipDone(tip)}/>}
      {skyOpen&&!sheet&&<SkyView planets={skyPlanets} sample={neighbours.sample} share={share} focus={skyOpen.focus} week={weekStart(clock.today)} onPick={id=>setSkyOpen({focus:id})}
        onShare={v=>g.ops.setSettings({...s.settings,share:v})} onClose={()=>setSkyOpen(null)} onLeague={()=>setSheet({kind:'league'})}/>}
      {me&&!sheet&&<MyPage wearOnly g={g} onClose={()=>setMe(false)} onRecords={()=>setSheet({kind:'records'})} onSettings={()=>setSheet({kind:'settings'})} onLetter={()=>setSheet({kind:'letter',month:monthOf(clock.today)})}/>}
      {sheet?.kind==='settings'&&<SettingsSheet g={g} onClose={close} tilt={tiltCtl} account={account?.email??null}
        onLogOut={account?()=>{void authRepo.logOut();setAccount(null);setSheet(null)}:undefined}
        onDelete={syncOn&&saveRepo?async()=>{const e=await saveRepo!.deleteMe();if(e)return e;try{localStorage.removeItem('rethink-account-v1');localStorage.removeItem('rethink-guest')}catch{/* nothing kept */}g.ops.wipe();return null}:undefined}
        onWipe={synced&&saveRepo?()=>{void saveRepo!.push({v:1,holdings:null,judgments:[]}).finally(()=>g.ops.wipe())}:undefined} onTutorial={()=>{setSheet(null);setPicked(null);/* 피드백 2026-11-25: the tutorial is 보리's first walk; it starts again from the square (nothing given twice) */putWalk(w=>({...WALK0,planted:w.planted,freeTree:w.freeTree,firstBuy:w.firstBuy}));g.ops.tipUndo('tour');if(where!=='village'){setWhere('village');setRecenter(n=>n+1)}}}/>}
      {sheet?.kind==='journal'&&<JigiBook onOpened={(id,h)=>g.ops.journalOpened(id,h)} key={(sheet.openId??sheet.stock??'book')+(sheet.stats?':stats':'')} startStock={sheet.stock} stockName={sheet.stock?holdings.find(x=>codeOf(x)===sheet.stock)?.name??null:null} openId={sheet.openId} startTab={sheet.stats?'stats':'book'} ai={syncOn?jigiAI:null} journals={journals} today={clock.today} now={clock.now} oldCount={s.judgments.length} onClose={close}
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
      {sheet?.kind==='coincal'&&<CoinCalendar log={s.coinLog} today={clock.today} coins={s.currency} onClose={close} onPay={()=>setSheet({kind:'coinpay'})}/>}
      {sheet?.kind==='coinpay'&&<CoinPay coins={s.currency} onClose={close}/>}
      {sheet?.kind==='cities'&&<CityBook built={built} coins={s.currency} onClose={close} onOpen={id=>{if(g.ops.build({kind:'city',id})){setSheet(null);setBuildMode(false);
        const c=CITY_SPOT(id);if(c)setView({x:c[0],z:c[1],y:3.2,az:Math.atan2(-c[0],-c[1])})}}}/>}
      {buildMode&&ready&&!quiet&&!inside&&!sheet&&<><BuildBar coins={s.currency} onCities={()=>setSheet({kind:'cities'})} onDone={()=>{setBuildMode(false);setWant(null)}}/>
        {!want&&<BuildTags built={built} coins={s.currency} onPick={setWant}/>}
        {want&&<BuildConfirm want={want} coins={s.currency} onNo={()=>setWant(null)} onYes={()=>{const w=want;if(w.kind==='building'){setWant(null);setBuildMode(false);setPicked(null);setPlacing({id:w.id});return}if(g.ops.build(w)){const at=w.kind==='land'?LANDS.find(l=>l.id===w.id)?.at:BUILDINGS.find(b=>b.id===w.id)?.at;if(at)setView({x:at[0],z:at[1],y:1.2})}setWant(null)}}/>}</>}
      {sheet?.kind==='write'&&(()=>{const j=journals.find(x=>x.id===sheet.id);if(!j)return null;
        const marks=liveJournals(journals).filter(x=>x.stock&&x.stock.code===j.stock?.code&&x.anchor).map(x=>({id:x.id,date:x.anchor!.date,price:x.anchor!.close}));
        return <JigiWrite key={j.id} ai={syncOn?jigiAI:null} j={j} today={clock.today} marks={marks} tasks={(s.jigi?.tasks??[]).filter(t=>!t.done)} edit={fn=>g.ops.journalEdit(j.id,fn)} onClose={()=>setSheet({kind:'journal'})} onSaved={()=>{setSheet({kind:'journal',stats:true})}}
          onSave={()=>{const r=g.ops.journalSave(j.id);if(!r)return {missing:[]};return r.ok?{version:r.version}:{missing:r.missing}}}/>})()}
      {sheet?.kind==='more'&&<MoreSheet currency={s.currency} streak={shownCount(s.streak,clock.today)} week={weekPoints(s.graded,s.cases,clock.today,weekWorkOf(s,clock.today))}
        dots={{case:!caseDone,rewind:paidLeft(s.rewinds,clock.today)>0}} onPick={pickMore} onClose={close}/>}
      {sheet?.kind==='letter'&&<LetterSheet letter={letterFor(sheet.month)} onClose={()=>{g.ops.letterRead(sheet.month);close()}}/>}
      {ready&&!quiet&&!inside&&<button type="button" className="proto3d-locate proto3d-map" data-label="지도" aria-label="지도" onClick={()=>{setPicked(null);setSheet({kind:'map'})}}><MapIcon size={20}/></button>}
      {ready&&!quiet&&!inside&&<button type="button" className="proto3d-locate proto3d-view" data-label="시점" aria-label={fp?'3인칭으로 보기':'1인칭으로 보기'} aria-pressed={fp} onClick={()=>{setPicked(null);toggleFp()}}><span className="rt-view-label">{fp?'3인칭':'1인칭'}</span></button>}

      {/* 설계 6·7장: the four tabs are gone; a small notebook button opens my journal where I stand (the stock index first) */}
      {ready&&!quiet&&!inside&&where==='village'&&!sheet&&<button type="button" className="proto3d-locate vl-book" data-label="수첩" aria-label="수첩 펼치기" onClick={()=>{setPicked(null);setSheet({kind:'journal'})}}><Ledger size={20}/></button>}
      {/* 통신기 (ui/Comm.tsx): once the merchant has handed it over, a button on the screen opens the practice-account MTS */}
      {ready&&!quiet&&!inside&&where==='village'&&!sheet&&<button type="button" className="proto3d-locate vl-comm" data-label="통신기" aria-label="통신기" onClick={()=>{setPicked(null);setSheet({kind:'comm',tab:'balance'})}}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 7l2 2 2-3M11 17h2"/></svg></button>}
      {pet&&<div className="rt-petmenu" role="dialog" aria-label={`${PETS[pet].name}와 놀기`}>
        <b>{PETS[pet].kind==='cat'?'🐱':'🐶'} {PETS[pet].name}</b><small>하루 한 번씩 돌봐 주면 코인을 조금 받아요</small>
        <div><button type="button" className="rt-btn primary" onClick={()=>petDo('pet')}>쓰다듬기</button>
          <button type="button" className="rt-btn primary" onClick={()=>petDo('treat')}>{PETS[pet].treat}</button>
          <button type="button" className="rt-btn" aria-label="닫기" onClick={()=>setPet(null)}>✕</button></div></div>}
      {showReq&&<div className="rt-request" role="status" data-testid="request-notice" style={reqBottom!=null?{bottom:reqBottom}:undefined}>
        <button type="button" className="rt-request-go" onClick={openRequest}><Scope size={18}/><span><b>오늘의 관측 의뢰가 도착했어</b><small>눌러서 열기</small></span></button>
        <button type="button" className="rt-request-x" aria-label="알림 닫기" onClick={()=>g.ops.questNoticed(qDay)}><Cross size={16}/></button></div>}

      {h&&st&&!sheet&&(
        <section role="dialog" aria-label={`${h.name} 나무`} className="proto3d-card">
          <div>
            <h2>{h.name}</h2>
            {/* 처분효과 (멘토링 1.7, content/recheck.ts): worth now and its share first, the days held last and small */}
            <p>평가 <span className="rt-num">{won(rc!.worth)}</span> · 정원의 <span className="rt-num">{rc!.weight}%</span></p>
            <small className="rt-num">수익률 {h.rate>0?'+':''}{h.rate}% · 산 지 {st.days}일</small>
          </div>
          <button type="button" aria-label="닫기" onClick={()=>setPicked(null)}><Cross size={18}/></button>
          <div className="rt-recheck" role="group" aria-label="다시 보기">
            <p>{rc!.ask}</p>
            {rc!.views&&<p className="rt-recheck-views">{rc!.views.book&&<span>기업 체력 <b>{rc!.views.book}</b></span>}{rc!.views.path&&<span>주가 흐름 <b>{rc!.views.path}</b></span>}{rc!.views.split&&<em>엇갈림</em>}</p>}
            <p className="rt-recheck-note">{rc!.note}</p>
          </div>
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

      {/* over the hand-off's white panel (rt-bridge z 25), so the question sits on the broker's list */}
      {sheet?.kind==='dates'&&mtsIn&&<div style={{position:'relative',zIndex:30}}><BuyDates lines={needsDate(mtsIn.holdings,s.buyDates??{})} today={clock.today} broker={mtsIn.broker}
        onDone={days=>{g.ops.setBuyDates(days);goMts(mtsIn,{...s.buyDates,...days})}}/></div>}
      {bridge&&<EmbedBridge lines={bridge.input?.holdings??null} broker={bridge.input?.broker} focus={bridge.input?.focus} badges={bridgeBadges}
        lift={bridge.lift} onShown={bridgeShown} onGone={()=>setBridge(null)}/>}
      {sheet?.kind==='brief'&&<Briefing key={JSON.stringify(sheet.start)} g={g} signals={signals} holdings={holdings} start={sheet.start} onClose={close}
        onDeep={id=>openDeep(id,{kind:'brief',start:{holdingId:id}})} onBury={id=>bury(id)} onWrite={(id,sig)=>writeNew({holdingId:id,signalId:sig})}/>}
      {sheet?.kind==='deep'&&(()=>{const hh=holdings.find(x=>x.id===sheet.holdingId);const back=sheet.back;
        return hh&&<DeepSheet holding={hh} health={healthProvider.of(hh,signals.find(x=>x.holdingId===hh.id)??null)} row={rowFor(hh)} onClose={()=>closeDeep(back)}/>})()}
      {sheet?.kind==='grades'&&<Grades g={g} onClose={close} start={'start' in sheet?sheet.start:undefined} onDig={dig} onStamp={(holdingId,hit)=>setBurst({holdingId,hit,stamp:Date.now()})} onFocus={setFocus} onRewind={()=>setSheet({kind:'rewind'})}/>}
      {sheet?.kind==='rewind'&&<RewindView g={g} onClose={close}/>}
      {sheet?.kind==='today'&&<TodaySheet g={g} tasks={tasks} onGo={goTask} onClose={close}/>}
      {sheet?.kind==='case'&&<CaseView g={g} c={caseDone?CASES.find(c=>c.id===answeredToday(s.cases,clock.today)!.caseId)??todayCase:todayCase} onClose={close}/>}
      {sheet?.kind==='real'&&!welcome&&realPrices&&<RealEntry g={g} prices={realPrices} onClose={close}
        onPlanted={(ids,first)=>{setPricesAt(Date.now());firstIn(ids,first)}}/>}
      {sheet?.kind==='intro'&&!welcome&&<Intro onCapture={()=>setSheet({kind:'onboard',pick:true})} onOther={()=>setSheet({kind:'onboard'})}/>}
      {sheet?.kind==='onboard'&&!welcome&&<Onboarding g={g} pick={!!sheet.pick} onClose={close} reader={syncOn?readCapture:null} real={realPrices} onReal={null}
        onPlanted={firstIn}
        onDemo={()=>{setSheet(null);if(walkAllowed){enterHouse();return}startBirth(DEMO_HOLDINGS.map(x=>x.id),s.seen.birth===0,afterFirst)}}/>}
      {birth&&<BirthCards birth={birth} holdings={[...holdings,...vtrees]} onSkip={skipBirth}/>}
      {sheet?.kind==='lookback'&&lookSig&&lookHolding&&<LookBack g={g} sig={lookSig} holding={lookHolding} onJudged={lookJudged} onClose={close}/>}
      {sheet?.kind==='records'&&<Records g={g} onClose={close} onHoldings={()=>setSheet({kind:'onboard'})} onLapse={()=>{setSheet(null);setPicked(null);setLapse({i:0,playing:true})}}/>}
      {lapse&&<TimelapseBar i={lapse.i} n={frames.length} day={lapseDay} back={lapseBack} playing={lapse.playing}
        onSeek={i=>setLapse({i,playing:false})} onPlay={()=>setLapse(l=>l&&{i:l.playing||l.i<frames.length-1?l.i:0,playing:!l.playing})} onClose={()=>setLapse(null)}/>}
      {sheet?.kind==='league'&&<League g={g} onClose={close}/>}
      {sheet?.kind==='map'&&<MapSheet me={(window as unknown as {__proto3d?:{player?:{x:number;z:number}}}).__proto3d?.player??{x:0,z:0}} onGo={goPlace} onSpot={id=>{close();onVillager(id as VillagerId)}} onClose={close}/>}
      {sheet?.kind==='library'&&<LibrarySheet caseDone={caseDone} rewindLeft={paidLeft(s.rewinds,clock.today)} onCase={()=>setSheet({kind:'case'})} onRewind={()=>setSheet({kind:'rewind'})} onClose={close}/>}
      {sheet?.kind==='game'&&<ObservatoryDoor g={g} onPlay={enterQuest} onClose={close} server={syncOn?observatoryServer:null}/>}
      {quest&&<DailyQuest g={g} runId={quest} onClose={()=>leaveQuest(true)} server={syncOn?observatoryServer:null}/>}
      {expedition&&<Expedition packId={expedition.pack} today={clock.today} history={s.expeditions??[]} handle={s.name} onFinish={g.ops.finishExpedition} onClose={()=>leaveGame()}
        garden={open.map(x=>({holdingId:x.holdingId,name:holdings.find(h=>h.id===x.holdingId)?.name??'',model:x.model}))}
        onSimilar={id=>{leaveGame();setSheet({kind:'brief',start:{holdingId:id}})}} onMarket={setGameMarket}/>}
      {sheet?.kind==='stocks'&&<VirtualShop coins={s.currency} lots={s.virtual??[]} today={clock.today} focus={sheet.focus??null} onClose={close}
        room={fieldPlots(s.built?.land??[],'orchard').filter(i=>!holdings.some(h=>h.plot===i)&&!(s.virtual??[]).some(l=>l.plot===i)).length}
        onBuy={(code,n)=>{const r=g.ops.buyVirtual(code,n);if(r.ok){cue('capsule-mark');return null}return r.why==='coins'?`코인이 ${won(r.need??0)} 모자라요`:r.why==='room'?'과수원에 빈 자리가 없어요':'지금은 살 수 없어요'}}
        onSell={(id,n)=>{const gain=g.ops.sellVirtual(id,n);if(gain!==null)cue(gain>=0?'grade-hit':'grade-miss')}}/>}
      {sheet?.kind==='cart'&&<FlowerShop coins={s.currency} plants={s.plants??[]} onClose={close} onGoods={()=>setSheet({kind:'goods'})}
        onRemove={id=>g.ops.unplant(id)} onPick={id=>{setSheet(null);setPicked(null);setPlacing(null);setVt(null);if(shop){swapShop(null);setTimeout(()=>setPlanting({item:id}),TIMING.roomFade+120)}else setPlanting({item:id})}}
        built={built} onBuilding={id=>{setSheet(null);setPicked(null);setPlanting(null);setVt(null);if(shop){swapShop(null);setTimeout(()=>setPlacing({id}),TIMING.roomFade+120)}else setPlacing({id})}}/>}
      {sheet?.kind==='goods'&&<CartView g={g} onClose={()=>setSheet({kind:'cart'})}/>}
      {fish==='talk'&&!sheet&&<NaruTalk intro={walkOn&&walkStep==='fisher'&&!introduced.includes('naru')} left={castsLeft(s.fishing,clock.today,master)} onFish={()=>setFish('play')} onLog={()=>setFish('log')} onClose={()=>setFish(null)}/>}
      {fish==='play'&&!sheet&&<FishingPlay left={castsLeft(s.fishing,clock.today,master)} onCast={()=>g.ops.fishCast()} onPhase={setBob} onLog={()=>setFish('log')} onClose={()=>setFish(null)}
        onLand={(id,size)=>{const r=land(s.fishing,id,size);g.ops.fishLand(id,size);cue('capsule-mark');return {coins:r.coins,first:r.first,best:r.best}}}/>}
      {fish==='log'&&!sheet&&<FishLog fishing={s.fishing} onClose={()=>setFish(null)}/>}
      {placing&&!sheet&&<div className="rt-plant-bar" role="status"><span>{BUILDINGS.find(b=>b.id===placing.id)?.name} 놓을 자리를 눌러요 · 초록 동그라미면 놓을 수 있어요</span>
        <button type="button" onClick={()=>setPlacing(null)}>취소</button></div>}
      {planting&&!sheet&&<div className="rt-plant-bar" role="status"><span>{shopPlant(planting.item)?.name} 심을 풀밭을 눌러요</span>
        <button type="button" onClick={()=>setPlanting(null)}>취소</button></div>}
      {sheet?.kind==='friend'&&<FriendSheet opener={opener.text} topic={opener.topic} seed={clock.today} onClose={close}
        talk={(history,m)=>boriChat(history,m,syncOn?(_h,msg)=>boriTalk(boriHoldings,msg):null)} opening={boriTalks?boriOpening:null} onFace={setBoriFace}
        onGo={to=>{if(to==='case')setSheet({kind:'case'});else close()}} stocks={realFirst.map(x=>({id:x.id,name:x.name}))} onStock={openTree}/>}
      {sheet?.kind==='talk'&&(()=>{const w=VILLAGE_SPEAKERS[sheet.id];
        // 루온's 반박 runs on the team's model, which covers the KOSDAQ120 only (investment-evidence-system ops/live/stock_coverage.csv
        // = content/kosdaq120.ts): with the server on, only those holdings can be picked (2026-11-25: 한화에어로스페이스 was
        // sent, the worker failed with no company, and no note ever came back)
        const luonStocks=sheet.id==='luon'&&syncOn?realFirst.filter(x=>KOSDAQ_STOCKS.some(k=>k.code===codeOf(x))):realFirst;
        return <FriendSheet key={sheet.id} who={w} opener={sheet.id==='luon'?(luonStocks.length?'…어느 종목 얘기할래? 고르면 네 이유부터 들어 볼게.':(()=>{const out=realFirst.map(x=>x.name).filter(Boolean).slice(0,2);return out.length?`…${out.join(', ')}${realFirst.length>2?' 등':''}은 아직 반박 분석 목록(코스닥 120종목)에 없어. 그냥 얘기는 할 수 있어.`:'…반박 분석은 지금 코스닥 120종목만 할 수 있어. 그냥 얘기는 할 수 있어.'})()):w.greet[clock.today.length%w.greet.length]} topic="chat" seed={clock.today}
        talk={sheet.id==='luon'?(history,m)=>debateChat(history,m,testLuon?.__luonTalk?(_h,msg)=>testLuon.__luonTalk!(msg):syncOn?(_h,msg)=>boriTalk(boriHoldings,msg,'luon'):null):null}
        pickFirst={sheet.id==='luon'} onPickTalk={sheet.id==='luon'&&luonOn?luonPick:null}
        onClose={close} onGo={to=>{if(to==='case')setSheet({kind:'case'});else close()}} stocks={luonStocks.map(x=>({id:x.id,name:x.name}))} onStock={openTree}/>})()}
      {sheet?.kind==='drawer'&&<Drawer g={g} onClose={close} onCart={()=>setSheet({kind:'cart'})}/>}
      {sheet?.kind==='analyst'&&<AnalystCard g={g} id={sheet.id} signal={open.find(x=>x.analyst===sheet.id)??null} onClose={close}
        onBrief={()=>{const sig=open.find(x=>x.analyst===sheet.id);if(sig)setSheet({kind:'brief',start:{signalId:sig.id}})}}/>}
      {g.toast&&<div key={g.toast.id} className="rt-toast" role="status">{g.toast.text}</div>}
      {where==='arcade'&&<Arcade look={look} hud={topRight} onScore={arcadePay} onOut={()=>{setFading(true);cue('door');setTimeout(()=>{setWhere('village');setGoTo({...place('arcade').walk,at:Date.now()});setRecenter(n=>n+1);setTimeout(()=>setFading(false),80)},TIMING.roomFade)}}/>}
      {where==='master'&&<MasterStudy g={g} hud={topRight} onOut={()=>{setFading(true);cue('door');setTimeout(()=>{setWhere('village');setGoTo({...place('master').walk,at:Date.now()});setRecenter(n=>n+1);setTimeout(()=>setFading(false),80)},TIMING.roomFade)}}/>}
      {where==='house'&&!welcome&&<House lesson={walkAllowed&&!s.tips.includes('tour')} g={g} master={master} onSettings={()=>setSheet({kind:'settings'})}
        onOut={()=>{setSheet(null);setFading(true);cue('door');setTimeout(()=>{setWhere('village');setRecenter(n=>n+1);setTimeout(()=>setFading(false),80)},TIMING.roomFade)}}/>}
      {welcome&&<Welcome owing={owing} invite={needInvite} onInvited={()=>setInvited(true)} onAccount={(a,isNew)=>{setAccount(a);if(isNew||!s.name)g.ops.setName(a.nickname)}}
        onGuest={()=>{try{sessionStorage.setItem('rethink-guest','1')}catch{/* this page only */}setGuest(true)}}/>}
    </div>
  );
}
