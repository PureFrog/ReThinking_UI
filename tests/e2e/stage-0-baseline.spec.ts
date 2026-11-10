import { test, expect } from "./fixtures";

// 0단계 기준선: 고치기 전 현재 화면이 뜨는지만 확인하고 스크린샷을 남긴다.
// 스크린샷은 test-results/baseline/에 저장되고 커밋하지 않는다.
test("13.3 기준선 — 정원 화면이 오류 없이 뜬다", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0);
  // Phaser 첫 프레임과 첫 친구 등장 전 화면이 안정될 시간을 준다.
  await page.waitForTimeout(2_000);

  await page.screenshot({ path: `test-results/baseline/${testInfo.project.name}.png` });
  expect(errors).toEqual([]);
});
