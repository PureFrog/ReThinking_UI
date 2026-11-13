// What two analysts say when their day brings them together (core/routine.ts meets). Short, in their own voices
// (redesign 2장: tori plain and booky, moa quick, luon asks back). Never a buy or sell call, never a price guess.
// Keyed by who speaks first and to whom; each is the opener and the reply.
import type {Who} from '../core/routine';
export const CHATS:Partial<Record<`${Who}-${Who}`,[string,string][]>>={
  'moa-luon':[['어, 오늘 거래량 봤어?','그게 뭐 어쨌는데.'],['저거 3주째 저점 낮아진다?','그럼 바닥은 언제라고 볼 건데?']],
  'luon-moa':[['차트가 맞은 날만 기억하는 거 아니야?','…틀린 날도 적어 두거든!'],['그 신호, 반대로 볼 이유는 없어?','있으면 네가 말해 주겠지 뭐.']],
  'tori-moa':[['차트만 보지 말고 현금흐름도 봐.','보고 있어! 대충.'],['이번 분기 장부 나왔어. 같이 볼래?','숫자 많은 거 싫은데… 응.']],
  'moa-tori':[['토리, 그 책 몇 번째야?','세 번째. 각주가 재밌어.'],['오늘 하늘 흐린 거 봤어?','시장 얘기면 숫자로 말해 줘.']],
  'tori-luon':[['부채비율 또 올랐어. 두 분기째.','그래서 그게 지금 문제야, 나중 문제야?'],['F-score 9개 중 7개가 같은 쪽이야.','나머지 두 개는 왜 반대인데?']],
  'luon-tori':[['그 장부, 반대로 읽으면 어때?','숫자는 반대로 안 읽혀.'],['확신 5짜리 판단, 몇 개나 맞았어?','기록 보면 나와. 볼래?']],
};
export function chatOf(a:Who,b:Who,seed:number):{a:string;b:string}{
  const list=CHATS[`${a}-${b}`]??[['…','…']],[x,y]=list[Math.abs(seed)%list.length];return {a:x,b:y};
}
