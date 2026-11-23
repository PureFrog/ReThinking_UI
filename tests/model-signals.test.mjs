// The team's model output in the garden (app/core/model-signals.ts, 2026-11-23): 서서히 verdicts per real holding
// (holding_signals) become the friends' notes only where a model crossed its line, with the row's own numbers; 반박
// results (analysis_results, toulmin.1) come back as luon's 참고 note; stocks outside the 120 keep the price path.
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './load-app.mjs';
const V=await load('core/model-signals');
const S=await load('content/signals');

const holding=(p)=>({id:7,name:'KCC글라스',code:'344820',kind:0,price:30000,quantity:5,date:'2025-12-01',rate:-12,plot:0,lossDays:20,real:true,...p});
const row=(p)=>({code:'344820',buy_date:'2025-12-01',status:'available',verdict:'Yes',fscore:2,ohlson_score:2,dupont_score:1,sum_total:5,
  eval_date:'2026-11-20',financial_as_of:'2026-08-14',price_as_of:'2026-11-20',release_id:31,
  evidence:{fscore:{status:'scored',detail:{f_score_buy:6,f_score_eval:3,fiscal_year_buy:2024,fiscal_year_eval:2025}},
    ohlson:{status:'scored',detail:{s_buy:0.041,s_eval:-0.032,omega_state_buy:'high',omega_state_eval:'low'}},
    dupont:{status:'scored',detail:{dPM_adj_pp:-1.2,dATO_rel_pct:3.5}}},...p});
const toulmin={decision:'thesis_factually_inconsistent',as_of:'2026-06-30',
  claim:[{span:'영업이익률이 다시 올라갈 거라고 봐',evaluation:{tag:'undercut'}}],
  grounds:[{span:'수주도 늘고 있어서',evaluation:{tag:'contradicted'}},{span:'부채도 많지 않아서',evaluation:null,mapping_status:'unmapped'}],
  question_candidates:[{text:'원자재 가격 하락이 판가 인하로 이어지지 않아야 한다'}]};
const result=(p)=>({request_id:'r1',company_id:'344820',status:'done',decision:'thesis_factually_inconsistent',result:toulmin,
  alert_date:'2026-11-22',as_of:'2026-06-30',analyzed_at:'2026-11-22T10:00:00+09:00',...p});

test('a friend speaks only for a model at or above its line', () => {
  const notes=V.verdictNotes(holding(),row());
  assert.deepEqual(notes.map(n=>[n.analyst,n.model]),[['moa','ohlson'],['luon','fscore']]);
  assert.ok(notes.every(n=>n.loss&&n.holdingId===7));
  assert.deepEqual(V.verdictNotes(holding(),row({fscore:1,ohlson_score:1,dupont_score:1,verdict:'주의'})),[]);
  assert.equal(V.verdictNotes(holding(),row({dupont_score:3})).map(n=>n.model).join(),'dupont,ohlson,fscore');
});

test('the notes carry the row’s numbers, not made-up ones', () => {
  const [o,f]=V.verdictNotes(holding(),row());
  assert.equal(f.headline,'재무 체력 6점 → 3점 (9점 만점)');
  assert.ok(f.evidence.some(e=>e.k==='살 때 (2024년 결산)'&&e.v==='6점'));
  assert.ok(f.evidence.some(e=>e.k==='재무 기준'&&e.v==='2026-08-14'));
  assert.equal(o.headline,'초과이익률 +4.1% → -3.2%');
  assert.ok(o.evidence.some(e=>e.v==='높음 → 낮음'));
  const d=V.verdictNotes(holding(),row({dupont_score:2}))[0];
  assert.equal(d.headline,'업종 대비 영업이익률 -1.2%p');
});

test('a score without detail still says the risk score', () => {
  const [o]=V.verdictNotes(holding(),row({fscore:0,evidence:null}));
  assert.equal(o.headline,'부실 위험 2/2');
});

