import { test, expect, type Page } from "@playwright/test";
import { openGarden, clickWorld, iso, enterHouse, openDrawer } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const data = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const panel = (page: Page) => page.locator(".object-panel");

// 새봄반도체 grows on plot 1, cell (9,11); its branches are about 60px above the cell
async function openTreeMenu(page: Page) {
  const p = iso(9, 11);
  await clickWorld(page, p.x, p.y - 60);
  await expect(page.locator(".tree-menu")).toBeVisible({ timeout: 15_000 });
}

test("13.7-7 물 주기 = 그 종목 투자 일지: 물뿌리개와 함께 일지가 열리고, 남기면 나무가 반응하고 햇살 조각은 하루 한 번", async ({ page }) => {
  await openGarden(page);
  await openTreeMenu(page);
  await page.locator(".tree-menu").getByRole("button", { name: /물 주기/ }).click();
  await expect(panel(page)).toBeVisible({ timeout: 20_000 });
  await expect(panel(page)).toHaveAttribute("data-skin", "notebook");
  await expect(panel(page).locator("h2")).toHaveText("새봄반도체 일지");
  await expect(panel(page).locator(".journal-prompt")).not.toBeEmpty();
  // an empty page is not kept
  await page.getByRole("button", { name: "일지 남기고 물 주기" }).click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByLabel(/오늘 새봄반도체에서 본 것/).fill("고객사 계약 연장 소식");
  await panel(page).locator(".mood-stickers label", { hasText: "궁금" }).click();
  await page.getByRole("button", { name: "일지 남기고 물 주기" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect.poll(() => data(page, "lastCare"), { timeout: 5_000 }).toBe("water:done:reward");
  await expect(page.locator(".sun-count")).toHaveText("햇살 조각 1");
  await expect(page.locator(".thought-bubble")).toContainText("햇살 조각");
  // the same day again: the page is kept, no second sunlight piece; the last page shows under the form
  await openTreeMenu(page);
  await page.locator(".tree-menu").getByRole("button", { name: /물 주기/ }).click();
  await expect(panel(page).locator(".journal-past")).toContainText("고객사 계약 연장 소식", { timeout: 20_000 });
  await panel(page).getByLabel("그래서 내 생각").fill("이유는 그대로");
  await page.getByRole("button", { name: "일지 남기고 물 주기" }).click();
  await expect.poll(() => data(page, "lastCare"), { timeout: 5_000 }).toBe("water:done:none");
  await expect(page.locator(".sun-count")).toHaveText("햇살 조각 1");
});

test("13.7-8 비료 주기 = 뉴스 OX 퀴즈: 뉴스 문장에 '이게 맞을까?'로 답하면 실제 소식과 왜 중요한지가 나온다", async ({ page }) => {
  await openGarden(page);
  await openTreeMenu(page);
  await page.locator(".tree-menu").getByRole("button", { name: /비료 주기/ }).click();
  await expect(panel(page)).toBeVisible({ timeout: 20_000 });
  await expect(panel(page).locator("h2")).toHaveText("새봄반도체 소식");
  const statement = (await panel(page).locator(".news-statement").innerText()).trim();
  expect(statement).toContain("새봄반도체");
  expect(statement).not.toMatch(/정보가 있|사실일까/);
  await expect(panel(page).locator(".news-ask")).toHaveText("이게 맞을까?");
  await expect(panel(page).locator(".demo-note")).toContainText("모의 뉴스");
  await expect(page.getByRole("button", { name: "확인" })).toHaveCount(0);
  await panel(page).getByRole("button", { name: /O · 맞다/ }).click();
  const result = panel(page).locator(".news-result");
  await expect(result).toContainText("실제 소식");
  await expect(result).toContainText("왜 중요해");
  const right = (await result.getAttribute("class"))!.includes("right");
  // as written it was true exactly when the statement is the real news
  expect(right).toBe((await result.innerText()).includes(statement));
  await page.getByRole("button", { name: "확인" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect.poll(() => data(page, "lastCare"), { timeout: 5_000 }).toBe(right ? "feed:done:reward" : "feed:missed:none");
  await expect(page.locator(".sun-count")).toHaveText(right ? "햇살 조각 1" : "햇살 조각 0");
});

async function writeJournal(page: Page, text: string) {
  await openTreeMenu(page);
  await page.locator(".tree-menu").getByRole("button", { name: /물 주기/ }).click();
  await expect(panel(page)).toBeVisible({ timeout: 20_000 });
  await panel(page).getByLabel(/본 것/).fill(text);
  await page.getByRole("button", { name: "일지 남기고 물 주기" }).click();
  await expect(panel(page)).toHaveCount(0);
}

test("12.2 벽 달력: 일지를 쓴 날에 스티커가 붙고, 눌러 열면 이번 주 몇 일인지 보인다", async ({ page }) => {
  await openGarden(page);
  await writeJournal(page, "오늘 본 것");
  await expect.poll(() => data(page, "stickers"), { timeout: 5_000 }).toBe("1");
  await enterHouse(page);
  const wall = iso(1.73, -0.5);
  await clickWorld(page, wall.x, wall.y - 15 - 143);
  await expect(panel(page)).toBeVisible({ timeout: 20_000 });
  await expect(panel(page).locator("h2")).toContainText("월의 일지");
  await expect(panel(page).locator(".week-goal")).toContainText("이번 주 1/4일");
  await expect(panel(page).locator("td.today .sticker")).toBeVisible();
});

test("12.3 책장의 퀴즈 책: 틀리면 책갈피, 다 맞히면 책등이 금박, 새로 맞히면 햇살 조각", async ({ page }) => {
  await openGarden(page);
  await clickWorld(page, 850, 250);
  await expect(panel(page)).toHaveAttribute("data-skin", "book", { timeout: 15_000 });
  const first = panel(page).locator(".spine").first();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  // 재무제표 읽기 1: '아니다' is right, 2: '맞다', 3: '맞다' — miss the first page once
  await panel(page).getByRole("button", { name: "그렇다" }).click();
  await expect(panel(page).locator(".answer-note")).toContainText("책갈피");
  await expect(first.locator(".bookmark")).toBeVisible();
  await page.getByRole("button", { name: "다음 페이지" }).click();
  for (const pick of ["맞다", "맞다"]) {
    await panel(page).getByRole("button", { name: pick, exact: true }).click();
    await expect(panel(page).locator(".answer-note")).toContainText("맞아요");
    await page.getByRole("button", { name: "다음 페이지" }).click();
  }
  // the bookmarked page comes back; answering it right finishes the book
  await expect(panel(page).locator(".question")).toContainText("매출이 늘었다면");
  await panel(page).getByRole("button", { name: "아니다" }).click();
  await expect(first).toHaveClass(/gold/);
  await expect(first.locator(".bookmark")).toHaveCount(0);
  await expect(page.locator(".sun-count")).toHaveText("햇살 조각 3");
});

test("12.5 첫 일지를 쓰면 다음에 놀러 온 친구가 '첫 일지 액자'를 들고 오고, 추억 앨범에 남는다", async ({ page }) => {
  await openGarden(page);
  await writeJournal(page, "첫 일지");
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name: /모아/ }).click();
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 20_000 });
  await enterHouse(page);
  await clickWorld(page, 657, 491);
  await expect(page.locator(".gift-card")).toContainText("첫 일지 액자", { timeout: 15_000 });
  await page.locator(".gift-card").click();
  await openDrawer(page);
  await page.locator(".tabs").getByRole("button", { name: "추억 앨범" }).click();
  await expect(panel(page).locator(".album-card.got")).toContainText("첫 일지 액자");
  await expect(panel(page).locator(".album-card:not(.got)").first()).toContainText("???");
});

