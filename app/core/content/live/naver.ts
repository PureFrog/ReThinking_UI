// News from the NAVER API HUB news search (사용자 2026-11-26 "신문기사 → 실제 기사로"). The search gives a headline, the
// publisher's link, the Naver link, a short description and the time; the body is never fetched (no licence for it).
// Called only from the server function db/functions/news-feed (the keys never reach the browser):
//   GET https://naverapihub.apigw.ntruss.com/search/v1/news?query=&display=&start=&sort=date
//   headers X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY (NCP console → API HUB → 검색), 25,000 calls a day
// Kept: only articles whose headline names the company as a word (삼성전자 yes, 삼성전자우·삼성전자서비스 no), the same
// rule the sudden-drop model uses (investment-evidence-system news_review.name_in).
import {decode,excerpt} from './rss';

export const NAVER_NEWS_URL='https://naverapihub.apigw.ntruss.com/search/v1/news';
export type NaverRaw={title?:unknown;originallink?:unknown;link?:unknown;description?:unknown;pubDate?:unknown};
export type LiveNews={id:string;code:string;title:string;summary:string|null;press:string;publishedAt:string;url:string;theme:NewsTheme};
export type NewsTheme='실적'|'업황'|'정책'|'공시';

// the names the press writes for a stock when it is not the listing name (NAVER → 네이버): the first is searched, any
// of them in a headline counts
const ALIASES:Record<string,string[]>={'035420':['네이버','NAVER'],'005490':['포스코홀딩스','POSCO홀딩스','포스코'],'005380':['현대차','현대자동차'],
  '373220':['LG에너지솔루션','LG엔솔'],'207940':['삼성바이오로직스','삼성바이오'],'012450':['한화에어로스페이스','한화에어로'],
  '105560':['KB금융','KB금융지주'],'055550':['신한지주','신한금융'],'086790':['하나금융지주','하나금융'],'068270':['셀트리온'],
  '000270':['기아'],'051910':['LG화학'],'006400':['삼성SDI'],'028260':['삼성물산'],'032830':['삼성생명'],'003550':['LG'],'034730':['SK'],
  '017670':['SK텔레콤','SKT'],'030200':['KT'],'066570':['LG전자'],'009150':['삼성전기'],'010130':['고려아연'],'011200':['HMM'],'316140':['우리금융지주','우리금융']};
export const namesOf=(code:string,name:string)=>[...new Set([...(ALIASES[code]??[]),name])];
// the newest 100 (the most one call gives): a busy name's headlines about its group companies (카카오뱅크, 카카오페이)
// are dropped by the name rule, so 30 could leave none
export const naverQuery=(name:string,code='')=>({query:`"${namesOf(code,name)[0]}"`,display:'100',start:'1',sort:'date'});

const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// the name as a word: particles and 주/社 may follow; any other letter or digit means another company
export function namesCompany(name:string,title:string){
  const latin=/^[A-Za-z0-9]/.test(name);
  const re=new RegExp(`${latin?'(?<![A-Za-z0-9])':''}${esc(name)}(?:산업)?(?:은|는|이|가|을|를|의|와|과|도|에서|에게|에|로|으로|만|까지|부터|주|株|社)?(?![가-힣A-Za-z0-9])`);
  return re.test(title);
}

const PRESS:Record<string,string>={'yna.co.kr':'연합뉴스','yonhapnewstv.co.kr':'연합뉴스TV','newsis.com':'뉴시스','news1.kr':'뉴스1',
  'mk.co.kr':'매일경제','hankyung.com':'한국경제','edaily.co.kr':'이데일리','mt.co.kr':'머니투데이','sedaily.com':'서울경제',
  'fnnews.com':'파이낸셜뉴스','asiae.co.kr':'아시아경제','heraldcorp.com':'헤럴드경제','biz.chosun.com':'조선비즈','chosun.com':'조선일보',
  'joongang.co.kr':'중앙일보','donga.com':'동아일보','hani.co.kr':'한겨레','khan.co.kr':'경향신문','kmib.co.kr':'국민일보',
  'seoul.co.kr':'서울신문','munhwa.com':'문화일보','segye.com':'세계일보','hankookilbo.com':'한국일보','etnews.com':'전자신문',
  'zdnet.co.kr':'지디넷코리아','thebell.co.kr':'더벨','newspim.com':'뉴스핌','inews24.com':'아이뉴스24','ajunews.com':'아주경제',
  'dt.co.kr':'디지털타임스','bizwatch.co.kr':'비즈니스워치','businesspost.co.kr':'비즈니스포스트','ebn.co.kr':'EBN','nocutnews.co.kr':'노컷뉴스',
  'kbs.co.kr':'KBS','sbs.co.kr':'SBS','imbc.com':'MBC','ytn.co.kr':'YTN','mbn.co.kr':'MBN','wowtv.co.kr':'한국경제TV','sbsbiz.co.kr':'SBS Biz',
  'etoday.co.kr':'이투데이','g-enews.com':'글로벌이코노믹','getnews.co.kr':'글로벌경제신문','e-science.co.kr':'이코노미사이언스','pinpointnews.co.kr':'핀포인트뉴스',
  'issuenbiz.com':'이슈앤비즈','newslock.co.kr':'뉴스락','industrynews.co.kr':'인더스트리뉴스','newsway.co.kr':'뉴스웨이','dailian.co.kr':'데일리안',
  'mediapen.com':'미디어펜','ddaily.co.kr':'디지털데일리','theguru.co.kr':'더구루','thelec.kr':'디일렉','pinchannel.co.kr':'핀채널','econovill.com':'이코노믹리뷰',
  'econonews.co.kr':'이코노뉴스','kpinews.kr':'KPI뉴스','newdaily.co.kr':'뉴데일리','metroseoul.co.kr':'메트로신문','viva100.com':'브릿지경제',
  'skyedaily.com':'스카이데일리','straightnews.co.kr':'스트레이트뉴스','sisajournal-e.com':'시사저널e','sisajournal.com':'시사저널','fntimes.com':'한국금융신문',
  'ceoscoredaily.com':'CEO스코어데일리','widedaily.com':'와이드경제','tf.co.kr':'더팩트','nspna.com':'NSP통신','enewstoday.co.kr':'이뉴스투데이','busan.com':'부산일보','kookje.co.kr':'국제신문','imaeil.com':'매일신문','kyongbuk.co.kr':'경북일보','joongboo.com':'중부일보'};
