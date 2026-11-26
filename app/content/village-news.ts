// 유저 워크플로우 6장 (뉴스 표지판) and 4장 (상인의 전날 뉴스): example articles until the news feed is connected (every
// one is marked 예시 기사 on screen). Deterministic by stock and day, so the same day shows the same board. No advice and no
// price calls in the titles (CLAUDE.md 대사 규칙): what happened, not what to do.
// The company overviews are short plain facts for the 종목 상태 창 (3장).
// summary: the feed's excerpt under the headline (사용자 2026-11-22: RSS has no body but has a short excerpt; the live
// feed's comes from core/content/live/rss.ts). The examples carry one in the same plain voice.
import {kstWhen,type LiveNews} from '../core/content/live/naver';
export type Article={id:string;theme:Theme;title:string;summary:string|null;code:string;name:string;day:string};
export const THEMES=['실적','업황','정책','공시'] as const;
export type Theme=typeof THEMES[number];
type Ex=(n:string)=>[title:string,summary:string];
const TITLES:Record<Theme,Ex[]>={
  실적:[n=>[`${n}, 분기 매출 발표 일정 공개`,`회사는 다음 달 둘째 주에 분기 실적을 발표한다고 공시했다. 발표 뒤에는 설명회가 이어진다.`],
    n=>[`${n} 영업이익 전년 같은 분기와 비교한 수치 나와`,`이번 분기 영업이익과 지난해 같은 분기 수치가 함께 공개됐다. 부문별 이익은 다음 주 보고서에 실린다.`],
    n=>[`증권가, ${n} 이번 분기 실적 추정치 모아 보니`,`증권사 다섯 곳의 매출·영업이익 추정치를 모은 결과다. 추정치 사이의 차이는 영업이익 쪽이 더 컸다.`]],
  업황:[n=>[`${n} 업계, 이번 달 수출 물량 집계`,`관세청 집계로 이번 달 이 업종의 수출 물량이 나왔다. 지역별로는 미국과 동남아 비중이 컸다.`],
    n=>[`원자재 값 움직임, ${n} 업계 원가에 미치는 영향 짚어 보니`,`주요 원자재의 최근 한 달 값 변화를 정리했다. 업체마다 원가에서 원자재가 차지하는 비중이 달라 영향도 다르다.`],
    n=>[`${n} 경쟁사 신제품 출시 소식`,`같은 시장의 경쟁사가 새 제품을 내놓았다. 출시 지역과 가격대는 이달 안에 정해진다.`]],
  정책:[n=>[`정부 지원책 발표, ${n} 업종도 대상에 포함`,`정부가 설비 투자 세액 공제를 넓히는 안을 발표했다. 이 업종도 대상에 들어갔고 세부 기준은 시행령에 담긴다.`],
    n=>[`새 규제안 의견 수렴 시작, ${n} 업계 관심`,`관계 부처가 새 규제안을 공개하고 의견을 받기 시작했다. 의견 수렴은 한 달 동안 이어진다.`],
    n=>[`금리 결정 앞두고 ${n} 업종 차입 부담 점검`,`이 업종 상장사들의 차입금과 이자 비용을 정리했다. 금리 결정은 다음 주에 나온다.`]],
  공시:[n=>[`${n}, 자기주식 관련 공시 제출`,`회사가 자기주식 취득·처분 관련 공시를 냈다. 규모와 기간은 공시 원문에 적혀 있다.`],
    n=>[`${n} 대표이사 변경 공시`,`이사회가 새 대표이사를 선임했다고 공시했다. 취임일은 공시에 적힌 날짜부터다.`],
    n=>[`${n}, 신규 시설 투자 공시`,`회사가 새 생산 시설에 투자한다고 공시했다. 투자 금액과 완공 예정 시기가 함께 나왔다.`]],
};
// The example articles never name the real company (2026-11-24): a made-up "NAVER 대표이사 변경 공시" dated today reads
// as a claim about a listed company even under 예시 기사. The board still files each under the stock it was drawn for.
const EXAMPLE_CO='예시 회사';
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
// today's articles on these stocks: zero to two each, each with a theme
export function articlesFor(stocks:{code:string;name:string}[],day:string):Article[]{
  const out:Article[]=[];
  for(const s of stocks){const h=hash(s.code+day),n=h%3;for(let i=0;i<n;i++){const theme=THEMES[(h>>>(4+i*3))%THEMES.length],list=TITLES[theme];
    const [title,summary]=list[(h>>>(9+i*5))%list.length](EXAMPLE_CO);
    out.push({id:`${s.code}-${day}-${i}`,theme,title,summary,code:s.code,name:s.name,day})}}
  return out;
}
// the day before's one article on a candidate (the merchant's communicator)
export function dayBeforeArticle(s:{code:string;name:string},day:string):Article{
  const prev=new Date(day+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);const d=prev.toISOString().slice(0,10);
  const h=hash(s.code+d),theme=THEMES[h%THEMES.length],list=TITLES[theme];
  const [title,summary]=list[(h>>>7)%list.length](EXAMPLE_CO);
  return {id:`${s.code}-${d}-p`,theme,title,summary,code:s.code,name:s.name,day:d};
}
export const OVERVIEW:Record<string,string>={
  '005930':'메모리 반도체·스마트폰·가전을 만드는 회사예요.',
  '000660':'D램·낸드 같은 메모리 반도체를 만드는 회사예요.',
  '373220':'전기차·에너지 저장용 배터리를 만드는 회사예요.',
  '005380':'승용차·상용차를 만들어 국내외에 파는 회사예요.',
  '035420':'검색 포털과 쇼핑·웹툰·클라우드 서비스를 하는 회사예요.',
  '035720':'메신저 카카오톡과 그 위의 결제·콘텐츠 서비스를 하는 회사예요.',
  '068270':'바이오시밀러(복제 바이오 의약품)를 개발·판매하는 회사예요.',
  '105560':'은행·증권·보험을 거느린 금융지주회사예요.',
  '012450':'항공기 엔진·방산 장비를 만드는 회사예요.',
  '005490':'철강 회사 포스코와 2차전지 소재 사업을 거느린 지주회사예요.',
  '247540':'2차전지 양극재를 만드는 회사예요.',
  '196170':'바이오 의약품 제형 기술을 개발하는 회사예요.',
};
export const overviewOf=(code:string|undefined,name:string)=>code&&OVERVIEW[code]?OVERVIEW[code]:`${name}의 기업 개요는 아직 준비 중이에요.`;

