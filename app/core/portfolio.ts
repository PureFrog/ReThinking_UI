// Turning a read capture into trees (ux-spec 8장 onboarding, and every capture after it).
// A company already in the garden takes the new rate; a new one becomes a tree once the player says roughly how long
// they have held it (a capture rarely shows the buying day, and the holding time is the tree's size); a tree missing
// from the capture is asked about ("정리했어?") and only goes when the player says so. Nothing is ever bought or sold.
import {demoDate,type Holding} from './model';
import type {ReadHolding} from '../content/portfolio';
export const HELD=[{id:'week',label:'1주 안',days:5},{id:'month',label:'1달쯤',days:30},{id:'quarter',label:'3달쯤',days:90},{id:'half',label:'반년 넘게',days:200}] as const;
export type HeldId=typeof HELD[number]['id'];
// one line of the confirm list: keep = plant it / take the new rate; held only for a new tree
export type Draft={name:string;rate:number;quantity:number;price:number;keep:boolean;held:HeldId;existing:number|null};
export function drafts(read:ReadHolding[],holdings:Holding[]):{rows:Draft[];missing:Holding[]}{
 const seen=new Set<string>();const rows:Draft[]=[];
 for(const r of read){const name=r.name.trim();if(!name||seen.has(name))continue;seen.add(name);const ex=holdings.find(h=>h.name===name);
  rows.push({name,rate:r.rate,quantity:r.quantity??ex?.quantity??1,price:r.price??ex?.price??0,keep:true,held:'month',existing:ex?.id??null})}
 return {rows,missing:holdings.filter(h=>!seen.has(h.name))}}
const back=(days:number,from=demoDate)=>{const d=new Date(Date.parse(from)-days*86400000);return d.toISOString().slice(0,10)};
// gone: ids of missing trees the player said were sold. free: the empty plots, in order. kind: tree kind per name.
export function applyDrafts(holdings:Holding[],rows:Draft[],gone:number[],free:number[],kind:(name:string)=>number,now=Date.now()){
 let next=holdings.filter(h=>!gone.includes(h.id));const planted:Holding[]=[],left:Draft[]=[];let updated=0;const plots=[...free];
 for(const [i,r] of rows.entries()){if(!r.keep)continue;
  const ex=next.find(h=>h.name===r.name);
  if(ex){if(ex.rate!==r.rate){updated++;next=next.map(h=>h===ex?{...h,rate:r.rate,lossDays:r.rate<=-20?h.lossDays:0}:h)}continue}
  const plot=plots.shift();if(plot===undefined){left.push(r);continue}
  const days=HELD.find(x=>x.id===r.held)!.days;
  const h:Holding={id:now+i,name:r.name,kind:kind(r.name),price:r.price,quantity:r.quantity,date:back(days),rate:r.rate,plot,lossDays:0};planted.push(h);next=[...next,h]}
 return {holdings:next,planted,updated,left,gone:holdings.filter(h=>gone.includes(h.id))}}
// The garden's empty plots, in order (plots: how many the 3D garden has)
export const freePlots=(holdings:Holding[],plots:number)=>[...Array(plots).keys()].filter(i=>!holdings.some(h=>h.plot===i));
// a blank line for typing a company in by hand
export const blankDraft=():Draft=>({name:'',rate:0,quantity:1,price:0,keep:true,held:'month',existing:null});