export function pressOf(url:string){
  let host='';try{host=new URL(url).hostname.replace(/^www\./,'')}catch{return '언론사'}
  for(let h=host;h.includes('.');h=h.slice(h.indexOf('.')+1))if(PRESS[h])return PRESS[h];
  return host||'언론사';
}

// a theme for the 통신기 tabs and "이 기사에서 볼 것": the first that matches, else 업황
const THEME_WORDS:[NewsTheme,RegExp][]=[
  ['공시',/공시|자사주|자기주식|유상증자|무상증자|전환사채|신주인수권|감자|합병|분할|대표이사|최대주주|배당|상장폐지|거래정지/],
  ['실적',/실적|영업이익|매출|순이익|분기|어닝|컨센서스|흑자|적자|목표가|가이던스/],
  ['정책',/정부|정책|규제|법안|금리|관세|세제|지원책|금융위|공정위|국회|당국/]];
export const themeOf=(title:string,summary:string|null):NewsTheme=>THEME_WORDS.find(([,re])=>re.test(title)||(!!summary&&re.test(summary)))?.[0]??'업황';

// a reporter's byline at the head of the description ("| 이코노미사이언스 박성현 기자 |", "[서울=뉴시스] 홍길동 기자 =",
// "인더스트리뉴스 박현우 기자 ") says nothing about the story: it is dropped
export function byline(t:string|null){
  if(!t)return t;
  const out=t.replace(/^\|?\s*[^|]{0,24}기자\s*\|\s*/u,'').replace(/^\[[^\]]{0,24}\]\s*/u,'').replace(/^(?:\p{L}{2,12}\s)?[가-힣]{2,4}\s?기자\s*=\s*|^\p{L}{2,12}\s[가-힣]{2,4}\s기자\s+/u,'').trim();
  return out.length>=8?out:t;
}
const idOf=(url:string)=>{let h=2166136261;for(const c of url){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return 'nv-'+(h>>>0).toString(36)};
const plain=(s:string)=>decode(s.replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
// the search reply → this company's articles, newest first, one per headline; anything malformed is skipped
export function naverItems(reply:unknown,code:string,name:string):LiveNews[]{
  const items=(reply as {items?:unknown})?.items;
  if(!Array.isArray(items))return [];
  const out:LiveNews[]=[],seen=new Set<string>(),names=namesOf(code,name);
  for(const r of items as NaverRaw[]){
    if(typeof r?.title!=='string'||typeof r.pubDate!=='string')continue;
    const t=Date.parse(r.pubDate),title=plain(r.title);
    const url=typeof r.originallink==='string'&&/^https?:\/\//.test(r.originallink)?r.originallink:typeof r.link==='string'&&/^https?:\/\//.test(r.link)?r.link:null;
    if(!Number.isFinite(t)||!url||!title||!names.some(n=>namesCompany(n,title)))continue;
    // [속보]·(종합) reprints are one story: the first in the reply (the search's own order) is kept
    const key=title.replace(/\[[^\]]*\]|\([^)]*\)|[^\p{L}\p{N}]/gu,'');if(seen.has(key))continue;seen.add(key);
    const summary=byline(excerpt(typeof r.description==='string'?r.description:null));
    out.push({id:idOf(url),code,title,summary,press:pressOf(url),publishedAt:new Date(t).toISOString(),url,theme:themeOf(title,summary)});
  }
  return out.sort((a,b)=>a.publishedAt<b.publishedAt?1:-1);
}

// "오늘 10:30" style time in KST for a card, against the day the screen shows (YYYY-MM-DD)
export function kstWhen(iso:string,today:string){
  const k=new Date(Date.parse(iso)+9*3600e3).toISOString(),d=k.slice(0,10),hm=k.slice(11,16);
  const prev=new Date(today+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);
  return {day:d,time:d===today?hm:d===prev.toISOString().slice(0,10)?`어제 ${hm}`:`${d.slice(5).replace('-','.')} ${hm}`};
}
