'use client';
// Talking with 보리 (core/friend.ts): the opener, a few quick replies, and free talk once the player is signed in with
// the server (talk: db/functions/friend-chat through supabase.ts friendTalk). Glass sheet like the rest (glass.css).
import {useEffect,useRef,useState} from 'react';
import {Sheet} from './Sheet';
import {FRIEND,FRIEND_TALK,friendReplies,type FriendReply,type FriendTopic,type TalkLine} from '../../core/friend';

export function FriendSheet({opener,topic,seed,onGo,onClose,talk}:{opener:string;topic:FriendTopic;seed:string;onGo:(to:'grades'|'journal'|'case')=>void;onClose:()=>void;
  talk?:((history:TalkLine[],message:string)=>Promise<string>)|null}){
  const [lines,setLines]=useState<TalkLine[]>([{who:'bori',text:opener}]);
  const [used,setUsed]=useState(false),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false);
  const end=useRef<HTMLDivElement>(null);
  useEffect(()=>{end.current?.scrollIntoView?.({block:'nearest'})},[lines.length,busy]);
  const replies=friendReplies(topic,seed);
  const answer=(r:FriendReply)=>{setUsed(true);setLines(l=>[...l,{who:'me',text:r.label},{who:'bori',text:r.answer}]);if(r.go){const to=r.go;setTimeout(()=>onGo(to),700)}};
  const send=async()=>{const m=draft.trim();if(!m||busy||!talk)return;const before=lines;setDraft('');setUsed(true);setBusy(true);
    setLines([...before,{who:'me',text:m}]);const a=await talk(before,m);setLines(l=>[...l,{who:'bori',text:a}]);setBusy(false)};
  return <Sheet kicker={FRIEND.role} title={FRIEND.name} label="보리와 대화" onClose={onClose}>
    <div className="rt-chat" aria-live="polite">
      {lines.map((l,i)=><p key={i} className={`rt-chat-line ${l.who}`}>{l.text}</p>)}
      {busy&&<p className="rt-chat-line bori rt-chat-typing" aria-label="보리가 생각하는 중"><i/><i/><i/></p>}
      <div ref={end}/>
    </div>
    {!used&&<div className="rt-chat-replies">{replies.map(r=><button key={r.label} type="button" className="rt-btn" onClick={()=>answer(r)}>{r.label}</button>)}</div>}
    <form className="rt-chat-input" onSubmit={e=>{e.preventDefault();void send()}}>
      <input className="rt-input" disabled={!talk} value={draft} maxLength={FRIEND_TALK.maxIn} onChange={e=>setDraft(e.target.value)}
        placeholder={talk?'보리에게 말 걸기':'자유 대화는 로그인하면 열려요'} aria-label="보리에게 말하기"/>
      <button type="submit" className="rt-btn" disabled={!talk||busy||!draft.trim()}>보내기</button>
    </form>
    <p className="rt-hint" style={{marginTop:8}}>보리의 말은 AI가 만든 대화예요. 투자 권유가 아니에요.</p>
  </Sheet>;
}
