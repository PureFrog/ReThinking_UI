// The player's holdings come from a capture of their brokerage screen (onboarding, ux-spec 8장; the user's choice).
// Signed in, the picture is read for real by the server (proto3d/supabase.ts readCapture → OpenAI vision, rules in
// core/capture.ts). Without an account this mock stands in: it never looks at the picture, the picture stays in the
// browser, and the screen says the result is an example.
import type {ReadHolding} from '../core/capture';
export type {ReadHolding};
export type PortfolioReader={read(file:Blob):Promise<ReadHolding[]>};

// What the mock capture "shows" (피드백 2026-11-23 "코스피 종목이 나와"): four KOSDAQ120 names, the only market we use.
export const MOCK_CAPTURE:ReadHolding[]=[
 {name:'클래시스',rate:12.4,quantity:12,price:52000},
 {name:'네오위즈',rate:7.2,quantity:8,price:34000},
 {name:'하림',rate:-13,quantity:20,price:28000},
 {name:'에이치엘비',rate:-24,quantity:10,price:24000},
];
// a moment of "reading" so the panel shows it working (ms)
export const READ_DELAY=700;
export const portfolioReader:PortfolioReader={read:()=>new Promise(r=>setTimeout(()=>r(MOCK_CAPTURE.map(h=>({...h}))),READ_DELAY))};

// Tree kind per company (0 chip tree, 1 flower tree, 2 star-fruit tree); a company not listed gets one by its name.
export const COMPANY_KINDS:Record<string,number>={SK하이닉스:0,클래시스:0,푸른칩테크:0,카카오:1,하림:1,이슬코스메틱:1,NAVER:2,네오위즈:2,현대차:2,에이치엘비:2};
export function kindOf(name:string){if(name in COMPANY_KINDS)return COMPANY_KINDS[name];let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;return h%3}
