// The 입문 sample (feedback F2, 2026-11-19): 단풍식품 raises its prices and the question is whether customers stay — a
// target the player can check (판매량, announced each quarter) under a principle on pricing power. A made-up company,
// made-up numbers and a made-up master; every screen that shows it says so. 솔빛산업 (solbit.ts) is kept for the
// later tiers. Prices agree with the cards on the anchor days (발표 당일 +2%, 시장 +0.1% · 실적 날 +3%, 시장 +0.2%), and
// the announced values agree with each other (가격 +8%, 판매량 −1.2% → 매출 +6.6%).
import type {Bar,DailyPack,Observe} from '../../core/game/daily/model';
import {seriesForPacks,PACK_LEN} from './solbit';

const close=seriesForPacks([[0,31000],[39,30600],[40,31200],[60,30900],[79,31500],[80,32450],[100,33000]],PACK_LEN,5,.01).map(v=>Math.round(v/50)*50);
const opens=close.map((c,t)=>t===0?c:Math.round(close[t-1]*(1+(((t*29)%9)-4)/1000)/50)*50);
const prices:Bar[]=close.map((c,t)=>[opens[t],c]);
const index=seriesForPacks([[0,1000],[39,1002],[40,1003],[60,998],[79,1004],[80,1006],[100,1010]],PACK_LEN,13,.004).map(v=>Math.round(v*10)/10);

// what can be checked (the editor sets the base and the band counted as 비슷 beforehand). Before the next results the
// next quarter is n1; at the results (scene 3) the next one is n2. The announced changes are against each scene's base.
const targets=[{id:'vol',label:'단풍식품의 판매량'},{id:'rev',label:'단풍식품의 매출'}];
const before:Observe={targets,periods:[{id:'n1',label:'다음 분기 실적 발표 때'},{id:'n2',label:'두 분기 뒤 실적 발표 때'}],
  base:'인상 전 분기 대비',flat:2,given:{target:'vol',period:'n1'},
  actual:{'vol@n1':{change:-1.2,source:'인상 뒤 첫 분기보고서 (예시)'},'vol@n2':{change:2.6,source:'인상 뒤 두 번째 분기보고서 (예시)'},
    'rev@n1':{change:6.6,source:'인상 뒤 첫 분기보고서 (예시)'},'rev@n2':{change:9.1,source:'인상 뒤 두 번째 분기보고서 (예시)'}}};
const after:Observe={targets,periods:[{id:'n2',label:'다음 분기 실적 발표 때'},{id:'n3',label:'두 분기 뒤 실적 발표 때'}],
  base:'이번 분기 대비',flat:2,given:{target:'vol',period:'n2'},
  actual:{'vol@n2':{change:3.8,source:'인상 뒤 두 번째 분기보고서 (예시)'},'vol@n3':{change:5.5,source:'인상 뒤 세 번째 분기보고서 (예시)'},
    'rev@n2':{change:2.3,source:'인상 뒤 두 번째 분기보고서 (예시)'},'rev@n3':{change:4.1,source:'인상 뒤 세 번째 분기보고서 (예시)'}}};

