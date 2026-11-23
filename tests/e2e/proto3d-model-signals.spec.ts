import { test, expect, type Page } from "./fixtures";

// The team's model output in the garden (2026-11-23, app/core/model-signals.ts): a stock put in on real prices gets the
// friends' notes from its 서서히 verdict (holding_signals) and luon's 반박 result (analysis_results); a stock outside the
// team's 120 says so in its 재무 체력 sheet. The server is stood in for by window.__priceFixture and
// window.__modelSignalFixture.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

function prices() {
  const bars: { d: string; o: number; h: number; l: number; c: number; v: number }[] = [];
  let t = Date.parse("2026-08-03T00:00:00Z");
  // a flat line: the chart flags nothing, so every note on screen comes from the model fixture
  for (let i = 0; i < 70; i++) {
    while ([0, 6].includes(new Date(t).getUTCDay())) t += 864e5;
    bars.push({ d: new Date(t).toISOString().slice(0, 10), o: 50000, h: 50000, l: 50000, c: 50000, v: 1_000_000 });
    t += 864e5;
  }
  return { names: [{ code: "344820", name: "KCC글라스", mkt: "KOSPI", close: 50000 }], bars: { "344820": bars } };
}
const verdict = (p: Record<string, unknown> = {}) => ({
  code: "344820", buy_date: "", status: "available", verdict: "Yes", fscore: 2, ohlson_score: 2, dupont_score: 1, sum_total: 5,
  eval_date: "2026-11-20", financial_as_of: "2026-08-14", price_as_of: "2026-11-20", release_id: 31,
  evidence: {
    fscore: { status: "scored", detail: { f_score_buy: 6, f_score_eval: 3, fiscal_year_buy: 2024, fiscal_year_eval: 2025 } },
    ohlson: { status: "scored", detail: { s_buy: 0.041, s_eval: -0.032, omega_state_buy: "high", omega_state_eval: "low" } },
    dupont: { status: "scored", detail: { dPM_adj_pp: -1.2, dATO_rel_pct: 3.5 } },
  }, ...p,
});
const analysis = {
  request_id: "r1", company_id: "344820", status: "done", decision: "thesis_factually_inconsistent", alert_date: "2026-11-22",
  as_of: "2026-06-30", analyzed_at: "2026-11-22T10:00:00+09:00",
  result: {
    decision: "thesis_factually_inconsistent", as_of: "2026-06-30",
    claim: [{ span: "영업이익률이 다시 올라갈 거라고 봐", evaluation: { tag: "undercut" } }],
    grounds: [{ span: "수주도 늘고 있어서", evaluation: { tag: "contradicted" } }],
    question_candidates: [{ text: "원자재 가격 하락이 판가 인하로 이어지지 않아야 한다" }],
  },
};

// put KCC글라스 in by typed lines (it is found among the KRX names, so it goes in on real prices), then come back with
// the model fixture for the buying day the garden chose
async function plant(page: Page, models: (buy: string) => unknown) {
  await page.addInitScript(p => { (window as unknown as { __priceFixture?: unknown }).__priceFixture = p }, prices());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?fresh&weather=clear");
  await page.getByRole("dialog", { name: "내 종목 넣기" }).getByRole("button", { name: /직접 입력/ }).click({ timeout: 30_000 });
  const list = page.getByRole("dialog", { name: "종목 확인" });
  await list.getByLabel("1번 종목 이름").fill("KCC글라스");
  await list.getByLabel("KCC글라스 보유 기간").selectOption("month");
  await expect(list.locator('.rt-real-tag[data-real="yes"]')).toContainText("344820");
  await list.getByRole("button", { name: "정원에 넣기 · 1종목" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").holdings?.[0]?.date ?? null), { timeout: 10_000 }).not.toBeNull();
  const buy: string = await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!).holdings[0].date);
  await page.addInitScript(m => { (window as unknown as { __modelSignalFixture?: unknown }).__modelSignalFixture = m }, models(buy));
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { modelSignals?: { verdicts: number } } }).__proto3d?.modelSignals?.verdicts ?? -1), { timeout: 30_000 }).toBeGreaterThanOrEqual(0);
}
type Sig = { id: string; holdingId: number; analyst: string; model: string; loss: boolean; headline: string };
const signals = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: { signals?: Sig[] } }).__proto3d?.signals ?? []);
const brief = async (page: Page, model: string) => {
  const id = (await signals(page)).find(x => x.model === model)!.id;
  const sheet = page.getByRole("dialog", { name: "브리핑" }), bori = page.getByRole("dialog", { name: "보리와 대화" });
  // a loss signal also opens 보리's talk on its own (any moment after load): put it away and open the note again
  for (let i = 0; i < 5; i++) {
    if (await bori.isVisible()) await bori.getByRole("button", { name: "나중에 얘기할게" }).click();
    await page.evaluate(i => (window as unknown as { __proto3d: { openBrief: (id: string) => void } }).__proto3d.openBrief(i), id);
    if (await sheet.waitFor({ state: "visible", timeout: 3_000 }).then(() => true, () => false)) {
      await page.waitForTimeout(500);
      if (!(await bori.isVisible()) && await sheet.isVisible()) break;
    }
  }
  return sheet;
};

