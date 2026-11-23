// The 3D garden's demo portfolio: every growth stage and every condition shows at least once (R2).
// Real KRX names (지기 prototype list, app/core/jigi/stocks.ts) with mock numbers and mock prices. The capture onboarding (app/core/portfolio.ts) replaces these with the player's own.
import type {Holding,Condition,Growth} from '../core/model';
import {stockOf} from '../core/jigi/stocks';
// how many plots the 3D garden has (app/proto3d/Scene3D.tsx FARM)
export const GARDEN_PLOTS=18;// open at first: the farm's nine and the orchard's nine; more with land (app/core/land.ts openPlots)
export const DEMO_HOLDINGS:Holding[]=[
  {id:1,name:'SK하이닉스',code:'000660',kind:0,price:165900,quantity:12,date:'2026-08-01',rate:12.4,plot:0,lossDays:0},
  {id:2,name:'NAVER',code:'035420',kind:2,price:185100,quantity:8,date:'2025-06-01',rate:7.2,plot:1,lossDays:0},
  {id:3,name:'카카오',code:'035720',kind:1,price:47400,quantity:20,date:'2026-09-01',rate:-13,plot:2,lossDays:25},
  {id:4,name:'현대차',code:'005380',kind:2,price:304000,quantity:10,date:'2025-12-01',rate:-24,plot:3,lossDays:90},
  {id:5,name:'한화에어로스페이스',code:'012450',kind:0,price:352500,quantity:30,date:'2026-10-24',rate:1.1,plot:4,lossDays:0},
  {id:6,name:'삼성전자',code:'005930',kind:1,price:74300,quantity:5,date:'2026-10-10',rate:-4.2,plot:5,lossDays:6},
  {id:7,name:'POSCO홀딩스',code:'005490',kind:0,price:410500,quantity:9,date:'2026-06-15',rate:-22.5,plot:6,lossDays:40},
];
// 피드백 2026-11-22 "실제 종목 칸에는 코스닥 종목": the example garden a new player starts from (예시 정원으로 시작) holds
// KOSDAQ120 names with the same shapes (dates, returns, plots) as above; the average price is set so today's mock
// close shows the return. The ?demo garden above stays for the tests and the signals written for it.
const K_NAMES=['136480','214150','095660','028300','319660','267980','095700'];
export const DEMO_KOSDAQ:Holding[]=DEMO_HOLDINGS.map((h,i)=>{const k=stockOf(K_NAMES[i])!;
  return {...h,name:k.name,code:k.code,price:Math.max(50,Math.round(k.anchor/(1+h.rate/100)/50)*50)}});
// dry labels for the card (the old CONDITION_NAMES were poetic)
export const CONDITION_LABEL:Record<Condition,string>={bloom:'강세',well:'양호',dull:'약세',wilt:'손실 확대',rot:'장기 손실',dead:'손실 고착'};
export const GROWTH_LABEL:Record<Growth,string>={seed:'보유 1주 미만',sprout:'보유 1달 미만',sapling:'보유 3달 미만',young:'보유 반년 미만',grand:'보유 반년 이상'};
