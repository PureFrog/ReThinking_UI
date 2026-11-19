// The pond's fish (feedback 11-17, docs/mockups/otter-fishing.html): twelve for the log, by how rare. Sizes in cm.
// weight: how often it bites among its rarity. Pure fun, nothing to do with investing.
export type Rarity='보통'|'희귀'|'전설';
export type Fish={id:string;name:string;rarity:Rarity;min:number;max:number;color:string;weight:number};
export const FISH:Fish[]=[
  {id:'pirami',name:'피라미',rarity:'보통',min:6,max:14,color:'#9aa7a0',weight:5},
  {id:'bungeo',name:'붕어',rarity:'보통',min:10,max:28,color:'#7a8a5a',weight:5},
  {id:'songsari',name:'송사리',rarity:'보통',min:2,max:5,color:'#b8c4a6',weight:4},
  {id:'mugu',name:'모래무지',rarity:'보통',min:8,max:20,color:'#c9b48a',weight:3},
  {id:'ingeo',name:'잉어',rarity:'보통',min:20,max:60,color:'#c99a5a',weight:3},
  {id:'megi',name:'메기',rarity:'보통',min:20,max:55,color:'#5c5a52',weight:2},
  {id:'geumbungeo',name:'금붕어',rarity:'희귀',min:8,max:22,color:'#f08a3c',weight:3},
  {id:'songeo',name:'무지개송어',rarity:'희귀',min:20,max:45,color:'#d97a8a',weight:2},
  {id:'jangeo',name:'민물장어',rarity:'희귀',min:30,max:70,color:'#4d5a3a',weight:2},
  {id:'gamulchi',name:'가물치',rarity:'희귀',min:30,max:80,color:'#3c4a3a',weight:1},
  {id:'goldkoi',name:'황금잉어',rarity:'전설',min:40,max:90,color:'#e7b53c',weight:1},
  {id:'sturgeon',name:'철갑상어',rarity:'전설',min:60,max:120,color:'#6a7a88',weight:1},
];
export const fishById=(id:string)=>FISH.find(f=>f.id===id);
