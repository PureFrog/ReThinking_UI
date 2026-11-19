import { test, expect, type Page } from "./fixtures";
// where things stand comes from the app's own map (the garden was spread out 1.4× on 2026-11-16, core/world.ts SPREAD)
import { place } from "../../app/proto3d/places";

// R3–R6 ReThink Garden on /proto3d: the analysts, the judgment loop, grades, cooldown, today's case, track record,
// league, the game door, cart and drawer. Every test starts from a fresh demo save (?demo) under a fixed sky.
// The demo save holds two old judgments, so grades are due on the first visit (app/proto3d/state.ts demoSave).
test.describe.configure({ timeout: 180_000 });
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
// the four-tab home (ui/Home.tsx): 일지 holds the notes and the record, 더보기 the rest, the next-step card the grades
const journal = (page: Page) => sheet(page, "투자일지");
// an analyst signal row in the 일지 tab (not the stock's card on the shelf)
const noteRow = (page: Page, name: RegExp) => journal(page).locator("button.rt-row").filter({ hasText: name }).filter({ hasNotText: "일 채점" });
// the old judgments' track record: 일지 → 이전 판단 (지기, docs/jigi.md)
async function records(page: Page) { await dock(page, "일지").click(); await journal(page).getByRole("button", { name: /^이전 판단 \d/ }).click() }
async function more(page: Page, name: string) { await dock(page, "더보기").click(); await sheet(page, "더보기").getByRole("button", { name: new RegExp("^" + name) }).click() }
const coins = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").currency as number);
const nextCard = (page: Page) => page.getByRole("region", { name: "다음 할 일" });
const onScreen = (p: { x: number; y: number } | undefined, vp: { width: number; height: number }) => !!p && p.x > 30 && p.x < vp.width - 30 && p.y > 150 && p.y < vp.height - 130;
// on screen and not under a panel, bubble or banner (the tap must reach the canvas)
const tappable = async (page: Page, p: { x: number; y: number } | undefined, vp: { width: number; height: number }) =>
  onScreen(p, vp) && await page.evaluate(q => document.elementFromPoint(q.x, q.y)?.tagName === "CANVAS", p!);
const clean = (errors: string[]) => expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);

test("old judgments come back graded: the reveal, the score and the track record", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await expect(nextCard(page)).toContainText("채점 결과 2건");
  await nextCard(page).getByRole("button", { name: "확인" }).click();
  await page.getByRole("button", { name: "결과 보기" }).click();
  const result = sheet(page, "채점 결과");
  await expect(result).toContainText("POSCO홀딩스");
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
  await result.getByRole("button", { name: /다음 결과/ }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "결과 보기" }).click();
    const r = sheet(page, "채점 결과");
    await r.locator(".rt-sheet-body .rt-btn.primary").click();
    if (await page.getByRole("button", { name: "결과 보기" }).count() === 0) break;
  }
  await expect(nextCard(page)).not.toContainText("채점 결과");
  await records(page);
  const rec = sheet(page, "내 판단의 질");
  await expect(rec).toContainText("판단 적중");
  await expect(rec.locator(".rt-cell").first()).toContainText("%");
  await rec.getByRole("tab", { name: "판단" }).click();
  await expect(rec).toContainText("수주 잔고");
  clean(errors);
});

test("briefing: a research note leads to a journal on that stock, and the signal counts as answered", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await dock(page, "일지").click();
  await expect(journal(page)).toContainText("신호 5건");
  await noteRow(page, /POSCO홀딩스/).click();
  const brief = sheet(page, "브리핑");
  const note = brief.getByRole("article", { name: "토리 리서치 노트" });
  await expect(note).toContainText("부도 위험");
  await expect(note).toContainText("올슨");
  // 지기 (docs/jigi.md): no one-line judgment any more; the note opens a journal page on that stock
  await expect(brief.getByRole("form", { name: "판단 기록" })).toHaveCount(0);
  await brief.getByRole("button", { name: "이 종목 일지 쓰기" }).click();
  const w = sheet(page, "일지 쓰기");
  await w.getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /종목과 차트/ }).click();
  await expect(w.getByRole("button", { name: /종목: POSCO홀딩스/ })).toBeVisible();
  clean(errors);
});

