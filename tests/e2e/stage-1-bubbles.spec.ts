import { test, expect } from "@playwright/test";
import { openGarden, inviteMoa, startTalk, advanceUntilChoices } from "./helpers";

test.describe.configure({ timeout: 90_000 });

test("11.16-1 조작 안내는 처음 한 번만 생각 풍선으로 뜨고, 다시 열면 안 뜬다", async ({ page }) => {
  await openGarden(page);
  await expect(page.locator(".thought-bubble")).toContainText("바닥을 누르면", { timeout: 5_000 });
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(2_500);
  await expect(page.locator(".thought-bubble")).toHaveCount(0);
});

test("11.3 생각 풍선은 누르면 바로 닫힌다", async ({ page }) => {
  await openGarden(page);
  const thought = page.locator(".thought-bubble");
  await expect(thought).toBeVisible({ timeout: 5_000 });
  await thought.locator(".typed-dialogue").click();
  await expect(thought).toHaveCount(0, { timeout: 1_000 });
});

test("11.3 앰비언트 말풍선: 이름표, 자동으로 닫힘, 놓친 말 아이콘으로 대화 이어가기", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  const ambient = page.locator(".ambient-bubble");
  await expect(ambient.locator(".name-tag")).toHaveText("모아");
  // 33자 인사 → 타이핑 약 1.6초 + 유지 약 4.3초. 누르지 않으면 스스로 닫힌다.
  await expect(ambient).toHaveCount(0, { timeout: 12_000 });
  const dots = page.locator(".missed-dots");
  await expect(dots).toBeVisible();
  await dots.click();
  await expect(page.locator(".formal-bubble")).toContainText("잠깐 놀러 왔어", { timeout: 10_000 });
});

test("11.4 선택지: 하나씩 등장, 최대 4개, 마지막은 '다음에 얘기하자', 숫자키, Esc는 작별 한 줄", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await startTalk(page);
  const choices = page.locator(".dialogue-choices > button");
  await advanceUntilChoices(page, 3);
  await expect(choices.nth(1)).toHaveCSS("animation-delay", "0.12s");
  await expect(choices.last()).toContainText("다음에 얘기하자");
  // 말풍선을 눌러도 안내 문구는 뜨지 않는다 (11.16-1).
  await expect(page.getByText("한 번에 읽어요")).toHaveCount(0);

  await page.keyboard.press("2");
  await advanceUntilChoices(page, 4);
  await expect(choices.last()).toContainText("다음에 얘기하자");

  await page.keyboard.press("Escape");
  await expect(page.locator(".formal-bubble")).toHaveCount(0);
  await expect(page.locator(".ambient-bubble")).toContainText("또 얘기하자");
});

test("11.4-4 메모 카드: 빈 칸은 못 보냄, Esc는 입력창만 닫음, Enter로 보냄", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await startTalk(page);
  await advanceUntilChoices(page, 3);
  await page.keyboard.press("2");
  await advanceUntilChoices(page, 4);

  const memo = page.locator(".memo-card");
  await page.getByRole("button", { name: /내 생각 말하기/ }).click();
  await expect(memo.locator("textarea")).toBeFocused();
  await expect(memo.getByRole("button", { name: "말하기" })).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(memo).toHaveCount(0);
  await expect(page.locator(".formal-bubble")).toBeVisible();
  await expect(page.locator(".dialogue-choices > button")).toHaveCount(4);

  await page.getByRole("button", { name: /내 생각 말하기/ }).click();
  await page.keyboard.type("신규 계약이 있어");
  await page.keyboard.press("Enter");
  await expect(memo).toHaveCount(0);
  await expect(page.locator(".formal-bubble")).toContainText("대체 매출");
});
