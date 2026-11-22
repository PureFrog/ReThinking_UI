// 투자학습 퀴즈 100문항: answer the paper on top whatever its kind (the first option, the items in the order shown, a 0
// in a blank), then wait for its back. Right or wrong does not matter to the tests that use it.
import { expect, type Page } from "@playwright/test";
export async function answerPaper(page: Page) {
  const quiz = page.locator(".hs-quiz[data-side=front]");
  await expect(quiz).toBeVisible();
  const kind = await quiz.getAttribute("data-kind");
  const send = page.locator(".hs-send");
  if (kind === "stamp" || kind === "true_false") await page.locator(".hs-stamp").first().click();
  else if (kind === "classification" || kind === "scenario") await page.locator(".hs-opts .hs-opt").first().click();
  else if (kind === "multiple_select") { await page.locator(".hs-opts .hs-opt").first().click(); await send.click() }
  else if (kind === "ordering") { const n = await page.locator(".hs-opts .hs-opt").count(); for (let i = 0; i < n; i++) await page.locator(".hs-opts .hs-opt").nth(i).click(); await send.click() }
  else if (kind === "direction") {
    const rows = page.locator(".hs-dir"), n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).locator(".hs-chipbtn").first().click();
    if (n > 1) await send.click();
  }
  else if (kind === "matching") {
    const n = await page.locator(".hs-left .hs-opt").count();
    for (let i = 0; i < n; i++) { await page.locator(".hs-left .hs-opt").nth(i).click(); await page.locator(".hs-right .hs-opt").nth(i).click() }
    await send.click();
  }
  else if (kind === "fill_blank") { await page.locator(".hs-fill input").first().fill("0"); await send.click() }
  await expect(page.locator(".hs-quiz[data-side=back] .hs-ink")).toBeVisible();
}
