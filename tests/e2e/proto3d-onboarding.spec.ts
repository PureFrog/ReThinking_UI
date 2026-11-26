import { test, expect, type Page } from "./fixtures";
import * as V from "./village";

// Onboarding (app/proto3d/ui/Onboarding.tsx): a new player lands on an empty garden and puts their holdings in, by a
// capture (mock reader: four example companies) or by typing; each holding becomes a tree on its own plot, and the
// analysts come in with the first trees, and a look-back judgment opens the first grade straight away. Later the track record opens the same list to edit.
test.describe.configure({ timeout: 180_000 });
type Hooks = { frames: number; trees: Record<number, { x: number; y: number }>; births?: { active: boolean; stage: string; long: boolean; n: number; ms: number } };
const births = async (page: Page) => (await hooks(page))?.births ?? null;
// W1: the planted holdings are born one after another; a tap anywhere skips to the end
// (a slow test machine may finish it first)
const skipBirth = async (page: Page) => { if ((await births(page))?.active) await page.getByRole("button", { name: "건너뛰기" }).click({ timeout: 4_000 }).catch(() => {}); await expect.poll(async () => (await births(page))?.active, { timeout: 10_000 }).toBe(false); };
const hooks = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: Hooks }).__proto3d ?? null);
const treeCount = async (page: Page) => Object.keys((await hooks(page))?.trees ?? {}).length;
const clean = (errors: string[]) => expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);

async function fresh(page: Page, errors: string[]) {
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()) });
  await page.goto("/proto3d?reset&weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await hooks(page))?.frames ?? 0, { timeout: 30_000 }).toBeGreaterThan(10);
}

test("a new player lands on an empty garden and types two holdings in", async ({ page }) => {
  const errors: string[] = [];
  await fresh(page, errors);
  const start = page.getByRole("dialog", { name: "내 종목 넣기" });
  await expect(start).toBeVisible();
  // nothing planted yet: no trees, no analysts, no menu
  expect(await treeCount(page)).toBe(0);
  await expect(page.locator(".rt-bubble")).toHaveCount(0);
  await expect(V.controls(page)).toBeHidden();

  await start.getByRole("button", { name: /직접 입력/ }).click();
  const list = page.getByRole("dialog", { name: "종목 확인" });
  await list.getByLabel("1번 종목 이름").fill("한빛전자");
  await list.getByLabel("한빛전자 수익률").fill("-31");
  await list.getByLabel("한빛전자 산 날짜").fill("2026-05-20");
  await list.getByRole("button", { name: "종목 추가" }).click();
  await list.getByLabel("2번 종목 이름").fill("나래식품");
  await list.getByLabel("나래식품 수익률").fill("6.5");
  await list.getByRole("button", { name: "정원에 넣기 · 2종목" }).click();

  await expect(page.getByRole("status")).toContainText("2종목을 정원에 넣었어요");
  await expect.poll(() => treeCount(page), { timeout: 30_000 }).toBe(2);
  // the long version plays to the end on its own (W1, under 8 seconds), then the look-back opens
  await expect.poll(async () => (await births(page))?.long, { timeout: 5_000 }).toBe(true);
  // the menus stay out of the way while it plays (a slow first run may already be past it)
  // checked in one go inside the page: while it plays there is no menu
  expect(await page.evaluate(() => !(window as unknown as { __proto3d: { births?: { active: boolean } } }).__proto3d.births?.active || !document.querySelector("nav.rt-dock"))).toBe(true);

  // the first verdict opens at once (지기, docs/jigi.md): a signal put 30 days back, a one-page practice journal as of
  // then (up or down over the month, why), buried, "30일 뒤", dug up with its verdict
  const look = page.getByRole("dialog", { name: "되돌아보기" });
  await expect(look).toContainText("30일 전", { timeout: 15_000 });
  expect((await births(page))?.stage).toBe("done");
  await expect(look).toContainText("그때 너라면");
  await expect(look.getByRole("article", { name: "루온 리서치 노트" })).toBeVisible();// F-Score is 루온's since 2026-11-22
  const form = look.getByRole("form", { name: "그때의 일지" });
  await expect(form.getByRole("button", { name: "기록하고 결과 보기" })).toBeDisabled();
  await form.getByRole("group", { name: "방향" }).getByRole("button", { name: "내릴" }).click();
  await form.getByRole("textbox", { name: "이유" }).fill("적자가 길어. 기준부터 다시.");
  await form.getByRole("group", { name: "확신" }).getByRole("button", { name: "높음" }).click();
  await form.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("lookback-form.png") });
  await form.getByRole("button", { name: "기록하고 결과 보기" }).click();
  await expect.poll(async () => ((await hooks(page)) as unknown as { capsuleFx?: { kind: string } | null })?.capsuleFx?.kind, { timeout: 10_000 }).toBe("bury");
  const result = page.getByRole("dialog", { name: "가설 판정" });
  await expect(result).toContainText("한빛전자 주가가 한 달 안에 내릴 것이다", { timeout: 20_000 });
  await expect(result.getByRole("status")).toContainText(/적중|빗나감/);
  await expect(result).toContainText("연습");
  await page.screenshot({ path: test.info().outputPath("lookback-verdict.png") });
  await expect(result).not.toContainText(/팔아|사라|매수하세요|오를 거야/);
  await result.getByRole("button", { name: "닫기" }).last().click();
  await expect(result).toBeHidden();
  // kept as a practice journal, out of the statistics
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").journals ?? []).filter((j: { practice?: boolean }) => j.practice).length)).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").judgments.length)).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").currency)).toBeGreaterThan(0);
  await expect(V.controls(page)).toBeVisible();
  // a heavy loss is flagged: the notebook has it (the analysts' bubbles left the village on 2026-11-22)
  await V.journal(page);
  await expect(page.getByRole("dialog", { name: "투자일지" })).toContainText("한빛전자");
  await page.getByRole("dialog", { name: "투자일지" }).getByRole("button", { name: "닫기" }).first().click();

  // the garden is saved: back without ?reset, the two trees are still there and no onboarding
  await page.goto("/proto3d?weather=clear");
  await expect.poll(() => treeCount(page), { timeout: 30_000 }).toBe(2);
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeHidden();
  await expect(page.getByRole("dialog", { name: "되돌아보기" })).toBeHidden(); // once only
  clean(errors);
});

