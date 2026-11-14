import { test, expect, type Page } from "./fixtures";

// 관측소 원정 (docs/game.md, G2): a blind 판 from the observatory. Brief → the days run → time stops on a crash or report
// day → 지킴·절반·정리 with chips → … → the reveal names the companies and the period, grades each decision and saves
// the run. ?game=<id> opens a 판 directly, ?gameSpeed=N runs the days faster. The run reports in window.__proto3d.game.
test.describe.configure({ timeout: 240_000 });
type Game = { pack: string; phase: string; tick: number; chips: number; decisions: number; pins: number; moment: { kind: string; code: string } | null; swap: boolean };
const game = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: { game?: Game } }).__proto3d?.game ?? null);
const PACK = "08b8c477";

test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone game: one upright run is enough"));

async function decideHere(page: Page, choice: "지킴" | "절반" | "정리", chips: number) {
  const before = (await game(page))!.decisions;
  const m = page.getByTestId("gx-moment");
  await expect(m).toBeVisible();
  await m.getByRole("button", { name: choice, exact: true }).click();
  for (let i = 0; i < chips; i++) await m.getByRole("button", { name: "칩 올리기" }).click();
  await m.getByRole("button", { name: /^결정/ }).click();
  // the seal stamps, then the run moves on: wait for it before looking at the next moment
  await expect.poll(async () => (await game(page))!.decisions, { timeout: 10_000 }).toBe(before + 1);
}

test("a whole 판: brief, the flow, every moment decided, the reveal, and the run is saved", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?demo&weather=clear&game=${PACK}&gameSpeed=40&gameClock=0&gameTutorial=0`);
  const ex = page.getByTestId("expedition");
  await expect(ex).toBeVisible({ timeout: 30_000 });
  await expect(ex).toContainText("????년");
  // blind: no company name anywhere before the reveal
  await expect(ex).not.toContainText("대한광통신");
  await ex.getByRole("button", { name: /^시작/ }).click();
  await expect.poll(async () => (await game(page))?.phase).toMatch(/flow|moment/);
  await expect(ex.getByLabel("호가")).toContainText("일봉으로 재구성한 호가");
  // pin a headline when one is up
  const pin = ex.getByRole("button", { name: "핀 꽂기" }).first();
  await expect.poll(async () => (await game(page))?.phase === "moment" || await pin.isVisible(), { timeout: 60_000 }).toBe(true);
  // the feed keeps moving at test speed, so the pin is pressed as an event rather than waiting for it to sit still
  if ((await game(page))?.phase === "flow" && await pin.isVisible()) {
    await pin.dispatchEvent("click");
    await expect.poll(async () => (await game(page))?.pins).toBe(1);
  }
  const picks: ("지킴" | "절반" | "정리")[] = ["정리", "지킴", "절반", "지킴", "정리"];
  let n = 0, sawSwap = false;
  for (let guard = 0; guard < 12; guard++) {
    await expect.poll(async () => (await game(page))?.phase, { timeout: 90_000 }).toMatch(/moment|reveal/);
    const g = (await game(page))!;
    if (g.phase === "reveal") break;
    // time stops: the three reads come in, then a choice with chips
    await expect(page.getByTestId("gx-moment").locator(".gx-read.on")).toHaveCount(3);
    await decideHere(page, picks[n % picks.length], n === 0 ? 3 : 1);
    n++;
    if (picks[(n - 1) % picks.length] === "정리") sawSwap ||= await expect.poll(async () => (await game(page))?.swap ?? false, { timeout: 3_000 }).toBe(true).then(() => true, () => false);
  }
  expect(n).toBeGreaterThanOrEqual(3);
  expect(sawSwap).toBe(true);
  const after = (await game(page))!;
  expect(after.phase).toBe("reveal");
  expect(after.chips).toBe(10 - 3 - (n - 1));
  // the reveal: names, the period stamped, a graded card per decision, the score
  const rv = page.getByTestId("gx-reveal");
  await expect(rv.getByTestId("gx-era")).toHaveText("2017년 여름~가을", { timeout: 15_000 });
  await expect(rv).toContainText("대한광통신");
  await expect(rv.locator(".gx-score")).toHaveCount(n);
  await expect(rv.getByTestId("gx-total")).toBeVisible();
  await expect(rv).toContainText("세 가지 길");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").expeditions ?? []);
  expect(saved.length).toBe(1);
  expect(saved[0].pack).toBe(PACK);
  expect(saved[0].decisions.length).toBe(n);
  // G4: what came after a decision, whose notes I went with, the week's (example) ranking
  await rv.getByRole("button", { name: /그때 몰랐던 것 보기/ }).first().click();
  await expect(rv.getByTestId("gx-after")).toBeVisible();
  await expect(rv.getByTestId("gx-trust")).toContainText("토리");
  await rv.getByRole("button", { name: /이번 주 순위/ }).click();
  const rk = page.getByTestId("gx-ranking");
  await expect(rk).toContainText("예시 순위 · 서버 연결 전");
  await expect(rk.locator("li.me")).toHaveCount(1);
  await rk.getByRole("button", { name: "공개로 돌아가기" }).click();
  await page.getByTestId("gx-reveal").getByRole("button", { name: "정원으로" }).click();
  await expect(page.getByTestId("expedition")).toHaveCount(0, { timeout: 5_000 });
  // the first finished run earns its stamp
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").stamps ?? []).map((s: { id: string }) => s.id))).toContain("expedition");
  expect(errors).toEqual([]);
});

test("the observatory door opens this week's 판", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear&gameTutorial=0");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("navigation", { name: "메뉴" }).getByRole("button", { name: "모의투자" }).click();
  const door = page.getByRole("dialog", { name: "관측소 원정" });
  await door.getByRole("button", { name: /이번 주 판 입장/ }).click();
  await expect(page.getByTestId("expedition")).toBeVisible();
  await expect.poll(async () => (await game(page))?.phase, { timeout: 30_000 }).toBe("brief");
  expect((await game(page))?.pack).toMatch(/^[0-9a-f]{8}$/);
  await page.getByRole("button", { name: "원정 닫기" }).click();
  await expect(page.getByTestId("expedition")).toHaveCount(0);
});

test("the clock on a moment runs out: it records 지킴 with one chip and time runs on", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?demo&weather=clear&game=${PACK}&gameSpeed=40&gameClock=2&gameTutorial=0`);
  await page.getByTestId("expedition").getByRole("button", { name: /^시작/ }).click();
  await page.getByRole("button", { name: "다음 순간까지" }).click();
  await expect.poll(async () => (await game(page))?.decisions, { timeout: 60_000 }).toBeGreaterThanOrEqual(1);
  const g = (await game(page))!;
  expect(g.chips).toBe(10 - g.decisions);
  expect(g.phase).toMatch(/flow|moment|reveal/);
});