test("an analyst's bubble in the world opens their note", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  // one bubble at a time: wait for moa's turn
  const bubble = page.locator('[data-analyst="moa"]');
  await expect(bubble).toBeVisible({ timeout: 20_000 });
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
  await card.getByRole("button", { name: "쿨다운 걸기" }).click();
  await expect(page.getByRole("status")).toContainText("24시간");
  await expect(card.getByRole("button", { name: /쿨다운 .* 남음/ })).toBeVisible();
  // a day later (the save is kept in the browser)
  await page.goto("/proto3d?weather=clear&ahead=1");
  await expect.poll(async () => (await hooks(page))?.treeModels ?? 0, { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
  await settled(page);
  const p2 = (await hooks(page))!.trees[Number(id)];
  await page.mouse.click(p2.x, p2.y);
  await page.getByRole("dialog", { name: /나무$/ }).getByRole("button", { name: "지금 결정하기" }).click();
  await expect(sheet(page, "브리핑").getByRole("button", { name: "이 종목 일지 쓰기" })).toBeVisible();
  await sheet(page, "브리핑").getByRole("button", { name: "닫기" }).click();
  await records(page);
  await expect(sheet(page, "내 판단의 질")).toContainText("쿨다운 1번 중 1번 기다림");
  clean(errors);
});

test("today's case: hidden name, a hint card, the reveal and the run of days", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await more(page, "오늘의 케이스");
  const c = sheet(page, "오늘의 케이스");
  await expect(c).toContainText("이 회사, 어떻게 됐을까");
  await expect(c.getByLabel(/남은 시간/)).toBeVisible();
  await c.getByRole("button", { name: /모델 카드 힌트/ }).click();
  await expect(c).toContainText("힌트 카드");
  await c.getByRole("group", { name: "답" }).getByRole("button").first().click();
  await expect(c.getByRole("status")).toContainText(/\d{4}/);
  await expect(c).toContainText("출처");
  await expect(c).not.toContainText(BANNED);
  await c.getByRole("button", { name: "닫기" }).click();
  await dock(page, "더보기").click();
  await expect(page.getByLabel("내 숫자")).toContainText("연속 1일");
  await sheet(page, "더보기").getByRole("button", { name: "닫기" }).first().click();
  await records(page);
  await sheet(page, "내 판단의 질").getByRole("tab", { name: "케이스 도감" }).click();
  await expect(sheet(page, "내 판단의 질")).toContainText("1 / 6장");
  clean(errors);
});

test("league, game door, cart and drawer", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await more(page, "리그");
  const lg = sheet(page, /리그$/);
  await expect(lg.locator(".rt-row")).toHaveCount(12);
  await expect(lg).toContainText("(나)");
  // the observatory door opens 오늘의 관측소 (daily_quest_design v1); the weekly 판 is a read-only record there
  await dock(page, "관측소").click();
  const game = sheet(page, "오늘의 관측소");
  await expect(game).toContainText("관측소 숙련도");
  await expect(game.getByRole("button", { name: /의뢰 시작 · 가격표 뒤의 고객/ })).toBeEnabled();
  await game.getByRole("button", { name: "닫기" }).click();
  // the cart is a landmark in the world: tap it when it is on screen, otherwise go through the drawer
  const cartPt = (await hooks(page))!.points.cart, vp = page.viewportSize()!;
  if (await tappable(page, cartPt, vp)) await page.mouse.click(cartPt.x, cartPt.y);
  else { await more(page, "꾸미기"); await page.getByRole("button", { name: "상점" }).click(); }
  const cart = sheet(page, /^포인트 \d+$/);
  await expect(cart).toBeVisible();
  await cart.getByRole("button", { name: "자료 상자 사기" }).click();
  await expect.poll(() => coins(page)).toBe(0);
  await cart.getByRole("button", { name: "닫기" }).click();
  await more(page, "꾸미기");
  const drawer = sheet(page, /^물건/);
  await drawer.getByLabel("자료 상자 놓을 곳").selectOption({ label: "현관 왼쪽" });
  await page.goto("/proto3d?weather=clear");
  await more(page, "꾸미기");
  await expect(sheet(page, /^물건/).getByLabel("자료 상자 놓을 곳")).toHaveValue("door-l");
  clean(errors);
});

