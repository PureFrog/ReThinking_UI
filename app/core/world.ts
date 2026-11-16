// The garden's spread (2026-11-16 feedback "맵이 조금 더 넓게, 지금 너무 옹기종기"): every place stands SPREAD times
// farther from the middle than in the first, compact layout, but the things that belong to a place (its door, the
// seat beside it, a tree plot in its field, the rocks round the campfire) keep their distance to it.
// spread(x,z) takes a point of the compact layout: it finds the anchor it belongs to (the nearest one below) and
// moves it with that anchor. Every garden coordinate written in the old layout goes through here once, where it
// is defined (places.ts, land.ts, routine.ts, garden-items.ts, Scene3D, Proto3D).
export const SPREAD=1.4;

// the compact layout's anchors (x,z): the places, the campfire, the signpost, the bridge, the fields and orchards,
// the farm buildings' lots and the landmarks' places
const ANCHORS:[number,number][]=[
  [-5.5,-3]/* home */,[4.6,1]/* farm */,[12.2,1.4]/* orchard */,[1,-16.5]/* library */,[-2,19.6]/* plaza */,
  [-9,1.2]/* observatory */,[-3.6,5.3]/* cart */,[0.5,8]/* pond */,[-1.6,-1.2]/* campfire */,[-1.9,3.5]/* signpost */,
  [-2,13.13]/* bridge */,[4.9,-0.2],[13,0.1],[6,-7],[8.8,8.4]/* fields and orchards */,
  [-6.6,-7.2],[14.6,8.4],[16.6,-6]/* farm buildings */,[-9.5,-12.5],[-16,-5.5],[17.5,-11],[9,-17],[-17.5,6]/* landmarks */,
];

export function anchorOf(x:number,z:number):[number,number]{
  let best=ANCHORS[0],d=Infinity;
  for(const a of ANCHORS){const e=Math.hypot(x-a[0],z-a[1]);if(e<d){d=e;best=a}}
  return best;
}
// a point of the compact layout, moved out with its anchor
export function spread(x:number,z:number):[number,number]{
  const [ax,az]=anchorOf(x,z);
  return [x+(SPREAD-1)*ax,z+(SPREAD-1)*az];
}
export const spreadXZ=<T extends {x:number;z:number}>(p:T):T=>{const [x,z]=spread(p.x,p.z);return {...p,x,z}};
// a point that belongs to a given anchor of the compact layout (when the nearest one is not its owner)
export const moveWith=<T extends {x:number;z:number}>(p:T,ax:number,az:number):T=>({...p,x:p.x+(SPREAD-1)*ax,z:p.z+(SPREAD-1)*az});
