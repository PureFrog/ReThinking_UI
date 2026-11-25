// 집과 마을 (PM 설계 2026-11-19 8장 플레이 검수): the house desk first, the quiz and the Lv.5 lock, the door, the case file
// (time stops until a judgment and the order are confirmed; no paper from after the day) and the village's name-only trees.
import { test, expect, type Page } from "./fixtures";
import { answerPaper } from "./quiz-answer";
const btn = (p: Page, n: string) => p.getByRole("button", { name: n }).first();
const house = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: { house?: { door: boolean; drawer: string; caseFile: string } } }).__proto3d?.house ?? null);
// 9-2: today's papers, stamped one by one; the back of each, then the results sheet
async function doQuiz(page: Page) {
  await btn(page, "문서 받기").click();
  for (let i = 0; i < 40; i++) {
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
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "quiz", { timeout: 30_000 });
  await expect(page.locator(".hs-plate")).toContainText("퀴즈 Lv.5에 열려요");
  await expect(page.locator(".hs-plate")).toContainText("현재 Lv.1");
  await expect.poll(async () => (await house(page))?.door).toBe(false);
  await doQuiz(page);
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "locked-done");
  await expect.poll(async () => (await house(page))?.door).toBe(true);
  await expect(page.locator(".rt-talk-line")).toContainText("오늘 수업 끝");
  // the same day again: no second quiz, the door already open
  await page.reload();
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "locked-done");
  await btn(page, "밖으로 나가기").click();
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village");
});

// 시나리오 퀘스트 (PM 설계 2026-11-22): it starts at 오늘의 거장 as the file is picked; the portfolio only with 넘기기;
// nothing on the desk before 시작하기; reading does not move the turn on; the notebook opens only when tapped and the
// device only after 작성 완료; the results come before the reveal; a bookmark brings back the notebook draft.
const sq = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: { scenario?: { step: string; turn: number; sub: string; notes: number; orders: number; beat: string; qty: number } | null } }).__proto3d?.scenario ?? null);
test("Lv.5: the scenario quest — 거장, portfolio, three turns of paper · notebook · device, results, then the reveal", async ({ page }) => {
  test.setTimeout(300000);
  await page.goto("/?house&quizlv=5&gameSpeed=8");
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "quiz-first");
  await doQuiz(page);
  await expect(page.getByTestId("house")).toHaveAttribute("data-state", "unlocked");
  await btn(page, "사건철 펼치기").click();
  // ① the portrait in the middle first, then left with the principle; waiting alone does not bring the portfolio
  await expect.poll(async () => (await sq(page))?.step).toBe("mentor");
  await expect.poll(async () => (await sq(page))?.beat).toBe("left");
  await page.waitForTimeout(1500);
  expect((await sq(page))?.step).toBe("mentor");
  await expect(page.locator(".sq-philo")).toContainText("가격 결정력");
  await btn(page, "넘기기").click();
  // ② the portfolio; no paper on the desk before 시작하기
  await expect(page.locator(".sq-portfolio")).toContainText("단풍식품");
  await expect(page.locator(".sq-roll")).toHaveCount(0);
  await btn(page, "시작하기").click();
  for (let t = 0; t < 3; t++) {
    await expect.poll(async () => (await sq(page))?.step, { timeout: 30000 }).toBe("turn");
    expect((await sq(page))?.turn).toBe(t);
    // ③ the paper unrolls, its pages turn; closing it stays on the same turn
    await page.locator(".sq-roll").click();
    await btn(page, "다음 면").click();
    await btn(page, "신문 접기").click();
    await page.locator(".sq-docs button").first().click();
    await btn(page, "내려놓기").click();
    expect((await sq(page))?.sub).toBe("desk");
    await expect(page.locator(".sq-device")).toHaveCount(0);
    // ④ the notebook when tapped; 작성 완료 needs a direction and a reason
    await page.getByRole("button", { name: "수첩 펼치기" }).click();
    await expect(page.getByRole("button", { name: "작성 완료" })).toBeDisabled();
    await page.getByRole("radio", { name: "비슷할 것이다" }).click();
    await page.locator(".sq-field textarea").fill("납품가 5% 인상에도 단골이 찾아서 주문은 비슷할 것이다");
    if (t === 0) {
      // a bookmark keeps the draft
      await btn(page, "책갈피 끼우고 덮기").click();
      await page.reload();
      await btn(page, "책갈피부터 이어 보기").click();
      await expect.poll(async () => (await sq(page))?.sub).toBe("note");
      await expect(page.locator(".sq-field textarea")).toHaveValue(/단골/);
    }
    await btn(page, "작성 완료").click();
    // ⑤ the device, then 확정 runs the market on
    await expect(page.locator(".sq-device")).toBeVisible();
    await expect(page.getByRole("button", { name: "확정" })).toBeDisabled();
    await page.getByRole("radio", { name: t === 1 ? "1/4 매도" : "유지" }).click();
    if (t === 1) await expect(page.locator(".sq-left")).toContainText("750주");
    await btn(page, "확정").click();
  }
  // ⑥ the results first (the alias still), ⑦ the reveal only with the button
  await expect.poll(async () => (await sq(page))?.step, { timeout: 30000 }).toBe("result");
  expect((await sq(page))?.qty).toBe(750);
  await expect(page.locator(".sq-result")).toContainText("투자일지 점수");
  await expect(page.locator(".sq-result")).not.toContainText("가상 종목 (연습판)");
  await btn(page, "거장은 어떻게 했을까?").click();
  await expect(page.locator(".sq-reveal")).toContainText("가상 종목 (연습판)");
  await expect(page.locator(".sq-reveal")).toContainText("분기 말 신고 수량 유지");
  await btn(page, "내 일지 피드백").click();
  await expect(page.locator(".sq-fb")).toContainText("예측 결과");
  await btn(page, "책상으로").click();
  await expect(page.locator(".sq")).toHaveCount(0);
});

