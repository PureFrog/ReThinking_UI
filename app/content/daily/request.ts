// The request that arrives on a device with no server (local play, the demo): one sample request, the same every day
// (feedback 2026-11-19: 미래 과제는 앱에 두지 않는다 — the app holds this one and nothing after it). Signed in, the
// server's quest-play `today` hands out the real one instead. It is 입문 (feedback F2): the target and the period are
// given, the player picks the direction and writes one line on why; its pack is 단풍식품 (content/daily/packs.ts).
import type {DailyRun,QuestDef} from '../../core/game/daily/model';
export const SAMPLE_REQUEST:QuestDef={id:'sample-intro',name:'가격표 뒤의 고객',tier:'입문',teaches:'방향 고르고 한 줄 쓰기',level:1,fields:['hypo'],aid:{target:'given',period:'given'}};
// today's request on this device and where it stands: not started, being played, or finished today
export function localToday(runs:DailyRun[],day:string){
  const mine=runs.filter(r=>r.day===day&&r.quest===SAMPLE_REQUEST.id);
  const open=[...mine].reverse().find(r=>r.finishedAt===null)??null,done=[...mine].reverse().find(r=>r.finishedAt!==null)??null;
  return {def:SAMPLE_REQUEST,open,done};
}