test("a capture fills the list (mock reader), and the track record edits it later", async ({ page }) => {
  const errors: string[] = [];
  await fresh(page, errors);
  const start = page.getByRole("dialog", { name: "내 종목 넣기" });
  await start.getByLabel("캡처 파일").setInputFiles({ name: "capture.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  const list = page.getByRole("dialog", { name: "종목 확인" });
  await expect(list.getByLabel("1번 종목 이름")).toHaveValue("클래시스", { timeout: 5_000 });
  await expect(list.getByLabel(/번 종목 이름$/)).toHaveCount(4);
  // drop one before planting
  await list.getByRole("button", { name: "하림 빼기" }).click();
  await list.getByRole("button", { name: "정원에 넣기 · 3종목" }).click();
  await expect.poll(() => treeCount(page), { timeout: 30_000 }).toBe(3);
  await skipBirth(page);
  // the look-back can be passed over, and does not come back
  await page.getByRole("dialog", { name: "되돌아보기" }).getByRole("button", { name: "닫기" }).first().click();
  await expect(page.getByRole("dialog", { name: "되돌아보기" })).toBeHidden();

  // later: 더보기 → 내 종목 → change a rate, take one out, add one
  await V.moreSheet(page);
  await page.getByRole("dialog", { name: "더보기" }).getByRole("button", { name: /^내 종목/ }).click();
  const edit = page.getByRole("dialog", { name: "종목 확인" });
  await expect(edit.getByLabel("클래시스 산 날짜")).toHaveCount(0); // a planted tree keeps its age
  await edit.getByLabel("클래시스 수익률").fill("-9");
  await edit.getByRole("button", { name: "네오위즈 빼기" }).click();
  await edit.getByRole("button", { name: "종목 추가" }).click();
  await edit.getByLabel("4번 종목 이름").fill("구름페이");
  await edit.getByRole("button", { name: "반영" }).click();
  await expect(page.locator(".rt-toast")).toContainText("3종목");
  // a tree added later only gets the short version
  await expect.poll(async () => (await births(page))?.n, { timeout: 5_000 }).toBe(1);
  expect((await births(page))?.long).toBe(false);
  await expect.poll(async () => (await births(page))?.active, { timeout: 5_000 }).toBe(false);
  await expect.poll(() => treeCount(page), { timeout: 30_000 }).toBe(3);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!).holdings as { name: string; rate: number }[]);
  expect(saved.map(h => h.name).sort()).toEqual(["구름페이", "에이치엘비", "클래시스"]);
  expect(saved.find(h => h.name === "클래시스")!.rate).toBe(-9);
  clean(errors);
});

test("the demo garden is one tap away", async ({ page }) => {
  const errors: string[] = [];
  await fresh(page, errors);
  await page.getByRole("dialog", { name: "내 종목 넣기" }).getByRole("button", { name: "예시 정원으로 시작" }).click();
  await expect.poll(() => treeCount(page), { timeout: 30_000 }).toBe(7);
  await skipBirth(page);
  // (the next-step card is gone since 2026-11-22: the notebook's top row says the grades are in)
  await V.journal(page);
  await expect(page.getByRole("dialog", { name: "투자일지" })).toContainText("이전 판단 채점 결과 2건");
  clean(errors);
});

test("my holdings are born into the garden: each card flies to its plot, then a tap skips the rest", async ({ page }) => {
  const errors: string[] = [];
  await fresh(page, errors);
  const start = page.getByRole("dialog", { name: "내 종목 넣기" });
  await start.getByLabel("캡처 파일").setInputFiles({ name: "capture.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  const list = page.getByRole("dialog", { name: "종목 확인" });
  await expect(list.getByLabel(/번 종목 이름$/)).toHaveCount(4, { timeout: 5_000 });
  await list.getByRole("button", { name: "정원에 넣기 · 4종목" }).click();
  // the first time is the long one: a card per holding with its name and return (checked first: a slow machine is slow)
  await expect(page.locator(".rt-birth-card")).toHaveCount(4);
  await expect(page.locator(".rt-birth-card").filter({ hasText: "클래시스" })).toContainText("%");
  expect(await births(page)).toMatchObject({ long: true, n: 4 });
  await skipBirth(page);
  await expect(page.locator(".rt-birth-card")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "되돌아보기" })).toBeVisible();
  // the long one was seen: saved, so it is not played long again
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1")!).seen.birth)).toBe(1);
  clean(errors);
});
