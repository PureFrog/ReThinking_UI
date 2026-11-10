// ux-spec 5장 where sunlight pieces go: a little peddler's cart by the mailbox. Sunlight is never earned from returns,
// so nothing here can be bought with a good return either. The cart shows a few things that change every day; one of
// each a day. A purchase is a press-and-hold (11.1) and the thing flies to the drawer like any gift (11.8).
import type {GiftBox} from './model';
// price in sunlight pieces: things the garden already knows (drawer art, furniture rules), small to big
export const CART_POOL:{item:string;price:number}[]=[
 {item:'위로 사탕',price:3},{item:'산딸기 잼',price:4},{item:'따뜻한 보리차',price:4},
 {item:'털실 바구니',price:8},{item:'들꽃 화병',price:8},{item:'작은 나무 상자',price:8},
 {item:'여름 선글라스',price:10},{item:'작은 별 조명',price:12},{item:'포근한 담요',price:12},
];
export const CART={stock:3/* things on the cart at a time */,days:1/* the stock changes every this many days */};
export const CART_SENDER='cart';
// a small mixing hash: nearby keys (the same round, the next item) land far apart
const hash=(s:string)=>{let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;h^=h>>>16;h=Math.imul(h,0x45d9f3b)>>>0;h^=h>>>16;h=Math.imul(h,0x45d9f3b)>>>0;return (h^h>>>16)>>>0};
const dayNo=(day:string)=>Math.floor(Date.parse(day)/86400000);
// which round of stock a day belongs to (the flag over the cart changes colour with it)
export const stockRound=(day:string)=>Math.floor(dayNo(day)/CART.days);
export function stockFor(day:string){const round=stockRound(day);return [...CART_POOL].map((p,i)=>({p,k:hash(round+':'+i)})).sort((a,b)=>a.k-b.k).slice(0,CART.stock).map(x=>x.p)}
// bought today from this round already (one of each a day)
export const boughtToday=(gifts:GiftBox[],item:string,day:string)=>gifts.some(g=>g.sender===CART_SENDER&&g.item===item&&g.day===day);
export function buy(sunlight:number,gifts:GiftBox[],item:string,day:string,now=Date.now()):{ok:false;why:'price'|'sold'|'gone'}|{ok:true;sunlight:number;gift:GiftBox}{
 const p=stockFor(day).find(x=>x.item===item);if(!p)return {ok:false,why:'gone'};if(boughtToday(gifts,item,day))return {ok:false,why:'sold'};if(sunlight<p.price)return {ok:false,why:'price'};
 return {ok:true,sunlight:sunlight-p.price,gift:{id:'cart-'+now,sender:CART_SENDER,anonymous:false,item,x:-1,y:-1,day}}}
