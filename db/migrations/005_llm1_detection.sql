-- 005: 보리 손절 신호 대화 (정균 1번 LLM 2단계). Run once in Supabase → SQL Editor after 004.
-- llm1_docs gets a third collection, 'detection' (the stop-loss signals, the evidence-collection sessions and the
-- delivery jobs of one player). analysis_inbox is the receiving side of the hand-off to the analysis model: one row per
-- request_id; the function answers "persisted" only when the stored payload_hash matches (design 10.1). Service role only.
alter table llm1_docs drop constraint if exists llm1_docs_coll_check;
alter table llm1_docs add constraint llm1_docs_coll_check check (coll in ('conversation','profile','detection'));

create table if not exists analysis_inbox (
  request_id    text primary key,
  player_id     uuid not null references players(id) on delete cascade,
  payload_hash  text not null,
  route         text not null check (route in ('argument_analysis','insufficient_input')),
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  analyzed_at   timestamptz
);
alter table analysis_inbox enable row level security;
-- no policies: only the edge function (service role) and the analysis worker read or write it
