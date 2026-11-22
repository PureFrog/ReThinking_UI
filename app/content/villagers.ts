// 유저 워크플로우 (PM 2026-11-21): the village's people, each at its place. They are the player's own figure
// (Explorer3D) in their work clothes, so no new model is needed; a Blender model can replace any of them later.
//   농부      실제 밭: plants my real holdings, edits them later, and harvests virtual trees into the cart
//   상인      가상 밭: 08:00–20:00 KST, the communicator with today's five
//   사서      도서관: my journal, written by me
//   신문 배달  광장의 뉴스 표지판: today's news on my holdings
//   건물 점원  건물 상점(꽃·나무·건물) · 옷 점원 옷 상점
// 나루 the otter is the fisher at the pond (already there). Positions are the compact layout (core/world.ts spreads them).
import type {Look} from '../core/wardrobe';
import {spreadXZ} from '../core/world';

export type VillagerId='farmer'|'merchant'|'librarian'|'paperboy'|'builder'|'tailor';
export type Villager={id:VillagerId;name:string;place:string;look:Look;x:number;z:number;face:number};
const V:Villager[]=[
  {id:'farmer',name:'농부',place:'실제 종목 밭',look:{coat:'coat_vest',hat:'hat_straw',bag:null,tool:'tool_trowel',palette:'bark'},x:0.6,z:2.5,face:0.9},
  {id:'merchant',name:'상인',place:'가상 종목 밭',look:{coat:'coat_knit',hat:'hat_beret',bag:'bag_brief',tool:null,palette:'seal'},x:17.6,z:2.6,face:-1.9},
  {id:'librarian',name:'사서',place:'도서관',look:{coat:'coat_lab',hat:null,bag:null,tool:'tool_notebook',palette:'ink'},x:3.7,z:-9.1,face:-0.5},
  {id:'paperboy',name:'신문 배달',place:'뉴스 표지판',look:{coat:'coat_vest',hat:'hat_explorer',bag:'bag_tube',tool:null,palette:'sky'},x:-2.07,z:-3.5,face:0.6},
  {id:'builder',name:'건물 점원',place:'건물 상점',look:{coat:'coat_vest',hat:'hat_lamp',bag:null,tool:'tool_staff',palette:'moss'},x:-8.1,z:1.3,face:1.4},
  {id:'tailor',name:'옷 점원',place:'옷 상점',look:{coat:'coat_rain',hat:'hat_beret',bag:null,tool:null,palette:'sky'},x:-9.5,z:2.3,face:1.2},
];
// 피드백 2026-11-21 "농부가 한가운데": the farmer stands between the real field and the virtual field, with the cart
// beside him (placed in the spread layout directly)
const PLACED:Partial<Record<VillagerId,{x:number;z:number}>>={farmer:{x:11.3,z:3.5}};
export const VILLAGERS:Villager[]=V.map(v=>PLACED[v.id]?{...v,...PLACED[v.id]!,face:0}:spreadXZ(v));
export const villager=(id:VillagerId)=>VILLAGERS.find(v=>v.id===id)!;
// the things that stand by them (compact layout, spread): the news board, the clothes stall, the merchant's stall,
// the farmer's cart
// 피드백 2026-11-21 "위치를 잘 이쁘게": the board by the north path, the clothes stall up the west side, the builder
// beside the shop cart: each with its own patch of lawn
export const NEWS_BOARD=spreadXZ({x:-3.3,z:-4.0,rot:0.6});
export const TAILOR_STALL=spreadXZ({x:-10.4,z:1.9,rot:1.3});
export const MERCHANT_STALL=spreadXZ({x:18.4,z:2.0,rot:-1.9});
export const FARM_CART={x:12.5,z:4.5,rot:0.3};

