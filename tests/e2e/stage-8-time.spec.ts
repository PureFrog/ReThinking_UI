import { test, expect, type Page } from "./fixtures";
import { clickWorld } from "./helpers";

// ux-spec 4장 time modes. Realtime (the default): the day's first friend comes as the garden opens, picked by a reason,
// and a friend who came while the player was away leaves traces (footprints, wet soil, a note, maybe a gift).
// Demo: the quick timings, moa after 18 s, no traces.
test.describe.configure({ timeout: 90_000 });
const data = (page: Page, k: string) => page.locator(".game canvas").evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? "", k);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("little-garden-v3") ?? "{}"));
async function open(page: Page, state: object, url = "/") {
  await page.addInitScript(([s]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("little-garden-v3", JSON.stringify(s));
  }, [state] as const);
  await page.goto(url);
  await expect(page.locator(".game canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
}
const live = { settings: { timeMode: "realtime" } };

test("realtime: a new garden — moa comes right away for the trees in loss, nothing was left", async ({ page }) => {
  await open(page, live);
  await expect.poll(() => data(page, "firstVisit"), { timeout: 10_000 }).toBe("moa");
  // as the garden opens, not after the demo's 18 s
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
  expect(await data(page, "traces")).toBe("");
  const s = await saved(page);
  expect(typeof s.lastSeen).toBe("number");
  expect(s.lossSeen.sort()).toEqual([3, 4]);
});

test("realtime: back after hours away — tori comes for the mock event, another friend left traces", async ({ page }) => {
  // the losses were already seen, the mock event (새봄반도체) not talked through yet
  await open(page, { ...live, lossSeen: [3, 4], lastSeen: Date.now() - 8 * 3600_000 });
  await expect.poll(() => data(page, "firstVisit"), { timeout: 10_000 }).toBe("tori");
  await expect.poll(() => data(page, "traces"), { timeout: 10_000 }).toMatch(/^footprints soil:\d$/);
  const s = await saved(page);
  expect(s.away.friend).not.toBe("tori");
  expect(String(s.away.soil)).toBe((await data(page, "traces")).split(":")[1]);
  // the note waits in the mailbox, written by that friend
  await expect.poll(() => data(page, "letter"), { timeout: 10_000 }).toBe("1");
  const note = s.friendLetters.find((l: any) => l.id.startsWith("away-"));
  expect(note.from).toBe(s.away.friend);
  await expect(page.locator(".ambient-bubble")).toBeVisible({ timeout: 15_000 });
  await page.locator(".ambient-bubble").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  await clickWorld(page, 485, 527);
  // the player walks over to the mailbox first
  await expect(page.locator(".object-panel")).toBeVisible({ timeout: 20_000 });
  const letter = page.locator(".object-panel .friend-letter").first();
  await expect(letter).toContainText(note.lines[0]);
  await expect(letter).toContainText("두고 간 편지");
  await page.keyboard.press("Escape");
  await expect.poll(() => data(page, "letter")).toBe("0");
  // reopening the same day: the traces stay, no second note
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => data(page, "traces"), { timeout: 10_000 }).toMatch(/^footprints/);
  expect((await saved(page)).friendLetters.filter((l: any) => l.id.startsWith("away-"))).toHaveLength(1);
});

test("realtime: '?away=N' opens as if away N hours; a journal left long brings luon", async ({ page }) => {
  const old = new Date(Date.now() - 20 * 86400_000), day = old.getFullYear() + "-" + String(old.getMonth() + 1).padStart(2, "0") + "-" + String(old.getDate()).padStart(2, "0");
  await open(page, { ...live, lossSeen: [3, 4], decision: "유지", journal: [{ id: "j", holdingId: 2, name: "별숲게임즈", day, saw: "", think: "신작 기대", mood: "" }] }, "/?away=7");
  await expect.poll(() => data(page, "firstVisit"), { timeout: 10_000 }).toBe("luon");
  await expect.poll(() => data(page, "traces"), { timeout: 10_000 }).toMatch(/^footprints/);
});

test("demo mode (the saved setting): moa after the quick timing, no traces", async ({ page }) => {
  await open(page, { ...live, lastSeen: Date.now() - 8 * 3600_000 });
  await expect.poll(() => data(page, "firstVisit"), { timeout: 10_000 }).toBe("moa");
  // the setting applies from the next opening
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("little-garden-v3")!); s.settings.timeMode = "demo"; s.lastSeen = Date.now() - 8 * 3600_000; delete s.away; s.friendLetters = []; localStorage.setItem("little-garden-v3", JSON.stringify(s)) });
  await page.reload();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => data(page, "firstVisit"), { timeout: 10_000 }).toBe("moa");
  await page.waitForTimeout(5_000);
  expect(await data(page, "traces")).toBe("");
  await expect(page.locator(".ambient-bubble")).toHaveCount(0);
});

test("the 시연 모드 switch sits in the journal's 성장 기준 page and is saved", async ({ page }) => {
  await open(page, live);
  await page.locator(".ambient-bubble").waitFor({ timeout: 15_000 }).catch(() => {});
  await page.locator(".ambient-bubble").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  await clickWorld(page, 700, 298);
  await expect(page.locator(".object-panel")).toHaveAttribute("data-skin", "notebook", { timeout: 20_000 });
  await page.getByRole("button", { name: "성장 기준" }).click();
  const sw = page.getByRole("switch", { name: "시연 모드" });
  await expect(sw).not.toBeChecked();
  await sw.check();
  await expect.poll(async () => (await saved(page)).settings.timeMode).toBe("demo");
});

// ux-spec 4장 day, evening, night by Seoul time ('?hour=N' fixes the hour)
for (const [hour, part, label] of [[10, "day", "포근한 낮"], [18, "evening", "노을 지는 저녁"], [23, "night", "조용한 밤"]] as const) {
  test(`time of day: ${hour}시 is ${part}`, async ({ page }) => {
    await open(page, live, `/?hour=${hour}`);
    await expect(page.locator(".world-weather .daypart")).toHaveText(label);
    await expect.poll(() => data(page, "daypart"), { timeout: 10_000 }).toBe(part);
  });
}
