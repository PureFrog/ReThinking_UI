// 13.7-10 the team's detection model flags a stop-loss moment on a holding; a friend then comes over and asks, in its
// own way, why the player bought it. Only this file knows where the flags come from: today a mock that flags the
// holdings named in '?detect=<id>[,<id>]' (demo and tests); a backend replaces detectionProvider later without touching
// the scene or the UI. A flag is never shown on a tree or on screen.
import type {Holding} from '../core/model';
export type StopLossSignal={id:string;holdingId:number;day:string};
export type DetectionProvider={signals(holdings:Holding[],day:string):StopLossSignal[]};
// one signal per flagged holding per day; holdings no longer in the garden are ignored
export function mockSignals(flagged:number[],holdings:Holding[],day:string):StopLossSignal[]{return holdings.filter(h=>flagged.includes(h.id)).map(h=>({id:h.id+':'+day,holdingId:h.id,day}))}
function flaggedInUrl(){try{return (new URLSearchParams(globalThis.location?.search??'').get('detect')??'').split(',').map(Number).filter(n=>Number.isInteger(n)&&n>0)}catch{return []}}
export const detectionProvider:DetectionProvider={signals:(holdings,day)=>mockSignals(flaggedInUrl(),holdings,day)};
