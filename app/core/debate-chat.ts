// 토론 캐릭터 (루온, 유저 워크플로우 2026-11-23 "토론 캐릭터 · 종목 토론"): I pick a stock and say why I hold it; 루온
// listens and asks for the other side or the condition to check again. The answer comes from the LLM (server function
// db/functions/debate-chat, 2026-11-24) when signed in, these placeholder lines otherwise or when it fails. Never advice,
// never a price call: the prompt forbids it and debateSafe replaces an answer that slips.
import type {ChatLine,ChatReply,BoriLLM} from './bori-chat';
import {UNSAFE,FRIEND_TALK} from './friend';

// what 루온 knows about the stock picked: only what the app itself shows on that tree (the models' notes, with their
// numbers), so the talk never rests on a made-up fact. real false: an example tree whose notes are made up (예시)
export type DebateCtx={hour:number;stock:{name:string;code:string|null;real:boolean;rate:number}|null;notes:string[]};
export function debatePrompt(c:DebateCtx,history:ChatLine[],message:string):{role:'system'|'user'|'assistant';content:string}[]{
  const s=c.stock;
  const about=!s?'고른 종목 없음'
    :`${s.name}${s.code?` (${s.code})`:''} · 내 수익률 ${s.rate}% · ${s.real?'실제 시세':'예시 종목(숫자는 모의 데이터)'}`;
  const notes=c.notes.length?c.notes.slice(0,8).map(n=>'- '+n).join('\n'):'- (이 종목에 대해 모델이 짚은 것 없음)';
  const system=[
    '너는 "루온"이야. 투자 판단 기록 앱 rethinking!의 토론 상대. 유저가 종목을 왜 갖고 있는지 말하면, 반대편에서 질문을 던져 그 판단을 다시 생각해 보게 해.',
    '하는 일: 유저 이유의 빈틈 하나를 짚고, 반대 근거를 찾아보게 하거나, 생각을 바꿀 조건(숫자·날짜·사건)을 정하게 묻는다. 한 번에 질문은 하나.',
    '근거는 아래 "모델이 짚은 것"과 유저가 한 말만 쓴다. 뉴스·실적·공시 같은 사실을 지어내지 않는다. 모르면 모른다고 하고 확인할 거리로 돌린다.',
    '절대 하지 않는 것: 사라/팔아/매수/매도/손절 같은 매매 권유, "오를 거야" "떨어질 거야" 같은 가격 예측, 목표가, 수익 약속. 결정은 유저 몫이라고 말한다.',
    '말투: 반말, 차분하고 건조하게. 두 문장 안쪽, 120자 안쪽. 이모지 금지.',
    `종목: ${about}`,
    `모델이 짚은 것:\n${notes}`,
    `지금 ${c.hour}시.`,
  ].join('\n');
  return [{role:'system',content:system},
    ...history.slice(-FRIEND_TALK.history).map(l=>({role:l.who==='bori'?'assistant' as const:'user' as const,content:l.text})),
    {role:'user',content:message.slice(0,FRIEND_TALK.maxIn)}];
}
export const debateSafe=(text:string)=>{const t=text.trim().slice(0,200);
  return !t||UNSAFE.test(t)?'…사고팔지는 네가 정해. 난 그 판단이 어디서 틀릴 수 있는지만 같이 볼게. 지금 이유가 깨지는 조건은 뭐야?':t};

const RULES:[RegExp,ChatReply][]=[
  [/사|팔|매수|매도|살까|팔까/,{text:'…사고팔지는 네가 정해. 난 그 판단이 어디서 틀릴 수 있는지만 같이 볼게. 지금 이유가 깨지는 조건은 뭐야?',emotion:'thinking'}],
  [/오를|오른|상승|좋아질|성장/,{text:'오를 거라고 보는구나. 그럼 반대로, 그 성장이 이미 가격에 다 들어가 있다면? 그걸 확인할 숫자 하나만 골라 봐.',emotion:'thinking'}],
  [/떨어|하락|나빠|위험|손실/,{text:'걱정되는 게 있구나. 그 위험이 진짜인지, 잠깐 지나가는 건지 가를 기준을 하나 정해 두자.',emotion:'concerned'}],
  [/실적|매출|이익|영업/,{text:'실적이 이유라면, 다음 발표에서 어떤 숫자가 나오면 생각을 바꿀래? 그 선을 미리 적어 두자.',emotion:'curious'}],
  [/뉴스|기사|소식/,{text:'뉴스 하나로 정한 거면, 같은 일을 반대로 해석한 기사도 찾아봐. 둘 다 읽고도 같은 결론이면 그때 믿어도 돼.',emotion:'thinking'}],
];
const FALLBACK:ChatReply[]=[
  {text:'…그렇게 보는 이유를 하나만 더 들어 볼래? 근거가 하나뿐이면 흔들리기 쉬워.',emotion:'curious'},
  {text:'좋아. 그럼 그 생각이 틀렸다고 알 수 있는 신호는 뭘까? 그걸 일지에 같이 적어 두자.',emotion:'thinking'},
  {text:'다들 맞다고 할 때가 제일 위험해. 반대편에 선 사람은 뭐라고 말할 것 같아?',emotion:'playful'},
];
export function debatePlaceholder(history:ChatLine[],message:string):ChatReply{
  const hit=RULES.find(([re])=>re.test(message));if(hit)return hit[1];
  return FALLBACK[history.filter(h=>h.who==='me').length%FALLBACK.length];
}
export async function debateChat(history:ChatLine[],message:string,llm?:BoriLLM|null):Promise<ChatReply>{
  if(llm){try{return await llm(history,message)}catch{/* fall back below */}}
  await new Promise(r=>setTimeout(r,500));
  return debatePlaceholder(history,message);
}
