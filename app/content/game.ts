// 관측소 원정 (docs/game.md): the observatory in the garden opens it (game/Expedition.tsx). The model cards are the
// analysts' models (app/content/analysts.ts MODEL_INFO).
export const GAME={
  name:'관측소 원정',
  minutes:5,
  rules:['이름과 연도를 가린 진짜 과거 코스닥, 회사 넷','하루 3초. 급락·실적 날엔 시간이 멈춰','지킴·절반·정리에 확신 칩 1~4개','끝에 정체 공개, 결정마다 20일 뒤로 채점'],
  cards:['fscore','crash','rebuttal'] as const,
};
