// Two views on one stock (멘토링 2026-11-22, 1.3·1.4): the company's books and the price's path are read apart, and
// when they disagree the player is told so instead of being given one verdict. Books (토리·루온): F-score and the
// O-score bankruptcy odds, the team's fundamentals models. Path (모아): the daily closes against their 60-day average.
// A healthy book under a falling price is the value-trap case: the company not being broken is not the same thing as
// the holding doing well, so the two are shown side by side. Nothing here says to buy or sell.
import type {Bar} from './jigi/stocks';

// what the books say: fscore 0~9 (higher is healthier), oscore: bankruptcy odds in % (last quarter → this quarter)
export type Books={asOf:string;fscore:number;oscore:[number,number];roe:[number,number];debt:[number,number]};
export type BookState='weak'|'ok'|'strong';
export type PathState='down'|'flat'|'up';
export type BookRead={state:BookState;model:'fscore'|'ohlson';fscore:number;oscore:[number,number];roe:[number,number];debt:[number,number];asOf:string};
export type PathRead={state:PathState;close:number;ma60:number;r60:number;below20:number;fromHigh:number;asOf:string;spark:number[]};
export type Together='both'|'trap'|'ahead'|'calm'|'books';

export const BOOK_WEAK={fscore:3,oscore:15},BOOK_STRONG={fscore:7,oscore:5};
export const PATH_DOWN=-10,PATH_UP=5;
const round1=(x:number)=>Math.round(x*10)/10;

// weak: 9 checks with 3 or fewer passing, or bankruptcy odds at 15% or more. strong: 7+ passing and odds under 5%.
// model: which of the two said it (O-score when the odds are what crossed the line)
export function readBooks(b:Books):BookRead{
  const odds=b.oscore[1],weak=b.fscore<=BOOK_WEAK.fscore||odds>=BOOK_WEAK.oscore;
  const state:BookState=weak?'weak':b.fscore>=BOOK_STRONG.fscore&&odds<BOOK_STRONG.oscore?'strong':'ok';
  const model=odds>=BOOK_WEAK.oscore&&b.fscore>BOOK_WEAK.fscore?'ohlson':'fscore';
  return {state,model,fscore:b.fscore,oscore:b.oscore,roe:b.roe,debt:b.debt,asOf:b.asOf};
}

// the closes up to and including `today`: down when the last close is under its 60-day average and 60 trading days
// took 10% or more off it; up when it is over the average and 60 days added 5% or more; flat otherwise
export function readPath(all:Bar[],today:string):PathRead|null{
  const b=all.filter(x=>x.d<=today),n=b.length;if(n<61)return null;
  const last=b[n-1],ma60=b.slice(n-60).reduce((a,x)=>a+x.c,0)/60,r60=round1((last.c/b[n-61].c-1)*100);
  let below20=0;for(let i=n-1;i>=20;i--){const ma=b.slice(i-19,i+1).reduce((a,x)=>a+x.c,0)/20;if(b[i].c<ma)below20++;else break}
  const high=Math.max(...b.slice(n-120).map(x=>x.c));
  const state:PathState=last.c<ma60&&r60<=PATH_DOWN?'down':last.c>ma60&&r60>=PATH_UP?'up':'flat';
  return {state,close:last.c,ma60:Math.round(ma60),r60,below20,fromHigh:round1((last.c/high-1)*100),asOf:last.d,spark:b.slice(n-60).map(x=>x.c)};
}

// both: books weak and price down. trap: books fine (ok/strong), price down. ahead: price up, books weak.
// books: books weak, price flat. calm: nothing to flag.
export function together(book:BookState,path:PathState):Together{
  if(book==='weak'&&path==='down')return 'both';
  if(book!=='weak'&&path==='down')return 'trap';
  if(book==='weak'&&path==='up')return 'ahead';
  if(book==='weak')return 'books';
  return 'calm';
}
export const disagree=(t:Together)=>t==='trap'||t==='ahead';
