import { test, expect, type Page } from "./fixtures";

// 오늘의 관측소 (daily_quest_design v1 + feedback F1·F2): the lesson → the portfolio → three scenes, each a new journal that
// confirms the hypothesis (입문: the target and period given, the direction picked, one line on why) and 보유·부분매도
// together → the result (two scores, 예측력 against the announced 판매량, the reveal, the example ranking, XP).
// ?quest opens the open quest at once. The run reports in window.__proto3d.quest. Nothing touches the 지기 journals.
test.describe.configure({ timeout: 180_000 });
type Q = { stage: string; scene: number; quest: string; mode: string; decisions: number; done: boolean; xp: number | null };
const quest = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: { quest?: Q } }).__proto3d?.quest ?? null);
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}"));

test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone flow: one upright run is enough"));

async function scene(page: Page, dir: string, why: string, pick: string) {
  const dq = page.getByTestId("daily-quest");
  await dq.getByRole("tab", { name: /내 일지/ }).click();
  await dq.getByRole("group", { name: "방향" }).getByRole("button", { name: dir, exact: true }).click();
  await dq.getByLabel("그렇게 본 이유").fill(why);
  await dq.getByTestId("dq-decide").getByRole("button", { name: pick, exact: true }).click();
  const before = (await quest(page))!.decisions;
  await dq.getByRole("button", { name: "가설과 판단 함께 확정" }).click();
  await expect.poll(async () => (await quest(page))!.decisions).toBe(before + 1);
  await flowOn(page);
}
// the market plays between moments (feedback F4): skip to the stop and go on
async function flowOn(page: Page) {
  const dq = page.getByTestId("daily-quest");
  await expect(dq.getByTestId("dq-flow")).toBeVisible();
  await dq.getByRole("button", { name: "다음 순간까지" }).click();
  await expect(dq.getByTestId("dq-stop")).toBeVisible();
  await dq.getByRole("button", { name: /판단하러 가기|평가일 결과 보기/ }).click();
}

