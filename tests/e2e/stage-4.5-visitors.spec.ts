import { test, expect, type Page } from "@playwright/test";
import { openGarden, inviteMoa, clickWorld } from "./helpers";

test.describe.configure({ timeout: 120_000 });

const data = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);

async function invite(page: Page, name: RegExp) {
  await expect(page.locator(".object-panel")).toHaveCount(0);
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name }).click();
}

test("13.7-4 여러 친구가 같이 놀러 오고, 각자 따로 움직인다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await invite(page, /토리/);
  await expect.poll(() => data(page, "guests"), { timeout: 15_000 }).toBe("moa,tori");
  // each friend breathes and picks its own tasks
  const seen: Record<string, Set<string>> = { moa: new Set(), tori: new Set() };
  for (let i = 0; i < 10; i++) {
    for (const id of ["moa", "tori"]) seen[id].add(await data(page, `motion_${id}`));
    await page.waitForTimeout(250);
  }
  expect(seen.moa.size).toBeGreaterThan(2);
  expect(seen.tori.size).toBeGreaterThan(2);
  await expect.poll(() => data(page, "task_tori"), { timeout: 30_000 }).not.toBe("");
  await expect.poll(() => data(page, "task_moa"), { timeout: 30_000 }).not.toBe("");
});

test("13.7-4 초대장: 와 있는 친구는 다시 못 부르고, 최대 3명이면 꽉 찼다고 알려 준다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await clickWorld(page, 485, 527);
  await expect(page.getByRole("button", { name: /모아/ })).toBeDisabled();
  await page.getByRole("button", { name: /토리/ }).click();
  await invite(page, /루온/);
  await expect.poll(() => data(page, "guests"), { timeout: 15_000 }).toBe("moa,tori,luon");
  // a friend just arriving (or a greeting bubble on a phone) can be over the mailbox for a moment: press again
  for (let i = 0; i < 4; i++) {
    // the invitation panel may still be playing its close animation
    await expect(page.locator(".object-panel")).toHaveCount(0);
    await clickWorld(page, 485, 527);
    if (await page.locator(".object-panel").waitFor({ timeout: 4_000 }).then(() => true, () => false)) break;
    await page.keyboard.press("Escape");
  }
  await expect(page.locator(".object-panel")).toBeVisible();
  await expect(page.getByText("집이 꽉 찼어요")).toBeVisible();
});

test("13.7-4 한 친구와 이야기하는 동안 다른 친구는 하던 일을 계속한다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  await invite(page, /토리/);
  await expect.poll(() => data(page, "guests"), { timeout: 15_000 }).toBe("moa,tori");
  // talk to whoever's greeting bubble is up
  const line = page.locator(".ambient-bubble .typed-dialogue");
  await expect(line).toBeVisible({ timeout: 15_000 });
  await line.click();
  await line.click();
  await expect(page.locator(".formal-bubble")).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => data(page, "talkWith")).toMatch(/moa|tori/);
  const other = (await data(page, "talkWith")) === "moa" ? "tori" : "moa";
  const before = await data(page, `motion_${other}`);
  const tasks = new Set<string>();
  for (let i = 0; i < 40 && tasks.size < 2; i++) {
    tasks.add(await data(page, `task_${other}`));
    await page.waitForTimeout(500);
  }
  tasks.delete("");
  expect(tasks.size).toBeGreaterThanOrEqual(1);
  expect(await data(page, `motion_${other}`)).not.toBe(before);
  await expect(page.locator(".formal-bubble")).toBeVisible();
});
