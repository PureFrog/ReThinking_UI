-- 012: 팀 모델 결과 (2026-11-23). Run once in Supabase → SQL Editor after 011.
-- holding_signals: the 서서히 verdict for each real holding in a player's garden (code + buy date), uploaded by
--   investment-evidence-system ops/ui/push_signals.py (GitHub Actions, daily). status not_covered = outside the
--   team's 120 stocks; no_signal = nothing computed for that buy date yet.
-- analysis_results: the 반박 (Toulmin) result for each packet in analysis_inbox, written by
--   investment-evidence-system ops/ui/analysis_worker.py (GitHub Actions, every 30 minutes).
-- Both are written with the service role only; a signed-in player reads their own rows.
create table if not exists holding_signals (
  player_id        uuid not null references players(id) on delete cascade,
  code             text not null check (code ~ '^\d{6}$'),
  buy_date         date not null,
  status           text not null check (status in ('available','held','stale','not_covered','no_signal')),
  verdict          text check (verdict in ('Yes','주의','No','유보')),
  fscore           int,
  ohlson_score     int,
  dupont_score     int,
  sum_total        int,
  eval_date        date,
  baseline_date    date,
  financial_as_of  date,
  price_as_of      date,
  rule_version     text,
  release_id       bigint,
  evidence         jsonb,
  updated_at       timestamptz not null default now(),
  primary key (player_id, code, buy_date)
);
alter table holding_signals enable row level security;
drop policy if exists holding_signals_own on holding_signals;
create policy holding_signals_own on holding_signals for select to authenticated using (player_id = auth.uid());

create table if not exists analysis_results (
  request_id   text primary key references analysis_inbox(request_id) on delete cascade,
  player_id    uuid not null references players(id) on delete cascade,
  company_id   text,
  status       text not null check (status in ('done','insufficient_input','failed')),
  decision     text check (decision in ('thesis_factually_inconsistent','thesis_weakened','mixed','thesis_supported','insufficient_evidence')),
  result       jsonb,
  alert_date   date,
  as_of        date,
  attempts     int not null default 1,
  error        text,
  analyzed_at  timestamptz not null default now()
);
create index if not exists analysis_results_player on analysis_results (player_id, analyzed_at desc);
alter table analysis_results enable row level security;
drop policy if exists analysis_results_own on analysis_results;
create policy analysis_results_own on analysis_results for select to authenticated using (player_id = auth.uid());
