// 보리 자유 대화 (피드백 2026-11-23 "보리 LLM 나중에 넣을 건데 대화가 없어"): the one place the talk box asks for 보리's
// answer. Until the LLM is attached, a few placeholder lines answer by what was said (no advice, no price calls).
// To attach the LLM: give boriChat a `llm` (history + message → {text, emotion}); the server's boriTalk is wired in
// Proto3D when signed in. Nothing else in the UI changes.
export type ChatLine={who:'bori'|'me';text:string};
export type ChatReply={text:string;emotion?:string};
export type BoriLLM=(history:ChatLine[],message:string)=>Promise<ChatReply>;

const RULES:[RegExp,ChatReply][]=[
  [/안녕|하이|반가/,{text:'안녕! 오늘 정원은 어때 보여?',emotion:'happy'}],
  [/사|팔|매수|매도|오를|떨어|살까|팔까/,{text:'사고팔지는 네가 정하는 거야. 대신 왜 그렇게 보는지 한 줄 들려줘. 일지에 같이 적어 두자.',emotion:'thinking'}],
  [/퀴즈|레벨/,{text:'퀴즈는 집 책상에서 선생님이랑 풀어. 레벨이 오르면 서랍 속 사건철도 열려.',emotion:'playful'}],
  [/일지|기록/,{text:'일지는 도서관 사서한테 가면 펼쳐 줘. 오늘 생각 하나만 남겨 봐.',emotion:'happy'}],
  [/심심|놀/,{text:'그럼 나루한테 가서 낚시 한 판 어때? 잡은 만큼 코인도 들어와.',emotion:'playful'}],
  [/힘들|피곤|걱정|불안/,{text:'그럴 때도 있지. 숫자 말고 네가 처음에 왜 샀는지부터 천천히 떠올려 보자.',emotion:'concerned'}],
];
const FALLBACK:ChatReply[]=[
  {text:'오, 그 얘기 더 해 줘. 왜 그렇게 생각했어?',emotion:'curious'},
  {text:'음… 나는 듣는 담당이야. 네 생각을 한 줄로 정리해 볼래?',emotion:'thinking'},
  {text:'좋아, 기억해 둘게. 다음에 나무 볼 때 같이 떠올려 보자.',emotion:'happy'},
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
