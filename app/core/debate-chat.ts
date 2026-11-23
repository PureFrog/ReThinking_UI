// 토론 캐릭터 (루온, 유저 워크플로우 2026-11-23 "토론 캐릭터 · 종목 토론"): I pick a stock and say why I hold it; 루온
// listens and asks for the other side or the condition to check again. The one place the answer comes from: the LLM
// when one is given (to attach later), these placeholder lines otherwise. Never advice, never a price call.
import type {ChatLine,ChatReply,BoriLLM} from './bori-chat';

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
