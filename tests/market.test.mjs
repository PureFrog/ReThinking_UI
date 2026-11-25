// The market weather from the real KOSDAQ index (app/content/market.ts, 2026-11-23): the day's move and range from the
// last bar on or before the day; a mock day (no bars, or before the first one) has no asOf.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const M=await load('content/market');
const W=await load('core/weather');

const bars=[
  {d:'2026-11-19',o:900,h:905,l:895,c:900},
  {d:'2026-11-20',o:900,h:902,l:870,c:877.5},   // -2.5%, range 32/900 = 3.56%
];

test('the move and range come from the last bar on or before the day', () => {
  assert.deepEqual(M.realMarket(bars,'2026-11-20'),{day:'2026-11-20',index:-2.5,swing:3.56,asOf:'2026-11-20'});
  // a Sunday reads Friday's bar
  assert.equal(M.realMarket(bars,'2026-11-22').asOf,'2026-11-20');
  assert.equal(W.weatherOf(M.realMarket(bars,'2026-11-22')),'storm');
});

test('no previous close, no real day', () => {
  assert.equal(M.realMarket(bars,'2026-11-19'),null);
  assert.equal(M.realMarket([],'2026-11-20'),null);
});

test('the provider uses the real bars once loaded, the mock before them', () => {
  assert.equal(M.marketProvider.today('2026-11-20').asOf,undefined);
  M.setMarketBars([...bars].reverse());
  assert.equal(M.marketProvider.today('2026-11-20').index,-2.5);
  assert.equal(M.marketProvider.today('2026-11-18').asOf,undefined);   // before the bars: mock
});
