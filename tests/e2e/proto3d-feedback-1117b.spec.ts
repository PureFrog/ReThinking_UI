// Feedback 2026-11-17 (second round): the first entry introduces the four and asks for the portfolio; the journal has
// three pages that go on by themselves, a line on the stock's flow, and opens the analysis after saving; the challenge
// has 게임 끝내기; the 꽃집 sells flowers and trees planted on open grass.
import { test, expect } from "./fixtures";
import * as V from "./village";
import type { Page } from "@playwright/test";

test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
test.describe.configure({ timeout: 180_000 });
const dock = (page: Page) => V.controls(page);

test("first entry: the four introduce themselves, then 보리 asks for the capture", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?fresh&intro&weather=clear");
  const intro = page.getByRole("dialog", { name: "처음 소개" });
  await expect(intro).toBeVisible({ timeout: 30_000 });
  await expect(intro).toContainText("나는 보리야");
  await page.screenshot({ path: info.outputPath("intro-1.png") });
  const box = intro.locator(".rt-talk-box");
  const names: string[] = [];
  for (let i = 0; i < 20 && !(await intro.getByRole("button", { name: "캡처 올리기" }).isVisible()); i++) {
    names.push(((await box.locator(".rt-talk-name").textContent()) ?? "").trim());
    await box.click(); await page.waitForTimeout(150);
  }
  // (유저 워크플로우 2026-11-23: the analysts are not characters any more, 보리 alone — content/intro.ts)
  expect(new Set(names)).toEqual(new Set(["보리"]));
  await expect(intro).toContainText("캡처해서 올리면 돼");
  await page.screenshot({ path: info.outputPath("intro-last.png") });
  // 캡처 올리기 goes to 내 종목 넣기 with the picture picker asked for (a headless browser may not show the picker, so
  // the sheet is what is checked; its own 캡처 card opens the picker on a tap)
  await intro.getByRole("button", { name: "캡처 올리기" }).click();
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible();
  await expect(intro).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the journal: three pages, a flow line, a filled page goes on by itself, saving opens the analysis", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await V.journal(page);
  const book = page.getByRole("dialog", { name: "투자일지" });
  await book.getByRole("button", { name: /^(새|첫) 일지 쓰기/ }).click();
  const write = page.getByRole("dialog", { name: "일지 쓰기" });
  const pages = write.getByRole("navigation", { name: "일지 쪽" });
  await expect(pages.getByRole("button")).toHaveCount(3);
  await expect(pages).not.toContainText("오늘의 나");
  await expect(write).not.toContainText("몸은");
  // page 1: the stock, what I did, how well I know it; once all three are there the page goes on by itself
  await write.getByRole("button", { name: "종목 고르기" }).click();
  // (since 2026-11-24 the search is the KOSDAQ 120 only, the market the models cover)
  await write.getByRole("searchbox", { name: "종목 검색" }).fill("에이치엘비");
  await write.getByRole("button", { name: /^에이치엘비/ }).first().click();
  await expect(write.getByRole("note", { name: "종목 흐름" })).toContainText(/어제보다|최근 한 달/);
  await write.getByRole("button", { name: "한 일 고르기" }).click();
  await write.getByRole("group", { name: "한 일" }).getByRole("button", { name: "보유" }).click();
  await write.getByRole("button", { name: "이해 정도 고르기" }).click();
  await write.getByRole("group", { name: "이해 정도" }).getByRole("button", { name: "일부 이해" }).click();
  await page.screenshot({ path: info.outputPath("journal-page1.png") });
  await expect(pages.getByRole("button", { name: /가설/ })).toHaveAttribute("aria-current", "step", { timeout: 5_000 });
  // back is there
  await write.getByRole("button", { name: "이전" }).click();
  await expect(pages.getByRole("button", { name: /종목과 차트/ })).toHaveAttribute("aria-current", "step");
  await write.getByRole("button", { name: "다음" }).click();
  // page 2: two lines and 아직 모르겠음, then on to the last page
  await write.getByPlaceholder(/^예: 다음 분기/).fill("메모리 가격이 오르면서 석 달 안에 주가가 오를 것 같다.");
  await write.getByPlaceholder(/^예: 지난 분기/).fill("재고가 줄었다는 공시를 봤다.");
  await write.getByRole("button", { name: "아직 모르겠음" }).click();
  await expect(pages.getByRole("button", { name: /기한과 확신/ })).toHaveAttribute("aria-current", "step", { timeout: 5_000 });
  await write.getByRole("group", { name: "기간" }).getByRole("button", { name: "3개월" }).click();
  await write.getByRole("button", { name: "일지 저장" }).click();
  // saved: the analysis opens right away
  await expect(book).toBeVisible({ timeout: 5_000 });
  await expect(book.getByRole("tab", { name: "분석" })).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: info.outputPath("journal-analysis.png") });
  expect(errors).toEqual([]);
});

