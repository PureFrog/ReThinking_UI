// R3–R6 core: judgments and grading, cooldown, today's case, league, and the new-tone lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const J = await load('core/judgment');
const CD = await load('core/cooldown');
const CS = await load('core/cases');
const LG = await load('core/league');
const {LINES, UI, ANALYSTS, MODEL_INFO, line, say} = await load('content/analysts');
const {mockSignals} = await load('content/signals');
const {CASES} = await load('content/cases');
const {mockAfter} = await load('content/outcomes');
const {DEMO_HOLDINGS, GARDEN_PLOTS} = await load('content/demo-garden');
const PF = await load('core/portfolio');
const {kindOf} = await load('content/portfolio');
const {GARDEN_ITEMS, CART_STOCK, giftOf} = await load('content/garden-items');

const j = (o = {}) => ({id: 'j1', holdingId: 7, name: '강철중공업', day: '2026-08-01', choice: 'hold', reason: '수주 잔고', confidence: 4, rate: -10, ...o});

test('a hit depends on the choice and what the stock did after', () => {
  assert.equal(J.hitOf('review', -5), true);
  assert.equal(J.hitOf('review', -4.9), false);
  assert.equal(J.hitOf('hold', -4.9), true);
  assert.equal(J.hitOf('hold', -5), false);
  assert.equal(J.hitOf('watch', 9.9), true);
  assert.equal(J.hitOf('watch', -10), false);
});

test('points reward a sure hit most and charge a sure miss', () => {
  assert.equal(J.pointsOf(true, 5), 20);
  assert.equal(J.pointsOf(true, 1), 10);
  assert.equal(J.pointsOf(false, 5), -10);
  assert.equal(J.pointsOf(false, 1), 0);
});

test('a judgment needs a choice, a confidence and a short reason; one per tree per day', () => {
  assert.equal(J.canRecord({choice: 'hold', confidence: 3, reason: '  '}), false);
  assert.equal(J.canRecord({choice: 'hold', confidence: 3, reason: 'x'.repeat(61)}), false);
  assert.equal(J.canRecord({choice: 'hold', confidence: 3, reason: '이유'}), true);
  const a = J.record([], j());
  assert.equal(a.first, true);
  const b = J.record(a.list, j({id: 'j2', reason: '다시'}));
  assert.equal(b.first, false);
  assert.equal(b.list.length, 1);
  assert.equal(b.list[0].reason, '다시');
});

test('grades come due at 30 and 90 days, the 30-day one first', () => {
  const list = [j()];
  assert.deepEqual(J.dueGrades(list, [], '2026-08-30'), []);
  const d30 = J.dueGrades(list, [], '2026-08-31');
  assert.equal(d30[0].mark, 30);
  const g = J.grade(list[0], 30, -11, '2026-08-31');
  assert.equal(g.hit, false);
  assert.equal(g.signalRight, null);
  assert.equal(J.dueGrades(list, [g], '2026-10-29').length, 0);
  assert.equal(J.dueGrades(list, [g], J.shiftDay('2026-08-01', 90))[0].mark, 90);
  // long past both marks and nothing shown yet: the 30-day one comes first
  assert.equal(J.dueGrades(list, [], '2026-12-30')[0].mark, 30);
  // a judgment on a signal: the signal was right when it kept falling
  assert.equal(J.grade(j({signalId: 's'}), 30, -8, 'x').signalRight, true);
});

test('the track record reads hit rate and calibration from the grades', () => {
  const list = [j(), j({id: 'j2', choice: 'review', confidence: 2})];
  const graded = [J.grade(list[0], 30, -11, 'd'), J.grade(list[1], 30, -11, 'd')];
  const t = J.trackOf(list, graded);
  assert.equal(t.graded, 2);
  assert.equal(t.hits, 1);
  assert.equal(t.hitRate, 50);
  // brier: hold miss at 0.8 -> 0.64, review hit at 0.6 -> 0.16, mean 0.4 -> 60
  assert.equal(t.calibration, 60);
  assert.equal(t.points, -7 + 13);
  assert.equal(J.trackOf([], []).hitRate, null);
});

test('cooldown: deciding after 24 hours counts as waited, earlier does not', () => {
  const t0 = Date.UTC(2026, 10, 12, 9);
  let list = CD.startCooldown([], 3, t0);
  assert.equal(CD.startCooldown(list, 3, t0 + 5).length, 1);
  const c = CD.openFor(list, 3);
  assert.equal(CD.isReady(c, t0 + 23 * 3600000), false);
  assert.equal(CD.leftLabel(c, t0 + 22.5 * 3600000), '1시간 30분');
  const early = CD.finishCooldown(list, c.id, t0 + 3600000);
  assert.equal(early.waited, false);
  const late = CD.finishCooldown(list, c.id, t0 + 24 * 3600000);
  assert.equal(late.waited, true);
  assert.equal(CD.flowersOn(late.list, 3), 1);
  assert.deepEqual(CD.impulseOf(late.list), {done: 1, waited: 1, rate: 100});
  assert.equal(CD.openFor(late.list, 3), null);
});

