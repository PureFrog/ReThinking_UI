import { defineConfig, devices } from "@playwright/test";

// 화면 크기는 CLAUDE.md·tests/e2e/README.md 기준: 데스크톱 1400×1050, 모바일 375×812.
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/artifacts",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Headless Chromium falls back to software WebGL on macOS, which makes each Phaser
    // frame ~130ms and slows every timer (typing, bubbles) about tenfold. Metal fixes it.
    launchOptions: { args: process.platform === "darwin" ? ["--use-angle=metal"] : [] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1050 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
