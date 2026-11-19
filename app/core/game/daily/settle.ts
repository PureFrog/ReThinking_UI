// Settling a finished run: the two scores (투자 성과, 일지 점수), the XP by policy v1, and the award into
// investor_progress — only for a ranked run finished on its own day. A practice run, or one finished after midnight,
// gets its scores but no XP. On the server this is `quest-settle` (design 8): same steps, the ledger is the truth and
// investor_progress is recomputed from it.
import {award,defOf,performance,xpFor,type DailyPack,type DailyRun,type InvestorProgress,type RunResult} from './model';
import {gradeRun,TRIAL_JUDGE,type Judge} from './judge';
import {judgeForecasts,type Forecast} from './forecast';
// forecasts: the server's extract (A) per scene, when it ran; the word rule otherwise
export function settle(pack:DailyPack,run:DailyRun,progress:InvestorProgress,today:string,now:number,judge:Judge=TRIAL_JUDGE,forecasts?:Record<string,Forecast>):{run:DailyRun;progress:InvestorProgress}{
  if(run.finishedAt!==null||run.decisions.length<pack.scenes.length)return {run,progress};
  const perf=performance(pack,run.decisions),g=gradeRun(pack,defOf(run),run.decisions,judge);
  const late=run.day!==today,ranked=run.mode==='ranked'&&!late;
  const x=xpFor(progress.total_xp,perf.excess,g.journal);
  const xp=ranked?x:{...x,base:0,market:0,writing:0,bonus:0,xp:0};
  const fc=judgeForecasts(pack,run,forecasts);
  const result:RunResult={ret:perf.ret,holdRet:perf.holdRet,excess:perf.excess,journal:g.journal,scenes:g.scenes,xp:{...xp,startXp:progress.total_xp},judge:judge.id,late,forecast:fc};
  const done:DailyRun={...run,mode:ranked?'ranked':'practice',stage:'result',finishedAt:now,result};
  const next=ranked?award(progress,{quest:run.quest,excess:Math.round(perf.excess*100)/100,journal:g.journal,market:xp.market,writing:xp.writing,bonus:xp.bonus,xp:xp.xp,dailyId:run.dailyId,runId:run.id,at:now}):progress;
  return {run:done,progress:next};
}

// the judge is not back yet: settle the returns only (no score, no XP); the run still counts as finished, so the next
// quest opens while the assessment waits (design 10: 완료와 점수 정산을 분리)
export function settlePending(pack:DailyPack,run:DailyRun,progress:InvestorProgress,today:string,now:number,forecasts?:Record<string,Forecast>):DailyRun{
  const perf=performance(pack,run.decisions),late=run.day!==today,ranked=run.mode==='ranked'&&!late;
  const xp={...xpFor(progress.total_xp,perf.excess,0),met:false,base:0,market:0,writing:0,bonus:0,xp:0};
  return {...run,mode:ranked?'ranked':'practice',stage:'result',finishedAt:now,result:{ret:perf.ret,holdRet:perf.holdRet,excess:perf.excess,journal:0,scenes:[],
    xp:{...xp,startXp:progress.total_xp},judge:'pending',late,pending:true,forecast:judgeForecasts(pack,run,forecasts)}};
}

// the result in one sentence (design 7 call C): the rule sentence is the facts; the server's model may only reword them
// (no number, cause or advice of its own — llm-tasks.ts checkExplain), and the rule sentence stands when it cannot
const p2=(x:number)=>`${x>=0?'+':'−'}${Math.abs(x).toFixed(2)}`;
export function summaryOf(r:RunResult,dims?:{label:string;grade:number}[]):string{
  const vsHold=`계속 보유보다 ${p2(r.excess)}%p ${r.excess>=0?'앞섰고':'뒤졌고'}`;
  if(r.pending)return `${vsHold}, 일지 점수는 아직 평가 중이에요.`;
  const weak=dims&&dims.length?[...dims].sort((a,b)=>a.grade-b.grade)[0]:null;
  return `${vsHold}, 일지 점수는 ${r.journal}점이에요.${weak&&weak.grade<3?` 가장 보완할 축은 ${weak.label}이에요.`:''}`;
}
