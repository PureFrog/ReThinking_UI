import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const pad = (n: number) => String(n).padStart(2, "0");
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };

test("2장 돌봄 축: 일지를 자주 쓴 나무는 생기가 오르고(꽃·나비), 가지의 약속 리본을 누르면 묶어 둔 이유가 뜬다", async ({ page }) => {
  const page1 = (n: number, think = "") => ({ id: "v" + n, holdingId: 4, name: "현대차", day: daysAgo(n), saw: "", think, mood: "" });
  // 현대차 is the dead stump in the demo: looked after, it still flowers
  const journal = [page1(9, "신작 일정이 그대로면 두기로"), page1(6), page1(3), page1(1, "게임 출시가 아직 내 이유야")];
  await page.addInitScript(([s, key]) => {
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
  }, [{ journal, guides: ["move"] }, "little-garden-v3"] as const);
  await openGarden(page);
  await expect.poll(() => flag(page, "vitality"), { timeout: 10_000 }).toContain("4:3");
  expect(await flag(page, "vitality")).toContain("1:0");
  const [x, y] = (await flag(page, "ribbon4")).split(",").map(Number);
  expect(await flag(page, "ribbon1")).toBe("");
  await clickWorld(page, x, y);
  await expect(page.locator(".thought-bubble")).toContainText("게임 출시가 아직 내 이유야", { timeout: 10_000 });
});
