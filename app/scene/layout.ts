// The map (ux-spec 13.7-5/6). Floor 1: living room + kitchen, with the farm in front.
// Floor 2: bedroom + study, laid out in its own corner of the grid and reached only by the stairs,
// so routes, depth and the camera work the same on every floor (far enough apart that one never shows beside another). Floor 3: the attic (12.5, five retrospectives),
// up a ladder from the study wall.
export type Rect={x0:number;y0:number;x1:number;y1:number};
export type Floor=1|2|3;
export type Room=Rect&{id:string;name:string;floor:Floor;floorColor:number;tileColor:number;walls:[number,number]};
const within=(r:Rect,x:number,y:number)=>x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1;
// walkable ground of each floor
export const GROUND:Record<Floor,Rect>={1:{x0:0,y0:0,x1:25,y1:25},2:{x0:40,y0:0,x1:54,y1:7},3:{x0:80,y0:0,x1:87,y1:5}};
export const HOUSE:Record<Floor,Rect>={1:{x0:0,y0:0,x1:14,y1:7},2:{x0:40,y0:0,x1:54,y1:7},3:{x0:80,y0:0,x1:87,y1:5}};
export const ROOMS:Room[]=[
 {id:'living',name:'거실',floor:1,x0:0,y0:0,x1:8,y1:7,floorColor:0xd6c2a3,tileColor:0xbda888,walls:[0xebe0c9,0xf7edda]},
 {id:'kitchen',name:'부엌',floor:1,x0:9,y0:0,x1:14,y1:7,floorColor:0xe4d6bd,tileColor:0xcab995,walls:[0xe9e2cf,0xf4ecdc]},
 {id:'bedroom',name:'침실',floor:2,x0:40,y0:0,x1:47,y1:7,floorColor:0xd9c4b0,tileColor:0xc2ab95,walls:[0xeadfd4,0xf5ebe2]},
 {id:'study',name:'서재',floor:2,x0:48,y0:0,x1:54,y1:7,floorColor:0xcdb796,tileColor:0xb59f7d,walls:[0xe3dcc8,0xefe8d6]},
 {id:'attic',name:'다락방',floor:3,x0:80,y0:0,x1:87,y1:5,floorColor:0xd6c2a3,tileColor:0xbda888,walls:[0xf1dfc4,0xf7ead6]},
];
export const floorOf=(c:{x:number;y:number}):Floor=>c.x>=GROUND[3].x0?3:c.x>=GROUND[2].x0?2:1;
export const roomAt=(c:{x:number;y:number})=>ROOMS.find(r=>within(r,c.x,c.y));
export const insideHouse=(x:number,y:number)=>within(HOUSE[1],x,y)||within(HOUSE[2],x,y)||within(HOUSE[3],x,y);
export const walkable=(x:number,y:number)=>within(GROUND[1],x,y)||within(GROUND[2],x,y)||within(GROUND[3],x,y);
export function groundCells(floor:Floor){const r=GROUND[floor];const out:{x:number;y:number}[]=[];for(let x=r.x0;x<=r.x1;x++)for(let y=r.y0;y<=r.y1;y++)out.push({x,y});return out}
// Both floors are open plan (GPT 009): the kitchen opens onto the living room, the bedroom onto the study.
export const PARTITIONS:{x:number;y0:number;y1:number;door:[number,number]}[]=[];
// The stairs (015 picture, moved one cell back so the first step stands clear of the low front wall, and half a cell
// off the left wall so it stands on the floor) stand by the left wall on (0,2)–(0,5), climbing toward the back from the foot at (0,6). Upstairs the opening (015) is on
// (40,3)–(40,6); the top standing cell is beside its back end, not behind its rail post (part of the floor picture).
export const STAIRS:Record<1|2,{x:number;y:number}>={1:{x:0,y:6},2:{x:41,y:2}};
// The attic ladder (017) leans on the study's back wall at LADDER; it opens through the hatch in the attic floor.
// Standing cells: in front of the ladder upstairs, beside the hatch in the attic.
export const LADDER={x:47,y:0},HATCH={x:80,y:4};
export const ATTIC_LINK:Record<2|3,{x:number;y:number}>={2:{x:47,y:1},3:{x:81,y:4}};
// Where to stand on `from` to go to the next floor toward `to`, and which floor that is (the attic is above floor 2).
export function nextFloor(from:Floor,to:Floor):Floor{return from===2?to:2}
export function exitTo(from:Floor,to:Floor){return from===1?STAIRS[1]:from===3?ATTIC_LINK[3]:to===1?STAIRS[2]:ATTIC_LINK[2]}
// height of the stairs' top landing above the floor, game px (from the stairs picture)
export const TOP_STEP=190;
export const STAIR_CELLS:Record<1|2,{x:number;y0:number;y1:number}>={1:{x:0,y0:2,y1:5},2:{x:40,y0:3,y1:6}};
// The house is closed on all four sides. Walls stand on cell edges: the back walls behind row/column 0,
// the front walls just past x1 and y1. The front door is in the wall facing the yard (inside cell → outside cell).
export const WALL_H=230,WALL_LOW=24;
export const FRONT_DOOR={inside:{x:5,y:7},outside:{x:5,y:8}};
const edgeKey=(a:{x:number;y:number},b:{x:number;y:number})=>a.x<b.x||a.x===b.x&&a.y<b.y?`${a.x},${a.y}|${b.x},${b.y}`:`${b.x},${b.y}|${a.x},${a.y}`;
export const WALL_EDGES=(()=>{const out=new Set<string>();const h=HOUSE[1];
 for(let x=h.x0;x<=h.x1;x++)if(x!==FRONT_DOOR.inside.x)out.add(edgeKey({x,y:h.y1},{x,y:h.y1+1}));
 for(let y=h.y0;y<=h.y1;y++)out.add(edgeKey({x:h.x1,y},{x:h.x1+1,y}));return out})();
