// 유저 워크플로우 (PM 2026-11-21): the village's people, each at its place. They are the player's own figure
// (Explorer3D) in their work clothes, so no new model is needed; a Blender model can replace any of them later.
//   농부      실제 밭: plants my real holdings, edits them later, and harvests virtual trees into the cart
//   상인      가상 밭: 08:00–20:00 KST, the communicator with today's five
//   사서      도서관: my journal, written by me
//   신문 배달  광장의 뉴스 표지판: today's news on my holdings
//   건물 상인  건물 상점(꽃·나무·건물) · 옷 상인 옷 상점
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
  {id:'builder',name:'건물 상인',place:'건물 상점',look:{coat:'coat_vest',hat:'hat_lamp',bag:null,tool:'tool_staff',palette:'moss'},x:-8.1,z:1.3,face:1.4},
  {id:'tailor',name:'옷 상인',place:'옷 상점',look:{coat:'coat_rain',hat:'hat_beret',bag:null,tool:null,palette:'sky'},x:-9.5,z:2.3,face:1.2},
];
// 피드백 2026-11-21 "농부가 한가운데": the farmer stands between the real field and the virtual field, with the cart
// beside him (placed in the spread layout directly)
// 피드백 2026-11-23 "맵을 넓게, 너무 옹기종기": each station has its own corner of the village (places.ts PLACE_AT): the
// building shop far west, the clothes stall south-west by the stream, the news board north-west of the middle, the
// library (with the 사서) north-east (spread coordinates, written directly)
const PLACED:Partial<Record<VillagerId,{x:number;z:number;face?:number}>>={farmer:{x:12.4,z:0.1,face:-1.57},
  builder:{x:-18.1,z:2.3,face:1.4},tailor:{x:-14.4,z:11.2,face:1.2},paperboy:{x:-5.4,z:-6.1,face:0.6},librarian:{x:9.9,z:-10.0,face:-0.74},
  merchant:{x:16.2,z:12.9,face:-1.57}};
export const VILLAGERS:Villager[]=V.map(v=>{const p=PLACED[v.id];return p?{...v,x:p.x,z:p.z,face:p.face??v.face}:spreadXZ(v)});
export const villager=(id:VillagerId)=>VILLAGERS.find(v=>v.id===id)!;
// the things that stand by them (compact layout, spread): the news board, the clothes stall, the merchant's stall,
// the farmer's cart
// 피드백 2026-11-21 "위치를 잘 이쁘게": the board by the north path, the clothes stall up the west side, the builder
// beside the shop cart: each with its own patch of lawn
export const NEWS_BOARD={x:-6.8,z:-6.9,rot:0.6};
// 피드백 2026-11-23 "건물점원 옆에 옷 상인": the clothes shop right beside the building shop (place('cart', -19,0.8),
// facing the same way), a step south of it
export const TAILOR_STALL={x:-21.4,z:7.2,rot:1.2};
// 피드백 2026-11-24: the farmer and his cart between the two fields, the merchant's shop past 가상 종목 밭 (across the path)
// the merchant faces the middle (피드백 2026-11-24 "상인은 앞보라고"), no stepping stones out to the shop
export const MERCHANT_STALL={x:17.4,z:12.9,rot:-Math.PI/2};
export const FARM_CART={x:14.6,z:0.1,rot:Math.PI};

// what each says when the first walk is not at their station yet (보리 points back to the current one)
export const WALK_LINES={
  // 피드백 2026-11-24 "자기소개 한 다음 따로 하지 말고 소개하면서 같이 한 번에": no separate round of introductions; each one
  // says who they are when I come to do their part with them
  square:'나는 보리야. 언덕 위 관측소에 살아. 마을 사람들 한 명씩 만나 보자. 만날 사람한테 빛을 비춰 줄게.',
  hint:(who:string,what:string)=>`그건 이따 보자. 지금은 ${who}한테 가 보자. ${what}`,
  done:'이제 자유롭게 다녀. 네 종목에 신호가 잡히면 내가 찾아갈게. 집에 선생님이 기다리고 있어.',
};
// the station's goal in a few words (the guide at the top of the screen and 보리's hint)
export const STEP_GOAL:Record<string,{who:string;what:string}>={
  farmer:{who:'농부',what:'내 종목을 밭에 심어 줄 거야.'},
  merchant:{who:'상인',what:'시작 코인으로 가상 종목을 사 보자.'},
  sell:{who:'농부',what:'가상 나무를 팔아 보자. 농부가 열매를 따서 수레에 실어 줘.'},
  librarian:{who:'사서',what:'아까 심은 나무로 첫 일지를 써 보자.'},
  news:{who:'신문 배달',what:'오늘 내 종목 소식을 받아 보자.'},
  fisher:{who:'나루',what:'낚시를 한 번 해 보자.'},
  'shop-build':{who:'건물 상인',what:'꽃·나무·건물 파는 곳이야.'},
  'shop-wear':{who:'옷 상인',what:'옷 파는 곳이야.'},
};

