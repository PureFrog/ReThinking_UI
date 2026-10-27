import {TIMING} from './timing';
export type InteractionMode='free'|'dialogue'|'panel'|'target'|'decorate'|'cinematic';
export function resolveMode(s:{panel?:boolean;talk?:boolean;decorating?:boolean;target?:boolean;cinematic?:boolean}):InteractionMode{return s.cinematic?'cinematic':s.panel?'panel':s.talk?'dialogue':s.decorating?'decorate':s.target?'target':'free'}
export class WorldQueue {
 items:{kind:string;at:number;run:()=>void}[]=[];
 enqueue(kind:string,run:()=>void,now=Date.now()){if(kind==='ambient')this.items=this.items.filter(i=>i.kind!==kind);this.items.push({kind,run,at:now})}
 take(now=Date.now()){this.items=this.items.filter(i=>i.kind!=='ambient'||now-i.at<=TIMING.queueExpiry);return this.items.shift()}
 clear(){this.items=[]}
}
