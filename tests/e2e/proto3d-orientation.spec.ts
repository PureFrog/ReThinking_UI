import { test, expect, type Page } from "./fixtures";
import * as V from "./village";

// A phone game, upright first (390×844), that still plays turned on its side (844×390).
// Upright: the camera swings round so the farm runs up the tall screen, every holding tree is on screen and sheets rise
// from the bottom. On its side: the camera comes back to the front and sheets open on the right; the corner buttons
// (map, notebook, settings — the village has no dock since 2026-11-22) stay in reach. Turning the phone mid-judgment
// keeps what was typed.
// The camera values come from look.ts camera.frames through core/frame.ts and show in window.__proto3d.camera.
test.describe.configure({ timeout: 150_000 });
type Hooks = { frames: number; treeModels: number; trees: Record<number, { x: number; y: number }>; camera?: { turn: number; dist: number } };
const hooks = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: Hooks }).__proto3d ?? null);
const dock = (page: Page) => V.controls(page);
const UPRIGHT = { width: 390, height: 844 }, SIDEWAYS = { width: 844, height: 390 };

// the viewport is set inside each test, so one phone project is enough
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "sets its own phone sizes"));

async function open(page: Page, errors: string[]) {
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()) });
  await page.setViewportSize(UPRIGHT);
  await page.goto("/proto3d?demo&weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await hooks(page))?.treeModels ?? 0, { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
}
const box = async (page: Page, sel: ReturnType<Page["locator"]>) => (await sel.boundingBox())!;

test("upright: the whole farm is on screen, sheets rise from the bottom", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  await expect.poll(async () => (await hooks(page))?.camera?.turn ?? 0, { timeout: 20_000 }).toBeGreaterThan(0.5);
  // (since the wider village, 2026-11-22, the player starts by the house: walk to the farm first)
  await page.locator(".proto3d-map").first().click();
  await page.getByRole("button", { name: "밭", exact: true }).click();
  // the camera follows the player with a short lag; the trees settle within a second or two
  await expect.poll(async () => {
    const t = Object.values((await hooks(page))?.trees ?? {});
    return t.length === 7 && t.every(p => p.x > 0 && p.x < UPRIGHT.width && p.y > 60 && p.y < UPRIGHT.height - 90);
  }, { timeout: 30_000 }).toBe(true);
  await V.journal(page);
  const s = await box(page, page.getByRole("dialog", { name: "투자일지" }));
  expect(s.width).toBeGreaterThan(UPRIGHT.width - 40);
  expect(s.y + s.height).toBeLessThanOrEqual(UPRIGHT.height + 1);
  expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);
});

test("turned on its side: the corner buttons in reach, a sheet on the right, and a half-written judgment survives the turns", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  await page.setViewportSize(SIDEWAYS);
  await expect.poll(async () => (await hooks(page))?.camera?.turn ?? 1).toBe(0);
  // the buttons over the garden stay big enough to press and inside the screen (no dock or rail since 2026-11-22)
  for (const b of [dock(page), page.getByRole("button", { name: "설정" })]) {
    const r = (await b.boundingBox())!;
    expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(36);
    expect(r.y + r.height).toBeLessThanOrEqual(SIDEWAYS.height);
    expect(r.x + r.width).toBeLessThanOrEqual(SIDEWAYS.width);
  }
  await V.journal(page);
  await page.getByRole("dialog", { name: "투자일지" }).locator("button.rt-row").filter({ hasText: /카카오/ }).click();
  const brief = page.getByRole("dialog", { name: "브리핑" });
  const s = await box(page, brief);
  expect(s.x).toBeGreaterThan(SIDEWAYS.width / 2 - 40);
  expect(s.height).toBeGreaterThan(SIDEWAYS.height - 40);
  // the note leads to a journal page (지기): write on the 가설 page, turn the phone, nothing typed is lost
  await brief.getByRole("button", { name: "이 종목 일지 쓰기" }).click();
  const w = page.getByRole("dialog", { name: "일지 쓰기" });
  await w.getByRole("navigation", { name: "일지 쪽" }).getByRole("button", { name: /가설/ }).click();
  await w.getByRole("textbox").first().fill("저점이 3주째 낮아진다. 한 달은 더 본다.");
  const side = await box(page, w);
  expect(side.x).toBeGreaterThan(SIDEWAYS.width / 2 - 40);
  await page.setViewportSize(UPRIGHT);
  await expect.poll(async () => (await hooks(page))?.camera?.turn ?? 0).toBeGreaterThan(0.5);
  const up = await box(page, w);
  expect(up.width).toBeGreaterThan(UPRIGHT.width - 40);
  await expect(w.getByRole("textbox").first()).toHaveValue("저점이 3주째 낮아진다. 한 달은 더 본다.");
  await page.setViewportSize(SIDEWAYS);
  await expect(w.getByRole("textbox").first()).toHaveValue("저점이 3주째 낮아진다. 한 달은 더 본다.");
  expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);
});
