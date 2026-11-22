// ux-spec 8장 접근성·편의: how big the words are (three steps) and how fast lines type (slow, normal, at once).
// Saved with the settings; the page sets them here and on <html data-text-size>, the CSS scales bubbles and panels.
export type TextSize='small'|'normal'|'large';
export type TypeSpeed='slow'|'normal'|'instant';
export const TEXT_SIZES:{id:TextSize;label:string}[]=[{id:'small',label:'작게'},{id:'normal',label:'보통'},{id:'large',label:'크게'}];
// multiplier on the typing pauses (TIMING.typeChar…); 0 shows the whole line at once
export const TYPE_SPEEDS:{id:TypeSpeed;label:string;scale:number}[]=[{id:'slow',label:'느리게',scale:1.7},{id:'normal',label:'보통',scale:1},{id:'instant',label:'바로',scale:0}];
let scale=1;
export function setTypeSpeed(s:TypeSpeed|undefined){scale=TYPE_SPEEDS.find(t=>t.id===s)?.scale??1}
export const typeScale=()=>scale;
