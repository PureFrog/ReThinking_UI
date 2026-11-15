import { test, expect, type Page } from "./fixtures";

// 다른 정원들 (docs/planets.md): the map's way up to the sky, the planets with name tags, a visit sheet that shows only
// what its owner shared, and my own share setting (saved; private keeps my garden out of other skies).
test.describe.configure({ timeout: 180_000 });
type Sky = { focus: string | null; planets: number; share: string; sample: boolean } | null;
const sky = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: { sky?: Sky } }).__proto3d?.sky ?? null);
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

test("from the map up to the sky: tags, a visit that hides names unless opened, and my share setting", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo&weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "지도" }).click();
  await page.getByRole("button", { name: /다른 유저 보기/ }).click();
  const view = page.getByTestId("sky");
  await expect(view).toBeVisible();
  await expect(view).toContainText("예시 데이터 · 서버 연결 전");
  await expect.poll(async () => (await sky(page))?.planets ?? 0).toBe(8);
  // a neighbour who keeps names hidden: sectors only (the tags ride on drifting planets, so they are pressed as events)
  await view.getByRole("button", { name: "북쪽창의 정원" }).dispatchEvent("click");
  const sheet = page.getByRole("region", { name: "북쪽창의 정원" });
  await expect(sheet).toContainText("종목명 비공개");
  await expect(sheet.getByLabel("숨긴 종목명").first()).toBeVisible();
  // no amounts or returns on a visit
  expect(await sheet.innerText()).not.toMatch(/\d원|수익률 [+−-]?\d/);
  await sheet.getByRole("button", { name: "응원하기" }).click();
  await expect(sheet.getByRole("button", { name: "응원함" })).toBeDisabled();
  await sheet.getByRole("button", { name: "뒤로" }).click();
  // the one who opened names shows them
  await view.getByRole("button", { name: "느린복기의 정원" }).dispatchEvent("click");
  await expect(page.getByRole("region", { name: "느린복기의 정원" })).toContainText("종목명 공개");
  await page.getByRole("region", { name: "느린복기의 정원" }).getByRole("button", { name: "뒤로" }).click();
  // my share setting is saved
  await view.getByRole("button", { name: /공개 설정/ }).click();
  await page.getByRole("radio", { name: /비공개/ }).click();
  await expect.poll(async () => (await sky(page))?.share).toBe("off");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rethink-garden-v1") ?? "{}").settings?.share)).toBe("off");
  await expect(view.getByRole("button", { name: /공개 설정/ })).toContainText("비공개");
  // back to the garden
  await view.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByTestId("sky")).toHaveCount(0);
  await expect.poll(async () => await sky(page)).toBeNull();
  expect(errors).toEqual([]);
});
