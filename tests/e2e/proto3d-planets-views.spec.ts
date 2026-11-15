import { test, expect } from "./fixtures";

// 다른 정원들 on a phone turned on its side and on a wide screen: every planet's tag lands on screen, a visit opens its
// sheet beside the sky. Screenshots go to test-results for the stage report.
test.describe.configure({ timeout: 150_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "sets its own sizes"));
for (const [name, size] of [["sideways", { width: 844, height: 390 }], ["desktop", { width: 1400, height: 860 }], ["upright", { width: 390, height: 844 }]] as const) {
  test(`the sky ${name}: tags on screen, a visit sheet beside it`, async ({ page }, info) => {
    await page.setViewportSize(size);
    await page.goto("/?demo&weather=clear&sky");
    await expect(page.getByTestId("sky")).toBeVisible({ timeout: 30_000 });
    // the camera pulls back for 1.6 s; then the tags settle on their planets
    await expect.poll(async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".sky-tag")].filter(t => {
      const x = parseFloat(t.style.left), y = parseFloat(t.style.top); return x > 0 && x < innerWidth && y > 0 && y < innerHeight;
    }).length), { timeout: 30_000 }).toBeGreaterThanOrEqual(6);
    await page.waitForTimeout(800);
    await page.screenshot({ path: info.outputPath(`sky-${name}.png`) });
    await page.getByRole("button", { name: "북쪽창의 정원" }).dispatchEvent("click");
    const sheet = page.getByRole("region", { name: "북쪽창의 정원" });
    await expect(sheet).toBeInViewport();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: info.outputPath(`sky-${name}-visit.png`) });
  });
}
