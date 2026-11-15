// 지기 투자일지 (docs/jigi.md): one journal = one dated page about one stock. Nine things are required (stock, body,
// mind, understanding, what I did, hypothesis, horizon, reason, re-check condition or "아직 모르겠음"); everything
// else is optional. A journal stays a draft until saved; every save after the first is a new version. Nothing here
// grades anything: hypotheses and their verdicts are in hypothesis.ts. Words follow the prototype; UI is 해요체.
import {lastConfirmed,stockOf} from './stocks';

export const ACTIONS=['매수','추가매수','보유','일부매도','전량매도','관찰'] as const;
export const PICKS={
  action:ACTIONS as readonly string[],
  phys:['상','중','하','판단하기 어려움'],ment:['상','중','하','판단하기 어려움'],
  understand:['처음 알아봄','일부 이해','충분히 이해','잘 모르겠음'],
  mood:['차분함','기대됨','불안함','조급함','기타'],
  conf:['매우 낮음','낮음','보통','높음','매우 높음'],
} as const;
export type PickKey=keyof typeof PICKS;
export const PICK_LABEL:Record<PickKey|'stock',string>={stock:'종목',action:'한 일',phys:'몸',ment:'마음',understand:'이해 정도',mood:'기분',conf:'확신'};
// how long the thought is meant to hold, in months ('아직 모르겠음' has no date)
export const HORIZONS={'1개월':1,'3개월':3,'6개월':6,'1년':12,'3년':36} as const;
export type Horizon=keyof typeof HORIZONS|'아직 모르겠음';
// the optional blocks under the main page (key, title, question)
export const OPTS=[['sources','출처·리서치 상세','어떤 자료를 확인했나요?'],['counter','반대 근거','반대로 생각할 만한 이유가 있나요?'],
  ['product','상품·진입 방식','이 상품과 진입 방식을 고른 이유는 무엇인가요?'],['weight','비중·자금·기회비용','전체 투자에서 어떤 역할을 하나요?'],
  ['exit','손절·청산 계획','어떤 조건에서 정리하려 하나요?'],['expect','기대손익·확률','예상하는 이익·손실과 가능성은 어느 정도인가요?'],
  ['philosophy','투자철학 연결','평소의 어떤 원칙과 연결되나요?'],['memo','자유 메모','그 밖에 남기고 싶은 생각이 있나요?']] as const;
export type OptKey=typeof OPTS[number][0];
export const EXAMPLES:Record<string,string>={hypo:'다음 분기 실적 발표에서 영업이익이 늘고, 주가가 석 달 안에 오를 것 같다.',reason:'지난 분기 재고가 줄었고, 주요 고객사 주문이 늘었다는 공시를 봤다.',
  recheck:'다음 실적에서 영업이익이 전 분기보다 줄면 다시 생각한다.',sources:'분기보고서 3장, 증권사 리포트 1건.',counter:'경쟁사가 가격을 내리면 이익률이 떨어질 수 있다.',
  product:'한 번에 사지 않고 두 번에 나눠 산다.',weight:'전체의 5%. 다른 종목을 팔지 않고 현금으로 산다.',expect:'틀리면 -8% 정도를 감수한다.',philosophy:'실적이 확인된 뒤에 산다는 원칙과 맞는다.',memo:'오늘은 뉴스를 보고 급하게 열어 본 종목이다.'};
// a question to think with, when there is nothing of mine to draft from (작성 도움, LLM call B comes with the server)
export const GUIDES:Record<string,string>={sources:'언제 나온 자료인가요? 회사가 직접 낸 자료인가요, 남이 해석한 자료인가요?',counter:'이 생각이 틀렸다면 가장 그럴듯한 이유는 뭘까요?',
  product:'같은 생각을 다른 방식으로 표현할 수 있었나요? 왜 이 방식을 골랐나요?',weight:'이 종목이 틀렸을 때 전체에서 얼마를 잃나요?',exit:'어떤 소식이 나오면 생각을 접을지 먼저 적어 보세요.',
  expect:'틀렸을 때 잃는 것을 먼저 적고, 그다음 맞았을 때 얻는 것을 적어 보세요.',philosophy:'평소에 지키려는 원칙 하나를 떠올려 보세요.',memo:'나중의 내가 꼭 알았으면 하는 것 한 가지를 적어 보세요.'};

export type Exit={holdN:string;holdUnit:'일'|'주'|'개월'|'년';stop:string;target:string;expire:''|'재검토'|'일부 청산'|'전량 청산'|'미정'};
export type Fields={phys:string;ment:string;mood:string;understand:string;action:string;hypo:string;conf:string;horizon:Horizon|'';checkDate:string;
  reason:string;recheck:string;recheckUnknown:boolean;opt:Partial<Record<OptKey,string>>;exit:Exit};
export type Anchor={date:string;close:number};
// a hypothesis pulled from the journal (hypothesis.ts): drafted, then confirmed (locked) and graded
export type Hypo={id:string;text:string;src:'핵심 가설'|'반대 근거';domain:string;form:string;role:string;dir:'상승'|'하락'|'없음';endDate:string;
  status:'draft'|'hold'|'confirmed';confirmedAt?:number;auto?:boolean;base?:Anchor;postHoc?:boolean;
  // opened: the verdict was dug up and seen (its capsule is gone from the garden)
  opened?:number};
