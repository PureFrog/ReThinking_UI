// The books the fundamentals models read (F-score, O-score), per stock code. MOCK readings for the KOSDAQ names of the
// practice account and the MTS demo (멘토링 2026-11-22): made up, labelled 모의 재무 wherever they show. The server (R5,
// OpenDART) replaces booksOf with the team's model input; nothing else changes.
// The eight are set so every case of core/views.ts shows once: both weak, the value trap (books fine, price down),
// the price running ahead of weak books, and calm.
import type {Books} from '../core/views';

const Q='2026 3분기';
const BOOKS:Record<string,Books>={
  '247540':{asOf:Q,fscore:2,oscore:[8,12],roe:[6.1,-2.4],debt:[118,151]},   // 에코프로비엠: weak books, falling price
  '086520':{asOf:Q,fscore:4,oscore:[11,18],roe:[3.2,-5.8],debt:[96,139]},   // 에코프로: bankruptcy odds over the line
  '196170':{asOf:Q,fscore:3,oscore:[6,9],roe:[-4.0,-1.2],debt:[38,44]},     // 알테오젠: price up, books weak
  '263750':{asOf:Q,fscore:7,oscore:[2,2],roe:[5.4,6.0],debt:[31,29]},       // 펄어비스: the value trap
  '277810':{asOf:Q,fscore:5,oscore:[3,4],roe:[2.8,3.1],debt:[22,24]},       // 레인보우로보틱스: fine books, falling price
  '028300':{asOf:Q,fscore:5,oscore:[4,4],roe:[-1.5,0.8],debt:[54,51]},      // HLB: calm
  '214150':{asOf:Q,fscore:8,oscore:[1,1],roe:[21.0,22.4],debt:[18,16]},     // 클래시스: calm, strong
  '145020':{asOf:Q,fscore:7,oscore:[1,2],roe:[13.8,14.5],debt:[12,13]},     // 휴젤: calm
};
export const booksOf=(code:string|undefined|null):Books|null=>code?BOOKS[code]??null:null;
