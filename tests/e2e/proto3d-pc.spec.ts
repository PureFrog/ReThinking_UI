// Feedback 2026-11-17: on a PC the sheets were a narrow column with small type. On a wide screen the sheet is a wider
// panel and the things over the garden read bigger.
import { test, expect } from "./fixtures";
import * as V from "./village";

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "a PC screen"));

test("PC: the journal sheet is a wide panel, the corner buttons are big enough", async ({ page }, info) => {
  await page.goto("/proto3d?demo&weather=clear");
  await V.villageReady(page);
  // the village has no tab dock (나현 2026-11-22): the buttons over the garden are big enough to press
  for (const b of [V.controls(page), page.getByRole("button", { name: "수첩 펼치기" }), page.getByRole("button", { name: "설정" })]) {
    const r = (await b.boundingBox())!;
    expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(36);
  }
  await V.journal(page);
  const book = page.getByRole("dialog", { name: "투자일지" });
  await expect(book).toBeVisible();
  const w = (await book.boundingBox())!.width;
  expect(w).toBeGreaterThan(560);
  await page.screenshot({ path: info.outputPath("pc-journal.png") });
});
