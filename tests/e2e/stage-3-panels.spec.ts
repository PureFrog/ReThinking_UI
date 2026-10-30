import { test, expect, type Page } from "@playwright/test";
import { clickWorld, openGarden, openDrawer } from "./helpers";

// 3단계: 사물 패널 공통 틀 (11.6) + 사물마다 그 사물을 연 느낌 (11.16-5).
const panel = (page: Page) => page.locator(".object-panel");
async function openAt(page: Page, x: number, y: number) {
  await clickWorld(page, x, y);
  await expect(panel(page)).toBeVisible({ timeout: 10_000 });
}

test("11.6-2 공통 틀: 머리줄(그림·이름·제목·X), 탭은 머리줄 아래, 서랍 질감", async ({ page }) => {
  await openGarden(page);
  await openDrawer(page);
  const p = panel(page);
  await expect(p).toHaveAttribute("data-skin", "drawer");
  await expect(p.locator(".panel-head small")).toHaveText("나무 서랍");
  await expect(p.locator(".panel-head h2")).toHaveText("작은 물건들을 모아둔 곳");
  await expect(p.locator(".panel-head .obj-art")).toBeVisible();
  await expect(p.locator(".panel-tabs button")).toHaveCount(4);
  const box = (await p.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(641);
  expect(box.width).toBeLessThanOrEqual(561);
});

test("11.16-5 사물마다 다른 모습: 책장=펼친 책, 기록장=공책, 우편함=편지 묶음", async ({ page }) => {
  await openGarden(page);
  // the first-visit thought cloud sits over the bookcase; the press must still reach the bookcase
  await expect(page.locator(".thought-bubble")).toBeVisible({ timeout: 8_000 });
  await openAt(page, 740, 250); // 책장
  await expect(page.locator(".thought-bubble")).toHaveCount(0);
  await expect(panel(page)).toHaveAttribute("data-skin", "book");
  await expect(panel(page).locator(".question.page-left")).toBeVisible();
  await expect(panel(page).locator(".page-right .answer")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);

  await openAt(page, 805, 312);
  await expect(panel(page)).toHaveAttribute("data-skin", "notebook");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);

  await openAt(page, 485, 527);
  await expect(panel(page)).toHaveAttribute("data-skin", "letters");
  await expect(panel(page).locator(".friend-invite")).toHaveCount(3);
});

test("11.6-3 닫는 법: X, 어두운 배경 클릭, Esc", async ({ page }) => {
  await openGarden(page);
  await openDrawer(page);
  await panel(page).locator(".panel-close").click();
  await expect(panel(page)).toHaveCount(0);
  await openDrawer(page);
  await page.locator(".overlay").click({ position: { x: 5, y: 5 } });
  await expect(panel(page)).toHaveCount(0);
  await openDrawer(page);
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
});

test("11.6-3 작성 중이면 바로 닫지 않고 바닥줄에 한 줄로 묻는다", async ({ page }) => {
  await openGarden(page);
  await openAt(page, 356, 488); // 씨앗박스
  await panel(page).locator(".furniture-grid button:not(:disabled)").first().click();
  await panel(page).locator('input[name="price"]').fill("51000");
  await page.keyboard.press("Escape"); // leaves the input
  await page.keyboard.press("Escape");
  const foot = panel(page).locator(".draft-footer");
  await expect(foot).toContainText("작성 중인 내용이 있어. 닫을까?");
  await foot.getByRole("button", { name: "계속 쓰기" }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('input[name="price"]')).toHaveValue("51000");
  await page.keyboard.press("Escape");
  await panel(page).locator(".draft-footer").getByRole("button", { name: "닫기" }).click();
  await expect(panel(page)).toHaveCount(0);
});

test("11.6-1 걸어가는 도중 다른 곳을 누르면 패널을 열지 않는다", async ({ page }) => {
  await openGarden(page);
  await clickWorld(page, 485, 527); // 우편함 (멀다)
  await page.waitForTimeout(150);
  await clickWorld(page, 700, 437); // 바닥
  await page.waitForTimeout(3500);
  await expect(panel(page)).toHaveCount(0);
});

test("11.6-5 빈 상태: 친구 그림과 다음 행동 안내", async ({ page }) => {
  await openGarden(page);
  await openAt(page, 805, 312);
  await panel(page).locator(".panel-tabs").getByRole("button", { name: "나눈 이야기" }).click();
  const empty = panel(page).locator(".empty-state");
  await expect(empty.locator(".portrait")).toBeVisible();
  await expect(empty).toContainText("놀러 온 친구에게");
});

test("11.6-2 모바일은 아래에서 올라오는 시트", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  await openGarden(page);
  await openDrawer(page);
  await page.waitForTimeout(400);
  const box = (await panel(page).boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(Math.abs(box.y + box.height - vh)).toBeLessThan(2);
  expect(box.height).toBeLessThanOrEqual(vh * 0.9 + 1);
});
