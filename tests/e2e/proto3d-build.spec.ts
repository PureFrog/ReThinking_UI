import { test, expect, type Page } from "./fixtures";

// 부지·건물·랜드마크 (core/land.ts, ui/Build.tsx, decided 2026-11-16 B+C): 넓히기 mode puts priced tags on the closed
// lots; opening land adds tree spots, a building stands on its lot, a city's landmark goes up at the garden's edge —
// all with coins earned by work. Not enough coins: it says how many are missing and the button stays off.
test.describe.configure({ timeout: 240_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}"));

test("넓히기: land, a building and a landmark with coins; short of coins says so", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/proto3d?demo&weather=clear");
  const nav = page.getByRole("navigation", { name: "메뉴" });
  await expect(nav).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("rethink-garden-v1")!); s.currency = 120; localStorage.setItem("rethink-garden-v1", JSON.stringify(s)) });
  await page.goto("/proto3d?weather=clear");
  await expect(nav).toBeVisible({ timeout: 30_000 });
  // 더보기 → 정원 넓히기: a tag on every closed lot (4 pieces of land, 3 building lots)
  await nav.getByRole("button", { name: /^더보기/ }).click();
  await page.getByRole("dialog", { name: "더보기" }).getByRole("button", { name: /^정원 넓히기/ }).click();
  const bar = page.getByRole("region", { name: "넓히기" });
  await expect(bar).toContainText("수익률·적중과는 상관없어요");
  await expect(page.locator(".bd-tag")).toHaveCount(7);
  await page.screenshot({ path: info.outputPath("build-mode.png") });
  // land: 20 coins, 2 more tree spots
  await page.locator(".bd-tag").filter({ hasText: "밭 넓히기" }).dispatchEvent("click");
  await page.getByRole("dialog", { name: "밭 넓히기 넓히기" }).getByRole("button", { name: /^넓히기/ }).click();
  await expect(page.locator(".rt-toast")).toContainText("새 나무 자리 2칸");
  // a building: 55 coins
  await page.locator(".bd-tag").filter({ hasText: "풍차" }).dispatchEvent("click");
  await page.getByRole("dialog", { name: "풍차 짓기" }).getByRole("button", { name: /^짓기/ }).click();
  await expect.poll(async () => (await save(page)).built).toEqual({ land: ["farm2"], buildings: ["windmill"], cities: [] });
  // a landmark from the city book: 40 coins, its index named
  await bar.getByRole("button", { name: "도시 수첩" }).click();
  const book = page.getByRole("dialog", { name: "도시 수첩" });
  await expect(book.getByRole("article", { name: "서울 경복궁" })).toContainText("KOSPI");
  await book.getByRole("article", { name: "서울 경복궁" }).getByRole("button", { name: /열기/ }).click();
  await expect(page.locator(".rt-toast")).toContainText("경복궁");
  await page.waitForTimeout(1800);
  await page.screenshot({ path: info.outputPath("landmark.png") });
  const s = await save(page);
  expect(s.currency).toBe(5);
  expect(s.built).toEqual({ land: ["farm2"], buildings: ["windmill"], cities: ["seoul"] });
  // short of coins: the card says how many and the button is off
  await nav.getByRole("button", { name: /^더보기/ }).click();
  await page.getByRole("dialog", { name: "더보기" }).getByRole("button", { name: /^정원 넓히기/ }).click();
  await page.locator(".bd-tag").filter({ hasText: "과수원 넓히기" }).dispatchEvent("click");
  const short = page.getByRole("dialog", { name: "과수원 넓히기 넓히기" });
  await expect(short).toContainText("코인이 30 모자라요");
  await expect(short.getByRole("button", { name: /^넓히기/ })).toBeDisabled();
  expect(errors).toEqual([]);
});
