import { test, expect } from "./fixtures";

// 2026-11-16 feedback, group A (docs/feedback-2026-11-16.md): coins always at the top (a tap opens 넓히기), name
// signs over the buildings, the profile page without the weather card under its name card, a clearer look (look.ts).
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

test("coins at the top, signs on buildings, and the profile page has its corner to itself", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __proto3d?: { ready?: boolean } }).__proto3d?.ready), { timeout: 60_000 }).toBe(true);
  // coins
  const coins = page.getByRole("button", { name: /^코인 \d+ · 넓히기$/ });
  await expect(coins).toBeVisible();
  // signs: one per place; walking to the house brings its sign on screen (the garden is wider since B step 1, so the
  // start view may show none)
  await expect(page.locator('.rt-sign[data-sign="home"]')).toHaveCount(1);
  await page.locator(".proto3d-map").first().click();
  await page.getByRole("button", { name: "집", exact: true }).click();
  await expect.poll(() => page.locator(".rt-sign").evaluateAll(els => els.filter(e => getComputedStyle(e).visibility === "visible").length), { timeout: 20_000 }).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("garden-after.png") });
  // the profile page: no weather card underneath
  await page.getByRole("button", { name: /^내 프로필/ }).click();
  await expect(page.getByLabel("오늘 시장 날씨")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("mypage-after.png") });
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByLabel("오늘 시장 날씨")).toBeVisible();
  // a tap on the coins opens 넓히기
  await coins.click();
  await expect(page.getByText("넓히기", { exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "사례 서고" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { player?: { z: number } } }).__proto3d?.player?.z ?? 0), { timeout: 30_000 }).toBeLessThan(-19);
  expect(errors).toEqual([]);
});
