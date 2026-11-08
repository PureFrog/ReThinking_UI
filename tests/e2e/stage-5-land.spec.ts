import { test, expect, type Page } from "@playwright/test";
import { openGarden, clickWorld, iso } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const data = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const panel = (page: Page) => page.locator(".object-panel");
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// four Mon–Thu weeks of journal pages, well before this week
function fourGoalWeeks() {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7 * 8);
  const out = [];
  for (let w = 0; w < 4; w++) for (let d = 0; d < 4; d++) {
    const t = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + d);
    out.push({ id: `seed-${w}-${d}`, holdingId: 1, name: "새봄반도체", day: day(t), saw: "기록", think: "", mood: "calm" });
  }
  return out;
}
async function seed(page: Page, state: object) {
  await page.addInitScript(([s, key]) => {
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
  }, [state, "little-garden-v3"] as const);
}
async function openSeeds(page: Page) {
  const p = iso(2, 10);
  // a press in the first moments after loading can be swallowed; press again until the box opens
  await expect(async () => {
    await clickWorld(page, p.x, p.y - 15);
    await expect(panel(page)).toBeVisible({ timeout: 6_000 });
  }).toPass({ timeout: 25_000 });
}

test("12.5 주 목표 4주를 채운 일지를 남기면 울타리 옆 땅이 열리고 새 밭 두 개가 생긴다", async ({ page }) => {
  await seed(page, { journal: fourGoalWeeks() });
  await openGarden(page);
  await expect.poll(() => data(page, "plots"), { timeout: 10_000 }).toBe("12");
  await expect(page.getByText("아직 안 열린 땅")).toHaveCount(0); // drawn on the canvas, never in the DOM
  // the save that reaches it opens the land
  const p = iso(9, 11);
  await clickWorld(page, p.x, p.y - 60);
  await expect(page.locator(".tree-menu")).toBeVisible({ timeout: 15_000 });
  await page.locator(".tree-menu").getByRole("button", { name: /물 주기/ }).click();
  await expect(panel(page)).toBeVisible({ timeout: 20_000 });
  await panel(page).getByLabel(/오늘 새봄반도체에서 본 것/).fill("오늘도 한 줄");
  await page.getByRole("button", { name: "일지 남기고 물 주기" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect.poll(() => data(page, "plots"), { timeout: 10_000 }).toBe("14");
  await expect(page.locator(".thought-bubble")).toContainText("정원이 넓어졌어", { timeout: 15_000 });
});

test("12.5 이미 열린 땅은 다시 열 때도 열려 있고, 씨앗박스에 밭 13·14가 생긴다", async ({ page }) => {
  await seed(page, { journal: fourGoalWeeks(), earned: { "weeks-4": { day: "2026-10-01", delivered: true } } });
  await openGarden(page);
  await expect.poll(() => data(page, "plots"), { timeout: 10_000 }).toBe("14");
  await openSeeds(page);
  await expect(panel(page).getByRole("button", { name: /밭 14/ })).toBeEnabled();
  await expect(panel(page).getByRole("button", { name: /밭 13/ })).toBeEnabled();
});
