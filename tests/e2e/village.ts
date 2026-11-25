// The village screen (나현 2026-11-22, PM 집·마을 시나리오): no bottom dock any more. What the old four tabs did:
//   정원   → close what is open (the garden is always behind)
//   일지   → the notebook button in the corner (수첩 펼치기)
//   관측소 → the request notice in the garden, or the observatory door sheet
//   더보기 → no door in the village yet: the old list opens through the e2e hook (Proto3D __proto3d.more / open)
// The map button stands where the dock stood as "the garden's controls are up".
import { expect, type Page } from "@playwright/test";

type Hk = { ready?: boolean; open?: (sh: { kind: string; [k: string]: unknown }) => void; more?: (id: string) => void };
const hk = (page: Page) => page.evaluate(() => { const h = (window as unknown as { __proto3d?: Hk }).__proto3d; return { ready: !!h?.ready, hooks: !!h?.open && !!h?.more } });

// the village's own controls (shown when the garden is up and nothing quiet covers it)
export const controls = (page: Page) => page.getByRole("button", { name: "지도", exact: true });

export async function villageReady(page: Page, timeout = 60_000) {
  await expect.poll(async () => { const h = await hk(page); return h.ready && h.hooks }, { timeout }).toBe(true);
  await expect(controls(page)).toBeVisible({ timeout });
}

// a sheet the old dock or 더보기 opened (kind as in Proto3D SheetState)
export async function openSheet(page: Page, sheet: { kind: string; [k: string]: unknown }) {
  await page.evaluate(sh => (window as unknown as { __proto3d: Required<Hk> }).__proto3d.open(sh), sheet);
}

// an item of the old 더보기 list (ui/Home.tsx MoreId: shop, case, rewind, me, drawer, league, sky, holdings, settings, build, cities)
export async function more(page: Page, id: string) {
  await page.evaluate(i => (window as unknown as { __proto3d: Required<Hk> }).__proto3d.more(i), id);
}

// the old 더보기 sheet itself (its list still exists: ui/Home.tsx MoreSheet)
export async function moreSheet(page: Page) {
  await openSheet(page, { kind: "more" });
  const d = page.getByRole("dialog", { name: "더보기" });
  await expect(d).toBeVisible();
  return d;
}

// 일지: the notebook in the corner when the garden is clear, else straight to the journal
export async function journal(page: Page) {
  const book = page.getByRole("button", { name: "수첩 펼치기" });
  if (await book.isVisible().catch(() => false)) await book.click();
  else await openSheet(page, { kind: "journal" });
}

// 관측소: the observatory door (오늘의 관측소)
export async function observatory(page: Page) {
  await openSheet(page, { kind: "game" });
}

// the old tree card (빠른 기록, 쿨다운, 일지 쓰기): a tap on a tree opens its read-only status since 2026-11-22
export async function treeCard(page: Page, id: number) {
  await page.evaluate(i => (window as unknown as { __proto3d: { pick: (id: number) => void } }).__proto3d.pick(i), id);
}

// 내 프로필 (My Page): the old top-left chip is gone; the 더보기 list's 내 프로필 opens it
export async function myPage(page: Page) {
  await more(page, "me");
}

// 정원: whatever is open closes
export async function garden(page: Page) {
  await openSheet(page, null as unknown as { kind: string });
}
