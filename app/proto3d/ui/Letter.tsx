'use client';
// The monthly letter (core/letter.ts) as a page in the notebook: the month in numbers, my best and roughest call, the
// stamps, and a line from each analyst in their own voice (tori: the count, moa: quick, luon: a question back).
import {monthLabel,type Letter} from '../../core/letter';
import {Sheet,Said,Num} from './Sheet';
const toriLine=(l:Letter)=>!l.judged&&!l.graded?'이번 달은 기록이 없어. 판단 하나부터 해 보자.':l.judged?`판단 ${l.judged}개, 채점 ${l.graded}개. 확신 4~5는 ${l.sure}개였어.`:'새 판단은 없고 채점만 나왔어.';
const moaLine=(l:Letter)=>l.hitRate===null?'이번 달은 확인한 채점이 없어.':l.hitRate>=60?`어, 적중률 ${l.hitRate}%야. 괜찮은데.`:`적중률 ${l.hitRate}%. 빗나간 것부터 다시 보자.`;
const luonLine=(l:Letter)=>l.kept+l.changed===0?'내 반박은 다 넘겼더라. 다음엔 한 번쯤 받아쳐 봐.':`반박에 버틴 게 ${l.kept}번, 이유를 고친 게 ${l.changed}번. 버틴 것들, 맞았어?`;
export function LetterSheet({letter,onClose}:{letter:Letter;onClose:()=>void}){
  const l=letter,jg=l.jigi&&(l.jigi.journals+l.jigi.verdicts)>0?l.jigi:null;
  return <Sheet kicker="월간 리포트" title={`${monthLabel(l.month)} 리포트`} label="월간 리포트" onClose={onClose}>
    <div className="rt-letter">
      {/* 지기 first (docs/jigi.md): my journals, the verdicts that came in, the reviews; the old judgments get one line */}
      {jg&&<><div className="rt-grid">
        <div className="rt-cell"><span>일지</span><b className="rt-num">{jg.journals}</b></div>
        <div className="rt-cell"><span>가설 판정</span><b className="rt-num">{jg.hits} / {jg.verdicts}</b><small>적중 / 판정</small></div>
        <div className="rt-cell"><span>복기</span><b className="rt-num">{jg.reviews}</b></div>
        <div className="rt-cell"><span>케이스 · 되감기</span><b className="rt-num">{l.cases} · {l.rewinds}</b></div></div>
        <Said id="tori" name="토리" style={{marginTop:14}}>{jg.verdicts?`판정 ${jg.verdicts}개 중 ${jg.hits}개가 적어 둔 방향대로 갔어. 숫자가 적으니까 한 달로 실력을 말하긴 일러.`:`일지 ${jg.journals}편. 판정은 기간이 끝나면 나와.`}</Said>
        {jg.verdicts>jg.reviews&&<Said id="luon" name="루온">{`판정 나온 것 중에 복기 안 한 게 있어. 맞은 것도 이유까지 맞았는지 봐.`}</Said>}
        {(l.judged+l.graded)>0&&<p className="rt-hint" style={{marginTop:10}}>이전 판단 · 채점 {l.graded}건{l.graded?`, 적중 ${l.hits}건`:''}</p>}
        {l.stamps.length>0&&<p className="rt-hint" style={{marginTop:6}}>달성한 업적 · {l.stamps.join(', ')}</p>}
      </>}
      {!jg&&<>
      <div className="rt-grid">
        <div className="rt-cell"><span>판단</span><b className="rt-num">{l.judged}</b></div>
        <div className="rt-cell"><span>적중률</span><b className="rt-num">{l.hitRate===null?'—':<>{l.hitRate}<span className="rt-unit">%</span></>}</b><small>{l.hits} / {l.graded}</small></div>
        <div className="rt-cell"><span>확신 보정</span><b className="rt-num">{l.calibration??'—'}</b></div>
        <div className="rt-cell"><span>케이스 · 되감기</span><b className="rt-num">{l.cases} · {l.rewinds}</b></div>
        {l.expeditions>0&&<div className="rt-cell"><span>주간 챌린지</span><b className="rt-num">{l.expeditions}</b><small>최고 {l.bestRun}</small></div>}
      </div>
      {l.best&&<div className="rt-note" style={{marginTop:14}}><div className="rt-kicker">이달의 판단</div>
        <p className="rt-headline">{l.best.name} · {l.best.choice}</p><p className="rt-say">{l.best.mark}일 뒤 <b className="rt-num"><Num v={l.best.after}/></b> · 점수 +{l.best.points}</p></div>}
      {l.roughest&&<div className="rt-note"><div className="rt-kicker">다시 볼 판단</div>
        <p className="rt-headline">{l.roughest.name} · {l.roughest.choice}</p><p className="rt-say">{l.roughest.mark}일 뒤 <b className="rt-num"><Num v={l.roughest.after}/></b> · 점수 {l.roughest.points}</p></div>}
      {l.stamps.length>0&&<p className="rt-hint" style={{marginTop:10}}>달성한 업적 · {l.stamps.join(', ')}</p>}
      <Said id="tori" name="토리" style={{marginTop:14}}>{toriLine(l)}</Said>
      <Said id="moa" name="모아">{moaLine(l)}</Said>
      <Said id="luon" name="루온">{luonLine(l)}</Said>
      </>}
      <p className="rt-hint" style={{marginTop:12}}>수익이 아닌 판단 기록 리포트 · 모의 데이터</p>
    </div>
  </Sheet>;
}
