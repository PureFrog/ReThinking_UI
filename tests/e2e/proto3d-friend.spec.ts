import { test, expect } from "./fixtures";

// 보리 the guinea pig (core/friend.ts, ui/Friend.tsx): stands in the garden, starts a talk from today's garden, a few quick
// replies open the right place, and after one talk a day the bubble stays quiet.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

test("보리 comes over, talks about today, and a reply opens the grades", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible({ timeout: 30_000 });
  // it stands in the scene (its point is reported like the analysts')
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __proto3d?: { points?: Record<string, unknown> } }).__proto3d?.points?.["friend-bori"]), { timeout: 30_000 }).toBe(true);
  // its bubble comes first: the demo garden has grades waiting, so that is what it brings up
  const bubble = page.locator('.rt-bubble[data-analyst="bori"]');
  await expect(bubble).toBeVisible({ timeout: 20_000 });
  await expect(bubble).toContainText("채점");
  await page.screenshot({ path: info.outputPath("friend-bubble.png") });
  await bubble.click();
  const talk = page.getByRole("dialog", { name: "보리와 대화" });
  await expect(talk).toBeVisible();
  await expect(talk).not.toContainText(/팔아|사 둬|살까|매도|매수|오를 거|내릴 거/);
  await page.screenshot({ path: info.outputPath("friend-talk.png") });
  await talk.getByRole("button", { name: "응, 보여줘" }).click();
  await expect(page.getByRole("dialog", { name: /전 내 판단|채점/ })).toBeVisible({ timeout: 5_000 });
  // talked today: no more bubble from 보리
  await page.reload();
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(6000);
  await expect(bubble).toHaveCount(0);
  expect(errors).toEqual([]);
});
