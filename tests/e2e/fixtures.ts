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
    await use(page);
  },
});
export { expect };
export type { Page } from "@playwright/test";