test("a covered stock: moa and luon speak from the verdict, luon brings back the rebuttal", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await plant(page, buy => ({ verdicts: [verdict({ buy_date: buy })], analyses: [analysis] }));
  await expect.poll(async () => (await signals(page)).map(x => [x.analyst, x.model, x.loss, x.headline]), { timeout: 15_000 }).toEqual([
    ["moa", "ohlson", true, "초과이익률 +4.1% → -3.2%"],
    ["luon", "fscore", true, "재무 체력 6점 → 3점 (9점 만점)"],
    ["luon", "rebuttal", false, "네 근거 하나가 숫자와 반대야"],
  ]);                                                            // dupont 1 < 2: tori stays quiet
  const moa = await brief(page, "ohlson");
  await expect(moa.getByRole("article", { name: "모아 리서치 노트" })).toContainText("시장 기대 (ω)");
  await page.screenshot({ path: test.info().outputPath("model-signals-ohlson.png") });
  const luon = await brief(page, "rebuttal");
  const note = luon.getByRole("article", { name: "루온 리서치 노트" });
  await expect(note.locator(".rt-note-head strong")).toHaveText("루온 · 반박");        // not 루온's own role (F-Score)
  await expect(note).toContainText("숫자와 반대");
  await expect(note).toContainText("숫자로 못 가린 조건");
  await page.screenshot({ path: test.info().outputPath("model-signals-rebuttal.png") });
  expect(errors).toEqual([]);
});

test("a covered stock's 재무 체력 shows the verdict's numbers, not the mock roots", async ({ page }) => {
  await plant(page, buy => ({ verdicts: [verdict({ buy_date: buy })] }));
  await expect.poll(async () => (await signals(page)).length, { timeout: 15_000 }).toBe(2);
  const b = await brief(page, "fscore");
  await expect(b.getByRole("button", { name: /재무 체력 보기/ })).toContainText("F-Score · 올슨 · 듀퐁");   // a real holding
  await b.getByRole("button", { name: /재무 체력 보기/ }).click();
  const deep = page.getByRole("dialog", { name: "재무 체력" });
  await expect(deep).toContainText("6 → 3점");
  await expect(deep).toContainText("손실 신호");
  await expect(deep).not.toContainText("모의 데이터");
  await page.screenshot({ path: test.info().outputPath("model-signals-deep.png") });
});

test("a stock outside the 120 gets no model notes", async ({ page }) => {
  await plant(page, buy => ({ verdicts: [verdict({ buy_date: buy, status: "not_covered", verdict: null, fscore: null, ohlson_score: null, dupont_score: null, evidence: null })] }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { modelSignals?: { verdicts: number } } }).__proto3d?.modelSignals?.verdicts), { timeout: 15_000 }).toBe(1);
  expect((await signals(page)).filter(x => ["ohlson", "fscore", "dupont", "rebuttal"].includes(x.model))).toEqual([]);
});

// 급락 (drop_events, 2026-11-23): a drop event on the stock since the buying day comes from the team's model, as moa's note
test("a covered stock with a recent drop event: moa's 급락 note from the model", async ({ page }) => {
  const after = (d: string, n: number) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
  await plant(page, buy => ({
    verdicts: [verdict({ buy_date: buy })],
    drops: [{ code: "344820", drop_date: after(buy, 7), last_hit_date: after(buy, 7), n_hit_days: 1, ret_pct: -12.4,
      index_ret_pct: -0.8, ar_pct: -11.6, sigma_ar_pct: 3.1, z: -3.74, market_adjusted: true }],
  }));
  await expect.poll(async () => (await signals(page)).filter(x => x.model === "crash").map(x => [x.analyst, x.loss, x.headline]),
    { timeout: 15_000 }).toEqual([["moa", true, expect.stringMatching(/시장 대비 -11\.6%p$/)]]);
  const b = await brief(page, "crash");
  const note = b.getByRole("article", { name: "모아 리서치 노트" });
  await expect(note.locator(".rt-note-head strong")).toHaveText("모아 · 급락");         // not 모아's own role (올슨 모델)
  await expect(note).toContainText("평소 변동 대비");
  await expect(note).toContainText("3.7배");
  await page.screenshot({ path: test.info().outputPath("model-signals-drop.png") });
});