// 통신기 뉴스 탭 (피드백 2026-11-26 "통신기가 주된 교육 컨텐츠, 기사도 기능도 설명도 현실과 비슷하게"): the app's news list
// reads like a broker app's — a publisher, a time, the headline, a body, the related stock — and every article carries
// "이 기사에서 볼 것", what a careful reader checks. The live feed (core/content/live/rss.ts) has a headline, a link and an
// excerpt; until it is connected these are 모의 기사 (fictional publishers, no figures, no calls) and say so on screen.
export type NewsCard=Article&{press:string;time:string;body:string[];look:string;live:boolean;url?:string};
const PRESS=['마을경제','정원일보','리씽크뉴스','나루통신','광장비즈'];
const MORE:Record<Theme,string[]>={
  실적:['시장에서는 매출보다 영업이익의 변화를 더 눈여겨보는 분위기다. 일회성 비용이 있었는지도 함께 확인되고 있다.','회사 측은 자세한 부문별 숫자를 분기 보고서에 담겠다고 밝혔다. 보고서는 전자공시시스템에 올라간다.'],
  업황:['업계 관계자는 지역별 수요가 고르지 않다고 설명했다. 다음 달 집계에서 흐름이 이어지는지가 관심이다.','같은 업종이라도 회사마다 제품 구성이 달라 영향은 다르게 나타날 수 있다.'],
  정책:['세부 기준은 아직 확정되지 않았다. 적용 시기와 대상은 시행령과 고시에서 정해진다.','업계는 의견 수렴 기간 동안 건의 사항을 모아 전달할 계획이다.'],
  공시:['공시 원문에는 규모, 기간, 목적이 적혀 있다. 투자자는 전자공시시스템(DART)에서 원문을 볼 수 있다.','이번 공시는 정정 공시가 아닌 최초 제출이다. 이후 진행 상황은 추가 공시로 알려진다.'],
};
export const LOOK:Record<Theme,string>={
  실적:'매출·영업이익을 작년 같은 분기와 비교해요. 증권가 예상치(컨센서스)보다 높았는지 낮았는지가 주가에 더 크게 반영되기도 해요.',
  업황:'업종 전체 얘기예요. 이 회사 매출에서 그 사업이 차지하는 비중이 얼마인지 같이 봐야 영향을 가늠할 수 있어요.',
  정책:'"발표"와 "시행"은 달라요. 언제부터, 누구에게 적용되는지 세부 기준이 나와야 효과를 알 수 있어요.',
  공시:'공시는 회사가 직접 낸 공식 문서예요. 기사보다 원문(DART)이 정확해요. 숫자와 날짜를 원문에서 확인해요.',
};
// a stock's cards for a day: today's (articlesFor) and the day before's, newest first
export function newsCards(stocks:{code:string;name:string}[],day:string):NewsCard[]{
  const prev=new Date(day+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);const d0=prev.toISOString().slice(0,10);
  const list=[...articlesFor(stocks,day),...stocks.map(s=>dayBeforeArticle(s,day))].filter((a,i,all)=>all.findIndex(b=>b.title===a.title&&b.code===a.code)===i);
  return list.map(a=>{const h=hash(a.id),hh=a.day===d0?16+(h%3):7+(h%10),mm=(h>>>5)%60;
    return {...a,press:PRESS[h%PRESS.length],time:`${a.day===d0?'어제 ':''}${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`,
      body:[a.summary??'',MORE[a.theme][(h>>>9)%MORE[a.theme].length]].filter(Boolean),look:LOOK[a.theme],live:false}})
    .sort((x,y)=>(y.day+(y.time.replace('어제 ',''))).localeCompare(x.day+(x.time.replace('어제 ',''))));
}

