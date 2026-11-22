import { test, expect, type Page } from "./fixtures";

// The phone prototype (/app): one space per screen, pressing a door moves (its label says where), the features sit on the tab bar,
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
  await expect(page.locator(".proto-book")).toHaveCount(1);
  // the wall calendar marks today as a journal day
  await page.getByRole("button", { name: /벽 달력/ }).click();
  await expect(page.getByRole("dialog", { name: "달력" }).locator(".d.today")).toHaveAttribute("aria-label", /일지/);
  const s = await saved(page);
  expect(s.journal).toHaveLength(1);
  expect(s.journal[0].think).toBe("신제품 반응이 좋아서");
  expect(s.journal[0].asked).toBeTruthy();
});

test("pressing the door goes straight out, then the farm shows the trees; a tree leads to its journal", async ({ page }) => {
  await open(page);
  await page.locator(".proto-bubble").getByRole("button", { name: "다음에 얘기하자" }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: "말풍선 닫기" }).click();
  await page.getByRole("button", { name: "밖으로 나가기" }).click();
  await expect(page.locator(".proto-room-name")).toHaveText("농장");
  await expect(page.locator(".proto-tree")).toHaveCount(4);
  await page.getByRole("button", { name: "카카오 나무" }).click();
  await page.getByRole("dialog", { name: "카카오 나무" }).getByRole("button", { name: "일지 쓰기" }).click();
  await expect(page.getByRole("button", { name: "카카오" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("그래서 내 생각").fill("이유는 그대로");
  await page.getByRole("button", { name: "일지 남기기" }).click();
  await expect(page.locator(".proto-note")).toContainText("햇살 조각 1개");
  await expect(page.locator(".proto-list li").first()).toContainText("이유는 그대로");
});

test("the quiz tab: a book question and a news OX both count the day", async ({ page }) => {
  await open(page);
  // the tab may be pressed before the page is ready: press again until the quiz shows
  await expect(async () => {
    await page.getByRole("button", { name: "퀴즈" }).click();
    await expect(page.locator(".proto-answers button").first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await page.locator(".proto-answers button").first().click();
  await expect(page.locator(".proto-why")).toBeVisible();
  await page.getByRole("button", { name: /O · 맞다/ }).click();
  await expect(page.locator(".news-result")).toBeVisible();
  await expect(page.getByLabel(/퀴즈 연속 1일/)).toBeVisible();
  expect((await saved(page)).streak.count).toBe(1);
  expect((await saved(page)).quizDays).toHaveLength(1);
});