export type Reflection={plan:''|'예'|'일부만'|'아니오'|'거래 없음';missed:string;change:string;at:number};
// practice: the first visit's 되돌아보기 (lookback.ts), graded at once and kept out of the statistics
export type Journal={id:string;demo?:boolean;practice?:boolean;status:'draft'|'saved';createdAt:number;savedAt:number|null;tz:string;
  holdingId:number|null;stock:{code:string;name:string}|null;anchor:Anchor|null;signalId?:string|null;
  f:Fields;open:Partial<Record<OptKey,boolean>>;hypos:Hypo[];reflection:Reflection|null;archivedAt:number|null;deletedAt:number|null;versions:{at:number;label:string}[]};

const TZ=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return 'Asia/Seoul'}};
export const blankFields=():Fields=>({phys:'',ment:'',mood:'',understand:'',action:'',hypo:'',conf:'',horizon:'',checkDate:'',reason:'',recheck:'',recheckUnknown:false,opt:{},
  exit:{holdN:'',holdUnit:'개월',stop:'',target:'',expire:''}});

// the tree card's quick chips (old 판단 기록) open a journal with "한 일" filled; 손절 검토 is not a sale yet, so it
// stays 보유 and opens the 손절·청산 plan instead (docs/jigi.md 3.1 (가))
export type Quick='hold'|'review'|'watch';
export const QUICK:Record<Quick,{label:string;action:typeof ACTIONS[number];openExit?:boolean}>={hold:{label:'보유',action:'보유'},watch:{label:'관찰',action:'관찰'},review:{label:'손절 검토',action:'보유',openExit:true}};

export function newJournal(id:string,now:number,today:string,o:{holdingId?:number|null;code?:string|null;name?:string;quick?:Quick;signalId?:string|null}={}):Journal{
  const j:Journal={id,status:'draft',createdAt:now,savedAt:null,tz:TZ(),holdingId:o.holdingId??null,stock:null,anchor:null,signalId:o.signalId??null,
    f:blankFields(),open:{},hypos:[],reflection:null,archivedAt:null,deletedAt:null,versions:[]};
  if(o.code)setStock(j,o.code,today,o.name);
  if(o.quick){j.f.action=QUICK[o.quick].action;if(QUICK[o.quick].openExit)j.open.exit=true}
  return j;
}
// picking the stock fixes where the journal was written on its chart: the last confirmed close before today
export function setStock(j:Journal,code:string,today:string,name?:string){const s=stockOf(code),b=lastConfirmed(code,today);
  j.stock={code,name:s?.name??name??code};j.anchor=b?{date:b.d,close:b.c}:null}

export const addMonths=(day:string,m:number)=>{const d=new Date(day+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+m);return d.toISOString().slice(0,10)};
// the horizon gives the day to look again (and the end date the hypotheses default to)
export const checkDateOf=(horizon:Horizon|'',from:string)=>horizon&&horizon!=='아직 모르겠음'?addMonths(from,HORIZONS[horizon]):'';

// the nine required things, in the order the pages ask for them, with the page each is on (1~4)
export type Req={key:string;label:string;page:1|2|3|4;ok:boolean};
export function required(j:Journal):Req[]{const f=j.f;return [
  {key:'phys',label:'몸',page:1,ok:!!f.phys},{key:'ment',label:'마음',page:1,ok:!!f.ment},
  {key:'stock',label:'종목',page:2,ok:!!j.stock},{key:'understand',label:'이해 정도',page:2,ok:!!f.understand},{key:'action',label:'한 일',page:2,ok:!!f.action},
  {key:'hypo',label:'가설',page:3,ok:!!f.hypo.trim()},{key:'reason',label:'이유',page:3,ok:!!f.reason.trim()},{key:'recheck',label:'다시 볼 조건',page:3,ok:!!f.recheck.trim()||f.recheckUnknown},
  {key:'horizon',label:'기간',page:4,ok:!!f.horizon}]}
export const missing=(j:Journal)=>required(j).filter(r=>!r.ok);

// save: a draft becomes v1; a saved journal edited again becomes the next version
export function saveJournal(j:Journal,now:number):{ok:true;journal:Journal;version:number}|{ok:false;missing:Req[]}{
  const m=missing(j);if(m.length)return {ok:false,missing:m};
  const versions=[...j.versions,{at:now,label:j.versions.length?'수정':'최초 저장'}];
  return {ok:true,journal:{...j,status:'saved',savedAt:now,versions},version:versions.length};
}
export const live=(js:Journal[])=>js.filter(j=>!j.deletedAt);
export const TRASH_DAYS=30;
// trash older than 30 days is gone for good
export const purgeOld=(js:Journal[],now:number)=>js.filter(j=>!(j.deletedAt&&now>j.deletedAt+TRASH_DAYS*864e5));
export const titleOf=(j:Journal,day:(ms:number)=>string)=>`${day(j.createdAt)} · ${j.stock?.name??'종목 미정'} · ${j.f.action||'한 일 미정'}`;
// the journals of one stock, oldest first (the time bar)
export const ofStock=(js:Journal[],code:string)=>live(js).filter(j=>j.stock?.code===code&&!j.archivedAt).sort((a,b)=>a.createdAt-b.createdAt);
// grouped by stock, most recent first (the bookshelf)
export function byStock(js:Journal[]){const g=new Map<string,Journal[]>();for(const j of live(js))if(j.stock&&!j.archivedAt){const a=g.get(j.stock.code)??[];a.push(j);g.set(j.stock.code,a)}
  return [...g.values()].map(a=>({code:a[0].stock!.code,name:a[0].stock!.name,list:a,last:Math.max(...a.map(j=>j.createdAt))})).sort((x,y)=>y.last-x.last)}
