// 실제 기사 (NAVER API HUB, db/functions/news-feed): the search reply is kept only for headlines that name the company
// as a word, cleaned to plain text, given a publisher and a theme; the 통신기 and the 뉴스 표지판 show real cards for
// stocks that have them and keep 모의 기사 for the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const N=await load('core/content/live/naver'),VN=await load('content/village-news');

const reply={items:[
  {title:'<b>삼성전자</b>, 3분기 영업이익 발표','originallink':'https://www.hankyung.com/article/1','link':'https://n.news.naver.com/a/1',
   description:'<b>삼성전자</b>가 3분기 영업이익을 &quot;발표&quot;했다. 홍길동 기자 hong@hankyung.com',pubDate:'Thu, 26 Nov 2026 10:30:00 +0900'},
  {title:'삼성전자서비스, 새 센터 열어','originallink':'https://www.yna.co.kr/2',link:'',description:'',pubDate:'Thu, 26 Nov 2026 09:00:00 +0900'},
  {title:'삼성전자우 거래 늘어',originallink:'https://www.yna.co.kr/3',description:'',pubDate:'Thu, 26 Nov 2026 08:00:00 +0900'},
  {title:'정부 지원책에 삼성전자도 포함',originallink:'',link:'https://n.news.naver.com/a/4',description:'설비 투자 세액 공제를 넓힌다.',pubDate:'Wed, 25 Nov 2026 17:05:00 +0900'},
  {title:'[속보] <b>삼성전자</b>, 3분기 영업이익 발표',originallink:'https://news.example.com/5',description:'',pubDate:'Thu, 26 Nov 2026 10:31:00 +0900'},
  {title:'날짜 없는 삼성전자 기사',originallink:'https://x.example/6'},
]};

test('only headlines that name the company as a word are kept, cleaned, newest first, one per headline', () => {
  const items = N.naverItems(reply, '005930', '삼성전자');
  assert.deepEqual(items.map(i => i.title), ['삼성전자, 3분기 영업이익 발표', '정부 지원책에 삼성전자도 포함']);   // [속보] reprint folded
  assert.ok(items.every(i => !/삼성전자(서비스|우)/.test(i.title)));
  assert.ok(items.every(i => !i.title.includes('<b>')));
  assert.equal(items.at(-1).title, '정부 지원책에 삼성전자도 포함');
  const first = items.find(i => i.url === 'https://www.hankyung.com/article/1');
  assert.equal(first.press, '한국경제');
  assert.equal(first.summary, '삼성전자가 3분기 영업이익을 "발표"했다.');
  assert.equal(first.theme, '실적');
  assert.equal(items.at(-1).url, 'https://n.news.naver.com/a/4');   // no original link → the Naver link
  assert.equal(items.at(-1).theme, '정책');
  assert.deepEqual(N.naverItems({nope: 1}, '005930', '삼성전자'), []);
});

test('company names: particles and 주 follow, other letters mean another company; Latin names need a clean start', () => {
  assert.ok(N.namesCompany('LG화학', 'LG화학은 오늘'));
  assert.ok(N.namesCompany('하림', '하림, 신제품'));
  assert.ok(!N.namesCompany('하림', '하림지주 신제품'));
  assert.ok(!N.namesCompany('LF', 'SLF 상장'));
  assert.ok(N.namesCompany('LF', 'LF 실적'));
  assert.equal(N.pressOf('https://biz.chosun.com/x'), '조선비즈');
  assert.equal(N.pressOf('https://m.mk.co.kr/x'), '매일경제');
  assert.equal(N.pressOf('https://unknown.example.org/x'), 'unknown.example.org');
});

