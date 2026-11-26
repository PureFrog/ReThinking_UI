-- 018: 행성은 늘 보이고, 접속 중인지만 (2026-11-26, 사용자 "행성이 존재하는 건 계속 보이고 온라인인지 오프라인인지만").
-- Run once in Supabase → SQL Editor after 017.
--   player_presence  when each player's app last said "I'm here" (app/proto3d/social.ts, every minute while the app is
--                    open and in front). Online = seen in the last 2 minutes; the app decides, the server keeps the time.
--   social_planets   now every invited player except me: a player who has not shared a garden (no planet yet, or set to
--                    비공개) still has a planet, with only the nickname and the presence time.

create table if not exists player_presence (
  player_id   uuid primary key references players(id) on delete cascade default auth.uid(),
  seen_at     timestamptz not null default now()
);
alter table player_presence enable row level security;
drop policy if exists player_presence_write_own on player_presence;
create policy player_presence_write_own on player_presence for insert to authenticated with check (player_id = auth.uid());
drop policy if exists player_presence_update_own on player_presence;
create policy player_presence_update_own on player_presence for update to authenticated using (player_id = auth.uid());

-- the return type changes (seen_at), so the old function goes first
drop function if exists public.social_planets();
create function public.social_planets() returns table (player text, handle text, body jsonb, seen_at timestamptz)
language sql stable security definer set search_path = public as $$
  select pl.id::text, pl.handle, p.body, pr.seen_at
  from invite_uses u
  join players pl on pl.id = u.player_id
  left join planets p on p.player_id = pl.id
  left join player_presence pr on pr.player_id = pl.id
  where public.has_invite() and pl.id <> auth.uid();
$$;
revoke all on function public.social_planets() from public, anon;
grant execute on function public.social_planets() to authenticated;
