// 유저 워크플로우 6장 (뉴스 표지판) and 4장 (상인의 전날 뉴스): example articles until the news feed is connected (every
// one is marked 예시 기사 on screen). Deterministic by stock and day, so the same day shows the same board. No advice and no
// price calls in the titles (CLAUDE.md 대사 규칙): what happened, not what to do.
// The company overviews are short plain facts for the 종목 상태 창 (3장).
// summary: the feed's excerpt under the headline (사용자 2026-11-22: RSS has no body but has a short excerpt; the live
// feed's comes from core/content/live/rss.ts). The examples carry one in the same plain voice.
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
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
// today's articles on these stocks: zero to two each, each with a theme
export function articlesFor(stocks:{code:string;name:string}[],day:string):Article[]{
  const out:Article[]=[];
  for(const s of stocks){const h=hash(s.code+day),n=h%3;for(let i=0;i<n;i++){const theme=THEMES[(h>>>(4+i*3))%THEMES.length],list=TITLES[theme];
    const [title,summary]=list[(h>>>(9+i*5))%list.length](s.name);
    out.push({id:`${s.code}-${day}-${i}`,theme,title,summary,code:s.code,name:s.name,day})}}
  return out;
}
// the day before's one article on a candidate (the merchant's communicator)
export function dayBeforeArticle(s:{code:string;name:string},day:string):Article{
  const prev=new Date(day+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);const d=prev.toISOString().slice(0,10);
  const h=hash(s.code+d),theme=THEMES[h%THEMES.length],list=TITLES[theme];
  const [title,summary]=list[(h>>>7)%list.length](s.name);
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
