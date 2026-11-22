export const ASSETS={legacy:{key:'atlas',url:'/assets/garden-atlas.png',frameSize:512,columns:3,count:6},furniture:{key:'storybook-furniture',url:'/assets/storybook-furniture-v1.png'},approved:false} as const;
// New atlases are added only after approved reference sheets. Missing textures use shapes.
export function hasAsset(scene:{textures:{exists:(key:string)=>boolean}},key:string){return scene.textures.exists(key)}

// Measured alpha bounds in the generated atlas; keep sprite proportions and ground anchors.
export const FURNITURE_FRAMES={sofa:[85,116,589,499],drawer:[734,163,425,463],bookcase:[130,665,447,506],desk:[692,776,491,352]} as const;
// Drawer and wardrobe art, keyed by ITEMS[name].id. Items without a file keep the temporary SVG in ui/Inventory.tsx.
export const ITEM_IMAGES:Partial<Record<string,string>>={journal_frame:'/assets/ui/items/journal_frame.png',reading_chair:'/assets/ui/items/reading_chair.png',gold_bookend:'/assets/ui/items/gold_bookend.png',candy:'/assets/ui/items/candy.png',sunglasses:'/assets/ui/items/sunglasses.png',star_lamp:'/assets/ui/items/star_lamp.png',scarf:'/assets/ui/items/scarf.png',flower_pin:'/assets/ui/items/flower_pin.png',blanket:'/assets/ui/items/blanket.png',
 // 020 friend gifts (ux-spec 3장)
 ...Object.fromEntries(['berry_jam','yarn_basket','pressed_flowers','wildflower_vase','star_pebble','acorn_sprout','barley_tea','wood_box','star_mobile'].map(id=>[id,`/assets/ui/items/${id}.png`]))};
// 512×512 cells, cell bottom = ground anchor (same as garden-atlas friends). Player cells come from the 002 reference sheet.
export const SPRITES={player:{key:'player-idle-se',url:'/assets/characters/player_idle_se.png',size:88},starLamp:{key:'star-lamp',url:'/assets/furniture/star_lamp.png',size:88,lift:10},giftboxMoa:{key:'giftbox-moa',url:'/assets/garden/giftbox_moa.png',size:72,lift:10},blanket:{key:'blanket',url:'/assets/furniture/blanket.png',size:74,lift:10}} as const;
// Player poses on the same cell and anchor as SPRITES.player. West-facing walks mirror these.
export const PLAYER_POSES={back:{key:'player-idle-ne',url:'/assets/characters/player_idle_ne.png'},front:{key:'player-idle-s',url:'/assets/characters/player_idle_s.png'},happy:{key:'player-happy-se',url:'/assets/characters/player_happy_se.png'},surprised:{key:'player-surprised-se',url:'/assets/characters/player_surprised_se.png'},sad:{key:'player-sad-se',url:'/assets/characters/player_sad_se.png'},
 // 021 sitting (11.9): on a seat facing SE, and with the blanket over the knees
 sit:{key:'player-sit-se',url:'/assets/characters/player_sit_se.png'},sitBlanket:{key:'player-sit-blanket-se',url:'/assets/characters/player_sit_blanket_se.png'}} as const;
// the sitting pictures keep the hip on the anchor, so the head sits 24px (of 512) lower: worn clothes move down with it
export const SIT_HEAD_DROP=24;
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
export const HOUSE_LAYERS=['house_exterior','floor1_shell','floor2_shell','floor1_front_cut','floor2_front_cut','stairs_floor1','attic_shell','attic_front_cut','house_exterior_grown',
 // 022: what hangs on the walls cut out of each shell (drawn over wallpaper), and the outside in other colours
 'floor1_wall_fixtures','floor2_wall_fixtures','attic_wall_fixtures','house_exterior_rose','house_exterior_grown_rose'] as const;