test("a trade of my own fills at the next open and is stamped in the book", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?demo&weather=clear&game=${PACK}&gameSpeed=1&gameClock=0&gameTutorial=0`);
  await page.getByTestId("expedition").getByRole("button", { name: /^시작/ }).click();
  const book = page.getByLabel("호가");
  await book.getByRole("button", { name: "매도 ¼" }).click();
  await expect(book).toContainText("다음 날 시가에 체결");
  await expect(book.getByRole("status")).toContainText("체결", { timeout: 20_000 });
  await expect(book.getByRole("status")).toContainText("매도");
});

test("the first run is coached: each part waits for the coach, and it can be skipped", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear&game="+PACK+"&gameSpeed=10&gameClock=0");
  const coach = page.getByTestId("gx-coach");
  await expect(coach).toBeVisible({ timeout: 30_000 });
  await expect(coach).toContainText("먹줄");
  await coach.getByRole("button", { name: "다음" }).click();
  await coach.getByRole("button", { name: "다음" }).click();
  await coach.getByRole("button", { name: "알겠어" }).click();
  await expect(coach).toHaveCount(0);
  await page.getByTestId("expedition").getByRole("button", { name: /^시작/ }).click();
  // the flow's coach holds the days
  await expect(coach).toContainText("오늘 가격");
  await page.waitForTimeout(1500);
  expect((await game(page))?.tick).toBe(0);
  await coach.getByRole("button", { name: "건너뛰기" }).click();
  await expect(coach).toHaveCount(0);
  await expect.poll(async () => (await game(page))?.tick ?? 0, { timeout: 20_000 }).toBeGreaterThan(0);
});
