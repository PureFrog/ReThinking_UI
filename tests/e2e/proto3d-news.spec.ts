// News excerpts on screen (사용자 2026-11-22: RSS has no body, but it has the publisher's short excerpt). The village news
// board, the merchant's day-before news and the observatory flow show the excerpt under the headline; no body anywhere.
import { test, expect } from "./fixtures";
import * as V from "./village";
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const BANNED = /팔아|사세요|매수하세요|매도하세요|오를 거|내릴 거/;

test("the news board: every article has its excerpt under the headline", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear");
  await V.villageReady(page);
  await V.openSheet(page, { kind: "news" });
  const board = page.getByRole("dialog", { name: "뉴스 표지판" });
  await expect(board).toBeVisible();
  // the quests up top step aside on a phone while a sheet is open (they used to cover the sheet's title)
  await expect(page.locator(".rt-quests")).toHaveCSS("opacity", "0");
  await expect(page.locator(".rt-quests")).toHaveCSS("pointer-events", "none");
  // turned on its side the sheet stands top right: the coins and the gear step aside so its close button is free
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".rt-top-right")).toHaveCSS("opacity", "0");
  await expect(page.locator(".rt-quests")).toHaveCSS("opacity", "1");
  // (a trial click fails when something else would take the tap)
  await board.getByRole("button", { name: "닫기" }).click({ trial: true, timeout: 20_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const items = board.locator(".vl-articles li");
  await expect.poll(() => items.count()).toBeGreaterThan(0);
  const n = await items.count();
  await expect(board.locator(".vl-articles .vl-news-sum")).toHaveCount(n);
  for (let i = 0; i < n; i++) {
    const sum = (await items.nth(i).locator(".vl-news-sum").textContent())!.trim();
    expect(sum.length).toBeGreaterThan(15);
    expect(sum).not.toMatch(BANNED);
    // the excerpt sits between the headline and the stock · date line
    const [h, s, d] = await Promise.all(["strong", ".vl-news-sum", "small"].map(sel => items.nth(i).locator(sel).boundingBox()));
    expect(h!.y).toBeLessThan(s!.y);
    expect(s!.y).toBeLessThan(d!.y);
  }
  await page.screenshot({ path: info.outputPath("news-board.png") });
});

test("the 통신기 is a phone; its 뉴스 tab lists articles and opens one with what to look at", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear&hour=14");
  await V.villageReady(page);
  await V.openSheet(page, { kind: "comm", tab: "order" });
  const comm = page.getByRole("dialog", { name: "모의투자" });
  await expect(comm.locator(".rt-phone")).toBeVisible();
  await comm.getByRole("navigation", { name: "아래 메뉴" }).getByRole("button", { name: "뉴스" }).click();
  const rows = comm.locator(".rt-news-row");
  expect(await rows.count()).toBeGreaterThan(4);
  await expect(comm.locator(".rt-news-note")).toContainText("모의 기사");
  await rows.first().click();
  const art = comm.locator(".rt-art");
  await expect(art.locator("h3")).toBeVisible();
  await expect(art.locator(".rt-art-look")).toContainText("이 기사에서 볼 것");
  expect((await art.locator(".rt-art-body p").first().textContent())!.length).toBeGreaterThan(15);
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath("comm-article.png") });
  await art.getByRole("button", { name: "뉴스 닫기" }).click();
  await expect(art).toHaveCount(0);
});

test("the observatory flow: the excerpt under the headline as the days arrive", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear&quest");
  const dq = page.getByTestId("daily-quest");
  await expect(dq).toBeVisible({ timeout: 30_000 });
  await dq.getByRole("button", { name: "포트폴리오 보기" }).click();
  await dq.getByRole("button", { name: "장면 1 시작" }).click();
  const news = dq.getByTestId("dq-news");
  await expect(news).toContainText("과자 원재료 값 오름세", { timeout: 15_000 });
  const first = news.locator("li", { hasText: "과자 원재료 값 오름세" });
  await expect(first.locator(".dq-news-sum")).toContainText("밀가루와 설탕 수입 단가");
  await page.screenshot({ path: info.outputPath("quest-news.png") });
});
