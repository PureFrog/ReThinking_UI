import { test, expect } from "./fixtures";

// 오늘의 관측소 editors' screen (/editor): the sample bundle opens publishable; an edit that leaks the period is caught at
// once; the level preview follows the server's course (the sample request alone here); the operations tab answers (a note without a server or an editor).
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "an editor's screen: one wide run is enough"));

test("the editor: live publish checks, the level preview, the operations tab", async ({ page }) => {
  await page.goto("/editor");
  const ed = page.getByTestId("editor");
  await expect(ed).toBeVisible({ timeout: 60_000 });
  await expect(ed.getByTestId("ed-report")).toContainText("발행 가능");
  // a year in a card is a period leak: the report turns at once and the card shows why
  const c1 = ed.getByTestId("ed-card-c1");
  await c1.getByLabel("사실").fill("솔빛산업 2024년 4분기 영업이익 +18%");
  await expect(ed.getByTestId("ed-report")).toContainText("발행 불가");
  await expect(ed.getByTestId("ed-report")).toContainText("[period]");// a scene-wide leak
  await expect(c1).toContainText("[unsourced-number]");// and the card says which numbers have no source
  await expect(ed.getByRole("button", { name: "서버에 올리기" })).toBeDisabled();
  await c1.getByLabel("사실").fill("솔빛산업 지난 분기 영업이익 +18%");
  await expect(ed.getByTestId("ed-report")).toContainText("발행 가능");
  // the preview: level 1 marks the cards to look at first. The course is the server's (feedback F1): with no server the
  // app knows the sample request only, so the later levels are not here to preview
  const pv = ed.getByTestId("ed-preview");
  await expect(pv).toContainText("먼저 볼 자료");
  await expect(ed.getByRole("button", { name: "Lv.1" })).toBeVisible();
  await expect(ed.getByRole("button", { name: "Lv.4" })).toHaveCount(0);
  await ed.getByRole("tab", { name: "운영" }).click();
  await expect(ed.getByTestId("ed-ops")).toBeVisible();
});
