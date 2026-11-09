// Friend registry (ux-spec 13.7-2). Adding a friend = one entry here + its lines in app/dialogue/<id>.json
// (listed in app/content.ts) + its art in public/assets/characters/.
// Saves and events refer to friends by `id`, never by position in this list.
export type Friend={
 id:string;name:string;tag:string;color:string;
 // the gift this friend brings, and whether it is left without a name
 item:string;anonymous:boolean;
 // persona preset in app/personas.ts
 persona:string;
 // where the standing picture comes from: a frame of the old atlas (with its off-centre anchor in the 512 frame),
 // or, for new friends, friend_<id>_idle.png drawn to the 006 rules (centred, feet 18px up)
 atlas?:{frame:number;cx:number;gap:number};
 // gift wrapping: box and ribbon colours (11.8-①)
 wrap:[number,number];
};
export const FRIENDS:Friend[]=[
 {id:'moa',name:'모아',tag:'다정한 편지 친구',color:'#d4927f',item:'위로 사탕',anonymous:false,persona:'gentle',atlas:{frame:0,cx:327,gap:0},wrap:[0xf1e3c6,0xe3a4ad]},
 {id:'tori',name:'토리',tag:'씩씩한 정원 친구',color:'#c49a45',item:'여름 선글라스',anonymous:false,persona:'lively',atlas:{frame:1,cx:241,gap:4},wrap:[0xe6a36a,0x8fae76]},
 {id:'luon',name:'루온',tag:'조용히 챙겨주는 친구',color:'#7f93b5',item:'작은 별 조명',anonymous:true,persona:'quiet',atlas:{frame:2,cx:229,gap:2},wrap:[0xb9c7de,0x7f93b5]},
];
// How many friends can be over at the same time (13.7-4). One number to change.
export const MAX_VISITORS=3;
const byId=new Map(FRIENDS.map(f=>[f.id,f]));
export function friendById(id:string|null|undefined):Friend{return (id&&byId.get(id))||FRIENDS[0]}
export const hasFriend=(id:string)=>byId.has(id);
// The old saves stored friends by list position.
export const LEGACY_FRIEND_IDS=['moa','tori','luon'];
export function friendIdOf(v:unknown):string{return typeof v==='number'?LEGACY_FRIEND_IDS[v]??FRIENDS[0].id:typeof v==='string'&&byId.has(v)?v:FRIENDS[0].id}
// Portrait for panels and the mailbox: the atlas frame, or the friend's own idle picture.
export function portraitStyle(f:Friend):Record<string,string>{return f.atlas?{backgroundPosition:`${f.atlas.frame*50}% 0%`}:{backgroundImage:`url(/assets/characters/friend_${f.id}_idle.png)`,backgroundSize:'contain',backgroundPosition:'center'}}
