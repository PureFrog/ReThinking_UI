// Camera framing by screen shape: the frames (look.ts camera.frames) are sorted by aspect (width ÷ height); a screen
// between two of them gets a straight blend, and one outside the range gets the nearest end.
// fov: vertical degrees · dist: camera to the player · turn: radians the camera swings round the player (0 = from the south)
// pitch: radians down from straight overhead · blur: tilt-shift strength (far and near edges)
// lead: how far ahead of the player (away from the camera, on the ground) the camera looks
export type Frame={aspect:number;fov:number;dist:number;turn:number;pitch:number;blur:number;lead:number};
type View=Omit<Frame,'aspect'>;
export function frameFor(frames:Frame[],aspect:number):View{
  const f=[...frames].sort((a,b)=>a.aspect-b.aspect);
  const pick=({aspect:_,...v}:Frame):View=>v;
  if(!f.length)return {fov:46,dist:23.5,turn:0,pitch:0.54,blur:0.17,lead:0};
  if(!(aspect>f[0].aspect))return pick(f[0]);
  const last=f[f.length-1];if(aspect>=last.aspect)return pick(last);
  const i=f.findIndex(x=>x.aspect>aspect),a=f[i-1],b=f[i],t=(aspect-a.aspect)/(b.aspect-a.aspect);
  const mix=(k:keyof View)=>a[k]+(b[k]-a[k])*t;
  return {fov:mix('fov'),dist:mix('dist'),turn:mix('turn'),pitch:mix('pitch'),blur:mix('blur'),lead:mix('lead')};
}