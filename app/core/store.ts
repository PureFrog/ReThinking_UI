'use client';
import {useReducer} from 'react';
import {initial,initialGifts,defaultRules} from './model';
import {FRIENDS,LEGACY_FRIEND_IDS,friendIdOf} from '../content/friends';
import {blankRelation} from './relationships';
import {DEFAULT_SOUND} from './sound';
// Per-friend records are keyed by friend id (13.7-2). Older saves kept them by list position.
export function relationsById(v:unknown):Record<string,any>{const out:Record<string,any>=Array.isArray(v)?Object.fromEntries(v.map((r,i)=>[LEGACY_FRIEND_IDS[i]??`legacy-${i}`,r])):v&&typeof v==='object'?{...v}:{};for(const f of FRIENDS)out[f.id]??=blankRelation();return out}
export const STORAGE_KEY='little-garden-v3';
export function migrateV3(input:any){const s=input&&typeof input==='object'?input:{};const equipped=typeof s.equipped==='string'?s.equipped:'';return {...s,version:3,holdings:s.holdings??initial,rules:s.rules??defaultRules,decor:s.decor??[],gifts:(s.gifts??initialGifts).map((g:any)=>({...g,sender:friendIdOf(g.sender)})),claimed:s.claimed??[],records:s.records??[],decision:s.decision??'',equipped,used:s.used??[],care:s.care??{},journal:s.journal??[],quiz:s.quiz??{books:{},daily:{day:'',paid:0}},earned:s.earned??{},relationships:relationsById(s.relationships),memories:s.memories??[],sunlight:s.sunlight??0,rewards:s.rewards??{},slots:s.slots??{hat:equipped==='꽃 장식'?equipped:null,face:equipped==='여름 선글라스'?equipped:null,neck:equipped==='산책 목도리'?equipped:null,hand:null},settings:{timeMode:'realtime',careExpiryDays:30,autoAdvance:false,reduceMotion:false,...s.settings,sound:{...DEFAULT_SOUND,...s.settings?.sound}},guides:s.guides??[],received:s.received??{},seen:s.seen??(s.claimed??[]),glowDay:s.glowDay??'',onboarded:s.onboarded??!!input}}
export function gardenReducer(state:any,action:any){if(action.type==='hydrate')return migrateV3(action.value);return {...state,[action.key]:typeof action.value==='function'?action.value(state[action.key]):action.value}}
export function useGardenStore(){return useReducer(gardenReducer,undefined,()=>migrateV3(null))}
