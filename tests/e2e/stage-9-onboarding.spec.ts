import { test, expect, type Page } from "./fixtures";
import { clickWorld, iso } from "./helpers";

// ux-spec 8장 onboarding, learnt by doing: a name, then moa comes in and points the way. The trees come from a capture of
// the brokerage screen (read by a mock reader for now), one tree is watered with its first journal line, moa leaves a
// candy and goes. A garden saved before skips all of it.
test.describe.configure({ timeout: 120_000 });
const data = (page: Page, k: string) => page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", k);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3") ?? "{}"));
const panel = (page: Page) => page.locator(".object-panel");
// the seedbox at (2,10); on a phone the first press may only bring the camera round, so press again if needed
async function openSeedbox(page: Page) {
  const seed = iso(2, 10);
  for (let i = 0; i < 3; i++) {
    await clickWorld(page, seed.x, seed.y - 20);
    if (await panel(page).waitFor({ timeout: 10_000 }).then(() => true, () => false)) return;
  }
  await expect(panel(page)).toBeVisible();
}
const PNG = { name: "portfolio.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") };

test("a new player: name, moa, a capture becomes trees, first journal, candy and goodbye", async ({ page }) => {
  await page.goto("/classic?fresh");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  // an empty garden and the name first (no explanation popup)
  const name = page.getByRole("dialog", { name: "이름 정하기" });
  await expect(name).toBeVisible();
  expect((await saved(page)).holdings).toEqual([]);
  await name.getByRole("textbox").fill("하늘");
  await name.getByRole("button", { name: "정원으로 들어가기" }).click();
  await expect(name).toHaveCount(0);
  await expect(page.locator(".world-heading p")).toContainText("하늘님의 집");
  // moa comes straight in, welcomes, then points at the seedbox
  const bubble = page.locator(".ambient-bubble");
  await expect(bubble).toContainText("새로 이사 왔구나", { timeout: 20_000 });
  await expect.poll(() => data(page, "pointing"), { timeout: 20_000 }).toBe("seeds");
  await expect(bubble).toContainText("씨앗박스", { timeout: 20_000 });
  // the seedbox: upload a capture, the read list comes up to confirm
  await openSeedbox(page);
  await page.getByLabel("내 주식 화면 캡처 올리기").setInputFiles(PNG);
  await expect(panel(page).locator(".capture-row")).toHaveCount(4, { timeout: 10_000 });
  await panel(page).getByLabel("카카오 보유 기간").selectOption("half");
  await panel(page).getByLabel("현대차 반영하기").uncheck();
  await page.getByRole("button", { name: "정원에 반영하기" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator(".thought-bubble")).toContainText("나무 3그루를 심었어");
  const s = await saved(page);
  expect(s.holdings.map((h: any) => h.name)).toEqual(["SK하이닉스", "NAVER", "카카오"]);
  expect(s.holdings.map((h: any) => h.plot)).toEqual([0, 1, 2]);
  // next: water the first tree
  await expect.poll(() => data(page, "pointing"), { timeout: 20_000 }).toMatch(/^tree:/);
  await expect(bubble).toContainText("SK하이닉스 나무에 물", { timeout: 20_000 });
  const t = iso(9, 11);
  await clickWorld(page, t.x, t.y - 60);
  await page.locator(".tree-menu").getByRole("button", { name: /물 주기/ }).click({ timeout: 15_000 });
  await expect(panel(page)).toHaveAttribute("data-skin", "notebook", { timeout: 20_000 });
  await panel(page).getByLabel("그래서 내 생각").fill("공장이 늘어날 것 같아서");
  await page.getByRole("button", { name: "일지 남기고 물 주기" }).click();
  await expect(panel(page)).toHaveCount(0);
  // moa's candy and goodbye
  await expect(bubble).toContainText("다른 친구들도 곧", { timeout: 20_000 });
  await expect.poll(async () => (await saved(page)).gifts.some((g: any) => g.sender === "moa" && g.item === "위로 사탕"), { timeout: 10_000 }).toBe(true);
  const done = await saved(page);
  expect(done.onboarded).toBe(true);
  expect(done.onboard).toBe("done");
  expect(await data(page, "pointing")).toBe("");
});

test("a save from before skips the onboarding", async ({ page }) => {
  await page.goto("/classic");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_000);
  await expect(page.getByRole("dialog", { name: "이름 정하기" })).toHaveCount(0);
  expect((await saved(page)).holdings).toHaveLength(4);
});

test("a later capture: new rates, a new tree, and a tree missing from it is asked about", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("little-garden-v3", JSON.stringify({ holdings: [
      { id: 1, name: "SK하이닉스", kind: 0, price: 52000, quantity: 12, date: "2026-08-01", rate: 3, plot: 0, lossDays: 0 },
      { id: 9, name: "푸른칩테크", kind: 0, price: 10000, quantity: 5, date: "2026-07-01", rate: -2, plot: 4, lossDays: 0 },
    ] }));
  });
  await page.goto("/classic");
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await openSeedbox(page);
  await page.getByLabel("내 주식 화면 캡처 올리기").setInputFiles(PNG);
  await expect(panel(page).locator(".capture-row:not(.missing)")).toHaveCount(4, { timeout: 10_000 });
  await expect(panel(page)).toContainText("이미 있는 나무");
  await panel(page).getByLabel("푸른칩테크 정리 여부").selectOption("gone");
  await page.getByRole("button", { name: "정원에 반영하기" }).click();
  await expect(page.locator(".thought-bubble")).toContainText("나무 3그루를 심었어 · 1그루는 수익률이 바뀌었어 · 1그루를 정리했어");
  const s = await saved(page);
  expect(s.holdings.find((h: any) => h.name === "SK하이닉스").rate).toBe(12.4);
  expect(s.holdings.some((h: any) => h.name === "푸른칩테크")).toBe(false);
  expect(s.holdings).toHaveLength(4);
});
