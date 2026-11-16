-- 004: 보리 대화 (정균 1번 LLM, ported to db/functions/bori-talk). Run once in Supabase → SQL Editor after 003.
-- One row per player and collection: 'conversation' (recent messages, temporary state, visit count) and 'profile'
-- (the user JSON 보리 learns from the player's own words — design 5). Only the function (service role) writes them;
-- the player can read their own profile (to see and delete what 보리 remembers).
create table if not exists llm1_docs (
  player_id   uuid not null references players(id) on delete cascade,
  coll        text not null check (coll in ('conversation','profile')),
  doc         jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (player_id, coll)
);
alter table llm1_docs enable row level security;
drop policy if exists llm1_docs_read_own on llm1_docs;
create policy llm1_docs_read_own on llm1_docs for select using (player_id = auth.uid() and coll = 'profile');
