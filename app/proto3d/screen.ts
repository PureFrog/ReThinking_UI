// Where named things in the world are on screen this frame (written by Scene3D's Hooks every frame). The DOM overlay
// reads it to pin bubbles over the analysts; the e2e hooks copy it into window.__proto3d.points.
// W4: a picture of the garden as it is now, for the share card (set by Scene3D Hooks; null before the scene is up)
// W6: how far the phone is tilted (-1..1 each way, core/tilt.ts), written by Proto3D, read by the camera
export const tilt={x:0,y:0};
export const snapshot:{take:null|(()=>string)}={take:null};
export const screenPoints=new Map<string,{x:number;y:number;visible:boolean}>();
