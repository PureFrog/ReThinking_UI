import lines from './dialogue/lines.json';
export function fillTemplate(text:string,vars:Record<string,string>){return text.replace(/\{(\w+)\}/g,(_,key)=>vars[key]??'');}
export function greeting(s:any,id:number){const entries=Object.entries(s.care??{}).filter(([,c]:any)=>c.reason);if(entries.length){const [key,c]=entries.at(-1)! as [string,any];const tree=s.holdings.find((h:any)=>String(h.id)===key);if(tree)return fillTemplate(lines.memory[id],{stock:tree.name,reason:c.reason});}const last=s.dialogueRecent?.[id]??'';return lines.greetings[id].find(t=>t!==last)??lines.greetings[id][0];}
export const treeQuestion=(id:number)=>lines.question[id];
export const treeReply=(id:number)=>lines.reply[id];
export const milestone=(id:number,stage:number)=>lines.milestones[id][Math.max(0,Math.min(3,stage-1))];
