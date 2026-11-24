// 마을 NPC 페르소나 (팀 문서 npc_personas v3, 2026-11-24, persona_version 2.0): who each one is and how each talks, kept as
// the team wrote it in content/npc-personas/*.json. The game's fixed lines follow these voices (Proto3D talkOf,
// content/villagers.ts, ui/House.tsx, ui/Fishing.tsx); the free talks (core/debate-chat.ts, and the teacher's when one is
// made) give the LLM personaPrompt() as its system prompt when one is attached.
import bori from '../content/npc-personas/npc_bori.json';
import teacher from '../content/npc-personas/npc_teacher.json';
import farmer from '../content/npc-personas/npc_farmer.json';
import merchant from '../content/npc-personas/npc_stock_merchant.json';
import librarian from '../content/npc-personas/npc_librarian.json';
import newspaper from '../content/npc-personas/npc_newspaper.json';
import fisher from '../content/npc-personas/npc_fisher.json';
import building from '../content/npc-personas/npc_building_merchant.json';
import clothing from '../content/npc-personas/npc_clothing_merchant.json';
import ruon from '../content/npc-personas/npc_ruon.json';

export type Persona={character_id:string;persona_version:string;basic_profile:{name:string;role:string;age_vibe?:string;occupation?:string};
  psychology:{surface_persona?:string;inner_depth?:string;quirks_and_flaws?:string[]};
  relationship_with_user:{role:string;dynamic:string;boundaries:string};
  speech_and_voice:{register:string;tone:string;pacing?:string;verbal_habits:string[];strictly_avoid:string[]};
  investment_guardrails:string[];dialogue_examples:Record<string,string>;system_state:{allowed_emotions:string[]}};
// the game's ids for the village's people → the team's persona files (v3: 보리 is the village's companion on the hill,
// the room's teacher has a file of its own)
export const PERSONAS={bori,teacher,farmer,merchant,librarian,paperboy:newspaper,naru:fisher,builder:building,tailor:clothing,luon:ruon} as unknown as Record<NpcId,Persona>;
export type NpcId='bori'|'teacher'|'farmer'|'merchant'|'librarian'|'paperboy'|'naru'|'builder'|'tailor'|'luon';
export const persona=(id:NpcId)=>PERSONAS[id];

// the system prompt for a free talk with one of them: who they are, how they talk, what they never say, a few lines
// in their voice, and the answer's shape ({text, emotion} with one of their emotions)
// the name the game shows where the file's is longer
const NAME:Partial<Record<NpcId,string>>={bori:'보리',luon:'루온'};
export function personaPrompt(id:NpcId):string{
  const p=persona(id),v=p.speech_and_voice,b=p.basic_profile;
  return [
    `너는 투자 정원 마을의 "${NAME[id]??b.name}"이다. 역할: ${b.role}.`,
    p.psychology.surface_persona?`겉모습: ${p.psychology.surface_persona}`:'',
    `유저와의 관계: ${p.relationship_with_user.role}. ${p.relationship_with_user.dynamic}`,
    `말투: ${v.register}. 톤: ${v.tone}.${v.pacing?` 길이: ${v.pacing}`:''}`,
    `말버릇:\n${v.verbal_habits.map(h=>'- '+h).join('\n')}`,
    `절대 하지 않는 말:\n${[...v.strictly_avoid,...p.investment_guardrails].map(h=>'- '+h).join('\n')}`,
    `지켜야 할 선: ${p.relationship_with_user.boundaries}`,
    `대사 예시:\n${Object.values(p.dialogue_examples).slice(0,6).map(l=>'- '+l).join('\n')}`,
    `답은 JSON {"text": 한국어 대사, "emotion": ${p.system_state.allowed_emotions.map(e=>`"${e}"`).join(' | ')}} 하나로만 한다.`,
  ].filter(Boolean).join('\n\n');
}
