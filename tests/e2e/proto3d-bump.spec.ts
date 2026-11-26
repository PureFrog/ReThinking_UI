import { test, expect } from "./fixtures";
// 피드백 2026-11-26 "NPC끼리, 나도 서로 몸을 통과 … 부딪히면 '미안! 지나갈게!'": walking straight at someone goes round
// them (never closer than the two bodies), and says sorry once over my head
test.describe.configure({ timeout: 180_000 });
test("내가 사람에게 곧장 걸어가도 통과하지 않고 비켜 가며 사과한다", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => Object.assign(window, { __localAuth: true, __noLanding: true, __noHouse: true, __noIntro: true, __noTutorial: true }));
  await page.goto("/?demo&hour=10&weather=clear");
  await page.waitForFunction(() => (window as any).__proto3d?.ready, null, { timeout: 60_000 });
  await page.waitForTimeout(3000);
  // someone standing still 2 ahead of me, and a goal straight through them
  const plan = await page.evaluate(() => {
    const L = (window as any).__npcLive as Record<string, { x: number; z: number }>, me = { ...L.me };
    L.dummy = { x: me.x, z: me.z + 2 };
    return { id: "dummy", gx: me.x, gz: me.z + 4.5 };
  });
  await page.evaluate(([x, z]) => (window as any).__proto3d.goTo(x, z), [plan.gx, plan.gz]);
  let closest = 99, shot = false;
  for (let i = 0; i < 60; i++) {
    closest = Math.min(closest, await page.evaluate((id) => { const L = (window as any).__npcLive; return Math.hypot(L.me.x - L[id].x, L.me.z - L[id].z) }, plan.id));
    if (!shot && await page.evaluate(() => !!(window as any).__proto3d.bumped)) { shot = true; await page.waitForTimeout(350); await page.screenshot({ path: process.env.BUMP_SHOT || info.outputPath("sorry.png") }); }
    await page.waitForTimeout(150);
  }
  expect(closest).toBeGreaterThan(0.45);
  expect(await page.evaluate(() => (window as any).__proto3d.bumped)).toBe("dummy");
  // and I got past them
  expect(await page.evaluate((z) => (window as any).__npcLive.me.z > z - 1, plan.gz)).toBe(true);
  expect(errors).toEqual([]);
});
