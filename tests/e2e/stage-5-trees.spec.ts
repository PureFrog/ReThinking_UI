import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const stages = (page: Page) =>
  page.locator(".game canvas").evaluate(c => (c as HTMLCanvasElement).dataset.treeStages ?? "");
const panel = (page: Page) => page.locator(".object-panel");

// SK하이닉스 is the first holding: 87 days held, +12.4% → a sapling with ripe fruit
async function reshape(page: Page, rate: string, date: string, lossDays: string) {
  await clickWorld(page, 700, 298);
  await expect(panel(page)).toHaveAttribute("data-skin", "notebook", { timeout: 15_000 });
  await panel(page).locator(".holding", { hasText: "SK하이닉스" }).click();
  await panel(page).locator('input[name="rate"]').fill(rate);
  await panel(page).locator('input[name="date"]').fill(date);
  await panel(page).locator('input[name="lossDays"]').fill(lossDays);
  await page.getByRole("button", { name: "나무 변화 확인하기" }).click();
  await expect(panel(page)).toHaveCount(0);
}

test("012 나무는 보유 기간으로 씨앗부터 큰 나무까지 자라고, 수익률로 누레지고 시들고 썩어 그루터기가 된다", async ({ page }) => {
  await openGarden(page);
  await expect.poll(() => stages(page), { timeout: 10_000 }).toMatch(/^sapling:bloom,/);
  await reshape(page, "3", "2026-10-25", "0");
  await expect.poll(() => stages(page)).toMatch(/^seed:well,/);
  await reshape(page, "-5", "2026-10-10", "0");
  await expect.poll(() => stages(page)).toMatch(/^sprout:dull,/);
  await reshape(page, "-15", "2026-06-01", "0");
  await expect.poll(() => stages(page)).toMatch(/^young:wilt,/);
  await reshape(page, "-25", "2026-06-01", "40");
  await expect.poll(() => stages(page)).toMatch(/^young:rot,/);
  await reshape(page, "-25", "2025-06-01", "90");
  await expect.poll(() => stages(page)).toMatch(/^grand:dead,/);
  // the record book names the stage in words, not just colour
  await clickWorld(page, 700, 298);
  await expect(panel(page).locator(".holding", { hasText: "SK하이닉스" })).toContainText("큰 나무 · 말라 죽은 그루터기");
});
