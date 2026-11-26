import { test, expect } from "./fixtures";
import { villageReady, openSheet } from "./village";

// 가상 종목 on real closes (core/virtual.ts, 2026-11-23): a lot bought on real closes is valued at the latest real close;
// a lot bought on the mock walk stays on it even when real closes for that stock are loaded (no mock cost against a
// real price). The server's bars are stood in for by window.__priceFixture.
test.describe.configure({ timeout: 240_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));

function series(close: number) {
  const out: { d: string; o: number; h: number; l: number; c: number; v: number }[] = [];
  let t = Date.parse("2026-10-01T00:00:00Z");
  for (let i = 0; i < 30; i++) {
    while ([0, 6].includes(new Date(t).getUTCDay())) t += 864e5;
    out.push({ d: new Date(t).toISOString().slice(0, 10), o: close, h: close, l: close, c: close, v: 1000 });
    t += 864e5;
  }
  return out;
}

test("the communicator values a real lot at the real close and keeps a mock lot on the mock walk", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(f => { (window as unknown as { __priceFixture?: unknown }).__priceFixture = f },
    { names: [], bars: { "196170": series(123400), "028300": series(987600) } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?demo&weather=clear");
  await villageReady(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("rethink-garden-v1")!);
    s.currency = 1_000_000; s.grants = [...(s.grants ?? []), "tour"];
    s.virtual = [
      { id: 1, code: "196170", name: "알테오젠", qty: 2, cost: 120000, plot: 9, day: "2026-10-05", src: "real" },
      { id: 2, code: "028300", name: "HLB", qty: 1, cost: 61200, plot: 10, day: "2026-10-05", src: "mock" },
    ];
    localStorage.setItem("rethink-garden-v1", JSON.stringify(s));
  });
  await page.goto("/proto3d?weather=clear");
  await villageReady(page);
  // (the village screen has no fixed 통신기 button in every state: open the sheet as the button does)
  await openSheet(page, { kind: "comm" });
  const comm = page.getByRole("dialog", { name: "모의투자" });
  await expect(comm).toContainText("알테오젠");
  await expect(comm).toContainText("123,400");
  await expect(comm).toContainText("HLB");
  await expect(comm).not.toContainText("987,600");          // HLB was bought on the mock walk
  await page.screenshot({ path: test.info().outputPath("virtual-real.png") });
  expect(errors).toEqual([]);
});
