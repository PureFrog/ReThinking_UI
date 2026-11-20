// 게임 구성 2026-11-20: the coins are counted in won, at real-money sizes (a fish, a journal, a plant, a share of a
// virtual stock all in 원). Every amount that was in the old small coins is multiplied by WON where it is defined,
// and an old save is converted once (state.ts). Coins are still play money: they never touch a real account.
export const WON=1000;
export const won=(n:number)=>Math.round(n).toLocaleString('ko-KR')+'원';
// the form beside a coin icon: the whole number with commas, no unit (feedback 2026-11-20: 1,030,000, not 103만원)
export const wonShort=(n:number)=>(n<0?'−':'')+Math.round(Math.abs(n)).toLocaleString('ko-KR');
