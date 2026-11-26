import { test as base, expect } from "@playwright/test";

// ux-spec 4장: the app opens in realtime mode, where the day's friend comes as the garden opens. Most tests were written
// for demo mode (moa after 18 s), so every page starts in demo mode unless the test's own save says otherwise
// (settings.timeMode "realtime", as in stage-8-time.spec.ts). A save a test seeds keeps its own settings.
const KEY = "little-garden-v3";
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((key) => {
      const set = Storage.prototype.setItem;
      const demo = (v: string) => { try { const s = JSON.parse(v); if (s && typeof s === "object") { s.settings = { timeMode: "demo", ...s.settings }; return JSON.stringify(s) } } catch {} return v };
      Storage.prototype.setItem = function (k: string, v: string) { return set.call(this, k, k === key && this === localStorage ? demo(v) : v) };
      // "?fresh" opens as a brand-new player (no save at all: the onboarding, stage-9-onboarding.spec.ts)
      if (!localStorage.getItem(key) && !new URLSearchParams(location.search).has("fresh")) set.call(localStorage, key, JSON.stringify({ settings: { timeMode: "demo" } }));
    }, KEY);
    // the first-run tutorial (app/proto3d/ui/Home.tsx) covers the screen; tests start without it unless the address has ?tutorial
    await page.addInitScript(() => { (window as unknown as { __noTutorial?: boolean }).__noTutorial = !new URLSearchParams(location.search).has("tutorial") });
    // the first screens (app/proto3d/ui/Welcome.tsx) cover a brand-new player; tests start past them unless the address has ?landing
    await page.addInitScript(() => { (window as unknown as { __noLanding?: boolean }).__noLanding = !new URLSearchParams(location.search).has("landing") });
    // the first entry's introductions (app/proto3d/ui/Intro.tsx): tests start past them unless the address has ?intro
    await page.addInitScript(() => { (window as unknown as { __noIntro?: boolean }).__noIntro = !new URLSearchParams(location.search).has("intro") });
    // every visit starts in the house (app/proto3d/ui/House.tsx, PM 설계 2026-11-19); tests written for the village start
    // outside unless the address has ?house
    await page.addInitScript(() => { (window as unknown as { __noHouse?: boolean }).__noHouse = !new URLSearchParams(location.search).has("house") });
    // accounts stay on the device in e2e, even when .env.local points at the Supabase project (app/proto3d/server.ts)
    // 피드백 2026-11-22: a long talk line is shown one or two sentences a bubble; tests see it whole unless the address has ?pages
    await page.addInitScript(() => { (window as unknown as { __talkAll?: boolean }).__talkAll = !new URLSearchParams(location.search).has("pages") });
    await page.addInitScript(() => { (window as unknown as { __localAuth?: boolean }).__localAuth = true });
    // 보리 and 루온 stroll round their spots (피드백 2026-11-26); tests keep them still unless the address has ?wander
    // the 통신기's first-time guide cards (ui/CommPlus.tsx) stay away unless the address says ?commguide
    await page.addInitScript(() => { try { if (!new URLSearchParams(location.search).has("commguide")) localStorage.setItem("rethink-comm-guide", "1"); if (!new URLSearchParams(location.search).has("firstbuy")) localStorage.setItem("rethink-firstbuy", "1"); } catch { /* no storage */ } });
    await page.addInitScript(() => { (window as unknown as { __noWander?: boolean }).__noWander = !new URLSearchParams(location.search).has("wander") });
    // on a stop-loss day 보리 walks up and opens its talk over everything (the demo garden always has one, 예시 신호);
    // tests start with today's visit already had unless the address has ?bori (the day as the app counts it, ?ahead=N)
    await page.addInitScript(() => {
      const q = new URLSearchParams(location.search);
      if (q.has("bori")) return;
      const d = new Date(Date.now() + (Number(q.get("ahead")) || 0) * 86400000);
      const day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      try { localStorage.setItem("rethink-friend-day", day) } catch { /* storage off */ }
    });
    await use(page);
  },
});
export { expect };
export type { Page } from "@playwright/test";
