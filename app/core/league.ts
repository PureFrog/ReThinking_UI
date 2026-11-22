// redesign 4-3 the weekly league: ranked by judgment score, never by returns. A week runs Monday to Sunday; points are
// grades revealed that week (app/core/judgment.ts) plus today's-case points. The server (R5) holds everyone's rows;
// until then app/proto3d/server.ts serves a local mock.
import type {Graded} from './judgment';
import type {CaseAnswer} from './cases';
export const TIERS=[{id:'rookie',label:'루키',min:0},{id:'analyst',label:'애널리스트',min:40},{id:'senior',label:'시니어',min:90},{id:'head',label:'헤드',min:160}] as const;
export type Tier=typeof TIERS[number]['id'];
export const LEAGUE={promote:3/* top this many of a group go up a tier */,size:12/* players per group */};
const at=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
export function weekOf(day:string){const d=at(day);const back=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-back);return d.toISOString().slice(0,10)}
// work: this week's 지기 process points (core/jigi/points.ts weekWork); old grades keep counting while they come in
export function weekPoints(graded:Graded[],cases:CaseAnswer[],day:string,work=0){
  const w=weekOf(day);
  return work+graded.filter(g=>weekOf(g.day)===w).reduce((s,g)=>s+g.points,0)+cases.filter(c=>weekOf(c.day)===w).reduce((s,c)=>s+c.points,0);
}
// a total below zero (sure calls that missed) is still the first tier
export const tierOf=(total:number):Tier=>([...TIERS].reverse().find(t=>total>=t.min)??TIERS[0]).id;
export type Row={id:string;name:string;points:number;me?:boolean};
export function ranked(rows:Row[]){return [...rows].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name)).map((r,i)=>({...r,rank:i+1,promote:i<LEAGUE.promote}))}
