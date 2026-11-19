// The phone prototype (/app): each space is one fixed picture with a few places on it, all in percent of the picture.
// To restyle a space (a new pastel room, say), swap `bg` and move the percentages; nothing else changes.
// Today's pictures are cut from the game's own render (public/assets/proto/), nothing redrawn.
export type RoomId='living'|'farm';
// box: [left, top, width, height] in % of the picture
export type Door={to:RoomId;box:[number,number,number,number];label:string;ask:string};
export type Room={id:RoomId;name:string;bg:string;aspect:number;door:Door};
export const ROOMS:Record<RoomId,Room>={
 living:{id:'living',name:'거실',bg:'/assets/proto/room_living.webp',aspect:1060/960,
  door:{to:'farm',box:[35,84,13,15],label:'밖으로',ask:'밖으로 나갈까?'}},
 farm:{id:'farm',name:'농장',bg:'/assets/proto/room_farm.webp',aspect:1792/1042,
  door:{to:'living',box:[52,0,15,7],label:'집으로',ask:'집으로 들어갈까?'}},
};
// living room: the bookshelf (its book count), the sofa where a visiting friend sits
export const BOOKSHELF={x:86.5,y:36};
export const SOFA={x:57,y:51,w:20};
// farm: the centre of each of the 12 plots (plot i of a holding), and how big one game pixel is on this picture
export const PLOTS:[number,number][]=[[59.59,21.93],[72.75,33.25],[85.92,44.57],[46.43,33.25],[59.59,44.57],[72.75,55.89],[33.26,44.57],[46.43,55.89],[59.59,67.21],[20.1,55.89],[33.26,67.21],[46.43,78.53]];
export const FARM_PX={x:.102,y:.1755};
// where each room opens when it is wider than the screen (% of the picture's width)
export const FOCUS:Record<RoomId,number>={living:66,farm:55};