export const DANPUNG:DailyPack={
  id:'sample-danpung',version:1,sample:true,
  mentor:{name:'서진',monogram:'서',label:'예시 거장 · 실제 인물이 아니에요 · 출처 검수 전',
    problem:'값을 올려도 고객이 떠나지 않는 회사인가.',
    principle:'가격 결정력은 값을 올린 뒤에도 고객이 남는지, 판매량으로 확인한다.',
    why:'값을 올리는 건 발표 한 장이면 되지만, 고객이 그 값을 계속 내는지는 다음 분기 판매량이 보여 준다. 판촉으로 붙잡은 판매량은 값을 다시 깎아 준 것과 같아서 따로 떼어 봐야 한다.',
    applies:'회사가 값을 올렸고, 그 뒤 판매량이나 판촉비가 발표되는 경우.',
    breaks:'원가가 업계 전체에서 함께 올라 모든 회사가 같이 값을 올린 경우, 또는 판매량을 공개하지 않는 경우.',
    context:'예시 맥락: 단풍식품은 원재료 값이 오르자 주력 과자 6종의 값을 8% 올렸다. 작년에도 3%를 올린 적이 있다. 오늘 사건의 비교 기준은 올리기 전 분기의 판매량이다.',
    terms:[{word:'판매량',meaning:'판 개수(물량)예요. 값이 올라 매출이 늘어도 판매량은 줄 수 있어요.'},
      {word:'판촉',meaning:'1+1, 할인 행사처럼 값을 잠시 낮춰 파는 것. 판촉으로 지킨 판매량은 값을 올린 효과를 일부 되돌려요.'}],
    demo:{fact:'다른 회사 예: 원두 값을 10% 올린 카페 체인의 다음 분기 잔 수가 1% 줄었고, 쿠폰 행사는 없었다.',
      line:'값을 10% 올렸는데 할인 없이 잔 수가 1%만 줄었으니, 고객이 그 값을 받아들였다고 볼 수 있다.',
      how:'사실(잔 수 −1%, 쿠폰 없음)을 명제(값을 올린 뒤에도 고객이 남는가)에 대어 보고, 판단까지 이은 문장이에요.'},
    principleKeys:['가격','값','인상','판매량','고객','결정력','판촉','남']},
  company:{alias:'단풍식품',business:'과자·즉석식품 제조. 대표 제품 단풍칩, 매출의 60%가 대형마트 납품.',qty:100},
  cash:2_000_000,currency:'원',prices,index,evalTick:100,
  market:{calendar:'XKRX',label:'한국 거래일 · 원화',fee:.001},
  // the flow between moments (feedback F4): headlines on their trading day, names masked as on the cards; the summary
  // stands in for a feed's excerpt (사용자 2026-11-22), held to the same rules as the headline
  news:[
    {tick:12,title:'과자 원재료 값 오름세 이어져, 제과업계 부담 커져',summary:'밀가루와 설탕 수입 단가가 석 달째 올랐다. 업계는 원가 부담을 제품 가격과 판촉비 중 어디서 줄일지 검토하고 있다.',source:'경제 신문'},
    {tick:28,title:'단풍식품, 대형마트와 다음 분기 납품 조건 협의 중',summary:'납품 단가와 매대 행사 횟수가 함께 논의되고 있다. 회사는 협의가 끝나면 조건을 알리겠다고 밝혔다.',source:'업계 전문지'},
    {tick:47,title:'단풍칩 인상 첫 주, 대형마트 매대 행사 늘어',summary:'가격이 오른 첫 주에 대형마트 세 곳이 1+1 행사를 열었다. 행사 비용을 누가 내는지는 공개되지 않았다.',source:'유통 전문지'},
    {tick:53,title:'해오름제과, 가격 동결 광고 시작',summary:'경쟁사 해오름제과가 주요 과자 가격을 올해 올리지 않겠다는 광고를 냈다. 광고는 편의점과 온라인에 실렸다.',source:'경제 신문'},
    {tick:70,title:'편의점 과자 매출, 할인 행사 늘며 소폭 증가',summary:'편의점 세 곳의 과자 매출이 전달보다 조금 늘었다. 할인 행사 상품의 비중도 함께 커졌다.',source:'유통 전문지'},
    {tick:86,title:'단풍식품, 다음 분기 판촉 예산은 이번 분기 수준으로',summary:'설명회에서 회사는 다음 분기 판촉비를 이번 분기와 비슷하게 쓰겠다고 했다. 가격 정책에 대한 질문에는 답하지 않았다.',source:'설명회 보도'},
    {tick:94,title:'과자 원재료 값, 석 달 만에 내림세',source:'경제 신문'}],
  scenes:[
    {id:'p1',no:1,title:'가격 인상 발표',tick:40,situation:'단풍식품이 주력 과자 값을 올린다고 발표한 날이에요. 장이 열려 있는 동안 보도자료가 나왔어요.',
      cards:[
        {id:'f1',kind:'재무',when:'지난 분기 · 확정 실적',fact:'작년 3% 인상 뒤에도 단풍식품 판매량 +4%',compare:'전년 같은 분기 대비',source:'분기보고서',rel:'support',keys:['판매량','+4%','4%','3%','작년']},
        {id:'f2',kind:'공시',when:'발표 당일 · 장중',fact:'주력 과자 6종 가격 8% 인상, 다음 달부터',compare:'원재료 값 상승을 이유로 듦',source:'보도자료',rel:'context',keys:['8%','인상','가격','6종']},
        {id:'f3',kind:'회사 설명',when:'발표 당일 · 설명회',fact:'인상과 함께 대형마트 1+1 행사를 두 달 늘리기로 함',compare:'회사 계획 · 확정 아님',source:'설명회 자료',rel:'weaken',keys:['1+1','판촉','행사','두 달']},
        {id:'f4',kind:'뉴스',when:'발표 당일 · 오후 기사',fact:'경쟁사 해오름제과는 올해 가격 동결 방침',source:'경제 신문',rel:'alt',keys:['해오름','경쟁사','동결']},
        {id:'f5',kind:'시장',when:'발표 당일 · 종가',fact:'단풍식품 주가 +2%, 같은 날 시장 +0.1%',source:'거래소 시세',rel:'context',keys:['+2%','2%','주가']}],
      focus:['f1','f3'],ask:'가격을 올린 뒤에도 고객이 남을지 생각해 봐. 판매량과 판촉 자료 중 어느 쪽이 네 판단을 더 잘 설명해?',check:null,
      hints:{tori:'작년에 3% 올렸을 때 판매량은 어떻게 됐어? 이번엔 8%야.',moa:'1+1 행사는 확정된 거야, 계획이야? 언제까지래?',luon:'판매량이 그대로여도 그게 행사 덕분이면, 고객이 값을 받아들였다고 할 수 있을까?'},
      observe:before},
    {id:'p2',no:2,title:'경쟁사 판매량 공개',tick:60,situation:'발표 20거래일 뒤, 업계 판매 통계가 나왔어요. 단풍식품의 다음 분기 실적은 아직이에요.',
      cards:[
        {id:'g1',kind:'뉴스',when:'20거래일 뒤 · 업계 통계 기사',fact:'경쟁사 해오름제과 판매량 +9%, 가격 동결 효과로 분석',source:'업계 전문지',rel:'weaken',keys:['해오름','+9%','9%','경쟁사']},
        {id:'g2',kind:'시장',when:'20거래일 뒤 · 업계 통계',fact:'과자 시장 전체 판매량 +1%',compare:'전년 같은 달 대비',source:'업계 협회 통계',rel:'context',keys:['시장 전체','+1%','1%']},
        {id:'g3',kind:'회사 설명',when:'20거래일 뒤 · 회사 자료',fact:'대형마트 매대 자리는 그대로 유지됨',source:'회사 IR 자료',rel:'support',keys:['매대','유지','자리']},
        {id:'g4',kind:'공시',when:'20거래일 뒤 · 이사회 결의',fact:'이번 분기 판촉비 예산 +20%로 확정',compare:'확정 · 지난 분기 대비',source:'이사회 결의',rel:'weaken',keys:['판촉비','+20%','20%','예산']}],
      focus:['g1','g3'],ask:'경쟁사 판매량도 공개됐어. 두 회사를 함께 보면 단풍식품에 대한 판단이 어떻게 달라져?',check:'단풍식품의 다음 분기 판매량은 아직 발표 전',
      hints:{tori:'해오름의 +9%는 시장 전체 +1%와 비교하면 얼마나 큰 거야?',moa:'판촉비 +20%는 계획이야, 결의된 거야?',luon:'매대 자리가 그대로라는 건 고객이 남았다는 뜻일까, 회사가 돈을 냈다는 뜻일까?'},
      observe:before},
    {id:'p3',no:3,title:'인상 뒤 첫 실적',tick:80,situation:'값을 올린 뒤 첫 분기 실적이 나온 날이에요. 이 판단 뒤로는 평가일까지 시간이 흘러요.',
      cards:[
        {id:'h1',kind:'재무',when:'실적 발표 · 확정',fact:'단풍식품 판매량 −1.2%',compare:'인상 전 분기 대비',source:'분기보고서',rel:'support',keys:['판매량','−1.2%','-1.2%','1.2%']},
        {id:'h2',kind:'재무',when:'실적 발표 · 확정',fact:'매출 +6.6%, 영업이익 +11%',compare:'인상 전 분기 대비',source:'분기보고서',rel:'context',keys:['매출','+6.6%','6.6%','영업이익','+11%','11%']},
        {id:'h3',kind:'재무',when:'실적 발표 · 확정',fact:'판촉비 +18% 집행',compare:'인상 전 분기 대비',source:'분기보고서 주석',rel:'weaken',keys:['판촉비','+18%','18%']},
        {id:'h4',kind:'시장',when:'실적 발표 당일 · 종가',fact:'단풍식품 주가 +3%, 시장 +0.2%',source:'거래소 시세',rel:'alt',keys:['+3%','3%','주가','시장']}],
      focus:['h1','h3'],ask:'판매량은 거의 그대로인데 매출이 늘었어. 이건 가격 결정력일까, 판촉 덕분일까?',check:'인상 뒤 첫 분기 판매량 −1.2% (인상 전 분기 대비, 발표됨)',
      hints:{tori:'값이 8% 올랐는데 매출은 6.6% 늘었어. 판매량 −1.2%와 맞아떨어져?',moa:'판촉비 +18%는 실제로 쓴 돈이야. 결의한 +20%와 비교해 볼까?',luon:'판매량이 1.2%만 준 걸 잘 지켰다고 볼 수도, 판촉비를 생각하면 아니라고 볼 수도 있어. 넌 뭘 기준으로 봐?'},
      observe:after}],
  reveal:{company:'단풍식품 (가상 회사)',period:'가상 시나리오 · 연습용',event:'원재료 값 상승으로 주력 제품 값을 8% 올린 뒤, 판촉을 늘려 판매량을 지킨 사례',
    summary:'실제 서비스에서는 검수한 실제 사건과 거장 본인의 글을 이 자리에 공개해요. 오늘 판은 가격 결정력을 판매량으로 확인하는 흐름을 연습하는 예시예요.',
    manager:'예시 운용사',holdings:[{quarter:'인상 전 분기 말',shares:50000},{quarter:'인상 뒤 첫 분기 말',shares:62000}],
    holdingsNote:'분기 말에 공시된 수량만 비교해요. 늘어난 수량을 특정 날짜의 매수로 단정하지 않아요.',
    sources:[{card:'f2',title:'가격 인상 보도자료 (예시)'},{card:'g1',title:'업계 판매 통계 기사 (예시)'},{card:'h1',title:'인상 뒤 첫 분기보고서 (예시)'}]},
};
