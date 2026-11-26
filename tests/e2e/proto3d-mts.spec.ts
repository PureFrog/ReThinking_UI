import { test, expect, type Page } from "./fixtures";

// 가상 MTS (멘토링 2026-11-22, app/mts/). Two ways in:
//   /mts: ReThink's practice account. Tapping a stock answers in place (StockSheet.tsx): the books and the price path
//         side by side, a disagreement named, what the models cannot see; the garden is one button further.
//   /mts?demo=broker: ReThink inside a made-up brokerage app. One tap on "보유종목 점검" opens ReThink in a web view
//         and the balance arrives by itself over postMessage (core/embed.ts), no capture or typing.
// Lines without a buying day are asked once. The player's own garden (rethink-garden-v1) is untouched.
// the web view loads the whole 3D garden twice (open, close, reopen): slow on a busy PC
test.describe.configure({ timeout: 300_000 });

const REAL_BROKERS = /미래에셋|키움|삼성증권|한국투자|NH투자|KB증권|토스증권|신한투자|대신증권|하나증권|m-stock/i;
const KOSDAQ8 = ["028300", "086520", "145020", "196170", "214150", "247540", "263750", "277810"];
const garden = (page: Page) => page.frames().find(f => /embed=mts/.test(f.url()))!;
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`) });

test("practice account: a tap on a stock answers in place, the two views side by side", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/mts");
  await expect(page.getByRole("note").filter({ hasText: "가상 증권사 데모 화면" })).toBeVisible();
  await expect(page.getByText("연습 계좌", { exact: true })).toBeVisible();
  // the account keeps to KOSDAQ, the market the models read
  const rows = page.getByRole("list", { name: "보유 종목" }).getByRole("listitem");
  await expect(rows).toHaveCount(8);
  await expect(rows.filter({ hasText: "코스피" })).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(REAL_BROKERS);
  await shot(page, `mts-practice-${info.project.name}`);

  // the value trap: books fine, price falling — said as a disagreement, right here, no garden on the way
  const t0 = Date.now();
  await page.getByRole("button", { name: "펄어비스 분석 보기" }).click();
  const sheet = page.getByRole("dialog", { name: "펄어비스 분석" });
  await expect(sheet).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(3000);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(sheet.getByRole("status")).toContainText("엇갈림");
  await expect(sheet.getByRole("status")).toContainText("두 관점이 엇갈려요");
  await expect(sheet.getByRole("region", { name: "기업 체력" })).toContainText("튼튼");
  await expect(sheet.getByRole("region", { name: "주가 흐름" })).toContainText("내려가는 중");
  await expect(sheet.getByRole("img", { name: "최근 60거래일 종가" })).toBeVisible();
  await expect(sheet).toContainText("수급");
  expect(await sheet.innerText()).not.toMatch(/팔아|사세요|매수하|매도하|오를 거/);
  await page.waitForTimeout(300);
  await shot(page, `mts-sheet-trap-${info.project.name}`);
  await sheet.getByRole("button", { name: "닫기" }).click();
  await expect(sheet).toHaveCount(0);

  // a badge opens the same sheet: both views on the same side
  await page.getByRole("button", { name: /^에코프로비엠 재무 체력 낮음/ }).click();
  const eco = page.getByRole("dialog", { name: "에코프로비엠 분석" });
  await expect(eco.getByRole("status")).toContainText("두 관점이 같은 쪽을 봐요");
  await page.waitForTimeout(300);
  await shot(page, `mts-sheet-both-${info.project.name}`);

  // the long version is one button away
  await eco.getByRole("button", { name: /정원에서 자세히/ }).click();
  await expect(eco).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "보유종목 점검" })).toBeVisible();
  await expect(page.locator('iframe[title="ReThink"]')).toHaveAttribute("src", "/?embed=mts");
  expect(errors).toEqual([]);
});

test("broker demo: one tap in the MTS opens the garden with that balance, no capture or typing", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/mts?demo=broker");

  // the demo mark, no real broker, a disabled 주문 tab
  await expect(page.getByRole("note").filter({ hasText: "가상 증권사 데모 화면" })).toBeVisible();
  await expect(page.getByText("RT증권", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "보유 종목" }).getByRole("listitem")).toHaveCount(8);
  expect(await page.locator("body").innerText()).not.toMatch(REAL_BROKERS);
  const order = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "주문" });
  await expect(order).toHaveAttribute("aria-disabled", "true");
  await order.click({ force: true }); // aria-disabled: Playwright would wait for it to be enabled
  await expect(page.getByRole("status")).toHaveText("데모에서는 주문할 수 없어요");
  // the model badges
  await expect(page.getByRole("button", { name: /^에코프로비엠 재무 체력 낮음/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^펄어비스 서서히 악화/ })).toBeVisible();
  await shot(page, `mts-${info.project.name}`);

  // one tap
  await page.getByRole("button", { name: /보유종목 점검/ }).click();
  await expect(page.getByRole("dialog", { name: "보유종목 점검" })).toBeVisible();
  const web = page.frameLocator('iframe[title="ReThink"]');
  // the hand-off: first the broker's own white list with the same rows, then the garden
  const handoff = web.getByRole("dialog", { name: "잔고 가져오기" });
  await expect(handoff.getByRole("list", { name: "가져온 종목" }).getByRole("listitem")).toHaveCount(8, { timeout: 90_000 });
  await page.waitForTimeout(1300);
  await shot(page, `mts-handoff-${info.project.name}`);
  // two lines came without a buying day: asked once, on one sheet
  const ask = web.getByRole("dialog", { name: "산 날짜" });
  await expect(ask).toBeVisible({ timeout: 60_000 });
  await expect(ask.getByLabel(/산 날짜/)).toHaveCount(2);
  await ask.getByLabel("알테오젠 산 날짜").fill("2026-05-20");
  await ask.getByRole("button", { name: "정원에 넣기" }).click();

  await expect.poll(() => garden(page).evaluate(() => (window as unknown as { __proto3d?: { embed?: { holdings: number } } }).__proto3d?.embed?.holdings ?? 0), { timeout: 30_000 }).toBe(8);
  const saved = await garden(page).evaluate(() => ({ e: JSON.parse(localStorage.getItem("rethink-garden-embed") ?? "{}"), own: localStorage.getItem("rethink-garden-v1") }));
  expect(saved.e.holdings.map((h: { code: string }) => h.code).sort()).toEqual(KOSDAQ8);
  expect(saved.e.holdings.find((h: { code: string }) => h.code === "247540").date).toBe("2026-08-27");
  expect(Object.keys(saved.e.buyDates).sort()).toEqual(["196170", "214150"]);
  expect(saved.own === null || !JSON.parse(saved.own).holdings?.length).toBe(true);
  // the notes open by themselves once the trees are in
  await expect(web.getByRole("dialog", { name: "오늘 브리핑" })).toBeVisible({ timeout: 30_000 });
  await expect(handoff).toHaveCount(0);
  await page.waitForTimeout(800);
  await shot(page, `mts-garden-${info.project.name}`);

  // back in the MTS, a badge answers in place; its button opens the garden on that stock, the days not asked again
  await page.getByRole("button", { name: "닫기" }).click();
  await page.getByRole("button", { name: /^펄어비스 서서히 악화/ }).click();
  await page.getByRole("dialog", { name: "펄어비스 분석" }).getByRole("button", { name: /리씽크에서 자세히/ }).click();
  // the tapped stock leads the hand-off list
  await expect(handoff.getByRole("listitem").first()).toContainText("펄어비스", { timeout: 120_000 });
  await expect.poll(() => garden(page)?.evaluate(() => (window as unknown as { __proto3d?: { embed?: { focus: string | null } } }).__proto3d?.embed?.focus ?? null), { timeout: 120_000 }).toBe("263750");
  await expect(web.getByRole("dialog", { name: "산 날짜" })).toHaveCount(0);
  await expect(web.getByRole("dialog", { name: "브리핑" })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __mts?: { sent: number } }).__mts?.sent)).toBe(2);
  expect(errors).toEqual([]);
});

test("the MTS and its sheet fit a portrait and a landscape phone", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "phone sizes");
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/mts");
    await expect(page.getByRole("list", { name: "보유 종목" })).toBeVisible();
    // no sideways scroll; the bottom tabs stay on screen
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tabs = await page.getByRole("navigation", { name: "아래 메뉴" }).boundingBox();
    expect(tabs!.y + tabs!.height).toBeLessThanOrEqual(h + 1);
    await shot(page, `mts-${w}x${h}`);
    await page.getByRole("button", { name: "알테오젠 분석 보기" }).click();
    const sheet = page.getByRole("dialog", { name: "알테오젠 분석" });
    await expect(sheet.getByRole("status")).toContainText("엇갈림");
    // both views side by side, the close button reachable
    const [a, b] = await Promise.all([sheet.getByRole("region", { name: "기업 체력" }).boundingBox(), sheet.getByRole("region", { name: "주가 흐름" }).boundingBox()]);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(4);
    await sheet.getByRole("button", { name: "닫기" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot(page, `mts-sheet-${w}x${h}`);
    await sheet.getByRole("button", { name: "닫기" }).click();
  }
});
