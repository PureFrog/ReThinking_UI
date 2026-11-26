import { test, expect } from "./fixtures";
// 피드백 2026-11-25 밤: 처음부터 다시 시작 wipes every piece of play (the quiz desk too), 튜토리얼 다시 보기 starts 보리's first walk
// again, and a bought 소품 goes straight into the village.
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const save = (page: import("@playwright/test").Page) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}"));
const ready = (page: import("@playwright/test").Page) => page.waitForFunction(() => (window as any).__proto3d?.ready && (window as any).__proto3d?.open, null, { timeout: 120_000 });

test("처음부터 다시 시작 clears the quiz desk and the walk, and keeps the log-in", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  await page.evaluate(() => { localStorage.setItem("rethink-house-v1", "{\"x\":1}"); localStorage.setItem("rethink-walk-v1", "{\"v\":1}"); localStorage.setItem("rethink-account-v1", "{\"keep\":1}") });
  await page.evaluate(() => (window as any).__proto3d.open({ kind: "settings" }));
  await page.getByRole("button", { name: "처음부터 다시 시작" }).click();
  await page.getByRole("button", { name: "지우고 다시 시작" }).click();
  await page.waitForURL(/\?reset/);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).not.toContain("rethink-house-v1");
  expect(keys).not.toContain("rethink-walk-v1");
  expect(keys).toContain("rethink-account-v1");
});

test("튜토리얼 다시 보기 starts the first walk again", async ({ page }) => {
  await page.goto("/proto3d?demo&tutorial&weather=clear");
  await ready(page);
  expect((await save(page)).tips).toContain("tour");
  await page.evaluate(() => (window as any).__proto3d.open({ kind: "settings" }));
  await page.getByRole("button", { name: "튜토리얼 다시 보기" }).click();
  await expect.poll(async () => (await save(page)).tips?.includes("tour")).toBe(false);
  // 보리 comes up on the square to start the walk
  await expect(page.locator(".vl-villager")).toContainText("보리", { timeout: 30_000 });
});

test("a 소품 bought in the shop stands in the village at once", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  await page.evaluate(() => (window as any).__proto3d.open({ kind: "goods" }));
  await page.getByRole("button", { name: "화분 줄 사기" }).click();
  await expect.poll(async () => ((await save(page)).owned ?? []).find((o: { itemId: string }) => o.itemId === "planter")?.slot ?? null).not.toBeNull();
});

test("the arcade: the closed cabinets say they are being prepared, the middle one plays", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  await page.evaluate(() => (window as any).__proto3d.landmark("arcade"));
  await page.getByTestId("arcade").waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => !!(window as any).__proto3d?.arcade, null, { timeout: 30_000 });
  await page.evaluate(() => (window as any).__proto3d.arcade.pick("soon-l"));
  await expect(page.locator(".ac-say")).toContainText("준비 중");
  await page.evaluate(() => (window as any).__proto3d.arcade.pick("ninja"));
  await expect(page.getByRole("dialog", { name: "닌자 포트폴리오" })).toBeVisible({ timeout: 30_000 });
});

test("coins, calendar and settings are one height in the village, the arcade and the study", async ({ page }) => {
  const hs = () => page.evaluate(() => [...document.querySelectorAll(".rt-top-right > *")].filter(e => (e as HTMLElement).offsetParent).map(e => Math.round(e.getBoundingClientRect().height)));
  for (const room of [null, "arcade", "master"]) {
    await page.goto("/proto3d?demo&weather=clear");
    await ready(page);
    if (room) { await page.evaluate(r => (window as any).__proto3d.landmark(r), room); await page.waitForTimeout(3000) }
    await expect.poll(async () => (await hs()).length, { timeout: 30_000 }).toBe(3);
    expect(new Set(await hs()).size).toBe(1);
  }
});
