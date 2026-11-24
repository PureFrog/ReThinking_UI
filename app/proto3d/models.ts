// Every 3D model file the world loads, in one place. Swap a file here (Blender, a CC0 pack, a hired artist)
// and the scene picks it up; object names inside the file are the contract (tools/blender/holding_tree.py).
import type {Growth,Condition} from '../core/model';

export const TREE_VARIANTS=2;
const GROWTHS:Growth[]=['seed','sprout','sapling','young','grand'];

export const MODELS={
  tree:(g:Growth,variant:number)=>`/models/trees/tree_${g}_${variant%TREE_VARIANTS}.glb`,
  stump:'/models/trees/stump.glb',
  // tools/blender/analysts.py: node names body, head, arm_l, arm_r, eye_l, eye_r
  analyst:(id:string)=>`/models/analysts/${id}.glb`,
  // tools/blender/explorer.py: the player's observer (sockets hat, back, hand) and each thing it can wear
  explorer:'/models/explorer/explorer.glb',
  wear:(id:string)=>`/models/explorer/${id}.glb`,
  // tools/blender/kind_trees.py: the 꽃집's decor flowers and trees (content/flower-shop.ts), and their shop pictures
  decor:(id:string)=>`/models/decor/${id}.glb`,
  decorPic:(id:string)=>`/models/decor/${id}.png`,
  // 거장의 집 (팀원 제작 2026-11-23, Tripo): simplified to ~8% of its faces and a 1024 texture (gltf-transform)
  masterHouse:'/models/buildings/master_house.glb',
  // 오락실 (2026-11-24, a teammate's model; simplified 478k → 24k triangles, texture 1024, quantized: 15.7 MB → 0.6 MB)
  arcade:'/models/arcade/arcade.glb',
};
export const ALL_TREE_FILES=[...GROWTHS.flatMap(g=>Array.from({length:TREE_VARIANTS},(_,v)=>MODELS.tree(g,v))),MODELS.stump];

// How a condition shows on the canopy: leaf colour and how much of the canopy is left (leaf_<n> clumps, most important first).
// falling: leaves or petals in the air at once, fallColor: their colour, droop: how far the tree leans (radians, R2)
// fruit: share of the apples (fruit_<n>) still on the tree, fallen: apples lying under it (2026-11-16: fruit is the signal)
export const CANOPY:Record<Condition,{leaf:string;keep:number;blossom:boolean;falling:number;fallColor:string;droop:number;fruit:number;fallen:boolean}>={
  bloom:{leaf:'#5db04a',keep:1,blossom:true,falling:5,fallColor:'#ffd3df',droop:0,fruit:1,fallen:false},
  well:{leaf:'#4d9d45',keep:1,blossom:false,falling:0,fallColor:'#4d9d45',droop:0,fruit:1,fallen:false},
  // 2026-11-18 (user): a losing stock still looks like a round green fruit tree (it used to go a brown lump); the signal is
  // fewer apples, apples on the ground and a slightly yellower green
  dull:{leaf:'#5aa446',keep:1,blossom:false,falling:1,fallColor:'#8fb04a',droop:0,fruit:0.35,fallen:false},
  wilt:{leaf:'#68a445',keep:0.9,blossom:false,falling:2,fallColor:'#a3ad4c',droop:0.03,fruit:0.12,fallen:true},
  rot:{leaf:'#77a246',keep:0.8,blossom:false,falling:2,fallColor:'#ada24e',droop:0.05,fruit:0,fallen:true},
  dead:{leaf:'#7d6b4d',keep:0,blossom:false,falling:0,fallColor:'#7d6b4d',droop:0,fruit:0,fallen:false},
};
export const BARK='#6c5b53';
export const FRUIT='#d93a2b',FRUIT_FALLEN='#9a4a2c';
export const STUMP_CUT='#d2b48a';
