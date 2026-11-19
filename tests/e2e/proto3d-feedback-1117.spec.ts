// Feedback 2026-11-17: 보리 comes over on a stop-loss day, the camera goes along on a map walk (also after writing),
// a 1인칭 view. The server is stood in by __boriOpen.
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
// software WebGL on the team PC makes screenshots slow
test.describe.configure({ timeout: 180_000 });

type View = { fp: boolean; eyeGap: number; follow: number };
const hk = (page: Page) => page.evaluate(() => {
  const h = (window as unknown as { __proto3d?: { player: { x: number; z: number }; friendAt?: { x: number; z: number }; view?: View } }).__proto3d;
  return { player: h?.player ?? null, friendAt: h?.friendAt ?? null, view: h?.view ?? null };
});
const ready = async (page: Page) => {
  await expect(page.getByRole("navigation", { name: "메뉴" })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __proto3d?: { trees?: object } }).__proto3d?.trees ?? {}).length), { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
};

test("on a stop-loss day 보리 walks up to the player and says the talk's first line; the talk starts from it", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    const w = window as unknown as { __boriOpen: (codes: string[]) => Promise<string>; __boriCalls?: number };
    w.__boriOpen = async () => { w.__boriCalls = (w.__boriCalls ?? 0) + 1; return "요즘 그 종목 어떻게 보고 있어? 처음엔 왜 골랐었는지 궁금해."; };
  });
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  // 보리 walks up and the dialogue opens by itself at the bottom (one look for coming over and for a tap)
  const talk = page.getByRole("dialog", { name: "보리와 대화" });
  await expect(talk).toContainText("처음엔 왜 골랐었는지", { timeout: 30_000 });
  await expect.poll(async () => { const { player, friendAt } = await hk(page); return player && friendAt ? Math.hypot(player.x - friendAt.x, player.z - friendAt.z) : 99 }, { timeout: 15_000 }).toBeLessThan(3);
  // the rest of the screen steps back; the camera comes close (the talk camera)
  await expect(page.getByRole("navigation", { name: "메뉴" })).toHaveCSS("opacity", "0");
  const choose = talk.getByRole("group", { name: "대답" });
  await expect(choose.getByRole("button", { name: "얘기해 줄게" })).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: info.outputPath("bori-comes.png") });
  // 보리 wears the face the line came with (the stand-in's line is curious), from its model's face pieces
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { boriFace?: string } }).__proto3d?.boriFace)).toBe("curious");
  await expect(talk).toHaveAttribute("data-face", "curious");
  // the server opened the talk once; the dialogue reused that line
  expect(await page.evaluate(() => (window as unknown as { __boriCalls?: number }).__boriCalls)).toBe(1);
  await choose.getByRole("button", { name: "얘기해 줄게" }).click();
  await expect(talk.getByRole("textbox", { name: "보리에게 말하기" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("bori-type.png") });
  await talk.getByRole("button", { name: "대화 끝내기" }).click();
  await expect(talk).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __proto3d?: { boriFace?: string } }).__proto3d?.boriFace)).toBe("neutral");
  expect(errors).toEqual([]);
});

test("a map walk after writing a journal: the camera follows the player, not the tree", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  await page.waitForTimeout(2500);
  const size = page.viewportSize()!;
  const pt = await page.evaluate(sz => { const t = (window as unknown as { __proto3d: { trees: Record<string, { x: number; y: number }> } }).__proto3d.trees;
    return Object.values(t).filter(p => p.x > 30 && p.x < sz.width - 30 && p.y > 140 && p.y < sz.height - 200 && document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS").sort((a, b) => b.y - a.y)[0] }, size);
  await page.mouse.click(pt.x, pt.y);
  const card = page.getByRole("dialog", { name: /나무$/ });
  await card.getByRole("button", { name: "일지 쓰기" }).click();
  const write = page.getByRole("dialog", { name: "일지 쓰기" });
  await expect(write).toBeVisible();
  await write.getByRole("button", { name: "닫기" }).first().click();
  await expect(write).toHaveCount(0);
  // closing the draft lands in the journal book; close that too
  const book = page.getByRole("dialog", { name: "투자일지" });
  if (await book.count()) await book.getByRole("button", { name: "닫기" }).first().click();
  await page.locator(".proto3d-map").first().click();
  await page.getByRole("button", { name: "리그 광장" }).first().click();
  // the player gets there (stops moving) and the camera is on the player (an upright phone looks 3.5 ahead), not
  // left on the tree
  await expect.poll(async () => { const a = (await hk(page)).player!; await page.waitForTimeout(700); const b = (await hk(page)).player!;
    return Math.hypot(a.x - b.x, a.z - b.z) }, { timeout: 30_000 }).toBeLessThan(0.05);
  expect((await hk(page)).view!.follow).toBeLessThan(4);
  await page.screenshot({ path: info.outputPath("map-follow.png") });
  expect(errors).toEqual([]);
});

test("1인칭: the camera goes to the player's eyes and back", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  await ready(page);
  await page.getByRole("button", { name: "1인칭으로 보기" }).click();
  await expect.poll(async () => (await hk(page)).view, { timeout: 10_000 }).toMatchObject({ fp: true });
  await expect.poll(async () => (await hk(page)).view?.eyeGap ?? 99).toBeLessThan(0.5);
  await page.waitForTimeout(800);
  await page.screenshot({ path: info.outputPath("first-person.png") });
  // walking in first person: the eye goes along
  await page.locator(".proto3d-map").first().click();
  await page.getByRole("button", { name: "집", exact: true }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: info.outputPath("first-person-walk.png") });
  expect((await hk(page)).view!.follow).toBeLessThan(1);
  await page.getByRole("button", { name: "3인칭으로 보기" }).click();
  await expect.poll(async () => (await hk(page)).view?.eyeGap ?? 0, { timeout: 10_000 }).toBeGreaterThan(8);
  await page.screenshot({ path: info.outputPath("third-person.png") });
  expect(errors).toEqual([]);
});
