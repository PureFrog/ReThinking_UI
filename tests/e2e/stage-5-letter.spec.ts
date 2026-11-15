import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const letterFlag = (page: Page) =>
  page.locator(".game canvas").evaluate(c => (c as HTMLCanvasElement).dataset.letter ?? "");
const pad = (n: number) => String(n).padStart(2, "0");
const now = new Date(), last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastMonth = `${last.getFullYear()}-${pad(last.getMonth() + 1)}`;
const entry = (d: number, think: string, mood: string, name = "SK하이닉스") =>
  ({ id: `${d}${think}`, holdingId: 1, name, day: `${lastMonth}-${pad(d)}`, saw: "", think, mood });

test("12.7 매달 1일 모아의 편지: 우편함이 반짝이고, 열면 지난달 일지를 돌아본다 (수익률 없이)", async ({ page }) => {
  await page.addInitScript(([journal, key]) => {
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify({ journal })); sessionStorage.setItem("seeded", "1") }
  }, [[entry(3, "계약 연장 소식이 궁금했어", "curious"), entry(3, "", ""), entry(12, "공장 증설이 내 이유랑 아직 맞는지 다시 보고 싶어", "curious", "카카오")], "little-garden-v3"] as const);
  await openGarden(page);
  // 11.3 the mailbox itself shows it, no number badge
  await expect.poll(() => letterFlag(page), { timeout: 10_000 }).toBe("1");
  await clickWorld(page, 485, 527);
  const letter = page.locator(".object-panel .month-letter");
  await expect(letter).toHaveCount(1);
  await expect(letter).toHaveAttribute("open", "");
  await expect(letter).toContainText("모아의 편지");
  await expect(letter).toContainText(`${last.getMonth() + 1}월에 일지를 쓴 날은 2일`);
  await expect(letter).toContainText("궁금");
  await expect(letter).toContainText("공장 증설이 내 이유랑 아직 맞는지 다시 보고 싶어");
  await expect(letter).not.toContainText("%");
  // the invitations are still there under it
  await expect(page.getByRole("button", { name: /토리/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.poll(() => letterFlag(page)).toBe("0");
  // the same month never arrives twice
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => letterFlag(page), { timeout: 10_000 }).toBe("0");
  await clickWorld(page, 485, 527);
  await expect(page.locator(".object-panel .month-letter")).toHaveCount(1);
});

test("12.7 지난달에 쓴 게 없으면 편지도 없다", async ({ page }) => {
  await openGarden(page);
  await expect.poll(() => letterFlag(page), { timeout: 10_000 }).toBe("0");
  await clickWorld(page, 485, 527);
  await expect(page.locator(".object-panel")).toBeVisible();
  await expect(page.locator(".object-panel .month-letter")).toHaveCount(0);
});
