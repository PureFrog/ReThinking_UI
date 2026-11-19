-- 008: 오늘의 관측소 (daily_quest_design v1, app/core/game/daily). Run once in Supabase → SQL Editor after 007.
-- The client sends what it wrote and chose; db/functions/quest-settle replays it with app/core/game/daily/server.ts and
-- writes only what it computes. Two tables:
--   quest_runs    every settled run (ranked and practice), the player's own words and choices with the server's result
--   quest_awards  the XP ledger: at most one award per player and daily id (day:pack:quest) and per run. The profile's
--                 investor_progress (llm1_docs 'profile', profile v5.0) is recomputed from this ledger, never the other
--                 way round, so a lost profile write can always be rebuilt.
-- Only the function (service role) writes; players read their own rows; the day's ranking shows handles and scores only.
create table if not exists quest_runs (
  player_id     uuid not null references players(id) on delete cascade,
  run_id        text not null,
  daily_id      text not null,                 -- 'YYYY-MM-DD:<pack>:<quest>' (KST day)
  quest         text not null,
  pack_id       text not null,
  pack_version  smallint not null,
  grade_version text not null,                 -- the judge that scored it (trial-words-v1 until the Toulmin judge)
  mode          text not null check (mode in ('ranked','practice')),
  decisions     jsonb not null,                -- the player's own fields and fraction per scene, as replayed
  journal       smallint,                      -- 일지 점수 0~100, from the server's replay (null while the judge is pending)
  assessment    text not null default 'scored' check (assessment in ('scored','pending')),
  excess        numeric(7,2) not null,         -- 투자 성과: %p against holding everything, from the server's replay
  result        jsonb not null,                -- per-scene grades, quotes and reasons
  settled_at    timestamptz not null default now(),
  primary key (player_id, run_id)
);
create index if not exists quest_runs_daily on quest_runs (daily_id, mode);
create index if not exists quest_runs_pending on quest_runs (player_id) where assessment = 'pending';
-- one ranked run per player and daily id: the first one settled
create unique index if not exists quest_runs_ranked_once on quest_runs (player_id, daily_id) where mode = 'ranked';

create table if not exists quest_awards (
  player_id      uuid not null references players(id) on delete cascade,
  daily_id       text not null,
  run_id         text not null,
  quest          text not null,
  excess         numeric(7,2) not null,
  journal        smallint not null,
  market         smallint not null,
  writing        smallint not null,
  bonus          smallint not null,
  xp             smallint not null,
  policy_version text not null default 'xp-v1',
  grade_version  text not null,
  settled_at     timestamptz not null default now(),
  primary key (player_id, daily_id),
  unique (player_id, run_id)
);

-- the Toulmin judge's grades per scene input (design 7): the same words always get the same grades, so asking again
-- cannot buy a better score. The key is a hash of the rubric version, the scene and the player's own spans.
create table if not exists quest_assessments (
  player_id   uuid not null references players(id) on delete cascade,
  input_key   text not null,
  grades      jsonb not null,                -- DimGrade[] as checked by core/content/llm-tasks.ts checkToulmin
  model       text not null,
  rubric      text not null,
  created_at  timestamptz not null default now(),
  primary key (player_id, input_key)
);
alter table quest_assessments enable row level security;

alter table quest_runs enable row level security;
alter table quest_awards enable row level security;
drop policy if exists quest_runs_read_own on quest_runs;
create policy quest_runs_read_own on quest_runs for select using (player_id = auth.uid());
drop policy if exists quest_awards_read_own on quest_awards;
create policy quest_awards_read_own on quest_awards for select using (player_id = auth.uid());

-- the day's ranking (design 6): ranked runs only, two measures; nickname and scores, nothing the player wrote
create or replace view quest_daily as
  select r.daily_id, p.handle, r.journal, r.excess, r.grade_version
  from quest_runs r join players p on p.id = r.player_id
  where r.mode = 'ranked' and r.assessment = 'scored';
grant select on quest_daily to anon, authenticated;
