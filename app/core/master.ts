// The master account (db/migrations/008_master.sql, feedback 11-17 "다 풀어"): the owner tries everything. The server
// says who it is (is_master rpc); the app keeps it here for this visit only, never in the save, so a removed row closes it
// again on the next visit. What it opens: every wardrobe piece and colour (core/wardrobe.ts WearCtx.all), every trust
// stage's notes, coins that never run short (Proto3D tops them back up after a spend, core/ledger.ts MASTER), and later
// every quest-unlocked feature (docs/quest-journal.md 6장).
let on=false;
export const setMasterOn=(v:boolean)=>{on=v};
export const masterOn=()=>on;
// a trust stage as the screens should treat it
export const stageFor=(stage:number)=>on?Math.max(stage,99):stage;
