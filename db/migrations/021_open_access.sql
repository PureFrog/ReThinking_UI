-- 021: 입장코드 없애기 (2026-11-26). Every signed-in player is let in without a code.
-- Run once in Supabase → SQL Editor after 020.
--
-- The server functions (bori-talk, friend-chat, jigi-llm, news-feed, portfolio-read, quest-*) and the RLS rules
-- (has_invite) still look for a row in invite_uses. Instead of changing all of them, every player gets that row:
-- the ones already here now, and every new one the moment their players row is made. code is null, as for a master
-- (008). The invite tables stay, so a private test can be switched back on by dropping the trigger.

insert into invite_uses (player_id, code)
select id, null from players
on conflict (player_id) do nothing;

create or replace function public.players_invited() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into invite_uses (player_id, code) values (new.id, null) on conflict (player_id) do nothing;
  return new;
end $$;
drop trigger if exists players_invited on players;
create trigger players_invited after insert on players for each row execute function public.players_invited();
