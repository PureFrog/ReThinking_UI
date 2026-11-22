'use client';
// 피드백 2026-11-22: the teacher in the room (Interior3D) keeps every quiz paper I answered: the question, my answer,
// right or wrong, the answer and the explanation, newest first. "오늘 퀴즈 풀기" goes to the desk (ui/House.tsx).
import {useMemo} from 'react';
import {Sheet} from './Sheet';
import {loadHouse} from './House';
import {QUIZ100,say,KIND_LABEL} from '../../core/quiz100';

export function QuizReview({onClose,onQuiz}:{onClose:()=>void;onQuiz:()=>void}){
  const rows=useMemo(()=>loadHouse().desk.slice().reverse().flatMap(d=>d.stamps.slice().reverse().map(s=>{
    const q=s.id.startsWith('q100:')?QUIZ100.find(x=>x.id===s.id.slice(5)):undefined;return q?{day:d.day,q,s}:null}).filter(x=>x!==null)),[]);
  return <Sheet kicker="선생님 · 지난 퀴즈" title="풀었던 퀴즈 다시 보기" label="지난 퀴즈" onClose={onClose}
    foot={<button type="button" className="rt-btn primary" onClick={onQuiz}>오늘 퀴즈 풀기</button>}>
    {!rows.length&&<p className="rt-hint">아직 푼 퀴즈가 없어요. 오늘 퀴즈부터 풀어 봐요.</p>}
    <ol className="qr-list">{rows.map(({day,q,s},i)=><li key={day+q.id+i} className="qr-item">
      <div className="qr-top"><span className="rt-hint">{day.replaceAll('-','.')} · {KIND_LABEL[q.type]}</span>
        <b className={s.choice===null?'qr-late':s.right?'qr-ok':'qr-ng'}>{s.choice===null?'시간 초과':s.right?'정답':'오답'}</b></div>
      <p className="qr-q">{q.prompt}</p>
      {q.data.statement&&<blockquote className="qr-quote">{q.data.statement}</blockquote>}
      <dl className="qr-dl">
        <div><dt>내 답</dt><dd>{s.choice===null?'—':say(q,s.resp??null).join(' / ')}</dd></div>
        <div><dt>정답</dt><dd>{say(q,q.answer).join(' / ')}</dd></div>
      </dl>
      <p className="qr-why">{q.explanation}</p>
    </li>)}</ol>
  </Sheet>;
}
