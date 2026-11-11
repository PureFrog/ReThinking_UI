// Which tree picture a tree shows (no Phaser here, so React screens can use it too: app/proto).
import {TREE_ART,treeArt} from './assets';
import type {Condition,Growth} from '../core/model';
// Seeds and sprouts are too small to show every condition; their art falls back to the nearest one drawn.
const STAGE_CONDITIONS:Record<Growth,readonly Condition[]>={seed:['well','wilt','dead'],sprout:['well','dull','wilt','dead'],sapling:['bloom','well','dull','wilt','rot','dead'],young:['bloom','well','dull','wilt','rot','dead'],grand:['bloom','well','dull','wilt','rot','dead']};
const NEAREST:Record<Condition,Condition[]>={bloom:['bloom','well'],well:['well'],dull:['dull','well'],wilt:['wilt','dull','well'],rot:['rot','wilt','dead'],dead:['dead','rot','wilt']};
export function artCondition(g:Growth,c:Condition):Condition{return NEAREST[c].find(x=>STAGE_CONDITIONS[g].includes(x))??'well'}
export const treeName=(kind:number,g:Growth,c:Condition)=>`tree_${kind}_${g}_${artCondition(g,c)}`;
// Tree art the manifest lists for this tree (delivered files only), or null to draw shapes.
export function deliveredArt(kind:number,g:Growth,c:Condition){const n=treeName(kind,g,c);return TREE_ART.includes(n)?treeArt(n):null}
// Until a condition's own picture comes (012-nb), the healthy picture stands in untouched. Dead stays a drawn stump.
export function standInArt(kind:number,g:Growth,c:Condition){if(c==='dead'||deliveredArt(kind,g,c))return null;const n=`tree_${kind}_${g}_well`;return TREE_ART.includes(n)?treeArt(n):null}
