// Reading a brokerage screenshot (onboarding "캡처 올리기"): the picture goes to the server function portfolio-read
// (OpenAI vision) only when the player is signed in and agreed to the overseas transfer; the prompt and the checks on
// what comes back live here so tests cover them. Only stock names and the numbers beside them are kept — never an
// account number, a name of a person or a total balance. Several stocks in one picture are the normal case.
export type ReadHolding={name:string;rate:number;quantity?:number;price?:number};
export const CAPTURE={maxSide:1600/* px: the longer side the picture is shrunk to before sending */,maxBytes:2_500_000,maxRows:30};

export function capturePrompt(){
  return ['너는 증권 앱 "보유 종목" 화면 캡처에서 종목 목록만 읽는 도구다.',
    '화면에 보이는 모든 보유 종목을 위에서 아래 순서로 빠짐없이 읽는다. 한 화면에 여러 종목이 있는 것이 보통이다.',
    '각 종목마다 종목명, 수익률(%), 보유 수량(주), 평균 매입가(원)를 읽는다. 화면에 없는 값은 null로 둔다. 추측해서 채우지 않는다.',
    '수익률은 부호를 지킨다(빨강·+는 양수, 파랑·-는 음수). 평가손익 금액(원)을 수익률로 착각하지 않는다.',
    '계좌번호, 사람 이름, 총 평가금액, 예수금은 절대 출력하지 않는다. 종목이 아닌 줄(합계, 광고, 메뉴)은 뺀다.',
    'JSON 배열만 출력한다. 원소: {"name":종목명,"rate":숫자|null,"quantity":숫자|null,"price":숫자|null}. 종목이 하나도 없으면 [].'].join('\n');
}
const num=(v:unknown)=>{if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'){const n=Number(v.replace(/[,%원주\s+]/g,''));return Number.isFinite(n)?n:null}return null};
export function parseCapture(raw:string):ReadHolding[]|null{
  let v:unknown;try{v=JSON.parse(raw.replace(/^```(json)?|```$/g,'').trim())}catch{return null}
  if(!Array.isArray(v))return null;
  const seen=new Set<string>(),out:ReadHolding[]=[];
  for(const x of v as Record<string,unknown>[]){if(!x||typeof x.name!=='string')continue;
    const name=x.name.replace(/\s+/g,' ').trim().slice(0,30);
    // a row that is only digits, or looks like an account number, is not a stock
    if(name.length<1||/^[\d\s-]+$/.test(name)||/계좌|합계|총\s?평가|예수금/.test(name)||seen.has(name))continue;
    const rate=num(x.rate),q=num(x.quantity),p=num(x.price);
    out.push({name,rate:rate!=null&&rate>-100&&rate<10000?Math.round(rate*100)/100:0,...(q!=null&&q>0&&q<1e9?{quantity:Math.round(q)}:{}),...(p!=null&&p>0&&p<1e9?{price:Math.round(p)}:{})});
    seen.add(name);if(out.length>=CAPTURE.maxRows)break}
  return out;
}