test('cards: real articles for stocks that have them, 모의 기사 for the rest; times in KST against the screen day', () => {
  const live = {'005930': N.naverItems(reply, '005930', '삼성전자')};
  const stocks = [{code: '005930', name: '삼성전자'}, {code: '000660', name: 'SK하이닉스'}];
  const cards = VN.mergeNews(stocks, '2026-11-26', live);
  const real = cards.filter(c => c.live), mock = cards.filter(c => !c.live);
  assert.ok(real.length >= 2 && real.every(c => c.code === '005930' && c.url));
  assert.ok(mock.every(c => c.code === '000660'));
  assert.ok(cards.indexOf(real.at(-1)) < cards.indexOf(mock[0] ?? real.at(-1)) || !mock.length);
  assert.equal(real.find(c => c.title.startsWith('정부')).time, '어제 17:05');
  assert.equal(N.kstWhen('2026-11-26T01:30:00.000Z', '2026-11-26').time, '10:30');
  assert.equal(N.kstWhen('2026-11-20T01:30:00.000Z', '2026-11-26').time, '11.20 10:30');
  // nothing from the server → the old 모의 기사 only
  assert.ok(VN.mergeNews(stocks, '2026-11-26', null).every(c => !c.live));
  const board = VN.boardArticles(stocks, '2026-11-26', live);
  assert.ok(board.some(a => a.live) && board.filter(a => a.live).every(a => a.day >= '2026-11-25'));
});

test('a reporter byline at the head of the excerpt is dropped', () => {
  assert.equal(N.byline('| 이코노미사이언스 박성현 기자 | 삼성전자와 SK하이닉스의 특별배당 혜택이 전달된다.'), '삼성전자와 SK하이닉스의 특별배당 혜택이 전달된다.');
  assert.equal(N.byline('[서울=뉴시스] 홍길동 기자 = 회사가 새 공장을 짓는다고 밝혔다.'), '회사가 새 공장을 짓는다고 밝혔다.');
  assert.equal(N.byline('인더스트리뉴스 박현우 기자 Spatial AI 기반 플랫폼 기업 딥파인이 참가했다.'), 'Spatial AI 기반 플랫폼 기업 딥파인이 참가했다.');
  assert.equal(N.byline('회사가 기자 간담회를 열고 신제품을 소개했다.'), '회사가 기자 간담회를 열고 신제품을 소개했다.');
  assert.equal(N.pressOf('https://www.g-enews.com/x'), '글로벌이코노믹');
});

test('an article that names two of my stocks shows once', () => {
  const one = {items: [{title: '삼성전자·SK하이닉스 동반 강세', originallink: 'https://www.yna.co.kr/9', description: '', pubDate: 'Thu, 26 Nov 2026 10:00:00 +0900'}]};
  const live = {'005930': N.naverItems(one, '005930', '삼성전자'), '000660': N.naverItems(one, '000660', 'SK하이닉스')};
  const stocks = [{code: '005930', name: '삼성전자'}, {code: '000660', name: 'SK하이닉스'}];
  assert.equal(VN.mergeNews(stocks, '2026-11-26', live).filter(c => c.live).length, 1);
  assert.equal(VN.boardArticles(stocks, '2026-11-26', live).filter(a => a.live).length, 1);
});

test('the press name is searched (NAVER → 네이버) and any alias in a headline counts; 100 results a call', () => {
  assert.equal(N.naverQuery('NAVER', '035420').query, '"네이버"');
  assert.equal(N.naverQuery('카카오', '035720').query, '"카카오"');
  assert.equal(N.naverQuery('카카오', '035720').display, '100');
  const r = {items: [{title: '네이버, 새 검색 서비스 공개', originallink: 'https://www.yna.co.kr/n1', description: '', pubDate: 'Thu, 26 Nov 2026 09:00:00 +0900'},
    {title: 'NAVER 목표가 조정', originallink: 'https://www.yna.co.kr/n2', description: '', pubDate: 'Thu, 26 Nov 2026 08:00:00 +0900'},
    {title: '네이버웹툰 신작', originallink: 'https://www.yna.co.kr/n3', description: '', pubDate: 'Thu, 26 Nov 2026 07:00:00 +0900'}]};
  assert.deepEqual(N.naverItems(r, '035420', 'NAVER').map(i => i.url), ['https://www.yna.co.kr/n1', 'https://www.yna.co.kr/n2']);
});
