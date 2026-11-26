import { test, expect, type Page } from "./fixtures";

// 통신기 (B2C 기본, 2026-11-23; app/proto3d/ui/Comm.tsx, app/content/comm.ts): once the merchant has handed it over
// (grants 'tour'), the merchant opens the practice-account MTS over the garden (피드백 11-26: only the merchant, no button
// on the screen). 잔고 holds the recorded
// stocks and the coin stocks; a tap answers in place (the two views); 현재가 is the merchant's five; 주문 buys with
// coins (the day-before article first) and sells a coin stock onto the farmer's cart. No real account, no real order.
test.describe.configure({ timeout: 420_000 });
const KEY = "rethink-garden-v1";
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`) });

// walk to the merchant and take 모의투자 from him
async function openComm(page: Page) {
  await page.waitForFunction(() => (window as any).__proto3d?.ready, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__proto3d.meet("merchant"));
  await page.getByRole("button", { name: /모의투자 열기/ }).click({ timeout: 60_000 });
  // the merchant opens it on 주문; the tests start from 잔고
  await page.getByRole("dialog", { name: "모의투자" }).getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "잔고" }).click();
}

async function seeded(page: Page, url: string) {
  await page.goto("/proto3d?demo&hour=10&weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(k => !!localStorage.getItem(k), KEY), { timeout: 30_000 }).toBe(true);
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)!); s.grants = [...(s.grants ?? []), "tour"]; s.currency = 3_000_000; localStorage.setItem(k, JSON.stringify(s)) }, KEY);
  await page.goto(url);
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
}

test("the communicator: balance, an answer in place, today's five, a coin order", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await seeded(page, "/proto3d?hour=10&weather=clear");

  await expect(page.getByRole("button", { name: "모의투자", exact: true })).toHaveCount(0);
  await openComm(page);
  const comm = page.getByRole("dialog", { name: "모의투자" });
  await expect(comm).toBeVisible();
  // the phone header drops the pill (max 430px); the foot always says it
  await expect(comm.locator(".mts-foot")).toContainText("실제 계좌와 연결되지 않습니다");
  const rows = comm.getByRole("list", { name: "보유 종목" }).getByRole("listitem");
  await expect(rows).toHaveCount(7);
  await expect(comm.getByRole("region", { name: "계좌 요약" })).toContainText("코인");
  await expect(comm.getByRole("region", { name: "계좌 요약" })).toContainText("3,000,000");
  expect(await comm.innerText()).not.toMatch(/팔아|사세요|오를 거/);
  await page.waitForTimeout(300);
  await shot(page, `comm-balance-${info.project.name}`);

  // a tap answers in place: the same sheet as the MTS
  await comm.getByRole("button", { name: "카카오 분석 보기" }).click();
  const sheet = page.getByRole("dialog", { name: "카카오 분석" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("수급");
  await sheet.getByRole("button", { name: "닫기" }).click();
  await expect(sheet).toHaveCount(0);

  // 현재가: the merchant's five; a tap goes to the order
  await comm.getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "현재가" }).click();
  const five = comm.getByRole("list", { name: "오늘 들어온 종목" }).getByRole("listitem");
  await expect(five).toHaveCount(5);
  // a row opens the stock's page (chart, 호가); 매수 there goes to the order
  await five.first().getByRole("button").click();
  await comm.locator(".rt-sp .rt-comm-go.buy").click();
  await expect(comm.getByRole("tab", { name: "매수" })).toHaveAttribute("aria-selected", "true");
  // 2026-11-26: no news gate in front of 매수; an order asks for a confirmation like a broker app
  await comm.getByRole("button", { name: "한 주 더" }).click();
  await page.waitForTimeout(200);
  await shot(page, `comm-order-${info.project.name}`);
  await comm.getByRole("button", { name: /매수 주문 · 코인/ }).click();
  await comm.getByRole("alertdialog", { name: "매수 주문 확인" }).getByRole("button", { name: "매수 확인" }).click();
  // 피드백 2026-11-26: a new stock is planted before the eyes (the app closes, the sapling comes up), then the merchant
  // says so and can open the app again
  await expect(comm).toHaveCount(0);
  await expect(page.getByText(/심었어! 가상 나무 값은/)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(300);
  await shot(page, `comm-planted-${info.project.name}`);
  await page.getByRole("button", { name: /더 사기/ }).click();
  await expect(comm).toBeVisible();

  // the coin stock is in the balance, and it can be sold (the farmer loads the cart)
  await comm.getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "잔고" }).click();
  await expect(rows).toHaveCount(8);
  await expect(rows.filter({ hasText: "코인" })).toHaveCount(1);
  await comm.getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "주문" }).click();
  await comm.getByRole("tab", { name: "매도" }).click();
  await comm.getByRole("list", { name: "팔 수 있는 종목" }).getByRole("button").first().click();
  await expect(comm.getByRole("button", { name: "수량을 골라요" })).toBeDisabled();
  await comm.getByRole("slider", { name: "매도 수량" }).fill("1");
  await comm.getByRole("button", { name: "매도 주문 · 1주" }).click();
  await comm.getByRole("alertdialog", { name: "매도 주문 확인" }).getByRole("button", { name: "매도 확인" }).click();
  await expect(comm).toHaveCount(0);
  // the farmer walks to the tree and loads the cart
  await expect(page.getByRole("status").filter({ hasText: "수레에 실었어요" })).toBeVisible({ timeout: 120_000 });
  expect(errors).toEqual([]);
});

test("the communicator fits a portrait and a landscape phone", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "phone sizes");
  await seeded(page, "/proto3d?hour=10&weather=clear");
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await openComm(page);
    const comm = page.getByRole("dialog", { name: "모의투자" });
    await expect(comm.getByRole("list", { name: "보유 종목" })).toBeVisible();
    const tabs = await comm.getByRole("navigation", { name: "아래 메뉴" }).boundingBox();
    expect(tabs!.y + tabs!.height).toBeLessThanOrEqual(h + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.waitForTimeout(300);
    await shot(page, `comm-${w}x${h}`);
    await comm.getByRole("button", { name: "모의투자 닫기" }).click();
    await expect(comm).toHaveCount(0);
  }
});
