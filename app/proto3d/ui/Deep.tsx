'use client';
// W2 땅 속 보기 (docs/brief-wow.md): beside the open ground, what the roots mean. The plain word big, the model small,
// the number, what it looks like down there; tori says it once with the number in it. The cut itself is Roots3D.tsx.
import {rootRows,rootsSay} from '../../core/roots';
import type {Health} from '../../content/health';
import type {Holding} from '../../core/model';
import {LINES,say} from '../../content/analysts';
import {Sheet,Said} from './Sheet';
import {verdictRows,NOT_COVERED,NO_SIGNAL,type HoldingVerdict} from '../../core/model-signals';

// a real holding: the team's verdict (or why there is none), never the mock roots
function RealDeep({holding,row,onClose}:{holding:Holding;row:HoldingVerdict|null;onClose:()=>void}){
  const has=row&&(row.status==='available'||row.status==='held'||row.status==='stale');
  const text=has?(row!.verdict==='Yes'?'세 장부의 위험을 합치니 선을 넘었어.':row!.verdict==='주의'?'한 장부가 살 때보다 나빠졌어. 나머지는 버텨.':
    row!.verdict==='유보'?'계산된 장부가 둘이 안 돼서 판단을 미뤘어.':'살 때와 비교해서 크게 나빠진 장부는 없어.')
    :row?.status==='not_covered'?NOT_COVERED:NO_SIGNAL;
  return <Sheet kicker="재무 체력" title={holding.name} label="재무 체력" onClose={onClose} compact>
    <Said id="tori" name="토리">{text}</Said>
    {has&&<ul className="rt-roots" aria-label="재무 지표" data-source="model">{verdictRows(row!).map(r=><li key={r.id} data-tone={r.tone}>
      <div><strong>{r.word}</strong><small>{r.model}</small></div>
      <b className="rt-num">{r.value}</b></li>)}</ul>}
    <p className="rt-hint" style={{marginTop:8}}>{has?`살 때(${holding.date}) 대비 · 재무 기준 ${row!.financial_as_of??'-'}${row!.status==='stale'?' · 갱신 대기':''}`:'팀 모델 결과'}</p>
  </Sheet>;
}

export function DeepSheet({holding,health,row,onClose}:{holding:Holding;health:Health;row?:HoldingVerdict|null;onClose:()=>void}){
  if(holding.real||holding.virtual)return <RealDeep holding={holding} row={row??null} onClose={onClose}/>;
  const rows=rootRows(health),{main,extra}=rootsSay(health),vars={name:holding.name,f:health.fscore,o:health.ohlson,d:health.debt};
  const text=say(LINES.roots[main],holding.id,vars)+(extra?' '+say(LINES.roots[extra],holding.id,vars):'');
  return <Sheet kicker="재무 체력" title={holding.name} label="재무 체력" onClose={onClose} compact>
    <Said id="tori" name="토리">{text}</Said>
    <ul className="rt-roots" aria-label="재무 지표">{rows.map(r=><li key={r.id} data-tone={r.tone}>
      <div><strong>{r.word}</strong><small title={r.shows}>{r.model}</small></div>
      <b className="rt-num">{r.value}</b></li>)}</ul>
    <p className="rt-hint" style={{marginTop:8}}>재무제표 숫자 · 모의 데이터</p>
  </Sheet>;
}
