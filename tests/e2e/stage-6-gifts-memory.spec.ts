import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld, openDrawer } from "./helpers";

test.describe.configure({ timeout: 150_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const seed = (page: Page, state: object) => page.addInitScript(([s, key]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
}, [state, "little-garden-v3"] as const);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` };
const box = (id: string, sender: string, item: string, x: number, day?: string) => ({ id, sender, anonymous: false, item, x, y: 8, day });
// no tree in a deep loss, so moa's greeting is free for the thing being tested
const calm = [{ id: 1, name: "SK하이닉스", kind: 0, price: 52000, quantity: 12, date: "2026-08-01", rate: 12.4, plot: 0, lossDays: 0 }];

async function invite(page: Page, name: RegExp) {
  await expect(page.locator(".object-panel")).toHaveCount(0);
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name }).click();
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
}

test("3장 양방향 선물: 서랍에서 골라 건네면 친구가 반응하고, 다음 방문 때 들고 온다", async ({ page }) => {
  await seed(page, { holdings: calm, gifts: [box("visit-tori-2026-11-01", "tori", "들꽃 화병", 4, "2026-11-01"), box("visit-tori", "tori", "여름 선글라스", 6, "2026-10-30")], claimed: ["visit-tori-2026-11-01", "visit-tori"], seen: ["visit-tori-2026-11-01", "visit-tori"] });
  await openGarden(page);
  await invite(page, /모아/);
  await openDrawer(page);
  await page.getByRole("button", { name: "선물하기" }).click();
  await page.locator(".gift-giving .item-cell", { hasText: "들꽃 화병" }).click();
  await page.getByRole("button", { name: "모아에게 건네기" }).click();
  await expect(page.locator(".object-panel")).toHaveCount(0);
  // moa loves flowers: a heart, and her line
  await expect.poll(() => flag(page, "gave"), { timeout: 20_000 }).toBe("moa:loved");
  await expect(page.locator(".ambient-bubble")).toContainText("들꽃 화병을 나한테?", { timeout: 10_000 });
  const s = await saved(page);
  expect(s.given).toMatchObject([{ giftId: "visit-tori-2026-11-01", to: "moa", item: "들꽃 화병", reaction: "loved" }]);
  // the gift counts toward closeness (visit 1 + loved 3)
  expect(s.relationships.moa.points).toBe(4);
  // the next visit: it is gone from the drawer, and moa has it with her and says so
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await openDrawer(page);
  await expect(page.locator(".item-cell", { hasText: "여름 선글라스" })).toBeVisible();
  await expect(page.locator(".item-cell", { hasText: "들꽃 화병" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await invite(page, /모아/);
  await expect.poll(() => flag(page, "holds_moa")).toBe("들꽃 화병");
  await expect(page.locator(".ambient-bubble")).toContainText("네가 준 들꽃 화병, 오늘 들고 왔어.", { timeout: 10_000 });
});

test("3장 양방향 선물: 친구가 준 걸 돌려주면 어색해한다", async ({ page }) => {
  await seed(page, { holdings: calm, gifts: [box("visit-tori", "tori", "여름 선글라스", 6, "2026-10-30")], claimed: ["visit-tori"], seen: ["visit-tori"] });
  await openGarden(page);
  await invite(page, /토리/);
  await openDrawer(page);
  await page.getByRole("button", { name: "선물하기" }).click();
  await page.getByRole("button", { name: "토리에게 건네기" }).click();
  await expect.poll(() => flag(page, "gave"), { timeout: 20_000 }).toBe("tori:awkward");
  await expect(page.locator(".ambient-bubble")).toContainText("내가 준 거 아이가", { timeout: 10_000 });
});

test("3장 매 방문 새 선물: 단계가 오르면 새 선물을 하루 한 번 들고 온다", async ({ page }) => {
  await seed(page, { holdings: calm, relationships: { moa: { points: 10, stage: 1, scenes: [1], daily: {} } }, gifts: [box("visit-moa", "moa", "위로 사탕", 6)], claimed: ["visit-moa"], seen: ["visit-moa"] });
  await openGarden(page);
  await invite(page, /모아/);
  await expect.poll(async () => (await saved(page)).gifts.map((g: { id: string; item: string }) => g.id + ":" + g.item), { timeout: 15_000 }).toContain(`visit-moa-${today()}:산딸기 잼`);
  // the 아는 사이 gift is new; nothing more today
  const n = (await saved(page)).gifts.length;
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await invite(page, /모아/);
  await page.waitForTimeout(1500);
  expect((await saved(page)).gifts.length).toBe(n);
});

test("3장 기억: 오래 안 왔으면 오랜만이라고 하고, 지난번 판단 기록을 기억한다", async ({ page }) => {
  await seed(page, {
    holdings: calm,
    relationships: { moa: { points: 3, stage: 0, daily: {}, lastVisit: daysAgo(12) } },
    decisions: [{ friend: "moa", tree: "SK하이닉스", decision: "유보", reason: "신규 계약 소식을 확인하고 싶어", day: "2026-11-01" }],
  });
  await openGarden(page);
  await invite(page, /모아/);
  await expect(page.locator(".ambient-bubble")).toContainText("12일 만이네. 오랜만이야", { timeout: 10_000 });
  await expect.poll(async () => (await saved(page)).relationships.moa.told).toContain(`absence:${today()}`);
  // the next greeting brings up the decision, once
  await expect(page.locator(".ambient-bubble")).toHaveCount(0, { timeout: 20_000 });
  await invite(page, /토리/);
  await expect(page.locator(".ambient-bubble")).toContainText("11월 1일에 SK하이닉스 나무 유보로 정했제?", { timeout: 10_000 });
});

test("3장 기억: 손실 나무가 있으면 모아가 그 나무 걱정부터 한다", async ({ page }) => {
  await openGarden(page);
  await invite(page, /모아/);
  await expect(page.locator(".ambient-bubble")).toContainText("카카오 나무가 힘들어 보여서 먼저 와 봤어.", { timeout: 10_000 });
});
