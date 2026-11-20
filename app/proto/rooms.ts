// The phone prototype (/app): each space is one fixed picture with a few places on it, all in percent of the picture.
// To restyle a space (a new pastel room, say), swap `bg` and move the percentages; nothing else changes.
// The living room (2026-11-11 feedback) is put together from the game's own house art (house9/): the first-floor shell
// with the kitchen end and the stairs taken out; sofa, lamp, rug and table are drawn into it (desk and plant taken out).
// The farm picture keeps only the fenced field, cut out as an island (the shed, well, house around it are gone). The bookcase and the wall calendar sit on top (they change).
export type RoomId='living'|'farm';
// box: [left, top, width, height] in % of the picture
export type Door={to:RoomId;box:[number,number,number,number];label:string};
// fit: 'width' sizes the picture by the screen's width, times zoom (over 1 it scrolls sideways, opening at FOCUS);
// 'height' fills the screen's height and scrolls sideways
export type Room={id:RoomId;name:string;bg:string;aspect:number;fit:'width'|'height';zoom:number;door:Door};
export const ROOMS:Record<RoomId,Room>={
 living:{id:'living',name:'거실',bg:'/assets/proto/room_living.webp?v=4',aspect:1543/1255,fit:'width',zoom:1.35,
  door:{to:'farm',box:[24,64,16,28],label:'밖으로 나가기'}},
 farm:{id:'farm',name:'농장',bg:'/assets/proto/room_farm.webp?v=3',aspect:1792/1042,fit:'width',zoom:1.6,
  door:{to:'living',box:[50,0,19,12],label:'집으로 들어가기'}},
};
// living room: the empty bookcase (512px picture box) that fills one book per journal page
export const BOOKSHELF={box:[44.52,17.61,33.18,40.8] as [number,number,number,number]};
// Books on the shelf, in the order they come, one per journal page: [shelf 0–2, left, right edge in % of the 512 picture].
// A lying stack counts as one. 28 fit; past that the shelf stays full and the count keeps going.
const cut=(bx:number)=>Math.round((130+bx/4)/512*10000)/100;
const row=(sh:number,edges:number[])=>edges.slice(1).map((e,i)=>[sh,cut(edges[i]),cut(e)] as [number,number,number]);
export const SHELF_BOOKS:[number,number,number][]=[
 ...row(0,[90,335,380,440,490,535,600,665,722,760]),
 ...row(1,[90,205,245,305,370,435,485,520,588,760]),
 ...row(2,[80,160,220,275,325,385,425,475,540,605,680,725,760]),
];
// the wall calendar: a box on the back wall (left foot point, width, height in %), skewed to lie on the wall
export const CALENDAR={left:70.03,top:20.42,w:22.3,h:27.89,skew:26.57};
// the sofa: where a visiting friend sits (bottom centre of the friend picture) and how wide it is drawn
export const SOFA={x:44.6,y:47.5,w:24};
// farm: the centre of each of the 12 plots (plot i of a holding), and how big one game pixel is on this picture
export const PLOTS:[number,number][]=[[59.59,21.93],[72.75,33.25],[85.92,44.57],[46.43,33.25],[59.59,44.57],[72.75,55.89],[33.26,44.57],[46.43,55.89],[59.59,67.21],[20.1,55.89],[33.26,67.21],[46.43,78.53]];
export const FARM_PX={x:.102,y:.1755};
// the farm is shown at its full field size, so the trees are drawn this much bigger than the game's (around their foot)
export const FARM_TREE_SCALE=1.2;
// where a sideways-scrolling room opens (% of the picture's width)
export const FOCUS:Record<RoomId,number>={living:56,farm:55};