test("a whole first quest: lesson, three scenes with a new journal each, the result, XP saved; nothing comes next today", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear&quest");
  const dq = page.getByTestId("daily-quest");
  await expect(dq).toBeVisible({ timeout: 30_000 });
  await expect(dq).toHaveAttribute("data-stage", "lesson");
  await expect(dq.getByTestId("dq-principle")).toContainText("가격 결정력은 값을 올린 뒤에도 고객이 남는지");
  await expect(dq).toContainText("실제 인물이 아니에요");
  await expect(dq).toContainText("시범");// 입문 shows a worked example
  await dq.getByRole("button", { name: "포트폴리오 보기" }).click();
  await expect(dq).toContainText("100주");
  await expect(dq).toContainText("방향 고르기 · 이유 한 줄");
  await expect(dq.getByTestId("dq-market")).toContainText("한국 거래일 · 원화 · 수수료 0.1%");
  await dq.getByRole("button", { name: "장면 1 시작" }).click();
  // the flow up to the first moment: days pass by themselves, headlines arrive on their day, no order book
  const flow = dq.getByTestId("dq-flow");
  await expect(flow).toBeVisible();
  await expect.poll(async () => Number(await flow.getAttribute("data-at"))).toBeGreaterThan(3);
  await expect(dq.getByTestId("dq-news")).toContainText("과자 원재료 값 오름세", { timeout: 15_000 });
  await expect(dq).not.toContainText("호가");
  await expect(dq).not.toContainText("가격 인상 발표");// the moment is not shown before the clock reaches it
  await dq.getByRole("button", { name: "빠르게" }).click();
  await dq.getByRole("button", { name: "다음 순간까지" }).click();
  await expect(dq.getByTestId("dq-stop")).toContainText("장면 1 · 가격 인상 발표");
  await dq.getByRole("button", { name: "판단하러 가기" }).click();
  await expect.poll(async () => (await quest(page))?.stage).toBe("scene");
  await expect(dq).toContainText("1/3 · 가격 인상 발표");
  await expect(dq.locator(".dq-card")).toHaveCount(5);
  // 입문: the target and the period are the system's (not scored), the direction is picked
  await dq.getByRole("tab", { name: /내 일지/ }).click();
  const hypo = dq.getByTestId("dq-hypo");
  await expect(hypo).toContainText("단풍식품의 판매량");
  await expect(hypo).toContainText("다음 분기 실적 발표 때");
  await expect(hypo).toContainText("관측소가 정했어요");
  await expect(hypo.getByRole("group", { name: "방향" }).getByRole("button")).toHaveText(["증가", "비슷", "감소"]);
  await expect(dq.getByRole("group", { name: "보유 또는 부분 매도" }).getByRole("button")).toHaveText(["보유", "1/8 매도", "1/4 매도", "1/2 매도"]);
  await expect(dq).toContainText("판매량과 판촉 자료 중 어느 쪽이");
  // confirming with nothing chosen is refused and says what is missing
  await dq.getByRole("button", { name: "가설과 판단 함께 확정" }).click();
  await expect(dq.locator(".dq-warn")).toContainText("가설");
  await expect(dq.locator(".dq-warn")).toContainText("판단");
  expect((await quest(page))!.decisions).toBe(0);
  // the sell preview: 100 → 75 at 1/4
  await dq.getByTestId("dq-decide").getByRole("button", { name: "1/4 매도", exact: true }).click();
  await expect(dq.locator(".dq-left")).toContainText("100주 → 75주");
  // after the decision the market plays on to the next moment; the sale fills at the next open on the way
  await dq.getByRole("tab", { name: /내 일지/ }).click();
  await dq.getByRole("group", { name: "방향" }).getByRole("button", { name: "감소", exact: true }).click();
  await dq.getByLabel("그렇게 본 이유").fill("1+1 행사로 판매량을 붙잡는 거라서 가격 결정력은 약하다고 본다");
  await dq.getByRole("button", { name: "가설과 판단 함께 확정" }).click();
  await expect(dq.getByTestId("dq-flow")).toBeVisible();
  await dq.getByRole("button", { name: "다음 순간까지" }).click();
  await expect(dq.getByTestId("dq-flow")).toContainText("체결 · 단풍식품 1/4 매도 25주");
  await expect(dq.getByTestId("dq-stop")).toContainText("장면 2 · 경쟁사 판매량 공개");
  await dq.getByRole("button", { name: "판단하러 가기" }).click();
  // scene 2: a new, blank journal; the last one opens only on request; the sale filled at the next open
  await expect(dq).toContainText("2/3 · 경쟁사 판매량 공개");
  await dq.getByRole("tab", { name: /내 일지/ }).click();
  await expect(dq.getByLabel("그렇게 본 이유")).toHaveValue("");
  const past = dq.getByTestId("dq-past-journal");
  await expect(past).not.toContainText("1+1 행사로");
  await past.getByRole("button", { name: /지난 일지 보기/ }).click();
  await expect(past).toContainText("단풍식품의 판매량 · 다음 분기 실적 발표 때 · 인상 전 분기 대비 감소 — 그렇게 본 이유는 1+1 행사로");
  await dq.getByRole("tab", { name: "자료" }).click();
  await expect(dq.getByTestId("dq-arrive")).toContainText("아직 발표 전");
  await expect(dq.getByTestId("dq-arrive")).toContainText("체결 · 1/4 매도 25주");
  await scene(page, "비슷", "해오름 +9%를 보면 고객이 경쟁사로 가지만 매대 유지라서 판매량은 이전 판단보다 비슷하게 바꿨다", "보유");
  await scene(page, "증가", "판매량 −1.2%로 고객이 남았지만 판촉비 +18%라서 가격 결정력은 처음보다 일부만 인정해 유지한다", "1/2 매도");
  // the result, page 1 (feedback F3): three numbers in one line, the event next to what the manager did, the standing in
  // one line, the sources behind a button
  await expect.poll(async () => (await quest(page))?.done).toBe(true);
  const rs = dq.getByTestId("dq-result");
  const head = rs.getByTestId("dq-headline");
  await expect(head).toContainText("내 수익률");
  await expect(head).toContainText("계속 보유 수익률");
  await expect(head.getByTestId("dq-journal-score")).toHaveText("100");
  await expect(rs.getByTestId("dq-reveal")).toContainText("단풍식품");
  await expect(rs.getByTestId("dq-compare")).toContainText("100주 중 37.5주 유지");
  await expect(rs.getByTestId("dq-compare")).toContainText("인상 전 분기 말 50,000주 → 인상 뒤 첫 분기 말 62,000주");
  await expect(rs.getByTestId("dq-standing")).toContainText("(예시 순위)");
  await expect(rs.getByTestId("dq-standing")).toContainText("XP");
  await expect(rs.getByTestId("dq-sources")).toHaveCount(0);
  await rs.getByRole("button", { name: "원문 보기" }).click();
  await expect(rs.getByTestId("dq-sources")).toContainText("가격 인상 보도자료");
  // the key results fit the first screen of a phone at the default text size
  for (const id of ["dq-headline", "dq-compare"]) {
    const b = (await rs.getByTestId(id).boundingBox())!;
    expect(b.y + b.height).toBeLessThan(844);
  }
  // page 2: the journal, scene by scene; 입문 covers the picked direction and its one line only
  await dq.getByRole("button", { name: "일지 피드백 보기" }).click();
  const fb = dq.getByTestId("dq-feedback");
  await expect(fb).toBeVisible();
  await expect(fb).toContainText("체험용 점수");
  await expect(fb.getByTestId("dq-forecast")).toContainText("2 / 3");
  const sc = fb.getByTestId("dq-fb-scene");
  await expect(sc).toContainText("고른 방향");
  await expect(sc).toContainText("감소");
  await expect(sc).toContainText("1+1 행사로 판매량을 붙잡는 거라서");
  await expect(sc).toContainText("철학을 적용한 지점");
  await expect(sc).toContainText("보완할 점 하나");
  await expect(sc).not.toContainText("재검토");
  await expect(sc.getByTestId("dq-fb-forecast")).toContainText("단풍식품의 판매량 · 다음 분기 실적 발표 때 · 내 예상 감소 · 발표 −1.2%");
  await expect(sc.getByTestId("dq-fb-forecast")).toContainText("→ 비슷 · 빗나감");
  await fb.getByRole("tab", { name: "장면 2" }).click();
  await expect(sc).toContainText("장면 2 · 경쟁사 판매량 공개");
  await expect(sc).toContainText("비슷");
  await dq.getByRole("button", { name: "결과로 돌아가기" }).click();
  await expect(dq.getByTestId("dq-result")).toBeVisible();
  const s = await save(page);
  const o = s.observatory;
  expect(o.runs.length).toBe(1);
  expect(o.runs[0].decisions.map((d: { fraction: string }) => d.fraction)).toEqual(["1/4", "0", "1/2"]);
  expect(o.runs[0].decisions.map((d: { fields: { dir: string } }) => d.fields.dir)).toEqual(["감소", "비슷", "증가"]);
  expect(o.progress.total_xp).toBeGreaterThan(0);
  expect(o.progress.awards).toHaveLength(1);
  expect(o.progress.rank).toBe("견습 관측원");
  expect(o.grants.map((g: { key: string }) => g.key)).toEqual(["first-clear"]);
  await expect.poll(async () => (await save(page)).stamps.map((x: { id: string }) => x.id)).toContain("observatory-first");
  // the game stays in the game: the demo journals are exactly the seed ones
  const seeded = (s.journals ?? []).filter((j: { demo?: boolean }) => !j.demo);
  expect(seeded).toHaveLength(0);
  // back at the door: today's request is done; nothing still to come is shown (no course list, no next quest)
  await dq.getByRole("button", { name: "관측소로 돌아가기" }).click();
  const door = page.getByTestId("dq-door");
  await expect(door).toBeVisible({ timeout: 10_000 });
  await expect(door.getByTestId("dq-done-today")).toContainText("다음 의뢰는 내일 도착해요");
  await expect(door.getByRole("button", { name: "결과 보기" })).toBeVisible();
  await expect(door.locator(".dq-course")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /의뢰 시작/ })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("진열대의 단서");
  await page.getByRole("tab", { name: "지난 기록" }).click();
  await expect(page.getByTestId("dq-past")).toContainText("가격표 뒤의 고객");
  expect(errors).toEqual([]);
});

