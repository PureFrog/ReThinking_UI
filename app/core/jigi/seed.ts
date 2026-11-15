// The demo garden's journals (지기 prototype seed, cut to the demo's stocks): saved pages from the past months, marked
// demo so they never mix with real statistics (docs/jigi.md 4.3). Each has the two hypotheses the prototype seeds:
// a premise (recorded only) and the stock's direction (graded automatically from the mock bars, hypothesis.ts).
import {addMonths,blankFields,type Journal} from './journal';
import {lastConfirmed,stockOf} from './stocks';

const DAY=864e5;
// [days ago, code, 한 일, premise, direction sentence, 상승|하락, horizon months, 몸, 마음, 확신, 이해]
const ROWS:[number,string,string,string,string,'상승'|'하락',1|3,string,string,string,string][]=[
  [318,'005930','매수','메모리 가격이 바닥을 지났다.','삼성전자 주가가 오를 것이다.','상승',3,'상','상','높음','충분히 이해'],
  [282,'035720','관찰','광고 매출 회복이 늦다.','카카오 주가는 더 떨어질 것이다.','하락',3,'중','하','보통','일부 이해'],
  [255,'000660','매수','HBM 수주가 늘어난다.','SK하이닉스 주가가 오를 것이다.','상승',3,'상','상','매우 높음','충분히 이해'],
  [236,'005930','보유','재고가 줄어든다.','삼성전자 주가가 오를 것이다.','상승',1,'중','중','보통','충분히 이해'],
  [180,'005380','추가매수','환율이 수출에 유리하다.','현대차 주가가 오를 것이다.','상승',3,'상','중','보통','충분히 이해'],
  [140,'000660','추가매수','서버 투자가 확대된다.','SK하이닉스 주가가 오를 것이다.','상승',3,'상','중','높음','충분히 이해'],
  [124,'035420','관찰','커머스 성장이 둔화된다.','NAVER 주가는 하락할 것이다.','하락',3,'중','상','','일부 이해'],
  [112,'005930','일부매도','스마트폰 수요가 약세다.','삼성전자 주가는 하락할 것이다.','하락',1,'하','하','낮음','충분히 이해'],
  [96,'012450','매수','수주 잔고가 증가한다.','한화에어로스페이스 주가가 오를 것이다.','상승',1,'상','상','높음','충분히 이해'],
  [70,'005490','일부매도','철강 수요가 약세다.','POSCO홀딩스 주가는 하락할 것이다.','하락',1,'중','하','보통','일부 이해'],
  [58,'005930','매수','파운드리 수주가 늘어난다.','삼성전자 주가가 오를 것이다.','상승',1,'상','상','높음','충분히 이해'],
  [35,'000660','보유','메모리 가격이 하락한다.','SK하이닉스 주가는 하락할 것이다.','하락',3,'중','하','보통','충분히 이해'],
  [18,'005930','추가매수','실적 발표에서 영업이익이 예상치를 넘는다.','삼성전자 주가가 오를 것이다.','상승',3,'상','상','높음','충분히 이해'],
];
export function demoJournals(now:number,holdingOf:(code:string)=>number|null):Journal[]{
  return ROWS.map(([ago,code,action,premise,dirText,dir,hz,phys,ment,conf,und],i)=>{
    const t=now-ago*DAY,day=new Date(t).toISOString().slice(0,10),b=lastConfirmed(code,day)!,end=addMonths(day,hz);
    const f={...blankFields(),phys,ment,conf,understand:und,action,hypo:premise+' '+dirText,horizon:(hz===1?'1개월':'3개월') as '1개월'|'3개월',checkDate:end,
      reason:'최근 분기 자료와 업황 지표를 보고 판단했다.',recheck:'다음 실적 발표에서 방향이 반대로 나오면 다시 본다.'};
    return {id:'demo-j'+i,demo:true,status:'saved',createdAt:t,savedAt:t,tz:'Asia/Seoul',holdingId:holdingOf(code),stock:{code,name:stockOf(code)!.name},anchor:{date:b.d,close:b.c},
      f,open:{},reflection:null,archivedAt:null,deletedAt:null,versions:[{at:t,label:'최초 저장'}],
      hypos:[{id:`demo-h${i}a`,text:premise,src:'핵심 가설',domain:'경기',form:'추세',role:'최초 전제',dir:'없음',endDate:end,status:'confirmed',confirmedAt:t,auto:false},
        {id:`demo-h${i}b`,text:dirText,src:'핵심 가설',domain:'주가',form:'방향',role:'자산가격 결과',dir,endDate:end,status:'confirmed',confirmedAt:t,auto:true,base:{date:b.d,close:b.c},
          // the demo's past verdicts were opened already; the ones still running show as D-n under their trees
          opened:end<new Date(now).toISOString().slice(0,10)?t:undefined}]} satisfies Journal;
  });
}
