// redesign 3장 the analysts = our models, and every line they say in the 3D garden (redesign 2장 tone: a sharp
// colleague on a messenger, short, numbers first, dry humour; no comfort, no buy/sell, no price calls).
// Renaming a character or the currency is one line here.
export const CURRENCY='근거';
export type AnalystId='tori'|'moa'|'luon';
export type ModelId='ohlson'|'fscore'|'dupont'|'gradual'|'crash'|'rebuttal';
export const ANALYSTS:{id:AnalystId;name:string;role:string;models:ModelId[];color:string;tagline:string}[]=[
  {id:'tori',name:'토리',role:'감사관',models:['ohlson','fscore','dupont'],color:'#36557e',tagline:'숫자 먼저. 재무제표가 말하는 것만.'},
  {id:'moa',name:'모아',role:'추적자',models:['gradual','crash'],color:'#d06a2f',tagline:'차트가 먼저 움직여. 난 그걸 봐.'},
  {id:'luon',name:'루온',role:'반박자',models:['rebuttal'],color:'#6a5aa8',tagline:'좋아, 그럼 반대쪽 얘기.'},
];
export const analystById=(id:string)=>ANALYSTS.find(a=>a.id===id)??ANALYSTS[0];
export const MODEL_INFO:Record<ModelId,{name:string;what:string;analyst:AnalystId}>={
  ohlson:{name:'올슨',what:'부도 위험',analyst:'tori'},
  fscore:{name:'F-score',what:'재무 체력 9항목',analyst:'tori'},
  dupont:{name:'듀퐁',what:'이익의 출처',analyst:'tori'},
  gradual:{name:'서서히',what:'완만한 하락 추세',analyst:'moa'},
  crash:{name:'급락',what:'급락 패턴',analyst:'moa'},
  rebuttal:{name:'반박',what:'매수 이유의 반대 근거',analyst:'luon'},
};

// Every template stays under 40 characters (tests/lines.test.mjs); {x} are filled in by line().
export const LINES={
  greet:{tori:'신호 하나. 숫자부터 봐.',moa:'방금 잡혔어. 차트 같이 보자.',luon:'기록하면 내가 반대쪽 얘기할게.'} as Record<AnalystId,string>,
  idle:{tori:'오늘 재무 쪽은 조용해.',moa:'추세 이탈 없음. 지켜보는 중.',luon:'할 말 없을 때가 제일 위험해.'} as Record<AnalystId,string>,
  recorded:'기록했어. 30일, 90일 뒤에 채점한다.',
  rebuttalIntro:'좋아, 그럼 반대쪽 얘기.',
  rebuttalKept:'유지. 그것도 같이 채점할게.',
  rebuttalAccepted:'반영했네. 이유 다시 써 봐.',
  gradeHitSure:'맞췄어. 확신도 맞았고.',
  gradeHitUnsure:'맞았는데 확신 {c}. 근거가 약했나?',
  gradeMissSure:'확신 {c}였어. 이번엔 비쌌다.',
  gradeMissUnsure:'틀렸지만 확신이 낮았어. 손해는 적어.',
  signalRight:'{who} 신호는 맞았음.',
  signalWrong:'{who} 신호는 빗나감. 모델도 틀려.',
  streak:'연속 {n}일.',
  streakReset:'이틀 비웠네. 연속 {run}일 끝. 오늘이 1일.',
  streakRescue:'하루 비웠어. 오늘 케이스 풀면 이어 줄게.',
  cooldownStart:'씨앗 심었어. 24시간 뒤에 다시 와.',
  cooldownReady:'24시간 지났어. 이제 결정해.',
  cooldownEarly:'아직 {left} 남았어. 지금 정하면 꽃은 없어.',
  cooldownBloom:'참았네. 결정은 그대로 기록할게.',
  caseIntro:'이름 가렸어. 30초.',
  caseTimeout:'시간 끝. 답 공개.',
  caseRight:'맞음. {model}이 먼저 잡았던 케이스야.',
  caseWrong:'아님. {model}은 이미 신호를 냈었어.',
  noSignal:'오늘 잡힌 신호 없음.',
  levelUp:'{who} 신뢰 {n}. 보여줄 게 늘었어.',
  planted:'{n}그루 심었어. 신호 잡힌 나무엔 분석가가 가 있어.',
  replanted:'반영했어. 지금 {n}그루.',
  lookbackIntro:'{n}일 전에 이 신호가 떴어. 그때 너라면?',
  lookbackNote:'처음 한 번만. 기록하면 그 뒤 {n}일이 바로 열려.',
  marketClosed:'시장 쉬는 날. 기록 정리하기 좋은 날이지.',
  // luon's counter when no model flagged the tree (a judgment the player started from the tree card)
  counter:{hold:'산 이유 중에 지금도 맞는 게 몇 개야?',review:'기준은 언제 정했어? 오늘이면 의심해.',watch:'뭘, 언제까지 볼지 정했어?'},
};
export function line(t:string,v:Record<string,string|number>={}){return t.replace(/\{(\w+)\}/g,(_,k)=>String(v[k]??''))}
