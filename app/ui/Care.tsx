'use client';
import {MOOD_IMAGES} from '../assets';
import {useState} from 'react';
import {Check,X as Cross} from 'lucide-react';
import {MOODS,canSave,journalPrompt,type JournalEntry,type Mood} from '../care';
import type {NewsQuiz} from '../news';
import {formatDay} from '../items';
import {VERDICTS,type Verdict} from '../retro';
// Watering = the stock's journal (12.1): three boxes, one is enough; the day's question sits on top, past pages below.
export function CareJournal({name,day,past,onSave}:{name:string;day:string;past:JournalEntry[];onSave:(e:{saw:string;think:string;mood:Mood|''})=>void}){
 const [saw,setSaw]=useState(''),[think,setThink]=useState(''),[mood,setMood]=useState<Mood|''>('');
 return <form id="care-journal-form" className="care-journal" onSubmit={e=>{e.preventDefault();if(canSave({saw,think,mood}))onSave({saw:saw.trim(),think:think.trim(),mood})}}>
  <p className="intro journal-prompt">{journalPrompt(day)}</p>
  <label>오늘 {name}에서 본 것<textarea rows={2} value={saw} onChange={e=>setSaw(e.target.value)} placeholder="뉴스, 공시, 움직임… 짧게"/></label>
  <label>그래서 내 생각<textarea rows={2} value={think} onChange={e=>setThink(e.target.value)} placeholder="계속 두는 이유, 걸리는 점"/></label>
  <fieldset className="mood-stickers"><legend>지금 기분</legend>{MOODS.map(m=><label key={m.id} className={mood===m.id?'chosen':''}><input type="radio" name="mood" value={m.id} checked={mood===m.id} onChange={()=>setMood(m.id)}/><span className="sticker" style={{background:MOOD_IMAGES[m.id]?`url(${MOOD_IMAGES[m.id]}) center/cover, ${m.color}`:m.color}}/>{m.label}</label>)}</fieldset>
  <p className="note">한 칸만 채워도 남길 수 있어. 물을 줘도 수익률은 그대로야.</p>
  {past.length>0&&<div className="journal-past"><strong>지난 일지</strong>{past.slice(-2).reverse().map(e=><p key={e.id}><small>{formatDay(e.day)}</small>{[e.saw,e.think].filter(Boolean).join(' · ')||MOODS.find(m=>m.id===e.mood)?.label}</p>)}</div>}
 </form>}
// Fertilizer = a news OX quiz (13.7-8): the news as it happened or turned around, "이게 맞을까?", then what happened and why it matters.
export function NewsQuizView({quiz,answer,onAnswer}:{quiz:NewsQuiz;answer:boolean|null;onAnswer:(o:boolean)=>void}){
 const right=answer!==null&&answer===quiz.truth;
 return <div className="news-quiz">
  <p className="demo-note">모의 뉴스 · 실제 기사 아님</p>
  <blockquote className="news-statement">{quiz.statement}</blockquote>
  <p className="news-ask">이게 맞을까?</p>
  <div className="ox">{([[true,'O'],[false,'X']] as const).map(([o,l])=><button key={l} className={'ox-'+l+(answer===o?' chosen':'')} disabled={answer!==null} aria-label={l==='O'?'O · 맞다':'X · 아니다'} onClick={()=>onAnswer(o)}>{l}</button>)}</div>
  {answer!==null&&<div className={'answer-note news-result '+(right?'right':'wrong')}><strong>{right?<><Check size={15}/>맞았어</>:<><Cross size={15}/>아쉬워</>}</strong><p><b>실제 소식</b> {quiz.fact}</p><p><b>왜 중요해</b> {quiz.why}</p></div>}
 </div>}
// 12.4 luon brings a page back: reread it, pick whether the reason still holds (not whether it paid), one line back.
export function RetroReply({entry,days,onSave}:{entry:JournalEntry;days:number;onSave:(verdict:Verdict,reply:string)=>void}){
 const [verdict,setVerdict]=useState<Verdict|''>(''),[reply,setReply]=useState('');const mood=MOODS.find(m=>m.id===entry.mood);
 return <form id="retro-form" className="retro" onSubmit={e=>{e.preventDefault();if(verdict)onSave(verdict,reply)}}>
  <div className="retro-page"><small>{formatDay(entry.day)} · {days}일 전의 나</small>{entry.saw&&<p><b>본 것</b> {entry.saw}</p>}{entry.think&&<p><b>내 생각</b> {entry.think}</p>}{mood&&<p className="retro-mood"><span className="sticker" style={{background:MOOD_IMAGES[mood.id]?`url(${MOOD_IMAGES[mood.id]}) center/cover, ${mood.color}`:mood.color}}/>{mood.label}</p>}</div>
  <fieldset className="retro-verdict"><legend>그때 이유, 지금도 유효해?</legend>{VERDICTS.map(v=><label key={v.id} className={verdict===v.id?'chosen':''}><input type="radio" name="verdict" value={v.id} checked={verdict===v.id} onChange={()=>setVerdict(v.id)}/>{v.label}</label>)}</fieldset>
  <label>그때의 나에게 한 줄<input type="text" maxLength={80} value={reply} onChange={e=>setReply(e.target.value)} placeholder="지금 보니…"/></label>
  <p className="note">수익률이 아니라, 내 이유가 아직 맞는지로 골라. 답하면 리본에 매듭이 하나 생겨.</p>
 </form>}
