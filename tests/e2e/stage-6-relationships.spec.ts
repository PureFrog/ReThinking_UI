import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld, advanceUntilChoices, pickWelcomeGift, openDrawer } from "./helpers";

test.describe.configure({ timeout: 120_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const seed = (page: Page, state: object) => page.addInitScript(([s, key]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
}, [state, "little-garden-v3"] as const);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!));
const rel = (points: number, stage: number, scenes: number[] = []) => ({ points, stage, scenes, daily: {} });

async function invite(page: Page, name: RegExp) {
  await expect(page.locator(".object-panel")).toHaveCount(0);
  await clickWorld(page, 485, 527);
  await page.getByRole("button", { name }).click();
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
}
// press the greeting until the formal talk opens (the first press may only finish the typing)
async function startTalk(page: Page) {
  const formal = page.locator(".formal-bubble");
  for (let i = 0; i < 4 && !(await formal.isVisible()); i++) {
    await page.locator(".ambient-bubble .typed-dialogue").click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  await expect(formal).toBeVisible({ timeout: 10_000 });
}
async function openMailbox(page: Page) {
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(".object-panel")).toHaveCount(0);
    await clickWorld(page, 485, 527);
    if (await page.locator(".object-panel", { hasText: "정원 입구의 우편함" }).waitFor({ timeout: 4_000 }).then(() => true, () => false)) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
  }
}

test("3장 관계: 놀러 온 날 친밀도가 올라 단계가 바뀌면 알려 주고, 그 단계 장면이 한 번 나온다", async ({ page }) => {
  await seed(page, { relationships: { moa: rel(7, 0) } });
  await openGarden(page);
  await invite(page, /모아/);
  // the first visit of the day: 7 → 8, 아는 사이; the note waits until no friend balloon is up
  await startTalk(page);
  await expect(page.locator(".formal-bubble")).toContainText("이제 너네 집 가는 길이 익숙해졌나 봐", { timeout: 10_000 });
  await expect.poll(() => flag(page, "scene")).toBe("moa:1");
  await advanceUntilChoices(page, 3);
  await expect(page.locator(".formal-bubble")).toContainText("문 앞에서 반겨 줄래?");
  const s = await saved(page);
  expect(s.relationships.moa).toMatchObject({ stage: 1, scenes: [1] });
  // talking once this visit counts too, within the day's cap
  expect(s.relationships.moa.points).toBe(9);
  await page.getByRole("button", { name: /다음에 얘기하자/ }).click();
  await expect(page.locator(".thought-bubble")).toContainText("모아와 더 가까워졌어. 이제 '아는 사이' 사이야.", { timeout: 20_000 });
  await expect(page.locator(".ambient-bubble")).toHaveCount(0);
  // the mailbox shows how close each friend is
  await openMailbox(page);
  await expect(page.getByRole("button", { name: /모아/ })).toContainText("아는 사이");
  await expect(page.getByRole("button", { name: /토리/ })).toContainText("처음 만남");
});

test("3장 비밀: 루온은 단짝이 되면 익명 선물의 주인이라는 걸 들키고, 보낸 이가 '루온(아마도)'가 된다", async ({ page }) => {
  await seed(page, { relationships: { luon: rel(50, 3, [1, 2]) } });
  await openGarden(page);
  await pickWelcomeGift(page);
  await expect(page.locator(".gift-card")).toContainText("누군가 두고 갔어");
  await page.locator(".gift-card").click();
  await invite(page, /루온/);
  await startTalk(page);
  await expect(page.locator(".formal-bubble")).toContainText("문 앞 상자 말인데", { timeout: 10_000 });
  await advanceUntilChoices(page, 3);
  await expect(page.locator(".formal-bubble")).toContainText("도망갈 거야");
  expect((await saved(page)).relationships.luon.scenes).toEqual([1, 2, 3]);
  await page.getByRole("button", { name: /다음에 얘기하자/ }).click();
  // the drawer names the sender now
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await openDrawer(page);
  await page.locator(".item-cell", { hasText: "포근한 담요" }).click();
  await expect(page.locator(".item-detail")).toContainText("루온(아마도)");
});

test("3장 비밀: 모아는 가족 같은 사이가 되면 걱정을 털어놓는 편지를 우편함에 두고 간다", async ({ page }) => {
  await seed(page, { relationships: { moa: rel(90, 4, [1, 2, 3]) } });
  await openGarden(page);
  expect(await flag(page, "letter")).toBe("0");
  await invite(page, /모아/);
  await startTalk(page);
  await expect(page.locator(".formal-bubble")).toContainText("말 대신 편지를 두고 갈게", { timeout: 10_000 });
  await expect.poll(() => flag(page, "letter")).toBe("1");
  await advanceUntilChoices(page, 3);
  await page.getByRole("button", { name: /다음에 얘기하자/ }).click();
  await openMailbox(page);
  const panel = page.locator(".object-panel");
  await expect(panel).toContainText("모아의 편지");
  await expect(panel).toContainText("말로 하면 울 것 같아서 편지로 써.");
  await expect.poll(() => flag(page, "letter")).toBe("0");
});

test("3장 단계 대사: 단짝이 된 토리는 인사부터 달라진다", async ({ page }) => {
  await seed(page, { relationships: { tori: rel(55, 3, [1, 2, 3]) } });
  await openGarden(page);
  await invite(page, /토리/);
  await expect(page.locator(".ambient-bubble")).toContainText("단짝 왔다!", { timeout: 20_000 });
});