test("today's case is steady per day, skips solved ones, and scores hints lower", () => {
  const a = CS.caseOfDay(CASES, '2026-11-12'), b = CS.caseOfDay(CASES, '2026-11-12');
  assert.equal(a.id, b.id);
  assert.notEqual(CS.caseOfDay(CASES, '2026-11-12', [a.id]).id, a.id);
  assert.equal(CS.caseOfDay(CASES, '2026-11-12', CASES.map(c => c.id)).id, a.id);
  assert.equal(CS.answerCase(a, a.answer, false, 'd').points, 5);
  assert.equal(CS.answerCase(a, a.answer, true, 'd').points, 3);
  assert.equal(CS.answerCase(a, null, false, 'd').correct, false);
  for (const c of CASES) {
    assert.ok(c.choices.some(x => x.id === c.answer), c.id);
    assert.ok(MODEL_INFO[c.reveal.firstCaught], c.id);
    for (const h of c.hints) assert.ok(MODEL_INFO[h.model], c.id);
    // the hidden facts never give the name away
    assert.ok(!JSON.stringify(c.facts).includes(c.reveal.name), c.id);
  }
  assert.ok(CASES.some(c => c.answer === 'recover'), 'at least one case where the signal was wrong');
});

test('league weeks run Monday to Sunday and rank by points', () => {
  assert.equal(LG.weekOf('2026-11-12'), '2026-11-09');
  assert.equal(LG.weekOf('2026-11-15'), '2026-11-09');
  assert.equal(LG.weekOf('2026-11-16'), '2026-11-16');
  const pts = LG.weekPoints([{points: 10, day: '2026-11-10'}, {points: 7, day: '2026-11-02'}], [{points: 5, day: '2026-11-12'}], '2026-11-12');
  assert.equal(pts, 15);
  const r = LG.ranked([{id: 'a', name: 'A', points: 3}, {id: 'b', name: 'B', points: 9}, {id: 'c', name: 'C', points: 1}, {id: 'd', name: 'D', points: 5}]);
  assert.deepEqual(r.map(x => x.id), ['b', 'd', 'a', 'c']);
  assert.deepEqual(r.map(x => x.promote), [true, true, true, false]);
  assert.equal(LG.tierOf(0), 'rookie');
  assert.equal(LG.tierOf(95), 'senior');
  // a sure call that missed can take the total below zero: still the first tier, not a crash
  assert.equal(LG.tierOf(-7), 'rookie');
});

// redesign 2장: short, dry, no comfort, no buy/sell, no price calls
const BANNED = /괜찮|천천히|마음|네 속도|옆에 있|~|팔아|사세요|매수하세요|매도하세요|오를 거|오를걸|떨어질 거/;
test('every analyst line keeps the tone rules', () => {
  const all = [];
  const walk = v => typeof v === 'string' ? all.push(v) : Object.values(v).forEach(walk);
  walk(LINES); walk(UI);
  for (const s of mockSignals(DEMO_HOLDINGS, 'd')) { all.push(s.headline, s.say, ...Object.values(s.counter)) }
  for (const c of CASES) all.push(c.reveal.lesson, ...c.hints.map(h => h.text));
  for (const i of GARDEN_ITEMS) if (i.note) all.push(i.note);
  for (const a of ANALYSTS) all.push(a.tagline);
  for (const s of all) {
    assert.ok(s.length <= 40, `${s.length}: ${s}`);
    assert.doesNotMatch(s, BANNED, s);
  }
  assert.equal(line(UI.streak, {n: 3}), '연속 3일');
});

// redesign 2·3장: three voices, several lines per moment, and the game's own words kept out of their mouths
test('each analyst speaks in their own lines, varied but steady for the same moment', () => {
  for (const k of ['greet', 'idle', 'signedOff']) {
    const [t, m] = [LINES[k].tori, LINES[k].moa].map(v => [v].flat());
    assert.ok(t.every(x => !m.includes(x)), k);
    assert.ok(t.length >= 2 && m.length >= 2, k + ' has variants');
  }
  assert.equal(say(LINES.rebuttalKept, 'j-1'), say(LINES.rebuttalKept, 'j-1'));
  const seen = new Set(Array.from({length: 40}, (_, i) => say(LINES.rebuttalIntro, 'j-' + i)));
  assert.equal(seen.size, LINES.rebuttalIntro.length);
  assert.equal(say(LINES.greet.tori, 'x', {name: '강철중공업'}).includes('강철중공업'), true);
  assert.match(say(LINES.again, 'j', {choice: '홀드'}), /홀드/);
  // rules and counts are UI text: no character line explains the scoring schedule or a count by itself
  const spoken = []; const walk = v => typeof v === 'string' ? spoken.push(v) : Object.values(v).forEach(walk); walk(LINES);
  for (const s of spoken) assert.doesNotMatch(s, /채점한다|^연속 |^맞음|^아님|없음.?$/, s);
});

