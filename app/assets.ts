export const ASSETS={legacy:{key:'atlas',url:'/assets/garden-atlas.png',frameSize:512,columns:3,count:6},furniture:{key:'storybook-furniture',url:'/assets/storybook-furniture-v1.png'},approved:false} as const;
// New atlases are added only after approved reference sheets. Missing textures use shapes.
export function hasAsset(scene:{textures:{exists:(key:string)=>boolean}},key:string){return scene.textures.exists(key)}

// Measured alpha bounds in the generated atlas; keep sprite proportions and ground anchors.
export const FURNITURE_FRAMES={sofa:[85,116,589,499],drawer:[734,163,425,463],bookcase:[130,665,447,506],desk:[692,776,491,352]} as const;
// Drawer and wardrobe art, keyed by ITEMS[name].id. Items without a file keep the temporary SVG in ui/Inventory.tsx.
export const ITEM_IMAGES:Partial<Record<string,string>>={candy:'/assets/ui/items/candy.png',sunglasses:'/assets/ui/items/sunglasses.png',star_lamp:'/assets/ui/items/star_lamp.png',scarf:'/assets/ui/items/scarf.png',flower_pin:'/assets/ui/items/flower_pin.png',blanket:'/assets/ui/items/blanket.png'};
// 512×512 cells, cell bottom = ground anchor (same as garden-atlas friends). Player cells come from the 002 reference sheet.
export const SPRITES={player:{key:'player-idle-se',url:'/assets/characters/player_idle_se.png',size:88},starLamp:{key:'star-lamp',url:'/assets/furniture/star_lamp.png',size:88,lift:10},giftboxMoa:{key:'giftbox-moa',url:'/assets/garden/giftbox_moa.png',size:72,lift:10},blanket:{key:'blanket',url:'/assets/furniture/blanket.png',size:74,lift:10}} as const;
// Player poses on the same cell and anchor as SPRITES.player. West-facing walks mirror these.
export const PLAYER_POSES={back:{key:'player-idle-ne',url:'/assets/characters/player_idle_ne.png'},front:{key:'player-idle-s',url:'/assets/characters/player_idle_s.png'},happy:{key:'player-happy-se',url:'/assets/characters/player_happy_se.png'},surprised:{key:'player-surprised-se',url:'/assets/characters/player_surprised_se.png'},sad:{key:'player-sad-se',url:'/assets/characters/player_sad_se.png'}} as const;
// Worn clothes (005): transparent layers on the same 512 frame as the player poses, stacked over them.
// se = front poses (idle and faces), ne = back pose. West-facing walks mirror both.
const wear=(id:string)=>({se:{key:`wear-${id}-se`,url:`/assets/characters/wear_${id}_se.png`},ne:{key:`wear-${id}-ne`,url:`/assets/characters/wear_${id}_ne.png`}});
export const WEAR_IMAGES:Partial<Record<string,{se:{key:string;url:string};ne:{key:string;url:string}}>>={'여름 선글라스':wear('sunglasses'),'산책 목도리':wear('scarf'),'꽃 장식':wear('flower_pin')};
// Feeling effect pieces (003 sheet B), 256×256 squares with the art centred.
export const EFFECT_IMAGES={sparkle:{key:'fx-sparkle',url:'/assets/effects/sparkle.png'},happyLines:{key:'fx-happy-lines',url:'/assets/effects/happy_lines.png'},bang:{key:'fx-bang',url:'/assets/effects/bang.png'},surpriseLines:{key:'fx-surprise-lines',url:'/assets/effects/surprise_lines.png'},cloud:{key:'fx-cloud',url:'/assets/effects/cloud.png'},drop:{key:'fx-drop',url:'/assets/effects/drop.png'}} as const;
// Friend poses (006), 512×512 with the feet centred 18px above the bottom. Index = friends[] order.
const friendPose=(n:string,k:string)=>({key:`friend-${n}-${k}`,url:`/assets/characters/friend_${n}_${k}.png`});
export const FRIEND_POSES=['moa','tori','luon'].map(n=>({blink:friendPose(n,'blink'),back:friendPose(n,'back'),sit:friendPose(n,'sit'),nap:friendPose(n,'nap'),read:friendPose(n,'read')}));
// The idle frames (and their blink copies) come from the old atlas, off-centre: their measured centre x and foot gap in the 512 frame.
export const FRIEND_IDLE_ANCHOR=[{cx:327,gap:0},{cx:241,gap:4},{cx:229,gap:2}];
export const FRIEND_POSE_GAP=18;
// Head emotes (006), 256×256 bubbles with the tail at the bottom centre.
const emote=(k:string)=>({key:`emote-${k}`,url:`/assets/effects/emote_${k}.png`});
export const EMOTE_IMAGES={heart:emote('heart'),note:emote('note'),sparkle:emote('sparkle'),zzz:emote('zzz'),dots:emote('dots')};