test("leaving mid-quest comes back to the same scene and draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear&quest");
  const dq = page.getByTestId("daily-quest");
  await expect(dq).toBeVisible({ timeout: 30_000 });
  await dq.getByRole("button", { name: "포트폴리오 보기" }).click();
  await dq.getByRole("button", { name: "장면 1 시작" }).click();
  await flowOn(page);
  await scene(page, "감소", "행사로 붙잡은 판매량이라 가격 결정력은 약하다", "보유");
  await dq.getByRole("tab", { name: /내 일지/ }).click();
  await dq.getByRole("group", { name: "방향" }).getByRole("button", { name: "비슷", exact: true }).click();
  await dq.getByLabel("그렇게 본 이유").fill("아직 쓰는 중");
  await expect.poll(async () => (await save(page)).observatory.runs[0].drafts.p2.hypo).toContain("아직 쓰는 중");
  // a reload without ?demo keeps the save; ?quest reopens the unfinished run
  await page.goto("/?weather=clear&quest");
  await expect(dq).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await quest(page))?.scene).toBe(1);
  await dq.getByRole("tab", { name: /내 일지/ }).click();
  await expect(dq.getByLabel("그렇게 본 이유")).toHaveValue("아직 쓰는 중");
  await expect(dq.getByRole("group", { name: "방향" }).getByRole("button", { name: "비슷", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await save(page)).observatory.runs.length).toBe(1);
});

test("today's request arrives in the garden; the notice opens it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  const notice = page.getByTestId("request-notice");
  await expect(notice).toContainText("오늘의 관측 의뢰가 도착했어", { timeout: 15_000 });
  await expect(page.getByRole("navigation", { name: "메뉴" }).getByRole("button", { name: /^관측소/ })).toContainText("1");
  await notice.getByRole("button", { name: /오늘의 관측 의뢰/ }).click();
  const dq = page.getByTestId("daily-quest");
  await expect(dq).toBeVisible({ timeout: 10_000 });
  await expect(dq).toHaveAttribute("data-stage", "lesson");
  // the run carries its own request; the app holds no course
  const s = await save(page);
  expect(s.observatory.runs[0].def.name).toBe("가격표 뒤의 고객");
  expect(s.observatory.noticed).toBeTruthy();
});
