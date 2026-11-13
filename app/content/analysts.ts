// redesign 3장 the analysts = our models, and every line they say in the 3D garden (redesign 2장 tone: three different
// people, each in their own voice; no comfort, no buy/sell, no price calls). What the game itself says (rules, counts,
// status) is plain UI text in UI below, never put in a character's mouth.
// Renaming a character or the currency is one line here.
export const CURRENCY='근거';
export type AnalystId='tori'|'moa'|'luon';
export type ModelId='ohlson'|'fscore'|'dupont'|'gradual'|'crash'|'rebuttal';
export const ANALYSTS:{id:AnalystId;name:string;role:string;models:ModelId[];color:string;tagline:string}[]=[
  {id:'tori',name:'토리',role:'감사관',models:['ohlson','fscore','dupont'],color:'#36557e',tagline:'장부에 적힌 것만 믿어.'},
  {id:'moa',name:'모아',role:'추적자',models:['gradual','crash'],color:'#d06a2f',tagline:'차트가 먼저 움직여. 난 그걸 봐.'},
  {id:'luon',name:'루온',role:'반박자',models:['rebuttal'],color:'#6a5aa8',tagline:'다들 맞다고 할 때 반대편에 서는 게 내 일.'},
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

// Voices (redesign 3장):
//   토리  감사관. 꼼꼼하고 조금 깐깐해. 장부와 숫자로 말하고, 자기가 틀리면 바로 인정해. "~더라", "~거든".
//   모아  추적자. 말이 빠르고 감이 좋아. "어,", "잠깐만" 같은 말로 먼저 반응하고 차트 얘기를 해.
//   루온  반박자. 능글맞게 딴지를 걸어. 단정하지 않고 질문으로 찔러.
// A line can be one string or a few: say() picks one by a seed (the day and the holding), so the same moment reads
// the same on a reload but a different day can say it differently. Every line stays within 40 characters
// (tests/rethink.test.mjs); {x} are filled in by line().
export type Lines=string|string[];
type ByAnalyst=Record<AnalystId,Lines>;
export const LINES={
  // the analyst's profile card: with a signal ({name} is the company) or a quiet day
  greet:{tori:['{name} 장부에서 하나 걸렸어. 같이 볼래?','{name}, 이번 분기 숫자가 좀 이상해.','{name} 숫자 하나가 계속 신경 쓰이더라.'],
    moa:['어, {name} 방금 차트가 꺾였어.','잠깐만, {name} 거래량이 평소랑 달라.','{name} 움직임 봤어? 같이 보자.'],
    luon:['기록해. 그럼 내가 반대편에 서 볼게.']} as ByAnalyst,
  idle:{tori:['오늘은 장부가 다 조용해. 이런 날도 있지.','걸리는 숫자가 없어. 내일 또 볼 거야.'],
    moa:['오늘 차트는 다 얌전해. 재미없게.','이탈한 거 없어. 계속 보고는 있어.'],
    luon:['아무도 반대 안 하는 날이 제일 수상하지 않아?','오늘은 할 말이 없네. 그게 더 찜찜해.']} as ByAnalyst,
  // after a judgment is written down, from the analyst whose note it was (luon when there was no note)
  signedOff:{tori:['적어 뒀어. 한 달 뒤에 같이 열어 보자.','기록 끝. 30일 뒤에 숫자로 확인하자.'],
    moa:['찍어 놨어. 한 달 뒤 차트랑 맞춰 보자.','오케이, 저장. 30일 뒤에 같이 보자.'],
    luon:['적었어. 나중에 내가 틀렸으면 그때 말해.']} as ByAnalyst,
  // luon's counter-argument: an opener, then the signal's counter (content/signals.ts) or the plain one below
  rebuttalIntro:['하나만 물어볼게.','반대쪽 얘기 좀 해 볼게.','근데 이건 생각해 봤어?'],
  // the player already made the same call on this company before ({choice}: 홀드, 손절 검토, 더 지켜봄)
  again:['저번에도 {choice} 골랐지. 그때랑 이유가 같아?','이 종목에 {choice}, 두 번째야. 근거는 새로 생겼어?'],
  rebuttalKept:['그래, 유지. 30일 뒤에 누가 맞았나 보자.','알았어. 내 반박도 같이 채점받을게.'],
  rebuttalAccepted:['고친 문장으로 갈게. 이게 채점받을 문장이야.','바꿨네. 이 문장 그대로 90일 뒤에 돌아와.'],
  counter:{hold:'산 이유 중에 지금도 맞는 게 몇 개야?',review:'그 기준, 언제 정했어? 오늘 정했으면 의심해 봐.',watch:'뭘, 언제까지 볼지는 정했어?'},
  // the grade reveal: luon brings the grades; {c} is the confidence the player put on it
  gradeHitSure:['맞혔네. 확신 {c}점 건 것까지 맞았어.','이번엔 네가 이겼어. 확신까지 정확했고.'],
  gradeHitUnsure:['맞았는데 확신은 {c}점이었지. 뭐가 불안했어?','결과는 맞았어. 근데 확신 {c}점이면 반은 운이야.'],
  gradeMissSure:['확신 {c}점이었는데 빗나갔어. 점수 좀 아프겠다.','이번엔 틀렸어. 확신 {c}점 건 만큼 깎였어.'],
  gradeMissUnsure:['틀렸어. 그래도 확신을 낮게 걸어서 덜 잃었어.','빗나갔네. 확신 낮게 건 게 그나마 살렸다.'],
  // the analyst on their own signal, once the outcome is in
  signalRight:{tori:['내 신호가 맞았어. 장부는 거짓말을 잘 안 해.','숫자가 맞았네. 다음에도 이 항목부터 볼게.'],
    moa:['봤지? 차트가 먼저 알았어.','이번엔 내 감이 맞았다.'],luon:['반박이 맞았네. 기분은 별로지만.']} as ByAnalyst,
  signalWrong:{tori:['이번엔 내 신호가 틀렸어. 왜인지 적어 둘게.','틀렸어. 장부에 안 잡히는 게 있었나 봐.'],
    moa:['내가 헛짚었어. 차트도 가끔 이래.','이건 내가 틀렸다. 노이즈였나 봐.'],luon:['내 반박이 빗나갔네. 인정.']} as ByAnalyst,
  // what an analyst remembers of the player's last call on one of their signals (core/recall.ts):
  // {name} company, {choice} 홀드·손절 검토·더 지켜봄, {mark} 30·90, {days} days left
  remember:{
    tori:{hit:['{name} 기억나? 저번 {choice}, 맞았잖아.','{name} 지난번엔 네 판단이 맞았더라. 이번 숫자도 보자.'],
      miss:['{name} 저번 판단은 {mark}일 판정에서 빗나갔어.','{name} 지난번엔 틀렸지. 같은 항목부터 다시 보자.'],
      waiting:['{name} 저번 판단, 판정까지 {days}일 남았어.']},
    moa:{hit:['어, {name}! 저번엔 네 감이 맞았잖아.','{name} 지난번 판단 맞았지? 이번 차트도 봐.'],
      miss:['{name} 저번엔 빗나갔어. 이번엔 차트부터 보자.','{name} 지난번엔 놓쳤잖아. 이번엔 같이 보자.'],
      waiting:['{name} 지난번 거, {days}일 뒤에 결과 나와.']},
    luon:{hit:['{name}, 저번엔 내 반박이 졌지. 이번엔 모르지.'],miss:['{name}, 저번에 빗나간 거 기억하지?'],
      waiting:['{name} 저번 판단, {days}일 뒤에 누가 맞나 보자.']},
  } as Record<AnalystId,Record<'hit'|'miss'|'waiting',Lines>>,
  // the first visit's look-back ({n}: days back), from the analyst whose note it is
  lookbackIntro:{tori:'{n}일 전에 이 숫자가 나왔었어. 그때 너라면?',moa:'{n}일 전에 이 차트가 떴어. 그때 너라면 어땠을까?',
    luon:'{n}일 전 얘기야. 그때 너라면 어떻게 했을까?'} as ByAnalyst,
  // W2 the root cut-away (core/roots.ts rootsSay): tori reads what is under the tree, with the number.
  // {name} company · {f} F-score · {o} Ohlson % · {d} debt ratio %. What it means stays the player's call.
  roots:{
    good:['{name}, 체력 9점 중 {f}점. 뿌리가 굵게 뻗었지.','{name} 밑은 튼튼해. 체력 {f}점이야.'],
    mid:['{name}, 체력 9점 중 {f}점. 굵은 것도 가는 것도 있어.','{name} 뿌리는 반반이야. 체력 {f}점.'],
    weak:['{name}, 체력 9점 중 {f}점이야. 뿌리가 가늘고 몇 가닥 없지.','위는 멀쩡해 보여도, {name} 체력은 {f}점이야.'],
    spots:['검은 데는 부도 위험이야. {o}%.','반점은 올슨 숫자야. 부도 확률 {o}%.'],
    stone:['저 돌은 빚이야. 부채비율 {d}%.','돌덩이가 부채비율 {d}% 무게야.'],
  } as Record<'good'|'mid'|'weak'|'spots'|'stone',Lines>,
};
// What the game says: rules, counts and status, in plain words (no character's voice)
export const UI={
  noSignal:'오늘 잡힌 신호 없음',
  lookbackNote:'처음 한 번만 · 기록하면 그 뒤 {n}일 결과가 바로 열려',
  skipped:'넘겼어. 판단은 그대로 기록됐어.',
  streak:'연속 {n}일',
  streakReset:'이틀 비워서 연속 {run}일이 끊겼어. 오늘부터 1일.',
  streakRescue:'어제 비웠어. 오늘 케이스를 풀면 연속이 이어져.',
  cooldownStart:'씨앗을 심었어. 24시간 뒤에 결정할 수 있어.',
  cooldownEarly:'아직 {left} 남았어. 지금 정하면 꽃은 안 펴.',
  cooldownBloom:'하루 기다렸어. 화분에 꽃이 하나 폈어.',
  caseIntro:'이름은 가렸어 · 30초',
  caseTimeout:'시간 끝 · 정답 공개',
  caseRight:'정답 · 먼저 잡은 모델은 {model}',
  caseWrong:'오답 · {model} 모델은 이미 신호를 냈었어',
  levelUp:'{who} 신뢰 {n} · 보여주는 분석이 늘었어.',
  planted:'{n}그루 심었어. 신호 잡힌 나무엔 분석가가 가 있어.',
  replanted:'반영했어. 지금 {n}그루.',
  marketClosed:'시장 쉬는 날. 기록 정리하기 좋은 날.',
  // W2 the first time a tree card opens: how to see under it
  deepHint:'나무를 길게 누르면 땅 속 뿌리가 보여.',
  // W3 the time capsule (core/capsule.ts)
  buried:'{name} 밑에 묻었어 · {mark}일 뒤에 파내',
  capsuleWait:'{name} 캡슐 · {mark}일 판정까지 {d}일',
  capsuleMemo:'캡슐에서 꺼낸 메모 · {when} 기록',
  jump:'30일 뒤',
  // inside the house: the cork board
  stamped:'도장 받음 · {name}',
  boardWait:'묻어 둔 캡슐 {n}개 · 판정일이 오면 여기 빨간 핀이 켜져',
  boardEmpty:'아직 묻은 캡슐 없음 · 판단을 남기면 여기 꽂혀',
  // today's three (core/today.ts)
  today:{judge:'신호 하나에 판단 남기기',case:'오늘의 케이스 풀기',grade:'도착한 판정 열기',rewind:'되감기 한 판'} as Record<'judge'|'case'|'grade'|'rewind',string>,
  dayDone:'오늘 할 거 끝. +{n} 근거.',
  nextGrade:'다음 판정 · {name} {mark}일 · D-{d}',
  noNext:'기다리는 판정 없음 · 판단을 남기면 30일 뒤에 와',
  // the player's title (core/rank.ts) and what it brings
  rankUp:'{rank} 됨 · {item} 받음',
};
export function line(t:string,v:Record<string,string|number>={}){return t.replace(/\{(\w+)\}/g,(_,k)=>String(v[k]??''))}
const hash=(t:string)=>{let h=2166136261;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
// one of the variants, steady for the same seed; then the {x} filled in
export function say(v:Lines,seed:string|number,vars:Record<string,string|number>={}){
  const t=typeof v==='string'?v:v[hash(String(seed))%v.length];return line(t,vars);
}
