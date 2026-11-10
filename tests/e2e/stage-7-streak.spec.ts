import { test, expect, type Page } from "./fixtures";
import { advanceUntilChoices } from "./helpers";

// 13.7-11 the quiz run: a missed day brings a friend with one last chance (a few quizzes today keep the run);
// a longer miss and the friend says it can't help it, the run starts over.
// The save is seeded once with a run whose last day was `ago` days back (local dates, like the app).
async function seedRun(page: Page, count: number, ago: number) {
  await page.addInitScript(([count, ago]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    const d = new Date(); d.setDate(d.getDate() - ago);
    const day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    localStorage.setItem("little-garden-v3", JSON.stringify({ streak: { count, last: day, best: count, rescued: false, rescue: null, notice: null } }));
  }, [count, ago]);
  await page.goto("/");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
}
const streak = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3") ?? "{}").streak);

test("one missed day: a friend gives the last chance, three quizzes keep the run", async ({ page }) => {
  await seedRun(page, 5, 2);
  await expect(page.locator(".streak-count")).toHaveText("연속 5일");
  const bubble = page.locator(".formal-bubble");
  await expect(bubble).toBeVisible({ timeout: 40_000 });
  await expect(bubble).toContainText("5일");
  // a long line comes in pages; the last one says there is no next chance
  await advanceUntilChoices(page, 2);
  await expect(bubble).toContainText("다음 기회는 없");
  await page.getByRole("button", { name: /퀴즈 풀러 가기/ }).click();
  await expect(page.locator(".streak-rescue")).toContainText("3문제 더");
  for (let i = 0; i < 3; i++) {
    await page.locator(".page-right .answer").first().click();
    if (i < 2) {
      await expect(page.locator(".streak-rescue")).toContainText(`${2 - i}문제 더`);
      await page.getByRole("button", { name: "다음 페이지" }).click();
    }
  }
  await expect(page.locator(".streak-rescue")).toHaveCount(0);
  await expect(page.locator(".streak-count")).toHaveText("연속 6일");
  const s = await streak(page);
  expect(s.count).toBe(6);
  expect(s.rescued).toBe(true);
  expect(s.notice).toBeNull();
});

test("two missed days: the friend can't help it and the run starts over", async ({ page }) => {
  await seedRun(page, 9, 3);
  const bubble = page.locator(".formal-bubble");
  await expect(bubble).toBeVisible({ timeout: 40_000 });
  await expect(bubble).toContainText("어쩔 수 없");
  await expect(bubble).toContainText("9일");
  await expect(page.locator(".streak-count")).toHaveText("연속 0일");
  const s = await streak(page);
  expect(s.count).toBe(0);
  expect(s.best).toBe(9);
  // said once: reloading brings no friend back for it
  await page.reload();
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(6_000);
  await expect(page.locator(".formal-bubble")).toHaveCount(0);
});

test("a run that is still going brings no friend", async ({ page }) => {
  await seedRun(page, 4, 1);
  await expect(page.locator(".streak-count")).toHaveText("연속 4일");
  await page.waitForTimeout(6_000);
  await expect(page.locator(".formal-bubble")).toHaveCount(0);
});
