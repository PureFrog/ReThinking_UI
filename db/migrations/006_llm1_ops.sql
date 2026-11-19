-- 006: 보리 대화 운영 로그 (정균 1번 LLM ops_log.jsonl). Run once in Supabase → SQL Editor after 005.
-- One row per model turn: mode, model, how long it took, format/network errors, what the profile and evidence checks
-- accepted or refused, the stop-loss talk status. No message text (app/core/llm1/engine.ts opsEntry). Service role only.
create table if not exists llm1_ops (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references players(id) on delete cascade,
  at          timestamptz not null default now(),
  entry       jsonb not null
);
create index if not exists llm1_ops_at on llm1_ops (at desc);
alter table llm1_ops enable row level security;
-- no policies: only the edge function (service role) writes it; read it from the dashboard
