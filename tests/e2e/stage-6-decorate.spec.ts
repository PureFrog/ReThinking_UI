import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld, openDrawer, enterHouse, iso } from "./helpers";

test.describe.configure({ timeout: 150_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const seed = (page: Page, state: object) => page.addInitScript(([s, key]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
}, [state, "little-garden-v3"] as const);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!));
const lamp = { id: 100, name: "작은 별 조명", color: 0xd7b4a7, x: 3, y: 5 };
const base = { guides: ["move", "place", "placed"], decor: [lamp], gifts: [{ id: "g-lamp", sender: "luon", anonymous: true, item: "작은 별 조명", x: 0, y: 0 }], claimed: ["g-lamp"], seen: ["g-lamp"] };
// a cell's middle, a little up so the press lands on the piece standing there
const at = (page: Page, x: number, y: number) => { const p = iso(x, y); return clickWorld(page, p.x, p.y - 15) };

async function startDecorating(page: Page) {
  await openDrawer(page);
  await page.getByRole("button", { name: "집 꾸미기" }).click();
  await page.getByRole("button", { name: "꾸미기 시작" }).click();
  await expect.poll(() => flag(page, "decorating")).toBe("1");
}
async function takeFromTray(page: Page, name: string) {
  const handle = page.getByRole("button", { name: /가구 펼치기/ });
  if (await handle.isVisible()) await handle.click();
  await page.locator(".tray-cell", { hasText: name }).click();
}

test("11.9 평소에 놓인 가구를 누르면 그 가구를 쓴다: 별 조명은 켜고 끈다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await enterHouse(page);
  await at(page, 3, 5);
  await expect(page.locator(".thought-bubble")).toContainText("작은 별이 반짝이네.", { timeout: 15_000 });
  await expect.poll(async () => (await saved(page)).decor[0].on).toBe(true);
  // no move or store menu outside the decorate mode
  await expect(page.locator(".npc-choices", { hasText: "서랍에 넣기" })).toHaveCount(0);
});

test("11.9 꾸미기: 가구 줄은 그림 칸, 못 놓는 칸은 이유를 말하고, 놓으면 통통 떨어진다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await startDecorating(page);
  await expect(page.locator(".tray-cell", { hasText: "화분" }).locator("svg")).toHaveCount(1);
  await takeFromTray(page, "화분");
  // on the lamp: taken
  await at(page, 3, 5);
  await expect(page.locator(".thought-bubble")).toContainText("자리가 좁아.", { timeout: 10_000 });
  expect(await flag(page, "ghost")).toBe("no");
  // turned the other way, then put down on a free cell
  await page.keyboard.press("r");
  await at(page, 5, 5);
  await expect.poll(() => flag(page, "dropped"), { timeout: 15_000 }).toBe("화분");
  await expect.poll(async () => (await saved(page)).decor.find((d: { name: string }) => d.name === "화분")).toMatchObject({ x: 5, y: 5, flip: true });
  await page.getByRole("button", { name: "꾸미는 중 · 완료" }).click();
  await expect.poll(() => flag(page, "decorating")).toBe("0");
});

test("11.9 꾸미기: 놓인 가구를 누르면 옮기기·돌리기·서랍에 넣기, 넣으면 서랍으로 날아간다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await startDecorating(page);
  await at(page, 3, 5);
  const menu = page.locator(".npc-choices", { hasText: "서랍에 넣기" });
  await expect(menu).toContainText("작은 별 조명", { timeout: 15_000 });
  await menu.getByRole("button", { name: "돌리기" }).click();
  await expect.poll(async () => (await saved(page)).decor[0].flip).toBe(true);
  await at(page, 3, 5);
  await menu.getByRole("button", { name: "서랍에 넣기" }).click();
  await expect(page.locator(".fly-item")).toHaveCount(1);
  await expect.poll(async () => (await saved(page)).decor.length).toBe(0);
});

test("11.9 꾸미기를 마치면 와 있는 친구가 새 가구를 보러 와서 한마디 한다", async ({ page }) => {
  await seed(page, { ...base, holdings: [{ id: 1, name: "새봄반도체", kind: 0, price: 52000, quantity: 12, date: "2026-08-01", rate: 12.4, plot: 0, lossDays: 0 }] });
  await openGarden(page);
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name: /모아/ }).click();
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
  await startDecorating(page);
  await takeFromTray(page, "티 테이블");
  await at(page, 5, 5);
  await expect.poll(() => flag(page, "dropped"), { timeout: 15_000 }).toBe("티 테이블");
  await page.getByRole("button", { name: "꾸미는 중 · 완료" }).click();
  await expect.poll(() => flag(page, "admired"), { timeout: 30_000 }).toBe("moa:티 테이블");
  await expect(page.locator(".ambient-bubble")).toContainText("티 테이블이 새로 생겼네!", { timeout: 10_000 });
});
