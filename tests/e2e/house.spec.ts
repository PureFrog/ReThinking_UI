// 집과 마을 (PM 설계 2026-11-19 8장 플레이 검수): the house desk first, the quiz and the Lv.5 lock, the door, the case file
// (time stops until a judgment and the order are confirmed; no paper from after the day) and the village's name-only trees.
import { test, expect, type Page } from "./fixtures";
import { answerPaper } from "./quiz-answer";
const btn = (p: Page, n: string) => p.getByRole("button", { name: n }).first();
const house = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: { house?: { door: boolean; drawer: string; caseFile: string } } }).__proto3d?.house ?? null);
const caseFile = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: { caseFile?: { phase: string; pages: number; docs: string[]; lastDay: string } | null } }).__proto3d?.caseFile ?? null);
// 9-2: today's papers, stamped one by one; the back of each, then the results sheet
async function doQuiz(page: Page) {
  await btn(page, "문서 받기").click();
  for (let i = 0; i < 12; i++) {
    if (!(await page.locator(".hs-quiz[data-side=front]").isVisible())) break;
    await answerPaper(page);
    await expect(page.locator(".hs-back")).toContainText("정답");
    await page.locator(".hs-acts .rt-btn.primary").click();
  }
  await expect(page.locator(".hs-results")).toContainText("경험치");
  await btn(page, "고개 들기").click();
}

test("a new account sits at the desk: 보리, the sheet and the locked drawer with the exact level; the door opens with the quiz", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/?house");
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "quiz");
  await expect(page.locator(".hs-plate")).toContainText("퀴즈 Lv.5에 열려요");
  await expect(page.locator(".hs-plate")).toContainText("현재 Lv.1");
  await expect.poll(async () => (await house(page))?.door).toBe(false);
  await doQuiz(page);
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "locked-done");
  await expect.poll(async () => (await house(page))?.door).toBe(true);
  await expect(page.locator(".rt-talk-line")).toContainText("오늘은 여기까지야");
  // the same day again: no second quiz, the door already open
  await page.reload();
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "locked-done");
  await btn(page, "밖으로 나가기").click();
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village");
});

test("Lv.5: the case file — time waits for the judgment, no paper from later, earlier pages kept", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/?house&quizlv=5");
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "quiz-first");
  await doQuiz(page);
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "unlocked");
  await btn(page, "사건철 펼치기").click();
  await btn(page, "표지 젖히기").click();
  await btn(page, "다음 결정일로").click();
  await expect.poll(async () => (await caseFile(page))?.phase).toBe("moment");
  const c = (await caseFile(page))!;
  expect(c.docs.every(d => d <= c.lastDay)).toBe(true);
  // two steps: reading the papers, then writing the judgment
  await expect(page.locator(".cd-tabs button")).toHaveCount(2);
  await btn(page, "판단 쓰러 가기").click();
  await expect(page.getByRole("button", { name: "판단 확정" })).toBeDisabled();
  await page.getByRole("radio", { name: "비슷할 것 같다" }).click();
  await page.locator(".cd-field textarea").first().fill("시장보다 덜 빠졌다");
  await page.getByRole("radio", { name: "1/8 매도" }).click();
  await page.getByRole("button", { name: "판단 확정" }).click();
  await expect.poll(async () => (await caseFile(page))?.pages).toBe(1);
  // closed midway: the bookmark brings it back
  await btn(page, "책갈피 끼우고 덮기").click();
  await page.reload();
  await btn(page, "책갈피부터 이어 보기").click();
  await expect.poll(async () => (await caseFile(page))?.pages).toBe(1);
});

test("a paper left alone stamps 시간 초과 and turns over; leaving halfway goes on from the next paper", async ({ page }) => {
  test.setTimeout(180000);
  await page.goto("/?house");
  await expect(page.getByTestId("house")).toHaveAttribute("data-paws", /push|tap-paper/);
  await btn(page, "문서 받기").click();
  await expect(page.getByTestId("house")).toHaveAttribute("data-paws", "hold");
  await expect(page.locator(".hs-type")).toContainText("No.01");
  // the clock runs by the kind of question (core/timing.ts QUIZ_SECONDS, up to 75 seconds)
  await expect(page.locator(".hs-ink[data-c=late]")).toHaveText("시간 초과", { timeout: 80000 });
  await expect(page.locator(".hs-back")).toContainText("시간이 지났어요");
  await btn(page, "잠깐 고개 들기").click();
  await page.reload();
  await expect(page.locator(".rt-talk-line")).toContainText("이어 보자");
  await btn(page, "이어서 보기").click();
  await expect(page.locator(".hs-type")).toContainText("No.02");
});

