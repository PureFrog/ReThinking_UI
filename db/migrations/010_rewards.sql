-- 010: 오늘의 관측소 rewards (daily_quest_design 6, app/core/game/daily/rewards.ts). Run once after 009.
-- One row per player and reward key: a key is granted once, whoever asks and however often (중복 지급은 보상 키로 차단).
--   first-clear            the first scored, ranked completion        → a stamp
--   weekly-5:<monday>      five scored, ranked completions in a week  → a decoration (the app puts it in the inventory)
--   top10-journal:<daily>  일지 점수 top 10% of a closed day, ties share → a title (withheld under 20 runs that day)
--   top10-market:<daily>   투자 성과 top 10% of a closed day            → a title
-- db/functions/quest-settle grants completion rewards when it scores a run, and the day's titles lazily when the
-- player next asks for their progress after the day is over (no scheduled job needed).
create table if not exists reward_grants (
  player_id  uuid not null references players(id) on delete cascade,
  reward_key text not null,
  rule       text not null check (rule in ('first-clear','weekly-5','top10-journal','top10-market')),
  period     text not null,
  label      text not null,
  item       text,
  granted_at timestamptz not null default now(),
  primary key (player_id, reward_key)
);
alter table reward_grants enable row level security;
drop policy if exists reward_grants_read_own on reward_grants;
create policy reward_grants_read_own on reward_grants for select using (player_id = auth.uid());
