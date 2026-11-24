// 유저 워크플로우 (PM 2026-11-21, docs/user-workflow.md): a new account from the entry to the end of the first walk.
// The list confirmed at the entry goes into the room; the first lesson (paper → level → lock → one paper → door); the
// village's first walk station by station: 보리 on the square, the farmer plants my stock, the merchant's communicator
// (the day before's news, the free tree), the farmer's practice harvest into the cart, the librarian's journal, the
// news board, 나루's fishing, the two shops. Only the current station's person opens.
import { test, expect, type Page } from "./fixtures";
import { answerPaper } from "./quiz-answer";
test.describe.configure({ timeout: 600_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "one screen is enough"));
type Hk = { walk?: { on: boolean; step: string | null; n: number; planted: boolean; talk: { id: string; phase: string; stage: string | null } | null; merchant: boolean; pile: number; errand?: boolean }; trees?: Record<string, unknown>; view?: { eyeTalk?: boolean } };
const hk = (p: Page) => p.evaluate(() => (window as unknown as { __proto3d?: Hk }).__proto3d ?? {});
const talk = (p: Page) => p.locator(".vl-villager");
const say = async (p: Page, choice: string) => { await talk(p).getByRole("button", { name: choice }).click() };
// a tap on the person's name tag (the far ones are off screen: the same tap through the page's hook)
const IDS: Record<string, string> = { 농부: "farmer", 상인: "merchant", 사서: "librarian", "신문 배달": "paperboy", "건물 상인": "builder", "옷 상인": "tailor" };
const go = async (p: Page, who: string) => {
  const tag = p.getByRole("button", { name: `${who}에게 말 걸기` });
  if (await tag.isVisible() && await tag.evaluate(el => { const r = el.getBoundingClientRect(); return r.left > 0 && r.top > 0 && r.right < innerWidth && r.bottom < innerHeight })) await tag.click({ force: true, timeout: 5_000 }).catch(() => p.evaluate(id => (window as unknown as { __proto3d: { meet: (id: string) => void } }).__proto3d.meet(id), IDS[who]));
  else await p.evaluate(id => (window as unknown as { __proto3d: { meet: (id: string) => void } }).__proto3d.meet(id), IDS[who]);
};