test("the observatory and the signpost in the world open the game door and the track record", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await expect(nextCard(page)).toContainText("채점 결과 2건");
  let pts = (await hooks(page))!.points;
  const vp = page.viewportSize()!;
  // check whichever is in view; on a phone the spread-out garden (2026-11-16) can leave both off screen, so the map
  // walks the player to the observatory first
  const seen: (readonly ["signpost" | "observatory", string])[] = [];
  for (const e of [["signpost", "내 판단의 질"], ["observatory", "오늘의 관측소"]] as const) if (await tappable(page, pts[e[0]], vp)) seen.push(e);
  if (!seen.length) {
    await walkTo(page, "관측소", place("observatory").walk);
    pts = (await hooks(page))!.points;
    if (await tappable(page, pts.observatory, vp)) seen.push(["observatory", "오늘의 관측소"]);
  }
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
  await expect(page).toHaveTitle("rethinking!");
  await page.goto("/classic");
  await expect(page.locator(".world")).toBeVisible({ timeout: 30_000 });
});

// sound (core/sound.ts) is on by default; the switch in the numbers row turns it off and the save keeps it off
test("sound can be turned off and stays off", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await more(page, "설정");
  await sheet(page, "설정").getByRole("button", { name: "소리 끄기" }).click();
  await expect(sheet(page, "설정").getByRole("button", { name: "소리 켜기" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/proto3d?weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await more(page, "설정");
  await expect(sheet(page, "설정").getByRole("button", { name: "소리 켜기" })).toBeVisible();
  clean(errors);
});

// 되감기 (core/rewind.ts, content/rewind.ts): a made-up past case, the same call as in the real loop, the 30 days after
// revealed at once with the grade reveal; the first three a day pay, the rest are practice; the record keeps the rounds
test("rewind: a made-up past case graded at once, round after round", async ({ page }) => {
  test.setTimeout(300_000);// four rounds, each with the full reveal: the slowest test on a software-rendered desktop
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const before = await coins(page);
  await more(page, "되감기");
  const rw = sheet(page, "되감기");
  await expect(rw).toContainText("가상 회사");
  await expect(rw).toContainText("1번째 판");
  await expect(rw).toContainText("이때라면 어떻게 할까요?");
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
  await page.waitForTimeout(300);
  const paid1 = (await coins(page)) - before;
  expect(paid1 === 1 || paid1 === 2).toBe(true);
  for (let i = 2; i <= 4; i++) {
    await rw.getByRole("button", { name: "다음 판" }).click();
    await expect(rw).toContainText(`${i}번째 판`);
    if (i < 4) await play(/더 지켜봄/);
  }
  // the fourth round is practice only
  await expect(rw).toContainText("오늘 보상은 모두 받았어요");
  await play(/홀드/);
  await rw.getByRole("button", { name: "그만" }).click();
  await records(page);
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
  await expect(today).toContainText("일지 한 편 쓰기");
  await expect(today).toContainText("채점 결과 확인하기");
  await expect(today).toContainText("다음 채점 · 삼성전자 90일");
  await expect(today).toContainText("인턴");
  await today.locator(".rt-task").filter({ hasText: "채점 결과 확인하기" }).getByRole("button", { name: "하기" }).click();
  await expect(page.getByRole("button", { name: "결과 보기" })).toBeVisible();
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
  await expect(sheet(page, "재무 체력")).toBeVisible();
  await expect.poll(async () => (await cutaway(page))?.holdingId).toBe(id);
  await sheet(page, "재무 체력").getByRole("button", { name: "닫기" }).click();
  await expect.poll(async () => (await cutaway(page))?.open).toBe(false);

  // from the research note: a weak company (the demo's POSCO홀딩스: F-score 3, Ohlson 17%, debt 214%)
  await dock(page, "일지").click();
  await noteRow(page, /POSCO홀딩스/).click();
  await sheet(page, "브리핑").getByRole("button", { name: /재무 체력/ }).click();
  const deep = sheet(page, "재무 체력");
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
  await expect(sheet(page, "브리핑")).toContainText("POSCO홀딩스");
  await expect.poll(async () => (await cutaway(page))?.open).toBe(false);
  await sheet(page, "브리핑").getByRole("button", { name: "닫기" }).first().click();

  // a healthy one (SK하이닉스): more and thicker roots, no spots
  await dock(page, "일지").click();
  await noteRow(page, /SK하이닉스/).click();
  await sheet(page, "브리핑").getByRole("button", { name: /재무 체력/ }).click();
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
  await expect(page.getByRole("button", { name: "POSCO홀딩스 · 채점 완료" })).toHaveCount(1);

  // (no new judgment capsules since 지기, docs/jigi.md 2.4: hypothesis capsules come in J2; the old ones still open)
  // a glowing one: dug up, the memo of that day first, then the reveal
  await page.getByRole("button", { name: "POSCO홀딩스 · 채점 완료" }).dispatchEvent("click");
  const memo = sheet(page, "30일 전 내 판단");
  await expect(memo).toContainText("POSCO홀딩스");
  await expect(memo).toContainText("에 쓴 메모");
  await expect(memo).toContainText("수주 잔고 3년치");
  await expect.poll(async () => (await caps(page)).capsuleFx).toEqual({ kind: "dig", holdingId: 7 });
  await memo.getByRole("button", { name: "결과 보기" }).click();
  const result = sheet(page, "채점 결과");
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
  await nextCard(page).getByRole("button", { name: "확인" }).click();
  await page.getByRole("button", { name: "결과 보기" }).click();
  const result = sheet(page, "채점 결과");
  await expect(result.locator(".rt-verdict")).toHaveAttribute("data-phase", "done");
  await result.getByRole("button", { name: "공유하기" }).click();
  const card = sheet(page, "공유 카드");
  const img = card.getByRole("img", { name: /POSCO홀딩스 30일 채점 공유 카드/ });
  await expect(img).toBeVisible({ timeout: 20_000 });
  expect(await img.evaluate(e => [(e as HTMLImageElement).naturalWidth, (e as HTMLImageElement).naturalHeight])).toEqual([1080, 1920]);
  await expect(card).toContainText("투자 권유 아님");
  const [file] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: "저장" }).click()]);
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  // back to the result
  await card.getByRole("button", { name: "닫기" }).first().click();
  await expect(sheet(page, "채점 결과")).toBeVisible();
  clean(errors);
});

