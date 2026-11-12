// Where named things in the world are on screen this frame (written by Scene3D's Hooks every frame). The DOM overlay
// reads it to pin bubbles over the analysts; the e2e hooks copy it into window.__proto3d.points.
export const screenPoints=new Map<string,{x:number;y:number;visible:boolean}>();
