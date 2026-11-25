// Fishing with 나루 (feedback 2026-11-17, docs/mockups/otter-fishing.html): 나루 stands by the pond; a tap opens its
// talk; a cast waits for the dip; a tap in time lands the fish (a card, the log, a few coins); too early scares it off;
// three casts a day. __fishBite fixes the wait, __fishPick the fish.
import { test, expect } from "./fixtures";
import * as V from "./village";
import type { Page } from "@playwright/test";

test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
test.describe.configure({ timeout: 240_000 });
type H = { points: Record<string, { x: number; y: number }>; fishing?: string };
const hk = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d: H }).__proto3d);
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!));

test("나루 by the pond: talk, cast, a tap in time lands a goldfish, too early scares one off, three a day, the log", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => { const w = window as unknown as { __fishBite: number; __fishPick: string; __fishWindow: number }; w.__fishBite = 1800; w.__fishPick = "geumbungeo"; w.__fishWindow = 30_000; });// wide: a loaded run can take seconds between the dip and the tap
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  const dock = V.controls(page);
  await expect(dock).toBeVisible({ timeout: 30_000 });
  const coins0 = (await save(page)).currency;
  // tap 나루 by the pond (each villager has a name tag button since 2026-11-22)
  await page.locator(".vl-npc-tag[data-npc=naru]").dispatchEvent("click");// the tag may sit off screen
  const talk = page.getByRole("dialog", { name: "나루와 대화" });
  await expect(talk).toContainText("3번 남았어", { timeout: 10_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: info.outputPath("naru-talk.png") });
  await talk.getByRole("button", { name: "낚시하기" }).click();
  const play = page.getByRole("dialog", { name: "낚시" });
  await play.getByRole("button", { name: "던지기" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: info.outputPath("fishing-wait.png") });
  await expect.poll(async () => (await hk(page)).fishing, { timeout: 10_000 }).toBe("bite");
  await play.getByRole("button", { name: "탭!" }).click();
  const card = play.getByRole("status");
  await expect(card).toContainText("금붕어");
  await expect(card).toContainText("처음 잡았어요");
  await page.screenshot({ path: info.outputPath("fishing-caught.png") });
  let s = await save(page);
  expect(s.fishing.log.geumbungeo.n).toBe(1);
  expect(s.currency).toBe(coins0 + 10_000 + 2_000);// a 희귀 goldfish + the first-catch bonus, in 원 (core/fishing.ts)
  // too early: it swims off (the dip is far off this time)
  await page.evaluate(() => { (window as unknown as { __fishBite: number }).__fishBite = 60_000 });
  await play.getByRole("button", { name: "한 번 더" }).click();
  await play.getByRole("button", { name: "탭!" }).click();
  await expect(play.getByRole("status")).toContainText("아직이었는데");
  // the third and last cast of the day, then only the log
  await page.evaluate(() => { (window as unknown as { __fishBite: number }).__fishBite = 1800 });
  await play.getByRole("button", { name: "다시 던지기" }).click();
  await expect.poll(async () => (await hk(page)).fishing, { timeout: 10_000 }).toBe("bite");
  await play.getByRole("button", { name: "탭!" }).click();
  await expect(play.getByRole("status")).toContainText("금붕어");
  await expect(play.getByRole("button", { name: "한 번 더" })).toHaveCount(0);
  s = await save(page);
  expect(s.fishing.casts).toBe(3);
  expect(s.fishing.log.geumbungeo.n).toBe(2);
  await play.getByRole("button", { name: "도감 보기" }).click();
  const log = page.getByRole("dialog", { name: "물고기 도감" });
  await expect(log).toContainText("1 / 12");
  await expect(log.getByLabel(/^금붕어 2마리/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("fish-log.png") });
  await log.getByRole("button", { name: "닫기" }).click();
  await expect(dock).toBeVisible();
  expect(errors).toEqual([]);
});
