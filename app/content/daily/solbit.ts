// The sample pack for 오늘의 관측소 (daily_quest_design v1, 4장 "세 장면 편집 예시"): a made-up company, made-up numbers,
// and a made-up master. Every screen that shows it says so. The real service links a master's own source and a real,
// checked event instead (design 7, 9-2); until then nothing here may be read as a real person, company or filing.
// Prices are drawn to agree with the cards: the anchor days below are exactly the moves the cards state
// (발표 당일 −7%, 시장 −0.3% · 실적 날 −4%, 시장 +0.4% · 인수 발표 뒤로 주가 +1%, 시장 +1.5%).
import type {Bar,DailyPack,Observe} from '../../core/game/daily/model';

// a steady walk pinned to anchor days (a bridge: the noise is zero on every anchor), rounded to 50원
function series(anchors:[number,number][],len:number,seed:number,wiggle:number){
  let h=seed>>>0;const rnd=()=>{h=(Math.imul(h,1103515245)+12345)>>>0;return h/4294967296-.5};
  const walk:number[]=[];let w=0;for(let t=0;t<len;t++){w+=rnd()*wiggle;walk.push(w)}
  const out:number[]=[];
  for(let t=0;t<len;t++){const k=anchors.findIndex(a=>a[0]>=t),b=anchors[Math.max(0,k)],a=anchors[Math.max(0,k-1)];
    if(k<0){out.push(anchors[anchors.length-1][1]);continue}
    const span=b[0]-a[0]||1,u=(t-a[0])/span,base=a[1]+(b[1]-a[1])*u;
    const bridge=walk[t]-(walk[a[0]]+(walk[b[0]]-walk[a[0]])*u);
    out.push(t===a[0]?a[1]:t===b[0]?b[1]:base*(1+bridge))}
  return out;
}
const LEN=101;
const close=series([[0,49000],[39,52000],[40,48400],[55,47100],[79,51000],[80,49000],[100,48300]],LEN,7,.012).map(v=>Math.round(v/50)*50);
const opens=close.map((c,t)=>t===0?c:Math.round(close[t-1]*(1+(((t*37)%11)-5)/1000)/50)*50);
const prices:Bar[]=close.map((c,t)=>[opens[t],c]);
const index=series([[0,1000],[39,998],[40,995],[55,980],[79,1006],[80,1010],[100,1005]],LEN,11,.004).map(v=>Math.round(v*10)/10);

// what can be checked (feedback F2; used from 중급, where the target is picked): the profit and the sales announced at
// the integrated results. Changes are against the same quarter a year before; ±2% counts as 비슷.
const SOL_T=[{id:'op',label:'솔빛산업의 영업이익'},{id:'rev',label:'솔빛산업의 매출'}];
const SOL_SRC={r1:'첫 통합 분기보고서 (예시)',r2:'두 번째 통합 분기보고서 (예시)',r3:'세 번째 통합 분기보고서 (예시)'};
export const SOL_BEFORE:Observe={targets:SOL_T,periods:[{id:'r1',label:'첫 통합 실적 발표 때'},{id:'r2',label:'두 번째 통합 실적 발표 때'}],
  base:'전년 같은 분기 대비',flat:2,given:{target:'op',period:'r1'},
  actual:{'op@r1':{change:7.5,source:SOL_SRC.r1},'op@r2':{change:10,source:SOL_SRC.r2},'rev@r1':{change:21,source:SOL_SRC.r1},'rev@r2':{change:19,source:SOL_SRC.r2}}};
export const SOL_AFTER:Observe={targets:SOL_T,periods:[{id:'r2',label:'다음 실적 발표 때'},{id:'r3',label:'두 분기 뒤 실적 발표 때'}],
  base:'전년 같은 분기 대비',flat:2,given:{target:'op',period:'r2'},
  actual:{'op@r2':{change:10,source:SOL_SRC.r2},'op@r3':{change:13,source:SOL_SRC.r3},'rev@r2':{change:19,source:SOL_SRC.r2},'rev@r3':{change:17,source:SOL_SRC.r3}}};
