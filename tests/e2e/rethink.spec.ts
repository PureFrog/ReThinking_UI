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
  await settled(page);
}
// the camera eases into place after loading (upright phones look ahead of the player, look.ts camera.frames):
// wait until the landmarks and trees stop moving on screen before tapping them
async function settled(page: Page) {
  const snap = async () => { const h = (await hooks(page))!; return [...Object.values(h.points), ...Object.values(h.trees)] };
  await expect.poll(async () => {
    const a = await snap(); await page.waitForTimeout(250); const b = await snap();
    return a.length === b.length && a.every((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y) < 1);
  }, { timeout: 15_000 }).toBe(true);
}
const sheet = (page: Page, name: string | RegExp) => page.getByRole("dialog", { name });
const dock = (page: Page, name: string) => page.getByRole("navigation", { name: "메뉴" }).getByRole("button", { name });
const onScreen = (p: { x: number; y: number } | undefined, vp: { width: number; height: number }) => !!p && p.x > 30 && p.x < vp.width - 30 && p.y > 150 && p.y < vp.height - 130;
// on screen and not under a panel, bubble or banner (the tap must reach the canvas)
const tappable = async (page: Page, p: { x: number; y: number } | undefined, vp: { width: number; height: number }) =>
  onScreen(p, vp) && await page.evaluate(q => document.elementFromPoint(q.x, q.y)?.tagName === "CANVAS", p!);
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
  // tori speaks on her own signal; the plain status sits next to it
  await expect(result).toContainText("올슨 신호 적중");
  await expect(result).not.toContainText(BANNED);
  // the reveal plays out (ui/Loop.tsx Reveal): the verdict stamps, a reveal sound slot is reached (core/sound.ts),
  // and the holding tree reacts in the garden while the camera looks at it (Scene3D Burst, FollowCam focus)
  await expect(result.locator(".rt-verdict")).toHaveAttribute("data-phase", "done");
  await expect(page.locator("html")).toHaveAttribute("data-last-slot", /^grade-(hit|miss)$/);
  expect(await page.evaluate(() => (window as unknown as { __proto3d: { burst?: { holdingId: number } } }).__proto3d.burst?.holdingId)).toBe(7);
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
  // luon opens in his own words, then the note's counter to a hold (content/signals.ts)
  await expect(counter).toContainText("이자보상 1.1배야");
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
  await settled(page);
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
  if (await tappable(page, cartPt, vp)) await page.mouse.click(cartPt.x, cartPt.y);
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
  const seen: (readonly ["signpost" | "observatory", string])[] = [];
  for (const e of [["signpost", "내 판단의 질"], ["observatory", "모의투자 판"]] as const) if (await tappable(page, pts[e[0]], vp)) seen.push(e);
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

// sound (core/sound.ts) is on by default; the switch in the numbers row turns it off and the save keeps it off
test("sound can be turned off and stays off", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await page.getByRole("button", { name: "소리 끄기" }).click();
  await expect(page.getByRole("button", { name: "소리 켜기" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/proto3d?weather=clear");
  await expect(page.getByRole("button", { name: "소리 켜기" })).toBeVisible({ timeout: 30_000 });
  clean(errors);
});

// 되감기 (core/rewind.ts, content/rewind.ts): a made-up past case, the same call as in the real loop, the 30 days after
// revealed at once with the grade reveal; the first three a day pay, the rest are practice; the record keeps the rounds
test("rewind: a made-up past case graded at once, round after round", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const before = Number(await page.getByTestId("currency").textContent());
  await dock(page, "되감기").click();
  const rw = sheet(page, "되감기");
  await expect(rw).toContainText("가상 회사");
  await expect(rw).toContainText("1번째 판");
  await expect(rw).toContainText("그때 너라면?");
  await expect(rw.getByRole("article")).toBeVisible();
  const play = async (choice: RegExp) => {
    await rw.getByRole("group", { name: "판단" }).getByRole("button", { name: choice }).click();
    await expect(rw.getByRole("button", { name: "결과 보기" })).toBeDisabled();
    await rw.getByRole("group", { name: "확신도" }).getByRole("button", { name: "3" }).click();
    await rw.getByRole("button", { name: "결과 보기" }).click();
    await expect(rw.locator(".rt-verdict")).toHaveAttribute("data-phase", "done");
    await expect(rw).toContainText("그때 너");
    await expect(rw).toContainText(/판단 (적중|빗나감)/);
  };
  await play(/손절 검토/);
  const paid1 = Number(await page.getByTestId("currency").textContent()) - before;
  expect(paid1 === 1 || paid1 === 2).toBe(true);
  for (let i = 2; i <= 4; i++) {
    await rw.getByRole("button", { name: "다음 판" }).click();
    await expect(rw).toContainText(`${i}번째 판`);
    if (i < 4) await play(/더 지켜봄/);
  }
  // the fourth round is practice only
  await expect(rw).toContainText("오늘 보상은 다 받았어");
  await play(/홀드/);
  await rw.getByRole("button", { name: "그만" }).click();
  await dock(page, "기록").click();
  await expect(sheet(page, "내 판단의 질")).toContainText("4판");
  clean(errors);
});

// today's three (core/today.ts): the chip under the weather counts them, the sheet sends the player to each one and
// says when the next grade comes and where the title stands (core/rank.ts)
test("today's three: the chip, the list, and the way to each one", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const chip = page.getByRole("button", { name: /오늘 할 일 0\/3/ });
  await expect(chip).toBeVisible();
  await chip.click();
  const today = sheet(page, "오늘 할 일");
  await expect(today).toContainText("신호 하나에 판단 남기기");
  await expect(today).toContainText("도착한 판정 열기");
  await expect(today).toContainText("다음 판정 · 은하바이오 90일");
  await expect(today).toContainText("견습 관찰자");
  await today.locator(".rt-task").filter({ hasText: "도착한 판정 열기" }).getByRole("button", { name: "하기" }).click();
  await expect(page.getByRole("button", { name: "결과 열기" })).toBeVisible();
  clean(errors);
});

