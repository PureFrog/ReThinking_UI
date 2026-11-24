'use client';
// Talking with 보리 (core/friend.ts) as a game dialogue (feedback 11-17, docs/mockups/bori-talk.html): the bottom of the
// screen is a glass box with 보리's name tag; its lines type out (a tap shows the rest, ▼ goes on); when it is done the
// replies stand on the right. "얘기해 줄게" (or 말 걸기) opens a field in the same box for free talk with the server
// (talk: db/functions/bori-talk through supabase.ts boriTalk). With a stop-loss signal on a holding, opening asks the
// server first: 보리 then starts that talk instead of the small talk (supabase.ts boriOpen). One look for both: 보리
// coming over and 보리 tapped. The rest of the screen steps back meanwhile (rethink.css .rt-talk).
import {useEffect,useRef,useState} from 'react';
import {FRIEND,FRIEND_TALK,friendReplies,type FriendTopic,type TalkLine} from '../../core/friend';
import {TIMING} from '../../core/timing';
import {FRIEND_FACE,type BoriFace} from '../../core/friend';
// at: the server's time on a detection-mode line (core/llm1/engine.ts stamp), shown beside the name
type Line={text:string;emotion?:string;at?:string};

type Choice={label:string;answer?:string;go?:'grades'|'journal'|'case'|null;talk?:boolean;leave?:boolean;stocks?:boolean;stock?:number};
// 9-5: 토리·모아·루온 talk too, each in its own voice: small talk or one of my holdings (no free talk)
export type Speaker={id:string;name:string;smalls:string[];stockLine:(name:string)=>string};
const LATER='그래, 생각나면 불러.';

