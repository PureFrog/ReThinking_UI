import { test, expect } from "./fixtures";

// 거장의 집 · 버핏의 서재 (buffett_house_ui.md, ui/MasterStudy.tsx): in from the village, a book out of the shelf, read to
// the last page and finished; Buffett offers that book's quiz; four answers (all wrong) still pay the first-time coins
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
  const reader = page.getByRole("dialog", { name: /제 2권/ });
  await expect(reader).toBeVisible();
  for (let i = 0; i < 10; i++) { const n = page.getByRole("button", { name: "다음 쪽" }); if (await n.isDisabled()) break; await n.click(); await page.waitForTimeout(450); }
  await page.getByRole("button", { name: "다 읽고 덮기" }).click();
  await expect(reader).toBeHidden();
  await expect(page.locator(".ms-bubble")).toHaveText("제 2권 퀴즈");
  await page.evaluate(() => (window as any).__proto3d.study.talk());
  await page.getByRole("button", { name: "제 2권 퀴즈 풀기" }).click();
  for (let i = 0; i < 4; i++) {
    const opt = page.locator(".ms-opt");
    if (await opt.count()) await opt.nth(3).click(); else await page.locator(".ms-word input").fill("모름");
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
  for (let i = 0; i < 4; i++) {
    const opt = page.locator(".ms-opt");
    if (await opt.count()) await opt.first().click(); else await page.locator(".ms-word input").fill("x");
    await page.getByRole("button", { name: "답 제출" }).click();
    await page.getByRole("button", { name: /다음 문제|결과 보기/ }).click();
  }
  await expect(page.locator(".ms-result")).toContainText("이미 받았어요");
  expect(await coins()).toBe(before + 10_000);
  expect(errors).toEqual([]);
});
