// The journal score (design 6). Four axes on the player's own words, each graded 0~3 with the words that earned it:
//   philosophy 45  the day's principle applied to a fact      evidence 25  a card picked, its fact used, fact vs estimate
//   logic 20       a counter/condition tied to the conclusion  review 10    what the new scene changed or kept (scene 2·3)
// An axis counts only where the quest asks for it; nothing unasked loses points and length earns nothing.
// TRIAL_JUDGE is a word-rule stand-in, labelled as such on screen: it cannot tell a sound argument from a lucky one.
// The server's ToulminJudge (LLM, same output) replaces it through the Judge seam; the score is computed from the grades
// here either way, never taken from a model.
import {ownText,type QuestDef,type Card,type DailyPack,type DimGrade,type DimKey,type Fields,type Quest,type Scene,type SceneGrade} from './model';
export const WEIGHTS:Record<DimKey,number>={philosophy:45,evidence:25,logic:20,review:10};
export const DIM_LABEL:Record<DimKey,string>={philosophy:'철학 적용',evidence:'근거 정확성',logic:'논리 정교함',review:'재검토'};
export type JudgeInput={quest:Quest;scene:Scene;visible:Card[];principleKeys:string[];fields:Fields;prev:Fields|null};
export type Judge={id:string;grade(i:JudgeInput):DimGrade[]};

const CONNECT=/(때문|므로|니까|그래서|따라서|라서|이라\s|그러니|보면|봐서|지지|약화|어긋|뜻|의미|근거로)/;
const CONTRAST=/(하지만|그러나|다만|반면|만약|라면|경우|아니라|불구|면\s)/;
const REVIEW=/(처음|이전|지난|앞서|바뀌|바꿨|바꾼|바꿀|유지|그대로|수정|여전히|달라|새로)/;
const ESTIMATE=/(추정|계획|목표|전망|예상|확정|실제|달성|미체결)/;
const hit=(t:string,keys:string[])=>keys.filter(k=>k&&t.includes(k));
// the sentence that holds the first match, as the quote shown back
// a decimal point (−1.2%) is not the end of a sentence
function quoteOf(t:string,needle:string|null){const ss=t.split(/(?<=[.!?。\n])(?!\d)\s*/).map(x=>x.trim()).filter(Boolean);
  const s=(needle?ss.find(x=>x.includes(needle)):null)??ss[0]??'';return s.length>90?s.slice(0,88)+'…':s}
const g3=(n:number)=>Math.max(0,Math.min(3,n)) as 0|1|2|3;

// which axes a scene is graded on: philosophy always; the rest only where the quest asks for them (design 6). 입문
// (level 1) is the picked direction and its one line only (feedback F3), so no review axis there either
export function activeAxes(q:Quest,hasPrev:boolean):DimKey[]{
  return ['philosophy',...(q.fields.includes('reason')?['evidence' as const]:[]),...(q.fields.some(k=>k==='counter'||k==='recheck')?['logic' as const]:[]),...(hasPrev&&q.level!==1?['review' as const]:[])];
}
// grades worked out beforehand (the server's Toulmin judge is asynchronous): settle reads them through the same seam
export const precomputedJudge=(id:string,byScene:Record<string,DimGrade[]>):Judge=>({id,grade:i=>byScene[i.scene.id]??[]});

