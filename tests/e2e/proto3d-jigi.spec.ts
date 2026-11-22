import { test, expect, type Page } from "./fixtures";

// 지기 투자일지 J1 (docs/jigi.md): the 일지 tab is the journal book (by stock, a time bar, one journal opened); a tree's
// card starts a journal (quick chips prefill 한 일); writing is four pages that keep a draft; saving with blanks
// jumps to the missing page; a saved journal stays after a reload; the old judgments are read-only behind 이전 판단.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const dock = (page: Page) => page.getByRole("navigation", { name: "메뉴" });
const book = (page: Page) => page.getByRole("dialog", { name: "투자일지" });
const write = (page: Page) => page.getByRole("dialog", { name: "일지 쓰기" });
// the page now open (feedback 11-17: three pages, a filled one goes on by itself)
const onPage = (page: Page, name: RegExp) => expect(write(page).getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name })).toHaveAttribute("aria-current", "step", { timeout: 5_000 });
const pick = async (page: Page, slot: RegExp, group: string, value: string) => {
  await write(page).getByRole("button", { name: slot }).click();
  await write(page).getByRole("group", { name: group }).getByRole("button", { name: value, exact: true }).click();
};

test("the book: stocks, a time bar, one journal with its chart and graded hypothesis; old judgments read-only", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await dock(page).getByRole("button", { name: /^일지/ }).click({ timeout: 30_000 });
  await expect(book(page).getByRole("tab", { name: "일기장" })).toHaveAttribute("aria-selected", "true");
  await expect(book(page).getByRole("button", { name: /^삼성전자 일지 5편/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath("jigi-book.png") });
  await book(page).getByRole("button", { name: /^삼성전자 일지/ }).click();
  await expect(book(page).getByRole("group", { name: "일지 시간 막대" }).getByRole("button")).toHaveCount(5);
  await book(page).locator(".jg-card").first().click();
  await expect(book(page).getByRole("img", { name: /삼성전자 일봉 차트/ })).toBeVisible();
  await expect(book(page)).toContainText("모의 시세");
  // the direction hypothesis shows its rule: base close → end date (graded automatically, no manual buttons)
  await expect(book(page).locator(".jg-rule").first()).toContainText("기준");
  await expect(book(page).getByRole("button", { name: /^(적중|실패|판정불가)$/ })).toHaveCount(0);
  await expect(book(page)).not.toContainText(/팔아|사라|매수하세요|오를 거야/);
  // the old one-line judgments are still there, read-only
  await book(page).getByRole("button", { name: "← 종목" }).click();
  await book(page).getByRole("button", { name: "← 일기장" }).click();
  await book(page).getByRole("button", { name: /^이전 판단 \d/ }).click();
  await expect(page.getByRole("dialog", { name: "내 판단의 질" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("writing: a tree's quick chip starts a draft, blanks jump to their page, saving lands it in the book", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  // a tree's card: 일지 쓰기 first, and the old judgment chips start a journal (손절 검토 = 보유 + the exit plan)
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __proto3d?: { trees?: object } }).__proto3d?.trees ?? {}).length), { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
  await page.waitForTimeout(2500);
  const size = page.viewportSize()!;
  // a tree on screen whose spot reaches the canvas
  const pt = await page.evaluate(sz => { const t = (window as unknown as { __proto3d: { trees: Record<string, { x: number; y: number }> } }).__proto3d.trees;
    return Object.values(t).filter(p => p.x > 30 && p.x < sz.width - 30 && p.y > 140 && p.y < sz.height - 200 && document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS").sort((a, b) => b.y - a.y)[0] }, size);
  await page.mouse.click(pt.x, pt.y);
  const card = page.getByRole("dialog", { name: /나무$/ });
  await expect(card).toBeVisible();
  const name = (await card.getByRole("heading").textContent())!.trim();
  await expect(card.getByRole("button", { name: "일지 쓰기" })).toBeVisible();
  await card.getByRole("group", { name: "빠른 기록" }).getByRole("button", { name: "손절 검토" }).click();
  await expect(write(page)).toBeVisible();
  await write(page).getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /종목과 차트/ }).click();
  await expect(write(page).getByRole("button", { name: /한 일: 보유/ })).toBeVisible();
  // saving with blanks goes to the first missing page and marks it
  await write(page).getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /기한과 확신/ }).click();
  await expect(write(page)).toContainText("손절·청산 계획");
  await write(page).getByRole("button", { name: "일지 저장" }).click();
  await onPage(page, /종목과 차트/);
  await expect(write(page).locator(".jg-slot.miss")).toHaveCount(1);
  await expect(write(page).getByRole("img", { name: new RegExp(name + " 일봉 차트") })).toBeVisible();
  // the last blank of the page: it goes on to 가설 by itself
  await pick(page, /이해 정도 고르기/, "이해 정도", "일부 이해");
  await onPage(page, /가설/);
  await write(page).getByRole("textbox").nth(0).fill("수요가 회복되고 주가가 석 달 안에 오를 것 같다.");
  await write(page).getByRole("textbox").nth(1).fill("재고가 줄었다는 공시를 봤다.");
  await write(page).getByRole("button", { name: "아직 모르겠음" }).click();
  // a draft survives closing and reopening (it is in the save, not the sheet)
  await write(page).getByRole("button", { name: "닫기" }).first().click();
  await expect(book(page)).toBeVisible();
  await book(page).getByRole("button", { name: /이어서 쓰기/ }).first().click();
  await write(page).getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /기한과 확신/ }).click();
  await write(page).getByRole("group", { name: "기간" }).getByRole("button", { name: "3개월" }).click();
  await expect(write(page)).toContainText("다시 볼 날");
  await page.screenshot({ path: info.outputPath("jigi-write.png") });
  await write(page).getByRole("button", { name: "일지 저장" }).click();
  // the first save of my own journal pays coins (core/ledger.ts EARN.journal)
  await expect(page.locator(".rt-toast")).toContainText("코인 +10");
  // saving opens the analysis; the book is one tab over
  await expect(book(page)).toBeVisible({ timeout: 5_000 });
  await expect(book(page).getByRole("tab", { name: "분석" })).toHaveAttribute("aria-selected", "true");
  await book(page).getByRole("tab", { name: "일기장" }).click();
  await expect(book(page).getByRole("button", { name: new RegExp("^" + name + " 일지") })).toBeVisible();
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").journals ?? []).filter((j: { status: string; demo?: boolean }) => j.status === "saved" && !j.demo).length)).toBe(1);
  // it is saved in the garden: a reload keeps it
  await page.goto("/proto3d?weather=clear");
  await dock(page).getByRole("button", { name: /^일지/ }).click({ timeout: 30_000 });
  await expect(book(page).getByRole("button", { name: new RegExp("^" + name + " 일지") })).toBeVisible();
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").journals ?? []).filter((j: { status: string; demo?: boolean }) => j.status === "saved" && !j.demo).length)).toBe(1);
  expect(errors).toEqual([]);
});

