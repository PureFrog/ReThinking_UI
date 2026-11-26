// 지도 (피드백 2026-11-26 "지도에서 낚시터 누르면 이동이 안 돼, 일일이 연결 확인"): every place's "여기로 가기" walks me
// there, going round stalls and rocks on the way (Scene3D Player + places.ts npcStep).
import { test, expect } from "./fixtures";
import * as V from "./village";
const me = (page: import("@playwright/test").Page) => page.evaluate(() => (window as any).__proto3d.player as { x: number; z: number });
const WALK: Record<string, string> = { 밭: "farm", 과수원: "orchard", 도서관: "library", "건물 상점": "cart", 낚시터: "pond" };

test("each open place on the map is walked to", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/proto3d?demo&weather=clear&hour=14");
  await V.villageReady(page);
  const walks = await page.evaluate(async () => { const P: any = await import(/* @vite-ignore */ ("/app/proto3d/places.ts" as string)); return Object.fromEntries(P.PLACES.map((p: any) => [p.id, p.walk])); });
  for (const [label, id] of Object.entries(WALK)) {
    await page.getByRole("button", { name: "지도", exact: true }).click();
    const map = page.getByRole("dialog", { name: "정원 지도" });
    await map.getByRole("button", { name: label, exact: true }).click();
    await map.getByRole("button", { name: "여기로 가기" }).click();
    const w = walks[id];
    const t0 = Date.now();
    await expect.poll(async () => { const p = await me(page); return Math.hypot(p.x - w.x, p.z - w.z); }, { timeout: 60_000, message: label }).toBeLessThan(1.2);
    console.log('MAPGO', label, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
});
