-- 016: 실제 뉴스 캐시 (2026-11-26). Run once in Supabase → SQL Editor after 015.
-- news_cache: the last NAVER API HUB news search for each stock, written by the news-feed server function
--   (db/functions/news-feed) and reused for 30 minutes. Headlines, links and the publisher's short description only;
--   no article bodies. Service role only: no policy, so signed-in players cannot read or write it directly.
create table if not exists news_cache (
  code        text primary key check (code ~ '^\d{6}$'),
  name        text not null,
  items       jsonb not null default '[]'::jsonb,
  fetched_at  timestamptz not null default now()
);
alter table news_cache enable row level security;