test("12.2 한 주에 4일 일지를 채우면 벽 달력에 리본이 걸리고, 친구가 와서 한 번 축하한다", async ({ page }) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const day = (i: number) => { const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
  const journal = [0, 1, 2, 3].map(i => ({ id: "w" + i, holdingId: 1, name: "새봄반도체", day: day(i), saw: "", think: "", mood: "calm" }));
  await page.addInitScript(([s, key]) => {
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
  }, [{ journal }, "little-garden-v3"] as const);
  await openGarden(page);
  const flag = (k: string) => page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", k);
  await expect.poll(() => flag("weekRibbon"), { timeout: 10_000 }).toBe("1");
  await expect.poll(() => flag("cheeredBy"), { timeout: 40_000 }).not.toBe("");
  await expect(page.locator(".ambient-bubble")).toContainText(/리본/, { timeout: 15_000 });
  await expect.poll(() => flag("cheer")).toBe("");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!).cheered)).toEqual([day(0)]);
});

test("12.5 퀴즈 책 세 권이 금박이면 거실 책장이 한 단 높은 큰 책장으로 바뀐다", async ({ page }) => {
  const gold = { right: [0, 1, 2], marks: [] };
  await page.addInitScript(([s, key]) => {
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
  }, [{ quiz: { books: { statements: gold, disclosure: gold }, daily: { day: "", paid: 0 } } }, "little-garden-v3"] as const);
  await openGarden(page);
  const shelf = () => page.locator(".game canvas").evaluate(c => (c as HTMLCanvasElement).dataset.shelf ?? "");
  await page.waitForTimeout(1_000);
  expect(await shelf(), "two gold books keep the old bookcase").toBe("");
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("little-garden-v3")!); s.quiz.books.loss = { right: [0, 1, 2], marks: [] }; localStorage.setItem("little-garden-v3", JSON.stringify(s)) });
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(shelf, { timeout: 10_000 }).toBe("big");
});
