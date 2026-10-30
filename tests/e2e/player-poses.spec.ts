import { test, expect } from "@playwright/test";
import { clickWorld, openGarden, pickWelcomeGift } from "./helpers";

// 002 reference sheet: back view when walking away from the camera, faces + effects on feelings.
test("walking up shows the back, walking down the front", async ({ page }) => {
  await openGarden(page);
  const canvas = page.locator(".game canvas");
  await clickWorld(page, 743, 371); // cell (4,3), up-right (NE) of the start cell (4,4), clear of the player
  await expect(canvas).toHaveAttribute("data-face", "back");
  await clickWorld(page, 700, 437); // cell (5,5), back down
  await expect(canvas).toHaveAttribute("data-face", "idle");
});

test("a friend arriving surprises the player", async ({ page }) => {
  await openGarden(page);
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name: /모아/ }).click();
  await expect(page.locator(".game canvas")).toHaveAttribute("data-face", "surprised", { timeout: 15_000 });
});

test("opening a gift makes the player happy", async ({ page }) => {
  await openGarden(page);
  await pickWelcomeGift(page);
  await expect(page.locator(".game canvas")).toHaveAttribute("data-face", "happy");
});