export const SOLBIT:DailyPack={
  id:'sample-solbit',version:1,sample:true,
  mentor:{name:'한결',monogram:'한',label:'예시 거장 · 실제 인물이 아니에요 · 출처 검수 전',
    problem:'경영진이 회사가 번 돈을 어디에, 어떤 기준으로 다시 쓰는가.',
    principle:'자본배분의 신뢰성은 경영진이 약속한 투자 기준과 실제 집행을 대조해 판단한다.',
    why:'기준을 말하는 데는 돈이 들지 않지만, 집행에는 주주의 돈이 든다. 기준과 집행이 어긋날 때 그 이유를 설명하고 결과로 보여 주는지가 다음 약속의 무게를 정한다.',
    applies:'경영진이 가격·배수·수익률처럼 숫자로 된 기준을 미리 밝혀 둔 경우.',
    breaks:'기준을 밝힌 적이 없거나, 사업 환경이 크게 바뀌어 기준을 바꾼 이유를 미리 공개적으로 설명한 경우.',
    context:'예시 서한의 맥락: 3년 전 주주서한에서 경영진은 "인수는 대상 회사 영업이익의 10배 이하에서만 하겠다"고 밝혔다. 이 문장이 오늘 사건의 비교 기준이 된다.',
    terms:[{word:'영업이익 배수',meaning:'인수 가격을 대상 회사 한 해 영업이익으로 나눈 값. 12배면 이익 12년 치를 주고 산다는 뜻이에요.'},
      {word:'원가절감 후 배수',meaning:'인수 뒤 비용을 줄여 늘어날 이익을 미리 더해 계산한 배수. 아직 실현되지 않은 추정이에요.'}],
    demo:{fact:'다른 회사 예: 배당성향 30%를 약속한 회사가 올해 25%만 지급했고, 같은 날 설비투자 계획을 공시했다.',
      line:'약속보다 5%p 적게 줬지만 이유로 든 설비투자 계획이 공시돼 있어서, 아직 약속을 저버렸다고 보기는 어렵다.',
      how:'사실(25%)을 명제(약속과 집행의 대조)에 대어 보고, 그래서 판단이 어떻게 되는지까지 이은 문장이에요.'},
    principleKeys:['약속','기준','집행','신뢰','자본배분','배수','상한']},
  company:{alias:'솔빛산업',business:'산업용 포장재 제조. 국내 공장 셋, 매출의 70%가 식품 회사 납품.',qty:80},
  cash:2_000_000,currency:'원',prices,index,evalTick:100,
  market:{calendar:'XKRX',label:'한국 거래일 · 원화',fee:.001},
  news:[
    {tick:15,title:'포장재 업계, 원지 값 부담에 인수합병 이야기 오가',source:'업계 전문지'},
    {tick:33,title:'솔빛산업, 공장 증설 계획 검토',source:'경제 신문'},
    {tick:46,title:'신용평가사 "솔빛산업 인수, 등급 영향은 제한적"',source:'신용평가 보도'},
    {tick:63,title:'식품업계, 포장재 공급처 늘리는 움직임',source:'업계 전문지'},
    {tick:72,title:'솔빛산업, 인수 대상 회사 대표 유임 결정',source:'공시 보도'},
    {tick:88,title:'포장재 원지 값 안정세',source:'경제 신문'}],
  scenes:[
    {id:'s1',no:1,title:'인수 발표 직후',tick:40,situation:'솔빛산업이 경쟁 포장재 회사를 인수한다고 발표한 날이에요. 장이 열려 있는 동안 공시가 나왔어요.',
      cards:[
        {id:'c1',kind:'재무',when:'지난 분기 · 확정 실적',fact:'솔빛산업 지난 분기 영업이익 +18%',compare:'전년 같은 분기 대비',source:'분기보고서',rel:'context',keys:['18%','영업이익']},
        {id:'c2',kind:'공시',when:'3년 전 · 주주서한',fact:'인수는 대상 회사 영업이익의 10배 이하에서만 하겠다고 밝힘',compare:'경영진이 스스로 밝힌 기준',source:'주주서한',rel:'context',keys:['10배','약속','기준','상한']},
        {id:'c3',kind:'공시',when:'발표 당일 · 장중',fact:'이번 인수 가격은 대상 회사 영업이익의 12배',compare:'약속한 기준 10배와 비교',source:'주요사항보고서',rel:'weaken',keys:['12배','인수 가격','계약']},
        {id:'c4',kind:'회사 설명',when:'발표 당일 · 설명회',fact:'회사 추정: 원가절감이 끝나면 9배 수준',compare:'회사 추정 · 확정 아님',term:{word:'원가절감 후 배수',meaning:'인수 뒤 비용을 줄여 늘어날 이익을 미리 더해 계산한 배수. 아직 실현되지 않은 추정이에요.'},source:'투자설명회 자료',rel:'support',keys:['9배','원가절감','추정']},
        {id:'c5',kind:'시장',when:'발표 당일 · 종가',fact:'솔빛산업 주가 −7%, 같은 날 시장 −0.3%',source:'거래소 시세',rel:'context',keys:['−7%','-7%','7%','주가']}],
      focus:['c2','c3'],ask:'두 배수의 차이는 이미 번 돈과 앞으로 아낄 돈 중 어디에서 생겼을까?',check:null,
      hints:{tori:'12배와 10배, 둘 다 같은 이익 기준으로 계산한 숫자인지 먼저 볼까?',moa:'9배는 언제, 누가 낸 숫자야? 오늘 확인된 숫자야, 앞으로의 계획이야?',luon:'주가가 떨어진 이유가 인수 가격 말고 다른 데 있을 수도 있지 않아?'},observe:SOL_BEFORE},
    {id:'s2',no:2,title:'거래 심사',tick:55,situation:'발표 15거래일 뒤, 인수 심사 과정이 공개됐어요. 인수 효과는 아직 실적에 나오지 않았어요.',
      cards:[
        {id:'d1',kind:'공시',when:'15거래일 뒤 · 이사회 의사록',fact:'대상 회사와 이해관계가 있는 이사 1명이 인수 심의에서 빠짐',source:'이사회 의사록',rel:'support',keys:['이해관계','이사','심의']},
        {id:'d2',kind:'공시',when:'15거래일 뒤 · 첨부 서류',fact:'독립위원회 검토서: 가격 산정 근거와 다른 인수 후보 2곳과의 비교를 공개',source:'독립위원회 검토서',rel:'support',keys:['독립위원회','검토서','검토','후보']},
        {id:'d3',kind:'회사 설명',when:'같은 서류 · 부록',fact:'원가절감 계획의 절반은 아직 맺지 않은 공급 계약에 기대고 있음',compare:'계획 · 미체결',source:'독립위원회 검토서 부록',rel:'weaken',keys:['미체결','절반','공급 계약','맺지']},
        {id:'d4',kind:'뉴스',when:'15거래일 뒤 · 업계지 아침 기사',fact:'경쟁사도 같은 공급사와 가격 협상 중이라는 보도',source:'업계 전문지',rel:'alt',keys:['경쟁사','공급사','협상']}],
      focus:['d2','d3'],ask:'심사 절차와 사업 가정 중 어느 쪽 판단이 달라졌나?',check:'인수 효과는 아직 실적에 나오지 않았어요 · 아직 확인 전',
      hints:{tori:'원가절감 계획 가운데 이미 계약으로 정해진 건 얼마야?',moa:'검토서는 인수 발표 전에 쓴 거야, 뒤에 쓴 거야? 날짜를 볼까?',luon:'이사가 심의에서 빠진 건 가격이 적절하다는 뜻일까, 절차를 지켰다는 뜻일까?'},observe:SOL_BEFORE},
    {id:'s3',no:3,title:'첫 통합 실적',tick:80,situation:'인수 뒤 첫 분기 실적이 나온 날이에요. 이 판단 뒤로는 평가일까지 시간이 흘러요.',
      cards:[
        {id:'e1',kind:'재무',when:'실적 발표 · 확정',fact:'기존 사업 영업이익 +12%',compare:'전년 같은 분기 대비, 인수 사업 제외',source:'분기보고서',rel:'context',keys:['12%','기존 사업']},
        {id:'e2',kind:'재무',when:'실적 발표 · 확정',fact:'인수 사업 비용절감, 목표의 60% 달성',compare:'회사가 발표 때 밝힌 첫해 목표 대비',source:'분기보고서 사업부 주석',rel:'support',keys:['60%','비용절감','목표','달성']},
        {id:'e3',kind:'공시',when:'실적 발표 · 설명회',fact:'전산 통합이 한 분기 늦어진다고 설명',source:'실적 설명회 자료',rel:'weaken',keys:['통합','지연','늦어','한 분기']},
        {id:'e4',kind:'시장',when:'실적 발표 당일 · 종가',fact:'솔빛산업 주가 −4%, 시장 +0.4% · 인수 발표 뒤로는 주가 +1%, 시장 +1.5%',source:'거래소 시세',rel:'alt',keys:['−4%','-4%','4%','시장']}],
      focus:['e2','e3'],ask:'이번 결과로 과거 약속을 얼마나 신뢰할 수 있나?',check:'원가절감 목표 60% 달성 · 전산 통합 한 분기 지연',
      hints:{tori:'기존 사업 +12%와 인수 효과를 나눠서 볼 수 있어?',moa:'통합이 늦어진다는 건 이번에 처음 나온 얘기야?',luon:'60%를 늦은 거라고 볼 수도, 빠른 거라고 볼 수도 있어. 넌 무엇과 비교해서 보고 있어?'},observe:SOL_AFTER}],
  reveal:{company:'솔빛산업 (가상 회사)',period:'가상 시나리오 · 연습용',event:'경영진이 스스로 밝힌 인수 기준(10배)을 넘는 가격(12배)에 인수한 사례',
    summary:'실제 서비스에서는 거장 본인의 서한과 실제 사건을 검수해 이 자리에 회사 이름·시기·원문을 공개해요. 오늘 판은 그 흐름을 연습하는 예시예요.',
    manager:'예시 운용사',holdings:[{quarter:'1분기 말',shares:120000},{quarter:'2분기 말',shares:90000}],
    holdingsNote:'분기 말에 공시된 수량만 비교해요. 줄어든 수량을 특정 날짜의 매도로 단정하지 않아요.',
    sources:[{card:'c2',title:'3년 전 주주서한 (예시)'},{card:'c3',title:'인수 주요사항보고서 (예시)'},{card:'d2',title:'독립위원회 검토서 (예시)'},{card:'e2',title:'첫 통합 분기보고서 (예시)'}]},
};
// the packs the app may play whole (both samples) are picked in content/daily/packs.ts; the level packs still to come
// live on the server only (content/daily/server-packs.ts; feedback 2026-11-19)
// the price helper, shared with the server-only packs
export {series as seriesForPacks,LEN as PACK_LEN};
