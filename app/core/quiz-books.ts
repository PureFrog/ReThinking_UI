// 12.3 quiz books on the bookcase: one book per topic. Every question of a book answered right turns its spine gold;
// a wrong answer leaves a bookmark and the question comes back first next time. New right answers pay sunlight up to
// 3 a day; going over old pages is free but unpaid. Concepts only: no buy/sell advice, no price calls.
export type BookQuestion={q:string;options:[string,string];answer:0|1;why:string};
export type Book={id:string;title:string;color:string;questions:BookQuestion[]};
export const BOOKS:Book[]=[
 {id:'statements',title:'재무제표 읽기',color:'#8fae8b',questions:[
  {q:'매출이 늘었다면 이익도 반드시 늘었을까요?',options:['그렇다','아니다'],answer:1,why:'비용이 더 빨리 늘면 매출이 커져도 이익은 줄 수 있어요. 매출과 이익은 따로 봐요.'},
  {q:'영업이익은 본업으로 번 돈을 보여 준다.',options:['맞다','아니다'],answer:0,why:'영업이익은 매출에서 본업에 든 비용을 뺀 값이에요. 일회성 손익은 그 아래에서 따로 잡혀요.'},
  {q:'현금이 늘지 않아도 장부상 이익은 날 수 있다.',options:['맞다','아니다'],answer:0,why:'외상으로 팔면 이익은 잡히지만 현금은 나중에 들어와요. 그래서 현금흐름표도 함께 봐요.'}]},
 {id:'disclosure',title:'공시 읽기',color:'#9fb7dd',questions:[
  {q:'공시는 회사가 투자자에게 알려야 하는 사실을 공식적으로 밝히는 문서다.',options:['맞다','아니다'],answer:0,why:'공시는 정해진 규칙에 따라 회사가 직접 내는 공식 정보예요. 소문이나 기사와 구분해요.'},
  {q:'계약 공시를 읽을 때 금액만 보면 충분하다.',options:['그렇다','아니다'],answer:1,why:'계약 기간, 매출 대비 비중, 해지 조건도 함께 봐야 그 계약의 무게를 알 수 있어요.'},
  {q:'정정 공시는 앞서 낸 공시 내용이 바뀌었다는 뜻이다.',options:['맞다','아니다'],answer:0,why:'정정 공시가 나오면 무엇이 왜 바뀌었는지 원래 공시와 나란히 비교해 봐요.'}]},
 {id:'loss',title:'손실 회피',color:'#d9a08f',questions:[
  {q:'같은 크기라도 잃는 아픔이 얻는 기쁨보다 크게 느껴지는 경향이 있다.',options:['맞다','아니다'],answer:0,why:'이걸 손실 회피라고 해요. 이 마음이 판단을 미루거나 서두르게 만들 수 있어요.'},
  {q:'산 가격보다 내려간 종목은 그 가격이 다시 올 때까지 기다리는 게 늘 맞다.',options:['그렇다','아니다'],answer:1,why:'내가 산 가격은 회사의 가치와 상관이 없어요. 지금 이유가 여전히 유효한지로 다시 봐요.'},
  {q:'처음 산 이유를 적어 두면 나중에 감정과 판단을 구분하는 데 도움이 된다.',options:['맞다','아니다'],answer:0,why:'적어 둔 이유와 지금 상황을 비교하면 기분이 아니라 근거로 다시 생각할 수 있어요.'}]},
 {id:'diversify',title:'분산 투자',color:'#e3c27e',questions:[
  {q:'종목 수만 많으면 위험이 충분히 나뉜다.',options:['그렇다','아니다'],answer:1,why:'같은 업종이나 같은 이유로 움직이는 종목이면 개수가 많아도 위험은 비슷하게 몰려 있어요.'},
  {q:'분산은 한 곳에서 생긴 일이 전체에 주는 충격을 줄이려는 방법이다.',options:['맞다','아니다'],answer:0,why:'서로 다른 이유로 움직이는 자산을 섞으면 한쪽의 일이 전체를 흔드는 정도가 작아져요.'},
  {q:'분산 투자를 하면 손실이 생기지 않는다.',options:['그렇다','아니다'],answer:1,why:'분산은 충격을 나누는 것이지 손실을 없애 주지 않아요. 시장 전체가 흔들리면 함께 흔들려요.'}]},
];
export const DAILY_QUIZ_REWARDS=3;
export type BookProgress={right:number[];marks:number[]};
export type QuizProgress={books:Record<string,BookProgress>;daily:{day:string;paid:number}};
export const blankQuiz=():QuizProgress=>({books:{},daily:{day:'',paid:0}});
const prog=(p:QuizProgress,id:string):BookProgress=>p.books[id]??{right:[],marks:[]};
export const isGold=(p:QuizProgress,b:Book)=>b.questions.every((_,i)=>prog(p,b.id).right.includes(i));
export const goldCount=(p:QuizProgress)=>BOOKS.filter(b=>isGold(p,b)).length;
export const hasMark=(p:QuizProgress,b:Book)=>prog(p,b.id).marks.length>0;
// Bookmarked questions first, then ones never answered right; a gold book starts over from the top (review, unpaid).
// skip: pages missed in this sitting, so a miss isn't simply answered again straight away; it comes back once the
// other pages are done (or first thing next time).
export function nextQuestion(p:QuizProgress,b:Book,skip:number[]=[]){const g=prog(p,b.id);const marked=g.marks.find(m=>!skip.includes(m));if(marked!==undefined)return marked;const fresh=b.questions.findIndex((_,i)=>!g.right.includes(i)&&!skip.includes(i));if(fresh>=0)return fresh;return g.marks[0]??0/* nothing else left: the missed page comes back */}
export function firstOpenBook(p:QuizProgress){return BOOKS.find(b=>!isGold(p,b))??BOOKS[0]}
export function answerBook(p:QuizProgress,bookId:string,qi:number,choice:number,day:string){
 const b=BOOKS.find(v=>v.id===bookId)!;const g=prog(p,bookId);const right=b.questions[qi].answer===choice;const first=right&&!g.right.includes(qi);
 const daily=p.daily.day===day?p.daily:{day,paid:0};const reward=first&&daily.paid<DAILY_QUIZ_REWARDS;
 const next:BookProgress={right:right&&!g.right.includes(qi)?[...g.right,qi]:g.right,marks:right?g.marks.filter(m=>m!==qi):g.marks.includes(qi)?g.marks:[...g.marks,qi]};
 const after:QuizProgress={books:{...p.books,[bookId]:next},daily:reward?{day,paid:daily.paid+1}:daily};
 return {progress:after,right,reward,gold:!isGold(p,b)&&isGold(after,b)};
}
