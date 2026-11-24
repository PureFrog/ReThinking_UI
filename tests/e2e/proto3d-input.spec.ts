import { test, expect, type Page } from "./fixtures";
import * as V from "./village";

// User feedback 2026-11-16: typing in a sheet took one letter at a time (and broke Korean) because the sheet pulled
// focus back on every re-render; the garden moved only with the mouse. Fields keep focus while typed into key by key,
// and arrows/WASD walk, Q/E turn, +/- zoom — but not while typing or inside a panel.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const player = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __proto3d: { player: { x: number; z: number } } }).__proto3d.player }));

test("typing key by key stays in the field: the nickname and a journal", async ({ page }) => {
  await page.goto("/proto3d?reset&weather=clear");
  await expect(page.getByRole("dialog", { name: /내 종목 넣기|종목 확인/ }).first()).toBeVisible({ timeout: 30_000 });
  const name = page.getByLabel("내 이름");
  await name.click();
  await name.pressSequentially("보리친구abc", { delay: 30 });
  await expect(name).toHaveValue("보리친구abc");
  // a journal page: the hypothesis typed key by key
  await page.goto("/proto3d?demo&weather=clear");
  await V.journal(page);
  await page.getByRole("dialog", { name: "투자일지" }).getByRole("button", { name: /^(새|첫) 일지 쓰기/ }).click();
  const w = page.getByRole("dialog", { name: "일지 쓰기" });
  await w.getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /가설/ }).click();
  const box = w.getByRole("textbox").first();
  await box.click();
  await box.pressSequentially("수요가 회복된다 ok", { delay: 30 });
  await expect(box).toHaveValue("수요가 회복된다 ok");
  // keys typed in a field do not walk the garden
  const before = await player(page);
  await box.press("w");await box.press("ArrowUp");
  expect(await player(page)).toEqual(before);
});

test("the keyboard walks, turns and zooms the garden", async ({ page }) => {
  await page.goto("/proto3d?demo&weather=clear");
  await expect(V.controls(page)).toBeVisible({ timeout: 30_000 });
  await page.locator(".proto3d canvas").click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
  await page.keyboard.press("Escape");
  const a = await player(page);
  await page.keyboard.down("KeyW");await page.waitForTimeout(900);await page.keyboard.up("KeyW");
  await expect.poll(async () => { const b = await player(page); return Math.hypot(b.x - a.x, b.z - a.z) }, { timeout: 5_000 }).toBeGreaterThan(0.5);
  const cam = () => page.evaluate(() => (window as unknown as { __proto3d: { points?: Record<string, { x: number; y: number }> } }).__proto3d.points?.["house"]);
  const h0 = await cam();
  await page.keyboard.down("KeyE");await page.waitForTimeout(700);await page.keyboard.up("KeyE");
  await expect.poll(async () => { const h1 = await cam(); return h0 && h1 ? Math.hypot(h1.x - h0.x, h1.y - h0.y) : 0 }, { timeout: 5_000 }).toBeGreaterThan(5);
});

// feedback: "처음에 30일 튜토리얼 안 나옴" — with only stocks that are up nothing was flagged, so 되돌아보기 was skipped.
// Now moa's plain chart note stands in, and it opens all the same.
test("되돌아보기 opens even when every stock typed in is up", async ({ page }) => {
  await page.goto("/proto3d?reset&weather=clear");
  const start = page.getByRole("dialog", { name: "내 종목 넣기" });
  await start.getByRole("button", { name: /직접 입력/ }).click({ timeout: 30_000 });
  const list = page.getByRole("dialog", { name: "종목 확인" });
  await list.getByLabel("1번 종목 이름").fill("나래식품");
  await list.getByLabel("나래식품 수익률").fill("6.5");
  await list.getByRole("button", { name: "정원에 넣기 · 1종목" }).click();
  const look = page.getByRole("dialog", { name: "되돌아보기" });
  await expect(look).toBeVisible({ timeout: 40_000 });
  await expect(look).toContainText("나래식품");
  await expect(look.getByRole("form", { name: "그때의 일지" })).toBeVisible();
});
