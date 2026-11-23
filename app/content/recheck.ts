// What a tree card says first (core/recheck.ts, 처분효과): worth now, share of the garden, the one question asked of a
// gain and a loss alike, and the MTS sheet's two views in a line (content/broker/two-views.ts) when there is data.
import {recheck} from '../core/recheck';
import type {Holding} from '../core/model';
import {twoViews} from './broker/two-views';
import {line} from './analysts';

// the card's copy (longer than the UI strings' 40 characters, so kept here)
export const RECHECK={ask:'오늘 처음 본다면, 이 종목을 정원의 {w}%만큼 담을까요?',
  note:'산 값과 들고 있던 날은 잠깐 빼고 지금 숫자로만 봐요. 수익 난 나무에도 손실 난 나무에도 똑같이 묻는 질문이에요.'};

export type RecheckCard={worth:number;weight:number;rate:number;ask:string;note:string;
  views:{book:string|null;path:string|null;split:boolean;title:string}|null};
export function recheckCard(h:Holding,all:Holding[],today:string):RecheckCard{
  const r=recheck(h,all),tv=h.code?twoViews(h.code,today):null;
  // a disagreement is only named when the books are there to disagree with
  const views=tv&&(tv.book||tv.path)?{book:tv.book?.chip??null,path:tv.path?.chip??null,split:!!tv.book&&tv.split,title:tv.book?tv.title:''}:null;
  return {...r,ask:line(RECHECK.ask,{w:String(r.weight)}),note:RECHECK.note,views};
}
