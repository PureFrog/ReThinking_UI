// R5 the mock-trading round (a teammate builds the prototype; redesign 4-3). The observatory in the garden is its
// door. Set `url` to the prototype's address when it lands; until then the panel shows what the round will be.
// The model cards used in the round are the analysts' models (app/content/analysts.ts MODEL_INFO).
export const GAME={
  name:'모의투자 판',
  url:null as string|null,
  minutes:10,
  rules:['실제 과거 시나리오 하나, 약 10분','헤드라인이 흘러가고, 매수·매도·홀드·손절 중에 골라','모델 카드로 근거를 확인할 수 있어','끝나면 수익률 순위와 복기'],
  cards:['ohlson','fscore','dupont','gradual','crash','rebuttal'] as const,
};