// 시나리오 튜토리얼 (30장): reaching Lv.5 goes straight into the scenario, and the first run is walked through — one lit
// thing at a time, the rest dimmed and not pressable; the first scene fully, the other two alone, then the results.
test("Lv.5 first time: straight into the scenario with the spotlight tutorial, once", async ({ page }) => {
  test.setTimeout(300000);
  // the first-visit lesson of the house was long done by Lv.5
  await page.addInitScript(() => localStorage.setItem("rethink-lesson-v1", "done"));
  await page.goto("/?house&quizlv=5&tutorial&gameSpeed=8");
  await doQuiz(page);
  // no 사건철 button to press: the quest opens by itself
  await expect.poll(async () => (await sq(page))?.step).toBe("mentor");
  const target = () => page.locator(".sc").getAttribute("data-target");
  const lit = async (sel: string) => { await expect.poll(target).toBe(sel); await page.locator(sel).first().click() };
  // what lies under the dim is not pressable
  // (the press lands on the dim or on the light's own bubble, never on the thing: on a phone the bubble can sit over it)
  const blocked = (sel: string) => page.evaluate((s) => { const n = document.querySelector(s)!, b = n.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!e && !n.contains(e) && !!e.closest(".sc") }, sel);
  await expect.poll(target).toBe(".sq-philo");
  await expect.poll(() => blocked(".sq-close")).toBe(true);// the dim comes up a frame after the light moves
  await page.locator(".sq-next").click();
  await expect.poll(target).toBe(".sq-portfolio");
  await page.locator(".sq-start").click();
  await expect.poll(async () => (await sq(page))?.step, { timeout: 30000 }).toBe("turn");
  await expect.poll(target).toBe(".sq-roll");
  await expect.poll(() => blocked(".sq-notebook")).toBe(true);// the dim comes up a frame after the light moves
  await page.locator(".sq-roll").click();
  await lit(".sq-pg-next");
  await lit(".sq-fold");
  await lit(".sq-docs button");
  await lit(".sq-put");
  await lit(".sq-notebook");
  await expect.poll(target).toBe(".sq-dir");
  await page.getByRole("radio", { name: "비슷할 것이다" }).click();
  await expect.poll(target).toBe(".sq-compose");
  await page.locator(".sq-field textarea").fill("납품가 5% 인상에도 단골이 찾아서 주문은 비슷할 것이다");
  await expect(page.locator(".sc-bubble")).toContainText("작성 완료");
  await page.locator(".sq-write").click();
  await expect.poll(target).toBe(".sq-order");
  await page.getByRole("radio", { name: "유지" }).click();
  await page.locator(".sq-confirm").click();
  // the next two scenes alone: nothing lit, nothing dimmed
  for (let t = 1; t < 3; t++) {
    await expect.poll(async () => (await sq(page))?.step, { timeout: 30000 }).toBe("turn");
    await expect(page.locator(".sc")).toHaveCount(0);
    await page.getByRole("button", { name: "수첩 펼치기" }).click();
    await page.getByRole("radio", { name: "비슷할 것이다" }).click();
    await page.locator(".sq-field textarea").fill("판촉비가 18% 늘어서 주문은 비슷할 것이다");
    await btn(page, "작성 완료").click();
    await page.getByRole("radio", { name: "유지" }).click();
    await btn(page, "확정").click();
  }
  await expect.poll(async () => (await sq(page))?.step, { timeout: 30000 }).toBe("result");
  await lit(".sq-ask-master");
  await lit(".sq-to-fb");
  await expect.poll(target).toBe(".sq-feedback");
  await page.locator(".sq-to-desk").click();
  await expect(page.locator(".sq")).toHaveCount(0);
  // once: back in the house it does not open again, nor light anything
  await page.reload();
  await expect(page.getByTestId("house")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator(".sq")).toHaveCount(0);
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
  await expect(page.locator(".sq")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("house")).toHaveAttribute("data-paws", /case-/);
});

