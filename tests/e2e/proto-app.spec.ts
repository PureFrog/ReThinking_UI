import { test, expect, type Page } from "./fixtures";

// The phone prototype (/app): one space per screen, a door asks before moving, the features sit on the tab bar,
// and a friend comes over and asks why a stock in loss was bought (every opening). Its save is its own.
test.describe.configure({ timeout: 90_000 });
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-proto-v1") ?? "{}"));
async function open(page: Page) {
  await page.goto("/app");
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible({ timeout: 30_000 });
}

test("a friend comes over and asks why; the reason becomes a journal page and a book", async ({ page }) => {
  await open(page);
  await expect(page.locator(".proto-books")).toHaveText("0권");
  const bubble = page.locator(".proto-bubble");
  await expect(bubble.getByRole("button", { name: "이유 말하기" })).toBeVisible({ timeout: 15_000 });
  await bubble.getByRole("button", { name: "이유 말하기" }).click();
  await page.getByRole("textbox", { name: "처음에 산 이유" }).fill("신제품 반응이 좋아서");
  await page.getByRole("button", { name: "들려주기" }).click();
  await expect(bubble).toContainText("신제품 반응이 좋아서");
  await expect(bubble).not.toContainText(/팔아|손절|매도/);
  await expect(page.locator(".proto-books")).toHaveText("1권");
  const s = await saved(page);
  expect(s.journal).toHaveLength(1);
  expect(s.journal[0].think).toBe("신제품 반응이 좋아서");
  expect(s.journal[0].asked).toBeTruthy();
});

test("the door asks first, then the farm shows the trees; a tree leads to its journal", async ({ page }) => {
  await open(page);
  await page.locator(".proto-bubble").getByRole("button", { name: "다음에 얘기하자" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "말풍선 닫기" }).click();
  await page.getByRole("button", { name: "밖으로" }).click();
  await expect(page.getByRole("dialog", { name: "이동하기" })).toContainText("밖으로 나갈까?");
  await page.getByRole("button", { name: "그만두기" }).click();
  await expect(page.locator(".proto-room-name")).toHaveText("거실");
  await page.getByRole("button", { name: "밖으로" }).click();
  await page.getByRole("button", { name: "나가기" }).click();
  await expect(page.locator(".proto-room-name")).toHaveText("농장");
  await expect(page.locator(".proto-tree")).toHaveCount(4);
  await page.getByRole("button", { name: "꽃빛뷰티 나무" }).click();
  await page.getByRole("dialog", { name: "꽃빛뷰티 나무" }).getByRole("button", { name: "일지 쓰기" }).click();
  await expect(page.getByRole("button", { name: "꽃빛뷰티" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("그래서 내 생각").fill("이유는 그대로");
  await page.getByRole("button", { name: "일지 남기기" }).click();
  await expect(page.locator(".proto-note")).toContainText("햇살 조각 1개");
  await expect(page.locator(".proto-list li").first()).toContainText("이유는 그대로");
});

test("the quiz tab: a book question and a news OX both count the day", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "퀴즈" }).click();
  await page.locator(".proto-answers button").first().click();
  await expect(page.locator(".proto-why")).toBeVisible();
  await page.getByRole("button", { name: /O · 맞다/ }).click();
  await expect(page.locator(".news-result")).toBeVisible();
  await expect(page.getByLabel(/퀴즈 연속 1일/)).toBeVisible();
  expect((await saved(page)).streak.count).toBe(1);
});
