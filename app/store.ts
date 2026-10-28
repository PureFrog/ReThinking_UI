'use client';
import {useReducer} from 'react';
import {defaults,gardenAction} from './systems';
import {initial,initialGifts,defaultRules} from './model';
export const STORAGE_KEY='little-garden-v3';
export function migrateV3(input:any){const s=input&&typeof input==='object'?input:{};const equipped=typeof s.equipped==='string'?s.equipped:'';return {...s,version:3,holdings:s.holdings??initial,rules:s.rules??defaultRules,decor:s.decor??[],gifts:s.gifts??initialGifts,claimed:s.claimed??[],records:s.records??[],decision:s.decision??'',equipped,used:s.used??[],care:s.care??{},relationships:s.relationships??[0,0,0].map(()=>({points:0,stage:0,daily:{}})),memories:s.memories??[],sunlight:s.sunlight??0,rewards:s.rewards??{},slots:s.slots??{hat:equipped==='꽃 장식'?equipped:null,face:equipped==='여름 선글라스'?equipped:null,neck:equipped==='산책 목도리'?equipped:null,hand:null},settings:{...defaults,...s.settings},surfaces:s.surfaces??{wall:'cream',floor:'wood',garden:'stone'},inventory:s.inventory??[],letters:s.letters??[],dialogueRecent:s.dialogueRecent??{},lastVisitDay:s.lastVisitDay??null,lastSessionDay:s.lastSessionDay??null,onboarded:s.onboarded??!!input}}
export function gardenReducer(state:any,action:any){if(action.type==='garden')return gardenAction(state,action);if(action.type==='hydrate')return migrateV3(action.value);return {...state,[action.key]:typeof action.value==='function'?action.value(state[action.key]):action.value}}
export function useGardenStore(){return useReducer(gardenReducer,undefined,()=>migrateV3(null))}
