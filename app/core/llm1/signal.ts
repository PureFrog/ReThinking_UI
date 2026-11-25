// /signal 종목명 (정균 원본 chat.py의 명령, 2026-11-24): 평상시 대화를 그 종목의 탐지 모드로 바꾼다. 루온에게 종목을 고를 때도
// 같은 길로 간다. 이름 → 종목 코드는 먼저 플레이어의 정원 종목(앱이 매 호출에 보내는 holdings)에서, 없으면 상장 목록
// (core/jigi/stocks.ts: 대형주 + 코스닥120)에서 찾는다. 상장 목록에만 있으면 "정원에 없는 종목"이다(탐지는 보유 종목만).
export type SignalHolding={company_id:string;name:string|null};
export type Listed={code:string;name:string};
export type Resolved={status:'held';company_id:string;name:string}|{status:'not-held';company_id:string;name:string}|{status:'unknown';query:string};

// "/signal 삼성전자", "/signal 005930", "/SIGNAL  에코프로 " → the name; anything else → null
export function parseSignal(text:string):string|null{
  const m=/^\s*\/signal(?:\s+([\s\S]*))?$/i.exec(text);if(!m)return null;
  return (m[1]??'').trim();
}
// 띄어쓰기·대소문자·(주)·㈜ 무시
export const norm=(s:string)=>s.normalize('NFKC').replace(/\(주\)|㈜|주식회사/g,'').replace(/[\s·.\-_]/g,'').toLowerCase();

export function resolveStock(query:string,holdings:SignalHolding[],listed:Listed[]):Resolved{
  const q=norm(query);if(!q)return {status:'unknown',query};
  const named=holdings.map(h=>({h,n:norm(h.name??'')}));
  // the garden first: code, exact name, then a name that starts with / contains what was typed if only one tree does
  const exact=holdings.find(h=>norm(h.company_id)===q)??named.find(x=>x.n===q)?.h;
  if(exact)return {status:'held',company_id:exact.company_id,name:exact.name??exact.company_id};
  for(const test of [(n:string)=>n.startsWith(q),(n:string)=>n.includes(q)]){
    const hits=named.filter(x=>x.n&&test(x.n));if(hits.length===1)return {status:'held',company_id:hits[0].h.company_id,name:hits[0].h.name??hits[0].h.company_id};
    if(hits.length>1)break}
  // the listed stocks: is it a stock at all (then it is just not in this garden)
  const l=listed.find(s=>s.code===q||norm(s.name)===q);
  if(l){const mine=holdings.find(h=>h.company_id===l.code);return mine?{status:'held',company_id:l.code,name:mine.name??l.name}:{status:'not-held',company_id:l.code,name:l.name}}
  return {status:'unknown',query};
}

// what the character says when it cannot open the talk (no LLM call)
export const SIGNAL_LINES:Record<'bori'|'luon',{empty:string;notHeld:(n:string)=>string;unknown:(q:string)=>string}>={
  bori:{empty:'어떤 종목? /signal 뒤에 종목 이름을 붙여 줘.',notHeld:n=>`어, ${n}은 네 정원에 없는 종목이야. 정원에 있는 종목으로 얘기하자.`,
    unknown:q=>`'${q}'그런 종목은 못 찾겠어. 이름을 한 번만 다시 써 줄래?`},
  luon:{empty:'어느 종목? 이름을 붙여 줘.',notHeld:n=>`${n}, 네 정원엔 없는 종목이야. 갖고 있는 것부터 보자.`,
    unknown:q=>`…'${q}'. 그런 종목은 안 보여. 이름 다시 확인해 줄래?`},
};
