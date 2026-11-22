// 유저 워크플로우 6장 (뉴스 표지판) and 4장 (상인의 전날 뉴스): example articles until the news feed is connected (every
// one is marked 예시 기사 on screen). Deterministic by stock and day, so the same day shows the same board. No advice and no
// price calls in the titles (CLAUDE.md 대사 규칙): what happened, not what to do.
// The company overviews are short plain facts for the 종목 상태 창 (3장).
export type Article={id:string;theme:Theme;title:string;code:string;name:string;day:string};
export const THEMES=['실적','업황','정책','공시'] as const;
export type Theme=typeof THEMES[number];
const TITLES:Record<Theme,((n:string)=>string)[]>={
  실적:[n=>`${n}, 분기 매출 발표 일정 공개`,n=>`${n} 영업이익 전년 같은 분기와 비교한 수치 나와`,n=>`증권가, ${n} 이번 분기 실적 추정치 모아 보니`],
  업황:[n=>`${n}이 속한 업계, 이번 달 수출 물량 집계`,n=>`원자재 값 움직임, ${n} 업계 원가에 미치는 영향 짚어 보니`,n=>`${n} 경쟁사 신제품 출시 소식`],
  정책:[n=>`정부 지원책 발표, ${n} 업종도 대상에 포함`,n=>`새 규제안 의견 수렴 시작, ${n} 업계 관심`,n=>`금리 결정 앞두고 ${n} 업종 차입 부담 점검`],
  공시:[n=>`${n}, 자기주식 관련 공시 제출`,n=>`${n} 대표이사 변경 공시`,n=>`${n}, 신규 시설 투자 공시`],
};
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
// today's articles on these stocks: zero to two each, each with a theme
export function articlesFor(stocks:{code:string;name:string}[],day:string):Article[]{
  const out:Article[]=[];
  for(const s of stocks){const h=hash(s.code+day),n=h%3;for(let i=0;i<n;i++){const theme=THEMES[(h>>>(4+i*3))%THEMES.length],list=TITLES[theme];
    out.push({id:`${s.code}-${day}-${i}`,theme,title:list[(h>>>(9+i*5))%list.length](s.name),code:s.code,name:s.name,day})}}
  return out;
}
// the day before's one article on a candidate (the merchant's communicator)
export function dayBeforeArticle(s:{code:string;name:string},day:string):Article{
  const prev=new Date(day+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);const d=prev.toISOString().slice(0,10);
  const h=hash(s.code+d),theme=THEMES[h%THEMES.length],list=TITLES[theme];
  return {id:`${s.code}-${d}-p`,theme,title:list[(h>>>7)%list.length](s.name),code:s.code,name:s.name,day:d};
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
