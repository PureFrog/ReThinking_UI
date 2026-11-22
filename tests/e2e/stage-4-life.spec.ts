import { test, expect, type Page } from "./fixtures";
import { openGarden, inviteMoa, openDrawer, startTalk } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const canvas = (page: Page) => page.locator(".game canvas");
const data = (page: Page, key: string) => canvas(page).evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);

test("11.15-1 친구는 서 있을 때도 멈춰 있지 않는다 (숨쉬기·두리번)", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  const samples = new Set<string>();
  for (let i = 0; i < 12; i++) {
    samples.add(await data(page, "guestMotion"));
    await page.waitForTimeout(250);
  }
  samples.delete("");
  expect(samples.size).toBeGreaterThan(3);
});

test("11.15-2·6·7 친구는 할 일을 골라 하고, 이모트로 끝내며, 같은 걸 연달아 안 하고, 혼잣말은 드물다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await expect(page.locator(".ambient-bubble")).toHaveCount(0, { timeout: 15_000 });
  const tasks: string[] = [];
  let bubbles = 0;
  let wasBubble = false;
  const end = Date.now() + 40_000;
  while (Date.now() < end && tasks.length < 3) {
    const t = await data(page, "guestTask");
    if (t && t !== tasks[tasks.length - 1]) tasks.push(t);
    const bubble = (await page.locator(".ambient-bubble").count()) > 0;
    if (bubble && !wasBubble) bubbles++;
    wasBubble = bubble;
    await page.waitForTimeout(300);
  }
  expect(tasks.length).toBeGreaterThanOrEqual(2);
  expect(new Set(tasks).size).toBe(tasks.length);
  expect(await data(page, "guestEmote")).toMatch(/heart|note|sparkle|zzz|dots/);
  // the greeting was the line for this 40 s window (TIMING.ambientGap)
  expect(bubbles).toBe(0);
});

test("11.15-5 대화하러 다가가면 친구가 플레이어 쪽을 본다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await startTalk(page);
  await expect.poll(() => data(page, "guestLooks"), { timeout: 10_000 }).toBe("player");
});

test("11.15-5 옷을 바꾸면 친구가 다가와서 알아챈다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await openDrawer(page);
  await page.locator(".tabs").getByRole("button", { name: "옷장" }).click();
  await page.locator(".item-cell", { hasText: "꽃 장식" }).click();
  await page.getByRole("button", { name: "입기", exact: true }).click();
  await expect.poll(() => data(page, "guestTask"), { timeout: 10_000 }).toBe("notice");
  await expect.poll(() => data(page, "guestEmote"), { timeout: 15_000 }).toBe("sparkle");
});
