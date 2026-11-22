import { test, expect, type Page } from "./fixtures";

// 가상 MTS (멘토링 2026-11-22, app/mts/): inside a made-up brokerage app, one tap on "보유종목 점검" (or a badge) opens
// ReThink in a web view and the balance arrives by itself over postMessage (core/embed.ts) — no capture, no typing.
// Lines the broker sent without a buying day are asked once. The player's own garden (rethink-garden-v1) is untouched.
// the web view loads the whole 3D garden twice (open, close, reopen from a badge): slow on a busy PC
test.describe.configure({ timeout: 300_000 });

const REAL_BROKERS = /미래에셋|키움|삼성증권|한국투자|NH투자|KB증권|토스증권|신한투자|대신증권|하나증권|m-stock/i;
const garden = (page: Page) => page.frames().find(f => /embed=mts/.test(f.url()))!;
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`) });

test("one tap in the MTS opens the garden with that balance, no capture or typing", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/mts");

  // the demo mark, no real broker, a disabled 주문 tab
  await expect(page.getByRole("note").filter({ hasText: "가상 증권사 데모 화면" })).toBeVisible();
  await expect(page.getByRole("list", { name: "보유 종목" }).getByRole("listitem")).toHaveCount(8);
  expect(await page.locator("body").innerText()).not.toMatch(REAL_BROKERS);
  const order = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "주문" });
  await expect(order).toHaveAttribute("aria-disabled", "true");
  await order.click({ force: true }); // aria-disabled: Playwright would wait for it to be enabled
  await expect(page.getByRole("status")).toHaveText("데모에서는 주문할 수 없어요");
  await expect(page.getByRole("list", { name: "보유 종목" })).toBeVisible();
  // the model badges
  await expect(page.getByRole("button", { name: /^삼성전자 급락 감지/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^카카오 서서히 악화/ })).toBeVisible();
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
  await expect(ask.getByRole("combobox", { name: /보유 기간/ })).toHaveCount(2);
  await shot(page, `mts-dates-${info.project.name}`);
  await ask.getByRole("combobox", { name: "KB금융 보유 기간" }).selectOption("half");
  await ask.getByRole("button", { name: "정원에 넣기" }).click();

  await expect.poll(() => garden(page).evaluate(() => (window as unknown as { __proto3d?: { embed?: { holdings: number } } }).__proto3d?.embed?.holdings ?? 0), { timeout: 30_000 }).toBe(8);
  const saved = await garden(page).evaluate(() => ({ e: JSON.parse(localStorage.getItem("rethink-garden-embed") ?? "{}"), own: localStorage.getItem("rethink-garden-v1") }));
  expect(saved.e.holdings.map((h: { code: string }) => h.code).sort()).toEqual(["000660", "005380", "005930", "035420", "035720", "105560", "196170", "247540"]);
  expect(saved.e.holdings.find((h: { code: string }) => h.code === "005930").date).toBe("2026-06-10");
  expect(Object.keys(saved.e.buyDates).sort()).toEqual(["105560", "196170"]);
  expect(saved.own === null || !JSON.parse(saved.own).holdings?.length).toBe(true);
  // the notes open by themselves once the trees are in
  await expect(web.getByRole("dialog", { name: "오늘 브리핑" })).toBeVisible({ timeout: 30_000 });
  await expect(handoff).toHaveCount(0);
  await page.waitForTimeout(800);
  await shot(page, `mts-garden-${info.project.name}`);

  // back in the MTS, a badge opens the same garden on that stock; the buying days are not asked again
  await page.getByRole("button", { name: "닫기" }).click();
  await page.getByRole("button", { name: /^카카오 서서히 악화/ }).click();
  // the tapped stock leads the hand-off list
  await expect(handoff.getByRole("listitem").first()).toContainText("카카오", { timeout: 120_000 });
  await expect.poll(() => garden(page)?.evaluate(() => (window as unknown as { __proto3d?: { embed?: { focus: string | null } } }).__proto3d?.embed?.focus ?? null), { timeout: 120_000 }).toBe("035720");
  await expect(web.getByRole("dialog", { name: "산 날짜" })).toHaveCount(0);
  await expect(web.getByRole("dialog", { name: "브리핑" })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __mts?: { sent: number } }).__mts?.sent)).toBe(2);
  expect(errors).toEqual([]);
});

test("the MTS fits a portrait and a landscape phone", async ({ page }, info) => {
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
  }
});
