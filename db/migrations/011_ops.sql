-- 011: the operations view (daily_quest_design 7, app/core/content/ops.ts). Run once after 010.
-- One row per model call made by a server function: which task, which model, whether it answered in shape, how long
-- it took, how many tokens. No prompt, no reply, no player text. db/functions/quest-content `ops` sums the last days
-- per task and model (failure rate, latency, tokens) next to the editors' revision rate.
create table if not exists llm_task_log (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  fn      text not null,                 -- the function that called (quest-settle, quest-play)
  task    text not null,                 -- editor-cards · extract · hint · toulmin · explain
  model   text not null,
  ok      boolean not null,
  ms      integer not null,
  input   integer not null default 0,
  output  integer not null default 0,
  error   text
);
create index if not exists llm_task_log_at on llm_task_log (at desc);
alter table llm_task_log enable row level security;
