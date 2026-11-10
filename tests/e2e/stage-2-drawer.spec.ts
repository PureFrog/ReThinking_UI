import { test, expect } from "./fixtures";
import { openGarden, pickWelcomeGift, openDrawer, clickWorld, enterHouse } from "./helpers";

test.describe.configure({ timeout: 90_000 });

test("11.8-② 선물상자를 주우면 패널 없이 머리 위에서 열리고, 획득 카드 뒤 서랍으로 날아간다", async ({ page }) => {
  await openGarden(page);
  await pickWelcomeGift(page);
  await expect(page.locator(".object-panel")).toHaveCount(0);
  const card = page.locator(".gift-card");
  await expect(card).toContainText("포근한 담요");
  await expect(card).toContainText("누군가 두고 갔어");
  await expect(card.getByRole("button", { name: "바로 놓기" })).toBeVisible();
  await expect(page.locator(".gift-pop .item-icon")).toBeVisible();
  await card.click();
  await expect(card).toHaveCount(0);
  await expect(page.locator(".fly-item")).toBeVisible();
  await expect(page.locator(".fly-item")).toHaveCount(0, { timeout: 2_000 });
});

test("11.8-③ 보유함: 모든 칸에 그림, 필터 탭, 상세 영역, 새 물건 표시 (11.16-2)", async ({ page }) => {
  await openGarden(page);
  await pickWelcomeGift(page);
  await page.locator(".gift-card").click();
  await openDrawer(page);
  const cells = page.locator(".item-cell");
  await expect(cells).toHaveCount(3);
  for (const cell of await cells.all()) await expect(cell.locator(".item-icon")).toBeVisible();
  await expect(cells.filter({ hasText: "포근한 담요" }).locator(".badge.fresh")).toBeVisible();

  await page.getByRole("tab", { name: "가구" }).click();
  await expect(cells).toHaveCount(1);
  const detail = page.locator(".item-detail");
  await expect(detail).toContainText("받은 날");
  await expect(detail).toContainText("그냥… 필요할 것 같아서.");
  await expect(detail).toContainText("친구가 준 거라 간직할래");
  await expect(detail.getByRole("button", { name: "꺼내서 놓기" })).toBeVisible();
});

test("11.8·11.16-3 옷장: 누르면 미리보기에만 입혀지고, '입기'를 눌러야 확정된다", async ({ page }) => {
  await openGarden(page);
  await openDrawer(page);
  await page.locator(".tabs").getByRole("button", { name: "옷장" }).click();
  const hat = page.locator(".slot-list li").filter({ hasText: "모자" });
  const wear = page.getByRole("button", { name: "입기", exact: true });
  await expect(wear).toBeDisabled();

  await page.locator(".item-cell", { hasText: "꽃 장식" }).click();
  await expect(hat).toContainText("꽃 장식");
  await expect(wear).toBeEnabled();
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(hat).toContainText("비어 있음");

  // 미리보기만 하고 닫으면 아무것도 바뀌지 않는다.
  await page.locator(".item-cell", { hasText: "산책 목도리" }).click();
  await page.getByRole("button", { name: "창 닫기" }).click();
  await openDrawer(page);
  await page.locator(".tabs").getByRole("button", { name: "옷장" }).click();
  await expect(page.locator(".slot-list li").filter({ hasText: "목" })).toContainText("비어 있음");

  await page.locator(".item-cell", { hasText: "꽃 장식" }).click();
  await wear.click();
  await expect(page.locator(".item-cell", { hasText: "꽃 장식" }).locator(".badge")).toHaveText("입는 중");
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await openDrawer(page);
  await page.locator(".tabs").getByRole("button", { name: "옷장" }).click();
  await expect(hat).toContainText("꽃 장식");
});

test("11.1·11.8-④ 사탕은 0.6초 꾹 눌러야 먹고, 먹으면 서랍에서 사라진다", async ({ page }) => {
  await openGarden(page);
  // 모아를 부르면 문 앞 (6,7)에 위로 사탕 상자를 두고 간다.
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name: /모아/ }).click();
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
  // the box lies just inside the door, out of sight from the yard
  await enterHouse(page);
  await clickWorld(page, 657, 491);
  await expect(page.locator(".gift-card")).toContainText("위로 사탕", { timeout: 10_000 });
  await page.locator(".gift-card").click();
  await openDrawer(page);
  await page.getByRole("tab", { name: "소모품" }).click();
  const eat = page.getByRole("button", { name: "꾹 눌러 먹기" });
  await eat.scrollIntoViewIfNeeded();
  const box = (await eat.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(page.locator(".object-panel")).toBeVisible();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.locator(".object-panel")).toHaveCount(0);
  await expect(page.locator(".thought-bubble")).toContainText("달콤하다");
  await openDrawer(page);
  await expect(page.locator(".item-cell", { hasText: "위로 사탕" })).toHaveCount(0);
});
