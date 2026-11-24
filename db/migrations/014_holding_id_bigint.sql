-- journals.holding_id was int (32-bit), but a holding added from the app gets a Date.now() id (e.g. 1795485893666),
-- so a journal written on such a tree failed the whole journals upsert (app/proto3d/sync.ts pushJigi gives up quietly)
-- and no journal or hypothesis reached the server after it (found 2026-11-24: journals stuck at 21, hypotheses 0).
-- Safe to run again.
alter table journals alter column holding_id type bigint;
