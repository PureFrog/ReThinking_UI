export const ASSETS={legacy:{key:'atlas',url:'/assets/garden-atlas.png',frameSize:512,columns:3,count:6},approved:false} as const;
// New atlases are added only after approved reference sheets. Missing textures use shapes.
export function hasAsset(scene:{textures:{exists:(key:string)=>boolean}},key:string){return scene.textures.exists(key)}
