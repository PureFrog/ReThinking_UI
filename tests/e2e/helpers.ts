import { expect, type Page } from "@playwright/test";

// World coordinates are the Phaser scene's space; the camera shows a 1400×1050 window of it
// (it follows the player, 13.7-5) and the canvas is scaled to fit.
export async function clickWorld(page: Page, x: number, y: number) {
  const canvas = page.locator(".game canvas");
  const box = (await canvas.boundingBox())!;
  const cam = await canvas.evaluate((c) => ({ x: Number((c as HTMLCanvasElement).dataset.camX ?? 0), y: Number((c as HTMLCanvasElement).dataset.camY ?? 0) }));
  await page.mouse.click(box.x + ((x - cam.x) / 1400) * box.width, box.y + ((y - cam.y) / 1050) * box.height);
}

// Cell centre in world coordinates (app/scene/world.ts iso); `lift` for cells on the raised house floor.
export const iso = (x: number, y: number, lift = 0) => ({ x: 700 + (x - y) * 43, y: 235 + (x + y) * 21.5 - lift });

export async function openGarden(page: Page) {
  await page.goto("/");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0);
}

// Mailbox → invite 모아. She walks in and greets with an ambient line.
export async function inviteMoa(page: Page) {
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name: /모아/ }).click();
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
}

// Ambient bubble: first press finishes typing, the next starts the formal talk (11.3).
export async function startTalk(page: Page) {
  const line = page.locator(".ambient-bubble .typed-dialogue");
  await line.click();
  await expect(line).not.toHaveAttribute("aria-label", "대사 전체 보기");
  await line.click();
  await expect(page.locator(".formal-bubble")).toBeVisible({ timeout: 10_000 });
}

export async function advanceUntilChoices(page: Page, count: number) {
  const choices = page.locator(".dialogue-choices > button");
  for (let i = 0; i < 10 && (await choices.count()) !== count; i++) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
  }
  await expect(choices).toHaveCount(count);
}

// The anonymous welcome parcel sits at cell (5,6); the drawer against the back wall at (1–2,0).
export async function pickWelcomeGift(page: Page) {
  await clickWorld(page, 657, 448);
  await expect(page.locator(".gift-card")).toBeVisible({ timeout: 10_000 });
}

// From the yard the house shows its outside and the furniture inside can't be pressed: walk in first.
export async function enterHouse(page: Page) {
  const facade = () => page.locator(".game canvas").evaluate(c => (c as HTMLCanvasElement).dataset.facade ?? "");
  if ((await facade()) !== "1") return;
  const hall = iso(5, 5, 15);
  await clickWorld(page, hall.x, hall.y);
  await expect.poll(facade, { timeout: 15_000 }).toBe("0");
}

export async function openDrawer(page: Page) {
  // a panel that is still playing its close animation would swallow the click
  await expect(page.locator(".object-panel")).toHaveCount(0);
  await enterHouse(page);
  // a friend's greeting bubble can sit over the drawer on a small screen; it closes by itself
  await page.locator(".ambient-bubble").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  // right-hand end of the drawer, clear of a friend's speech bubble when one is standing near the sofa.
  // A friend who walked over may stand in front of it and take the press as "let's talk": close that and press again.
  for (let i = 0; i < 2; i++) {
    await clickWorld(page, 1000, 335);
    if (await page.locator(".object-panel").waitFor({ timeout: 6_000 }).then(() => true, () => false)) return;
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  await expect(page.locator(".object-panel")).toBeVisible({ timeout: 10_000 });
}
