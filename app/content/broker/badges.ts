// The badges beside a stock on the MTS balance (멘토링 2026-11-22): the same model notes the garden shows
// (content/signals.ts signalProvider), read on the same lines the garden will plant, so a badge on the MTS is always
// the note the analyst opens with inside. Only loss signals get a badge. A badge names what the model saw; it never
// says to buy or sell.
import {stdToHoldings,type StdHolding} from '../../core/holdings-in';
import {signalProvider} from '../signals';
import {kindOf} from '../portfolio';
import type {ModelId} from '../analysts';

export const BADGE:Record<ModelId,string>={crash:'급락 감지',gradual:'서서히 악화',ohlson:'부실 위험',fscore:'재무 체력 낮음',dupont:'수익성 출처',rebuttal:'반박'};
export type Badge={code:string;model:ModelId;label:string;headline:string};
export function badgesFor(list:StdHolding[],today:string):Record<string,Badge>{
  const {holdings}=stdToHoldings([],list,list.map((_,i)=>i),kindOf,today,1);
  const out:Record<string,Badge>={};
  for(const s of signalProvider.today(holdings,today)){if(!s.loss)continue;const h=holdings.find(x=>x.id===s.holdingId);
    if(h?.code&&!out[h.code])out[h.code]={code:h.code,model:s.model,label:BADGE[s.model],headline:s.headline}}
  return out;
}
