// ux-spec 2장 the care axis, a tree's 'vitality': only the player's own care raises it (journal pages, right news
// answers, retrospectives), and it fades as days pass. No journal for `offDays` (30 by default, set in the journal
// book) switches it off. It never depends on the return: a rotting tree that is looked after still flowers.
import type {Care,JournalEntry} from './care';
import {daysBetween,type Retro} from './retro';

export type Vitality=0|1|2|3;
export const VITALITY_NAMES=['쉬는 중','조용함','생기 있음','생기 가득'] as const;
// care days counted back from today
export const VITALITY_WINDOW=14;

export function careDays(id:number,care:Care,journal:JournalEntry[],retros:Retro[]){
 const days=new Set([...journal.filter(e=>e.holdingId===id).map(e=>e.day),...retros.filter(r=>r.holdingId===id).map(r=>r.day)]);
 const fed=care[id]?.feed;if(fed)days.add(fed);return Array.from(days).sort()}

// 0 off · 1 one care day in the window · 2 two or three · 3 four or more
export function vitalityOf(id:number,care:Care,journal:JournalEntry[],retros:Retro[],today:string,offDays:number):Vitality{
 const last=journal.filter(e=>e.holdingId===id).map(e=>e.day).sort().pop();
 if(!last||daysBetween(last,today)>offDays)return 0;
 const recent=careDays(id,care,journal,retros).filter(d=>{const n=daysBetween(d,today);return n>=0&&n<VITALITY_WINDOW}).length;
 return recent>=4?3:recent>=2?2:1}

// The promise ribbon: the newest reason ('내 생각') written for the tree, first line.
export function promiseOf(id:number,journal:JournalEntry[]){
 const e=journal.filter(e=>e.holdingId===id&&e.think.trim()).sort((a,b)=>a.day.localeCompare(b.day)).pop();
 return e?{text:e.think.trim().split('\n')[0],day:e.day}:null}
