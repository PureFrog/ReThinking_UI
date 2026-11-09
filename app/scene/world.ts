// Shared world helpers: the event bus between the scene and React, and the iso grid.
import {cue,EVENT_SLOTS} from '../sound';
import type * as Phaser from 'phaser';
import type {Pose} from '../visitor-tasks';
import {insideHouse} from './layout';
export const bus=new EventTarget();
// a bus event that is also a sound slot (docs/sound-map.md) cues it
export const emit=(type:string,detail?:any)=>{const slot=EVENT_SLOTS[type];if(slot)cue(slot);return bus.dispatchEvent(new CustomEvent(type,{detail}))};
export const iso=(x:number,y:number)=>({x:700+(x-y)*43,y:235+(x+y)*21.5});
export const inverse=(x:number,y:number)=>({x:Math.round(((x-700)/43+(y-235)/21.5)/2),y:Math.round(((y-235)/21.5-(x-700)/43)/2)});
// cells inside the house sit on its raised floor
export const pos=(x:number,y:number)=>{const p=iso(x,y);return {x:p.x,y:p.y-(insideHouse(x,y)?15:0)}};
export type Cell={x:number;y:number};
export type Actor={node:Phaser.GameObjects.Container;cell:Cell;walking:boolean;token:number;body?:Phaser.GameObjects.Container;legs?:Phaser.GameObjects.Ellipse[];base?:number;pose?:Pose;face?:number;back?:boolean;tex?:string};
