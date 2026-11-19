import { test, expect } from "./fixtures";
import { advanceUntilChoices } from "./helpers";

// 13.7-10 a stop-loss signal (mocked with ?detect=<holding id>): a friend comes over by itself and asks, in its own
// words, why the player bought that stock. The answer goes into that tree's journal; the same signal is not asked again.
const canvas = (page: import("@playwright/test").Page) => page.locator(".game canvas");
const saved = (page: import("@playwright/test").Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3") ?? "{}"));

test("a stop-loss signal brings a friend who asks why, and keeps the answer", async ({ page }) => {
  await page.goto("/classic?detect=3");
  await expect(canvas(page)).toBeVisible({ timeout: 30_000 });
  // nobody pressed anything: the friend walks in and up to the player
  const bubble = page.locator(".formal-bubble");
  await expect(bubble).toBeVisible({ timeout: 40_000 });
  await expect(bubble).toContainText("카카오");
  await expect(bubble).not.toContainText("가상 사건");
  const asker = await canvas(page).evaluate(c => (c as HTMLCanvasElement).dataset.cameBy ?? "");
  expect(["moa", "tori", "luon"]).toContain(asker);
  await advanceUntilChoices(page, 2);
  await expect(page.locator(".dialogue-choices > button").first()).toContainText("이유 말하기");
  await page.locator(".dialogue-choices > button").first().click();
  const box = page.getByRole("textbox", { name: "처음에 산 이유" });
  await box.fill("피부 관리 시장이 커질 것 같아서");
  await box.press("Enter");
  // the friend reads it back; nothing about selling or buying
  await expect(bubble).toContainText("피부 관리 시장이 커질 것 같아서");
  await expect(bubble).not.toContainText(/팔아|손절|매도/);
  const s = await saved(page);
  const page3 = s.journal.find((e: any) => e.holdingId === 3 && e.asked === asker);
  expect(page3?.think).toBe("피부 관리 시장이 커질 것 같아서");
  expect(s.asked).toHaveLength(1);

  // the same signal is not asked twice
  await page.reload();
  await expect(canvas(page)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(8_000);
  await expect(page.locator(".formal-bubble")).toHaveCount(0);
  expect((await saved(page)).asked).toHaveLength(1);
});

test("without a signal no friend comes to ask", async ({ page }) => {
  await page.goto("/classic");
  await expect(canvas(page)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(6_000);
  await expect(page.locator(".formal-bubble")).toHaveCount(0);
  expect((await saved(page)).asked ?? []).toHaveLength(0);
});
