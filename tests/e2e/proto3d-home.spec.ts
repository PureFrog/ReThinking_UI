import { test, expect } from "./fixtures";
import * as V from "./village";

// The village home (나현 2026-11-22, PM 집·마을 시나리오). The old four-tab dock, the next-step card and the four-step
// tutorial are gone: the first run is the walk through the village (walk.spec.ts). What the home still holds: the
// weather and today's quests top left, coins and settings top right, the map and the notebook over the garden; the
// journal still opens on what came back, what to write and what I wrote. The old 더보기 list has no door in the village
// yet (opened here through the e2e hook) but every item in it still works.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

test("home: no dock, the corner buttons, today's quests, the notebook, and the old 더보기 list still whole", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  await V.villageReady(page);
  await expect(page.locator(".rt-dock")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "다음 할 일" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "튜토리얼" })).toHaveCount(0);
  // the corners: weather and quests, coins and settings; no sound button up top
  await expect(page.getByLabel("오늘 시장 날씨")).toBeVisible();
  await page.getByRole("group", { name: "오늘 퀘스트" }).locator(".rt-quests-h").click();
  await expect(page.getByRole("group", { name: "오늘 퀘스트" }).locator(".rt-quest")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^코인 .* · 충전$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "설정" })).toBeVisible();
  await expect(page.getByRole("button", { name: /소리 (끄기|켜기)/ })).toHaveCount(0);
  // one bubble at a time
  await expect.poll(async () => page.locator(".rt-bubble").count()).toBeLessThanOrEqual(1);
  // the notebook: what came back, what to write, what I wrote
  // 피드백 2026-11-26: no 수첩 button on the screen (the journal is the library's)
  await expect(page.getByRole("button", { name: "수첩 펼치기" })).toHaveCount(0);
  await V.journal(page);
  const j = page.getByRole("dialog", { name: "투자일지" });
  // (지기, docs/jigi.md) the old judgments' grades on top, then today's signals, then my journals by stock
  await expect(j).toContainText("이전 판단 채점 결과 2건");
  await expect(j).toContainText("분석가 신호");
  await expect(j).toContainText("종목별 일지");
  await expect(page.getByRole("button", { name: "수첩 펼치기" })).toHaveCount(0);
  await j.getByRole("button", { name: /이전 판단 채점 결과/ }).click();
  // the grade opens on what I wrote 30 days ago
  const memo = page.getByRole("dialog", { name: /내 판단/ });
  await expect(memo).toContainText("POSCO홀딩스");
  await memo.getByRole("button", { name: "닫기" }).first().click();
  await V.garden(page);
  // the old 더보기 list: my numbers and everything else
  const m = await V.moreSheet(page);
  await expect(m.getByLabel("내 숫자")).toContainText("연속");
  for (const t of ["오늘의 케이스", "되감기", "내 프로필", "꾸미기", "리그", "다른 유저", "내 종목", "설정"]) await expect(m.getByRole("button", { name: new RegExp("^" + t) })).toBeVisible();
  await m.getByRole("button", { name: /^다른 유저/ }).click();
  await expect(page.getByTestId("sky")).toBeVisible();
  await page.getByTestId("sky").getByRole("button", { name: "닫기" }).click({ timeout: 30_000 });
  await V.villageReady(page);
  expect(errors).toEqual([]);
});