// loaded once the garden is open (game.ts): not on screen at the start
export const LATER_LAYERS:readonly string[]=['house_exterior','floor2_shell','floor2_front_cut'];
// loaded only once earned (12.5): the attic (five retrospectives) and the grown outside (fifty journals), 017
export const EARNED_LAYERS:readonly string[]=['attic_shell','attic_front_cut','house_exterior_grown'];
// loaded only when a room gets wallpaper or the outside another colour (11.9 집 표면)
export const SURFACE_LAYERS:readonly string[]=['floor1_wall_fixtures','floor2_wall_fixtures','attic_wall_fixtures','house_exterior_rose','house_exterior_grown_rose'];
export const WALL_FIXTURES:Record<1|2|3,string>={1:'floor1_wall_fixtures',2:'floor2_wall_fixtures',3:'attic_wall_fixtures'};
export const exteriorLayer=(id:string|undefined,grown:boolean)=>`house_exterior${grown?'_grown':''}${id&&id!=='plain'?'_'+id:''}`;
// the big canvases are lossless WebP (half the bytes of the delivered PNGs, same pixels)
export const house9=(name:string)=>({key:`house9-${name}`,url:`/assets/house9/${name}.${(HOUSE_LAYERS as readonly string[]).includes(name)?'webp':'png'}`});
// Trees (012): tree_<kind>_<growth>_<condition>.png, 512×512, trunk foot centred 18px up (same anchor as furniture).
// List a file here once it is delivered; anything missing is drawn with shapes in app/scene/trees.ts.
// every tree: 3 kinds × growth × condition (seed 3, sprout 4, others 6). Healthy ones from GPT 012,
// the rest from Nano Banana sheets cut by scripts/art/cut-nb-grid.py.
const TREE_CONDITIONS:Record<string,string[]>={seed:['well','wilt','dead'],sprout:['well','dull','wilt','dead'],sapling:['bloom','well','dull','wilt','rot','dead'],young:['bloom','well','dull','wilt','rot','dead'],grand:['bloom','well','dull','wilt','rot','dead']};
export const TREE_ART:readonly string[]=[0,1,2].flatMap(k=>Object.entries(TREE_CONDITIONS).flatMap(([g,cs])=>cs.map(c=>`tree_${k}_${g}_${c}`)));
// Falling leaves (012 D), 64×64.
export const LEAF_IMAGES={yellow:{key:'fx-leaf-yellow',url:'/assets/effects/leaf_yellow.png'},orange:{key:'fx-leaf-orange',url:'/assets/effects/leaf_orange.png'},brown:{key:'fx-leaf-brown',url:'/assets/effects/leaf_brown.png'}};
export const treeArt=(name:string)=>({key:`tree-${name}`,url:`/assets/trees/${name}.png`});
// Care props (011 E): sunlight jar 0–3 share one bottle (256, bottom 18px up), tools 256 centred, sun piece 64, wall calendar 256.
const care=(n:string)=>({key:`care-${n}`,url:`/assets/care/${n}.png`});
export const CARE_IMAGES={jar:[0,1,2,3].map(i=>care(`sunlight_jar_${i}`)),sunPiece:care('sun_piece'),wateringCan:care('tool_watering_can'),fertilizerBag:care('tool_fertilizer_bag'),calendar:care('wall_calendar'),
 // 019 the care axis (ux-spec 2장) and the week ribbon (12.2): drawn at 2×, used at half size
 flowers:[care('care_flowers_1'),care('care_flowers_2')],butterfly:[care('butterfly_open'),care('butterfly_closed')],promiseRibbon:care('promise_ribbon'),promiseKnot:care('promise_knot'),weekRibbon:care('week_ribbon'),
 // 023 traces of a friend who came while the player was away (ux-spec 4장): drawn at 2×, used at half size
 paws:[care('trace_paw_left'),care('trace_paw_right')],wetSoil:care('trace_wet_soil')};