// Whether a step between two neighbouring cells goes through a wall.
export const throughWall=(a:{x:number;y:number},b:{x:number;y:number})=>WALL_EDGES.has(edgeKey(a,b));
// Farm: 12 plots in three columns (index order matches the saved plot numbers 0–5 of the old 6-plot yard),
// and land still to be opened (12.5 '정원 구역 확장').
export const PLOT_COUNT=12;
export const LOCKED_LAND:Rect={x0:18,y0:11,x1:24,y1:22};
// 12.5 four weekly goals open the land east of the fence: two more plots at its north end, the rest left to decorate
export const EXTRA_PLOTS=[{x:20,y:14},{x:23,y:14}];
export const plotCount=(landOpen:boolean)=>PLOT_COUNT+(landOpen?EXTRA_PLOTS.length:0);
export const plotCell=(i:number)=>i<PLOT_COUNT?{x:9+(i%3)*3,y:11+Math.floor(i/3)*3}:EXTRA_PLOTS[i-PLOT_COUNT];
export const inLockedLand=(x:number,y:number)=>x>=LOCKED_LAND.x0&&x<=LOCKED_LAND.x1&&y>=LOCKED_LAND.y0&&y<=LOCKED_LAND.y1;
export const FARM_FENCE:Rect={x0:7,y0:9.6,x1:16.6,y1:22.4};
export const FLOWER_PATCHES:[number,number][]=[[3.4,8.7]/* by the front wall, clear of the seed box */,[2,12],[17,9],[0.4,9],[12,8.6],[21,24],[5,23]];
// House art (GPT 009): each floor is drawn on a 2100×2048 canvas at twice game scale whose floor's back corner sits
// at CANVAS_ORIGIN. Furniture comes as 512px pictures placed at draw (canvas px, top-left); x is the cell the piece
// starts on (upstairs +40), w×d the cells it covers; flip mirrors a picture drawn facing the wrong way. hit is the picture's box around its footprint's front corner (game px).
export const CANVAS_ORIGIN={x:749,y:1000},CANVAS_SIZE={w:2100,h:2048};
// The front_cut walls are drawn a little steeper than the floor (the left one most), so the floor picture's grey slab
// edge showed below them and the walls looked lifted off the yard. The floor (and the stairs under it) is cut off along
// each wall's foot instead, a straight line fitted to the wall picture's bottom edge (canvas px, y = k·x + b), so the
// walls stay as drawn and stand straight on the grass.
export const WALL_FOOT:Record<1|2,{left:[number,number];right:[number,number]}>={
 1:{left:[.5338,1270.5],right:[-.5082,2669.2]},
 2:{left:[.5088,1303.6],right:[-.5205,2688.3]},
};
export type HousePiece={art:string;floor:Floor;x:number;y:number;w:number;d:number;blocks:boolean;draw:[number,number];hit:[number,number,number,number];flip?:boolean};
export const HOUSE_PLAN:HousePiece[]=[
 {art:'living_sofa',floor:1,x:0,y:0,w:1,d:2,blocks:true,draw:[450,635],hit:[0,-52,122,105]},
 {art:'living_journal_table',floor:1,x:2,y:2,w:1,d:1,blocks:true,draw:[493,764],hit:[0,-29,81,58]},
 {art:'living_bookshelf',floor:1,x:3,y:0,w:2,d:1,blocks:true,draw:[794,764],hit:[0,-81,122,162]},
 {art:'living_drawer',floor:1,x:6,y:0,w:2,d:1,blocks:true,draw:[1052,893],hit:[0,-63,122,126]},
 {art:'living_lamp',floor:1,x:1,y:3,w:1,d:1,blocks:true,draw:[321,764],hit:[0,-80,62,160]},
 {art:'living_plant',floor:1,x:8,y:0,w:1,d:1,blocks:true,draw:[1181,936],hit:[0,-48,86,95]},
 {art:'living_rug',floor:1,x:1,y:1,w:2,d:2,blocks:false,draw:[493,764],hit:[0,-30,118,60]},
 {art:'kitchen_sink',floor:1,x:11,y:0,w:2,d:1,blocks:true,draw:[1482,1108],hit:[0,-57,122,114]},
 {art:'kitchen_stove',floor:1,x:10,y:0,w:1,d:1,blocks:true,draw:[1353,1022],hit:[0,-46,81,92]},
 {art:'kitchen_fridge',floor:1,x:13,y:0,w:1,d:1,blocks:true,draw:[1611,1151],hit:[0,-98,81,194],flip:true/* drawn with its doors to the right wall */},
 {art:'kitchen_corner',floor:1,x:9,y:0,w:1,d:1,blocks:true,draw:[1267,979],hit:[0,-46,81,92]},
 {art:'kitchen_island',floor:1,x:9,y:1,w:1,d:2,blocks:true,draw:[1138,1065],hit:[0,-57,122,114]},
 {art:'kitchen_table',floor:1,x:12,y:4,w:2,d:1,blocks:true,draw:[1224,1323],hit:[0,-47,122,93]},
 {art:'kitchen_chair_a',floor:1,x:12,y:3,w:1,d:1,blocks:true,draw:[1267,1237],hit:[0,-60,81,120]},
 {art:'kitchen_chair_b',floor:1,x:12,y:5,w:1,d:1,blocks:true,draw:[1095,1323],hit:[0,-50,81,100]},
 {art:'kitchen_mat',floor:1,x:12,y:4,w:2,d:1,blocks:false,draw:[1224,1323],hit:[0,-22,89,44]},
 {art:'bedroom_bed',floor:2,x:40,y:0,w:2,d:2,blocks:true,draw:[493,678],hit:[0,-77,162,154]},
 {art:'bedroom_wardrobe',floor:2,x:45,y:0,w:2,d:1,blocks:true,draw:[966,850],hit:[0,-90,122,179]},
 {art:'bedroom_nightstand',floor:2,x:43,y:0,w:1,d:1,blocks:true,draw:[751,721],hit:[0,-64,81,128]},
 {art:'bedroom_rug',floor:2,x:42,y:3,w:2,d:2,blocks:false,draw:[407,893],hit:[0,-30,118,60]},
 {art:'study_bookshelf',floor:2,x:48,y:0,w:2,d:1,blocks:true,draw:[1224,979],hit:[0,-81,122,162]},
 {art:'study_desk',floor:2,x:51,y:0,w:2,d:1,blocks:true,draw:[1482,1108],hit:[0,-54,122,107]},
 {art:'study_chair',floor:2,x:51,y:1,w:1,d:1,blocks:true,draw:[1353,1108],hit:[0,-50,81,100]},
 {art:'study_armchair',floor:2,x:53,y:3,w:1,d:1,blocks:true,draw:[1353,1280],hit:[0,-46,81,91]},
];
// where you stand to write in the journal (in front of the living room table)
export const JOURNAL_SPOT={x:3,y:2};
export const pieceCells=(p:HousePiece)=>{const out:string[]=[];for(let x=p.x;x<p.x+p.w;x++)for(let y=p.y;y<p.y+p.d;y++)out.push(`${x},${y}`);return out};
// Things on the map that block a cell: the house furniture, the stairs (and the opening above them), the garden props.
export const BLOCKED_CELLS:string[]=[
 ...HOUSE_PLAN.filter(p=>p.blocks).flatMap(pieceCells),
 ...([1,2] as const).flatMap(f=>{const s=STAIR_CELLS[f];const out:string[]=[];for(let y=s.y0;y<=s.y1;y++)out.push(`${s.x},${y}`);return out}),
 // the stairs picture sits half a cell into the room, over half of the cells beside it (the lamp has (1,3))
 '1,2','1,4','1,5',
 // the attic ladder and the hatch it comes up through
 `${LADDER.x},${LADDER.y}`,`${HATCH.x},${HATCH.y}`,
 // garden: mailbox, seed box, shovel, well, shed, fertilizer, compost, cart, scarecrow
 '5,10','2,10','3,10','5,14','1,15','2,15','1,16','2,16','3,15','3,19','6,19','13,24',
];
// The farm fence keeps people out of the rows except through the gate at the north-west corner (8,10):
// each fence line blocks the row of cells nearest to it.
export const FENCE_CELLS:string[]=(()=>{const out:string[]=[];const f=FARM_FENCE;const n=Math.round(f.y0+.4),s=Math.round(f.y1-.4),w=Math.round(f.x0),e=Math.round(f.x1+.4);
 for(let x=w;x<=e;x++){if(x!==w+1)out.push(`${x},${n}`);out.push(`${x},${s}`)}for(let y=n+1;y<s;y++)out.push(`${w},${y}`,`${e},${y}`);return out})();
export const FARM_GATE={x:Math.round(FARM_FENCE.x0)+1,y:Math.round(FARM_FENCE.y0+.4)};
// Draw order of furniture standing on x0..x1 × y0..y1: just behind the nearest cell in front of it, so a person
// in front of any part of a long piece draws over it and one behind it draws under (a person's depth is its pos().y).
export function footDepth(x0:number,y0:number,x1:number,y1:number){const s=Math.min(x0+y1+1,x1+1+y0)-.5;return 235+s*21.5-(insideHouse(x0,y0)?15:0)}
