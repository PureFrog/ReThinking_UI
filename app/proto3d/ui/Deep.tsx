'use client';
// W2 땅 속 보기 (docs/brief-wow.md): beside the open ground, what the roots mean. The plain word big, the model small,
// the number, what it looks like down there; tori says it once with the number in it. The cut itself is Roots3D.tsx.
import {rootRows,rootsSay} from '../../core/roots';
import type {Health} from '../../content/health';
import type {Holding} from '../../core/model';
import {LINES,say} from '../../content/analysts';
import {Sheet,Said} from './Sheet';

export function DeepSheet({holding,health,onClose}:{holding:Holding;health:Health;onClose:()=>void}){
  const rows=rootRows(health),{main,extra}=rootsSay(health),vars={name:holding.name,f:health.fscore,o:health.ohlson,d:health.debt};
  const text=say(LINES.roots[main],holding.id,vars)+(extra?' '+say(LINES.roots[extra],holding.id,vars):'');
  return <Sheet kicker="땅 속 · 회사의 진짜 체력" title={holding.name} label="땅 속 보기" onClose={onClose} compact>
    <Said id="tori" name="토리">{text}</Said>
    <ul className="rt-roots" aria-label="뿌리가 보여주는 것">{rows.map(r=><li key={r.id} data-tone={r.tone}>
      <div><strong>{r.word}</strong><small title={r.shows}>{r.model}</small></div>
      <b className="rt-num">{r.value}</b></li>)}</ul>
    <p className="rt-hint" style={{marginTop:8}}>땅 위는 주가, 땅 아래는 재무제표 · 모의 숫자</p>
  </Sheet>;
}
