import { test, expect, type Page } from "./fixtures";

// R3–R6 ReThink Garden on /proto3d: the analysts, the judgment loop, grades, cooldown, today's case, track record,
// league, the game door, cart and drawer. Every test starts from a fresh demo save (?demo) under a fixed sky.
// The demo save holds two old judgments, so grades are due on the first visit (app/proto3d/state.ts demoSave).
test.describe.configure({ timeout: 120_000 });
type Hooks = { frames: number; treeModels: number; trees: Record<number, { x: number; y: number }>; points: Record<string, { x: number; y: number }> };
const hooks = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: Hooks }).__proto3d ?? null);
const BANNED = /괜찮|천천히|마음|네 속도|옆에 있|팔아|사세요|매수하세요|매도하세요|오를 거/;

async function open(page: Page, errors: string[], query = "") {
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()) });
  await page.goto("/proto3d?weather=clear" + query);
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await hooks(page))?.treeModels ?? 0, { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
  // the three analysts have loaded and report where they stand
  await expect.poll(async () => Object.keys((await hooks(page))?.points ?? {}).filter(k => k.startsWith("analyst-")).length, { timeout: 30_000 }).toBe(3);
}
const sheet = (page: Page, name: string | RegExp) => page.getByRole("dialog", { name });
const dock = (page: Page, name: string) => page.getByRole("navigation", { name: "메뉴" }).getByRole("button", { name });
const onScreen = (p: { x: number; y: number } | undefined, vp: { width: number; height: number }) => !!p && p.x > 30 && p.x < vp.width - 30 && p.y > 150 && p.y < vp.height - 130;
const clean = (errors: string[]) => expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);

test("old judgments come back graded: the reveal, the score and the track record", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const banner = page.getByRole("button", { name: /판정 2건 도착/ });
  await expect(banner).toBeVisible();
  await banner.click();
  await page.getByRole("button", { name: "결과 열기" }).click();
  const result = sheet(page, "판정 결과");
  await expect(result).toContainText("강철중공업");
  await expect(result).toContainText(/[+-]\d+(\.\d)?%/);
  await expect(result).toContainText("토리 신호는 맞았음");
  await expect(result).not.toContainText(BANNED);
  // the 90-day mark of the same judgment follows, then the other one
  await result.getByRole("button", { name: /다음 판정/ }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "결과 열기" }).click();
    const r = sheet(page, "판정 결과");
    await r.locator(".rt-sheet-body .rt-btn.primary").click();
    if (await page.getByRole("button", { name: "결과 열기" }).count() === 0) break;
  }
  await expect(page.getByRole("button", { name: /판정 \d건 도착/ })).toHaveCount(0);
  await dock(page, "기록").click();
  const rec = sheet(page, "내 판단의 질");
  await expect(rec).toContainText("판단 적중");
  await expect(rec.locator(".rt-cell").first()).toContainText("%");
  await rec.getByRole("tab", { name: "판단" }).click();
  await expect(rec).toContainText("수주 잔고");
  clean(errors);
});

test("briefing: a research note, a judgment, luon's counter, and the reward", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const before = Number(await page.getByTestId("currency").textContent());
  await dock(page, "브리핑").click();
  const list = sheet(page, "오늘 브리핑");
  await expect(list).toContainText("신호 5건");
  await list.getByRole("button", { name: /강철중공업/ }).click();
  const brief = sheet(page, "브리핑");
  const note = brief.getByRole("article", { name: "토리 리서치 노트" });
  await expect(note).toContainText("부도 위험");
  await expect(note).toContainText("올슨");
  const form = brief.getByRole("form", { name: "판단 기록" });
  await expect(form.getByRole("button", { name: "기록" })).toBeDisabled();
  await form.getByRole("group", { name: "판단" }).getByRole("button", { name: /홀드/ }).click();
  await form.getByRole("textbox").fill("수주 잔고 3년치. 이자만 버티면 돼.");
  await form.getByRole("group", { name: "확신도" }).getByRole("button", { name: "3" }).click();
  await form.getByRole("button", { name: "기록" }).click();
  const counter = brief.getByLabel("루온의 반박");
  await expect(counter).toContainText("반대쪽 얘기");
  await counter.getByRole("button", { name: "그래도 유지" }).click();
  await expect(brief.getByRole("status")).toContainText("채점 예정");
  await expect(page.getByTestId("currency")).toHaveText(String(before + 3));
  await brief.getByRole("button", { name: "닫기" }).first().click();
  // tori moves on to the next flagged tree; the recorded one shows as done
  await dock(page, "브리핑").click();
  await expect(sheet(page, "오늘 브리핑")).toContainText("신호 4건");
  await expect(sheet(page, "오늘 브리핑").getByRole("button", { name: /강철중공업/ })).toContainText("기록함");
  clean(errors);
});

test("an analyst's bubble in the world opens their note", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const bubble = page.locator('[data-analyst="moa"]');
  await expect(bubble).toBeVisible();
  await bubble.click();
  await expect(sheet(page, "브리핑").getByRole("article", { name: "모아 리서치 노트" })).toBeVisible();
  clean(errors);
});