// onFace: the face of the line on screen (보리's model wears it, Analyst3D); the server sends one with every line
export function FriendSheet({opener,topic,seed,onGo,onClose,talk,opening,onFace,who,stocks=[],onStock,pickFirst,onPickTalk}:{opener:string;topic:FriendTopic;seed:string;onGo:(to:'grades'|'journal'|'case')=>void;onClose:()=>void;
  talk?:((history:TalkLine[],message:string)=>Promise<Line>)|null;opening?:(()=>Promise<Line|null>)|null;onFace?:(f:BoriFace)=>void;
  who?:Speaker;stocks?:{id:number;name:string}[];onStock?:(id:number)=>void;
  // 루온 (2026-11-24): the stocks stand first, and a stock picked asks the server for detection mode on it (supabase.ts stockSignal)
  pickFirst?:boolean;onPickTalk?:((id:number,name:string)=>Promise<Line|null>)|null}){
  const [picking,setPicking]=useState(!!pickFirst&&stocks.length>0);
  const name=who?.name??FRIEND.name;
  // what 보리 still has to say (the first is on screen), what was said (for the server), and where the talk is
  const [queue,setQueue]=useState<string[]>(opening?[]:[opener]),[face,setFace]=useState<BoriFace>(FRIEND_FACE.of(opening?'thinking':FRIEND_FACE.topic[topic]));
  useEffect(()=>{onFace?.(face)},[face]);// eslint-disable-line react-hooks/exhaustive-deps
  const [history,setHistory]=useState<TalkLine[]>(opening?[]:[{who:'bori',text:opener}]);
  const [shown,setShown]=useState(0),[busy,setBusy]=useState(!!opening),[mode,setMode]=useState<'choose'|'type'|'leaving'>('choose');
  const [at,setAt]=useState<string|null>(null),[stopLoss,setStopLoss]=useState(false),[mine,setMine]=useState<string|null>(null),[draft,setDraft]=useState('');
  const input=useRef<HTMLInputElement>(null);
  const line=queue[0]??'',done=shown>=line.length;
  // the opening: the stop-loss talk's first line, or the small talk when there is none
  useEffect(()=>{if(!opening)return;let live=true;
    void opening().then(t=>{if(!live)return;setBusy(false);
      if(t){setStopLoss(true);setAt(t.at??null);setQueue([t.text]);setHistory([{who:'bori',text:t.text}]);setFace(FRIEND_FACE.of(t.emotion??'curious'))}
      else{setQueue([opener]);setHistory([{who:'bori',text:opener}]);setFace(FRIEND_FACE.of(FRIEND_FACE.topic[topic]))}});
    return ()=>{live=false}},[opening]);// eslint-disable-line react-hooks/exhaustive-deps
  // typing out, a character at a time
  // by time, not by tick: a busy phone (the garden drawing) skips letters instead of typing slower
  const t0=useRef(0);
  useEffect(()=>{setShown(0);t0.current=performance.now()},[line]);
  useEffect(()=>{if(done||!line)return;const t=setInterval(()=>setShown(n=>Math.max(n,Math.min(line.length,Math.floor((performance.now()-t0.current)/TIMING.typeChar)))),TIMING.typeChar);
    return()=>clearInterval(t)},[line,done]);
  useEffect(()=>{if(mode==='type'&&done)input.current?.focus()},[mode,done]);
  // a tap on the box: the rest of the line at once, then the next line
  const tapBox=()=>{if(!done){setShown(line.length);return}if(queue.length>1)setQueue(q=>q.slice(1))};
  const say=(text:string,emotion?:string,stamp:string|null=null)=>{setAt(stamp);setQueue([text]);setHistory(h=>[...h,{who:'bori',text}]);if(emotion)setFace(FRIEND_FACE.of(emotion))};
  const mine0=stocks.length&&onStock?[{label:'내 종목 얘기',stocks:true}]:[];
  const choices:Choice[]=stopLoss?[{label:'얘기해 줄게',talk:true},{label:'나중에',leave:true}]
    :picking?[...stocks.slice(0,8).map(x=>({label:x.name,stock:x.id})),{label:'다음에',leave:true}]
    :who&&talk?[...mine0,{label:'말 걸기',talk:true}]
    :who?[{label:'수다 떨자',answer:who.smalls[(seed+who.id).length%who.smalls.length]},...mine0]
    :[...friendReplies(topic,seed).filter(r=>r.go!=='case').map(r=>({label:r.label,answer:r.answer,go:r.go})),...mine0,...(talk?[{label:'말 걸기',talk:true}]:[])];
  const pick=(c:Choice)=>{setMine(c.label);
    if(c.stocks){setPicking(true);say(who?'어느 나무 얘기 할래?':'어떤 종목? 골라 봐.','curious');return}
    // 토론 캐릭터: the stock picked opens the talk box about it (no tree walk)
    if(c.stock!==undefined&&who&&talk&&onPickTalk){const id=c.stock,n=c.label;setPicking(false);setMode('type');setHistory(h=>[...h,{who:'me',text:n}]);setBusy(true);setFace('thinking');
      void onPickTalk(id,n).then(l=>{setBusy(false);if(l)say(l.text,l.emotion??'curious',l.at??null);else say(`${n}? 좋아. 왜 갖고 있는지 한 줄로 말해 줘. 반대로 볼 근거를 같이 찾아볼게.`,'curious')});return}
    if(c.stock!==undefined&&who&&talk){const n=c.label;setPicking(false);setMode('type');say(`${n}? 좋아. 왜 갖고 있는지 한 줄로 말해 줘. 반대로 볼 근거를 같이 찾아볼게.`,'curious');setHistory(h=>[...h,{who:'me',text:n}]);return}
    if(c.stock!==undefined){const id=c.stock,n=c.label;setMode('leaving');say(who?who.stockLine(n):`${n} 나무로 가자. 수첩 펼쳐 줄게.`,'happy');setTimeout(()=>onStock?.(id),TIMING.talkGo+300);return}
    if(c.leave){setMode('leaving');say(LATER,'happy');setTimeout(onClose,TIMING.talkLeave);return}
    if(c.talk&&stopLoss&&!talk){setMode('leaving');say('그 종목 수첩 펼쳐 줄게. 거기에 적어 보자.','happy');setTimeout(()=>onGo('journal'),TIMING.talkGo);return}
    if(c.talk){setMode('type');if(!stopLoss)say('응, 뭐든 말해 봐.','curious');return}
    setHistory(h=>[...h,{who:'me',text:c.label}]);if(c.answer)say(c.answer,c.go?'happy':'playful');setMode('leaving');
    const to=c.go;setTimeout(()=>{if(to)onGo(to);else onClose()},to?TIMING.talkGo:TIMING.talkLeave+400)};
  const send=async()=>{const m=draft.trim();if(!m||busy||!talk)return;const before=history;setDraft('');setMine(m);setBusy(true);
    setHistory([...before,{who:'me',text:m}]);setFace('thinking');const a=await talk(before,m);setBusy(false);say(a.text,a.emotion??'neutral',a.at??null)};
  const showChoices=mode==='choose'&&done&&!busy&&queue.length<=1&&!!line;
  return <div className="rt-talk" role="dialog" aria-label={`${name}와 대화`} data-face={face}>
    {mode!=='leaving'&&<button type="button" className="rt-talk-leave" onClick={onClose}>{mode==='type'?'대화 끝내기':'나중에 얘기할게'}</button>}
    {mine&&mode!=='choose'&&<p className="rt-talk-me">{mine}</p>}
    {showChoices&&<div className="rt-talk-choices" role="group" aria-label="대답">
      {choices.map((c,i)=><button key={c.label} type="button" className={'rt-talk-choice'+(i===0?' first':'')} onClick={()=>pick(c)}>{c.label}</button>)}</div>}
    <div className="rt-talk-box" onClick={tapBox}>
      <span className={'rt-talk-name n-'+(who?.id??'bori')} data-who={who?.id??'bori'}>{name}{at&&!busy&&<time className="rt-talk-at rt-num" dateTime={at}>{at.slice(11,16)}</time>}</span>
      <p className="rt-talk-line" aria-live="polite">
        {busy?<span className="rt-chat-typing" aria-label="보리가 생각하는 중"><i/><i/><i/></span>:line.slice(0,shown)}
        <span className="rt-sr">{busy?'':line.slice(shown)}</span>
      </p>
      {done&&!busy&&queue.length>1&&<i className="rt-talk-more" aria-hidden/>}
      {mode==='type'&&<form className="rt-talk-type" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();void send()}}>
        <input ref={input} className="rt-input" disabled={!talk} value={draft} maxLength={FRIEND_TALK.maxIn} onChange={e=>setDraft(e.target.value)}
          placeholder={talk?`${name}한테 말하기`:'자유 대화는 로그인하면 열려요'} aria-label={`${name}에게 말하기`}/>
        <button type="submit" className="rt-btn rt-btn-ink" disabled={!talk||busy||!draft.trim()}>보내기</button>
      </form>}
      {mode==='type'&&<p className="rt-talk-note">{name}의 말은 AI가 만든 대화예요. 투자 권유가 아니에요.</p>}
    </div>
  </div>;
}
