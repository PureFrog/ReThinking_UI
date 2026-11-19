'use client';
// The 3D garden's save and every action on it. The rules live in app/core (judgment, cooldown, cases, streak, league,
// relationships); this file only wires them to one saved state and pays the currency and trust (app/core/ledger.ts).
// Saved in localStorage until the server (R5) takes it over through app/proto3d/server.ts.
//   ?ahead=N   look N days ahead (grades and cooldowns come due; demo and tests)
//   ?reset     start over (the onboarding asks for the holdings again)
//   ?demo      start over on the demo garden (seven made-up holdings and two old judgments; demos and tests)
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {markLocal} from './sync';
import {newJournal,saveJournal,purgeOld,type Journal,type Quick,type Hypo,type Reflection} from '../core/jigi/journal';
import {confirmHypo} from '../core/jigi/extract';
import {codeOf} from '../core/jigi/stocks';
import {lookbackJournal} from '../core/jigi/lookback';
import {workCount,weekWork,type StudyTask} from '../core/jigi/points';
import type {Task} from '../core/jigi/analysis';
import {spend,BUILT0,LANDS,BUILDINGS,CITIES,type Built,type Want} from '../core/land';
// process points (core/jigi/points.ts) for the titles and the league
export const workOf=(s:GardenSave)=>workCount(s.journals??[],s.jigi?.tasks??[]);
export const weekWorkOf=(s:GardenSave,day:string)=>weekWork(s.journals??[],s.jigi?.tasks??[],day);
const JIGI0={tasks:[] as StudyTask[],principles:[] as {text:string;at:number}[],typeNo:{} as Record<string,boolean>};
import {demoJournals} from '../core/jigi/seed';
import {record,grade,dueGrades,shiftDay,LOOKBACK,type Judgment,type Mark,type Graded,type Choice,type Confidence} from '../core/judgment';
import {startCooldown,finishCooldown,type Cooldown} from '../core/cooldown';
import {answerStreak,checkStreak,blankStreak,type Streak} from '../core/streak';
import {gain,blankRelation,type Relation} from '../core/relationships';
import type {CaseAnswer} from '../core/cases';
import {EARN,TRUST} from '../core/ledger';
import {playRewind,type RewindRound} from '../core/rewind';
import type {RewindCase} from '../content/rewind';
import {isoDay} from '../core/items';
import {outcomeProvider} from '../content/outcomes';
import {giftOf,itemById,rankItem,type GardenItem} from '../content/garden-items';
import {analystById,UI,line,type AnalystId} from '../content/analysts';
import {DEMO_HOLDINGS} from '../content/demo-garden';
import type {Holding} from '../core/model';
import {DEFAULT_LOOK,type Look} from '../core/wardrobe';
import type {RunRecord} from '../core/game/run';
import type {Share} from '../core/planets';
import {stampById,type StampId} from '../core/stamps';
import {activeRun,blankProgress,endPlay,packOfRun,playAfter,playAt,playBefore,type QuestDef,type DailyPack,decide as decideQuest,kstDay,setDraft,setPick,setStage,startRun,type DailyRun,type DecideError,type FieldKey,type Fields,type Fraction,type InvestorProgress,type Stage} from '../core/game/daily/model';
import {settle} from '../core/game/daily/settle';
import {completionGrants,newGrants,type Grant} from '../core/game/daily/rewards';
import {packById,packOfDay} from '../content/daily/packs';
import {SAMPLE_REQUEST} from '../content/daily/request';

