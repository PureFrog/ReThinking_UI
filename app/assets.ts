export const ASSETS={legacy:{key:'atlas',url:'/assets/garden-atlas.png',frameSize:512,columns:3,count:6},furniture:{key:'storybook-furniture',url:'/assets/storybook-furniture-v1.png'},approved:false} as const;
// New atlases are added only after approved reference sheets. Missing textures use shapes.
export function hasAsset(scene:{textures:{exists:(key:string)=>boolean}},key:string){return scene.textures.exists(key)}

// Measured alpha bounds in the generated atlas; keep sprite proportions and ground anchors.
export const FURNITURE_FRAMES={sofa:[85,116,589,499],drawer:[734,163,425,463],bookcase:[130,665,447,506],desk:[692,776,491,352]} as const;