// ux-spec 4장 evening and night pictures (024, Nano Banana): the same picture in other light, kept next to the day one
// as public/assets/<folder>/<part>/<same file name>. Listed here (by the day picture's path) once delivered; a picture
// not listed keeps its day look at every hour.
// 024 delivered 2026-11-10. The four grass tiles came back each in its own light (a checkerboard when laid), so every
// grass tile uses the most even one of them (night 1, evening 4), and the right yard edge is the left one mirrored
// (the right one carried the model's watermark).
const DAYPART_024=['/assets/house/farm_cart.png','/assets/house/farm_compost.png','/assets/house/farm_fence_a.png','/assets/house/farm_fence_b.png','/assets/house/farm_fertilizer.png','/assets/house/farm_gate.png','/assets/house/farm_plot.png','/assets/house/farm_plot_empty.png','/assets/house/farm_scarecrow.png','/assets/house/farm_shed.png','/assets/house/farm_sign.png','/assets/house/farm_well.png','/assets/house/yard_flower_patch_1.png','/assets/house/yard_flower_patch_2.png','/assets/house/yard_mailbox.png','/assets/house/yard_seedbox.png','/assets/house/yard_shovel.png','/assets/house9/house_exterior.webp','/assets/house9/house_exterior_grown.webp','/assets/house9/house_exterior_grown_rose.webp','/assets/house9/house_exterior_rose.webp','/assets/ground/ground_grass_1.png','/assets/ground/ground_grass_2.png','/assets/ground/ground_grass_3.png','/assets/ground/ground_grass_4.png','/assets/ground/ground_path.png','/assets/ground/ground_stepping_stone.png','/assets/ground/ground_edge_left.png','/assets/ground/ground_edge_right.png'];
export const DAYPART_ART:Record<'evening'|'night',string[]>={evening:DAYPART_024,night:DAYPART_024};
export const daypartUrl=(path:string,part:'evening'|'night')=>path.replace(/\/([^/]+)$/,`/${part}/$1`);
// Mood stickers (011 E), 128×128 round stickers for the journal form and the calendar panel.
export const MOOD_IMAGES:Partial<Record<string,string>>={sunny:'/assets/ui/moods/mood_sunny.png',calm:'/assets/ui/moods/mood_calm.png',curious:'/assets/ui/moods/mood_curious.png',worried:'/assets/ui/moods/mood_worried.png',tired:'/assets/ui/moods/mood_tired.png'};
// Milestone gifts (011 F): 512×512 drawn at 2× (one cell = 172×86), footprint centred 18px up — shown at 256.
// scale: uniform size fix in the room (the chair came drawn smaller than the sofa beside it).
export const GIFT_FURNITURE:Partial<Record<string,{key:string;url:string;scale?:number}>>={'첫 일지 액자':{key:'gift-journal-frame',url:'/assets/furniture/journal_frame.png',scale:.85},'작은 독서 의자':{key:'gift-reading-chair',url:'/assets/furniture/reading_chair.png',scale:1.35},'금박 책받침':{key:'gift-gold-bookend',url:'/assets/furniture/gold_bookend.png'},
 // 020 friend gifts, same 512 rules
 '털실 바구니':{key:'gift-yarn-basket',url:'/assets/furniture/yarn_basket.png'},'말린 꽃 액자':{key:'gift-pressed-flowers',url:'/assets/furniture/pressed_flowers.png'},'들꽃 화병':{key:'gift-wildflower-vase',url:'/assets/furniture/wildflower_vase.png'},'별 모양 조약돌':{key:'gift-star-pebble',url:'/assets/furniture/star_pebble.png'},'도토리 새싹 화분':{key:'gift-acorn-sprout',url:'/assets/furniture/acorn_sprout.png'},'작은 나무 상자':{key:'gift-wood-box',url:'/assets/furniture/wood_box.png'},'별자리 모빌':{key:'gift-star-mobile',url:'/assets/furniture/star_mobile.png'},
 // 021 seats in the decorate palette; the bench covers two cells along x (its picture centred on both)
 '쿠션':{key:'furniture-cushion',url:'/assets/furniture/cushion.png'},'나무 벤치':{key:'furniture-bench',url:'/assets/furniture/bench.png'}};
// 021 house surfaces (11.9): a floor tile per cell (172×86 drawn at 2×, like the yard ground), a wall panel per cell
// for the back wall and the left wall (88×504 at 2×, foot at the bottom). The outside is a whole 009 canvas (exteriorLayer).
export const surfaceArt=(kind:'floor'|'wall',id:string,side?:'back'|'left')=>{const n=kind==='wall'?`wall_${id}_${side}`:`floor_${id}`;return {key:`surface-${n}`,url:`/assets/surfaces/${n}.png`}};
// list a surface here once its pictures are delivered; the others draw as patterns (app/scene/surfaces.ts)
export const SURFACE_ART:{floor:string[];wall:string[];exterior:string[]}={floor:['honey','check','moss'],wall:['stripe','sprig','plank'],exterior:['rose']};
export const surfaceImages=()=>[...SURFACE_ART.floor.map(id=>surfaceArt('floor',id)),...SURFACE_ART.wall.flatMap(id=>(['back','left'] as const).map(side=>surfaceArt('wall',id,side)))];
// Yard ground (013): 172×86 diamonds drawn at 2× (one cell), edges 172×130 with one soil face below.
const ground=(n:string)=>({key:`ground-${n}`,url:`/assets/ground/ground_${n}.png`});
export const GROUND_TILES={grass:[1,2,3,4].map(i=>ground(`grass_${i}`)),path:ground('path'),stone:ground('stepping_stone'),edgeLeft:ground('edge_left'),edgeRight:ground('edge_right')};
