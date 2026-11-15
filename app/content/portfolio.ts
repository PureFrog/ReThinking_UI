// The player's holdings come from a capture of their brokerage screen (onboarding, ux-spec 8장; the user's choice).
// Reading the picture belongs to the backend later (OCR or an LLM, 13.7-9): this reader is the one boundary to swap.
// Today it never looks at the picture and returns mock holdings (CLAUDE.md: no real financial data, no LLM API);
// the picture itself stays in the browser.
export type ReadHolding={name:string;rate:number;quantity?:number;price?:number};
export type PortfolioReader={read(file:Blob):Promise<ReadHolding[]>};

// What the mock capture "shows": the four companies the demo garden used to start with.
export const MOCK_CAPTURE:ReadHolding[]=[
 {name:'SK하이닉스',rate:12.4,quantity:12,price:52000},
 {name:'NAVER',rate:7.2,quantity:8,price:34000},
 {name:'카카오',rate:-13,quantity:20,price:28000},
 {name:'현대차',rate:-24,quantity:10,price:24000},
];
// a moment of "reading" so the panel shows it working (ms)
export const READ_DELAY=700;
export const portfolioReader:PortfolioReader={read:()=>new Promise(r=>setTimeout(()=>r(MOCK_CAPTURE.map(h=>({...h}))),READ_DELAY))};

// Tree kind per company (0 chip tree, 1 flower tree, 2 star-fruit tree); a company not listed gets one by its name.
export const COMPANY_KINDS:Record<string,number>={SK하이닉스:0,푸른칩테크:0,카카오:1,이슬코스메틱:1,NAVER:2,현대차:2};
export function kindOf(name:string){if(name in COMPANY_KINDS)return COMPANY_KINDS[name];let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;return h%3}
