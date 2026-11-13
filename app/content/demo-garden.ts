// The 3D garden's demo portfolio: every growth stage and every condition shows at least once (R2).
// Mock companies and numbers. The capture onboarding (app/core/portfolio.ts) replaces these with the player's own.
import type {Holding,Condition,Growth} from '../core/model';
// how many plots the 3D garden has (app/proto3d/Scene3D.tsx FARM)
export const GARDEN_PLOTS=14;// the farm's seven and the orchard's seven (app/proto3d/places.ts PLOTS)
export const DEMO_HOLDINGS:Holding[]=[
  {id:1,name:'새봄반도체',kind:0,price:52000,quantity:12,date:'2026-08-01',rate:12.4,plot:0,lossDays:0},
  {id:2,name:'별숲게임즈',kind:2,price:34000,quantity:8,date:'2025-06-01',rate:7.2,plot:1,lossDays:0},
  {id:3,name:'꽃빛뷰티',kind:1,price:28000,quantity:20,date:'2026-09-01',rate:-13,plot:2,lossDays:25},
  {id:4,name:'달빛스튜디오',kind:2,price:24000,quantity:10,date:'2025-12-01',rate:-24,plot:3,lossDays:90},
  {id:5,name:'바람에너지',kind:0,price:15800,quantity:30,date:'2026-10-24',rate:1.1,plot:4,lossDays:0},
  {id:6,name:'은하바이오',kind:1,price:61000,quantity:5,date:'2026-10-10',rate:-4.2,plot:5,lossDays:6},
  {id:7,name:'강철중공업',kind:0,price:43500,quantity:9,date:'2026-06-15',rate:-22.5,plot:6,lossDays:40},
];
// dry labels for the card (the old CONDITION_NAMES were poetic)
export const CONDITION_LABEL:Record<Condition,string>={bloom:'강세',well:'양호',dull:'약세',wilt:'손실 확대',rot:'장기 손실',dead:'손실 고착'};
export const GROWTH_LABEL:Record<Growth,string>={seed:'보유 1주 미만',sprout:'보유 1달 미만',sapling:'보유 3달 미만',young:'보유 반년 미만',grand:'보유 반년 이상'};
