-- 007: 입장코드와 실제 시세 (2026-11-17, private test: the app works only for signed-in players who entered an invite
-- code; prices are real KRX daily bars uploaded from the team PC). Run once in Supabase → SQL Editor after 006.
--
-- invite_codes: the codes you hand out (add rows in Table Editor: code, note, max_uses). invite_uses: who came in
-- with which code. Players never read either table; they call redeem_invite(code) once and has_invite() after.
create table if not exists invite_codes (
  code        text primary key check (length(code) between 4 and 32),
  note        text,
  max_uses    int not null default 10 check (max_uses > 0),
  uses        int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table invite_codes enable row level security;

create table if not exists invite_uses (
  player_id   uuid primary key references players(id) on delete cascade,
  code        text not null references invite_codes(code),
  at          timestamptz not null default now()
);
alter table invite_uses enable row level security;

create or replace function public.has_invite() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from invite_uses where player_id = auth.uid());
$$;
revoke all on function public.has_invite() from public, anon;
grant execute on function public.has_invite() to authenticated;

-- 'ok' | 'already' | 'bad' (unknown, inactive or used up) | 'signin'
create or replace function public.redeem_invite(p_code text) returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c invite_codes;
begin
  if me is null then return 'signin'; end if;
  if exists (select 1 from invite_uses where player_id = me) then return 'already'; end if;
  select * into c from invite_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active or c.uses >= c.max_uses then return 'bad'; end if;
  insert into invite_uses (player_id, code) values (me, c.code);
  update invite_codes set uses = uses + 1 where code = c.code;
  return 'ok';
end $$;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- KRX names for the stock search (latest trading day, all of KOSPI and KOSDAQ) and daily bars for the stocks the app
-- needs (tools/prices/push_prices.py: top 300 by market value, the 12 journal stocks, every stock in a player's garden).
-- Uploaded with the service key; only invited players can read them.
create table if not exists stock_names (
  code        text primary key,
  name        text not null,
  mkt         text not null,
  close       numeric,
  mktcap      numeric,
  as_of       date not null
);
alter table stock_names enable row level security;
drop policy if exists "stock_names: invited read" on stock_names;
create policy "stock_names: invited read" on stock_names for select to authenticated using (public.has_invite());

create table if not exists price_daily (
  code        text not null,
  d           date not null,
  o           numeric not null,
  h           numeric not null,
  l           numeric not null,
  c           numeric not null,
  v           bigint,
  primary key (code, d)
);
alter table price_daily enable row level security;
drop policy if exists "price_daily: invited read" on price_daily;
create policy "price_daily: invited read" on price_daily for select to authenticated using (public.has_invite());

-- No code is written here (this file is in the repository): add your own in Table Editor → invite_codes, upper case,
-- e.g. code = something only the team knows, max_uses = 20.
