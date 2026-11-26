import { test, expect } from "./fixtures";
import * as V from "./village";

// 2026-11-16 feedback, group A (docs/feedback-2026-11-16.md): coins always at the top (a tap opens 넓히기), name
// signs over the buildings, the profile page without the weather card under its name card, a clearer look (look.ts).
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

test("coins at the top open the shop, signs on buildings, and the profile page has its corner to itself", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  await expect(V.controls(page)).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __proto3d?: { ready?: boolean } }).__proto3d?.ready), { timeout: 60_000 }).toBe(true);
  // coins
  // (since 2026-11-24 the coins open the payment window, 피드백 "돈을 누르면 결제창"; the shop is the 건물 상인's)
  const coins = page.getByRole("button", { name: /^코인 [\d,]+원 · 충전$/ });
  await expect(coins).toBeVisible();
  // signs: one per place; walking to the house brings its sign on screen (the garden is wider since B step 1, so the
  // start view may show none)
  await expect(page.locator('.rt-sign[data-sign="home"]')).toHaveCount(1);
  await page.locator(".proto3d-map").first().click();
  await page.getByRole("button", { name: "집", exact: true }).click();
  await expect.poll(() => page.locator(".rt-sign").evaluateAll(els => els.filter(e => getComputedStyle(e).visibility === "visible").length), { timeout: 20_000 }).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("garden-after.png") });
  // the profile page: no weather card underneath
  await V.myPage(page);
  await expect(page.getByLabel("오늘 시장 날씨")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("mypage-after.png") });
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByLabel("오늘 시장 날씨")).toBeVisible();
  // a tap on the coins opens the payment window
  await coins.click();
  await expect(page.getByRole("dialog", { name: "코인 결제창" })).toBeVisible();
  // payment is not connected yet (2026-11-25): the window says so and cannot go on to a pay step
  await expect(page.getByRole("dialog", { name: "코인 결제창" })).toContainText("코인 충전은 준비 중이에요");
  await expect(page.getByRole("button", { name: "결제는 준비 중이에요" })).toBeDisabled();
  expect(errors).toEqual([]);
});

// group B step 1: the holding trees are apple trees (how many apples hang is the signal, models.ts CANOPY), and the
// garden is spread out (core/world.ts): the case library now stands past where the old walk ended (22).
test("apple trees, and a wider garden to walk", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __proto3d?: { ready?: boolean } }).__proto3d?.ready), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { fruit?: number } }).__proto3d?.fruit ?? 0), { timeout: 30_000 }).toBeGreaterThan(0);
  await page.locator(".proto3d-map").first().click();
  // (the 사례 서고 moved next to the cottage on 2026-11-18, so the far end of the walk is the 리그 광장 now)
  await page.getByRole("button", { name: "리그 광장" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { player?: { z: number } } }).__proto3d?.player?.z ?? 0), { timeout: 30_000 }).toBeGreaterThan(22);
  expect(errors).toEqual([]);
});