// W5 (docs/brief-wow.md): the garden's year as a timelapse (core/history.ts). Trees bought within the year are not
// there a year ago, the sky is that day's market, and the last frame is today's garden again.
test("the timelapse shows the garden a year ago and comes back to today", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await records(page);
  await sheet(page, "내 판단의 질").getByRole("button", { name: "1년 돌려보기" }).click();
  const bar = page.getByRole("dialog", { name: "타임랩스" });
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "멈춤" }).click();
  const lapse = async () => (await page.evaluate(() => (window as unknown as { __proto3d: { lapse: { back: number; trees: number; weather: string } | null } }).__proto3d.lapse));
  await bar.getByLabel("타임랩스 날짜").fill("0");
  await expect.poll(async () => (await lapse())?.back).toBe(365);
  // a year ago only the demo's oldest holding (NAVER, bought 2025-06) stood there
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
  if ((await t()).need) { await more(page, "설정"); await sheet(page, "설정").getByRole("button", { name: "기울이기 켜기" }).click(); await sheet(page, "설정").getByRole("button", { name: "닫기" }).first().click() }
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

// The wider map (app/proto3d/places.ts, World3D.tsx): the map sends the player walking; the case library up the north
// path and the league square across the stream (over the bridge) open their sheets when tapped.
type Pt = { x: number; z: number };
const player = async (page: Page) => (await page.evaluate(() => (window as unknown as { __proto3d: { player: Pt } }).__proto3d.player));
async function walkTo(page: Page, label: string, to: Pt) {
  await page.getByRole("button", { name: "지도" }).click();
  await sheet(page, "정원 지도").getByRole("button", { name: label, exact: true }).click();
  await expect.poll(async () => { const p = await player(page); return Math.hypot(p.x - to.x, p.z - to.z) }, { timeout: 60_000 }).toBeLessThan(0.2);
  await settled(page);
  // today's observatory request (a notice above the next-task card) is put away first, as a player would
  const notice = page.getByTestId("request-notice");
  if (await notice.isVisible()) await notice.getByRole("button", { name: "알림 닫기" }).click();
}
test("the map walks to the library and over the bridge to the league square", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const vp = page.viewportSize()!;
  await walkTo(page, "사례 서고", place("library").walk);
  const lib = (await hooks(page))!.points.library;
  expect(await tappable(page, lib, vp)).toBe(true);
  await page.mouse.click(lib.x, lib.y);
  const library = sheet(page, "사례 서고");
  await expect(library).toContainText("오늘의 케이스");
  await library.getByRole("button", { name: /오늘의 케이스/ }).click();
  await expect(sheet(page, "오늘의 케이스")).toBeVisible();
  await sheet(page, "오늘의 케이스").getByRole("button", { name: "닫기" }).first().click();
  // across the stream: the walk goes by the bridge
  await walkTo(page, "리그 광장", place("plaza").walk);
  const sq = (await hooks(page))!.points.plaza;
  expect(await tappable(page, sq, vp)).toBe(true);
  await page.mouse.click(sq.x, sq.y);
  await expect(page.getByRole("dialog", { name: /리그/ })).toContainText("기록 점수");
  clean(errors);
});

