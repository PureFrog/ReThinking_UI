// Builds a 오늘의 관측소 pack from an editor's draft (daily_quest_design 7 "편집·발행 파이프라인"), on the content machine.
//   node tools/content/build-pack.mjs [draft-module] [--out content/packs]
// draft-module: a TS/JS module exporting DRAFT (EditorDraft) and OBSERVATIONS (the evidence bundle); default: the
// sample case (app/content/daily/solbit-sources.ts). Each source is live when its settings are in the environment
// (SEC_USER_AGENT, MARKET_DATA_URL/KEY, CORPORATE_ACTIONS_URL/KEY, NEWS_API_URL/KEY, MACRO_API_URL/KEY, POLICY_SOURCE_URL,
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for the master registry, LLM_API_KEY) and the fixture otherwise; keys are
// read from the environment only and never written anywhere. Writes <out>/<pack>-v<version>.json (only when the report
// has no error), <out>/<pack>-v<version>.report.json always. Upload/publish goes through db/functions/quest-content.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,rmSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const {build}=createRequire(createRequire(import.meta.url).resolve('vite'))('esbuild');
const args=process.argv.slice(2),outIdx=args.indexOf('--out'),out=resolve(outIdx>=0?args[outIdx+1]:'content/packs');
const draftModule=resolve(args.find((a,i)=>!a.startsWith('--')&&i!==outIdx+1)??'app/content/daily/solbit-sources.ts');
const dir=mkdtempSync(join(tmpdir(),'rethink-pack-'));
const entry=join(dir,'entry.ts');
writeFileSync(entry,`import * as D from ${JSON.stringify(draftModule)};
import {providersFor} from ${JSON.stringify(resolve('app/content/daily/providers.ts'))};
import {gather,buildPack,publishable,draftCards} from ${JSON.stringify(resolve('app/core/content/pipeline.ts'))};
export async function run(env){const ctx={fetch,env:k=>env[k],now:()=>Date.now()};const {providers,live}=providersFor(ctx);
  const d0=D.DRAFT??D.SOLBIT_DRAFT,obs=D.OBSERVATIONS??D.SOLBIT_OBSERVATIONS;
  const g=await gather(providers,d0,obs);
  // cards marked llm get the editing model's first draft (checked; always flagged for review)
  const llmd=await draftCards(providers.llm,d0,obs,g.principle?.statementKo??'');const r=buildPack(llmd.draft,g);const issues=[...llmd.issues,...r.issues];
  return {...r,issues,live,ok:publishable(issues),draft:{id:d0.packId,version:d0.version},bundle:{draft:llmd.draft,observations:obs,gathered:g}}}`);
try{
  await build({entryPoints:[entry],bundle:true,format:'esm',platform:'node',target:'node22',outfile:join(dir,'entry.mjs'),logLevel:'error'});
  const {run}=await import(pathToFileURL(join(dir,'entry.mjs')).href);
  const r=await run(process.env);
  mkdirSync(out,{recursive:true});
  const base=join(out,`${r.draft.id}-v${r.draft.version}`);
  // the editor screen's file (/editor): draft + evidence + what the sources returned, checks re-run without keys
  writeFileSync(base+'.bundle.json',JSON.stringify(r.bundle));
  writeFileSync(base+'.report.json',JSON.stringify({builtAt:new Date().toISOString(),live:r.live,ok:r.ok,issues:r.issues},null,1));
  if(r.ok&&r.pack)writeFileSync(base+'.json',JSON.stringify(r.pack));
  console.log(`${r.ok?'publishable':'NOT publishable'} · ${r.issues.filter(i=>i.level==='error').length} errors · ${r.issues.filter(i=>i.level==='warning').length} warnings`);
  console.log('live sources:',Object.entries(r.live).filter(([,v])=>v).map(([k])=>k).join(', ')||'none (fixtures)');
  for(const i of r.issues)console.log(`  ${i.level==='error'?'✘':'·'} [${i.code}] ${i.where}: ${i.message}`);
  console.log(`→ ${base}.report.json, ${base}.bundle.json (open it in /editor)${r.ok?` and ${base}.json`:''}`);
  process.exitCode=r.ok?0:1;
}finally{rmSync(dir,{recursive:true,force:true})}
