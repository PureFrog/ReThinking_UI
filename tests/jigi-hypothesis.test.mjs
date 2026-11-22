// 지기 J2 (app/core/jigi): rule-based drafts from a journal's own words, confirming (base close, end date, 보완 대기,
// 사후 기록), the automatic verdict against the mock bars, and one capsule per tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const J=await load('core/jigi/journal');
const X=await load('core/jigi/extract');
const H=await load('core/jigi/hypothesis');
const C=await load('core/jigi/capsules');
const S=await load('core/jigi/stocks');
const await_lookback=await load('core/jigi/lookback');
const today='2026-11-15',now=Date.parse('2026-11-15T10:00:00Z');
const journal=(hypo,extra={})=>{const j=J.newJournal('j',now,today,{holdingId:6,code:'005930'});Object.assign(j.f,{hypo,checkDate:'2027-02-15',...extra});j.status='saved';return j};

test('drafts: one per sentence, with the stock direction found and nothing invented', () => {
  const d=X.extractDrafts(journal('메모리 가격이 반등한다. 삼성전자 주가가 석 달 안에 오를 것이다.',{opt:{counter:'경쟁사가 가격을 내릴 수 있다.'}}));
  assert.equal(d.length,3);
  assert.equal(d[0].dir,'상승');assert.notEqual(d[0].domain,'주가');
  assert.deepEqual([d[1].domain,d[1].form,d[1].dir,d[1].endDate],['주가','방향','상승','2027-02-15']);
  assert.deepEqual([d[2].src,d[2].form,d[2].endDate],['반대 근거','반대 시나리오','']);
  assert.equal(X.extractDrafts(journal('오늘 절반 매도했다.'))[0].form,'행동');
});

test('confirming: base is the last confirmed close; missing direction or date waits; the end must be after today', () => {
  const j=journal('삼성전자 주가가 오를 것이다.');
  const h={id:'h1',status:'draft',...X.extractDrafts(j)[0]};
  const ok=X.confirmHypo(j,h,today,now);
  assert.equal(ok.h.status,'confirmed');assert.equal(ok.h.auto,true);assert.equal(ok.h.base.date,S.lastConfirmed('005930',today).d);
  assert.equal(X.confirmHypo(j,{...h,dir:'없음'},today,now).h.status,'hold');
  assert.equal(X.confirmHypo(j,{...h,endDate:''},today,now).h.status,'hold');
  assert.equal(X.confirmHypo(j,{...h,endDate:today},today,now).h.status,'draft');
  const post=X.confirmHypo(j,{...h,postHoc:true},today,now);assert.equal(post.h.auto,false);
  j.hypos=[post.h];assert.equal(H.verdict(j,post.h,today).s,'posthoc');
});

test('the verdict: wait until the end date has a close, then up is a hit when end > base', () => {
  const j=journal('삼성전자 주가가 오를 것이다.');
  const base=S.barOnOrBefore('005930','2026-06-01'),end=S.barOnOrBefore('005930','2026-09-01');
  const h={id:'h',text:'x',src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir:'상승',endDate:'2026-09-01',status:'confirmed',auto:true,base:{date:base.d,close:base.c}};
  const v=H.verdict(j,h,today);assert.equal(v.s,end.c>base.c?'hit':'fail');
  assert.equal(H.verdict(j,{...h,dir:'하락'},today).s,end.c<base.c?'hit':'fail');
  assert.equal(H.verdict(j,{...h,endDate:'2027-01-01'},today).s,'wait');
  assert.equal(H.verdict(j,{...h,auto:false},today).s,'data');
});

test('capsules: one per tree, an unopened verdict first, otherwise the nearest D-n', () => {
  const j=journal('x');const base={date:'2026-06-01',close:70000};
  const mk=(id,endDate,opened)=>({id,text:'x',src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir:'상승',endDate,status:'confirmed',auto:true,base,opened});
  j.hypos=[mk('a','2027-03-01'),mk('b','2026-12-01'),mk('c','2026-09-01',now)];
  let c=C.hypoCapsules([j],today,[6]);assert.equal(c.length,1);assert.equal(c[0].hypoId,'b');assert.equal(c[0].due,false);assert.equal(C.hypoCapsuleLabel(c[0]),'D-16');
  j.hypos.push(mk('d','2026-10-01'));c=C.hypoCapsules([j],today,[6]);assert.equal(c[0].hypoId,'d');assert.equal(C.hypoCapsuleLabel(c[0]),'판정 완료');
  assert.equal(C.hypoCapsules([j],today,[1]).length,0);
});

test('되돌아보기: a practice journal as of 30 days ago, graded at once; mock bars for a tree outside the twelve', () => {
  const L=await_lookback;
  const code=S.codeOf({name:'한빛전자',price:52000});
  assert.match(code,/^M\d{6}$/);assert.equal(S.codeOf({name:'한빛전자',price:1}),code);
  assert.ok(Math.abs(S.barOnOrBefore(code,'2026-11-13').c-52000)<=100);
  assert.equal(S.codeOf({name:'삼성전자',price:1}),'005930');
  const j=L.lookbackJournal({id:'l',hypoId:'lh',holdingId:9,code,name:'한빛전자',today,now,dir:'하락',reason:'적자가 길다.',conf:''});
  assert.equal(j.practice,true);assert.equal(j.hypos[0].dir,'하락');assert.ok(j.anchor.date<='2026-10-16');
  assert.ok(L.lookbackReady(j,today));
  assert.match(j.hypos[0].text,/한빛전자 주가가 한 달 안에 내릴 것이다/);
});