test('held, not covered and no signal rows give no friend notes', () => {
  for(const status of ['held','not_covered','no_signal'])assert.deepEqual(V.verdictNotes(holding(),row({status})),[]);
  const rows=new Map([[V.verdictKey('344820','2025-12-01'),row({status:'not_covered'})]]);
  assert.equal(V.verdictFor(holding(),rows),null);
  assert.equal(V.verdictFor(holding({real:false}),new Map([[V.verdictKey('344820','2025-12-01'),row()]])),null);
  assert.equal(V.verdictFor(holding({date:'2025-12-02'}),new Map([[V.verdictKey('344820','2025-12-01'),row()]])),null);
});

test('the signal provider uses the verdicts for a covered real holding', () => {
  V.setVerdicts([row()]);V.setAnalyses([]);
  const sigs=S.signalProvider.today([holding()],'2026-11-23');
  assert.deepEqual(sigs.map(s=>s.model),['ohlson','fscore']);
  assert.equal(new Set(sigs.map(s=>s.id)).size,sigs.length);
  V.setVerdicts([row({status:'not_covered'})]);
  assert.ok(S.signalProvider.today([holding()],'2026-11-23').every(s=>s.model==='crash'||s.model==='gradual'||s.model==='rebuttal'));
  V.setVerdicts([]);
});

test('a demo (non-real) holding keeps its hand-written note', () => {
  V.setVerdicts([row({code:'005490'})]);
  const sigs=S.signalProvider.today([holding({name:'POSCO홀딩스',code:'005490',real:false})],'2026-11-23');
  assert.equal(sigs[0].headline,'부도 위험 2분기째 상승');
  V.setVerdicts([]);
});

test('luon brings back the newest finished rebuttal for the company', () => {
  const latest=V.latestByCompany([result({request_id:'old',analyzed_at:'2026-11-20T10:00:00+09:00',decision:'mixed'}),result(),
    result({request_id:'fail',status:'failed',result:null,analyzed_at:'2026-11-23T10:00:00+09:00'})]);
  assert.equal(latest.get('344820').request_id,'r1');
  const n=V.rebuttalNote(holding(),latest.get('344820'));
  assert.equal(n.analyst,'luon');assert.equal(n.model,'rebuttal');assert.equal(n.loss,false);
  assert.equal(n.headline,'네 근거 하나가 숫자와 반대야');
  assert.deepEqual(n.evidence.slice(0,3).map(e=>e.v),['지난 숫자가 약화','숫자와 반대','확인 못 함']);
  assert.ok(n.evidence.some(e=>e.k==='숫자로 못 가린 조건'));
  assert.ok(n.evidence.some(e=>e.k==='기업 데이터 기준'&&e.v==='2026-06-30'));
  V.setVerdicts([]);V.setAnalyses([result()]);
  const sigs=S.signalProvider.today([holding()],'2026-11-23');
  assert.equal(sigs.filter(s=>s.model==='rebuttal').length,1);
  V.setAnalyses([]);
});

test('no line asks to buy or sell or predicts a price', () => {
  const texts=[...V.verdictNotes(holding(),row({dupont_score:2})),V.rebuttalNote(holding(),result())]
    .flatMap(n=>[n.headline,n.say,...Object.values(n.counter)]).concat(Object.values(V.DECISION).flatMap(d=>[d.headline,d.say]),V.NOT_COVERED,V.NO_SIGNAL);
  for(const t of texts)assert.doesNotMatch(t,/팔아|사라|매수해|매도해|오를 거|내릴 거|떨어질 거/,t);
});

test('the deep sheet rows read the verdict', () => {
  const rows=V.verdictRows(row());
  assert.deepEqual(rows.map(r=>[r.id,r.value,r.tone]),[['fscore','6 → 3점','weak'],['ohlson','-3.2%','weak'],['dupont','-1.2%p','mid'],['sum','손실 신호','weak']]);
});
