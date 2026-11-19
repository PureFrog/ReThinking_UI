// Feedback 2026-11-17: on a PC the sheets were a narrow column with small type. On a wide screen the sheet is a wider
// panel and the things over the garden read bigger.
import { test, expect } from "./fixtures";

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "a PC screen"));

test("PC: the journal sheet is a wide panel, the tabs are big enough", async ({ page }, info) => {
  await page.goto("/proto3d?demo&weather=clear");
  const dock = page.getByRole("navigation", { name: "메뉴" });
  await expect(dock).toBeVisible({ timeout: 30_000 });
  await dock.getByRole("button", { name: /^일지/ }).click();
  const book = page.getByRole("dialog", { name: "투자일지" });
  await expect(book).toBeVisible();
  const w = (await book.boundingBox())!.width;
  expect(w).toBeGreaterThan(560);
  const tab = (await dock.getByRole("button", { name: /^일지/ }).boundingBox())!;
  expect(tab.width).toBeGreaterThan(100);
  await page.screenshot({ path: info.outputPath("pc-journal.png") });
});
