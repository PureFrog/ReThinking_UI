-- 008: 마스터 계정 (2026-11-17). Run once in Supabase → SQL Editor after 007.
-- A master account needs no invite code, has no daily AI cap (bori-talk, friend-chat, jigi-llm, portfolio-read), and
-- the app tops its coins up (app/core/ledger.ts MASTER). The functions stay as they are: a master gets an invite_uses
-- row with no code, and the two cap functions let a master through.
--
-- Who is a master is never written in the repo. Add the row yourself in the SQL Editor, once, after the person has
-- signed in at least once (players row exists):
--   insert into masters (player_id, note) select id, 'owner' from auth.users where email = '<the account email>';
create table if not exists masters (
  player_id  uuid primary key references players(id) on delete cascade,
  note       text,
  at         timestamptz not null default now()
);
alter table masters enable row level security;  -- no policies: nobody reads it from the app; is_master() answers

-- a master is "invited" without a code
alter table invite_uses alter column code drop not null;
create or replace function public.masters_invited() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into invite_uses (player_id, code) values (new.player_id, null) on conflict (player_id) do nothing;
  return new;
end $$;
drop trigger if exists masters_invited on masters;
create trigger masters_invited after insert on masters for each row execute function public.masters_invited();

create or replace function public.is_master() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from masters where player_id = auth.uid());
$$;
revoke all on function public.is_master() from public, anon;
grant execute on function public.is_master() to authenticated;

-- daily caps: still counted, but a master always gets through
create or replace function public.friend_talk_take(p uuid, d date, cap int) returns boolean language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into friend_talk (player_id, day, n) values (p, d, 1)
  on conflict (player_id, day) do update set n = friend_talk.n + 1
  returning n into used;
  return used <= cap or exists (select 1 from masters where player_id = p);
end $$;
revoke all on function public.friend_talk_take(uuid, date, int) from public, anon, authenticated;

create or replace function public.llm_take(p uuid, d date, cap int) returns boolean language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into llm_use (player_id, day, n) values (p, d, 1)
  on conflict (player_id, day) do update set n = llm_use.n + 1
  returning n into used;
  return used <= cap or exists (select 1 from masters where player_id = p);
end $$;
revoke all on function public.llm_take(uuid, date, int) from public, anon, authenticated;
