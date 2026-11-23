import { test, expect } from "./fixtures";

// 가입 없이 둘러보기 (B2C 기본, 2026-11-23): open on the real server again. The e2e pages use device-only accounts
// (fixtures.ts __localAuth); here that is turned off so the landing is the one the real server shows. Looking around
// keeps the garden on this device: no save goes to the server, and the free talk says it opens with a log-in.
test.describe.configure({ timeout: 180_000 });

test("the landing offers looking around without an account, and it opens the garden on this device only", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => { (window as unknown as { __localAuth?: boolean }).__localAuth = false });
  const sent: string[] = [];
  page.on("request", r => { if (/\/rest\/v1\/(gardens|saves|jigi)|\/functions\/v1\//.test(r.url())) sent.push(r.url()) });
  await page.goto("/proto3d?landing&weather=clear");
  const land = page.getByTestId("welcome");
  await expect(land).toBeVisible({ timeout: 30_000 });
  const guest = land.getByRole("button", { name: "가입 없이 둘러보기" });
  await expect(guest).toBeVisible();
  await page.screenshot({ path: info.outputPath(`guest-landing-${info.project.name}.png`) });
  await guest.click();
  await expect(land).toHaveCount(0);
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => sessionStorage.getItem("rethink-guest"))).toBe("1");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: info.outputPath(`guest-garden-${info.project.name}.png`) });
  expect(sent).toEqual([]);
  expect(errors).toEqual([]);
});
