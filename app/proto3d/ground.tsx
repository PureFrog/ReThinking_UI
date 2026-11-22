'use client';
// The ground every 3D piece stands on (shared by Scene3D, World3D, Interior3D): the world is the top of a big sphere, so
// the far side curves away into the fog (a small-planet feel). Its size and the map are in places.ts.
import {useMemo,type ReactNode} from 'react';
import * as THREE from 'three';
import {WORLD} from './places';

const R=WORLD.R;
export const surfaceY=(x:number,z:number)=>Math.sqrt(Math.max(0,R*R-x*x-z*z))-R;
export const normalAt=(x:number,z:number)=>new THREE.Vector3(x,surfaceY(x,z)+R,z).normalize();
export const UP=new THREE.Vector3(0,1,0);
export const tiltAt=(x:number,z:number)=>new THREE.Quaternion().setFromUnitVectors(UP,normalAt(x,z));
export function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// A piece standing on the ground at (x,z), tilted to the sphere.
export function OnGround({x,z,lift=0,rot=0,children}:{x:number;z:number;lift?:number;rot?:number;children:ReactNode}){
  const q=useMemo(()=>tiltAt(x,z).multiply(new THREE.Quaternion().setFromAxisAngle(UP,rot)),[x,z,rot]);
  return <group position={[x,surfaceY(x,z)+lift,z]} quaternion={q}>{children}</group>;
}
