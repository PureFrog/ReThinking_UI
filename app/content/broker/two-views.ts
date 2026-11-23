// What the MTS sheet says about one stock (멘토링 2026-11-22): the books and the price path side by side
// (core/views.ts), one line on whether they agree, and what the models cannot see. Shown inside the MTS so the answer
// comes in place, without going into the garden. It names what the models read; the judgment stays with the player.
import {readBooks,readPath,together,disagree,type BookRead,type PathRead,type Together} from '../../core/views';
import {bars} from '../../core/jigi/stocks';
import {booksOf} from '../books';

export type Fact={k:string;v:string};
export type Card={label:string;who:string;chip:string;tone:'warn'|'calm'|'good';facts:Fact[];foot:string};
export type TwoViews={together:Together;split:boolean;title:string;line:string;book:Card|null;path:Card|null;spark:number[];blind:string};

const pct=(x:number)=>`${x>0?'+':''}${x}%`;
export const SUM:Record<Together,{title:string;line:string}>={
  both:{title:'두 관점이 같은 쪽을 봐요',line:'회사 숫자도 약해졌고, 주가도 60일 평균 아래로 내려왔어요.'},
  trap:{title:'두 관점이 엇갈려요',line:'회사 숫자는 버티는데 주가는 내려가는 중이에요. 회사가 괜찮다는 것과 이 종목이 내 계좌에 좋았다는 건 다른 이야기예요.'},
  ahead:{title:'두 관점이 엇갈려요',line:'주가는 오르는데 회사 숫자는 약해졌어요. 주가가 무엇을 보고 움직이는지는 이 모델이 알 수 없어요.'},
  books:{title:'회사 숫자만 약해졌어요',line:'주가는 아직 뚜렷한 방향이 없어요. 다음 분기 숫자가 기준이 돼요.'},
  calm:{title:'두 관점 모두 짚을 게 없어요',line:'이 모델이 보는 범위에서는 눈에 띄는 변화가 없어요.'},
};
export const BLIND='이 모델은 회사 재무와 주가만 봐요. 수급, 금리·경기, 투자 심리, 뉴스는 보지 못해요. 투자 권유가 아니며 판단은 직접 해요.';
const BOOK_CHIP={weak:['약해짐','warn'],ok:['보통','calm'],strong:['튼튼','good']} as const;
const PATH_CHIP={down:['내려가는 중','warn'],flat:['옆걸음','calm'],up:['오르는 중','good']} as const;

export function bookCard(k:BookRead):Card{
  const [chip,tone]=BOOK_CHIP[k.state];
  return {label:'기업 체력',who:k.model==='ohlson'?'모아 · 올슨 모델':'루온 · F-score',chip,tone,foot:`${k.asOf} · 모의 재무`,
    facts:[{k:'F-score',v:`9점 중 ${k.fscore}점`},{k:'부도 확률',v:`${k.oscore[0]}% → ${k.oscore[1]}%`},{k:'ROE',v:`${k.roe[0]}% → ${k.roe[1]}%`}]};
}
export function pathCard(p:PathRead):Card{
  const [chip,tone]=PATH_CHIP[p.state],vsMa=Math.round((p.close/p.ma60-1)*1000)/10;
  return {label:'주가 흐름',who:'모아 · 추세',chip,tone,foot:`${p.asOf} 종가 · 모의 시세`,
    facts:[{k:'60거래일',v:pct(p.r60)},{k:'60일 평균 대비',v:pct(vsMa)},{k:'20일선 아래',v:p.below20?`${p.below20}거래일째`:'아님'}]};
}
export function twoViews(code:string,today:string):TwoViews{
  const b=booksOf(code),k=b?readBooks(b):null,p=readPath(bars(code),today);
  const t=together(k?.state??'ok',p?.state??'flat'),sum=SUM[t];
  return {together:t,split:disagree(t),title:sum.title,line:sum.line,book:k?bookCard(k):null,path:p?pathCard(p):null,spark:p?.spark??[],blind:BLIND};
}
