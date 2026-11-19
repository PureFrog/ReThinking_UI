import test from 'node:test';
import {load} from './load-app.mjs';
import assert from 'node:assert/strict';
const {CART,CART_POOL,stockFor,stockRound,buy,boughtToday}=await load('core/shop');
const {ITEMS}=await load('core/items');

// ux-spec 5장 the peddler's cart
test('the stock is a few things from the pool, the same all day, different on other days',()=>{
 const a=stockFor('2026-11-10');assert.equal(a.length,CART.stock);assert.deepEqual(stockFor('2026-11-10'),a);
 const days=Array.from({length:10},(_,i)=>'2026-11-'+String(10+i).padStart(2,'0'));
 assert.ok(new Set(days.map(d=>stockFor(d).map(p=>p.item).join())).size>3,'it changes');
 assert.notEqual(stockRound('2026-11-10'),stockRound('2026-11-11'));
 for(const p of CART_POOL){assert.ok(ITEMS[p.item],p.item+' is a known thing');assert.ok(p.price>0)}
});
test('buying takes sunlight, once a day per thing, only what is on the cart',()=>{
 const day='2026-11-10',p=stockFor(day)[0];
 assert.deepEqual(buy(p.price-1,[],p.item,day),{ok:false,why:'price'});
 const r=buy(p.price+2,[],p.item,day,5);assert.equal(r.ok,true);assert.equal(r.sunlight,2);assert.equal(r.gift.sender,'cart');assert.equal(r.gift.item,p.item);
 assert.ok(boughtToday([r.gift],p.item,day));assert.deepEqual(buy(99,[r.gift],p.item,day),{ok:false,why:'sold'});
 const off=CART_POOL.find(x=>!stockFor(day).some(s=>s.item===x.item));assert.deepEqual(buy(99,[],off.item,day),{ok:false,why:'gone'});
});
