// 피드백 2026-11-26 campfire: the village's people walk round the fire and the stumps, lantern and basket round it
// (places.ts FIRE_R, FIRE_DECOR), with no errors; I can still walk to the log and sit on it (Scene3D sitDown).
import { test, expect } from "./fixtures";
import * as V from "./village";
type H = { npcs?: Record<string, { x: number; z: number }>; fire?: { x: number; z: number }; fireSeat?: { x: number; z: number }; sitting?: boolean; sitFire?: () => void; player: { x: number; z: number } };
const H = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __proto3d: H }).__proto3d);

test("the village's people never step into the fire's stone ring", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()) });
  await page.goto("/proto3d?demo&weather=clear&hour=14&wander");
  await V.villageReady(page, 120_000);
  // every frame, how close each one comes to the middle of the fire
  await page.evaluate(() => { const h = (window as unknown as { __proto3d: H }).__proto3d, min: Record<string, number> = ((window as unknown as { __fireMin: Record<string, number> }).__fireMin = {});
    const tick = () => { for (const k in h.npcs) { const p = h.npcs![k]; min[k] = Math.min(min[k] ?? 99, Math.hypot(p.x - h.fire!.x, p.z - h.fire!.z)) } requestAnimationFrame(tick) }; tick() });
  await page.waitForTimeout(60_000);
  const min = await page.evaluate(() => (window as unknown as { __fireMin: Record<string, number> }).__fireMin);
  expect(Object.keys(min).length).toBeGreaterThan(2);
  // the stones sit 0.66 out (about 0.8 with their width); a body is ~0.3 wide
  for (const [k, d] of Object.entries(min)) expect(d, k).toBeGreaterThan(1.05);
  expect(errors).toEqual([]);
});

test("I can still walk to the log by the fire and sit on it", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page, 120_000);
  await page.evaluate(() => (window as unknown as { __proto3d: H }).__proto3d.sitFire!());
  await expect.poll(async () => (await H(page)).sitting, { timeout: 60_000 }).toBe(true);
  const h = await H(page);
  expect(Math.hypot(h.player.x - h.fireSeat!.x, h.player.z - h.fireSeat!.z)).toBeLessThan(0.3);
});
