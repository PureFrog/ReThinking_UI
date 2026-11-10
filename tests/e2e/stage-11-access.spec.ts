import { test, expect, type Page } from "./fixtures";
import { openDrawer } from "./helpers";

// ux-spec 8장 모바일·접근성: settings for the words' size and the typing speed; on a phone every target is 44×44px or more.
test.describe.configure({ timeout: 90_000 });
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3") ?? "{}"));

test("8장 설정: 글자 크기와 대사 속도를 고르면 저장되고 바로 반영된다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await openDrawer(page);
  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("group", { name: "글자 크기" }).getByRole("button", { name: "크게" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await page.getByRole("group", { name: "대사 속도" }).getByRole("button", { name: "바로" }).click();
  await expect(page.getByRole("group", { name: "대사 속도" }).getByRole("button", { name: "바로" })).toHaveAttribute("aria-pressed", "true");
  const s = (await saved(page)).settings;
  expect(s.textSize).toBe("large");
  expect(s.typeSpeed).toBe("instant");
  // at once: the next line shows whole without typing
  await page.keyboard.press("Escape");
  await expect(page.locator(".thought-bubble .typing-cursor")).toHaveCount(0);
});

test("8장 모바일: 패널과 설정의 누를 곳은 모두 44px 이상", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch sizes are for phones");
  await page.goto("/");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await openDrawer(page);
  for (const tab of ["보유함", "옷장", "설정"]) {
    await page.getByRole("button", { name: tab }).click();
    const small = await page.evaluate(() => [...document.querySelectorAll(".object-panel button, .object-panel select, .object-panel input:not([type=checkbox]), .object-panel .setting-row")]
      .map(e => ({ e, b: e.getBoundingClientRect() })).filter(({ b }) => b.width > 0 && (b.width < 44 || b.height < 44))
      .map(({ e, b }) => `${e.tagName} ${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 12)} ${Math.round(b.width)}×${Math.round(b.height)}`));
    expect(small, tab).toEqual([]);
  }
});