// 피드백 2026-11-21 "각 캐릭터 역할도 소개": who each one is, under the name in every talk, and what each says the first
// time I come out to the village (보리 introduces them one by one on the square, the camera in front of each)
export const ROLE:Record<string,string>={
  teacher:'방의 선생님 · 퀴즈와 사건철',tori:'분석가 · 돈 버는 힘',moa:'분석가 · 쓰러질 위험',luon:'토론 · 내 종목 반대 근거',bori:'관측소지기 · 마을 동행과 신호 알림',farmer:'실제 종목 밭 · 매도 담당',merchant:'가상 종목 밭 · 매수 담당',librarian:'도서관 · 투자일지',
  paperboy:'뉴스 표지판 · 내 종목 소식',naru:'낚시터 · 코인 벌기',builder:'건물 상점 · 마을 꾸미기',tailor:'옷 상점 · 옷장',
};
// 피드백 2026-11-22 "역할이 드러나게": what each one does, in a word with its sign, on the name tag over them
export const ROLE_TAG:Record<string,string>={luon:'💬 종목 토론',farmer:'🌾 내 종목 심기·팔기',merchant:'📟 가상 종목 사기',paperboy:'📰 내 종목 소식',builder:'🏠 건물 상점 · 꾸미기',tailor:'👕 옷 가게',naru:'🎣 낚시로 코인',librarian:'📖 사서 · 투자일지'};
// 피드백 11-26 "윗줄은 도서관, 밑에 사서 · 투자일지": the library keeper's tag names the place first
export const TAG_NAME:Record<string,string>={librarian:'도서관'};
// 피드백 2026-11-24 "소개하면서 같이 한 번에": on the first walk each one's first talk opens with this, then goes straight
// on with what we do together (the task's own greeting is dropped: Proto3D introLine)
export const INTRO_WALK:Record<string,string>={
  farmer:'…농부다. 네가 실제로 가진 종목을 이 밭에 나무로 심어 주고, 나중에 사거나 팔면 기록을 고쳐 준다.',
  merchant:'어, 왔어? 나는 상인이야. 아침 8시부터 저녁 8시까지 여기 있어.',
  librarian:'어서 와, 나는 사서야. 이 도서관엔 네가 쓴 투자일지만 모아 둬.',
  paperboy:'나는 신문 배달이야. 매일 네 종목 소식을 표지판에 꽂아 둬.',
  builder:'어서 오세요, 건물 상인이에요.',
  tailor:'Oh, hi~ 나는 옷 상인.',
};
export const INTRO:Record<string,string>={
  // 피드백 2026-11-22: the three analysts are met first, the same way (their lines from content/intro.ts)
  tori:'나는 토리야. 회사가 돈을 어떻게 버는지 봐. 돈 버는 힘이 약해진 나무가 보이면 그 옆에서 알려 줄게.',
  moa:'나는 모아야. 회사가 쓰러질 위험을 봐. 빚, 현금, 계속되는 손해. 위험해 보이는 나무가 있으면 찾아갈게.',
  luon:'루온이에요. 종목 토론 담당이에요. 왜 갖고 있는지 듣고 빈틈을 찾아 드려요. 사라, 팔아라는 안 해요.',
  farmer:'…농부다. 네가 실제로 가진 종목을 이 밭에 나무로 심고, 나중에 사거나 팔면 기록을 고쳐 준다. 가상 나무 팔 땐 열매 따서 수레에 싣고.',
  merchant:'나는 상인이야. 아침 8시부터 저녁 8시까지 있어. 게임 코인으로 가상 종목을 사고팔아.',
  librarian:'나는 사서야. 네 투자일지를 종목별 책으로 모아 둬.',
  paperboy:'나는 신문 배달이야. 매일 네 종목 소식을 표지판에 꽂아 둬.',
  builder:'건물 상인이에요. 건물, 길, 꽃, 나무를 코인으로 팔아요.',
  tailor:'Oh, hi~ 나는 옷 상인. 네 옷을 코인으로 팔고, 산 옷은 옷장에 넣어 둬. Style은 내가 책임질게.',
  naru:'어? 안 잤어. …나는 나루야. 여기서 낚시하면 잡은 만큼 코인이 들어와.',
};
