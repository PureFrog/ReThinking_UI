import { test, expect } from "./fixtures";

// 루온 + /signal (2026-11-24; core/llm1/signal.ts, engine.ts signalStock, ui/Friend.tsx pickFirst/onPickTalk): talking to
// 루온 starts with my stocks; one picked goes to the server as that stock's code (the garden's own, not a made-up one) and
// the talk turns to detection mode, so the line carries the time. The server is stood in by __luonSignal / __luonTalk.
test.describe.configure({ timeout: 240_000 });

test("루온: pick a stock, the talk turns to detection mode on its code, with the time", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__luonSignal = async (code: string, name: string) => { w.__luonAsked = [code, name]; return { text: `…${name}. 처음에 왜 골랐는지부터 들어 볼게.`, emotion: "curious", at: "2026-11-24T14:05:00+09:00" } };
    w.__luonTalk = async (m: string) => { w.__luonHeard = m; return { text: "…그 이유가 틀렸다는 건 어떻게 알 수 있을까.", emotion: "thinking", at: "2026-11-24T14:06:00+09:00" } };
  });
  await page.goto("/proto3d?demo&hour=10&weather=clear");
  await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
  const bori = page.getByRole("dialog", { name: "보리와 대화" });
  await bori.waitFor({ timeout: 20_000 }).then(() => bori.getByRole("button", { name: "나중에 얘기할게" }).click()).catch(() => {});
  await expect(bori).toHaveCount(0, { timeout: 15_000 });

  // walk up to 루온 (its name tag), then "종목 골라 토론하기"
  await expect(page.locator('.vl-npc-tag[data-npc="luon"]')).toHaveCount(1, { timeout: 30_000 });
  await page.evaluate(() => (document.querySelector('.vl-npc-tag[data-npc="luon"]') as HTMLButtonElement).click());
  const go = page.getByRole("button", { name: "종목 골라 토론하기" });
  await expect(go).toBeVisible({ timeout: 90_000 });
  await go.click();

  const talk = page.getByRole("dialog", { name: "루온와 대화" });
  await expect(talk).toBeVisible();
  // the stocks stand first
  const choices = talk.getByRole("group", { name: "대답" });
  await expect(choices.getByRole("button", { name: "SK하이닉스" })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: info.outputPath(`luon-pick-${info.project.name}.png`) });
  await choices.getByRole("button", { name: "SK하이닉스" }).click();

  // the real code went to the server; detection mode answers with the time
  await expect.poll(() => page.evaluate(() => (window as unknown as { __luonAsked?: string[] }).__luonAsked)).toEqual(["000660", "SK하이닉스"]);
  await expect(talk.locator(".rt-talk-line")).toContainText("SK하이닉스. 처음에 왜 골랐는지", { timeout: 15_000 });
  await expect(talk.locator("time.rt-talk-at")).toHaveText("14:05");

  // a reply in the same talk
  await talk.getByRole("textbox", { name: "루온에게 말하기" }).fill("메모리 업황이 좋아질 것 같아서");
  await talk.getByRole("button", { name: "보내기" }).click();
  await expect(talk.locator(".rt-talk-line")).toContainText("어떻게 알 수 있을까", { timeout: 15_000 });
  await expect(talk.locator("time.rt-talk-at")).toHaveText("14:06");
  expect(await talk.innerText()).not.toMatch(/팔아|사세요|오를 거|떨어질 거/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: info.outputPath(`luon-talk-${info.project.name}.png`) });
  expect(errors).toEqual([]);
});

test("루온's stock list fits a portrait and a landscape phone", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "phone sizes");
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__luonSignal = async (_c: string, name: string) => ({ text: `…${name}. 처음에 왜 골랐는지부터 들어 볼게.`, emotion: "curious", at: "2026-11-24T14:05:00+09:00" });
  });
  for (const [w, h] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/proto3d?demo&hour=10&weather=clear");
    await expect(page.locator(".proto3d canvas")).toBeVisible({ timeout: 30_000 });
    const bori = page.getByRole("dialog", { name: "보리와 대화" });
    await bori.waitFor({ timeout: 20_000 }).then(() => bori.getByRole("button", { name: "나중에 얘기할게" }).click()).catch(() => {});
    await expect(bori).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('.vl-npc-tag[data-npc="luon"]')).toHaveCount(1, { timeout: 30_000 });
    await page.evaluate(() => (document.querySelector('.vl-npc-tag[data-npc="luon"]') as HTMLButtonElement).click());
    await page.getByRole("button", { name: "종목 골라 토론하기" }).click({ timeout: 90_000 });
    const talk = page.getByRole("dialog", { name: "루온와 대화" });
    const last = talk.getByRole("group", { name: "대답" }).getByRole("button").last();
    await expect(last).toBeVisible({ timeout: 15_000 });
    const b = await last.boundingBox(), list = await talk.getByRole("group", { name: "대답" }).boundingBox();
    expect(list!.y).toBeGreaterThanOrEqual(0);
    // a long list scrolls inside its own box; the box stays on the screen
    expect(b).not.toBeNull();
    expect(list!.y + list!.height).toBeLessThanOrEqual(h + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.waitForTimeout(400);
    await page.screenshot({ path: info.outputPath(`luon-pick-${w}x${h}.png`) });
    await talk.getByRole("group", { name: "대답" }).getByRole("button", { name: "SK하이닉스" }).click();
    await expect(talk.locator("time.rt-talk-at")).toHaveText("14:05", { timeout: 15_000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: info.outputPath(`luon-detect-${w}x${h}.png`) });
  }
});