// 실제 기사 (db/functions/news-feed, NAVER API HUB): a stock with real articles shows those, newest first; a stock the
// feed could not reach (signed out, no invite, no key, nothing found) keeps its 모의 기사, so the list is never empty
// and every card still says which it is. The real card's body is the publisher's own short description, and "원문 보기"
// opens the article; no body is kept (core/content/live/naver.ts).
export function liveCard(n:LiveNews,name:string,today:string):NewsCard{
  const {day,time}=kstWhen(n.publishedAt,today);
  return {id:n.id,theme:n.theme,title:n.title,summary:n.summary,code:n.code,name,day,press:n.press,time,
    body:n.summary?[n.summary]:[],look:LOOK[n.theme],live:true,url:n.url};
}
export function mergeNews(stocks:{code:string;name:string}[],day:string,live:Record<string,LiveNews[]>|null):NewsCard[]{
  const real=stocks.filter(s=>live?.[s.code]?.length);
  const realCards=real.flatMap(s=>live![s.code].map(n=>({n,c:liveCard(n,s.name,day)}))).sort((a,b)=>a.n.publishedAt<b.n.publishedAt?1:-1).map(x=>x.c)
    .filter((c,i,all)=>all.findIndex(o=>o.url===c.url)===i);   // one article naming two of my stocks shows once
  return [...realCards,...newsCards(stocks.filter(s=>!real.includes(s)),day)];
}
// the board on the square: real articles count as today's when they came out today or yesterday
export function boardArticles(stocks:{code:string;name:string}[],day:string,live:Record<string,LiveNews[]>|null):(Article&{live:boolean;url?:string;press?:string})[]{
  const real=stocks.filter(s=>live?.[s.code]?.length);
  const prev=new Date(day+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);const d0=prev.toISOString().slice(0,10);
  const realOnes=real.flatMap(s=>live![s.code].map(n=>liveCard(n,s.name,day))).filter(c=>c.day===day||c.day===d0)
    .filter((c,i,all)=>all.findIndex(o=>o.url===c.url)===i)
    .map(c=>({id:c.id,theme:c.theme,title:c.title,summary:c.summary,code:c.code,name:c.name,day:c.day,live:true,url:c.url,press:c.press}));
  return [...realOnes,...articlesFor(stocks.filter(s=>!real.includes(s)),day).map(a=>({...a,live:false}))];
}