test("cooldown: wanting to sell plants a seed; deciding a day later counts as waited", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const h = (await hooks(page))!;
  const size = page.viewportSize()!;
  // a tree on screen whose spot is not under a bubble or a panel (the tap must reach the canvas)
  const free = await page.evaluate(pts => pts.filter(([, p]) => document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS").map(([k]) => k),
    Object.entries(h.trees).filter(([, p]) => p.x > 30 && p.x < size.width - 30 && p.y > 140 && p.y < size.height - 160));
  const [id, pt] = Object.entries(h.trees).filter(([k]) => free.includes(k)).sort((a, b) => b[1].y - a[1].y)[0];
  await page.mouse.click(pt.x, pt.y);
  const card = page.getByRole("dialog", { name: /나무$/ });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "팔고 싶어" }).click();
  await expect(page.getByRole("status")).toContainText("24시간");
  await expect(card.getByRole("button", { name: /냉각 중/ })).toBeVisible();
  // a day later (the save is kept in the browser)
  await page.goto("/proto3d?weather=clear&ahead=1");
  await expect.poll(async () => (await hooks(page))?.treeModels ?? 0, { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
  const p2 = (await hooks(page))!.trees[Number(id)];
  await page.mouse.click(p2.x, p2.y);
  await page.getByRole("dialog", { name: /나무$/ }).getByRole("button", { name: "결정하기" }).click();
  await expect(sheet(page, "브리핑").getByRole("form", { name: "판단 기록" })).toBeVisible();
  await sheet(page, "브리핑").getByRole("button", { name: "닫기" }).click();
  await dock(page, "기록").click();
  await expect(sheet(page, "내 판단의 질")).toContainText("냉각 1번 중 1번 기다림");
  clean(errors);
});

test("today's case: hidden name, a hint card, the reveal and the run of days", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await dock(page, "케이스").click();
  const c = sheet(page, "오늘의 케이스");
  await expect(c).toContainText("이 회사, 어떻게 됐을까");
  await expect(c.getByLabel(/남은 시간/)).toBeVisible();
  await c.getByRole("button", { name: /모델 카드 힌트/ }).click();
  await expect(c).toContainText("힌트 카드");
  await c.getByRole("group", { name: "답" }).getByRole("button").first().click();
  await expect(c.getByRole("status")).toContainText(/\d{4}/);
  await expect(c).toContainText("출처");
  await expect(c).not.toContainText(BANNED);
  await expect(page.getByLabel("내 숫자")).toContainText("1일");
  await c.getByRole("button", { name: "닫기" }).click();
  await dock(page, "기록").click();
  await sheet(page, "내 판단의 질").getByRole("tab", { name: "케이스 도감" }).click();
  await expect(sheet(page, "내 판단의 질")).toContainText("1 / 6장");
  clean(errors);
});

test("league, game door, cart and drawer", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await dock(page, "리그").click();
  const lg = sheet(page, /리그$/);
  await expect(lg.locator(".rt-row")).toHaveCount(12);
  await expect(lg).toContainText("(나)");
  await dock(page, "모의투자").click();
  const game = sheet(page, "모의투자 판");
  await expect(game).toContainText("올슨");
  await expect(game).toContainText("반박");
  await expect(game.getByRole("button", { name: "준비 중" })).toBeDisabled();
  await game.getByRole("button", { name: "닫기" }).click();
  // the cart is a landmark in the world: tap it when it is on screen, otherwise go through the drawer
  const cartPt = (await hooks(page))!.points.cart, vp = page.viewportSize()!;
  if (onScreen(cartPt, vp)) await page.mouse.click(cartPt.x, cartPt.y);
  else { await dock(page, "서랍").click(); await page.getByRole("button", { name: "행상 수레 열기" }).click(); }
  const cart = sheet(page, /^근거 \d+$/);
  await expect(cart).toBeVisible();
  await cart.getByRole("button", { name: "자료 상자 사기" }).click();
  await expect(page.getByTestId("currency")).toHaveText("0");
  await cart.getByRole("button", { name: "닫기" }).click();
  await dock(page, "서랍").click();
  const drawer = sheet(page, /^물건/);
  await drawer.getByLabel("자료 상자 놓을 곳").selectOption({ label: "현관 왼쪽" });
  await page.goto("/proto3d?weather=clear");
  await dock(page, "서랍").click();
  await expect(sheet(page, /^물건/).getByLabel("자료 상자 놓을 곳")).toHaveValue("door-l");
  clean(errors);
});

test("the observatory and the signpost in the world open the game door and the track record", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const close = page.getByRole("button", { name: /판정 \d건 도착/ });
  await expect(close).toBeVisible();
  const pts = (await hooks(page))!.points, vp = page.viewportSize()!;
  // on a phone the observatory can be off screen until the player turns the camera; check whichever is in view
  const seen = ([["signpost", "내 판단의 질"], ["observatory", "모의투자 판"]] as const).filter(([k]) => onScreen(pts[k], vp));
  expect(seen.length).toBeGreaterThan(0);
  for (const [k, name] of seen) {
    await page.mouse.click(pts[k].x, pts[k].y);
    await expect(sheet(page, name)).toBeVisible();
    await sheet(page, name).getByRole("button", { name: "닫기" }).first().click();
  }
  clean(errors);
});

// R6: the 3D garden is the main page; the classic 2D garden moved to /classic
test("the main page is the 3D garden and the classic garden lives at /classic", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("proto3d")).toBeVisible({ timeout: 30_000 });
  // a first visit lands on the onboarding
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible();
  await expect(page).toHaveTitle("ReThink Garden");
  await page.goto("/classic");
  await expect(page.locator(".world")).toBeVisible({ timeout: 30_000 });
});
