// The made-up brokerage of the MTS demo (app/mts/, 멘토링 2026-11-22). Not a real company: no real broker's name,
// logo, app name, colours or screens. Every screen it draws says "가상 증권사 데모 화면".
// The account is a seed, swapped as a whole. It keeps to KOSDAQ, the market the models read (멘토링 2026-11-22 1.6:
// the demo screen's stocks and the models' market looked different). Every stock has mock bars (core/jigi/stocks.ts)
// and mock books (content/books.ts); 현재가 and 전일 come from the bars on asOf, so the MTS, its sheet and the garden
// show the same price.
import type {StdHolding} from '../../core/holdings-in';
import {bars} from '../../core/jigi/stocks';

export const BROKER={name:'RT증권',app:'RT증권 MTS',demo:'가상 증권사 데모 화면'} as const;

// prev: yesterday's close, for the 전일대비 column (shown on the MTS only; it does not go to the garden)
export type DemoLine=StdHolding&{lastPrice:number;prev:number};
type Seed=Omit<StdHolding,'lastPrice'|'market'>;
const ASOF='2026-11-20';
// a real balance rarely carries the buying day: 알테오젠 and 클래시스 do not, so the garden asks once
const SEED:Seed[]=[
  {code:'247540',name:'에코프로비엠',quantity:8,avgPrice:181000,buyDate:'2026-08-27'},
  {code:'086520',name:'에코프로',quantity:10,avgPrice:166000,buyDate:'2026-06-10'},
  {code:'196170',name:'알테오젠',quantity:3,avgPrice:241000,buyDate:null},
  {code:'263750',name:'펄어비스',quantity:40,avgPrice:60900,buyDate:'2026-03-04'},
  {code:'277810',name:'레인보우로보틱스',quantity:3,avgPrice:301500,buyDate:'2026-06-10'},
  {code:'028300',name:'HLB',quantity:20,avgPrice:59600,buyDate:'2026-05-14'},
  {code:'214150',name:'클래시스',quantity:30,avgPrice:44900,buyDate:null},
  {code:'145020',name:'휴젤',quantity:2,avgPrice:224500,buyDate:'2026-05-14'},
];
const priced=(l:Seed):DemoLine=>{const b=bars(l.code).filter(x=>x.d<=ASOF),n=b.length;return {...l,market:'KOSDAQ',lastPrice:b[n-1].c,prev:b[n-2].c}};
export const DEMO_ACCOUNT:{no:string;label:string;cash:number;asOf:string;holdings:DemoLine[]}={
  no:'0000-00-000000',label:'종합 (가상)',cash:1_284_000,asOf:ASOF,holdings:SEED.map(priced)};
// what goes over to the garden: the standard line only
export const toStd=(l:DemoLine):StdHolding=>({code:l.code,name:l.name,market:l.market,quantity:l.quantity,avgPrice:l.avgPrice,buyDate:l.buyDate,lastPrice:l.lastPrice});
