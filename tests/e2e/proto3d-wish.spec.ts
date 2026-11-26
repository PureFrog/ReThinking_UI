// 피드백 2026-11-26 별똥별: at night in the village shooting stars fall now and then; a tap on one is a wish (nothing to
// fill in): I put my hands together, 보리 says the wish, it is kept and becomes a star in the jar on the shelf at home;
// the day's first one pays coins (ui/ShootingStars.tsx, Proto3D onWish, Interior3D StarJar). By day: none.
import { test, expect } from "./fixtures";
import * as V from "./village";
const SHOTS = process.env.WISH_SHOTS;
type P = import("@playwright/test").Page;
// one hook value (the whole hook object is large: reading it all is slow on this page)
const H = (page: P, k: string) => page.evaluate(key => (window as any).__proto3d[key], k);
const coins = async (page: P) => Number((await page.locator("button.rt-coins").getAttribute("aria-label"))?.replace(/[^0-9]/g, "") || 0);
const made = (page: P) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-wishes-v1") ?? "[]").length as number);
const wishOnce = async (page: P) => {
  await page.evaluate(() => (window as any).__proto3d.meteor());
  const star = page.getByRole("button", { name: /별똥별/ }).first();
  await expect(star).toHaveCount(1);
  await star.dispatchEvent("click");
};

test("a shooting star at night: a tap is the wish, coins once a day, a star in the jar", async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto("/proto3d?demo&weather=clear&hour=22");
  await V.villageReady(page, 120_000);
  await expect.poll(() => page.evaluate(() => typeof (window as any).__proto3d.meteor)).toBe("function");
  const before = await coins(page);
  // the pose lasts a few seconds: watched every frame in the page, not by polling from here
  await page.evaluate(() => { const w = window as any; w.__sawWishing = false; const tick = () => { if (w.__proto3d.wishing) w.__sawWishing = true; requestAnimationFrame(tick) }; tick() });
  await wishOnce(page);
  // no form: hands together, 보리's line, kept
  await expect(page.getByRole("dialog", { name: /소원/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__sawWishing)).toBe(true);
  expect(await H(page, "wishLine")).toBeTruthy();
  if (SHOTS) { await page.waitForTimeout(900); await page.screenshot({ path: SHOTS + "/wish-pose.png" }) }
  await expect.poll(() => made(page)).toBe(1);
  await expect.poll(() => coins(page)).toBe(before + 1000);
  await expect.poll(() => H(page, "wishing"), { timeout: 15_000 }).toBe(false);
  // a second wish the same day: kept, no more coins
  await wishOnce(page);
  await expect.poll(() => made(page)).toBe(2);
  await page.waitForTimeout(500);
  expect(await coins(page)).toBe(before + 1000);
  // at home: two stars in the jar on the shelf
  await page.evaluate(() => (window as any).__proto3d.room(true));
  await expect.poll(() => H(page, "starJar"), { timeout: 30_000 }).toBe(2);
  if (SHOTS) { await page.waitForTimeout(2500); await page.screenshot({ path: SHOTS + "/jar.png" }) }
});

test("no shooting stars by day", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page, 120_000);
  await page.waitForTimeout(9_000);
  await expect(page.getByRole("button", { name: /별똥별/ })).toHaveCount(0);
});
