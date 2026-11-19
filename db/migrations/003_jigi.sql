-- 003: 지기 투자일지 on the server (docs/jigi.md). Run once in Supabase → SQL Editor after 002.
-- The whole garden (journals included) already syncs through garden_saves (002). These tables keep each journal and
-- hypothesis as its own row too, so the server can grade from real prices later (price_daily, KRX) and count the
-- league from the rows. The app writes them after each sync (app/proto3d/sync.ts pushJigi). Only the owner reads or
-- writes their rows. Demo pages are never sent; practice pages are sent marked practice and left out of statistics.

create table if not exists journals (
  id          text not null,
  player_id   uuid not null references players(id) on delete cascade default auth.uid(),
  stock_code  text,
  stock_name  text,
  holding_id  int,
  status      text not null check (status in ('draft','saved')),
  practice    boolean not null default false,
  created_at  timestamptz not null,
  saved_at    timestamptz,
  tz          text not null default 'Asia/Seoul',
  fields      jsonb not null,               -- core/jigi/journal.ts Fields (the nine required and the optional blocks)
  anchor      jsonb,                        -- {date, close}: where it was written on the chart
  reflection  jsonb,
  versions    jsonb not null default '[]',
  archived_at timestamptz,
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (player_id, id)
);
create table if not exists hypotheses (
  id          text not null,
  player_id   uuid not null references players(id) on delete cascade default auth.uid(),
  journal_id  text not null,
  text        text not null check (char_length(text) <= 300),
  src         text not null,
  domain      text not null,
  form        text not null,
  role        text not null,
  dir         text not null check (dir in ('상승','하락','없음')),
  end_date    date,
  status      text not null check (status in ('draft','hold','confirmed')),
  confirmed_at timestamptz,
  auto        boolean not null default false,
  base        jsonb,                        -- {date, close}: the confirmed close it is graded against
  post_hoc    boolean not null default false,
  opened_at   timestamptz,
  primary key (player_id, id),
  foreign key (player_id, journal_id) references journals(player_id, id) on delete cascade
);
alter table journals enable row level security;
alter table hypotheses enable row level security;
drop policy if exists journals_own on journals;
drop policy if exists hypotheses_own on hypotheses;
create policy journals_own on journals for all using (player_id = auth.uid()) with check (player_id = auth.uid());
create policy hypotheses_own on hypotheses for all using (player_id = auth.uid()) with check (player_id = auth.uid());

-- 지기 LLM calls (db/functions/jigi-llm): how many each player made today (only the function, as service role, counts)
create table if not exists llm_use (
  player_id   uuid not null references players(id) on delete cascade,
  day         date not null,
  n           smallint not null default 0,
  primary key (player_id, day)
);
alter table llm_use enable row level security;
create or replace function public.llm_take(p uuid, d date, cap int) returns boolean language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into llm_use (player_id, day, n) values (p, d, 1)
  on conflict (player_id, day) do update set n = llm_use.n + 1
  returning n into used;
  return used <= cap;
end $$;
revoke all on function public.llm_take(uuid, date, int) from public, anon, authenticated;

-- account deletion (002 delete_me) also clears these
create or replace function public.delete_me() returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from hypotheses where player_id = me;
  delete from journals where player_id = me;
  delete from llm_use where player_id = me;
  delete from planet_cheers where from_player = me or to_player = me;
  delete from planets where player_id = me;
  delete from expedition_runs where player_id = me;
  delete from league_members where player_id = me;
  delete from case_answers where player_id = me;
  delete from cooldowns where player_id = me;
  delete from grades where judgment_id in (select id from judgments where player_id = me);
  delete from judgments where player_id = me;
  delete from signals where player_id = me;
  delete from friend_talk where player_id = me;
  delete from garden_saves where player_id = me;
  delete from players where id = me;
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
