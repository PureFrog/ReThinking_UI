// The handshake between a brokerage app and ReThink opened inside it as a web view (멘토링 2026-11-22). Modelled on a
// real embedding: the host (the made-up MTS, app/mts/) opens /?embed=mts in a full-screen frame; ReThink says it is
// ready; the host answers with the balance in the standard lines (core/holdings-in.ts). No picture, no typing.
// A real broker's web view would carry the same two messages over its JS bridge instead of window.postMessage.
// Only messages from the same origin and from the expected window are read (checked by the caller).
import {cleanInput,type HoldingsInput} from './holdings-in';
export const EMBED_MSG={ready:'rethink:ready',holdings:'rethink:holdings'} as const;
export type ReadyMsg={type:typeof EMBED_MSG.ready;v:1};
export type HoldingsMsg={type:typeof EMBED_MSG.holdings;v:1;input:HoldingsInput};
export const readyMsg=():ReadyMsg=>({type:EMBED_MSG.ready,v:1});
export const holdingsMsg=(input:HoldingsInput):HoldingsMsg=>({type:EMBED_MSG.holdings,v:1,input});
export function readHoldingsMsg(data:unknown):HoldingsInput|null{
  if(!data||typeof data!=='object')return null;const d=data as Record<string,unknown>;
  if(d.type!==EMBED_MSG.holdings||d.v!==1)return null;
  return cleanInput(d.input);
}
export const isReadyMsg=(data:unknown)=>!!data&&typeof data==='object'&&(data as Record<string,unknown>).type===EMBED_MSG.ready;
