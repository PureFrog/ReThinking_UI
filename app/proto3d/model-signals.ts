// The team's model output for the signed-in player (db/migrations/012): 서서히 verdicts per real holding
// (holding_signals, uploaded by investment-evidence-system ops/ui/push_signals.py) and the 반박 results of the talks
// with 보리 (analysis_results, written by ops/ui/analysis_worker.py). Row-level security returns only the player's
// own rows. Loaded rows go into app/core/model-signals.ts, which content/signals.ts reads.
import {supabase,supabaseReady} from './supabase';
import {setVerdicts,setAnalyses,setDrops,type HoldingVerdict,type AnalysisRow,type DropEvent} from '../core/model-signals';

const VERDICT_COLS='code,buy_date,status,verdict,fscore,ohlson_score,dupont_score,sum_total,eval_date,financial_as_of,price_as_of,release_id,evidence';
const RESULT_COLS='request_id,company_id,status,decision,result,alert_date,as_of,analyzed_at,dialogue';  // dialogue: db/migrations/020
const DROP_COLS='code,drop_date,last_hit_date,n_hit_days,ret_pct,index_ret_pct,ar_pct,sigma_ar_pct,z,market_adjusted';

// returns how many verdict rows and finished analyses came back (0/0 when signed out or the tables are not there yet)
export async function loadModelSignals():Promise<{verdicts:number;analyses:number;drops:number}>{
  if(!supabaseReady)return {verdicts:0,analyses:0,drops:0};
  const [v,a,d]=await Promise.all([
    supabase().from('holding_signals').select(VERDICT_COLS).limit(1000),
    supabase().from('analysis_results').select(RESULT_COLS).eq('status','done').order('analyzed_at',{ascending:false}).limit(200),
    // the 급락 events of the 120 stocks (db/migrations/013, market information: any signed-in player reads all of it)
    supabase().from('drop_events').select(DROP_COLS).order('drop_date',{ascending:false}).limit(2000)]);
  const vs=v.error||!v.data?[]:(v.data as unknown as HoldingVerdict[]),as=a.error||!a.data?[]:(a.data as unknown as AnalysisRow[]);
  // drops stay "not loaded" when the table cannot be read (not migrated yet): the app's own chart note keeps working
  const ds=d.error||!d.data?null:(d.data as unknown as DropEvent[]).map(r=>({...r,
    ret_pct:num(r.ret_pct),index_ret_pct:num(r.index_ret_pct),ar_pct:num(r.ar_pct),sigma_ar_pct:num(r.sigma_ar_pct),z:num(r.z)}));
  setVerdicts(vs);setAnalyses(as);setDrops(ds);
  return {verdicts:vs.length,analyses:as.length,drops:ds?.length??-1};
}
// numeric columns come back as strings from PostgREST
const num=(v:unknown)=>v==null?null:Number.isFinite(Number(v))?Number(v):null;

// e2e (tests/e2e/proto3d-model-signals.spec.ts): a page can stand in for the server with window.__modelSignalFixture
export type ModelSignalFixture={verdicts:HoldingVerdict[];analyses?:AnalysisRow[];drops?:DropEvent[]};
export const fixtureModelSignals=(f:ModelSignalFixture)=>async()=>{setVerdicts(f.verdicts);setAnalyses(f.analyses??[]);setDrops(f.drops??null);
  return {verdicts:f.verdicts.length,analyses:(f.analyses??[]).length,drops:f.drops?.length??-1}};
