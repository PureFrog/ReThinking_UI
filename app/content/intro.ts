// 게임 구성 2026-11-20: each friend says its own model (토리 듀퐁, 모아 올슨, 루온 F-Score).
// The first entry's introductions (ui/Intro.tsx, feedback 11-17): who is who and what each one does, one line each,
// then 보리 asks for the portfolio. Plain game words (docs/redesign.md 2장): no buy/sell, no price calls.
export type IntroWho='bori'|'tori'|'moa'|'luon';
export const INTRO_NAME:Record<IntroWho,string>={bori:'보리',tori:'토리',moa:'모아',luon:'루온'};
export const INTRO:{who:IntroWho;text:string}[]=[
  {who:'bori',text:'왔구나! 나는 보리야. 여기는 네 종목이 한 그루씩 나무로 자라는 정원이야.'},
  {who:'bori',text:'나는 듣는 담당. 왜 샀는지, 지금은 어떻게 보는지 네 말로 들려줘.'},
  {who:'tori',text:'토리야. 듀퐁 분석으로 회사의 수익성이 어디서 나오는지 쪼개 봐.'},
  {who:'moa',text:'모아야. 올슨 모델로 회사에 부실 위험이 있는지, 버틸 힘부터 봐.'},
  {who:'luon',text:'루온. F-Score 아홉 칸으로 재무 체력이 작년보다 나아졌는지 따져.'},
  {who:'bori',text:'네가 남긴 판단은 30일, 90일 뒤에 채점돼서 돌아와. 맞았는지 같이 보자.'},
  {who:'bori',text:'그럼 먼저 네 포트폴리오부터! 증권 앱 보유 종목 화면을 캡처해서 올리면 돼.'},
];
