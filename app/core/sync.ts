// Which garden wins when a signed-in player opens the app (app/proto3d/sync.ts does the moving): the one on this device,
// or the one kept on the server (db/migrations/002_saves.sql garden_saves). One whole save per player, newest wins;
// an empty garden never overwrites a planted one. No merging: two phones played at once keep the later one.
export type Kept={body:unknown;at:string}|null;
// a save worth keeping: something planted or written
export const planted=(body:unknown)=>{const b=body as {holdings?:unknown[]|null;judgments?:unknown[]}|null;return !!b&&(!!b.holdings?.length||!!b.judgments?.length)};
export type SyncPlan='keep-local-push'|'take-remote'|'nothing';
export function syncPlan(local:Kept,remote:Kept):SyncPlan{
  const l=local&&planted(local.body)?local:null,r=remote&&planted(remote.body)?remote:null;
  if(!l&&!r)return 'nothing';
  if(!r)return 'keep-local-push';
  if(!l)return 'take-remote';
  if(Date.parse(r.at)>Date.parse(l.at))return 'take-remote';
  return Date.parse(l.at)>Date.parse(r.at)?'keep-local-push':'nothing';
}
// a save on the server goes back to its owner only (RLS) and holds no keys, amounts or trades beyond the garden itself
export const SYNC={pushAfter:2500/* ms of quiet before the latest save goes up */};