// Inside the house (Interior3D.tsx): the workroom. The desk is today's three, the shelf the track record, the board the
// buried capsules; the door (or the button) goes back out.
test("the house opens into the analysts' workroom and back out", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  const vp = page.viewportSize()!;
  await walkTo(page, "집", place("home").walk);
  const house = (await hooks(page))!.points.house;
  expect(await tappable(page, house, vp)).toBe(true);
  await page.mouse.click(house.x, house.y);
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __proto3d: { inside?: boolean } }).__proto3d.inside))).toBe(true);
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible();
  await expect(page.getByRole("button", { name: "지도" })).toHaveCount(0);
  // the demo's two judgments are two books; both of their grades have arrived, so the board says so
  await expect(page.getByRole("button", { name: "판단 2개" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /채점 완료 2/ })).toHaveCount(1);
  await page.getByRole("button", { name: /^책상/ }).dispatchEvent("click");
  await expect(sheet(page, /오늘 할 일/)).toBeVisible();
  await sheet(page, /오늘 할 일/).getByRole("button", { name: "닫기" }).first().click();
  await page.getByRole("button", { name: "밖으로 나가기" }).click();
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __proto3d: { inside?: boolean } }).__proto3d.inside))).toBe(false);
  await expect(page.getByRole("button", { name: "지도" })).toBeVisible();
  clean(errors);
});

