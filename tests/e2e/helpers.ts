import { expect, type Page } from "@playwright/test";

// World coordinates are the Phaser scene's 1400×1050 space; the canvas is scaled to fit.
export async function clickWorld(page: Page, x: number, y: number) {
  const box = (await page.locator(".game canvas").boundingBox())!;
  await page.mouse.click(box.x + (x / 1400) * box.width, box.y + (y / 1050) * box.height);
}

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

// The anonymous welcome parcel sits at cell (5,6); the drawer at (1,5).
export async function pickWelcomeGift(page: Page) {
  await clickWorld(page, 657, 448);
  await expect(page.locator(".gift-card")).toBeVisible({ timeout: 10_000 });
}

export async function openDrawer(page: Page) {
  // a panel that is still playing its close animation would swallow the click
  await expect(page.locator(".object-panel")).toHaveCount(0);
  await clickWorld(page, 536, 314);
  await expect(page.locator(".object-panel")).toBeVisible({ timeout: 10_000 });
}
