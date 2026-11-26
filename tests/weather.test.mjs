import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const {weatherOf,isWeather,WEATHERS,WEATHER_LABEL,WEATHER_NOTE,marketLabel,closeWord,waitsForToday} = await load('core/weather');
const {mockMarket} = await load('content/market');

test('weather follows the index move and the swing', () => {
  assert.equal(weatherOf({index:-1.5,swing:1}), 'storm');
  assert.equal(weatherOf({index:-0.4,swing:3.2}), 'storm');
  assert.equal(weatherOf({index:0.3,swing:3.2}), 'clear');
  assert.equal(weatherOf({index:1.5,swing:1}), 'heat');
  assert.equal(weatherOf({index:0.19,swing:1}), 'cloudy');
  assert.equal(weatherOf({index:0.2,swing:1}), 'clear');
  assert.equal(weatherOf({index:-1.49,swing:1}), 'cloudy');
});

test('the mock market is steady per day and covers every weather over a few months', () => {
  assert.deepEqual(mockMarket('2026-11-12'), mockMarket('2026-11-12'));
  const seen = new Set();
  for (let i = 0; i < 120; i++) seen.add(weatherOf(mockMarket(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10))));
  assert.deepEqual([...seen].sort(), [...WEATHERS].sort());
});

test('like a real market, a storm or a hot day is rare: most days are clear or cloudy', () => {
  const n = {clear: 0, cloudy: 0, storm: 0, heat: 0};
  for (let i = 0; i < 365; i++) n[weatherOf(mockMarket(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)))]++;
  assert.ok(n.storm / 365 < 0.12, JSON.stringify(n));
  assert.ok(n.heat / 365 < 0.12, JSON.stringify(n));
  assert.ok((n.clear + n.cloudy) / 365 > 0.75, JSON.stringify(n));
});

test('weather lines stay short and give no buy/sell advice', () => {
  for (const w of WEATHERS) {
    assert.ok(isWeather(w));
    assert.ok(WEATHER_NOTE[w].length <= 40, WEATHER_NOTE[w]);
    assert.doesNotMatch(WEATHER_NOTE[w] + WEATHER_LABEL[w], /팔아|사|오를|괜찮아|천천히|~/);
  }
  assert.equal(isWeather('snow'), false);
});

test('the chip says which close it is, in plain words', () => {
  assert.equal(closeWord('2026-11-25', '2026-11-25'), '오늘 장 마감');
  assert.equal(closeWord('2026-11-24', '2026-11-25'), '어제 장 마감');
  assert.equal(closeWord('2026-11-20', '2026-11-23'), '11/20 (금) 장 마감');
  assert.equal(waitsForToday('2026-11-24', '2026-11-25'), true);
  assert.equal(waitsForToday('2026-11-20', '2026-11-22'), false);
  assert.equal(marketLabel('cloudy', -0.8), '조금 내림');
  assert.equal(marketLabel('cloudy', 0.1), '거의 그대로');
  assert.equal(marketLabel('heat', 4.79), '크게 오름');
});
