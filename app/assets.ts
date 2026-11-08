export const ASSETS={legacy:{key:'atlas',url:'/assets/garden-atlas.png',frameSize:512,columns:3,count:6},furniture:{key:'storybook-furniture',url:'/assets/storybook-furniture-v1.png'},approved:false} as const;
// New atlases are added only after approved reference sheets. Missing textures use shapes.
export function hasAsset(scene:{textures:{exists:(key:string)=>boolean}},key:string){return scene.textures.exists(key)}

// Measured alpha bounds in the generated atlas; keep sprite proportions and ground anchors.
export const FURNITURE_FRAMES={sofa:[85,116,589,499],drawer:[734,163,425,463],bookcase:[130,665,447,506],desk:[692,776,491,352]} as const;
// Drawer and wardrobe art, keyed by ITEMS[name].id. Items without a file keep the temporary SVG in ui/Inventory.tsx.
export const ITEM_IMAGES:Partial<Record<string,string>>={journal_frame:'/assets/ui/items/journal_frame.png',reading_chair:'/assets/ui/items/reading_chair.png',gold_bookend:'/assets/ui/items/gold_bookend.png',candy:'/assets/ui/items/candy.png',sunglasses:'/assets/ui/items/sunglasses.png',star_lamp:'/assets/ui/items/star_lamp.png',scarf:'/assets/ui/items/scarf.png',flower_pin:'/assets/ui/items/flower_pin.png',blanket:'/assets/ui/items/blanket.png'};
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
// Friend pictures (006 rules: 512×512, feet centred 18px up), named friend_<id>_<pose>.png.
// The first three friends take their standing picture from the old atlas instead (see Friend.atlas).
const friendPose=(id:string,k:string)=>({key:`friend-${id}-${k}`,url:`/assets/characters/friend_${id}_${k}.png`});
export const friendArt=(id:string)=>({idle:friendPose(id,'idle'),blink:friendPose(id,'blink'),back:friendPose(id,'back'),sit:friendPose(id,'sit'),nap:friendPose(id,'nap'),read:friendPose(id,'read')});
export const FRIEND_POSE_GAP=18;
// Head emotes (006), 256×256 bubbles with the tail at the bottom centre.
const emote=(k:string)=>({key:`emote-${k}`,url:`/assets/effects/emote_${k}.png`});
export const EMOTE_IMAGES={heart:emote('heart'),note:emote('note'),sparkle:emote('sparkle'),zzz:emote('zzz'),dots:emote('dots')};
// Farm props (007, 014, 017 ladder): 512×512, drawn at 2× (one cell = 172×86), footprint centred, its front corner 18px up.
export const HOUSE_ART_NAMES=['farm_plot','farm_plot_empty','farm_fence_a','farm_fence_b','farm_gate','farm_well','farm_shed','farm_scarecrow','farm_compost','farm_cart','farm_fertilizer','farm_sign','yard_seedbox','yard_shovel','yard_mailbox','yard_flower_patch_1','yard_flower_patch_2','attic_ladder'] as const;
export type HouseArt=typeof HOUSE_ART_NAMES[number];
export const houseArt=(name:HouseArt)=>({key:`house-${name}`,url:`/assets/house/${name}.png`});
export const HOUSE_ART_SIZE=256;export const HOUSE_ART_ANCHOR=494/512;
// The house (009): the outside, and per floor the empty room (shell), the cut-down front walls and the stairs, all on
// one 2100×2048 canvas per view; furniture as 512px pictures named in layout.ts HOUSE_PLAN.
export const HOUSE_LAYERS=['house_exterior','floor1_shell','floor2_shell','floor1_front_cut','floor2_front_cut','stairs_floor1','attic_shell','attic_front_cut','house_exterior_grown'] as const;
// loaded once the garden is open (game.ts): not on screen at the start
export const LATER_LAYERS:readonly string[]=['house_exterior','floor2_shell','floor2_front_cut'];
// loaded only once earned (12.5): the attic (five retrospectives) and the grown outside (fifty journals), 017
export const EARNED_LAYERS:readonly string[]=['attic_shell','attic_front_cut','house_exterior_grown'];
// the big canvases are lossless WebP (half the bytes of the delivered PNGs, same pixels)
export const house9=(name:string)=>({key:`house9-${name}`,url:`/assets/house9/${name}.${(HOUSE_LAYERS as readonly string[]).includes(name)?'webp':'png'}`});
// Trees (012): tree_<kind>_<growth>_<condition>.png, 512×512, trunk foot centred 18px up (same anchor as furniture).
// List a file here once it is delivered; anything missing is drawn with shapes in app/scene/trees.ts.
// every tree: 3 kinds × growth × condition (seed 3, sprout 4, others 6). Healthy ones from GPT 012,
// the rest from Nano Banana sheets cut by scripts/cut-nb-grid.py.
const TREE_CONDITIONS:Record<string,string[]>={seed:['well','wilt','dead'],sprout:['well','dull','wilt','dead'],sapling:['bloom','well','dull','wilt','rot','dead'],young:['bloom','well','dull','wilt','rot','dead'],grand:['bloom','well','dull','wilt','rot','dead']};
export const TREE_ART:readonly string[]=[0,1,2].flatMap(k=>Object.entries(TREE_CONDITIONS).flatMap(([g,cs])=>cs.map(c=>`tree_${k}_${g}_${c}`)));
// Falling leaves (012 D), 64×64.
export const LEAF_IMAGES={yellow:{key:'fx-leaf-yellow',url:'/assets/effects/leaf_yellow.png'},orange:{key:'fx-leaf-orange',url:'/assets/effects/leaf_orange.png'},brown:{key:'fx-leaf-brown',url:'/assets/effects/leaf_brown.png'}};
export const treeArt=(name:string)=>({key:`tree-${name}`,url:`/assets/trees/${name}.png`});
// Care props (011 E): sunlight jar 0–3 share one bottle (256, bottom 18px up), tools 256 centred, sun piece 64, wall calendar 256.
const care=(n:string)=>({key:`care-${n}`,url:`/assets/care/${n}.png`});
export const CARE_IMAGES={jar:[0,1,2,3].map(i=>care(`sunlight_jar_${i}`)),sunPiece:care('sun_piece'),wateringCan:care('tool_watering_can'),fertilizerBag:care('tool_fertilizer_bag'),calendar:care('wall_calendar')};
// Mood stickers (011 E), 128×128 round stickers for the journal form and the calendar panel.
export const MOOD_IMAGES:Partial<Record<string,string>>={sunny:'/assets/ui/moods/mood_sunny.png',calm:'/assets/ui/moods/mood_calm.png',curious:'/assets/ui/moods/mood_curious.png',worried:'/assets/ui/moods/mood_worried.png',tired:'/assets/ui/moods/mood_tired.png'};
// Milestone gifts (011 F): 512×512 drawn at 2× (one cell = 172×86), footprint centred 18px up — shown at 256.
// scale: uniform size fix in the room (the chair came drawn smaller than the sofa beside it).
export const GIFT_FURNITURE:Partial<Record<string,{key:string;url:string;scale?:number}>>={'첫 일지 액자':{key:'gift-journal-frame',url:'/assets/furniture/journal_frame.png',scale:.85},'작은 독서 의자':{key:'gift-reading-chair',url:'/assets/furniture/reading_chair.png',scale:1.35},'금박 책받침':{key:'gift-gold-bookend',url:'/assets/furniture/gold_bookend.png'}};
// Yard ground (013): 172×86 diamonds drawn at 2× (one cell), edges 172×130 with one soil face below.
const ground=(n:string)=>({key:`ground-${n}`,url:`/assets/ground/ground_${n}.png`});
export const GROUND_TILES={grass:[1,2,3,4].map(i=>ground(`grass_${i}`)),path:ground('path'),stone:ground('stepping_stone'),edgeLeft:ground('edge_left'),edgeRight:ground('edge_right')};
