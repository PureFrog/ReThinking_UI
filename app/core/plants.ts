// Decor flowers and trees planted from the 꽃집 (content/flower-shop.ts): where they stand and buying one. Where a spot
// is free is the scene's call (Scene3D plantBlock: pond, stream, holding plots, buildings, the edge); here only the
// rules that need no scene: the price and keeping clear of the other planted ones.
export type Plant={id:string;item:string;x:number;z:number;at:number};
export const PLANT={gap:1.3/* from another planted one */};
export function tooClose(plants:{x:number;z:number}[],x:number,z:number){return plants.some(p=>Math.hypot(p.x-x,p.z-z)<PLANT.gap)}
export function buyPlant(o:{currency:number;plants:Plant[]},item:{id:string;price:number},x:number,z:number,now:number):
  {ok:true;currency:number;plants:Plant[];plant:Plant}|{ok:false;why:'coins'|'close'}{
  if(o.currency<item.price)return {ok:false,why:'coins'};
  if(tooClose(o.plants,x,z))return {ok:false,why:'close'};
  const plant={id:`p${now.toString(36)}${o.plants.length}`,item:item.id,x:Math.round(x*100)/100,z:Math.round(z*100)/100,at:now};
  return {ok:true,currency:o.currency-item.price,plants:[...o.plants,plant],plant};
}
// put back (the shop's 내 정원 tab): the coins are not returned, the spot frees up
export const removePlant=(plants:Plant[],id:string)=>plants.filter(p=>p.id!==id);
