import { test, expect, type Page } from "./fixtures";
import { openGarden, clickWorld, iso } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const flag = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);
const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dayOf(d) };
const page1 = (day: string) => ({ id: "p1", holdingId: 1, name: "SK하이닉스", day, saw: "고객사 계약 연장 소식", think: "계약이 이어지면 매출이 버틸 것 같아서 두기로", mood: "curious" });
const seed = (page: Page, state: object) => page.addInitScript(([s, key]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key as string, JSON.stringify(s)); sessionStorage.setItem("seeded", "1") }
}, [state, "little-garden-v3"] as const);
const sun = async (page: Page) => Number((await page.locator(".sun-count").textContent())?.replace(/\D/g, ""));

test("12.4 회고: 30일 전 일지를 루온이 들고 와서, 이유가 아직 맞는지 고르고 한 줄 답하면 햇살 조각과 리본 매듭이 생긴다", async ({ page }) => {
  await seed(page, { journal: [page1(daysAgo(31))], sunlight: 2 });
  await openGarden(page);
  await expect.poll(() => flag(page, "retro"), { timeout: 10_000 }).toBe("1");
  // luon comes over first and opens with the page
  const bubble = page.locator(".ambient-bubble", { hasText: "31일 전에 이렇게 써놨더라" });
  await expect(bubble).toBeVisible({ timeout: 30_000 });
  await bubble.click();
  await expect(page.locator(".formal-bubble")).toContainText("31일 전에 이렇게 써놨더라", { timeout: 20_000 });
  await page.getByRole("button", { name: /그때 생각 다시 보기/ }).click();
  const panel = page.locator(".object-panel");
  await expect(panel).toContainText("루온이 들고 온 리본");
  await expect(panel).toContainText("계약이 이어지면 매출이 버틸 것 같아서 두기로");
  await expect(panel).toContainText("31일 전의 나");
  await expect(panel).toContainText("수익률이 아니라");
  await expect(panel).not.toContainText("%");
  // a verdict is needed; the line is optional
  await page.getByRole("button", { name: "답장 남기기" }).click();
  await expect(panel).toBeVisible();
  await panel.getByText("반쯤", { exact: true }).click();
  await panel.getByPlaceholder("지금 보니…").fill("계약은 이어졌는데 마진은 다시 봐야겠어");
  await page.getByRole("button", { name: "답장 남기기" }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => sun(page)).toBe(5);
  await expect.poll(() => flag(page, "knots")).toBe("1:1");
  await expect.poll(() => flag(page, "lastRetro")).toBe("1");
  await expect.poll(() => flag(page, "retro")).toBe("0");
  await expect(page.locator(".thought-bubble")).toContainText("리본에 매듭이 하나 늘었어");
  // kept, and one a day: after a reload nothing is due again
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => flag(page, "knots"), { timeout: 10_000 }).toBe("1:1");
  expect(await flag(page, "retro")).toBe("0");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3")!).retros)).toMatchObject([{ entryId: "p1", mark: 30, verdict: "half", reply: "계약은 이어졌는데 마진은 다시 봐야겠어" }]);
});

test("12.4 회고는 30일이 지나야 온다 · ?ahead=30이면 오늘 쓴 일지도 미리 돌아온다", async ({ page }) => {
  await seed(page, { journal: [page1(daysAgo(0))] });
  await openGarden(page);
  await page.waitForTimeout(1_000);
  expect(await flag(page, "retro")).toBe("0");
  await page.goto("/classic?ahead=30");
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => flag(page, "retro"), { timeout: 10_000 }).toBe("1");
});

test("12.5 회고 다섯 번이면 2층 벽에 사다리가 생기고 다락방(3층)에 오르내린다 · 일지 50번이면 외관이 커진다", async ({ page }) => {
  const earned = { "retro-5": { day: daysAgo(1), delivered: true }, "journal-50": { day: daysAgo(1), delivered: true } };
  await seed(page, { earned });
  await openGarden(page);
  await expect.poll(() => flag(page, "attic"), { timeout: 10_000 }).toBe("1");
  await expect.poll(() => flag(page, "exterior")).toBe("grown");
  const up = iso(0.5, 3.5);
  await clickWorld(page, up.x, up.y - 110);
  await expect.poll(() => flag(page, "floor"), { timeout: 15_000 }).toBe("2");
  const ladder = iso(47, 0);
  await clickWorld(page, ladder.x, ladder.y - 15 - 100);
  await expect.poll(() => flag(page, "floor"), { timeout: 15_000 }).toBe("3");
  expect(await flag(page, "playerCell")).toBe("81,4");
  const hatch = iso(80, 4);
  await clickWorld(page, hatch.x, hatch.y - 15 - 20);
  await expect.poll(() => flag(page, "floor"), { timeout: 15_000 }).toBe("2");
  expect(await flag(page, "playerCell")).toBe("47,1");
});
