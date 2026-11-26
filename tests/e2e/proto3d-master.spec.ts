import { test, expect } from "./fixtures";

// 거장의 집 · 버핏의 서재 (buffett_house_ui.md, ui/MasterStudy.tsx): in from the village, a book out of the shelf, read to
// the last page and finished; Buffett offers that book's quiz; three answers (all wrong) still pay the first-time coins
// once; a review pays nothing more.
test.describe.configure({ timeout: 240_000 });

test("서재: 책 완독 → 버핏 퀴즈 → 첫 완료 코인 한 번", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => Object.assign(window, { __localAuth: true, __noLanding: true, __noHouse: true, __noIntro: true, __noTutorial: true, __talkAll: true }));
  await page.goto("/?demo&hour=10&weather=clear");
  await page.waitForFunction(() => (window as any).__proto3d?.ready, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__proto3d.landmark("master"));
  await expect(page.getByTestId("master-study")).toBeVisible({ timeout: 15_000 });
  const coins = async () => Number((await page.locator(".ms-hud .rt-coins .rt-coins-full").textContent())!.replace(/[^0-9]/g, ""));
  const before = await coins();
  await page.evaluate(() => (window as any).__proto3d.study.pick("02"));
  // 피드백 2026-11-26: the book is a lesson; a step that asks to try something waits for it
  const reader = page.getByRole("dialog", { name: /제 2권 수업/ });
  await expect(reader).toBeVisible();
  const next = reader.locator(".ls-next");
  for (let i = 0; i < 12; i++) {
    if ((await next.textContent())?.includes("수업 마치기")) break;
    if (await next.isDisabled()) {
      // 미스터 마켓: let each day go by
      for (let d = 0; d < 6 && await next.isDisabled(); d++) { await reader.getByRole("button", { name: "그냥 보낸다" }).click(); await reader.locator(".ls-go").click({ force: true }); }
    }
    await expect(next).toBeEnabled(); await next.click();
  }
  await next.click();
  await expect(reader).toBeHidden();
  await expect(page.locator(".ms-bubble")).toHaveText("제 2권 퀴즈");
  await page.evaluate(() => (window as any).__proto3d.study.talk());
  await page.getByRole("button", { name: "제 2권 퀴즈 풀기" }).click();
  for (let i = 0; i < 3; i++) {
    const opt = page.locator(".ms-opt");
    await opt.nth(3).click();
    await page.getByRole("button", { name: "답 제출" }).click();
    await expect(page.getByRole("status").filter({ hasText: /오답|정답/ })).toBeVisible();
    await page.getByRole("button", { name: /다음 문제|결과 보기/ }).click();
  }
  await expect(page.locator(".ms-result")).toContainText("코인 +10,000원");
  expect(await coins()).toBe(before + 10_000);
  await page.getByRole("button", { name: "대화 마치기" }).click();
  // a review: no second payment
  await page.evaluate(() => (window as any).__proto3d.study.talk());
  await page.getByRole("button", { name: "제 2권 다시 풀기" }).click();
  for (let i = 0; i < 3; i++) {
    const opt = page.locator(".ms-opt");
    await opt.first().click();
    await page.getByRole("button", { name: "답 제출" }).click();
    await page.getByRole("button", { name: /다음 문제|결과 보기/ }).click();
  }
  await expect(page.locator(".ms-result")).toContainText("이미 받았어요");
  expect(await coins()).toBe(before + 10_000);
  expect(errors).toEqual([]);
});
