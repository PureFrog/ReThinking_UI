// News excerpts (사용자 2026-11-22: "기사 전문은 없어도 요약 발췌문이 있다"). An RSS feed gives the headline, the link,
// the time and the publisher's short excerpt; the excerpt is cleaned to plain text, cut short, carried through the
// vendor adapter and the quest pipeline (held to the headline's rules), and shown under the headline. No body is kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const R=await load('core/content/live/rss'),V=await load('core/content/live/vendors'),H=await load('core/content/live/http');
const PL=await load('core/content/pipeline'),FX=await load('content/daily/solbit-sources'),VN=await load('content/village-news');
const D=await load('content/daily/danpung');

const RSS=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>경제 신문</title>
<item><title><![CDATA[삼성전자, 신규 시설 투자 공시]]></title><link>https://news.example/a1</link><pubDate>Tue, 18 Nov 2025 09:10:00 +0900</pubDate>
<description><![CDATA[<p>삼성전자가 평택에 새 생산 라인을 짓는다고 <b>공시</b>했다. 투자 금액은 &quot;10조 원&quot; 규모다.</p><img src="x.jpg"> 홍길동 기자 hong@news.example]]></description></item>
<item><title>SK하이닉스 &amp; 협력사, 공급 계약</title><link>https://news.example/a2</link><pubDate>Tue, 18 Nov 2025 11:00:00 +0900</pubDate>
<description>&lt;p&gt;메모리 공급 계약을 맺었다.&lt;/p&gt; ⓒ 경제 신문, 무단 전재 금지</description></item>
<item><title>삼성전자 노조 협상</title><link>https://news.example/a3</link><pubDate>Mon, 10 Nov 2025 08:00:00 +0900</pubDate></item>
<item><title>날짜 없는 기사</title><link>https://news.example/a4</link></item>
</channel></rss>`;
const ATOM=`<feed xmlns="http://www.w3.org/2005/Atom"><title>업계지</title><entry><title>삼성전자 반도체 부문 설명회</title>
<link href="https://trade.example/e1"/><updated>2025-11-18T02:00:00Z</updated><summary type="html">&lt;p&gt;설명회에서 다음 분기 설비 계획이 나왔다.&lt;/p&gt;</summary></entry></feed>`;

test('the excerpt: tags, entities and the byline out, plain text, cut at a sentence within the limit', () => {
  assert.equal(R.excerpt('<p>회사가 <b>공시</b>했다.</p> 홍길동 기자 hong@news.example'), '회사가 공시했다.');
  assert.equal(R.excerpt('&lt;p&gt;계약을 맺었다.&lt;/p&gt; ⓒ 경제 신문, 무단 전재 금지'), '계약을 맺었다.');
  assert.equal(R.excerpt(null), null);
  assert.equal(R.excerpt('<img src="a.jpg">'), null);
  const long = '첫 문장은 회사의 공시 내용을 담고 있다. '.repeat(10);
  const e = R.excerpt(long, 60);
  assert.ok(e.length <= 60, e);
  assert.ok(e.endsWith('다.'), e);
  const noStop = '가'.repeat(30) + ' ' + '나'.repeat(40);
  assert.ok(R.excerpt(noStop, 50).endsWith('…'));
});

test('an RSS 2.0 feed and an Atom feed are read; items without a date are skipped; anything else is refused', () => {
  const f = R.parseFeed(RSS);
  assert.equal(f.publisher, '경제 신문');
  assert.deepEqual(f.items.map(i => i.url), ['https://news.example/a1', 'https://news.example/a2', 'https://news.example/a3']);
  assert.equal(f.items[0].title, '삼성전자, 신규 시설 투자 공시');
  assert.equal(f.items[0].summary, '삼성전자가 평택에 새 생산 라인을 짓는다고 공시했다. 투자 금액은 "10조 원" 규모다.');
  assert.equal(f.items[0].publishedAt, '2025-11-18T00:10:00.000Z');
  assert.equal(f.items[1].title, 'SK하이닉스 & 협력사, 공급 계약');
  assert.equal(f.items[1].summary, '메모리 공급 계약을 맺었다.');
  assert.equal(f.items[2].summary, null);
  const a = R.parseFeed(ATOM);
  assert.equal(a.items[0].url, 'https://trade.example/e1');
  assert.equal(a.items[0].summary, '설명회에서 다음 분기 설비 계획이 나왔다.');
  assert.throws(() => R.parseFeed('<html><body>not a feed</body></html>'), e => e.code === 'shape');
});

test('the RSS provider: feeds from NEWS_RSS_URLS, the entity in the headline or excerpt, the date window, reprints folded', async () => {
  H.clearCache();
  const ctx = {env: k => ({NEWS_RSS_URLS: '경제 신문|https://news.example/rss\nhttps://trade.example/atom'})[k], now: () => Date.now(), sleep: async () => {},
    fetch: async url => new Response(String(url).includes('trade') ? ATOM : RSS, {status: 200})};
  const r = await R.rssNews(ctx).search({entity: '삼성전자', since: '2025-11-17', until: '2025-11-18'});
  // oldest first (09:10 KST before 11:00 KST); the second feed names itself, the first by the setting
  assert.deepEqual(r.items.map(i => [i.title, i.publisher]), [['삼성전자, 신규 시설 투자 공시', '경제 신문'], ['삼성전자 반도체 부문 설명회', '업계지']]);
  assert.ok(r.items.every(i => i.usage === 'metadata-only' && i.summary));
  // a name that is only in the excerpt still finds the story
  const k = await R.rssNews(ctx, () => ['메모리']).search({entity: 'SK하이닉스', since: '2025-11-18', until: '2025-11-18'});
  assert.deepEqual(k.items.map(i => i.url), ['https://news.example/a2']);
  await assert.rejects(R.rssNews({...ctx, env: () => undefined}).search({entity: 'x', since: 'a', until: 'b'}), e => e.code === 'config');
});

test('a vendor reply keeps its summary as a cleaned excerpt, and none stays null', async () => {
  H.clearCache();
  const ctx = {env: k => ({NEWS_API_URL: 'https://news.example', NEWS_API_KEY: 'k'})[k], now: () => Date.now(), sleep: async () => {},
    fetch: async () => new Response(JSON.stringify({items: [
      {id: 'a', title: '회사 A 공장 증설', publisher: 'P1', publishedAt: '2025-01-02T01:00:00Z', url: 'u1', summary: '<p>새 공장을 짓는다.</p>'},
      {id: 'b', title: '회사 B 대표 변경', publisher: 'P2', publishedAt: '2025-01-03T01:00:00Z', url: 'u2'}], cursor: null}), {status: 200})};
  const n = await V.vendorNews(ctx).search({entity: 'X', since: '2025-01-01', until: '2025-01-31'});
  assert.deepEqual(n.items.map(x => x.summary), ['새 공장을 짓는다.', null]);
});

test('the quest pipeline carries the summary and holds it to the headline\'s rules', async () => {
  const d = structuredClone(FX.SOLBIT_DRAFT);
  const src = FX.SOLBIT_OBSERVATIONS.find(o => Date.parse(o.ref.publishedAt) <= Date.parse(`${d.scenes[0].date}T${d.sessionClose}`)).ref.sourceId;
  const build = async () => PL.buildPack(d, await PL.gather(FX.fixtureProviders(), d, FX.SOLBIT_OBSERVATIONS));
  d.news = [{date: d.scenes[0].date, title: '포장재 업계, 원지 값 부담', summary: '원지 수입 단가가 두 달째 올랐다.', source: '업계 전문지', sourceId: src}];
  let {pack, issues} = await build();
  assert.ok(PL.publishable(issues), JSON.stringify(issues.filter(i => i.level === 'error')));
  assert.equal(pack.news[0].summary, '원지 수입 단가가 두 달째 올랐다.');
  const real = d.instrument.realNames[0];
  d.news = [{date: d.scenes[0].date, title: '포장재 업계 소식', summary: `${real}가 2024년 공장을 늘렸다. 지금 매수할 때다.` + '가'.repeat(PL.NEWS_SUMMARY_MAX), source: '업계 전문지', sourceId: src}];
  const codes = (await build()).issues.filter(i => i.level === 'error').map(i => i.code);
  for (const c of ['real-name', 'period', 'direction', 'news-summary']) assert.ok(codes.includes(c), `${c} not caught: ${codes}`);
});

test('the shown examples: every village article and the sample quest\'s news carry a plain excerpt with no advice', () => {
  const BANNED = /팔아|사세요|매수하세요|매도하세요|오를 거|내릴 거|사라|파세요/;
  const stocks = [{code: '005930', name: '삼성전자'}, {code: '000660', name: 'SK하이닉스'}, {code: '035720', name: '카카오'}];
  const days = Array.from({length: 40}, (_, i) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10));
  const all = days.flatMap(day => [...VN.articlesFor(stocks, day), ...stocks.map(s => VN.dayBeforeArticle(s, day))]);
  assert.ok(all.length > 40);
  for (const a of all) {
    assert.ok(a.summary && a.summary.length >= 20 && a.summary.length <= 160, a.title);
    assert.doesNotMatch(a.summary, BANNED, a.summary);
    assert.doesNotMatch(a.title, BANNED, a.title);
  }
  const news = D.DANPUNG.news;
  assert.ok(news.filter(n => n.summary).length >= 5);
  for (const n of news) if (n.summary) { assert.ok(n.summary.length <= 160); assert.doesNotMatch(n.summary, BANNED) }
});
