-- 013: 급락 사건 (2026-11-23). Run once in Supabase → SQL Editor after 012.
-- drop_events: the 120 stocks' drop events of the last 90 days, by the team's 급락 rule (investment-evidence-system
--   models/sudden/events.py: return against the market index at or below -1.96 × its usual spread; drops within 10
--   sessions are one event). Uploaded every trading day by ops/ui/push_drops.py (GitHub Actions daily-refresh).
-- Market information, not a player's: written with the service role only, readable by every signed-in player.
create table if not exists drop_events (
  code            text not null check (code ~ '^\d{6}$'),
  drop_date       date not null,               -- D: the event's first drop day
  last_hit_date   date not null,               -- the event's last drop day (within 10 sessions of D)
  n_hit_days      int not null default 1,
  ret_pct         numeric,                     -- the stock's close-to-close return on D, %
  index_ret_pct   numeric,                     -- the market index on D, %
  ar_pct          numeric,                     -- ret - index, %
  sigma_ar_pct    numeric,                     -- σ of AR over D-120..D-1, %
  z               numeric,                     -- ar / σ (<= -1.96)
  market_adjusted boolean not null default true,
  rule_version    text,
  updated_at      timestamptz not null default now(),
  primary key (code, drop_date)
);
alter table drop_events enable row level security;
drop policy if exists drop_events_read on drop_events;
create policy drop_events_read on drop_events for select to authenticated using (true);