test("the challenge: 게임 끝내기 asks once, then leaves without a record", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/?demo&weather=clear&game=08b8c477&gameSpeed=4&gameClock=0&gameTutorial=0");
  const ex = page.getByTestId("expedition");
  await expect(ex).toBeVisible({ timeout: 30_000 });
  await ex.getByRole("button", { name: /^시작/ }).click();
  await ex.getByRole("button", { name: "게임 끝내기" }).click();
  const ask = page.getByRole("dialog", { name: "게임 끝내기" });
  await expect(ask).toContainText("기록도 남기지 않아요");
  await ask.getByRole("button", { name: "계속하기" }).click();
  await expect(ask).toHaveCount(0);
  await ex.getByRole("button", { name: "게임 끝내기" }).click();
  await ask.getByRole("button", { name: "끝내기" }).click();
  await expect(ex).toHaveCount(0);
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").expeditions ?? []).length)).toBe(0);
  expect(errors).toEqual([]);
});

test("the 꽃집: buy tulips, plant them on open grass (not off the garden), they stand in the garden", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("rethink-garden-v1")!); s.currency = 60_000; localStorage.setItem("rethink-garden-v1", JSON.stringify(s)) });
  // (?demo would load the demo garden again; the plain address keeps this save)
  await page.goto("/proto3d?weather=clear");
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await V.moreSheet(page);
  await page.getByRole("dialog", { name: "더보기" }).getByRole("button", { name: /^꽃집/ }).click();
  const shop = page.getByRole("dialog", { name: "상점" });
  await shop.getByRole("tab", { name: "꽃" }).click();
  await shop.getByRole("button", { name: /^튤립/ }).click();
  await page.screenshot({ path: info.outputPath("shop.png") });
  await shop.getByRole("button", { name: /심을 곳 고르기/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "심을 풀밭을 눌러요" })).toBeVisible();
  const plantAt = (x: number, z: number) => page.evaluate(([x, z]) => (window as unknown as { __proto3d: { plantAt: (x: number, z: number) => string | null } }).__proto3d.plantAt(x, z), [x, z]);
  expect(await plantAt(0, 30.9)).toBe("정원 밖이에요");
  let ok: string | null = "none";
  for (const [x, z] of [[-6, 9], [-8, 12], [5, 14], [-12, -6], [10, -10], [-4, 14]]) { ok = await plantAt(x, z); if (ok === null) break; }
  expect(ok).toBeNull();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d: { decor?: number } }).__proto3d.decor ?? 0)).toBe(1);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!));
  expect(save.plants.length).toBe(1);
  expect(save.currency).toBe(52_000);// coins in 원 (core/won.ts WON)
  await page.waitForTimeout(1500);
  await page.screenshot({ path: info.outputPath("planted.png") });
  expect(errors).toEqual([]);
});

test("My Page is its own place: 보리 does not come over or talk while it is open, only after", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  // the stand-in server answers only when the test says so: 보리 is on its way while My Page opens
  await page.addInitScript(() => { const w = window as unknown as { __boriOpen: () => Promise<string>; __boriGo?: () => void };
    w.__boriOpen = () => new Promise(r => { w.__boriGo = () => r("잠깐 얘기할래?") }); });
  await page.goto("/proto3d?demo&bori&weather=clear");
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await V.myPage(page);
  // (since 2026-11-22 보리 does not even set out while My Page is open: Proto3D friendHere has !me)
  await page.waitForTimeout(6000);
  await expect(page.getByRole("dialog", { name: "보리와 대화" })).toHaveCount(0);
  await expect(page.locator('.rt-bubble[data-analyst="bori"]')).toHaveCount(0);
  await page.getByRole("dialog", { name: "내 프로필" }).getByRole("button", { name: "닫기" }).click();
  // closed: now 보리 comes over and talks
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __boriGo?: () => void }).__boriGo), { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => (window as unknown as { __boriGo: () => void }).__boriGo());
  await expect(page.getByRole("dialog", { name: "보리와 대화" })).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});