test("보리's paws stay where the day is: the plate, the case file, the place I work at", async ({ page }) => {
  await page.goto("/?house");
  await page.locator(".hs-plate").click();
  await expect(page.getByTestId("house")).toHaveAttribute("data-paws", "plate");
  const at = () => page.evaluate(() => (window as unknown as { __proto3d: { house: { pawAt: { r: number[] } } } }).__proto3d.house.pawAt.r[1]);
  // still moving there, not reached and put back
  // (polled: on a slow, loaded run a single 300 ms sample can fall between two slow frames)
  const a = await at();
  await expect.poll(async () => Math.abs((await at()) - a), { timeout: 3_000 }).toBeGreaterThan(0.0005);
  await page.goto("/?house&quizlv=5&quest");
  await expect(page.locator(".cd")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("house")).toHaveAttribute("data-paws", /case-/);
});

test("토리·모아·루온 are back in the village and talk in their own voice: small talk or one of my holdings", async ({ page }) => {
  await page.goto("/?demo&bori");
  await expect(page.locator(".rt-talk-line")).toContainText("예시 신호", { timeout: 20000 });
  await page.getByRole("button", { name: "나중에", exact: true }).click();
  await expect(page.locator(".rt-talk")).toHaveCount(0, { timeout: 10000 });
  await page.evaluate(() => (window as unknown as { __proto3d: { talkTo: (id: string) => void } }).__proto3d.talkTo("luon"));
  await expect(page.locator(".rt-talk-name")).toHaveText("루온");
  await expect(page.getByRole("button", { name: "말 걸기" })).toHaveCount(0);
  await btn(page, "내 종목 얘기").click({ timeout: 15000 });
  const pick = page.locator(".rt-talk-choice").first();
  const name = (await pick.textContent())!.trim();
  await pick.click();
  await expect(page.locator(".rt-sheet h2").first()).toHaveText(name, { timeout: 10000 });
});

test("the village: trees carry their names only, no tab dock; a tree opens its stock's notebook", async ({ page }) => {
  await page.goto("/?demo&bori");
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village");
  await expect(page.locator(".rt-dock")).toHaveCount(0);
  // 보리 comes up first with the demo stop-loss signal (예시 신호); put it off and walk on
  await expect(page.locator(".rt-talk-line")).toContainText("예시 신호", { timeout: 20000 });
  await page.getByRole("button", { name: "나중에", exact: true }).click();
  await expect(page.locator(".rt-talk")).toHaveCount(0, { timeout: 10000 });
  const tag = page.locator(".vl-tree-tag").filter({ visible: true }).first();
  await expect(tag).toBeVisible({ timeout: 20000 });
  const name = (await tag.textContent({ timeout: 5000 }))!.trim();
  expect(name).not.toMatch(/%|D-|일 보유/);
  await page.locator(".vl-tree-tag", { hasText: name }).first().click({ force: true });
  await expect(page.locator(".rt-sheet h2").first()).toHaveText(name);
});

// 게임 구성 2026-11-20의 보리 마을 안내는 PM 유저 워크플로우(2026-11-21)의 첫 산책으로 바뀌었다: tests/e2e/walk.spec.ts

test("hovering a thing in the village shows what it is", async ({ page }) => {
  await page.goto("/?demo");
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("rt-hover", { detail: { name: "analyst-moa", x: 300, y: 300 } })));
  await expect(page.getByTestId("hover-tip")).toContainText("모아 · 올슨");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("rt-hover", { detail: { name: "analyst-naru", x: 300, y: 300 } })));
  await expect(page.getByTestId("hover-tip")).toContainText("낚시터");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("rt-hover", { detail: null })));
  await expect(page.getByTestId("hover-tip")).toHaveCount(0);
});

test("today's quests sit under the weather and fold up with a tap on their title", async ({ page }) => {
  await page.goto("/?demo&bori");
  // 보리 comes over first with the demo signal and the talk covers the corner: put it off
  await expect(page.locator(".rt-talk-line")).toContainText("예시 신호", { timeout: 20000 });
  await page.getByRole("button", { name: "나중에", exact: true }).click();
  await expect(page.locator(".rt-talk")).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator(".rt-weather")).toBeVisible();
  const box = page.getByRole("group", { name: "오늘 퀘스트" });
  await expect(box.locator(".rt-quest")).toHaveCount(3);
  await expect(box).toContainText("오늘의 퀴즈 풀기");
  await box.locator(".rt-quests-h").click();
  await expect(box.locator(".rt-quest")).toHaveCount(0);
  await box.locator(".rt-quests-h").click();
  await expect(box.locator(".rt-quest")).toHaveCount(3);
});
