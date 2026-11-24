import { test, expect, type Page } from "./fixtures";

// The 3D look prototype (/proto3d): the R3F scene renders without errors, a tree opens its card
// (name, growth, condition from app/core/model.ts), and tapping the ground walks the player.
// The scene exposes window.__proto3d (frames, player position, tree screen points) because the canvas has no DOM.
test.describe.configure({ timeout: 90_000 });
type Hooks = { frames: number; ready: boolean; player: { x: number; z: number }; trees: Record<number, { x: number; y: number }>; softMeshes: number; meshes: number; treeModels: number; weather?: string };
const hooks = (page: Page) => page.evaluate(() => (window as unknown as { __proto3d?: Hooks }).__proto3d ?? null);

async function open(page: Page, errors: string[], query = "") {
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()) });
  // the demo garden (seven holdings); a new player would land on the onboarding (proto3d-onboarding.spec.ts)
  await page.goto("/proto3d?demo" + query.replace("?", "&"));
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await hooks(page))?.frames ?? 0, { timeout: 30_000 }).toBeGreaterThan(10);
  // the four holding trees are Blender models (public/models/trees, app/proto3d/models.ts)
  await expect.poll(async () => (await hooks(page))?.treeModels ?? 0, { timeout: 30_000 }).toBeGreaterThanOrEqual(7);
}

// tools/blender/holding_tree.py writes every growth stage (two variants each) and the stump, with the agreed object names
test("every tree model file is served and holds trunk and leaf clumps", async ({ page }) => {
  await page.goto("/proto3d");
  const files = [...["seed", "sprout", "sapling", "young", "grand"].flatMap(g => [0, 1].map(v => `/models/trees/tree_${g}_${v}.glb`)), "/models/trees/stump.glb"];
  for (const f of files) {
    const res = await page.request.get(f);
    expect(res.ok(), f).toBe(true);
    const json = glbJson(await res.body());
    const names: string[] = (json.nodes ?? []).map((n: { name?: string }) => n.name ?? "");
    expect(names, f).toContain("trunk");
    if (!f.includes("stump")) expect(names.some(n => n.startsWith("leaf_")), f).toBe(true);
    if (/sapling|young|grand/.test(f)) expect(names, f).toContain("blossom");
  }
});
// the JSON chunk of a .glb: 12-byte header, then chunk length (4), chunk type (4), JSON bytes
function glbJson(buf: Buffer) {
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString("utf8"));
}

test("the 3D garden renders and a tree opens its card", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  const h = (await hooks(page))!;
  const size = page.viewportSize()!;
  // the tree whose top is on screen and lowest (nearest the camera, least likely to be hidden behind another)
  // ...whose spot is not under an analyst's bubble or a panel (the tap must reach the canvas)
  const free = await page.evaluate(pts => pts.filter(([, p]) => document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS").map(([k]) => k),
    Object.entries(h.trees).filter(([, p]) => p.x > 20 && p.x < size.width - 20 && p.y > 100 && p.y < size.height - 100));
  const near = Object.entries(h.trees).filter(([k]) => free.includes(k)).sort((a, b) => b[1].y - a[1].y)[0];
  // (the name tags and the villagers can cover every tree on a phone: then the tap goes through the hook, as a tap would)
  const id = near ? near[0] : "1";
  if (near) await page.mouse.click(near[1].x, near[1].y);
  else await page.evaluate(i => (window as unknown as { __proto3d: { pickTree: (id: number) => void } }).__proto3d.pickTree(i), Number(id));
  const card = page.getByRole("dialog", { name: /나무$/ });
  await expect(card).toBeVisible();
  const names = ["SK하이닉스", "NAVER", "카카오", "현대차", "한화에어로스페이스", "삼성전자", "POSCO홀딩스"];
  await expect(card).toContainText(names[Number(id) - 1]);
  // 처분효과 (core/recheck.ts): worth and share first, the same question on every card
  await expect(card).toContainText(/평가 .*원 · 정원의 [\d.]+%/);
  await expect(card.getByRole("group", { name: "다시 보기" })).toContainText("오늘 처음 본다면");
  await expect(card).not.toContainText(/팔아|사세요|매도|매수/);
  await card.getByRole("button", { name: "닫기" }).click();
  await expect(card).toBeHidden();
  expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);
});

// app/proto3d/materials.ts: the ground, trees, house, rocks and player all wear the one soft material;
// only glowing bits (windows, fire, fruit), water and butterflies are left on their own materials.
test("the scene wears the shared soft material and the sun haze sits under the UI", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  const h = (await hooks(page))!;
  expect(h.softMeshes).toBeGreaterThan(60);
  expect(h.softMeshes / h.meshes).toBeGreaterThan(0.55);
  const sun = page.locator(".proto3d-sun");
  await expect(sun).toHaveCSS("pointer-events", "none");
  await expect(sun).toHaveCSS("mix-blend-mode", "screen");
  // the haze must not swallow taps meant for the buttons
  await page.getByRole("button", { name: "지도" }).click();
  await expect(page.getByRole("dialog", { name: "정원 지도" })).toBeVisible();
  expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);
});

test("tapping the ground walks the player there", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  const before = (await hooks(page))!.player;
  const size = page.viewportSize()!;
  // left of the player, on open grass between the campfire and the pond
  await page.mouse.click(size.width * 0.3, size.height * 0.58);
  await expect.poll(async () => {
    const p = (await hooks(page))!.player;
    return Math.hypot(p.x - before.x, p.z - before.z);
  }, { timeout: 15_000 }).toBeGreaterThan(0.5);
  expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);
});

// R2: the sky is today's market (app/core/weather.ts); '?weather=' forces it for demos and tests
for (const [w, label] of [["clear", "맑음"], ["cloudy", "흐림"], ["storm", "비바람"], ["heat", "과열 땡볕"]] as const) {
  test(`market weather ${w} sets the sky, the chip and the scene`, async ({ page }) => {
    const errors: string[] = [];
    await open(page, errors, `?weather=${w}`);
    await expect(page.getByTestId("proto3d")).toHaveAttribute("data-weather", w);
    await expect(page.getByLabel("오늘 시장 날씨")).toContainText(label);
    expect((await hooks(page))!.weather).toBe(w);
    expect(errors.filter(e => !/deprecated/i.test(e))).toEqual([]);
  });
}

test("without a forced weather the market picks one, and every holding tree is in the garden", async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  const h = (await hooks(page))!;
  expect(["clear", "cloudy", "storm", "heat"]).toContain(h.weather);
  expect(Object.keys(h.trees)).toHaveLength(7);
  await expect(page.getByLabel("오늘 시장 날씨")).toContainText(/%/);
});
