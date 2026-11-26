// 2026-11-26 feedback round (interactive village): a far door is walked to before going in; a chair is sat on with a
// tap (a taken one is not); an animal can be petted and pays once a day; the arcade's 분산 바구니 pays for its score.
import { test, expect } from "./fixtures";
import * as V from "./village";
const H = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __proto3d: Record<string, any> }).__proto3d);

test("a far door: the tap walks there, in on arrival", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page);
  await page.evaluate(() => (window as any).__proto3d.landmarkTap("arcade"));
  await page.waitForTimeout(600);
  await expect(page.getByTestId("arcade")).toHaveCount(0);
  await expect(page.getByTestId("arcade")).toHaveCount(1, { timeout: 120_000 });
});

test("a chair in the house: sit, stand; the tutor's armchair is hers", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page);
  await page.evaluate(() => (window as any).__proto3d.room(true));
  await expect.poll(async () => (await H(page)).seats?.length ?? 0, { timeout: 30_000 }).toBeGreaterThan(1);
  const seats = (await H(page)).seats as { id: string; taken: boolean }[];
  expect(seats.find(s => s.id === "armchair")?.taken).toBe(false);
  await page.evaluate(() => (window as any).__proto3d.sit("armchair"));
  await expect.poll(async () => (await H(page)).seat, { timeout: 20_000 }).toBe("armchair");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await H(page)).seat, { timeout: 20_000 }).toBe(null);
});

test("petting the cat pays once a day; the menu has both choices", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page);
  const coins = async () => Number((await page.locator("button.rt-coins").getAttribute("aria-label"))?.replace(/[^0-9]/g, "") || 0);
  const before = await coins();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("rt-pet-pick", { detail: { id: "stray-cat", at: { x: 0, z: 0 } } })));
  const menu = page.getByRole("dialog", { name: /회색이/ });
  await expect(menu.getByRole("button", { name: "쓰다듬기" })).toBeVisible();
  await expect(menu.getByRole("button", { name: /간식/ })).toBeVisible();
  await menu.getByRole("button", { name: "쓰다듬기" }).click();
  await expect.poll(coins, { timeout: 10_000 }).toBeGreaterThan(before);
});

test("분산 바구니 reports its score; the arcade pays coins for it", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page);
  await page.evaluate(() => (window as any).__proto3d.landmark("arcade"));
  await expect(page.getByTestId("arcade")).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => !!(await H(page)).arcade, { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => (window as any).__proto3d.arcade.pick("basket"));
  await expect(page.getByTestId("arcade")).toHaveAttribute("data-game", "basket", { timeout: 60_000 });
  const game = page.frameLocator("iframe[title='분산 바구니']");
  await game.getByRole("button", { name: "시작!" }).click();
  const f = page.frames().find(x => x.url().includes("/arcade/basket/"))!;
  await f.evaluate(() => (window as any).__basket.end());
  await expect(game.locator("#paid")).toContainText(/코인|10점/, { timeout: 10_000 });
});
