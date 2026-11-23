// 시나리오 퀘스트 · 가상 연습판 01 (PM 설계 "시나리오 퀘스트 상세 설계" 2026-11-22, 1장 가상 판 예시와 13장 첫 발행 목표).
// 거장 한 명, 원칙 하나, 종목 하나인 레벨 1 판. 회사·신문·숫자는 모두 지어낸 연습용이며, 거장 본문은 편집 해설 시안이지
// 직접 인용이 아니다. 실제 판(13F 쌍·당시 기사·동결 시세)은 같은 모양으로 이 자리에 들어온다.

export type SqPage={name:string;title:string;body:string[];table?:{head:string[];rows:string[][]}};
export type SqDoc={id:string;kind:'sheet'|'schedule'|'filing'|'memo';title:string;from:string;lines:string[];table?:{head:string[];rows:string[][]}};
export type SqTurn={
  day:number;              // the decision day (index into the market days); the market stops at its close
  paper:{masthead:string;pages:SqPage[]};
  docs:SqDoc[];            // what else arrived for this turn
  ask:string;              // 보리's one question in the notebook's margin (approved, not generated)
  printed:{target:string;when:string;base:string}; // L1: target and time are printed for the player
  facts:string[];          // words of this turn's facts (the stand-in grader looks for them)
  numbers:string[];        // the numbers in this turn's papers
  applies:string;          // where the principle meets this turn (for the feedback page)
  actual:{value:number|null;note:string}; // the target's measured change vs the base (%), null = 판정 보류
};
export type SqPack={
  id:string;practice:true;level:1;title:string;
  mentor:{name:string;firm:string;initials:string;principle:string;body:string[];lines:{k:string;v:string}[];note:string};
  holding:{alias:string;brand:string;qty:number;sells:string;exposed:string};
  market:{days:string[];open:number[];close:number[];fee:number};
  turns:SqTurn[];
  similar:number;           // ±% counted as 비슷
  reveal:{name:string;what:string;filing:{firm:string;before:number;after:number;asOf:[string,string];public:string}|null;sources:string[]};
};

// a deterministic make-believe price path: anchors on the decision days, a little daily wobble between them
function makeMarket(){
  const days:string[]=[];const d=new Date(Date.UTC(2023,2,1));
  while(days.length<62){const w=d.getUTCDay();if(w!==0&&w!==6)days.push(`${d.getUTCMonth()+1}월 ${d.getUTCDate()}일`);d.setUTCDate(d.getUTCDate()+1)}
  const anchors:[number,number][]=[[0,52000],[10,52400],[14,54600],[22,53800],[28,51200],[32,49700],[40,50300],[46,50100],[50,51600],[56,53000],[61,53900]];
  const close:number[]=[],open:number[]=[];
  for(let i=0;i<days.length;i++){
    const k=anchors.findIndex(a=>a[0]>=i),[d1,p1]=anchors[Math.max(0,k)],[d0,p0]=anchors[Math.max(0,k-1)];
    const base=d1===d0?p1:p0+(p1-p0)*(i-d0)/(d1-d0),wob=Math.sin(i*1.7)*0.006+Math.sin(i*0.61)*0.004;
    close.push(Math.round(base*(1+(anchors.some(a=>a[0]===i)?0:wob))/50)*50);
    open.push(i===0?close[0]:Math.round((close[i-1]*0.55+close[i]*0.45)/50)*50);
  }
  return {days,open,close,fee:0.001};
}

