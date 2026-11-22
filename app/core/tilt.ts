// W6 기울이면 시차 (docs/brief-wow.md): tilting the phone moves the camera a little, as if looking into a diorama.
// From the device's angles (DeviceOrientation beta: front-back, gamma: left-right, degrees) to an offset of -1..1 on
// each axis, measured from how the phone was held when it started (rest), with a small dead zone so a still hand does
// not wobble the garden. How far -1..1 moves the camera is LOOK.tilt in look.ts.
export const TILT={range:22/* degrees from rest for the full offset */,dead:1.5/* degrees ignored */};
const clamp=(v:number)=>Math.max(-1,Math.min(1,v));
const soft=(d:number)=>Math.abs(d)<TILT.dead?0:clamp((d-Math.sign(d)*TILT.dead)/(TILT.range-TILT.dead));
export function tiltOffset(beta:number|null,gamma:number|null,rest:{beta:number;gamma:number}):{x:number;y:number}{
  if(beta===null||gamma===null)return {x:0,y:0};
  return {x:soft(gamma-rest.gamma),y:soft(beta-rest.beta)};
}
