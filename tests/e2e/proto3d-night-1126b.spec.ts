import { test, expect } from "./fixtures";
import { answerPaper } from "./quiz-answer";
// 피드백 2026-11-26 새벽: a finished day opens in the village (not at the finished desk); the merchant away still takes an
// order through the 통신기; rocks and boards are solid; the room's board has no tag with nothing waiting.
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
test.describe.configure({ timeout: 240_000 });
const ready = (page: import("@playwright/test").Page) => page.waitForFunction(() => (window as any).__proto3d?.ready && (window as any).__proto3d?.goTo, null, { timeout: 120_000 });

test("after today's quiz a new launch opens in the village", async ({ page }) => {
  await page.goto("/?house");
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "quiz", { timeout: 30_000 });
  await page.getByRole("button", { name: "퀴즈 시작" }).first().click();
  for (let i = 0; i < 40; i++) {
    if (!(await page.locator(".hs-quiz[data-side=front]").isVisible())) break;
    await answerPaper(page);
    await page.locator(".hs-acts .rt-btn.primary").click();
  }
  await page.getByRole("button", { name: "닫기", exact: true }).first().click();
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "locked-done");
  // a player who has been here before: onboarded, and the house not skipped by the test fixture
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}"); s.onboarded = true; localStorage.setItem("rethink-garden-v1", JSON.stringify(s)) });
  await page.addInitScript(() => { (window as any).__noHouse = false });
  await page.goto("/");
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village", { timeout: 30_000 });
  await expect(page.getByTestId("house")).toHaveCount(0);
});

test("the merchant away: 보리 offers the 통신기, and it takes an order", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear&hour=1");
  await ready(page);
  await page.evaluate(() => (window as any).__proto3d.meet("merchant"));
  await page.getByRole("button", { name: "통신기로 주문" }).click({ timeout: 30_000 });
  const comm = page.getByRole("dialog", { name: "통신기" });
  await expect(comm).toBeVisible();
  await expect(comm).not.toContainText("주문은 상인이 있는 동안");
});

test("a rock and the news board can't be walked into", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  const rock = await page.evaluate(async () => { const m: any = await import(/* @vite-ignore */ ("/app/proto3d/places.ts" as string)); return { r: m.ROCK_AT[2] } });
  const [x, z, sc] = rock.r;
  await page.evaluate(([x, z]) => (window as any).__proto3d.goTo(x, z), [x, z]);
  await page.waitForTimeout(12000);
  const p = await page.evaluate(() => (window as any).__proto3d.player);
  expect(Math.hypot(p.x - x, p.z - z)).toBeGreaterThan(sc * 0.9);
});
