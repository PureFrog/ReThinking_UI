import { test, expect, type Page } from "./fixtures";

// 처분효과 (증권사 멘토링 2026-11-22, 1.7; app/core/recheck.ts, app/content/recheck.ts): a tree no longer grows with
// the days held, and its card leads with what it is worth now and its share of the garden, the days held last.
// A gain and a loss get the same question, and the MTS sheet's two views come along when there are books.
test.describe.configure({ timeout: 240_000 });
const hk = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: { frames?: number; treeModels?: number } }).__proto3d ?? null);
const pick = (page: Page, id: number) => page.evaluate(i => (window as unknown as { __proto3d: { pickTree: (id: number) => void } }).__proto3d.pickTree(i), id);

test("a gain and a loss tree get the same question, worth first and the days held last", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await hk(page))?.treeModels ?? 0, { timeout: 60_000 }).toBeGreaterThanOrEqual(7);

  // 보리 comes over first with the day's stop-loss talk (a signal on 카카오): put it off
  const bori = page.getByRole("dialog", { name: "보리와 대화" });
  await bori.waitFor({ timeout: 20_000 }).then(() => bori.getByRole("button", { name: "나중에 얘기할게" }).click()).catch(() => {});
  await expect(bori).toHaveCount(0, { timeout: 15_000 });
  const asks: string[] = [];
  // 1 SK하이닉스 +12.4% · 4 현대차 -24%, held 90 days at that depth (the old look made it a stump)
  for (const [id, name] of [[1, "SK하이닉스"], [4, "현대차"]] as const) {
    await pick(page, id);
    const card = page.getByRole("dialog", { name: `${name} 나무` });
    await expect(card).toBeVisible();
    const text = await card.innerText();
    // worth and share come before the days held
    expect(text.indexOf("정원의")).toBeGreaterThan(-1);
    expect(text.indexOf("정원의")).toBeLessThan(text.indexOf("산 지"));
    expect(text).not.toMatch(/보유 반년|손실 고착|장기 손실|팔아|사세요|매도|매수|오를 거/);
    const ask = card.getByRole("group", { name: "다시 보기" });
    asks.push((await ask.locator("p").first().innerText()).replace(/[\d.]+%/, "N%"));
    await page.waitForTimeout(400);
    await page.screenshot({ path: test.info().outputPath(`recheck-${id}-${info.project.name}.png`) });
    await card.getByRole("button", { name: "닫기" }).click();
    await expect(card).toHaveCount(0);
  }
  expect(asks[0]).toBe(asks[1]);
  expect(errors).toEqual([]);
});