// W2 (docs/brief-wow.md): above the ground is the price, below it the company's books. The note's 땅 속 보기 or a long
// press on a tree opens the ground under it (Roots3D.tsx): roots for strength, dark spots for bankruptcy risk, a stone
// for debt (core/roots.ts). A weak company and a healthy one look different at a glance; nothing says sell.
type Cut = { open: boolean; holdingId: number | null; roots: { count: number; thick: number; spots: number; stone: number } | null };
const cutaway = async (page: Page) => ((await hooks(page)) as unknown as { cutaway?: Cut })?.cutaway ?? null;
test("the ground opens under a tree: weak and healthy roots look different", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const vp = page.viewportSize()!;
  // the first tree card says how (once), and a long press on a tree opens its ground
  const trees = (await hooks(page))!.trees;
  let id = -1;
  for (const [k, p] of Object.entries(trees)) if (await tappable(page, p, vp)) { id = Number(k); break; }
  expect(id).toBeGreaterThan(0);
  const p = trees[id];
  await page.mouse.click(p.x, p.y);
  await expect(page.getByRole("dialog", { name: /나무$/ })).toContainText("길게 누르면");
  await page.getByRole("dialog", { name: /나무$/ }).getByRole("button", { name: "닫기" }).click();
  await settled(page);
  const q = (await hooks(page))!.trees[id];
  await page.mouse.move(q.x, q.y); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
  await expect(sheet(page, "땅 속 보기")).toBeVisible();
  await expect.poll(async () => (await cutaway(page))?.holdingId).toBe(id);
  await sheet(page, "땅 속 보기").getByRole("button", { name: "닫기" }).click();
  await expect.poll(async () => (await cutaway(page))?.open).toBe(false);

  // from the research note: a weak company (the demo's 강철중공업: F-score 3, Ohlson 17%, debt 214%)
  await dock(page, "브리핑").click();
  await sheet(page, "오늘 브리핑").getByRole("button", { name: /강철중공업/ }).click();
  await sheet(page, "브리핑").getByRole("button", { name: /땅 속 보기/ }).click();
  const deep = sheet(page, "땅 속 보기");
  await expect(deep).toContainText("회사 체력");
  await expect(deep).toContainText("F-score");
  await expect(deep).toContainText("3/9");
  await expect(deep).toContainText("17%");
  await expect(deep).toContainText("214%");
  await expect(deep).toContainText("3점");// tori says the number
  await expect(deep).not.toContainText(BANNED);
  await expect.poll(async () => (await cutaway(page))?.holdingId).toBe(7);
  const weak = (await cutaway(page))!.roots!;
  expect(weak.spots).toBeGreaterThan(0);
  expect(weak.stone).toBeGreaterThan(0.5);
  // closing covers the ground and goes back to the note
  await deep.getByRole("button", { name: "닫기" }).click();
  await expect(sheet(page, "브리핑")).toContainText("강철중공업");
  await expect.poll(async () => (await cutaway(page))?.open).toBe(false);
  await sheet(page, "브리핑").getByRole("button", { name: "닫기" }).first().click();

  // a healthy one (새봄반도체): more and thicker roots, no spots
  await dock(page, "브리핑").click();
  await sheet(page, "오늘 브리핑").getByRole("button", { name: /새봄반도체/ }).click();
  await sheet(page, "브리핑").getByRole("button", { name: /땅 속 보기/ }).click();
  await expect.poll(async () => (await cutaway(page))?.holdingId).toBe(1);
  const good = (await cutaway(page))!.roots!;
  expect(good.count).toBeGreaterThan(weak.count);
  expect(good.thick).toBeGreaterThan(weak.thick);
  expect(good.spots).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!).seen.cutaway)).toBe(3);
  clean(errors);
});