export type Owned={uid:string;itemId:string;got:string;slot:string|null};
// settings (ui/Settings.tsx): effect volume, keeping still, text size, tilt
// share: what my garden shows in other players' skies (core/planets.ts); missing in old saves means the default
export type Settings={sfx:number;still:boolean;text:'m'|'l'|'xl';tilt:boolean;share?:Share};
export const DEFAULT_SETTINGS:Settings={sfx:0.7,still:false,text:'m',tilt:true,share:'hide'};
// seen: how many times each long scene was played (docs/brief-wow.md: long the first time, short after)
export type Seen={birth:number;cutaway:number;bury:number};
// name, look: the player's observer (ui/MyPage.tsx) · stamps: achievements and the day each was earned · wardrobe: pieces bought
export type GardenSave={v:1;holdings:Holding[];onboarded:boolean;lookedBack:boolean;sound:boolean;seen:Seen;name:string;look:Look;stamps:{id:StampId;day:string}[];wardrobe:string[];tips:string[];settings:Settings;letters:string[];weeksDone:string[];rewinds:RewindRound[];daysDone:string[];rankSeen:number;judgments:Judgment[];graded:Graded[];cooldowns:Cooldown[];cases:CaseAnswer[];streak:Streak;currency:number;
  trust:Record<AnalystId,Relation>;owned:Owned[];gifted:AnalystId[];bought:{itemId:string;day:string}[];
  // 관측소 원정 runs (core/game/run.ts): the 판, its decisions and score; the latest of a 판 is the next run's ghost
  expeditions:RunRecord[];
  // 지기 투자일지 (core/jigi, docs/jigi.md): missing in older saves means none yet
  journals?:Journal[];
  // 부지·건물·랜드마크 (core/land.ts): land opened, buildings built, cities opened with coins
  built?:Built;
  // 지기 J3: study tasks taken from the analysis (on the next journal's checklist), my principles, types I said don't fit
  jigi?:{tasks:StudyTask[];principles:{text:string;at:number}[];typeNo:Record<string,boolean>};
  // 오늘의 관측소 (core/game/daily): its runs (drafts kept, so leaving comes back to the same place) and investor_progress,
  // the profile v5.0 top-level block kept here until the server's quest-settle owns it. Never mixed into the journals.
  observatory?:{runs:DailyRun[];progress:InvestorProgress;
    // signed in: the quests finished on the server (the course order follows it) and when it was read
    server?:{finished:string[];at:number};
    // rewards granted (core/game/daily/rewards.ts): each key once; a decoration also lands in `owned`
    grants?:Grant[];
    // the KST day the arrival notice was opened or closed (it shows once a day while the request waits)
    noticed?:string}};
export const SAVE_KEY='rethink-garden-v1';

// Clock: real today, or N days ahead with ?ahead=N
export function clock(){
  let ahead=0;try{ahead=Number(new URLSearchParams(location.search).get('ahead'))||0}catch{}
  return {today:shiftDay(isoDay(),ahead),now:Date.now()+ahead*86400000,ahead};
}

// A new player starts with an empty garden and the onboarding (ui/Onboarding.tsx) asks for their holdings.
export function blankSave():GardenSave{
  const trust={tori:blankRelation(),moa:blankRelation(),luon:blankRelation()};
  return {v:1,holdings:[],onboarded:false,lookedBack:false,sound:true,seen:{birth:0,cutaway:0,bury:0},name:'',look:DEFAULT_LOOK,stamps:[],wardrobe:[],tips:[],settings:DEFAULT_SETTINGS,letters:[],weeksDone:[],rewinds:[],daysDone:[],rankSeen:0,judgments:[],graded:[],cooldowns:[],cases:[],streak:blankStreak(),currency:0,trust,owned:[],gifted:[],bought:[],expeditions:[]};
}
// The demo garden opens with two judgments made months ago, so the first visit already has grades to open (the moment
// the whole loop is built around). Both are on the demo holdings.
export function demoSave(today:string):GardenSave{
  const j1:Judgment={id:'demo-1',holdingId:7,name:'POSCO홀딩스',day:shiftDay(today,-92),choice:'hold',reason:'수주 잔고 3년치. 일시적 하락.',confidence:4,rate:-6.1,
    signalId:'ohlson:7:demo',analyst:'tori',model:'ohlson',rebuttal:'kept'};
  const j2:Judgment={id:'demo-2',holdingId:6,name:'삼성전자',day:shiftDay(today,-35),choice:'watch',reason:'임상 발표까지만 본다.',confidence:2,rate:2.3,
    signalId:'crash:6:demo',analyst:'moa',model:'crash',rebuttal:'skipped'};
  // the demo garden is for showing and testing the loop: the first-time pointers are taken as read
  return {...blankSave(),holdings:DEMO_HOLDINGS,onboarded:true,lookedBack:true,judgments:[j1,j2],currency:4,tips:['map','me','house','lapse'],
    journals:demoJournals(Date.parse(today+'T12:00:00Z'),code=>DEMO_HOLDINGS.find(h=>h.code===code)?.id??null)};
}
function loadSave(today:string):GardenSave{
  try{
    const q=new URLSearchParams(location.search);
    if(q.has('demo'))return demoSave(today);
    if(q.has('reset'))localStorage.removeItem(SAVE_KEY);
    // a save from before the onboarding existed was the demo garden, and stays it
    const raw=localStorage.getItem(SAVE_KEY);if(raw){const s=JSON.parse(raw);if(s?.v===1)return {...(s.holdings?{...blankSave(),lookedBack:true}:demoSave(today)),...s}}
  }catch{}
  return blankSave();
}