export const PRACTICE_01:SqPack={
  id:'practice-01',practice:true,level:1,title:'가상 연습판 · 단풍식품의 납품가 인상',
  mentor:{name:'워런 버핏',firm:'버크셔 해서웨이',initials:'W.B.',principle:'가격 결정력',
    body:['가격을 올린 분기에는 매출이 늘어도 손님이 떠나고 있을 수 있다. 오래 보유할 사업인지 판단하려면 가격표를 바꾼 뒤에도 고객이 같은 물건을 다시 사는지 살펴야 한다. 다른 회사 제품으로 쉽게 갈아탈 수 있다면 오늘의 높은 단가는 다음 주문에서 사라질 수 있기 때문이다.',
      '이번에는 납품가와 판매량을 함께 읽는다. 판매량이 버텼다면 그 뒤에 할인이나 판촉비가 얼마나 들었는지도 살펴본다. 그래야 회사가 가격을 정할 힘이 있는지, 잠시 비용을 들여 고객을 붙잡았는지 구별할 수 있다.'],
    lines:[{k:'명제',v:'값을 올려도 손님이 남는 회사가 가격을 정할 힘을 가진 회사다.'},{k:'작동 이유',v:'갈아탈 곳이 마땅치 않으면 높은 단가가 다음 주문에도 남는다.'},
      {k:'적용 조건',v:'가격을 바꾼 뒤의 판매량을 같은 기준으로 비교할 수 있을 때.'},{k:'깨지는 조건',v:'할인·판촉비로 붙잡은 판매량이라면 힘이 아니라 비용이다.'}],
    note:'편집 해설 시안 · 직접 인용 아님. 초상은 승인 전이라 문패로 대신해요.'},
  holding:{alias:'단풍식품',brand:'들녘',qty:1000,
    sells:'단풍식품은 즉석밥·두부 브랜드 ‘들녘’을 동네 가게와 작은 마트에 납품해요.',
    exposed:'쌀·콩 값이 올라 납품가를 올려야 하는데, 가게들이 다른 브랜드로 쉽게 바꿀 수 있어서 이번 인상이 주문량을 흔들 수 있어요.'},
  market:makeMarket(),
  similar:2,
  turns:[
    {day:14,
      paper:{masthead:'마을경제신문',pages:[
        {name:'1면',title:'단풍식품, 다음 달부터 동네 가게 납품가 5% 인상',body:['단풍식품이 즉석밥·두부 브랜드 ‘들녘’의 동네 가게 납품가를 4월 1일부터 평균 5% 올린다고 밝혔다.','회사는 지난 반년 동안 쌀과 콩 매입 가격이 크게 올라 납품가에 반영할 수밖에 없었다고 설명했다.','점주들의 반응은 엇갈렸다. 단골이 들녘을 찾는다는 가게도 있었고, 다른 브랜드를 같이 들여놓겠다는 가게도 있었다.']},
        {name:'경제면',title:'즉석밥·두부, 올봄 동종 제품 가격 동향',body:['같은 종류 제품의 소비자 가격은 전년 같은 달보다 평균 3.1% 올랐다.','경쟁사 여울식품은 아직 가격 조정 계획을 밝히지 않았다.'],
          table:{head:['제품','전년 대비 소비자가'],rows:[['즉석밥','+3.4%'],['두부','+2.6%'],['평균','+3.1%']]}}]},
      docs:[{id:'t1-sheet',kind:'sheet',title:'들녘 납품 명세서 · 최근 석 달',from:'단풍식품 영업부',lines:['동네 가게 주문량(상자). 인상 전 수량이에요.','3월은 19일까지 들어온 주문이에요.'],
        table:{head:['달','주문량'],rows:[['1월','41,200상자'],['2월','40,800상자'],['3월(19일까지)','27,300상자'],['1분기 하루 평균','약 2,110상자']]}}],
      ask:'5% 비싸진 들녘을 가게들이 그래도 같은 만큼 주문할까? 명세서의 주문량부터 보자.',
      printed:{target:'동네 가게 들녘 주문량',when:'다음 판매량 발표 (5월 초)',base:'1분기 하루 평균'},
      facts:['인상','납품가','5%','주문','단골','브랜드','쌀','콩','원재료','가격'],numbers:['5','3.1','41,200','40,800','2,110'],
      applies:'값을 올린 뒤에도 가게들이 다시 주문하는지가 가격 결정력의 첫 관측이야.',
      actual:{value:-1.2,note:'5월 발표: 4월 하루 평균 주문량이 1분기보다 1.2% 적었어요.'}},
    {day:32,
      paper:{masthead:'마을경제신문',pages:[
        {name:'1면',title:'여울식품, 동네 가게에 할인 확대',body:['경쟁사 여울식품이 5월 말까지 동네 가게 납품가를 8% 깎아 주기로 했다.','업계에서는 단풍식품의 인상 뒤 빈자리를 노린 판촉이라는 해석이 나온다.']},
        {name:'유통면',title:'점주들 “손님이 찾는 건 그래도 들녘”',body:['“손님들이 들녘을 찾아서 진열대에서 빼기 어렵다.” (동네 가게 점주 김씨)','“할인 폭이 커서 한쪽 진열대는 여울로 바꿨다.” (작은 마트 점주 박씨)']}]},
      docs:[{id:'t2-schedule',kind:'schedule',title:'가게 계약 갱신 일정',from:'단풍식품 영업부',lines:['연간 계약 가게 가운데 40%가 5월에 다시 계약해요.','나머지 60%는 하반기에 갱신해요.']}],
      ask:'할인 소식이 네 첫 예상을 바꿀까? 갱신 일정표에서 5월에 다시 계약하는 가게 비율을 봐.',
      printed:{target:'동네 가게 들녘 주문량',when:'다음 판매량 발표 (5월 초)',base:'1분기 하루 평균'},
      facts:['할인','8%','여울','경쟁','갱신','40%','점주','진열','손님','계약'],numbers:['8','40','60'],
      applies:'갈아탈 곳이 생겼을 때 손님이 남는지 보는 게 원칙이 깨지는 조건을 확인하는 일이야.',
      actual:{value:-1.2,note:'5월 발표: 4월 하루 평균 주문량이 1분기보다 1.2% 적었어요.'}},
    {day:50,
      paper:{masthead:'마을경제신문',pages:[
        {name:'1면',title:'단풍식품, 인상 뒤 첫 판매량 발표 “주문량 1.2% 감소”',body:['단풍식품은 4월 동네 가게 하루 평균 주문량이 1분기보다 1.2% 줄었다고 밝혔다.','납품가가 5% 오른 만큼 매출은 늘었다.']},
        {name:'실적면',title:'판촉비 18% 늘어',body:['같은 기간 판촉비는 직전 분기보다 18% 늘었다.','회사는 일부 가게에 진열 지원금을 준 영향이라고 설명했다.'],
          table:{head:['항목','1분기','4월'],rows:[['하루 평균 주문량','2,110상자','2,085상자'],['매출총이익률','31.0%','33.4%'],['판촉비(직전 분기 대비)','—','+18%']]}}]},
      docs:[{id:'t3-filing',kind:'filing',title:'실적 공시 · 마진 표',from:'단풍식품 공시',lines:['매출총이익률이 31.0%에서 33.4%로 올랐어요.','판촉비를 빼고 본 영업이익률은 1.1%p 올랐어요.']}],
      ask:'주문량은 조금 줄고 마진은 올랐어. 판촉비까지 넣으면 남은 기간을 어떻게 볼래?',
      printed:{target:'5월 들녘 주문량',when:'평가일 (5월 25일)',base:'1분기 하루 평균'},
      facts:['1.2%','감소','판촉','18%','마진','이익률','33.4','31.0','지원금','주문'],numbers:['1.2','18','31.0','33.4','1.1'],
      applies:'판매량이 버틴 뒤 판촉비를 보는 건 힘과 비용을 구별하는 마지막 확인이야.',
      actual:{value:-0.4,note:'평가일 잠정: 5월 하루 평균 주문량이 1분기보다 0.4% 적었어요.'}},
  ],
  reveal:{name:'가상 종목 (연습판)',what:'가상 연습판이라 실제 회사·사건·SEC 원문이 없어요. 아래 공시 비교는 화면을 익히기 위한 예시 결과예요.',
    filing:{firm:'운용사 A (예시)',before:1200000,after:1200000,asOf:['3월 31일','6월 30일'],public:'8월 14일 공개 (예시)'},sources:[]},
};
export const SCENARIO_PACKS:SqPack[]=[PRACTICE_01];
