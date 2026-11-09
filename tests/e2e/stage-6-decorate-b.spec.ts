import { test, expect, type Page } from "@playwright/test";
import { openGarden, clickWorld, openDrawer, enterHouse, iso, inviteMoa } from "./helpers";

test.describe.configure({ timeout: 150_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const seed = (page: Page, state: object) => page.addInitScript(([s, key]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
}, [state, "little-garden-v3"] as const);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!));
const base = { guides: ["move", "place", "placed"] };
// a cell's middle, a little up so the press lands on the piece standing there
const at = (page: Page, x: number, y: number, lift = 15) => { const p = iso(x, y); return clickWorld(page, p.x, p.y - lift) };

async function startDecorating(page: Page) {
  await openDrawer(page);
  await page.getByRole("button", { name: "집 꾸미기" }).click();
  await page.getByRole("button", { name: "꾸미기 시작" }).click();
  await expect.poll(() => flag(page, "decorating")).toBe("1");
}
async function openTray(page: Page) {
  const handle = page.getByRole("button", { name: /가구 펼치기/ });
  if (await handle.isVisible()) await handle.click();
}

test("11.9 집 표면: 방 바닥과 벽지를 바꾸고, 마당에 길을 끌어서 깐다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await startDecorating(page);
  await openTray(page);
  await page.getByRole("tab", { name: "집 표면" }).click();
  await page.getByRole("button", { name: "체크 타일" }).click();
  await expect.poll(() => flag(page, "painting")).toBe("floor:check");
  await at(page, 4, 4, 0);
  await expect.poll(async () => (await saved(page)).surfaces?.floor).toEqual({ living: "check" });
  // the wallpaper goes on the wall pressed
  await openTray(page);
  await page.getByRole("button", { name: "줄무늬 벽지" }).click();
  const wall = iso(4, -0.5);
  await clickWorld(page, wall.x, wall.y - 15 - 120);
  await expect.poll(async () => (await saved(page)).surfaces?.wall).toEqual({ living: "stripe" });
  // a path pressed and dragged across the yard, one cell at a time; a room is not the place for it
  await openTray(page);
  await page.getByRole("button", { name: "흙길" }).click();
  await at(page, 4, 4, 0);
  await expect(page.locator(".thought-bubble")).toContainText("길은 마당에 까는 거야.", { timeout: 10_000 });
  // the thought sits over the canvas: let it go before dragging under it
  await expect(page.locator(".thought-bubble")).toHaveCount(0, { timeout: 15_000 });
  const canvas = page.locator(".game canvas");
  const box = (await canvas.boundingBox())!;
  const cam = await canvas.evaluate(c => ({ x: Number((c as HTMLCanvasElement).dataset.camX ?? 0), y: Number((c as HTMLCanvasElement).dataset.camY ?? 0) }));
  const screen = (x: number, y: number) => { const p = iso(x, y); return [box.x + ((p.x - cam.x) / 1400) * box.width, box.y + ((p.y - cam.y) / 1050) * box.height] as const };
  await page.mouse.move(...screen(3, 9));
  await page.mouse.down();
  await page.mouse.move(...screen(3, 11), { steps: 8 });
  await page.mouse.up();
  // (3,10) holds the shovel, so the path skips it
  await expect.poll(async () => Object.keys((await saved(page)).surfaces?.tiles ?? {}).sort()).toEqual(["3,11", "3,9"]);
  // Esc stops laying, then the decorate mode ends and it stays
  await page.keyboard.press("Escape");
  await expect.poll(() => flag(page, "painting")).toBe("");
  await page.getByRole("button", { name: "꾸미는 중 · 완료" }).click();
  await page.reload();
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => flag(page, "surfaces"), { timeout: 15_000 }).toContain('"living":"check"');
});

test("11.9 2칸짜리 벤치: 두 칸을 차지하고, 돌리면 다른 방향으로 두 칸이다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await startDecorating(page);
  await openTray(page);
  await page.locator(".tray-cell", { hasText: "나무 벤치" }).click();
  // inside the house: the bench is for the yard
  await at(page, 4, 4, 0);
  await expect(page.locator(".thought-bubble")).toContainText("이건 밖에 두는 거야.", { timeout: 10_000 });
  await page.keyboard.press("r");
  await at(page, 3, 12, 0);
  await expect.poll(() => flag(page, "dropped"), { timeout: 20_000 }).toBe("나무 벤치");
  await expect.poll(async () => (await saved(page)).decor.find((d: { name: string }) => d.name === "나무 벤치")).toMatchObject({ x: 3, y: 12, flip: true });
  // a second piece on the bench's other cell does not fit
  await openTray(page);
  await page.locator(".tray-cell", { hasText: "화분" }).click();
  await at(page, 3, 13, 0);
  await expect(page.locator(".thought-bubble")).toContainText("자리가 좁아.", { timeout: 10_000 });
});

