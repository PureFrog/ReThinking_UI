'use client';
// a look-from-here camera for screenshots and reviews (tests/e2e): window.__peek=[x,y,z,lx,ly,lz] holds the camera there,
// after everything else has moved it; window.__peek=null lets go. Does nothing unless set.
import {useFrame} from '@react-three/fiber';
export function Peek(){
  useFrame(({camera})=>{const p=(window as unknown as {__peek?:number[]|null}).__peek;if(!p)return;camera.position.set(p[0],p[1],p[2]);camera.lookAt(p[3],p[4],p[5])});
  return null;
}
