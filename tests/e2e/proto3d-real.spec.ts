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
  // (the onboarding has no 실제 시세로 button since 2026-11-23: typed lines resolve real names, next test; the exact-day
  // entry is still the 'real' sheet, opened here as the hook opens any sheet)
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __proto3d?: { open?: unknown } }).__proto3d?.open), { timeout: 30_000 }).toBe("function");
  await page.evaluate(() => (window as unknown as { __proto3d: { open: (s: unknown) => void } }).__proto3d.open({ kind: "real" }));
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

// capture or typed lines (ui/Onboarding.tsx): a name found among the KRX names goes in on real prices (buying day from
// the held period, price from the capture's average or that day's close); a name not found stays a mock tree
test("typed lines: a KRX name goes in on real prices, an unknown one stays mock", async ({ page }) => {
  const fx = fixture();
  await page.addInitScript(f => { (window as unknown as { __priceFixture?: unknown }).__priceFixture = f }, fx);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?fresh&weather=clear");
  await page.getByRole("dialog", { name: "내 종목 넣기" }).getByRole("button", { name: /직접 입력/ }).click({ timeout: 30_000 });
  const list = page.getByRole("dialog", { name: "종목 확인" });
  await list.getByLabel("1번 종목 이름").fill("삼성전자");
  await list.getByLabel("삼성전자 보유 기간").selectOption("month");
  await list.getByRole("button", { name: "종목 추가" }).click();
  await list.getByLabel("2번 종목 이름").fill("한빛전자");
  await list.getByLabel("한빛전자 수익률").fill("-31");
  await expect(list.locator('.rt-real-tag[data-real="yes"]')).toContainText("005930");
  await expect(list.locator('.rt-real-tag[data-real="no"]')).toContainText("모의");
  await list.getByRole("button", { name: "정원에 넣기 · 2종목" }).click();
  await expect.poll(async () => (await save(page)).holdings?.length ?? 0, { timeout: 10_000 }).toBe(2);
  const hs = (await save(page)).holdings as { name: string; real?: boolean; code?: string; price: number; asOf?: string }[];
  const sam = hs.find(h => h.name === "삼성전자")!, han = hs.find(h => h.name === "한빛전자")!;
  expect(sam).toMatchObject({ real: true, code: "005930", asOf: fx.bars["005930"].at(-1)!.d });
  expect(sam.price).toBeGreaterThan(0);
  expect(han.real).toBeFalsy();
});

// the market weather from the real KOSDAQ index (content/market.ts): the chip names the index and the bar's date, and
// the sky follows the day (-2.5% → 비바람); without index bars it says 예시
test("the weather is the real KOSDAQ day once the index is loaded", async ({ page }) => {
  const fx = { ...fixture(), bars: { ...fixture().bars, KOSDAQ: [
    { d: "2026-11-19", o: 900, h: 905, l: 895, c: 900 },
    { d: "2026-11-20", o: 900, h: 902, l: 870, c: 877.5 },
  ] } };
  await page.addInitScript(f => { (window as unknown as { __priceFixture?: unknown }).__priceFixture = f }, fx);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo");
  const chip = page.getByLabel("오늘 시장 날씨");
  await expect(chip).toContainText("코스닥 11-20", { timeout: 30_000 });
  await expect(chip).toContainText("비바람");
  await expect(chip).toContainText("-2.50%");
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-weather", "storm");
  await page.screenshot({ path: test.info().outputPath("market-real.png") });
});

test("without index bars the weather is a mock and says so", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo");
  await expect(page.getByLabel("오늘 시장 날씨")).toContainText("예시", { timeout: 30_000 });
});
