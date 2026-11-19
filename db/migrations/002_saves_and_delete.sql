-- 002: the whole garden kept on the server, and deleting my account from inside the app.
-- Run once in Supabase → SQL Editor after db/schema.sql (docs/server.md "Supabase 시작하기" 10).

-- One row per player: the garden save (app/proto3d/state.ts GardenSave) as it is on the device. app/core/sync.ts picks
-- which one wins on sign-in (newest; an empty garden never overwrites a planted one). Only its owner reads or writes it.
create table if not exists garden_saves (
  player_id   uuid primary key references players(id) on delete cascade default auth.uid(),
  body        jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table garden_saves enable row level security;
drop policy if exists garden_saves_read_own on garden_saves;
drop policy if exists garden_saves_insert_own on garden_saves;
drop policy if exists garden_saves_update_own on garden_saves;
create policy garden_saves_read_own on garden_saves for select using (player_id = auth.uid());
create policy garden_saves_insert_own on garden_saves for insert with check (player_id = auth.uid());
create policy garden_saves_update_own on garden_saves for update using (player_id = auth.uid());

-- 계정 삭제 (Google Play needs it inside the app): everything of mine, then the sign-in itself. Runs as the owner of the
-- function so it may remove the auth user; it only ever touches the caller's own rows (auth.uid()).
create or replace function public.delete_me() returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
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

-- 보리와 자유 대화 (db/functions/friend-chat): how many answers each player got today, so one player cannot run up the
-- OpenAI bill. Only the edge function (service role) calls friend_talk_take; players cannot read or write the table.
create table if not exists friend_talk (
  player_id   uuid not null references players(id) on delete cascade,
  day         date not null,
  n           smallint not null default 0,
  primary key (player_id, day)
);
alter table friend_talk enable row level security;
create or replace function public.friend_talk_take(p uuid, d date, cap int) returns boolean language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into friend_talk (player_id, day, n) values (p, d, 1)
  on conflict (player_id, day) do update set n = friend_talk.n + 1
  returning n into used;
  return used <= cap;
end $$;
revoke all on function public.friend_talk_take(uuid, date, int) from public, anon, authenticated;
