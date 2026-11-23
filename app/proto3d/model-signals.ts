// The team's model output for the signed-in player (db/migrations/012): 서서히 verdicts per real holding
// (holding_signals, uploaded by investment-evidence-system ops/ui/push_signals.py) and the 반박 results of the talks
// with 보리 (analysis_results, written by ops/ui/analysis_worker.py). Row-level security returns only the player's
// own rows. Loaded rows go into app/core/model-signals.ts, which content/signals.ts reads.
import {supabase,supabaseReady} from './supabase';
import {setVerdicts,setAnalyses,type HoldingVerdict,type AnalysisRow} from '../core/model-signals';

const VERDICT_COLS='code,buy_date,status,verdict,fscore,ohlson_score,dupont_score,sum_total,eval_date,financial_as_of,price_as_of,release_id,evidence';
const RESULT_COLS='request_id,company_id,status,decision,result,alert_date,as_of,analyzed_at';

// returns how many verdict rows and finished analyses came back (0/0 when signed out or the tables are not there yet)
export async function loadModelSignals():Promise<{verdicts:number;analyses:number}>{
  if(!supabaseReady)return {verdicts:0,analyses:0};
  const [v,a]=await Promise.all([
    supabase().from('holding_signals').select(VERDICT_COLS).limit(1000),
    supabase().from('analysis_results').select(RESULT_COLS).eq('status','done').order('analyzed_at',{ascending:false}).limit(200)]);
  const vs=v.error||!v.data?[]:(v.data as unknown as HoldingVerdict[]),as=a.error||!a.data?[]:(a.data as unknown as AnalysisRow[]);
  setVerdicts(vs);setAnalyses(as);
  return {verdicts:vs.length,analyses:as.length};
}

// e2e (tests/e2e/proto3d-model-signals.spec.ts): a page can stand in for the server with window.__modelSignalFixture
export type ModelSignalFixture={verdicts:HoldingVerdict[];analyses?:AnalysisRow[]};
export const fixtureModelSignals=(f:ModelSignalFixture)=>async()=>{setVerdicts(f.verdicts);setAnalyses(f.analyses??[]);
  return {verdicts:f.verdicts.length,analyses:(f.analyses??[]).length}};
