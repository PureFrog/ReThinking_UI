-- ReThink Garden server schema (R5 plan, docs/server.md). Postgres syntax (Supabase works as is; Cloudflare D1 needs
-- the types relaxed to TEXT/INTEGER). Not applied anywhere yet: the app runs on the local mock in app/proto3d/server.ts.
-- No orders or trades are stored, ever. Returns appear only as the graded move after a judgment.

create table players (
  id          uuid primary key default gen_random_uuid(),
  handle      text not null unique,          -- shown in the league, never a real name by default
  created_at  timestamptz not null default now()
);

-- what the models flagged (the team's model output, one row per holding per day)
create table signals (
  id          text primary key,              -- model:holding:day
  player_id   uuid not null references players(id),
  holding     text not null,
  analyst     text not null check (analyst in ('tori','moa','luon')),
  model       text not null check (model in ('ohlson','fscore','dupont','gradual','crash','rebuttal')),
  loss        boolean not null,
  headline    text not null,
  evidence    jsonb not null,
  day         date not null
);

-- app/core/judgment.ts Judgment
create table judgments (
  id          text primary key,
  player_id   uuid not null references players(id),
  holding     text not null,
  day         date not null,
  choice      text not null check (choice in ('hold','review','watch')),
  reason      text not null check (char_length(reason) <= 60),
  confidence  smallint not null check (confidence between 1 and 5),
  signal_id   text references signals(id),
  rebuttal    text check (rebuttal in ('accepted','kept','skipped')),
  unique (player_id, holding, day)
);

-- app/core/judgment.ts Graded: written by the server when a mark comes due, from real prices
create table grades (
  judgment_id text not null references judgments(id),
  mark        smallint not null check (mark in (30, 90)),
  after_pct   numeric(6,2) not null,
  hit         boolean not null,
  signal_right boolean,
  points      smallint not null,
  day         date not null,
  primary key (judgment_id, mark)
);

-- app/core/cases.ts: the case bank (verified facts only) and the daily answers
create table cases (
  id          text primary key,
  body        jsonb not null,                -- PastCase without the id
  verified_by text not null,
  verified_at date not null
);
create table case_answers (
  player_id   uuid not null references players(id),
  case_id     text not null references cases(id),
  day         date not null,
  choice      text,
  correct     boolean not null,
  hint        boolean not null,
  points      smallint not null,
  primary key (player_id, day)
);

-- app/core/cooldown.ts
create table cooldowns (
  id          text primary key,
  player_id   uuid not null references players(id),
  holding     text not null,
  started_at  timestamptz not null,
  done_at     timestamptz,
  waited      boolean
);

-- app/core/league.ts: one group of 12 per tier per week; points are summed from grades and case answers
create table league_groups (
  id          uuid primary key default gen_random_uuid(),
  week        date not null,                 -- Monday
  tier        text not null check (tier in ('rookie','analyst','senior','head'))
);
create table league_members (
  group_id    uuid not null references league_groups(id),
  player_id   uuid not null references players(id),
  primary key (group_id, player_id)
);
create view league_points as
  select m.group_id, m.player_id,
    coalesce((select sum(g.points) from grades g join judgments j on j.id = g.judgment_id
              where j.player_id = m.player_id and date_trunc('week', g.day) = lg.week), 0)
  + coalesce((select sum(c.points) from case_answers c
              where c.player_id = m.player_id and date_trunc('week', c.day) = lg.week), 0) as points
  from league_members m join league_groups lg on lg.id = m.group_id;
