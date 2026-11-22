// The made-up brokerage of the MTS demo (app/mts/, 멘토링 2026-11-22). Not a real company: no real broker's name,
// logo, app name, colours or screens. Every screen it draws says "가상 증권사 데모 화면".
// The account is a seed, swapped as a whole. Its stocks are taken from the model universe (core/jigi/stocks.ts) so the
// garden has bars and notes for each one. Which market the demo account should keep to (KOSPI / KOSDAQ) is still open
// with the team (2026-11-22): today it mixes the two the way the universe does, and every line names its market.
import type {StdHolding} from '../../core/holdings-in';

export const BROKER={name:'RT증권',app:'RT증권 MTS',demo:'가상 증권사 데모 화면'} as const;

// prev: yesterday's close, for the 전일대비 column (shown on the MTS only; it does not go to the garden)
export type DemoLine=StdHolding&{lastPrice:number;prev:number};
export const DEMO_ACCOUNT:{no:string;label:string;cash:number;asOf:string;holdings:DemoLine[]}={
  no:'0000-00-000000',label:'종합 (가상)',cash:1_284_000,asOf:'2026-11-20',
  holdings:[
    {code:'005930',name:'삼성전자',market:'KOSPI',quantity:30,avgPrice:76400,buyDate:'2026-06-10',lastPrice:71200,prev:77200},
    {code:'000660',name:'SK하이닉스',market:'KOSPI',quantity:5,avgPrice:162000,buyDate:'2026-03-04',lastPrice:186500,prev:183900},
    {code:'035720',name:'카카오',market:'KOSPI',quantity:40,avgPrice:48900,buyDate:'2026-07-21',lastPrice:41250,prev:41600},
    {code:'005380',name:'현대차',market:'KOSPI',quantity:4,avgPrice:248000,buyDate:'2026-05-14',lastPrice:231000,prev:232500},
    {code:'035420',name:'NAVER',market:'KOSPI',quantity:6,avgPrice:189500,buyDate:'2026-04-02',lastPrice:198400,prev:196800},
    // a real balance rarely carries the buying day: these two do not, so the garden asks once
    {code:'105560',name:'KB금융',market:'KOSPI',quantity:12,avgPrice:84300,buyDate:null,lastPrice:92800,prev:92100},
    {code:'247540',name:'에코프로비엠',market:'KOSDAQ',quantity:8,avgPrice:171000,buyDate:'2026-08-27',lastPrice:152700,prev:155900},
    {code:'196170',name:'알테오젠',market:'KOSDAQ',quantity:3,avgPrice:301000,buyDate:null,lastPrice:327500,prev:321000},
  ]};
// what goes over to the garden: the standard line only
export const toStd=(l:DemoLine):StdHolding=>({code:l.code,name:l.name,market:l.market,quantity:l.quantity,avgPrice:l.avgPrice,buyDate:l.buyDate,lastPrice:l.lastPrice});
