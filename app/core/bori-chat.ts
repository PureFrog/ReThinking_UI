// 보리 자유 대화 (피드백 2026-11-23 "보리 LLM 나중에 넣을 건데 대화가 없어"): the one place the talk box asks for 보리's
// answer. Until the LLM is attached, a few placeholder lines answer by what was said (no advice, no price calls).
// To attach the LLM: give boriChat a `llm` (history + message → {text, emotion}); the server's boriTalk is wired in
// Proto3D when signed in. Nothing else in the UI changes.
export type ChatLine={who:'bori'|'me';text:string};
export type ChatReply={text:string;emotion?:string;at?:string};
export type BoriLLM=(history:ChatLine[],message:string)=>Promise<ChatReply>;

// v3 npc_bori: calm 반말, one or two sentences, one question; takes an answer without judging it
const RULES:[RegExp,ChatReply][]=[
  [/안녕|하이|반가/,{text:'왔구나. 오늘은 어디부터 둘러볼 거야?',emotion:'happy'}],
  [/사|팔|매수|매도|오를|떨어|살까|팔까/,{text:'그건 네가 정하는 거야. 대신 왜 그렇게 보는지 한 줄 들려줘. 네 생각이 제일 궁금해.',emotion:'thinking'}],
  [/퀴즈|레벨/,{text:'퀴즈는 집에서 선생님 담당이야. 레벨이 오르면 서랍 속 사건철도 열려.',emotion:'neutral'}],
  [/심심|놀/,{text:'연못에 나루 있어. 낚시 한 판 하고 와도 좋고.',emotion:'playful'}],
  [/힘들|피곤|걱정|불안/,{text:'그럴 때도 있지. 지금 바로 정리 안 해도 돼. 처음에 왜 샀는지부터 천천히 떠올려 보자.',emotion:'concerned'}],
];
const FALLBACK:ChatReply[]=[
  {text:'그렇구나. 말해 줘서 고마워. 왜 그렇게 생각했어?',emotion:'curious'},
  {text:'내 느낌엔 그 얘기 더 들어 보고 싶어. 한 줄로 말해 줄래?',emotion:'thinking'},
  {text:'응, 기억해 둘게. 다음에 밭 볼 때 같이 떠올려 보자.',emotion:'happy'},
];
// the placeholder: by the words in the message, else by turn
export function placeholderReply(history:ChatLine[],message:string):ChatReply{
  const hit=RULES.find(([re])=>re.test(message));if(hit)return hit[1];
  return FALLBACK[history.filter(h=>h.who==='me').length%FALLBACK.length];
}
// 보리's answer: the LLM when one is given, the placeholder otherwise (or when the LLM fails)
export async function boriChat(history:ChatLine[],message:string,llm?:BoriLLM|null):Promise<ChatReply>{
  if(llm){try{return await llm(history,message)}catch{/* fall back below */}}
  await new Promise(r=>setTimeout(r,500));
  return placeholderReply(history,message);
}
