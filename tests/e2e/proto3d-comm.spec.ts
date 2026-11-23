import { test, expect, type Page } from "./fixtures";

// 통신기 (B2C 기본, 2026-11-23; app/proto3d/ui/Comm.tsx, app/content/comm.ts): once the merchant has handed it over
// (grants 'tour'), a button on the screen opens the practice-account MTS over the garden. 잔고 holds the recorded
// stocks and the coin stocks; a tap answers in place (the two views); 현재가 is the merchant's five; 주문 buys with
// coins (the day-before article first) and sells a coin stock onto the farmer's cart. No real account, no real order.
test.describe.configure({ timeout: 420_000 });
const KEY = "rethink-garden-v1";
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`) });

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

  const btn = page.getByRole("button", { name: "통신기", exact: true });
  await expect(btn).toBeVisible({ timeout: 60_000 });
  await btn.click();
  const comm = page.getByRole("dialog", { name: "통신기" });
  await expect(comm).toBeVisible();
  await expect(comm.getByRole("note")).toContainText("실제 주문 아님");
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
  await five.first().getByRole("button").click();
  await expect(comm.getByRole("tab", { name: "매수" })).toHaveAttribute("aria-selected", "true");
  const buy = comm.getByRole("button", { name: "전날 뉴스를 먼저 읽어요" });
  await expect(buy).toBeDisabled();
  await comm.getByRole("button", { name: "기사 읽기" }).click();
  await comm.getByRole("button", { name: "한 주 더" }).click();
  await page.waitForTimeout(200);
  await shot(page, `comm-order-${info.project.name}`);
  await comm.getByRole("button", { name: /매수 주문 · 코인/ }).click();
  await expect(comm.getByRole("status")).toContainText("2주를 샀어요");

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
    const btn = page.getByRole("button", { name: "통신기", exact: true });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
    const comm = page.getByRole("dialog", { name: "통신기" });
    await expect(comm.getByRole("list", { name: "보유 종목" })).toBeVisible();
    const tabs = await comm.getByRole("navigation", { name: "아래 메뉴" }).boundingBox();
    expect(tabs!.y + tabs!.height).toBeLessThanOrEqual(h + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.waitForTimeout(300);
    await shot(page, `comm-${w}x${h}`);
    await comm.getByRole("button", { name: "통신기 닫기" }).click();
    await expect(comm).toHaveCount(0);
  }
});
