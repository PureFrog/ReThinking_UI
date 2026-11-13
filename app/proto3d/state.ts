'use client';
// The 3D garden's save and every action on it. The rules live in app/core (judgment, cooldown, cases, streak, league,
// relationships); this file only wires them to one saved state and pays the currency and trust (app/core/ledger.ts).
// Saved in localStorage until the server (R5) takes it over through app/proto3d/server.ts.
//   ?ahead=N   look N days ahead (grades and cooldowns come due; demo and tests)
//   ?reset     start over (the onboarding asks for the holdings again)
//   ?demo      start over on the demo garden (seven made-up holdings and two old judgments; demos and tests)
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
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

export type Owned={uid:string;itemId:string;got:string;slot:string|null};
// seen: how many times each long scene was played (docs/brief-wow.md: long the first time, short after)
export type Seen={birth:number;cutaway:number;bury:number};
export type GardenSave={v:1;holdings:Holding[];onboarded:boolean;lookedBack:boolean;sound:boolean;seen:Seen;rewinds:RewindRound[];daysDone:string[];rankSeen:number;judgments:Judgment[];graded:Graded[];cooldowns:Cooldown[];cases:CaseAnswer[];streak:Streak;currency:number;
  trust:Record<AnalystId,Relation>;owned:Owned[];gifted:AnalystId[];bought:{itemId:string;day:string}[]};
export const SAVE_KEY='rethink-garden-v1';

// Clock: real today, or N days ahead with ?ahead=N
export function clock(){
  let ahead=0;try{ahead=Number(new URLSearchParams(location.search).get('ahead'))||0}catch{}
  return {today:shiftDay(isoDay(),ahead),now:Date.now()+ahead*86400000,ahead};
}

// A new player starts with an empty garden and the onboarding (ui/Onboarding.tsx) asks for their holdings.
export function blankSave():GardenSave{
  const trust={tori:blankRelation(),moa:blankRelation(),luon:blankRelation()};
  return {v:1,holdings:[],onboarded:false,lookedBack:false,sound:true,seen:{birth:0,cutaway:0,bury:0},rewinds:[],daysDone:[],rankSeen:0,judgments:[],graded:[],cooldowns:[],cases:[],streak:blankStreak(),currency:0,trust,owned:[],gifted:[],bought:[]};
}
// The demo garden opens with two judgments made months ago, so the first visit already has grades to open (the moment
// the whole loop is built around). Both are on the demo holdings.
export function demoSave(today:string):GardenSave{
  const j1:Judgment={id:'demo-1',holdingId:7,name:'강철중공업',day:shiftDay(today,-92),choice:'hold',reason:'수주 잔고 3년치. 일시적 하락.',confidence:4,rate:-6.1,
    signalId:'ohlson:7:demo',analyst:'tori',model:'ohlson',rebuttal:'kept'};
  const j2:Judgment={id:'demo-2',holdingId:6,name:'은하바이오',day:shiftDay(today,-35),choice:'watch',reason:'임상 발표까지만 본다.',confidence:2,rate:2.3,
    signalId:'crash:6:demo',analyst:'moa',model:'crash',rebuttal:'skipped'};
  return {...blankSave(),holdings:DEMO_HOLDINGS,onboarded:true,lookedBack:true,judgments:[j1,j2],currency:4};
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
  useEffect(()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}},[s]);
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

  const ops={
    // lookback: the first visit's judgment, dated {LOOKBACK} days back so its 30-day grade opens now (core/judgment.ts)
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
    saw(k:keyof Seen){setS(p=>({...p,seen:{...p.seen,[k]:p.seen[k]+1}}))},
    // 되감기: a practice round graded at once; the first few a day pay a little (core/rewind.ts)
    playRewind(rc:RewindCase,choice:Choice,confidence:Confidence){let round=null as RewindRound|null;
      setS(p=>{const r=playRewind(rc,choice,confidence,c.today,p.rewinds);round=r;return {...p,rewinds:[...p.rewinds,r],currency:p.currency+(r.paid?EARN.rewind+(r.hit?EARN.rewindHit:0):0)}});
      return round!},
    place(uid:string,slot:string|null){setS(p=>({...p,owned:p.owned.map(o=>o.uid===uid?{...o,slot}:o.slot&&o.slot===slot?{...o,slot:null}:o)}))},
  };
  const due=useMemo(()=>dueGrades(s.judgments,s.graded,c.today),[s.judgments,s.graded,c.today]);
  return {s,ops,due,clock:c,toast,say,itemById};
}
