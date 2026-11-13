'use client';
// The monthly letter (core/letter.ts) as a page in the notebook: the month in numbers, my best and roughest call, the
// stamps, and a line from each analyst in their own voice (tori: the count, moa: quick, luon: a question back).
import {monthLabel,type Letter} from '../../core/letter';
import {Sheet,Said,Num} from './Sheet';
const toriLine=(l:Letter)=>!l.judged&&!l.graded?'아직 조용한 달이야. 판단 하나면 시작이야.':l.judged?`판단 ${l.judged}개, 판정 ${l.graded}개. 확신 4~5를 준 게 ${l.sure}개였어.`:'판단은 없었고 판정만 왔어. 기록은 계속 쌓이고 있어.';
const moaLine=(l:Letter)=>l.hitRate===null?'이번 달은 열어 본 판정이 없네. 다음 달엔 같이 열자!':l.hitRate>=60?`어, ${l.hitRate}% 맞았어! 이 감 기억해 둬.`:`${l.hitRate}%. 빗나간 것부터 같이 다시 보자.`;
const luonLine=(l:Letter)=>l.kept+l.changed===0?'내 반박은 다 넘겼더라. 다음 달엔 하나쯤 붙어 보자.':`반박에 버틴 게 ${l.kept}번, 이유를 고친 게 ${l.changed}번. 버틴 것들, 맞았어?`;
export function LetterSheet({letter,onClose}:{letter:Letter;onClose:()=>void}){
  const l=letter;
  return <Sheet kicker="한 달 편지" title={`${monthLabel(l.month)}의 판단`} label="한 달 편지" onClose={onClose}>
    <div className="rt-letter">
      <div className="rt-grid">
        <div className="rt-cell"><span>판단</span><b className="rt-num">{l.judged}</b></div>
        <div className="rt-cell"><span>판정 적중</span><b className="rt-num">{l.hitRate===null?'—':<>{l.hitRate}<span className="rt-unit">%</span></>}</b><small>{l.hits} / {l.graded}</small></div>
        <div className="rt-cell"><span>확신 보정</span><b className="rt-num">{l.calibration??'—'}</b></div>
        <div className="rt-cell"><span>케이스 · 되감기</span><b className="rt-num">{l.cases} · {l.rewinds}</b></div>
      </div>
      {l.best&&<div className="rt-note" style={{marginTop:14}}><div className="rt-kicker">이달의 판단</div>
        <p className="rt-headline">{l.best.name} · {l.best.choice}</p><p className="rt-say">{l.best.mark}일 뒤 <b className="rt-num"><Num v={l.best.after}/></b> · 점수 +{l.best.points}</p></div>}
      {l.roughest&&<div className="rt-note"><div className="rt-kicker">다시 볼 판단</div>
        <p className="rt-headline">{l.roughest.name} · {l.roughest.choice}</p><p className="rt-say">{l.roughest.mark}일 뒤 <b className="rt-num"><Num v={l.roughest.after}/></b> · 점수 {l.roughest.points}</p></div>}
      {l.stamps.length>0&&<p className="rt-hint" style={{marginTop:10}}>받은 도장 · {l.stamps.join(', ')}</p>}
      <Said id="tori" name="토리" style={{marginTop:14}}>{toriLine(l)}</Said>
      <Said id="moa" name="모아">{moaLine(l)}</Said>
      <Said id="luon" name="루온">{luonLine(l)}</Said>
      <p className="rt-hint" style={{marginTop:12}}>수익이 아니라 판단을 적은 편지야 · 모의 데이터</p>
    </div>
  </Sheet>;
}
