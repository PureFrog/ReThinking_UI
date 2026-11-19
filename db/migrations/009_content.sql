-- 009: 오늘의 관측소 content and official play (daily_quest_design 7·8). Run once in Supabase → SQL Editor after 008.
-- Content is made on the content machine (tools/content/build-pack.mjs, live sources behind app/core/content/ports.ts)
-- and goes through db/functions/quest-content: upload (draft, with its check report) → approve (a second editor, with a
-- 보유 journal and a 부분매도 journal that both play through) → publish onto a KST day. A published version never
-- changes; a fix is a new version, and a run keeps the version it started on.
-- Official play goes through db/functions/quest-play: the app only ever gets the pack cut at its current scene
-- (app/core/game/daily/official.ts), and quest-settle accepts exactly the decisions committed scene by scene.
-- Everything here is read and written by the functions (service role) only.

create table if not exists editors (
  player_id  uuid primary key references players(id) on delete cascade,
  role       text not null check (role in ('editor','approver')),
  added_at   timestamptz not null default now()
);
-- the registry of masters and principles (PhilosophySource): the master's own words kept apart from our explanation,
-- the portrait with its rights (unchecked → never shown, the monogram stands in)
create table if not exists mentors (
  mentor_id  text primary key,
  body       jsonb not null,               -- core/content/ports.ts Mentor
  updated_at timestamptz not null default now()
);
create table if not exists principles (
  principle_id text primary key,
  mentor_id    text not null references mentors(mentor_id),
  body         jsonb not null,             -- core/content/ports.ts Principle (source title, locator, date, url)
  updated_at   timestamptz not null default now()
);
-- an internal security id with its identifiers over time (ticker, CUSIP, exchange, currency), so a 13F row is joined
-- by an identifier valid on that quarter's date, never by a name
create table if not exists instruments (
  security_id text primary key,
  body        jsonb not null,
  updated_at  timestamptz not null default now()
);
-- every source the editor bound to a case: when it happened, when it could be known, when we fetched it, its hash;
-- a corrected article or an amended filing is a new version, the old one kept
create table if not exists observations (
  source_id    text not null,
  version      smallint not null default 1,
  kind         text not null,
  event_at     timestamptz,
  published_at timestamptz not null,
  fetched_at   timestamptz not null,
  hash         text not null,
  license      text not null default 'unknown',
  body         jsonb not null,             -- core/content/pipeline.ts Observation
  primary key (source_id, version)
);
create table if not exists packs (
  pack_id      text not null,
  version      smallint not null,
  status       text not null check (status in ('draft','approved','published')),
  body         jsonb not null,             -- core/game/daily/model.ts DailyPack
  report       jsonb not null,             -- the pipeline's issues (no errors, or it is not stored)
  content_hash text not null,
  review       jsonb,                      -- the approver's 보유 and 부분매도 journals that both played through
  created_by   uuid references players(id),
  approved_by  uuid references players(id),
  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  published_at timestamptz,
  primary key (pack_id, version)
);
-- a published pack never changes (runs are pinned to their version)
create or replace function packs_frozen() returns trigger language plpgsql as $$
begin
  if old.status = 'published' and (new.body is distinct from old.body or new.status <> 'published') then
    raise exception 'pack %-v% is published; make a new version', old.pack_id, old.version;
  end if;
  return new;
end $$;
drop trigger if exists packs_frozen on packs;
create trigger packs_frozen before update on packs for each row execute function packs_frozen();

-- one pack per KST day and level (design 8 daily_assignments: KST date·level 고유). level 0 = every level that has no
-- pack of its own; levels 4·5 usually carry a comparison company (the same event, more to weigh). A day without one
-- plays the sample as practice.
create table if not exists daily_assignments (
  day         date not null,
  level       smallint not null default 0 check (level between 0 and 5),
  pack_id     text not null,
  version     smallint not null,
  assigned_by uuid references players(id),
  assigned_at timestamptz not null default now(),
  primary key (day, level),
  foreign key (pack_id, version) references packs(pack_id, version)
);
create table if not exists editor_audit (
  id       bigserial primary key,
  at       timestamptz not null default now(),
  editor   uuid references players(id),
  action   text not null,
  pack_id  text,
  version  smallint,
  detail   jsonb
);
-- an official run in progress: the decisions committed so far (the next scene is cut only after each one)
create table if not exists quest_play (
  player_id  uuid not null references players(id) on delete cascade,
  run_id     text not null,
  pack_id    text not null,
  version    smallint not null,
  quest      text not null,
  day        date not null,
  decisions  jsonb not null default '[]',
  step       smallint not null default 0,      -- decisions committed; a commit must name the step it read
  drafts     jsonb not null default '{}',      -- what is being written, per scene (another device picks it up)
  draft_rev  integer not null default 0,       -- a draft save names the revision it read (409 + the latest if it moved)
  done       boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, run_id),
  foreign key (pack_id, version) references packs(pack_id, version)
);
alter table editors enable row level security;
alter table mentors enable row level security;
alter table principles enable row level security;
alter table instruments enable row level security;
alter table observations enable row level security;
alter table packs enable row level security;
alter table daily_assignments enable row level security;
alter table editor_audit enable row level security;
alter table quest_play enable row level security;
