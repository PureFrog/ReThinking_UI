// 피드백 2026-11-22: "예시 정원으로 시작" on the first screen is a new player too: the room's first quiz, the
// introductions outside (I walk to each by myself), and after that the house is the room seen from outside (3인칭).
import { test, expect, type Page } from "./fixtures";
import { answerPaper } from "./quiz-answer";
test.describe.configure({ timeout: 600_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "one screen is enough"));
// 피드백 2026-11-22 (UI 피드백): this path runs with the talk shown one or two sentences a bubble (?pages): "계속" until the answer
async function choose(page: Page, scope: string, name: string) {
  const box = page.locator(scope);
  for (let i = 0; i < 12; i++) {
    const c = box.getByRole("button", { name: new RegExp("^\\W*" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") });
    if (await c.isVisible().catch(() => false)) { await c.click(); return }
    const more = box.getByRole("button", { name: /^\W*계속$/ });
    if (await more.isVisible().catch(() => false)) { await more.click(); continue }
    await page.waitForTimeout(300);
  }
  throw new Error("no answer " + name);
}
const h = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: Record<string, any> }).__proto3d ?? {});

test("the sample garden still has the first quiz, the walk-up introductions and the room", async ({ page }, info) => {
  await page.goto("/?fresh&tutorial&pages&hour=10&weather=clear");
  await page.getByRole("button", { name: "예시 정원으로 시작" }).click();
  await expect(page.getByTestId("house")).toBeVisible({ timeout: 30_000 });
  // one or two sentences a bubble, the answers on the bubble itself (in the middle, not the corner)
  await expect(page.locator(".hs-talk .rt-talk-line")).toContainText("선생님이야", { timeout: 20_000 });
  await expect(page.locator(".hs-talk .rt-talk-line")).not.toContainText("문제 하나 풀어 보자");
  const box = await page.locator(".hs-talk .rt-talk-box").boundingBox(), vw = page.viewportSize()!.width;
  expect(Math.abs(box!.x + box!.width / 2 - vw / 2)).toBeLessThan(40);
  await expect(page.locator(".hs-talk .rt-talk-box").getByRole("button", { name: "계속" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("demo-quiz-bubble.png") });
  await expect.poll(async () => (await h(page)).house?.paper).toBe("glow");
  await choose(page, ".hs-talk", "종이 누르기");
  await choose(page, ".hs-talk", "응");
  await choose(page, ".hs-talk", "종이 펼치기");
  await answerPaper(page);
  await page.getByRole("button", { name: "해설 봤어 · 고개 들기" }).click();
  await expect.poll(async () => (await h(page)).house?.door).toBe(true);
  await choose(page, ".hs-talk", "밖으로 나가기");
  await expect(page.locator(".vl-villager")).toContainText("보리야", { timeout: 20_000 });
  // nobody walks me: 토리 is lit and I go there myself (a tap on 토리), then the talk from my eyes
  const MEET_IDS = ["tori", "moa", "luon", "farmer", "merchant", "paperboy", "librarian", "naru", "builder", "tailor"];
  for (const [i, who] of ["토리", "모아", "루온", "농부", "상인", "신문 배달", "사서", "나루", "건물 점원", "옷 점원"].entries()) {
    await expect.poll(async () => (await h(page)).walk?.lead, { timeout: 20_000 }).toBeTruthy();
    await expect(page.locator(".vl-guide")).toContainText(who);
    if (i === 0) await page.screenshot({ path: info.outputPath("demo-lead-tori.png") });
    await page.evaluate(id => (window as any).__proto3d.meet(id), MEET_IDS[i]);
    await expect(page.locator(".vl-villager .rt-talk-name")).toContainText(who, { timeout: 40_000 });
    if (i === 0) await page.screenshot({ path: info.outputPath("demo-tori.png") });
    // no bubble holds more than two sentences
    const line = (await page.locator(".vl-villager .rt-talk-line").innerText()).trim();
    expect(line.split(/(?<=[.!?…~])\s+/).length).toBeLessThanOrEqual(2);
    // the wardrobe never comes up from a tap on me during the walk
    expect(await page.locator(".rt-me-panel").count()).toBe(0);
    await choose(page, ".vl-villager", i === 9 ? "산책 시작" : "다음 사람");
  }
  // then the first walk's first stop is lit the same way
  await expect(page.locator(".vl-guide")).toContainText("농부", { timeout: 20_000 });
  await expect.poll(async () => (await h(page)).walk?.lead).toBeTruthy();
  // the example garden's stocks are not mine: the farmer asks before planting them (KOSDAQ examples)
  await page.evaluate(() => (window as any).__proto3d.meet("farmer"));
  await expect(page.locator(".vl-villager .rt-talk-name")).toContainText("농부", { timeout: 40_000 });
  await choose(page, ".vl-villager", "예시로 심어 보기");
  expect((await h(page)).walk?.planted).toBe(false);
  // the first lesson is kept, so the house is the room from now on (after the walk)
  expect(await page.evaluate(() => localStorage.getItem("rethink-lesson-v1"))).toBeTruthy();
});