test("the first walk: entry → room lesson → the village's people one by one", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/?fresh&tutorial&hour=10&weather=clear");
  // the entry: a stock typed in, confirmed, and into the room (nothing planted yet)
  await page.getByRole("button", { name: /직접 입력/ }).click();
  await page.getByLabel("1번 종목 이름").fill("삼성전자");
  await page.getByRole("button", { name: /정원에 넣기/ }).click();
  await expect(page.getByTestId("house")).toBeVisible({ timeout: 20_000 });
  // the first lesson
  await expect(page.locator(".rt-talk-line")).toContainText("문제 하나 풀어 보자");
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __proto3d?: { house?: { paper: string } } }).__proto3d?.house?.paper))).toBe("glow");
  await page.getByRole("button", { name: "종이 누르기" }).click();
  await expect(page.locator(".hs-chip[data-hl=true]")).toBeVisible();
  await page.getByRole("button", { name: /^\W*응$/ }).click();
  await expect(page.locator(".hs-plate[data-hl=true]")).toBeVisible();
  await expect(page.locator(".rt-talk-line")).toContainText("퀴즈 Lv.5에 열려");
  await page.getByRole("button", { name: "종이 펼치기" }).click();
  await answerPaper(page);
  await expect(page.locator(".hs-back")).toContainText("정답");
  await page.getByRole("button", { name: "해설 봤어 · 고개 들기" }).click();
  await expect(page.locator(".rt-talk-line")).toContainText("문 열어 둘게");
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __proto3d?: { house?: { door: boolean } } }).__proto3d?.house?.door))).toBe(true);
  await page.screenshot({ path: info.outputPath("1-lesson-door.png") });
  await page.getByRole("button", { name: "밖으로 나가기" }).click();
  await expect(page.getByTestId("proto3d")).toHaveAttribute("data-place", "village");
  // the square: 보리 shows the way; my tree is not planted yet
  await expect(talk(page)).toContainText("빛나는 길을 따라");
  expect((await hk(page)).walk?.planted).toBe(false);
  // 보리 introduces each one: the camera comes down to the eye in front of them, they say who they are
  // 피드백 2026-11-22 (튜토리얼 느낌): nobody walks me. The one to meet is lit (light, ring, a bold trail, the rest dimmed),
  // I go there myself (here: a tap on them), and the talk opens when I am there, from my eyes
  const SHOPS = ["librarian", "builder", "tailor"];
  // 유저 워크플로우 (2026-11-23): only its people, in its order (no analysts)
  const MEET_IDS = ["farmer", "merchant", "librarian", "paperboy", "naru", "builder", "tailor"];
  for (const [i, who] of ["농부", "상인", "사서", "신문 배달", "나루", "건물 상인", "옷 상인"].entries()) {
    await expect.poll(async () => (await hk(page) as { walk?: { lead?: unknown } }).walk?.lead, { timeout: 20_000 }).toBeTruthy();
    await expect(page.locator(".vl-guide")).toContainText(who);
    if (i === 0) {
      const at = (await hk(page) as { player?: { x: number; z: number } }).player;
      await page.waitForTimeout(2000);
      const now = (await hk(page) as { player?: { x: number; z: number } }).player;
      expect(Math.hypot((now?.x ?? 0) - (at?.x ?? 0), (now?.z ?? 0) - (at?.z ?? 0))).toBeLessThan(0.3);
      expect((await hk(page)).walk?.talk).toBeNull();
      await page.screenshot({ path: info.outputPath("1a-lead-tori.png") });
    }
    await page.evaluate(id => (window as unknown as { __proto3d: { meet: (id: string) => void } }).__proto3d.meet(id), MEET_IDS[i]);
    await expect(page.locator(".vl-villager .rt-talk-name")).toContainText(who, { timeout: 40_000 });
    await expect(page.locator(".vl-villager .rt-talk-role")).not.toBeEmpty();
    // 27장: the shops and the librarian are met inside their own building (3인칭), the rest from my eyes
    if (SHOPS.includes(MEET_IDS[i])) await expect.poll(async () => (await hk(page) as { shop?: string | null }).shop, { timeout: 15_000 }).toBe(MEET_IDS[i]);
    else await expect.poll(async () => (await hk(page)).view?.eyeTalk, { timeout: 15_000 }).toBe(true);
    if (i === 2) await page.screenshot({ path: info.outputPath("1d-meet-librarian.png") });
    if (i === 0) await page.screenshot({ path: info.outputPath("1c-meet-farmer.png") });
    await say(page, i === 6 ? "산책 시작" : "다음 사람");
  }
  await expect(page.locator(".vl-guide")).toContainText("농부");
  await expect(page.locator(".vl-npc-tag[data-hl=true]")).toHaveText(/농부/);
  // another person does not open yet: 보리's hint, and I walk to the farmer instead
  await go(page, "상인");
  await expect(page.locator(".rt-toast")).toContainText("농부");
  await go(page, "농부");
  // the farmer: walking up, then face to face (the camera at my eyes), then the talk
  await expect.poll(async () => (await hk(page)).walk?.talk?.phase, { timeout: 30_000 }).toBe("talk");
  await expect(talk(page)).toContainText("심어 줄게");
  await expect.poll(async () => (await hk(page)).view?.eyeTalk).toBe(true);
  await page.screenshot({ path: info.outputPath("2-farmer-talk.png") });
  await say(page, "심어 줘");
  await expect(talk(page)).toContainText("다 심었어", { timeout: 30_000 });
  expect((await hk(page)).walk?.planted).toBe(true);
  await say(page, "알겠어");
  await say(page, "가상 밭으로");
  // the merchant (10:00, open): the start coins (no free tree: the virtual field is where buying and selling is tried,
  // with game coins), the communicator, the day before's news, a buy with coins
  await go(page, "상인");
  await expect(talk(page)).toContainText("사고팔기는 여기서", { timeout: 40_000 });
  await say(page, "코인 받고 통신기 보기");
  const comm = page.getByRole("dialog", { name: "상인의 통신기" });
  await expect(comm.locator(".vl-cand")).toHaveCount(5);
  await comm.locator(".vl-cand").first().click();
  await expect(comm.getByRole("button", { name: "전날 뉴스를 먼저 읽어요" })).toBeDisabled();
  await comm.getByRole("button", { name: "기사 읽기" }).click();
  await comm.getByRole("button", { name: "한 주 더" }).click();
  await page.screenshot({ path: info.outputPath("3-communicator.png") });
  await comm.getByRole("button", { name: /주문 확인 · 코인/ }).click();
  await expect(talk(page)).toContainText("심었어!", { timeout: 30_000 });
  await say(page, "농부한테 가기");
  // selling: 0 cannot be confirmed; the farmer goes to the tree, picks, carries it to the cart, then says when it is paid
  await go(page, "농부");
  await expect(talk(page)).toContainText("내가 가서 따서", { timeout: 40_000 });
  await say(page, "매도할 수량 정하기");
  const harvest = page.getByRole("dialog", { name: "가상 종목 매도" });
  await expect(harvest.getByRole("button", { name: "수량을 골라요" })).toBeDisabled();
  await harvest.getByLabel("매도 수량").fill("1");
  await harvest.getByRole("button", { name: "1주 수확 확정" }).click();
  await expect.poll(async () => (await hk(page)).walk?.errand, { timeout: 5_000 }).toBe(true);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: info.outputPath("3b-farmer-picks.png") });
  await expect(talk(page)).toContainText("수레에 실었어", { timeout: 60_000 });
  await expect.poll(async () => (await hk(page)).walk?.pile).toBe(1);
  await say(page, "도서관으로");
  // the library (유저 워크플로우 2026-11-23: after selling, before the news)
  await expect.poll(async () => (await hk(page)).walk?.step).toBe("librarian");
  await page.evaluate(() => (window as unknown as { __proto3d: { walkPass: (s: string) => void } }).__proto3d.walkPass("librarian"));
  // the news board
  await go(page, "신문 배달");
  await expect(talk(page)).toContainText("오늘 신문", { timeout: 40_000 });
  await say(page, "표지판 보기");
  await expect(page.getByRole("dialog", { name: "뉴스 표지판" })).toContainText("예시 기사");
  await page.screenshot({ path: info.outputPath("4-news.png") });
  await page.getByRole("dialog", { name: "뉴스 표지판" }).getByRole("button", { name: "닫기" }).first().click();
  await expect.poll(async () => (await hk(page)).walk?.step).toBe("fisher");
  await page.evaluate(() => (window as unknown as { __proto3d: { walkPass: (s: string) => void } }).__proto3d.walkPass("fisher"));
  // the shops
  await go(page, "건물 상인");
  await expect(talk(page)).toContainText("건물을 코인으로", { timeout: 40_000 });
  await say(page, "물건 보기");
  await page.getByRole("button", { name: "닫기" }).first().click();
  await expect.poll(async () => (await hk(page)).walk?.step).toBe("shop-wear");
  await go(page, "옷 상인");
  await expect(talk(page)).toContainText("옷 구경", { timeout: 40_000 });
  await say(page, "옷 보기");
  await page.getByRole("button", { name: /닫기|돌아가기/ }).first().click();
  await expect(talk(page)).toContainText("마음대로 다녀", { timeout: 20_000 });
  await say(page, "좋아");
  await expect.poll(async () => (await hk(page)).walk?.on).toBe(false);
  // a tree opens its status, read only
  await page.screenshot({ path: info.outputPath("5-free.png") });
  // 피드백 2026-11-22: back into the house after the first lesson: the room from outside (3인칭) with the teacher and the
  // librarian, who say what they do the first time; the teacher keeps the quizzes I did
  await page.evaluate(() => (window as unknown as { __proto3d: { landmark?: (k: string) => void } }).__proto3d.landmark?.("house"));
  await expect.poll(async () => page.evaluate(() => (window as unknown as { __proto3d?: { inside?: boolean } }).__proto3d?.inside), { timeout: 15_000 }).toBe(true);
  await expect(talk(page)).toContainText("책상 뒤에", { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: info.outputPath("6-room-teacher.png") });
  await say(page, "다음");
  await expect(talk(page)).toContainText("투자일지", { timeout: 15_000 });
  await page.screenshot({ path: info.outputPath("6b-room-librarian.png") });
  await say(page, "알겠어");
  await page.getByRole("button", { name: /선생님 · 지난 퀴즈/ }).click({ force: true });
  await expect(page.getByRole("dialog", { name: "지난 퀴즈" }).locator(".qr-item")).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("7-quizlog.png") });
  expect(errors).toEqual([]);
});
