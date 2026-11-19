import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld, iso, inviteMoa } from "./helpers";

test.describe.configure({ timeout: 120_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!));
const lastSound = (page: Page) => page.evaluate(() => document.documentElement.dataset.lastSound ?? "");
const seed = (page: Page, state: object) => page.addInitScript(([s, key]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
}, [state, "little-garden-v3"] as const);
const base = { guides: ["move", "place", "placed", "drawer"] };

test("7장 소리: 처음 누르면 한 번 묻고, 켜면 효과음과 친구 목소리가 난다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await clickWorld(page, iso(5, 12).x, iso(5, 12).y);
  const ask = page.getByRole("group", { name: "소리 켜기" });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "켜기" }).click();
  await expect(ask).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).settings.sound.on).toBe(true);
  // a press on the ground: a ring and a tap, then steps on the grass
  await clickWorld(page, iso(4, 12).x, iso(4, 12).y);
  await expect.poll(() => lastSound(page), { timeout: 5_000 }).toMatch(/tap|step-grass/);
  // 모아 speaks with her own syllables
  await inviteMoa(page);
  await expect.poll(() => lastSound(page), { timeout: 15_000 }).toBe("voice-moa");
});

test("7장 소리: 괜찮아를 고르면 조용하고, 다시 묻지 않는다", async ({ page }) => {
  await seed(page, base);
  await openGarden(page);
  await clickWorld(page, iso(5, 12).x, iso(5, 12).y);
  await page.getByRole("group", { name: "소리 켜기" }).getByRole("button", { name: "괜찮아" }).click();
  await expect.poll(async () => (await saved(page)).settings.sound.on).toBe(false);
  await page.reload();
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await clickWorld(page, iso(4, 12).x, iso(4, 12).y);
  await page.waitForTimeout(800);
  await expect(page.getByRole("group", { name: "소리 켜기" })).toHaveCount(0);
  expect(await lastSound(page)).toBe("");
});

test("7장 서랍 설정: 소리·음량·움직임 줄이기·화면 따라가기를 바꾸면 저장된다", async ({ page }) => {
  await seed(page, { ...base, settings: { sound: { on: false } } });
  await openGarden(page);
  await clickWorld(page, 1000, 335);
  await page.locator(".object-panel").waitFor();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("slider", { name: "효과음" })).toBeDisabled();
  await page.getByRole("switch", { name: "소리" }).check();
  await expect(page.getByRole("slider", { name: "효과음" })).toBeEnabled();
  await page.getByRole("slider", { name: "친구 목소리" }).fill("0.3");
  await page.getByRole("switch", { name: "움직임 줄이기" }).check();
  await page.getByRole("switch", { name: "화면이 나를 따라오기" }).uncheck();
  await expect.poll(async () => (await saved(page)).settings).toMatchObject({ reduceMotion: true, follow: false, sound: { on: true, voice: 0.3 } });
  await expect.poll(() => flag(page, "calm")).toBe("1");
  await expect(page.getByRole("slider", { name: "배경음" })).toBeDisabled();
});

test("7장 반응: 바닥을 누르면 파문, 끌면 화면이 움직이고 걷지 않는다, 휠로 확대한다", async ({ page }) => {
  await seed(page, { ...base, settings: { sound: { on: false } } });
  await openGarden(page);
  await clickWorld(page, iso(4, 12).x, iso(4, 12).y);
  await expect.poll(() => flag(page, "ripple")).not.toBe("");
  await expect.poll(() => flag(page, "walking").catch(() => ""), { timeout: 10_000 }).not.toBe("1");
  // drag the ground: the view moves, the player stays
  const canvas = page.locator(".game canvas");
  const box = (await canvas.boundingBox())!;
  const before = Number(await flag(page, "camX"));
  const ripple = await flag(page, "ripple");
  // from open ground (the cell just walked to), dragged a quarter of the view to the left
  const cam = { x: before, y: Number(await flag(page, "camY")) };
  const from = iso(4, 12);
  const sx = box.x + ((from.x - cam.x) / 1400) * box.width, sy = box.y + ((from.y - cam.y) / 1050) * box.height;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx - box.width * .25, sy - box.height * .05, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => flag(page, "cameraFree")).toBe("1");
  await expect.poll(async () => Number(await flag(page, "camX"))).toBeGreaterThan(before + 50);
  expect(await flag(page, "ripple")).toBe(ripple);
  // a walk brings the view back to the player
  await clickWorld(page, iso(5, 12).x, iso(5, 12).y);
  await expect.poll(() => flag(page, "cameraFree")).toBe("");
  // wheel zoom, kept within 0.75–1.5
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -120);
  await expect.poll(() => flag(page, "camZoom")).toBe("1.1");
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -120);
  await expect.poll(() => flag(page, "camZoom")).toBe("1.5");
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 120);
  await expect.poll(() => flag(page, "camZoom")).toBe("0.75");
  // zoomed out, a press still lands where it aims: the mailbox opens the invitation
  await clickWorld(page, 485, 527);
  await expect(page.getByRole("button", { name: /모아/ })).toBeVisible({ timeout: 10_000 });
});

test("7장 반응: 누를 수 있는 것은 눌리면 찌그러졌다 돌아온다", async ({ page }) => {
  await seed(page, { ...base, settings: { sound: { on: false } } });
  await openGarden(page);
  // the mailbox: pressed again if the first press came before the garden settled
  for (let i = 0; i < 3 && !(await flag(page, "pressed")); i++) { await clickWorld(page, 485, 527); await page.waitForTimeout(600) }
  await expect.poll(() => flag(page, "pressed")).not.toBe("");
});