test("11.9 앉기: 쿠션을 누르면 앉고, 담요가 있으면 덮고, 아무 데나 누르면 일어난다", async ({ page }) => {
  await seed(page, { ...base, decor: [{ id: 300, name: "쿠션", color: 0xe7b7b0, x: 5, y: 4 }, { id: 301, name: "포근한 담요", color: 0xd7b4a7, x: 5, y: 4 }], gifts: [{ id: "g-blanket", sender: "luon", anonymous: true, item: "포근한 담요", x: 0, y: 0 }], claimed: ["g-blanket"], seen: ["g-blanket"] });
  await openGarden(page);
  await enterHouse(page);
  await at(page, 5, 4);
  await expect.poll(() => flag(page, "sitting"), { timeout: 15_000 }).toBe("쿠션");
  expect(await flag(page, "blanket")).toBe("1");
  await expect(page.locator(".thought-bubble")).toContainText("담요를 덮으니까 포근하다.");
  await at(page, 3, 5, 0);
  await expect.poll(() => flag(page, "sitting")).toBe("");
});

test("11.9 앉아 있으면 단짝 친구가 옆에 와서 앉는다", async ({ page }) => {
  await seed(page, { ...base, relationships: { moa: { points: 55, stage: 3, scenes: [1, 2, 3], daily: {} } }, decor: [{ id: 300, name: "쿠션", color: 0xe7b7b0, x: 5, y: 4 }] });
  await openGarden(page);
  await inviteMoa(page);
  await page.locator(".ambient-bubble").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  await enterHouse(page);
  await at(page, 5, 4);
  await expect.poll(() => flag(page, "sitting"), { timeout: 15_000 }).toBe("쿠션");
  await expect.poll(() => flag(page, "buddy"), { timeout: 30_000 }).toBe("moa");
  await at(page, 3, 5, 0);
  await expect.poll(() => flag(page, "buddy")).toBe("");
});

test("11.9 집이 꽉 차면 가구 줄이 흐려지고, 놓으러 가는 중 Esc면 원래 자리로", async ({ page }) => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: 400 + i, name: "러그", color: 0xa4b597, x: 9 + (i % 6), y: 1 + Math.floor(i / 6) }));
  await seed(page, { ...base, decor: many });
  await openGarden(page);
  await startDecorating(page);
  await openTray(page);
  const cushion = page.locator(".tray-cell", { hasText: "쿠션" });
  await expect(cushion).toHaveClass(/dim/);
  await cushion.click({ force: true });
  await expect(page.locator(".thought-bubble")).toContainText("집이 꽉 찼어.", { timeout: 10_000 });
  // a pot may still go outside; on the way there Esc calls it off and nothing is placed
  await page.locator(".tray-cell", { hasText: "화분" }).click();
  await at(page, 4, 12, 0);
  await expect.poll(() => flag(page, "ghost")).toBe("going");
  await page.keyboard.press("Escape");
  await expect(page.locator(".thought-bubble")).toContainText("다음에 놓자.", { timeout: 10_000 });
  await page.waitForTimeout(1500);
  expect((await saved(page)).decor.some((d: { name: string }) => d.name === "화분")).toBe(false);
});

test("11.9 벽지를 발라도 창문·수납장은 그대로고, 외벽은 집 표면에서 통째로 고른다", async ({ page }) => {
  await seed(page, { ...base, surfaces: { wall: { kitchen: "sprig" } } });
  await openGarden(page);
  // the cut-out windows and cabinets go back over the wallpaper on that floor
  await expect.poll(() => flag(page, "fixtures"), { timeout: 20_000 }).toBe("floor1_wall_fixtures");
  await startDecorating(page);
  await openTray(page);
  await page.getByRole("tab", { name: "집 표면" }).click();
  await page.getByRole("button", { name: "장미 외벽" }).click();
  await expect(page.locator(".thought-bubble")).toContainText("바깥 벽 색을 바꿨어.", { timeout: 10_000 });
  await expect.poll(async () => (await saved(page)).surfaces?.exterior).toBe("rose");
  await expect.poll(() => flag(page, "exteriorArt"), { timeout: 20_000 }).toBe("house_exterior_rose");
  // back to the house as drawn: the wallpaper stays, the outside lets go of its colour
  await openTray(page);
  await page.getByRole("button", { name: "기본 외벽" }).click();
  await expect.poll(async () => (await saved(page)).surfaces).toEqual({ wall: { kitchen: "sprig" } });
  await expect.poll(() => flag(page, "exteriorArt")).toBe("house_exterior");
});
