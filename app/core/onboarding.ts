// ux-spec 8장 onboarding, learnt by doing: the player's name, then moa comes straight in and shows the way.
// capture: a capture of the brokerage screen becomes the trees (the seedbox) · water: one tree gets watered, which opens
// its journal (13.7-7) for why it was bought, skippable · bye: moa leaves a candy and goes · done.
// A save from before onboarding existed skips it (store.ts: onboarded).
export type OnboardStep='name'|'capture'|'water'|'bye'|'done';
export const startStep=(s:{onboarded?:boolean;onboard?:string;playerName?:string})=>(s.onboard as OnboardStep)??(s.onboarded?'done':'name');
// what moves it on: a name given, trees in the garden, the first journal closed (written or not)
export function nextStep(step:OnboardStep,f:{name:string;trees:number;journalClosed:boolean}):OnboardStep{
 if(step==='name')return f.name.trim()?'capture':'name';
 if(step==='capture')return f.trees>0?'water':'capture';
 if(step==='water')return f.journalClosed?'bye':'water';
 return step==='bye'?'done':step}
export const NAME_MAX=10;