// what each says when the first walk is not at their station yet (보리 points back to the current one)
export const WALK_LINES={
  square:'나는 보리야. 첫 산책 동안 길을 알려 줄게. 여기가 우리 마을이야. 저기 두 밭이랑 도서관 보이지? 다니기 전에 내가 마을 친구들한테 한 명씩 데려다줄게. 너는 그냥 보면서 각자 무슨 일을 하는지 들어 봐.',
  hint:(who:string,what:string)=>`지금은 ${who}한테 가 보자. ${what}`,
  done:'이제 마을 어디든 마음대로 다녀. 아, 집에 한 번 다시 들어가 봐. 선생님이랑 사서가 집 안에서 기다리고 있어.',
};
// the station's goal in a few words (the guide at the top of the screen and 보리's hint)
export const STEP_GOAL:Record<string,{who:string;what:string}>={
  farmer:{who:'농부',what:'내 종목을 밭에 심어 줄 거야.'},
  merchant:{who:'상인',what:'시작 코인으로 가상 종목을 사 보자.'},
  sell:{who:'농부',what:'가상 나무를 팔아 보자. 농부가 열매를 따서 수레에 실어 줘.'},
  librarian:{who:'사서',what:'아까 심은 나무로 첫 일지를 써 보자.'},
  news:{who:'신문 배달',what:'오늘 내 종목 소식을 받아 보자.'},
  fisher:{who:'나루',what:'낚시를 한 번 해 보자.'},
  'shop-build':{who:'건물 점원',what:'꽃·나무·건물 파는 곳이야.'},
  'shop-wear':{who:'옷 점원',what:'옷 파는 곳이야.'},
};

// 피드백 2026-11-21 "각 캐릭터 역할도 소개": who each one is, under the name in every talk, and what each says the first
// time I come out to the village (보리 introduces them one by one on the square, the camera in front of each)
export const ROLE:Record<string,string>={
  teacher:'퀴즈 선생님 · 방',tori:'분석가 · 돈 버는 힘',moa:'분석가 · 쓰러질 위험',luon:'분석가 · 건강검진 9칸 · 채점',bori:'마을 안내',farmer:'실제 종목 밭 · 매도 담당',merchant:'가상 종목 밭 · 매수 담당',librarian:'집 안 책장 · 투자일지',
  paperboy:'뉴스 표지판 · 내 종목 소식',naru:'낚시터 · 코인 벌기',builder:'건물 상점 · 마을 꾸미기',tailor:'옷 상점 · 옷장',
};
export const INTRO:Record<string,string>={
  // 피드백 2026-11-22: the three analysts are met first, the same way (their lines from content/intro.ts)
  tori:'안녕, 나는 토리야. 나는 회사가 돈을 어떻게 버는지 봐. 물건을 많이 팔아서 버는지, 하나 팔 때 많이 남겨서 버는지, 빚을 내서 크게 굴려서 버는지 나눠서 살펴. 네 나무 중에 돈 버는 힘이 약해진 회사가 보이면, 내가 그 나무 옆에서 말풍선으로 알려 줄게.',
  moa:'나는 모아야. 나는 회사가 혹시 쓰러질 위험은 없는지 봐. 빚이 너무 많지는 않은지, 당장 쓸 돈이 모자라지는 않은지, 손해가 계속 나고 있지는 않은지 살펴. 위험해 보이는 나무가 있으면 내가 먼저 너한테 찾아갈게.',
  luon:'나는 루온이야. 나는 회사 건강검진표를 아홉 칸으로 채점해. 작년보다 돈을 잘 버는지, 빚이 줄었는지, 장사를 더 알뜰하게 하는지 칸마다 통과인지 아닌지 매겨서 몇 점인지 보여 줘. 그리고 네가 남긴 판단이 30일, 90일 뒤에 맞았는지도 내가 채점해서 가져올게.',
  farmer:'안녕, 나는 농부야. 네가 실제로 가진 종목을 이 밭에 나무로 심고, 나중에 사거나 팔면 기록을 고쳐 줘. 가상 나무를 팔 땐 내가 열매를 따서 수레에 실어.',
  merchant:'반가워, 나는 상인이야. 매일 아침 8시부터 저녁 8시까지 여기 있어. 통신기로 오늘 들어온 종목을 보여 주고, 게임 코인으로 가상 종목을 사게 해 줘.',
  librarian:'어서 와, 나는 사서야. 이 도서관엔 네가 쓴 투자일지만 모아 둬. 종목마다 책이 있고, 쓴 날마다 갈피가 꽂혀.',
  paperboy:'안녕! 나는 신문 배달이야. 매일 네 종목 소식을 모아서 광장 표지판에 꽂아 둬. 판단은 네 몫이고, 나는 무슨 일이 있었는지만 전해.',
  builder:'어서 와, 나는 건물 점원이야. 마을에 놓을 꽃·나무·건물을 코인으로 팔아.',
  tailor:'안녕, 나는 옷 점원이야. 네 옷을 코인으로 팔고, 산 옷은 옷장에 넣어 둬.',
  naru:'나는 나루야. 개울 옆 이 연못에서 낚시를 같이 해. 하루 몇 번 던질 수 있고, 잡은 물고기만큼 코인이 들어와.',
};