// The analysts' day (core/routine.ts): with nothing flagged they go to their own spots by the clock ('?hour=' holds
// it), two of them meet now and then and talk, and at night they are home (not out in the garden).
async function quietGarden(page: Page, errors: string[], hour: string) {
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`/proto3d?reset&weather=clear&hour=${hour}`);
  await expect.poll(async () => (await hooks(page))?.frames ?? 0, { timeout: 60_000 }).toBeGreaterThan(10);
  await page.getByRole("button", { name: /직접 입력/ }).click();
  const list = sheet(page, "종목 확인");
  await list.getByLabel("1번 종목 이름").fill("나래식품");// a small gain: nothing is flagged
  await list.getByLabel("나래식품 수익률").fill("6.5");
  await list.getByRole("button", { name: /정원에 넣기/ }).click();
  await page.getByRole("button", { name: "건너뛰기" }).click({ timeout: 4_000 }).catch(() => {});
}
test("with nothing flagged the analysts go about their day, meet and talk, and go home at night", async ({ page }) => {
  const errors: string[] = [];
  await quietGarden(page, errors, "14");// 14:00 is a meeting slot
  // the two who meet take turns: one bubble at a time (TIMING.bubbleTurn), so both lines show within a few turns
  await expect(page.locator(".rt-bubble")).toHaveCount(1, { timeout: 30_000 });
  const seen = new Set<string>();
  await expect.poll(async () => { for (const t of await page.locator(".rt-bubble").allTextContents()) seen.add(t); return seen.size }, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  const talk = [...seen];
  expect(talk.every(t => !/팔아|사라|매수|매도/.test(t))).toBe(true);
  await page.goto("/proto3d?weather=clear&hour=23");
  await expect.poll(async () => (await hooks(page))?.frames ?? 0, { timeout: 60_000 }).toBeGreaterThan(10);
  await page.waitForTimeout(1500);
  // at night nobody is out: no analyst reports a point in the garden
  const pts = (await hooks(page))!.points;
  expect(Object.keys(pts).some(k => k.startsWith("analyst-"))).toBe(false);
  clean(errors);
});

// My observer (ui/MyPage.tsx, Showroom3D.tsx): the chip opens the stage; a piece put on is saved and worn in the garden;
// locked pieces say how to get them; the record and the stamps are there.
test("my observer's stage: dress up, see my record and stamps, back to the garden", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await page.getByRole("button", { name: "내 프로필" }).click();
  const me = page.getByRole("dialog", { name: "내 프로필" });
  await expect(me).toBeVisible();
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __proto3d: { stage?: boolean } }).__proto3d.stage))).toBe(true);
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeHidden();
  // the name
  await me.getByRole("button", { name: "이름 바꾸기" }).click();
  await me.getByLabel("내 이름").fill("새벽");
  await me.getByLabel("내 이름").press("Enter");
  await expect(me).toContainText("새벽");
  // a locked piece says how; an open one is put on and saved
  await me.getByRole("button", { name: "모자" }).click();
  await expect(me.getByRole("button", { name: /헤드램프/ })).toContainText("확신 5 적중");
  await me.getByRole("button", { name: /^없음/ }).click();
  await me.getByRole("button", { name: "색" }).click();
  await me.getByRole("button", { name: /먹/ }).click();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!));
  await expect.poll(async () => (await saved()).look).toMatchObject({ hat: null, palette: "ink" });
  await me.getByRole("tab", { name: "기록" }).click();
  await expect(me).toContainText("확신도별 실제 적중");
  await me.getByRole("tab", { name: "업적" }).click();
  await expect(me).toContainText("첫 판단");
  expect((await saved()).stamps.map((s: { id: string }) => s.id)).toContain("first-judgment");
  await me.getByRole("button", { name: "닫기" }).click();
  await expect(me).toBeHidden();
  await expect(page.getByRole("button", { name: /새벽/ })).toBeVisible();
  clean(errors);
});

// Settings, the monthly letter and this week's goals (ui/Settings.tsx, core/letter.ts, core/weekly.ts)
test("settings change the text size and keep things still; the letter and the week's goals are there", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, "&demo");
  await page.getByRole("button", { name: "내 프로필" }).click();
  const me = page.getByRole("dialog", { name: "내 프로필" });
  await me.getByRole("button", { name: "설정" }).click();
  const st = sheet(page, "설정");
  await st.getByRole("group", { name: "글자 크기" }).getByRole("button", { name: "크게", exact: true }).click();
  await st.getByLabel(/움직임 줄이기/).check();
  await expect(page.locator("html")).toHaveAttribute("data-text", "l");
  await expect(page.locator("html")).toHaveAttribute("data-still", "1");
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!))).settings).toMatchObject({text: "l", still: true});
  // starting over asks twice
  await st.getByRole("button", { name: "처음부터 다시 시작" }).click();
  await expect(st).toContainText("되돌릴 수 없어");
  await st.getByRole("button", { name: "취소" }).click();
  await st.getByRole("button", { name: "닫기" }).first().click();
  // this month's letter so far, from the record tab
  await me.getByRole("tab", { name: "기록" }).click();
  await me.getByRole("button", { name: "이번 달 리포트 미리 보기" }).click();
  const letter = sheet(page, "월간 리포트");
  await expect(letter).toContainText("월 리포트");
  await expect(letter).toContainText("판단 기록 리포트");
  await letter.getByRole("button", { name: "닫기" }).first().click();
  await me.getByRole("button", { name: "닫기" }).click();
  // the week's three in today's sheet
  await page.getByRole("button", { name: /^오늘 할 일/ }).click();
  await expect(sheet(page, /오늘 할 일/)).toContainText("이번 주 목표");
  clean(errors);
});