// W3 (docs/brief-wow.md): a judgment is buried under its tree as a capsule (core/capsule.ts) with a D-n marker; when
// its grade arrives, light leaks out of the marker, and tapping it digs the capsule up: the memo first, then the reveal.
type CapHooks = { capsules?: { holdingId: number; due: boolean }[]; capsuleFx?: { kind: string; holdingId: number } | null };
const caps = async (page: Page) => (await hooks(page)) as unknown as CapHooks;
test("a judgment is buried as a capsule and dug up when its grade arrives", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  // the demo's two old judgments are due: their markers glow from the start
  await expect.poll(async () => (await caps(page)).capsules?.filter(c => c.due).map(c => c.holdingId).sort()).toEqual([6, 7]);
  await expect(page.getByRole("button", { name: "강철중공업 캡슐 · 판정 도착" })).toHaveCount(1);

  // a new judgment: the memo folds into a capsule, then goes under its tree
  await dock(page, "브리핑").click();
  await sheet(page, "오늘 브리핑").getByRole("button", { name: /꽃빛뷰티/ }).click();
  const brief = sheet(page, "브리핑");
  const form = brief.getByRole("form", { name: "판단 기록" });
  await form.getByRole("group", { name: "판단" }).getByRole("button", { name: /더 지켜봄/ }).click();
  await form.getByRole("textbox").fill("전저점 깨지면 그때 다시 본다.");
  await form.getByRole("group", { name: "확신도" }).getByRole("button", { name: "3" }).click();
  await form.getByRole("button", { name: "기록" }).click();
  await brief.getByLabel("루온의 반박").getByRole("button", { name: "그래도 유지" }).click();
  await expect(brief.getByLabel("캡슐에 담긴 메모")).toContainText("전저점 깨지면");
  await brief.getByRole("button", { name: "꽃빛뷰티 밑에 묻기" }).click();
  await expect(brief).toBeHidden();
  // (a slow test machine may be past the burying already: the save counts it)
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!).seen.bury)).toBe(1);
  await expect.poll(async () => (await caps(page)).capsules?.find(c => c.holdingId === 3)?.due).toBe(false);
  await expect.poll(async () => (await caps(page)).capsuleFx, { timeout: 10_000 }).toBeNull();
  // not due yet: its marker says how long, and a tap says it again
  const waiting = page.getByRole("button", { name: "꽃빛뷰티 캡슐 · D-30" });
  await expect(waiting).toHaveCount(1);
  await waiting.dispatchEvent("click");
  await expect(page.getByRole("status")).toContainText("30일 판정까지 30일");

  // a glowing one: dug up, the memo of that day first, then the reveal
  await page.getByRole("button", { name: "강철중공업 캡슐 · 판정 도착" }).dispatchEvent("click");
  const memo = sheet(page, "30일 전 너의 판단");
  await expect(memo).toContainText("강철중공업");
  await expect(memo).toContainText("캡슐에서 꺼낸 메모");
  await expect(memo).toContainText("수주 잔고 3년치");
  await expect.poll(async () => (await caps(page)).capsuleFx).toEqual({ kind: "dig", holdingId: 7 });
  await memo.getByRole("button", { name: "결과 열기" }).click();
  const result = sheet(page, "판정 결과");
  await expect(result.locator(".rt-verdict")).toHaveAttribute("data-phase", "done");
  await result.getByRole("button", { name: "닫기" }).first().click();
  await expect.poll(async () => (await caps(page)).capsuleFx).toBeNull();
  // its 30-day grade opened; that judgment is 92 days old, so its 90-day capsule is the one glowing now
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!).graded.length)).toBe(1);
  await expect.poll(async () => (await caps(page)).capsules?.find(c => c.holdingId === 7)?.due).toBe(true);
  clean(errors);
});

