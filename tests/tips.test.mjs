import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {nextTip, TIPS, tipText} = await load('core/tips');
test('one pointer at a time, in order, each once, and only when it makes sense', () => {
  const c = {judgments: 0, oldestDays: 0};
  assert.equal(nextTip([], c), 'map');
  assert.equal(nextTip(['map'], c), 'me');
  assert.equal(nextTip(['map', 'me'], c), null);// the house waits for a judgment on the shelf
  assert.equal(nextTip(['map', 'me'], {...c, judgments: 1}), 'house');
  assert.equal(nextTip(['map', 'me', 'house'], {judgments: 3, oldestDays: 40}), 'lapse');
  assert.equal(nextTip(TIPS.map(t => t.id), {judgments: 9, oldestDays: 99}), null);
  for (const t of TIPS) assert.ok(tipText(t.id).length <= 40, t.id);
});