test('signals, outcomes and items line up with the demo garden', () => {
  const s = mockSignals(DEMO_HOLDINGS, '2026-11-12');
  assert.equal(s.length, 5);
  for (const x of s) assert.equal(MODEL_INFO[x.model].analyst, x.analyst);
  assert.ok(mockAfter(7, '2026-08-01', 90) < -15);
  assert.equal(mockAfter(7, '2026-08-01', 90), mockAfter(7, '2026-08-01', 90));
  assert.equal(CART_STOCK.length, 6);
  for (const a of ['tori', 'moa', 'luon']) assert.equal(giftOf(a).from, a);
});

// onboarding: any company the player plants gets mock signals and outcomes, and trees fill the empty plots
const mine = (name, rate, id = 1000, plot = 0) => ({id, name, kind: 0, price: 0, quantity: 1, date: '2026-09-01', rate, plot, lossDays: 0});
test('a company with no hand-written note still gets a signal that keeps the tone', () => {
  const names = ['한빛전자', '나래식품', '푸른물산', '다온바이오', '해솔건설', '모래소재', '구름페이', '라온텍'];
  let made = 0;
  for (const [i, n] of names.entries()) for (const rate of [-35, -12, -3, 4, 18]) {
    const [s] = mockSignals([mine(n, rate, 2000 + i)], '2026-11-12');
    if (!s) continue; made++;
    assert.equal(MODEL_INFO[s.model].analyst, s.analyst);
    assert.equal(s.holdingId, 2000 + i);
    for (const t of [s.headline, s.say, ...Object.values(s.counter), ...s.evidence.map(e => e.k)]) {
      assert.ok(t.length <= 40, t); assert.doesNotMatch(t, BANNED, t);
    }
  }
  assert.ok(made >= names.length * 2, 'every heavy loss is flagged');
  assert.equal(mockSignals([mine('한빛전자', -30)], 'd')[0].model, 'fscore');
  assert.equal(mockSignals([mine('한빛전자', -12)], 'd')[0].model, 'gradual');
  // a demo company keeps its hand-written note under any id
  assert.equal(mockSignals([mine('강철중공업', -22, 55)], 'd')[0].model, 'ohlson');
  assert.equal(mockAfter(123456, '2026-11-01', 30), mockAfter(123456, '2026-11-01', 30));
});

test('planting fills the empty plots and stops at the garden size', () => {
  assert.equal(GARDEN_PLOTS, 7);
  const have = [mine('a', 1, 1, 0), mine('b', 1, 2, 2)];
  assert.deepEqual(PF.freePlots(have, 7), [1, 3, 4, 5, 6]);
  const rows = ['c', 'd', 'e', 'f', 'g', 'h'].map(n => ({...PF.blankDraft(), name: n, rate: -5}));
  const out = PF.applyDrafts(have, rows, [], PF.freePlots(have, 7), kindOf, 5000);
  assert.equal(out.holdings.length, 7);
  assert.equal(out.left.length, 1);
  assert.deepEqual(out.holdings.map(h => h.plot).sort(), [0, 1, 2, 3, 4, 5, 6]);
  // removing one frees its plot for the next
  const again = PF.applyDrafts(out.holdings, [{...PF.blankDraft(), name: 'h'}], [1], PF.freePlots(out.holdings.filter(h => h.id !== 1), 7), kindOf, 6000);
  assert.equal(again.holdings.length, 7);
  assert.equal(again.holdings.find(h => h.name === 'h').plot, 0);
});

test('the first-visit look-back is graded at once, and picks a loss signal first', () => {
  assert.equal(J.LOOKBACK, 30);
  assert.equal(J.lookbackPick([{loss: false, id: 'a'}, {loss: true, id: 'b'}]).id, 'b');
  assert.equal(J.lookbackPick([{loss: false, id: 'a'}]).id, 'a');
  assert.equal(J.lookbackPick([]), null);
  const look = j({id: 'look-1', day: J.shiftDay('2026-11-12', -J.LOOKBACK), lookback: true});
  const due = J.dueGrades([look], [], '2026-11-12');
  assert.deepEqual(due.map(d => [d.judgment.id, d.mark]), [['look-1', 30]]);
  // its 90-day grade waits like any other
  const g30 = J.grade(look, 30, -8, '2026-11-12');
  assert.deepEqual(J.dueGrades([look], [g30], '2026-11-12'), []);
  assert.equal(J.dueGrades([look], [g30], J.shiftDay('2026-11-12', 60))[0].mark, 90);
});