// W4 (docs/brief-wow.md): a grade as a portrait picture to show someone (ui/Share.tsx, core/share.ts): 1080×1920,
// saved as a file where the phone cannot share one. Only the move in %; "모의 데이터 · 투자 권유 아님" at the bottom.
test("a grade becomes a share card that can be saved", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await page.getByRole("button", { name: /판정 2건 도착/ }).click();
  await page.getByRole("button", { name: "결과 열기" }).click();
  const result = sheet(page, "판정 결과");
  await expect(result.locator(".rt-verdict")).toHaveAttribute("data-phase", "done");
  await result.getByRole("button", { name: "공유 카드" }).click();
  const card = sheet(page, "공유 카드");
  const img = card.getByRole("img", { name: /강철중공업 30일 판정 공유 카드/ });
  await expect(img).toBeVisible({ timeout: 20_000 });
  expect(await img.evaluate(e => [(e as HTMLImageElement).naturalWidth, (e as HTMLImageElement).naturalHeight])).toEqual([1080, 1920]);
  await expect(card).toContainText("투자 권유 아님");
  const [file] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: "저장" }).click()]);
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  // back to the result
  await card.getByRole("button", { name: "닫기" }).first().click();
  await expect(sheet(page, "판정 결과")).toBeVisible();
  clean(errors);
});

// W5 (docs/brief-wow.md): the garden's year as a timelapse (core/history.ts). Trees bought within the year are not
// there a year ago, the sky is that day's market, and the last frame is today's garden again.
test("the timelapse shows the garden a year ago and comes back to today", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await dock(page, "기록").click();
  await sheet(page, "내 판단의 질").getByRole("button", { name: "정원 타임랩스" }).click();
  const bar = page.getByRole("dialog", { name: "타임랩스" });
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "멈춤" }).click();
  const lapse = async () => (await page.evaluate(() => (window as unknown as { __proto3d: { lapse: { back: number; trees: number; weather: string } | null } }).__proto3d.lapse));
  await bar.getByLabel("타임랩스 날짜").fill("0");
  await expect.poll(async () => (await lapse())?.back).toBe(365);
  // a year ago only the demo's oldest holding (별숲게임즈, bought 2025-06) stood there
  await expect.poll(async () => (await lapse())?.trees).toBe(1);
  await expect(page.locator(".rt-weather")).toContainText("그날 시장");
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeHidden();
  await bar.getByLabel("타임랩스 날짜").fill("52");
  await expect.poll(async () => (await lapse())?.trees).toBe(7);
  await expect.poll(async () => (await lapse())?.weather).toBe("clear");
  await bar.getByRole("button", { name: "닫기" }).click();
  await expect(bar).toBeHidden();
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible();
  expect(await lapse()).toBeNull();
  clean(errors);
});

// W6 (docs/brief-wow.md, core/tilt.ts): tilting the phone moves the camera a little. The first reading is the rest angle.
test("tilting the phone leans the view", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  type T = { on: boolean; need: boolean; x: number; y: number };
  const t = async () => page.evaluate(() => { const h = (window as unknown as { __proto3d: { tilt: T } }).__proto3d.tilt; return { on: h.on, need: h.need, x: h.x, y: h.y } });
  // a browser with a permission step (iPhone, recent Chrome) shows the button and asks only when it is pressed
  await page.context().grantPermissions(["accelerometer", "gyroscope"]);// what the player would allow in the prompt
  if ((await t()).need) await page.getByRole("button", { name: "기울이기 켜기" }).click();
  await expect.poll(async () => (await t()).on).toBe(true);
  const tilt = (beta: number, gamma: number) => page.evaluate(([b, g]) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { beta: b, gamma: g })), [beta, gamma]);
  await tilt(40, 0);// how it is held: the middle
  expect(await t()).toMatchObject({ x: 0, y: 0 });
  const before = (await hooks(page))!.trees;
  await tilt(40, 18);
  expect((await t()).x).toBeGreaterThan(0.5);
  // the garden slides on screen as the camera leans
  await expect.poll(async () => { const now = (await hooks(page))!.trees; const k = Object.keys(now)[0]; return Math.abs(now[Number(k)].x - before[Number(k)].x) }).toBeGreaterThan(4);
  await tilt(40, 0);
  expect((await t()).x).toBe(0);
  clean(errors);
});
