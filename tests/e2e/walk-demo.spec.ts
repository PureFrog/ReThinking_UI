// 피드백 2026-11-22: "예시 정원으로 시작" on the first screen is a new player too: the room's first quiz, the
// introductions outside (I walk to each by myself), and after that the house is the room seen from outside (3인칭).
import { test, expect, type Page } from "./fixtures";
import { answerPaper } from "./quiz-answer";
test.describe.configure({ timeout: 300_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "one screen is enough"));
const h = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: Record<string, any> }).__proto3d ?? {});

test("the sample garden still has the first quiz, the walk-up introductions and the room", async ({ page }, info) => {
  await page.goto("/?fresh&tutorial&hour=10&weather=clear");
  await page.getByRole("button", { name: "예시 정원으로 시작" }).click();
  await expect(page.getByTestId("house")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".rt-talk-line")).toContainText("문제 하나 풀어 보자", { timeout: 20_000 });
  await expect.poll(async () => (await h(page)).house?.paper).toBe("glow");
  await page.getByRole("button", { name: "종이 누르기" }).click();
  await page.getByRole("button", { name: /^\W*응$/ }).click();
  await page.getByRole("button", { name: "종이 펼치기" }).click();
  await answerPaper(page);
  await page.getByRole("button", { name: "해설 봤어 · 고개 들기" }).click();
  await expect.poll(async () => (await h(page)).house?.door).toBe(true);
  await page.getByRole("button", { name: "밖으로 나가기" }).click();
  await expect(page.locator(".vl-villager")).toContainText("데려다줄게", { timeout: 20_000 });
  // no tap: I walk over to 토리 by myself, then the talk
  await expect.poll(async () => (await h(page)).walk?.talk?.phase, { timeout: 20_000 }).toBe("walk");
  await expect(page.locator(".vl-villager .rt-talk-name")).toContainText("토리", { timeout: 40_000 });
  await expect(page.locator(".vl-villager")).toContainText("돈을 어떻게 버는지");
  await page.screenshot({ path: info.outputPath("demo-tori.png") });
  for (const [i, who] of ["토리", "모아", "루온", "농부", "상인", "신문 배달", "나루", "건물 점원", "옷 점원"].entries()) {
    await expect(page.locator(".vl-villager .rt-talk-name")).toContainText(who, { timeout: 40_000 });
    await page.locator(".vl-villager").getByRole("button", { name: i === 8 ? "산책 시작" : "다음 사람" }).click();
  }
  // the rest of the walk, then back into the house: the room with the teacher's tour
  for (let k = 0; k < 12; k++) {
    const st = (await h(page)).walk?.step;
    if (!st) break;
    await page.evaluate(s => (window as any).__proto3d.walkPass(s), st);
    await page.waitForTimeout(600);
  }
  await expect(page.locator(".vl-villager")).toContainText("마음대로 다녀", { timeout: 20_000 });
  await page.locator(".vl-villager").getByRole("button", { name: "좋아" }).click();
  await expect.poll(async () => (await h(page)).walk?.on).toBe(false);
  await page.evaluate(() => (window as any).__proto3d.landmark("house"));
  await expect.poll(async () => (await h(page)).inside, { timeout: 15_000 }).toBe(true);
  await expect(page.locator(".vl-villager")).toContainText("책상 뒤에", { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: info.outputPath("demo-room.png") });
});