export const TRIAL_JUDGE:Judge={id:'trial-words-v1',grade(i){
  // only the player's own words and choices: what the system filled (a given target or period) is never graded
  const out:DimGrade[]=[],f=i.fields,factKeys=[...new Set(i.visible.flatMap(c=>c.keys))],hypo=ownText(i.quest,i.scene,f);
  const cardsOf=(t:string)=>i.visible.filter(c=>hit(t,c.keys).length).map(c=>c.id);
  // philosophy: 0 nothing tied · 1 the principle repeated · 2 put on a fact · 3 why the fact backs or weakens it
  {const p=hit(hypo,i.principleKeys),x=hit(hypo,factKeys),c=CONNECT.test(hypo);
    const grade=!p.length&&!x.length?0:!x.length?1:p.length&&c?3:2;
    out.push({key:'philosophy',grade,quote:quoteOf(hypo,x[0]??p[0]??null),cards:cardsOf(hypo),
      reason:['오늘의 명제나 자료와 이어진 말이 보이지 않아요.','명제를 되풀이했지만 오늘 자료의 사실에 대어 보지 않았어요.','자료의 사실에 명제를 대어 봤어요. 그 사실이 왜 명제를 받치거나 흔드는지까지 쓰면 더 좋아요.','사실을 명제에 대고, 그래서 판단이 어떻게 되는지까지 이었어요.'][grade]})}
  if(i.quest.fields.includes('reason')){const t=f.reason.trim(),card=i.visible.find(c=>c.id===f.ev);
    const grade=g3(!t?0:(card?1:0)+(card&&hit(t,card.keys).length?1:0)+(ESTIMATE.test(t)?1:0));
    out.push({key:'evidence',grade,quote:quoteOf(t,card?hit(t,card.keys)[0]??null:null),cards:card?[card.id]:[],
      reason:grade>=3?'고른 자료의 사실을 그대로 쓰고, 확정된 것인지 추정인지도 나눴어요.':!card?'근거로 삼을 자료를 고르지 않았어요.':!hit(t,card.keys).length?'고른 자료의 숫자나 사실이 근거 문장에 보이지 않아요.':'확정된 사실인지 회사의 추정·계획인지 구분해 보세요.'})}
  const lg=(['counter','recheck'] as const).filter(k=>i.quest.fields.includes(k));
  if(lg.length){const t=lg.map(k=>f[k].trim()).filter(Boolean).join(' ');
    const grade=g3(!t?0:(t.length>=8?1:0)+(hit(t,factKeys).length?1:0)+(CONTRAST.test(t)||CONNECT.test(t)?1:0));
    out.push({key:'logic',grade,quote:quoteOf(t,hit(t,factKeys)[0]??null),cards:cardsOf(t),
      reason:grade>=3?'반대 경우나 조건을 자료의 사실에 묶어 결론과 이었어요.':!t?'반례나 조건이 비어 있어요.':!hit(t,factKeys).length?'반례·조건이 오늘 자료의 어떤 사실과 이어지는지 보이지 않아요.':'그 조건이 맞으면 결론이 어떻게 바뀌는지 이어 써 보세요.'})}
  if(i.prev&&activeAxes(i.quest,true).includes('review')){const t=[f.shift??'',hypo,f.reason].join(' ').trim(),now=hit(t,i.scene.cards.flatMap(c=>c.keys));
    const grade=g3((REVIEW.test(t)?1:0)+(now.length?1:0)+(now.length&&CONNECT.test(t)?1:0));
    out.push({key:'review',grade,quote:quoteOf(t,now[0]??null),cards:i.scene.cards.filter(c=>hit(t,c.keys).length).map(c=>c.id),
      reason:grade>=3?'새 자료가 이전 가설의 어느 부분을 바꾸거나 받치는지 설명했어요.':!now.length?'이번 장면에 새로 나온 자료가 문장에 보이지 않아요.':'이전 가설에서 무엇을 유지하고 무엇을 바꿨는지 밝혀 보세요.'})}
  return out;
}};

const NEXT:Record<DimKey,string>={philosophy:'다음엔 자료의 숫자 하나를 골라 "그래서 약속과 비교하면…"으로 문장을 이어 보세요.',
  evidence:'다음엔 근거 자료를 하나 고르고, 그 자료가 확정 사실인지 추정인지 함께 적어 보세요.',
  logic:'다음엔 "만약 …라면 내 판단은 …"처럼 조건과 결론을 한 문장에 묶어 보세요.',
  review:'다음엔 이전 가설에서 유지하는 것과 바꾸는 것을 하나씩 적어 보세요.'};
// scene score = 100 × Σ(weight × grade/3) / Σ active weight; the run score is the mean of the three scenes
export function sceneScore(dims:DimGrade[]){const w=dims.reduce((s,d)=>s+WEIGHTS[d.key],0);return w?Math.round(100*dims.reduce((s,d)=>s+WEIGHTS[d.key]*d.grade/3,0)/w):0}
export function gradeRun(pack:DailyPack,q:QuestDef,decisions:{scene:string;fields:Fields}[],judge:Judge=TRIAL_JUDGE):{scenes:SceneGrade[];journal:number}{
  const scenes:SceneGrade[]=[];
  decisions.forEach((d,k)=>{const s=pack.scenes.find(x=>x.id===d.scene);if(!s)return;
    const visible=pack.scenes.filter(x=>x.no<=s.no).flatMap(x=>x.cards);
    const dims=judge.grade({quest:q,scene:s,visible,principleKeys:pack.mentor.principleKeys,fields:d.fields,prev:k?decisions[k-1].fields:null});
    const low=[...dims].sort((a,b)=>a.grade-b.grade||WEIGHTS[b.key]-WEIGHTS[a.key])[0];
    scenes.push({scene:s.id,score:sceneScore(dims),dims,next:low&&low.grade<3?NEXT[low.key]:'이 장면은 요구한 칸을 모두 잘 이었어요.'})});
  return {scenes,journal:scenes.length?Math.round(scenes.reduce((s,x)=>s+x.score,0)/scenes.length):0};
}
