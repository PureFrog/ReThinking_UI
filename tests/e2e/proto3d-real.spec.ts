import { test, expect, type Page } from "./fixtures";

// A garden on real prices (private test 2026-11-17, app/proto3d/ui/RealEntry.tsx): find a stock, give the day it was
// "bought" and how many; the buying price is that day's close, the return comes from the latest close. The server's
// stock names and bars (Supabase stock_names, price_daily) are stood in for by window.__priceFixture.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

function fixture() {
  const bars: { d: string; o: number; h: number; l: number; c: number; v: number }[] = [];
  let t = Date.parse("2026-08-03T00:00:00Z"), c = 70000;
  // 70,000 up to 80,000 by mid-September, then down to 66,000 by the last bar (a loss for a September buyer)
  for (let i = 0; i < 70; i++) {
    while ([0, 6].includes(new Date(t).getUTCDay())) t += 864e5;
    c = i < 30 ? 70000 + i * 340 : Math.max(66000, 80000 - (i - 30) * 360);
    bars.push({ d: new Date(t).toISOString().slice(0, 10), o: c, h: c, l: c, c, v: 1_000_000 });
    t += 864e5;
  }
  return { names: [{ code: "005930", name: "삼성전자", mkt: "KOSPI", close: c }, { code: "005935", name: "삼성전자우", mkt: "KOSPI", close: 60000 }], bars: { "005930": bars } };
}
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}"));

test("a new player puts a stock in on real prices: buying close from that day, return from the latest close", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const fx = fixture();
  await page.addInitScript(f => { (window as unknown as { __priceFixture?: unknown }).__priceFixture = f }, fx);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?fresh&weather=clear");
  const start = page.getByRole("dialog", { name: "내 종목 넣기" });
  await start.getByRole("button", { name: /실제 시세로/ }).click({ timeout: 30_000 });
  const sheet = page.getByRole("dialog", { name: "실제 시세로 넣기" });
  await sheet.getByLabel("1번 종목 찾기").fill("삼성");
  await sheet.getByRole("option", { name: /^삼성전자 005930/ }).click();
  const buy = fx.bars["005930"].find(b => b.d === "2026-09-14")!;
  await sheet.getByLabel("삼성전자 산 날짜").fill("2026-09-14");
  await expect(sheet.getByLabel("삼성전자 산 가격")).toHaveValue(String(buy.c));
  await expect(sheet).toContainText("그날 실제 종가예요");
  await sheet.getByLabel("삼성전자 수량").fill("3");
  await page.screenshot({ path: test.info().outputPath("real-entry.png") });
  await sheet.getByRole("button", { name: "정원에 넣기 · 1종목" }).click();
  await expect.poll(async () => (await save(page)).holdings?.length ?? 0, { timeout: 10_000 }).toBe(1);
  const h = (await save(page)).holdings[0];
  const last = fx.bars["005930"].at(-1)!;
  expect(h).toMatchObject({ name: "삼성전자", code: "005930", real: true, price: buy.c, quantity: 3, date: "2026-09-14", asOf: last.d });
  expect(h.rate).toBeCloseTo(Math.round((last.c / buy.c - 1) * 1000) / 10, 5);
  expect(h.lossDays).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
