import { test, expect, type Page } from "./fixtures";
import { clickWorld, iso } from "./helpers";

// ux-spec 5장 where sunlight pieces go: the peddler's cart by the mailbox. Today's few things, a press-and-hold buys
// one (11.1), it flies to the drawer (11.8), the same thing once a day, and a short purse says so.
test.describe.configure({ timeout: 90_000 });
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3") ?? "{}"));
const panel = (page: Page) => page.locator(".object-panel");
async function openCart(page: Page) {
  const c = iso(4, 10);
  for (let i = 0; i < 3; i++) {
    await clickWorld(page, c.x, c.y - 20);
    if (await panel(page).waitFor({ timeout: 10_000 }).then(() => true, () => false)) break;
  }
  await expect(panel(page).locator("h2")).toHaveText("오늘의 진열품");
}
async function seed(page: Page, sunlight: number) {
  await page.addInitScript(([s]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("little-garden-v3", JSON.stringify({ sunlight: s }));
  }, [sunlight] as const);
  await page.goto("/classic");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
}

test("5장 행상 수레: 꾹 눌러 사면 햇살 조각이 줄고 서랍으로 가며, 같은 건 하루 한 번", async ({ page }) => {
  await seed(page, 30);
  await openCart(page);
  const items = panel(page).locator(".cart-item");
  await expect(items).toHaveCount(3);
  const first = items.first();
  const name = (await first.locator("strong").textContent())!;
  const price = Number((await first.locator(".price").textContent())!.trim());
  // a click is not a purchase; holding is
  await first.getByRole("button", { name: "꾹 눌러 사기" }).click();
  expect((await saved(page)).sunlight).toBe(30);
  const buy = first.getByRole("button", { name: "꾹 눌러 사기" });
  const box = (await buy.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator(".sun-count")).toHaveText(`햇살 조각 ${30 - price}`);
  const s = await saved(page);
  const g = s.gifts.find((g: any) => g.sender === "cart" && g.item === name);
  expect(g).toBeTruthy();
  expect(s.claimed).toContain(g.id);
  // once a day
  await openCart(page);
  await expect(panel(page).locator(".cart-item").first()).toContainText("오늘은 샀어요");
});

test("5장 행상 수레: 햇살 조각이 모자라면 살 수 없다고 보여 준다", async ({ page }) => {
  await seed(page, 0);
  await openCart(page);
  await expect(panel(page).locator(".cart-item em").first()).toContainText("모자라요");
  await expect(panel(page).getByRole("button", { name: "꾹 눌러 사기" })).toHaveCount(0);
});
