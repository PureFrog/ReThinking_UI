import { test, expect, type Page } from "@playwright/test";
import { openGarden, clickWorld, iso, inviteMoa } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const data = (page: Page, key: string) =>
  page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", key);

test("13.7-6 넓어진 농장: 카메라가 플레이어를 따라가고, 밭은 12칸", async ({ page }) => {
  await openGarden(page);
  expect(await data(page, "camX")).toBe("0");
  const far = iso(14, 19);
  await clickWorld(page, far.x, far.y);
  await expect.poll(() => data(page, "playerCell"), { timeout: 20_000 }).toBe("14,19");
  await expect.poll(async () => Number(await data(page, "camY")), { timeout: 5_000 }).toBeGreaterThan(100);
  // the seed box offers all twelve plots
  const seeds = iso(2, 10);
  await clickWorld(page, seeds.x, seeds.y - 20);
  await expect(page.locator(".object-panel")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".furniture-grid button")).toHaveCount(12);
});

test("13.7-5 왼쪽 벽에 붙어 안쪽으로 올라가는 계단을 누르면 2층(침실·서재)으로, 다시 누르면 1층으로", async ({ page }) => {
  await openGarden(page);
  const up = iso(0.5, 3.5);
  await clickWorld(page, up.x, up.y - 110);
  await expect.poll(() => data(page, "floor"), { timeout: 15_000 }).toBe("2");
  expect(await data(page, "playerCell")).toBe("41,2");
  const down = iso(40, 4.5);
  await clickWorld(page, down.x, down.y - 20);
  await expect.poll(() => data(page, "floor"), { timeout: 15_000 }).toBe("1");
  expect(await data(page, "playerCell")).toBe("0,6");
});

test("13.7-5 집은 사방이 벽: 마당에서는 집 바깥 그림이 보이고, 들어오면 방 안이 보인다", async ({ page }) => {
  await openGarden(page);
  expect(await data(page, "facade")).toBe("0");
  const far = iso(14, 19);
  await clickWorld(page, far.x, far.y);
  await expect.poll(() => data(page, "playerCell"), { timeout: 20_000 }).toBe("14,19");
  expect(await data(page, "facade")).toBe("1");
});

test("13.7-5 친구 대사는 플레이어가 볼 수 있을 때만: 마당에서 부르면 문 앞에서 인사하고, 내가 다른 층으로 가면 대사가 닫힌다", async ({ page }) => {
  await openGarden(page);
  await inviteMoa(page);
  expect(await data(page, "facade")).toBe("1");
  const hall = iso(5, 5);
  await clickWorld(page, hall.x, hall.y - 15);
  await expect.poll(() => data(page, "facade"), { timeout: 15_000 }).toBe("0");
  // on a phone the greeting bubble can sit over the stairs; let it close first
  await page.locator(".ambient-bubble").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  const up = iso(0.5, 3.5);
  await clickWorld(page, up.x, up.y - 110);
  await expect.poll(() => data(page, "floor"), { timeout: 15_000 }).toBe("2");
  // 모아는 아직 1층: 2층에 있는 동안 모아의 말풍선은 보이지 않는다
  await expect(page.locator(".ambient-bubble")).toHaveCount(0, { timeout: 2_000 });
  await page.waitForTimeout(4_000);
  await expect(page.locator(".ambient-bubble")).toHaveCount(0);
});
