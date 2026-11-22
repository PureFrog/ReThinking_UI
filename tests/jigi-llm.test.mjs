// 지기 LLM checks (app/core/jigi/llm.ts): A keeps only drafts close to my own words, B only safe questions, C only
// numbers the code counted; the server rows leave the demo pages out.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const L=await load('core/jigi/llm');
const J=await load('core/jigi/journal');
const now=Date.parse('2026-11-15T10:00:00Z'),today='2026-11-15';
const j=J.newJournal('j',now,today,{code:'005930'});Object.assign(j.f,{hypo:'메모리 가격이 반등한다. 삼성전자 주가가 석 달 안에 오를 것이다.',checkDate:'2027-02-15'});

test('A: drafts close to my words are kept and cleaned; invented ones and bad JSON are dropped', () => {
  const ok=L.parseExtract(JSON.stringify([{text:'삼성전자 주가가 석 달 안에 오를 것이다.',src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir:'상승'},
    {text:'환율이 1500원을 넘고 반도체 수출이 급증한다.',src:'핵심 가설',domain:'환율',form:'수치',role:'최초 전제',dir:'상승'},{text:'x',domain:'?'}]),j);
  assert.equal(ok.length,1);assert.equal(ok[0].endDate,'2027-02-15');assert.equal(ok[0].dir,'상승');
  assert.equal(L.parseExtract('not json',j),null);
  const fenced=L.parseExtract('```json\n[{"text":"메모리 가격이 반등한다.","domain":"없는분야","form":"?","role":"?","dir":"?"}]\n```',j);
  assert.deepEqual([fenced[0].domain,fenced[0].form,fenced[0].dir],['경기','추세','없음']);
  assert.match(L.extractPrompt(j)[0].content,/새 가설을 만들거나/);
});

test('B: two short safe questions; advice is dropped', () => {
  assert.deepEqual(L.parseAssist('1. 이 가설이 틀렸다면 가장 그럴듯한 이유는 뭘까요?\n2. 지금 가격에 이미 반영된 기대는 무엇일까요?\n3. 세 번째는 버려요'),
    ['이 가설이 틀렸다면 가장 그럴듯한 이유는 뭘까요?','지금 가격에 이미 반영된 기대는 무엇일까요?']);
  assert.equal(L.parseAssist('지금 매수하세요. 곧 오를 거야.'),null);
});

test('C: only the numbers the code counted (95 for the interval is fine); no judging the person', () => {
  const facts={적중:5,판정:11,구간:'21%~72%'};
  assert.equal(L.checkExplain('11개 중 5개가 맞았어요. 95% 구간이 21%에서 72%로 넓어서 우연일 수 있어요.',facts).length>0,true);
  assert.equal(L.checkExplain('11개 중 7개가 맞았어요.',facts),null);
  assert.equal(L.checkExplain('실력이 부족해 보여요. 5개만 맞았어요.',facts),null);
});

test('server rows: my pages and hypotheses, never the demo', () => {
  const mine={...j,status:'saved',hypos:[{id:'h',text:'t',src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir:'상승',endDate:'',status:'draft'}]};
  const r=L.journalRows([mine,{...mine,id:'d',demo:true}]);
  assert.deepEqual(r.journals.map(x=>x.id),['j']);assert.equal(r.hypotheses[0].journal_id,'j');assert.equal(r.hypotheses[0].end_date,null);
});
