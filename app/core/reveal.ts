// The grade reveal as a short sequence (redesign 4-2, the moment the loop is built around): the move after the judgment
// counts up from 0, then the verdict stamps down, then the score and the analysts' lines come in. The lengths live in
// TIMING (core/timing.ts); this file only says where a given moment of the sequence is.
import {TIMING} from './timing';
export type RevealPhase='count'|'stamp'|'done';
export const REVEAL_TOTAL=TIMING.revealCount+TIMING.revealStamp;
export function revealPhase(ms:number):RevealPhase{return ms<TIMING.revealCount?'count':ms<REVEAL_TOTAL?'stamp':'done'}
// the number shown while counting: eases out (fast first, settling on the real value), rounded to one decimal
export function revealValue(final:number,ms:number){
  const t=Math.min(1,Math.max(0,ms/TIMING.revealCount)),e=1-Math.pow(1-t,3);
  return Math.round(final*e*10)/10||0;// never -0 (it would show as "-0%")
}