// J2: hypotheses pulled from my own words, the stock-direction one confirmed and buried as a capsule under its tree;
// when its end date has a close it comes up with its verdict (automatic, no manual buttons), then the review.
test("hypotheses: pull, confirm, buried as a capsule, dug up with the verdict, then the review", async ({ page }, info) => {
  test.setTimeout(360_000);// writes a whole journal, buries, reloads 95 days ahead and digs up: the longest walk-through here
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await dock(page).getByRole("button", { name: /^일지/ }).click({ timeout: 30_000 });
  await book(page).getByRole("button", { name: /^카카오 일지/ }).click();
  await book(page).getByRole("button", { name: "이 종목 일지 쓰기" }).click();
  await pick(page, /한 일 고르기/, "한 일", "관찰");
  await pick(page, /이해 정도 고르기/, "이해 정도", "일부 이해");
  await onPage(page, /가설/);
  await write(page).getByRole("textbox").nth(0).fill("광고 경기가 회복된다. 카카오 주가가 석 달 안에 오를 것이다.");
  await write(page).getByRole("textbox").nth(1).fill("광고 단가가 두 달째 올랐다.");
  await write(page).getByRole("button", { name: "아직 모르겠음" }).click();
  await onPage(page, /기한과 확신/);
  await write(page).getByRole("group", { name: "기간" }).getByRole("button", { name: "3개월" }).click();
  await write(page).getByRole("button", { name: "일지 저장" }).click();
  // saving opens the analysis; open the book tab, then the newest journal of 카카오
  await book(page).getByRole("tab", { name: "일기장" }).click();
  await book(page).getByRole("button", { name: /^카카오 일지 2편/ }).click();
  await book(page).locator(".jg-card").first().click();
  await book(page).getByRole("button", { name: "가설 뽑기" }).click();
  const drafts = book(page).getByRole("group", { name: "가설 초안" });
  await expect(drafts).toHaveCount(2);
  await expect(book(page).getByRole("button", { name: /^(적중|실패|판정불가)$/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("jigi-drafts.png") });
  // the price one: confirm → buried under 카카오's tree with a D-n tag
  await drafts.filter({ hasText: "판정 기준" }).getByRole("button", { name: "확정하고 판정 등록" }).click();
  await expect(book(page)).toBeHidden();
  await expect(page.getByRole("button", { name: /^카카오 · D-\d+/ })).toHaveCount(1, { timeout: 20_000 });
  // past its end date: the capsule says the verdict is in; digging it up shows it
  await page.goto("/proto3d?weather=clear&ahead=95");
  const tag = page.getByRole("button", { name: "카카오 · 판정 완료" });
  await expect(tag).toHaveCount(1, { timeout: 30_000 });
  await tag.dispatchEvent("click");
  const v = page.getByRole("dialog", { name: "가설 판정" });
  await expect(v.getByRole("status")).toContainText(/적중|빗나감/);
  await expect(v).toContainText("카카오 주가가 석 달 안에 오를 것이다");
  await expect(v).not.toContainText(/팔아|사라|매수하세요|오를 거야/);
  await page.screenshot({ path: info.outputPath("jigi-verdict.png") });
  await v.getByRole("button", { name: "복기하기" }).click();
  const review = book(page).getByRole("group", { name: "복기" });
  await expect(review).toBeVisible();
  await review.getByRole("group", { name: "계획대로 행동했나요" }).getByRole("button", { name: "예" }).click();
  // opened once: the capsule is gone
  await book(page).getByRole("button", { name: "닫기" }).first().click();
  await expect(page.getByRole("button", { name: /^카카오 · / })).toHaveCount(0);
  expect(errors).toEqual([]);
});

// J3: 분석 in the 일지 tab — the demo stands in (and says so), every rate has its interval, 유형 is the style of judging,
// 보완할 점 bring a task, and a
// taken task shows on the next journal's last page; the league counts the work, not the hits.
test("analysis: summary with an interval, the style of judging, and a task on the next journal's checklist", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  // the demo's verdicts follow the mock prices up to "today": pin the day so the numbers (and 보완할 점) hold still
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00+09:00"));
  await page.goto("/proto3d?demo&weather=clear");
  await dock(page).getByRole("button", { name: /^일지/ }).click({ timeout: 30_000 });
  await book(page).getByRole("tab", { name: "분석" }).click();
  await expect(book(page)).toContainText("예시 기록으로 보여 드려요");
  await expect(book(page)).toContainText("내 투자 판단 요약");
  await expect(book(page)).toContainText("95% 구간");
  await expect(book(page)).not.toContainText(/팔아|사라|매수하세요|오를 거야/);
  await page.screenshot({ path: info.outputPath("jigi-stats.png") });
  const secs = book(page).getByRole("tablist", { name: "분석 항목" });
  await secs.getByRole("tab", { name: "분야·논리" }).click();
  await expect(book(page).locator(".jg-table").first()).toContainText("주가");
  // 유형 is how I judge, from what I wrote — never a thing to fix
  await secs.getByRole("tab", { name: "유형" }).click();
  await expect(book(page)).toContainText("여러 근거를 함께 짧게 보는 확신형");
  await expect(book(page).getByTestId("jg-style")).toContainText("한쪽 근거로 보는 편");
  await expect(book(page)).toContainText("맞혔는지는 유형을 정하는 데 쓰지 않아요");
  await expect(book(page)).not.toContainText(/다시 맞출|보완할 유형|공부할 유형/);
  // what the numbers say to work on is under 과제
  await secs.getByRole("tab", { name: "과제" }).click();
  await expect(book(page)).toContainText("보완할 점 · '3개월' 전망의 시점");
  await book(page).getByRole("button", { name: "다음 일지 체크리스트에 추가" }).first().click();
  await expect(book(page).getByRole("button", { name: "체크리스트에 있어요" }).first()).toBeDisabled();
  await secs.getByRole("tab", { name: "학습 후 변화" }).click();
  await expect(book(page)).toContainText("시작일");
  // the next journal carries it on its last page
  await book(page).getByRole("tab", { name: "일기장" }).click();
  await book(page).getByRole("button", { name: /^(새|첫) 일지 쓰기/ }).click();
  await write(page).getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /기한과 확신/ }).click();
  await expect(write(page).getByLabel("이번에 챙길 것")).toContainText("무엇이 언제 확인되면");
  // the league says what it counts
  await write(page).getByRole("button", { name: "닫기" }).first().click();
  await book(page).getByRole("button", { name: "닫기" }).first().click();
  await dock(page).getByRole("button", { name: /^더보기/ }).click();
  await page.getByRole("dialog", { name: "더보기" }).getByRole("button", { name: /^리그/ }).click();
  await expect(page.getByRole("dialog", { name: /리그/ })).toContainText("한 일로 점수가 쌓여요");
  expect(errors).toEqual([]);
});
