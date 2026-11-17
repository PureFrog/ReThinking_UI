// The 꽃집 (feedback B step 2 and 11-17 "상점/꽃집 없음", docs/mockups/garden-b/shop.png direction B): decor flowers
// and trees bought with coins and planted anywhere on open grass. They are not holdings: no signals, no fruit-as-signal,
// they only make the garden mine. Models: public/models/decor (tools/blender/kind_trees.py), swappable in models.ts.
export type FlowerKind='tree'|'flower';
export type ShopPlant={id:string;name:string;kind:FlowerKind;price:number;desc:string;scale:number};
export const FLOWER_SHOP:ShopPlant[]=[
  {id:'cherry',name:'벚나무',kind:'tree',price:25,desc:'꽃잎이 날려요',scale:0.95},
  {id:'magnolia',name:'목련',kind:'tree',price:30,desc:'큰 흰 꽃',scale:0.95},
  {id:'mandarin',name:'귤나무',kind:'tree',price:18,desc:'작고 열매 많음',scale:0.85},
  {id:'lemon',name:'레몬나무',kind:'tree',price:20,desc:'노란 열매',scale:0.85},
  {id:'apple',name:'사과나무',kind:'tree',price:18,desc:'빨간 열매',scale:0.85},
  {id:'tulips',name:'튤립',kind:'flower',price:8,desc:'알록달록 한 무더기',scale:1},
  {id:'sunflowers',name:'해바라기',kind:'flower',price:10,desc:'키 큰 노란 꽃',scale:1},
  {id:'hydrangea',name:'수국',kind:'flower',price:12,desc:'동그란 파란 꽃',scale:1},
];
export const shopPlant=(id:string)=>FLOWER_SHOP.find(p=>p.id===id);
