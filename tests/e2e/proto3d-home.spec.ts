import { test, expect, type Page } from "./fixtures";

// The home screen cut down to one job (app/proto3d/ui/Home.tsx, docs/mockups/home.html): four tabs, one next step, the
// 일지 that only holds the journal, 더보기 for the rest, and the first-run tutorial (once, again from 설정).
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const step = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: { tutorial?: { step: number } | null } }).__proto3d?.tutorial?.step ?? 0);
const tut = (page: Page) => page.getByRole("dialog", { name: "튜토리얼" });

test("the first-run tutorial walks four steps, ends on the journal, and does not come back", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear&tutorial");
  await expect(tut(page)).toBeVisible({ timeout: 30_000 });
  await expect(tut(page)).toContainText("나무 하나가 종목 하나예요");
  // no buy/sell words, no price calls
  for (let i = 1; i <= 3; i++) {
    expect(await step(page)).toBe(i);
    await tut(page).getByRole("button", { name: "다음" }).click();
  }
  await expect(tut(page)).toContainText("판정돼요");
  await tut(page).getByRole("button", { name: "첫 일지 쓰기" }).click();
  await expect(page.getByRole("dialog", { name: "투자일지" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").tips)).toContain("tutorial");
  // (?demo would plant the example garden again; the saved garden opens as it is)
  await page.goto("/proto3d?weather=clear&tutorial");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(tut(page)).toHaveCount(0);
  // 설정 plays it again; 건너뛰기 closes it
  await page.getByRole("navigation", { name: "메뉴" }).getByRole("button", { name: /^더보기/ }).click();
  await page.getByRole("dialog", { name: "더보기" }).getByRole("button", { name: /^설정/ }).click();
  await page.getByRole("dialog", { name: "설정" }).getByRole("button", { name: "튜토리얼 다시 보기" }).click();
  await expect(tut(page)).toBeVisible();
  await tut(page).getByRole("button", { name: "건너뛰기" }).click();
  await expect(tut(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("home: four tabs, one next step, the journal only journals, the rest under 더보기", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  const nav = page.getByRole("navigation", { name: "메뉴" });
  await expect(nav).toBeVisible({ timeout: 30_000 });
  await expect(nav.getByRole("button")).toHaveCount(4);
  for (const t of ["정원", "일지", "챌린지", "더보기"]) await expect(nav.getByRole("button", { name: new RegExp("^" + t) })).toBeVisible();
  // the top holds only the weather and me
  await expect(page.getByRole("button", { name: /소리 (끄기|켜기)/ })).toHaveCount(0);
  await expect(page.getByLabel("내 숫자")).toHaveCount(0);
  // one bubble at a time
  await expect.poll(async () => page.locator(".rt-bubble").count()).toBeLessThanOrEqual(1);
  // the next step: grades come first
  const next = page.getByRole("region", { name: "다음 할 일" });
  await expect(next).toContainText("채점 결과 2건");
  await expect(next.getByRole("button", { name: /오늘 할 일 \d\/3/ })).toBeVisible();
  // 일지: what came back, what to write, what I wrote
  await nav.getByRole("button", { name: /^일지/ }).click();
  const j = page.getByRole("dialog", { name: "투자일지" });
  // (지기, docs/jigi.md) the old judgments' grades on top, then today's signals, then my journals by stock
  await expect(j).toContainText("이전 판단 채점 결과 2건");
  await expect(j).toContainText("분석가 신호");
  await expect(j).toContainText("종목별 일지");
  await expect(nav.getByRole("button", { name: /^일지/ })).toHaveAttribute("aria-pressed", "true");
  await j.getByRole("button", { name: /이전 판단 채점 결과/ }).click();
  // the grade opens on what I wrote 30 days ago
  const memo = page.getByRole("dialog", { name: /내 판단/ });
  await expect(memo).toContainText("POSCO홀딩스");
  await memo.getByRole("button", { name: "닫기" }).first().click();
  // 더보기: my numbers and everything else
  await nav.getByRole("button", { name: /^더보기/ }).click();
  const m = page.getByRole("dialog", { name: "더보기" });
  await expect(m.getByLabel("내 숫자")).toContainText("연속");
  for (const t of ["오늘의 케이스", "되감기", "내 프로필", "꾸미기", "리그", "다른 유저", "내 종목", "설정"]) await expect(m.getByRole("button", { name: new RegExp("^" + t) })).toBeVisible();
  await m.getByRole("button", { name: /^다른 유저/ }).click();
  await expect(page.getByTestId("sky")).toBeVisible();
  await page.getByTestId("sky").getByRole("button", { name: "닫기" }).click();
  // 정원 closes whatever is open
  await nav.getByRole("button", { name: /^일지/ }).click();
  await nav.getByRole("button", { name: /^정원/ }).click();
  await expect(page.getByRole("dialog", { name: "투자일지" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
