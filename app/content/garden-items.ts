// R6 the things that go into the 3D garden: what the cart sells for the currency, what analysts bring when trust
// goes up, and the shape each one takes in the world (app/proto3d/Garden3D.tsx draws them by `shape`).
// The old 2D items (app/core/items.ts) stay with the classic app; these are the new-tone set.
import type {AnalystId} from './analysts';
export type Shape='lamp'|'bench'|'board'|'vane'|'planter'|'flag'|'crate'|'scope';
export type GardenItem={id:string;name:string;shape:Shape;desc:string;price?:number;from?:AnalystId;note?:string};
export const GARDEN_ITEMS:GardenItem[]=[
  {id:'lamp',name:'관측 램프',shape:'lamp',price:6,desc:'밤에 켜지는 작은 램프. 늦게까지 차트 볼 때.'},
  {id:'bench',name:'복기 벤치',shape:'bench',price:8,desc:'앉아서 지난 판단 다시 보는 자리.'},
  {id:'vane',name:'풍향계',shape:'vane',price:10,desc:'오늘 시장 바람 방향을 가리켜.'},
  {id:'planter',name:'화분 줄',shape:'planter',price:5,desc:'낮은 화분 셋. 냉각 씨앗 옮겨 심기 좋음.'},
  {id:'flag',name:'리그 깃발',shape:'flag',price:12,desc:'주간 리그 티어 색으로 펄럭여.'},
  {id:'crate',name:'자료 상자',shape:'crate',price:4,desc:'다 본 리포트 넣어 두는 상자.'},
  // trust gifts (not for sale)
  {id:'memo-board',name:'지난 분기 메모',shape:'board',from:'tori',desc:'토리가 쓰던 분기 메모판.',note:'다 본 거야. 형식은 참고해.'},
  {id:'scope',name:'휴대용 망원경',shape:'scope',from:'moa',desc:'모아의 예비 망원경. 받침대 포함.',note:'예비용. 렌즈는 닦아 놨어.'},
  {id:'dissent-flag',name:'반대 의견 깃발',shape:'flag',from:'luon',desc:'루온이 꽂아 둔 보라색 깃발.',note:'반대할 게 없을 때 꽂아 둬.'},
];
export const itemById=(id:string)=>GARDEN_ITEMS.find(i=>i.id===id);
export const CART_STOCK=GARDEN_ITEMS.filter(i=>i.price);
export const giftOf=(a:AnalystId)=>GARDEN_ITEMS.find(i=>i.from===a)!;
// the places an item can stand, around the house and the path (x,z on the garden sphere)
export const DECOR_SLOTS:{id:string;x:number;z:number;rot:number}[]=[
  {id:'door-l',x:-3.4,z:-0.6,rot:0.6},{id:'door-r',x:-6.8,z:0.4,rot:-0.4},{id:'fire',x:-2.6,z:0.6,rot:0.3},
  {id:'pond',x:2.8,z:6.6,rot:-0.5},{id:'path',x:0.8,z:-3.6,rot:0.1},{id:'field',x:-3.6,z:3.6,rot:0.8},
];
