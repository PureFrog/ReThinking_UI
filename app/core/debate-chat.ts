// 토론 캐릭터 (루온, system prompt for the LLM: core/npc-persona.ts personaPrompt('luon'); 유저 워크플로우 2026-11-23 "토론 캐릭터 · 종목 토론"): I pick a stock and say why I hold it; 루온
// listens and asks for the other side or the condition to check again. The one place the answer comes from: the LLM
// when one is given (to attach later), these placeholder lines otherwise. Never advice, never a price call.
import type {ChatLine,ChatReply,BoriLLM} from './bori-chat';

// 2026-11-24: in the debater's own voice (content/npc-personas/npc_debater.json): 짧고 정돈된 존댓말, dry, '흥미롭네요. 그런데—'
const RULES:[RegExp,ChatReply][]=[
  [/사|팔|매수|매도|살까|팔까/,{text:'제가 사라, 팔아라 하면 그건 제 투자죠. 당신 근거로 정하세요. 저는 빈틈만 찾아 드릴게요. 지금 이유가 깨지는 조건은 뭔가요?',emotion:'thinking'}],
  [/오를|오른|상승|좋아질|성장/,{text:'흥미롭네요. 그런데 그 성장이 이미 가격에 다 들어가 있다면요? 그걸 확인할 숫자 하나만 골라 보세요.',emotion:'thinking'}],
  [/떨어|하락|나빠|위험|손실/,{text:'걱정되는 게 있군요. 그 위험이 진짜인지, 잠깐 지나가는 건지 가를 기준을 하나 정해 두죠.',emotion:'concerned'}],
  [/실적|매출|이익|영업/,{text:'실적이 이유라면, 정확히 어떤 기준이죠? 다음 발표에서 어떤 숫자가 나오면 생각을 바꿀 건가요?',emotion:'curious'}],
  [/뉴스|기사|소식/,{text:'그 근거가 기사 하나인가요? 같은 일을 반대로 읽은 기사도 찾아보세요. 둘 다 읽고도 같은 결론이면, 그때는 믿어도 되죠.',emotion:'thinking'}],
];
const FALLBACK:ChatReply[]=[
  {text:'그렇게 보는 이유를 하나만 더 들어 보죠. 근거가 하나뿐이면 흔들리기 쉽거든요.',emotion:'curious'},
  {text:'좋아요. 그럼 어떤 일이 생기면 이 판단을 다시 생각해 볼 건가요?',emotion:'thinking'},
  {text:'나쁘지 않네요. 그런데 반대편에 선 사람은 뭐라고 말할 것 같아요?',emotion:'curious'},
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
