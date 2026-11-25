-- 016: 입장코드 없이 (2026-11-25, 피드백 "초대코드 없애"): the app no longer asks for an invite code after logging in,
-- so every signed-in player may read the stock names and daily prices. The invite tables from 007 stay (unused).
-- Run this once in the Supabase SQL editor; until then signed-in players without a code see no real prices.
drop policy if exists "stock_names: invited read" on stock_names;
drop policy if exists "stock_names: signed-in read" on stock_names;
create policy "stock_names: signed-in read" on stock_names for select to authenticated using (true);

drop policy if exists "price_daily: invited read" on price_daily;
drop policy if exists "price_daily: signed-in read" on price_daily;
create policy "price_daily: signed-in read" on price_daily for select to authenticated using (true);