test("토리·모아·루온 are back in the village and talk in their own voice: small talk or one of my holdings", async ({ page }) => {
  await page.goto("/?demo&bori");
  await expect(page.locator(".rt-talk-line")).toContainText("예시 신호", { timeout: 20000 });
  await page.getByRole("button", { name: "나중에", exact: true }).click();
  await expect(page.locator(".rt-talk")).toHaveCount(0, { timeout: 10000 });
  await page.evaluate(() => (window as unknown as { __proto3d: { talkTo: (id: string) => void } }).__proto3d.talkTo("luon"));
  await expect(page.locator(".rt-talk-name")).toContainText("루온", { timeout: 20_000 });
  // (2026-11-24) 루온 is the debate partner: through its lines to 종목 골라 토론하기, then my stocks; a pick starts the
  // talk about that stock (without the server, the placeholder line)
  for (let i = 0; i < 3 && await btn(page, "계속").isVisible().catch(() => false); i++) await btn(page, "계속").click();
  await btn(page, "종목 골라 토론하기").click({ timeout: 15000, force: true });
  const pick = page.locator(".rt-talk-choice").first();
  const name = (await pick.textContent())!.trim();
  await pick.click();
  await expect(page.locator(".rt-talk-line").last()).toContainText(`${name}? 좋아`, { timeout: 10000 });
});

test("the village: trees carry their names only, no tab dock; a tree opens its stock's notebook", async ({ page }) => {
  await page.goto("/?demo&bori");
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village", { timeout: 30_000 });// the first page of a run waits on the dev server's build
  await expect(page.locator(".rt-dock")).toHaveCount(0);
  // 보리 comes up first with the demo stop-loss signal (예시 신호); put it off and walk on
  await expect(page.locator(".rt-talk-line")).toContainText("예시 신호", { timeout: 20000 });
  await page.getByRole("button", { name: "나중에", exact: true }).click();
  await expect(page.locator(".rt-talk")).toHaveCount(0, { timeout: 10000 });
  // (since the wider village the start view shows the orchard, not the farm: walk to the farm first; a tag shows for
  // the trees I stand near or the one under the mouse, ui/TreeTags.tsx: the mouse is what is used here)
  await page.locator(".proto3d-map").first().click();
  await page.getByRole("button", { name: "밭", exact: true }).click();
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("rt-hover", { detail: { name: "tree-1" } })));
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
