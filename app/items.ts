import type {GiftBox,Decoration} from './model';
export type ItemKind='clothes'|'furniture'|'consumable';
export type Slot='hat'|'face'|'neck'|'hand';
export type Slots=Record<Slot,string|null>;
// id doubles as the art file name once GPT art lands (assets.ts ITEM_IMAGES).
export type ItemDef={id:string;kind:ItemKind;slot?:Slot;desc:string;note?:string;starter?:boolean};
export const ITEMS:Record<string,ItemDef>={
 '위로 사탕':{id:'candy',kind:'consumable',desc:'달콤한 한 알. 먹으면 그날 하루 마음이 은은하게 밝아.',note:'마음이 쓰이는 날엔 달콤한 한 알. 네 속도로 가도 괜찮아.'},
 '여름 선글라스':{id:'sunglasses',kind:'clothes',slot:'face',desc:'햇살 쨍한 날 쓰는 동그란 선글라스.',note:'햇빛이 쨍하네! 이거 쓰고 정원 한 바퀴 돌자!'},
 '작은 별 조명':{id:'star_lamp',kind:'furniture',desc:'밤이 되면 작은 별처럼 반짝이는 스탠드.',note:'…밤에 어두우면 켜.'},
 '포근한 담요':{id:'blanket',kind:'furniture',desc:'소파 옆에 두면 집이 한결 포근해지는 담요.',note:'그냥… 필요할 것 같아서.'},
 '산책 목도리':{id:'scarf',kind:'clothes',slot:'neck',desc:'산책할 때 두르는 살구색 목도리.',starter:true},
 // 12.5 milestones, brought by a visiting friend
 '첫 일지 액자':{id:'journal_frame',kind:'furniture',desc:'처음 쓴 일지를 기념하는 작은 액자.',note:'첫 일지 썼더라. 걸어 두면 좋겠어서.'},
 '작은 독서 의자':{id:'reading_chair',kind:'furniture',desc:'일지를 열 번 쓴 사람에게 어울리는 폭신한 의자.',note:'여기 앉아서 천천히 써.'},
 '금박 책받침':{id:'gold_bookend',kind:'furniture',desc:'금박 책 세 권을 지켜 주는 책받침.',note:'책장이 반짝반짝하네!'},
 '꽃 장식':{id:'flower_pin',kind:'clothes',slot:'hat',desc:'모자에 꽂는 분홍 꽃 장식.',starter:true},
};
export const SLOT_LABEL:Record<Slot,string>={hat:'모자',face:'얼굴',neck:'목',hand:'손'};
export const SLOTS:Slot[]=['hat','face','neck','hand'];
export const KIND_LABEL:Record<ItemKind,string>={clothes:'옷',furniture:'가구',consumable:'소모품'};
export const furnitureId=(gifts:GiftBox[],g:GiftBox)=>100+gifts.indexOf(g);

export type Entry={name:string;def:ItemDef;gifts:GiftBox[];count:number;fresh:boolean;placed:boolean};
// One cell per item name in the drawer; used consumables leave, starter clothes are always there (11.8-③).
export function inventoryEntries(gifts:GiftBox[],claimed:string[],used:string[],decor:Decoration[],fresh:string[]=[]):Entry[]{
 const groups=new Map<string,GiftBox[]>();
 for(const g of gifts){if(!claimed.includes(g.id)||used.includes(g.id)||!ITEMS[g.item])continue;groups.set(g.item,[...(groups.get(g.item)??[]),g])}
 const entries:Entry[]=Array.from(groups).map(([name,gs])=>({name,def:ITEMS[name],gifts:gs,count:gs.length,fresh:gs.some(g=>fresh.includes(g.id)),placed:ITEMS[name].kind==='furniture'&&gs.every(g=>decor.some(d=>d.id===furnitureId(gifts,g)))}));
 for(const [name,def] of Object.entries(ITEMS))if(def.starter)entries.push({name,def,gifts:[],count:1,fresh:false,placed:false});
 return entries;
}
// Wearing an item replaces whatever was in that slot; wearing it again takes it off (11.8-④).
export function toggleWear(slots:Slots,name:string):Slots{const slot=ITEMS[name]?.slot;if(!slot)return slots;return {...slots,[slot]:slots[slot]===name?null:name}}
export const sameSlots=(a:Slots,b:Slots)=>SLOTS.every(s=>(a[s]??null)===(b[s]??null));
export function isoDay(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
// 11.14: '10월 27일', year only when it differs from today.
export function formatDay(iso:string,today=isoDay()){const [y,m,d]=iso.split('-').map(Number);if(!y||!m||!d)return '';return (String(y)!==today.slice(0,4)?y+'년 ':'')+m+'월 '+d+'일'}