export type Toast={id:number;text:string};
export function useGarden(){
  const c=useMemo(clock,[]);
  const [s,setState]=useState<GardenSave>(()=>loadSave(c.today));
  // every action reads the latest save and writes the next one at once, so it can return what happened
  const cur=useRef(s);
  const setS=useCallback((fn:(p:GardenSave)=>GardenSave)=>{const next=fn(cur.current);if(next!==cur.current){cur.current=next;setState(next)}},[]);
  const [toast,setToast]=useState<Toast|null>(null);
  // when it was last changed goes with it (proto3d/sync.ts compares it with the server's copy); opening is not a change
  const first=useRef(true);
  useEffect(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));if(!first.current)markLocal()}catch{}first.current=false},[s]);
  // opening the garden settles the run of days (a missed day opens the rescue or ends the run)
  useEffect(()=>{setS(p=>({...p,streak:checkStreak(p.streak,c.today)}))},[c.today]);
  const say=useCallback((text:string)=>setToast({id:Date.now(),text}),[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),3200);return()=>clearTimeout(t)},[toast]);

  // trust: adds points; the first time an analyst reaches 신뢰 2 they bring their gift to the drawer
  const trusted=(p:GardenSave,who:AnalystId,amount:number):{save:GardenSave;note:string|null}=>{
    const {rel,rose}=gain(p.trust[who],amount,c.today,false);let save={...p,trust:{...p.trust,[who]:rel}},note:string|null=null;
    if(rose!==null){note=line(UI.levelUp,{who:analystById(who).name,n:rose+1});
      if(!save.gifted.includes(who)){const g=giftOf(who);save={...save,gifted:[...save.gifted,who],owned:[...save.owned,{uid:`gift-${who}`,itemId:g.id,got:c.today,slot:null}]};note+=` ${g.name} 받음.`}}
    return {save,note};
  };

  // a reward lands once: the grant is kept, a decoration goes into the inventory, and the player hears about it
  const scoredRanked=(runs:DailyRun[])=>runs.filter(r=>r.finishedAt!==null&&r.mode==='ranked'&&r.result&&!r.result.pending).map(r=>({day:r.day,dailyId:r.dailyId,runId:r.id}));
  const grantInto=(p:GardenSave,grants:Grant[]):GardenSave=>{const o=p.observatory;if(!o)return p;const fresh=newGrants(o.grants??[],grants);if(!fresh.length)return p;
    const owned=[...p.owned,...fresh.filter(g=>g.item&&!p.owned.some(x=>x.uid===`grant-${g.key}`)).map(g=>({uid:`grant-${g.key}`,itemId:g.item!,got:c.today,slot:null}))];
    setTimeout(()=>say(`관측소 보상 · ${fresh.map(g=>g.label).join(' · ')}${fresh.some(g=>g.item)?' · 꾸미기에 넣었어요':''}`),0);
    return {...p,owned,observatory:{...o,grants:[...(o.grants??[]),...fresh]}}};
  const ops={
    // lookback: the first visit's judgment, dated {LOOKBACK} days back so its 30-day grade opens now (core/judgment.ts)
    // 관측소 원정: a finished run (game/Expedition.tsx); kept for the ghost and the records (the last 50)
    finishExpedition(r:RunRecord){setS(p=>({...p,expeditions:[...(p.expeditions??[]),r].slice(-50)}))},
    // 오늘의 관측소: open the run to play (the unfinished one first; else the quest asked for, else the course's current
    // one), move it along, and settle it when the third decision is in. Returns the run id, or null when nothing is open.
    // def: the request handed out today (this device's sample, or the server's); the open run of it comes back
    questOpen(def:QuestDef=SAMPLE_REQUEST):string|null{let id:string|null=null;
      setS(p=>{const o=p.observatory??{runs:[],progress:blankProgress()},act=activeRun(o.runs);
        if(act&&act.quest===def.id){id=act.id;return p}
        const q=def;
        const day=kstDay(c.now),run=startRun(packOfDay(day,q.level),q,day,c.now,o.runs,'q'+c.now.toString(36)+Math.random().toString(36).slice(2,5));
        id=run.id;return {...p,observatory:{...o,runs:[...o.runs.filter(r=>r.finishedAt!==null||r.id!==act?.id),run].slice(-60)}}});
      return id},
    questEdit(id:string,fn:(r:DailyRun)=>DailyRun){setS(p=>{const o=p.observatory;if(!o)return p;return {...p,observatory:{...o,runs:o.runs.map(r=>r.id===id?fn(r):r)}}})},
    questStage(id:string,stage:Stage){ops.questEdit(id,r=>setStage(r,stage))},
    // feedback F4: scene 1 opens after the market has played up to it; the flow keeps the day it shows and ends on a stop
    questBegin(id:string){setS(p=>{const o=p.observatory,r=o?.runs.find(x=>x.id===id),pack=r&&packOfRun(r,packById);if(!o||!r||!pack)return p;
      return {...p,observatory:{...o,runs:o.runs.map(x=>x.id===id?{...setStage(x,'scene'),play:playBefore(pack)}:x)}}})},
    questPlayAt(id:string,at:number){ops.questEdit(id,r=>playAt(r,at))},
    questPlayEnd(id:string){ops.questEdit(id,r=>endPlay(r))},
    questNoticed(day:string){setS(p=>{const o=p.observatory??{runs:[],progress:blankProgress()};return o.noticed===day?p:{...p,observatory:{...o,noticed:day}}})},
    // an official run started on the server (quest-play): its id, its day and the pack cut at scene 1
    questAdopt(a:{run:string;quest:string;def:QuestDef;day:string;dto:DailyPack;drafts?:Record<string,Partial<Fields>>;draftRev?:number}):string{
      setS(p=>{const o=p.observatory??{runs:[],progress:blankProgress()};if(o.runs.some(r=>r.id===a.run))return p;
        let run:DailyRun={...startRun(a.dto,a.def,a.day,c.now,o.runs,a.run),dto:a.dto,draftRev:a.draftRev??0};
        // another device's drafts for this run come along
        for(const [sc,f] of Object.entries(a.drafts??{}))run=setDraft(run,sc,f);
        return {...p,observatory:{...o,runs:[...o.runs.filter(r=>r.finishedAt!==null),run].slice(-60)}}});
      return a.run},
    questDto(id:string,dto:DailyPack){ops.questEdit(id,r=>({...r,dto}))},
    questDraftRev(id:string,rev:number){ops.questEdit(id,r=>({...r,draftRev:rev}))},
    // a draft conflict resolved by taking the other device's version
    questTakeDrafts(id:string,drafts:Record<string,Partial<Fields>>,rev:number){ops.questEdit(id,r=>{let x:DailyRun={...r,draftRev:rev};for(const [sc,f] of Object.entries(drafts))x=setDraft(x,sc,f);return x})},
    questDraft(id:string,scene:string,f:Partial<Fields>){ops.questEdit(id,r=>setDraft(r,scene,f))},
    questPick(id:string,scene:string,f:Fraction|null){ops.questEdit(id,r=>setPick(r,scene,f))},
    questDecide(id:string,scene:string):{ok:true;done:boolean}|{ok:false;error:DecideError;missing?:FieldKey[]}{let out:{ok:true;done:boolean}|{ok:false;error:DecideError;missing?:FieldKey[]}={ok:false,error:'order'};
      setS(p=>{const o=p.observatory,r=o?.runs.find(x=>x.id===id),pack=r&&packOfRun(r,packById);if(!o||!r||!pack)return p;
        const d=decideQuest(pack,r,scene,c.now);if('error' in d){out={ok:false,error:d.error,missing:d.missing};return p}
        let run=d.run,progress=o.progress;
        if(run.stage==='result'){const st=settle(pack,run,progress,kstDay(c.now),c.now);run=st.run;progress=st.progress}
        // the market plays on to the next moment (or the evaluation day) before it opens
        const play=playAfter(pack,run);if(play)run={...run,play};
        out={ok:true,done:run.finishedAt!==null};
        const runs=o.runs.map(x=>x.id===id?run:x);
        return grantInto({...p,observatory:{...o,runs,progress}},completionGrants(scoredRanked(runs)))});
      return out},
    // grants from the server (its ledger is the truth once signed in), applied once each
    questGrants(grants:Grant[]){setS(p=>grantInto(p,grants))},
    // the server's answer to a settled run: its replay replaces the local result and its ledger the local XP; an error
    // (no invite, a run from before signing in…) keeps the local result as this device's own record
    questSynced(id:string,res:{run:DailyRun;progress:InvestorProgress;grants?:Grant[]}|{error:string}){setS(p=>{const o=p.observatory;if(!o)return p;
      if('error' in res)return {...p,observatory:{...o,runs:o.runs.map(r=>r.id===id?{...r,synced:{at:c.now,error:res.error}}:r)}};
      const fin=[...new Set([...(o.server?.finished??[]),res.run.quest])];
      return grantInto({...p,observatory:{...o,runs:o.runs.map(r=>r.id===id?{...res.run,stage:'result' as const,synced:{at:c.now},...(r.play?{play:r.play}:{})}:r),progress:res.progress,server:{finished:fin,at:c.now}}},
        'grants' in res&&Array.isArray(res.grants)?res.grants:[])})},
    questServerState(progress:InvestorProgress,finished:string[]){setS(p=>{const o=p.observatory??{runs:[],progress:blankProgress()};return {...p,observatory:{...o,progress,server:{finished,at:c.now}}}})},
    recordJudgment(j:Omit<Judgment,'id'|'day'>,lookback=false){
      const full:Judgment=lookback?{...j,id:`look-${j.holdingId}-${c.now}`,day:shiftDay(c.today,-LOOKBACK),lookback:true}:{...j,id:`j-${j.holdingId}-${c.now}`,day:c.today};let note:string|null=null;
      setS(p=>{const r=record(p.judgments,full);let next={...p,judgments:r.list,lookedBack:p.lookedBack||lookback,currency:p.currency+(r.first?EARN.judgment:0)};
        if(j.analyst&&j.signalId){const t=trusted(next,j.analyst as AnalystId,TRUST.briefing);next=t.save;note=t.note}
        return next});
      if(note)say(note);
      return full;
    },
    answerRebuttal(id:string,how:'kept'|'accepted'|'skipped'){
      setS(p=>{let next={...p,judgments:p.judgments.map(j=>j.id===id?{...j,rebuttal:how}:j)};if(how==='skipped')return next;
        next={...next,currency:next.currency+EARN.rebuttal};const t=trusted(next,'luon',TRUST.rebuttal);if(t.note)say(t.note);return t.save});
    },
    reviseReason(id:string,reason:string){setS(p=>({...p,judgments:p.judgments.map(j=>j.id===id?{...j,reason}:j)}))},
    openGrade(j:Judgment,mark:Mark):Graded{
      const g=grade(j,mark,outcomeProvider.after(j.holdingId,j.day,mark),c.today);
      setS(p=>{if(p.graded.some(x=>x.judgmentId===g.judgmentId&&x.mark===g.mark))return p;let next={...p,graded:[...p.graded,g],currency:p.currency+EARN.grade};
        if(g.signalRight&&j.analyst){const t=trusted(next,j.analyst as AnalystId,TRUST.signalRight);next=t.save;if(t.note)say(t.note)}
        return next});
      return g;
    },
    startCooldown(holdingId:number){setS(p=>({...p,cooldowns:startCooldown(p.cooldowns,holdingId,c.now)}));say(UI.cooldownStart)},
    finishCooldown(id:string){let waited=false;setS(p=>{const r=finishCooldown(p.cooldowns,id,c.now);waited=r.waited;return {...p,cooldowns:r.list,currency:p.currency+(r.waited?EARN.cooldownWaited:0)}});return waited},
    answerCase(a:CaseAnswer,hintModel?:string){
      let streak:{counted:boolean;count:number;bonus:number}={counted:false,count:0,bonus:0};
      setS(p=>{if(p.cases.some(x=>x.day===a.day))return p;const r=answerStreak(p.streak,c.today);streak={counted:r.counted,count:r.streak.count,bonus:r.bonus};
        let next={...p,cases:[...p.cases,a],streak:r.streak,currency:p.currency+EARN.caseAnswered+(a.correct?EARN.caseRight:0)+r.bonus};
        if(hintModel){const who=(['tori','moa','luon'] as AnalystId[]).find(x=>x===hintModel);if(who)next=trusted(next,who,TRUST.hint).save}
        return next});
      return streak;
    },
    buy(item:GardenItem){
      let ok=false;setS(p=>{if(!item.price||p.currency<item.price||p.bought.some(b=>b.itemId===item.id&&b.day===c.today))return p;ok=true;
        return {...p,currency:p.currency-item.price,bought:[...p.bought,{itemId:item.id,day:c.today}],owned:[...p.owned,{uid:`${item.id}-${c.now}`,itemId:item.id,got:c.today,slot:null}]}});
      return ok;
    },
    // the onboarding's or a later recapture's confirmed list; demo: swap in the whole demo garden instead
    setHoldings(holdings:Holding[]){setS(p=>({...p,holdings,onboarded:true}))},
    useDemo(){setS(()=>demoSave(c.today))},
    skipLookback(){setS(p=>({...p,lookedBack:true}))},
    // today's three all done (core/today.ts): the day closes once, with a small bonus
    closeDay(){let closed=false;setS(p=>{if(p.daysDone.includes(c.today))return p;closed=true;return {...p,daysDone:[...p.daysDone.slice(-60),c.today],currency:p.currency+EARN.dayDone}});
      if(closed)say(line(UI.dayDone,{n:EARN.dayDone}))},
    // a new title (core/rank.ts): every title reached since the last one brings its item to the drawer
    rankUp(index:number,name:string){const got:string[]=[];setS(p=>{if(index<=p.rankSeen)return p;let owned=p.owned;
      for(let k=p.rankSeen+1;k<=index;k++){const it=rankItem(k);if(it&&!owned.some(o=>o.itemId===it.id)){owned=[...owned,{uid:`rank-${k}`,itemId:it.id,got:c.today,slot:null}];got.push(it.name)}}
      return {...p,rankSeen:index,owned}});if(got.length)say(line(UI.rankUp,{rank:name,item:got.join(', ')}))},
    setSound(on:boolean){setS(p=>({...p,sound:on}))},
    setName(name:string){setS(p=>({...p,name}))},
    setSettings(settings:Settings){setS(p=>({...p,settings}))},
    // start over: the save goes and the page opens on the onboarding
    // the server's copy won on sign-in (core/sync.ts): it replaces this device's garden as it is
    adopt(save:GardenSave){setS(()=>({...blankSave(),...save}))},
    wipe(){try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem('rethink-garden-at')}catch{}location.replace(location.pathname+'?reset')},
    // this week's three goals done (core/weekly.ts): paid once a week
    closeWeek(start:string){let paid=false;setS(p=>{if(p.weeksDone.includes(start))return p;paid=true;return {...p,weeksDone:[...p.weeksDone.slice(-30),start],currency:p.currency+EARN.weekDone}});
      if(paid)say(line(UI.weekDone,{n:EARN.weekDone}))},
    letterRead(month:string){setS(p=>p.letters.includes(month)?p:{...p,letters:[...p.letters,month]})},
    tipDone(id:string){setS(p=>p.tips.includes(id)?p:{...p,tips:[...p.tips,id]})},
    setLook(look:Look){setS(p=>({...p,look}))},
    // a piece of clothing from the cart's currency (core/wardrobe.ts unlock buy)
    buyWear(id:string,price:number){let ok=false;setS(p=>{if(p.wardrobe.includes(id)||p.currency<price)return p;ok=true;return {...p,currency:p.currency-price,wardrobe:[...p.wardrobe,id]}});return ok},
    // stamps newly earned (core/stamps.ts newStamps): kept with today's date, said once
    stamp(ids:StampId[]){if(!ids.length)return;setS(p=>({...p,stamps:[...p.stamps,...ids.filter(i=>!p.stamps.some(x=>x.id===i)).map(id=>({id,day:c.today}))]}));say(line(UI.stamped,{name:ids.map(i=>stampById(i).name).join(', ')}))},
    saw(k:keyof Seen){setS(p=>({...p,seen:{...p.seen,[k]:p.seen[k]+1}}))},
    // 되감기: a practice round graded at once; the first few a day pay a little (core/rewind.ts)
    playRewind(rc:RewindCase,choice:Choice,confidence:Confidence){let round=null as RewindRound|null;
      setS(p=>{const r=playRewind(rc,choice,confidence,c.today,p.rewinds);round=r;return {...p,rewinds:[...p.rewinds,r],currency:p.currency+(r.paid?EARN.rewind+(r.hit?EARN.rewindHit:0):0)}});
      return round!},
    // 지기 투자일지: a new page (from a tree, a quick chip or a signal), edits as drafts, save (a version), archive, trash
    journalNew(o:{holdingId?:number|null;quick?:Quick;signalId?:string|null}={}){const id='j'+c.now.toString(36)+Math.random().toString(36).slice(2,6);
      setS(p=>{const h=o.holdingId!=null?p.holdings.find(x=>x.id===o.holdingId):undefined;
        return {...p,journals:[...purgeOld(p.journals??[],c.now),newJournal(id,c.now,c.today,{holdingId:h?.id??null,code:h?codeOf(h):null,name:h?.name,quick:o.quick,signalId:o.signalId})]}});return id},
    // the first visit's 되돌아보기 as a practice journal (core/jigi/lookback.ts): written as of 30 days ago, graded at once
    journalLookback(o:{holdingId:number;dir:'상승'|'하락';reason:string;conf:string;signalId?:string|null;analyst?:AnalystId|null}){let out:{journalId:string;hypoId:string}|null=null;
      setS(p=>{const h=p.holdings.find(x=>x.id===o.holdingId);if(!h)return p;const id='look-'+c.now.toString(36),hypoId=id+'-h';
        const j=lookbackJournal({id,hypoId,holdingId:h.id,code:codeOf(h),name:h.name,today:c.today,now:c.now,dir:o.dir,reason:o.reason,conf:o.conf,signalId:o.signalId});if(!j)return p;
        out={journalId:id,hypoId};let next:GardenSave={...p,lookedBack:true,journals:[...(p.journals??[]),j],currency:p.currency+EARN.judgment};
        if(o.analyst){const t=trusted(next,o.analyst,TRUST.briefing);next=t.save}return next});
      return out as {journalId:string;hypoId:string}|null},
    jigiTask(t:Task){setS(p=>{const j=p.jigi??JIGI0;return j.tasks.some(x=>x.id===t.id)?p:{...p,jigi:{...j,tasks:[...j.tasks,{id:t.id,text:t.act,at:c.now}]}}});say('다음 일지 체크리스트에 넣었어요')},
    jigiTaskDone(id:string){setS(p=>{const j=p.jigi??JIGI0;return {...p,jigi:{...j,tasks:j.tasks.map(x=>x.id===id?{...x,done:true}:x)}}})},
    jigiTaskDrop(id:string){setS(p=>{const j=p.jigi??JIGI0;return {...p,jigi:{...j,tasks:j.tasks.filter(x=>x.id!==id)}}})},
    jigiPrinciple(text:string){setS(p=>{const j=p.jigi??JIGI0;return j.principles.some(x=>x.text===text)?p:{...p,jigi:{...j,principles:[...j.principles,{text,at:c.now}]}}});say('내 원칙으로 저장했어요')},
    jigiTypeNo(id:string){setS(p=>{const j=p.jigi??JIGI0;return {...p,jigi:{...j,typeNo:{...j.typeNo,[id]:!j.typeNo[id]}}}})},
    journalEdit(id:string,fn:(j:Journal)=>Journal){setS(p=>({...p,journals:(p.journals??[]).map(j=>j.id===id?fn(j):j)}))},
    journalSave(id:string){let out:ReturnType<typeof saveJournal>|null=null;
      setS(p=>{const j=(p.journals??[]).find(x=>x.id===id);if(!j)return p;const r=saveJournal(j,c.now);out=r;if(!r.ok)return p;
        // coins for the first save of my own journal (not the demo, not practice)
        const pay=r.version===1&&!j.demo&&!j.practice?EARN.journal:0;
        return {...p,currency:p.currency+pay,journals:(p.journals??[]).map(x=>x.id===id?r.journal:x)}});
      const o=out as ReturnType<typeof saveJournal>|null;if(o?.ok&&o.version===1)say(`일지를 저장했어요 · 코인 +${EARN.journal}`);return o},
    // J2: a journal's hypotheses (drafts edited in place), confirming one (base close, end date), the review, a verdict opened
    journalHypos(id:string,hypos:Hypo[]){setS(p=>({...p,journals:(p.journals??[]).map(j=>j.id===id?{...j,hypos}:j)}))},
    journalConfirm(id:string,hypoId:string){let say='';let buried=false;
      setS(p=>{let pay=0;const journals=(p.journals??[]).map(j=>{if(j.id!==id)return j;const before=j.hypos.filter(h=>h.status==='confirmed'&&h.auto).length;
        const next={...j,hypos:j.hypos.map(h=>{if(h.id!==hypoId)return h;const r=confirmHypo(j,h,c.today,c.now);say=r.say;buried=r.h.status==='confirmed'&&!!r.h.auto;return r.h})};
        if(buried&&before<3&&!j.demo&&!j.practice)pay=EARN.confirm;return next});
        if(pay)say+=` · 코인 +${pay}`;return {...p,currency:p.currency+pay,journals}});
      return {say,buried}},
    // the review: coins once, when it first gets an answer
    journalReflect(id:string,r:Reflection){let paid=false;setS(p=>{const j=(p.journals??[]).find(x=>x.id===id);if(!j)return p;
      const pay=!j.reflection?.plan&&!!r.plan&&!j.demo?EARN.review:0;paid=pay>0;
      return {...p,currency:p.currency+pay,journals:(p.journals??[]).map(x=>x.id===id?{...x,reflection:r}:x)}});if(paid)say(`복기를 남겼어요 · 코인 +${EARN.review}`)},
    // 부지 넓히기·건물 짓기·도시 열기 with coins (core/land.ts spend); says what happened
    build(w:Want){let res:ReturnType<typeof spend>|null=null;setS(p=>{const r=spend(p.built??BUILT0,p.currency,w);res=r;return r.ok?{...p,built:r.built,currency:r.coins}:p});
      const r=res as ReturnType<typeof spend>|null;if(!r)return false;
      const name=w.kind==='land'?LANDS.find(l=>l.id===w.id)?.name:w.kind==='building'?BUILDINGS.find(b=>b.id===w.id)?.name:CITIES.find(x=>x.id===w.id)?.landmark;
      if(r.ok)say(w.kind==='land'?`${name} · 새 나무 자리 ${LANDS.find(l=>l.id===w.id)!.plots.length}칸이 생겼어요`:w.kind==='building'?`${name} · 다 지었어요`:`${name} · 정원 가장자리에 세웠어요`);
      else say(r.why==='coins'?`코인이 ${r.need} 모자라요. 일지를 쓰고 복기하면 모여요`:r.why==='have'?'이미 있어요':'지금은 할 수 없어요');return r.ok},
    journalOpened(id:string,hypoId:string){setS(p=>({...p,journals:(p.journals??[]).map(j=>j.id===id?{...j,hypos:j.hypos.map(h=>h.id===hypoId?{...h,opened:c.now}:h)}:j)}))},
    journalArchive(id:string,on:boolean){setS(p=>({...p,journals:(p.journals??[]).map(j=>j.id===id?{...j,archivedAt:on?c.now:null}:j)}))},
    journalTrash(id:string,on:boolean){setS(p=>({...p,journals:(p.journals??[]).map(j=>j.id===id?{...j,deletedAt:on?c.now:null}:j)}))},
    journalPurge(id:string){setS(p=>({...p,journals:(p.journals??[]).filter(j=>j.id!==id)}))},
    place(uid:string,slot:string|null){setS(p=>({...p,owned:p.owned.map(o=>o.uid===uid?{...o,slot}:o.slot&&o.slot===slot?{...o,slot:null}:o)}))},
  };
  const due=useMemo(()=>dueGrades(s.judgments,s.graded,c.today),[s.judgments,s.graded,c.today]);
  return {s,ops,due,clock:c,toast,say,itemById};
}
