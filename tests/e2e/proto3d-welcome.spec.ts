import { test, expect, type Page } from "./fixtures";
import * as V from "./village";

// The first screens (app/proto3d/ui/Welcome.tsx): a brand-new visitor lands on the landing with the animated logo;
// sign up checks its fields and consents, then goes on to putting in holdings, then the tutorial. Log in finds the
// account kept on this device (no server yet); 가입 없이 둘러보기 skips straight to the holdings.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "a phone screen is enough"));
const welcome = (page: Page) => page.getByTestId("welcome");

test("sign up: the landing, the checks, then my holdings and the teacher's room", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?reset&landing&tutorial&weather=clear");
  await expect(welcome(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("img", { name: "rethinking!" }).first()).toBeVisible();
  // the logo plays through to the end
  await expect(page.locator(".rt-logo-anim")).toHaveAttribute("data-phase", "done", { timeout: 10_000 });
  await expect(welcome(page)).toContainText("투자 판단 정원");
  await expect(welcome(page)).toContainText("투자 권유를 목적으로 하지 않으며");
  await welcome(page).getByRole("button", { name: "시작하기", exact: true }).click();
  const form = page.getByRole("region", { name: "회원가입" });
  // nothing filled: every field and the consents say what is missing
  await form.getByRole("button", { name: "가입하고 시작하기" }).click();
  await expect(form).toContainText("이메일 형식을 확인해 주세요");
  await expect(form).toContainText("필수 항목에 동의해 주세요");
  await form.getByLabel("이메일", { exact: true }).fill("north@example.com");
  await form.getByLabel("비밀번호", { exact: true }).fill("garden123");
  await form.getByLabel("닉네임", { exact: true }).fill("북쪽창");
  // social log-in needs the server
  await form.getByRole("button", { name: /카카오로/ }).click();
  await expect(form.getByRole("alert")).toContainText("서버를 연결하면");
  await form.getByRole("checkbox", { name: "모두 동의" }).check();
  await form.getByRole("button", { name: "가입하고 시작하기" }).click();
  // on to my holdings, with my nickname already in
  await expect(welcome(page)).toHaveCount(0);
  const start = page.getByRole("dialog", { name: "내 종목 넣기" });
  await expect(start).toBeVisible();
  await expect(start.getByLabel("내 이름")).toHaveValue("북쪽창");
  // no password is kept on the device
  const kept = await page.evaluate(() => localStorage.getItem("rethink-account-v1") ?? "");
  expect(kept).toContain("north@example.com");
  expect(kept).not.toContain("garden123");
  // the example garden (the old tutorial is off since 2026-11-22, Proto3D tutOn): a new player starts in the room,
  // where 선생님 hands over the first quiz paper
  await start.getByRole("button", { name: "예시 정원으로 시작" }).click();
  await page.locator(".rt-skip-layer").click({ timeout: 8_000 }).catch(() => {});
  await expect(page.getByRole("dialog", { name: "선생님" })).toContainText("나는 이 방의 선생님이야", { timeout: 60_000 });
  expect(errors).toEqual([]);
});

test("log in finds the account on this device; looking around skips sign-up", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?reset&landing&weather=clear&welcome=login");
  const form = page.getByRole("region", { name: "로그인" });
  await expect(form).toBeVisible({ timeout: 30_000 });
  await form.getByLabel("이메일", { exact: true }).fill("someone@example.com");
  await form.getByLabel("비밀번호", { exact: true }).fill("garden123");
  await form.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("이 기기에 가입한 계정이 아니에요");
  // an account made on this device logs in
  await page.evaluate(() => localStorage.setItem("rethink-account-v1", JSON.stringify({ email: "north@example.com", nickname: "북쪽창", createdAt: "2026-11-14", consents: ["age14", "terms", "privacy", "overseas"], provider: "email" })));
  await page.goto("/proto3d?landing&weather=clear");
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible({ timeout: 30_000 });
  await expect(welcome(page)).toHaveCount(0);
  // a new visitor who only wants to look
  await page.evaluate(() => localStorage.clear());
  await page.goto("/proto3d?reset&landing&weather=clear");
  await welcome(page).getByRole("button", { name: "가입 없이 둘러보기" }).click();
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible();
});

// coming back without signing in: the landing comes first again even with a garden on this device; looking around
// lasts for this visit (a reload keeps it, a new visit asks again)
test("a returning visitor who is not signed in starts on the landing again", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/proto3d?reset&landing&weather=clear");
  await welcome(page).getByRole("button", { name: "가입 없이 둘러보기" }).click();
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("dialog", { name: "내 종목 넣기" })).toBeVisible({ timeout: 30_000 });
  await expect(welcome(page)).toHaveCount(0);
  // a new visit (new tab): the garden is still on this device, but the landing asks first
  const next = await context.newPage();
  // a new tab misses the fixture's scripts: keep it on device-only accounts (on the real server looking around is closed, 007)
  await next.addInitScript(() => { (window as unknown as { __localAuth?: boolean }).__localAuth = true });
  await next.setViewportSize({ width: 390, height: 844 });
  await next.goto("/proto3d?landing&weather=clear");
  await expect(welcome(next).getByRole("button", { name: "로그인", exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await welcome(next).getByRole("button", { name: "가입 없이 둘러보기" }).click();
  await expect(welcome(next)).toHaveCount(0);
});
