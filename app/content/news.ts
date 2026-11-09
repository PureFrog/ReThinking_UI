// News for the fertilizer quiz (ux-spec 13.7-8). Each item is one recent piece of a company's news written two ways:
// as it happened and turned around. The quiz shows one of the two and asks "이게 맞을까?"; after the answer it shows
// what actually happened and why it matters. It never asks whether such news exists, and says nothing about buying,
// selling or where a price goes.
// Today the items are mock data (CLAUDE.md). A backend LLM reading real news replaces newsProvider later (13.7-9).
export type NewsItem={id:string;company:string;fact:string;flipped:string;why:string};
export type NewsQuiz={id:string;company:string;statement:string;truth:boolean;fact:string;why:string};
export type NewsProvider={quizFor(company:string,day:string,answered:string[]):NewsQuiz|null};

const MOCK_NEWS:NewsItem[]=[
 {id:'sb-1',company:'새봄반도체',fact:'새봄반도체가 새 공장의 시험 가동을 시작했다.',flipped:'새봄반도체가 새 공장의 시험 가동을 내년으로 미뤘다.',why:'시험 가동 시점은 생산 능력이 언제 늘 수 있는지 가늠하는 단서야.'},
 {id:'sb-2',company:'새봄반도체',fact:'새봄반도체의 가장 큰 고객사가 공급 계약을 3년 연장했다.',flipped:'새봄반도체의 가장 큰 고객사가 공급 계약을 연장하지 않기로 했다.',why:'큰 고객과의 계약 기간은 매출이 얼마나 안정적인지 보여 줘.'},
 {id:'sb-3',company:'새봄반도체',fact:'새봄반도체가 연구 인력을 지난해보다 20% 늘렸다고 밝혔다.',flipped:'새봄반도체가 연구 인력을 지난해보다 20% 줄였다고 밝혔다.',why:'연구 인력의 변화는 회사가 어디에 힘을 싣는지 보여 줘.'},
 {id:'bs-1',company:'별숲게임즈',fact:'별숲게임즈의 신작 출시가 내년 봄으로 연기됐다.',flipped:'별숲게임즈의 신작이 예정대로 올가을에 출시됐다.',why:'출시 일정은 새 매출이 언제부터 들어올 수 있는지와 이어져.'},
 {id:'bs-2',company:'별숲게임즈',fact:'별숲게임즈가 해외 퍼블리셔와 손잡고 일본 서비스를 시작했다.',flipped:'별숲게임즈가 일본 서비스를 종료하기로 했다.',why:'새 지역 진출은 이용자 기반이 넓어지는지 볼 수 있는 대목이야.'},
 {id:'bs-3',company:'별숲게임즈',fact:'별숲게임즈 대표작의 하루 이용자 수가 지난 분기보다 줄었다.',flipped:'별숲게임즈 대표작의 하루 이용자 수가 지난 분기보다 늘었다.',why:'대표작 이용자 수는 지금 매출의 바탕이 얼마나 단단한지 보여 줘.'},
 {id:'kb-1',company:'꽃빛뷰티',fact:'꽃빛뷰티가 동남아 3개국 매장 입점을 마쳤다.',flipped:'꽃빛뷰티가 동남아 매장에서 모두 철수했다.',why:'판매 지역이 넓어지는지는 성장 계획이 실제로 움직이는지 보여 줘.'},
 {id:'kb-2',company:'꽃빛뷰티',fact:'꽃빛뷰티의 주력 크림 원료 가격이 올라 원가 부담이 커졌다.',flipped:'꽃빛뷰티의 주력 크림 원료 가격이 내려 원가 부담이 줄었다.',why:'원료 가격이 바뀌면 같은 양이 나가도 남는 몫이 달라져.'},
 {id:'kb-3',company:'꽃빛뷰티',fact:'꽃빛뷰티가 온라인 자사몰 매출 비중이 처음으로 절반을 넘었다고 밝혔다.',flipped:'꽃빛뷰티가 온라인 자사몰을 닫고 매장 판매에만 집중하기로 했다.',why:'어디서 파는지에 따라 유통 비용과 고객과의 거리가 달라져.'},
 {id:'ds-1',company:'달빛스튜디오',fact:'달빛스튜디오가 제작한 애니메이션이 해외 영화제 본선에 올랐다.',flipped:'달빛스튜디오가 제작한 애니메이션이 해외 영화제 예선에서 떨어졌다.',why:'작품의 평판은 다음 작품의 투자와 판권 계약에 영향을 줄 수 있어.'},
 {id:'ds-2',company:'달빛스튜디오',fact:'달빛스튜디오의 차기작 제작비가 처음 계획보다 늘었다.',flipped:'달빛스튜디오의 차기작 제작비가 처음 계획보다 줄었다.',why:'제작비가 늘면 같은 흥행에서도 남는 몫이 작아질 수 있어.'},
 {id:'ds-3',company:'달빛스튜디오',fact:'달빛스튜디오가 캐릭터 상품 판매를 위해 완구 회사와 계약했다.',flipped:'달빛스튜디오가 완구 회사와의 캐릭터 상품 계약을 끝냈다.',why:'작품 밖에서 버는 길이 있는지는 수입이 한 작품에만 기대는지 가늠하게 해.'},
 {id:'pc-1',company:'푸른칩테크',fact:'푸른칩테크가 전기차용 칩의 품질 인증을 받았다.',flipped:'푸른칩테크의 전기차용 칩이 품질 인증 심사에서 탈락했다.',why:'인증은 새 고객에게 납품을 시작할 수 있는 조건이야.'},
 {id:'pc-2',company:'푸른칩테크',fact:'푸른칩테크가 공장 한 곳의 가동을 정비 때문에 2주 멈췄다.',flipped:'푸른칩테크가 공장 한 곳을 2주 동안 쉬지 않고 최대로 돌렸다.',why:'가동 중단 기간은 그 분기 생산량에 바로 이어져.'},
 {id:'is-1',company:'이슬코스메틱',fact:'이슬코스메틱이 친환경 용기로 전 제품을 바꾸기 시작했다.',flipped:'이슬코스메틱이 친환경 용기 전환 계획을 취소했다.',why:'포장 변화는 비용과 브랜드 이미지 양쪽에 영향을 줘.'},
 {id:'is-2',company:'이슬코스메틱',fact:'이슬코스메틱의 대표 제품이 대형 온라인몰 판매 1위에 올랐다.',flipped:'이슬코스메틱의 대표 제품이 대형 온라인몰에서 판매가 중단됐다.',why:'대표 제품의 반응은 지금 브랜드가 얼마나 찾아지는지 보여 줘.'},
];

// Stable small hash so the same day and item always read the same way (no flicker on reopening).
const hash=(s:string)=>{let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h};

// Picks the company's first item not yet answered (rotating by day), shown as it happened or turned around.
export function mockQuizFor(items:NewsItem[],company:string,day:string,answered:string[]):NewsQuiz|null{
 const own=items.filter(n=>n.company===company);if(!own.length)return null;
 const fresh=own.filter(n=>!answered.includes(n.id));const pool=fresh.length?fresh:own;const item=pool[hash(day+company)%pool.length];
 const truth=hash(day+item.id)%2===0;
 return {id:item.id,company,statement:truth?item.fact:item.flipped,truth,fact:item.fact,why:item.why};
}
export const newsProvider:NewsProvider={quizFor:(company,day,answered)=>mockQuizFor(MOCK_NEWS,company,day,answered)};
export const NEWS_ITEMS=MOCK_NEWS;
