// 보리, the guinea pig friend (tools/blender/analysts.py bori.glb): not an analyst. Comes over when the garden opens
// and starts the talk from what is going on in my garden today; sometimes just chats. Free talk with the LLM comes with
// the server (docs/server.md); until then these lines and a few quick replies.
// Voice: quick, warm, a little nosy, 반말. Never tells anyone to buy or sell, never calls a price.
export const FRIEND={id:'bori',name:'보리',role:'관측소지기 · 먼저 말 거는 동반자'} as const;
// 보리's faces (tools/blender/analysts.py bori_faces, docs/mockups/bori-faces.html): the talk server picks one per line
// (persona_bori.json allowed_emotions); anything else shows as neutral. The small talk's openers pick by topic.
export const BORI_FACES=['neutral','curious','concerned','happy','thinking','playful','tired'] as const;
export type BoriFace=typeof BORI_FACES[number];
export const FRIEND_FACE={of:(e:string):BoriFace=>(BORI_FACES as readonly string[]).includes(e)?e as BoriFace:'neutral',
  topic:{grades:'happy',signal:'concerned',chat:'playful'} as Record<'grades'|'signal'|'chat',BoriFace>};
export type FriendCtx={hour:number;due:number;signal:{name:string;analyst:string}|null;holdings:string[]};
export type FriendTopic='grades'|'signal'|'chat';

const pick=(list:string[],seed:string)=>{let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return list[h%list.length]};
// 보리 (npc_personas v3 npc_bori): calm, warm 반말, one or two sentences, the point first and one question at a time;
// opens on a small change instead of a set greeting; a signal goes name → what was seen → one question, never a verdict
const hello=(hour:number)=>hour<11?'있잖아, 아침 공기가 차다.':hour<17?'있잖아,':hour<21?'있잖아, 해 지는 쪽 하늘 봤어?':'있잖아, 아직 안 잤구나.';

// what 보리 says first, and what it is about (so the reply buttons fit); short is the bubble over its head
export function friendOpener(c:FriendCtx,seed:string):{text:string;short:string;topic:FriendTopic}{
  if(c.due>0)return {topic:'grades',short:`채점 ${c.due}개 나왔어`,text:`${hello(c.hour)} 30일 전에 적은 판단 ${c.due}개, 채점 나왔어. 같이 볼래?`};
  if(c.signal)return {topic:'signal',short:`${c.signal.name} 같이 보자`,text:pick([
    `잠깐, 이거 하나만 같이 보자. ${c.signal.name}에서 ${c.signal.analyst}가 신호를 짚었어. 지금도 갖고 있으려는 이유가 뭐야? 지금 바로 답 안 해도 돼.`,
    `잠깐, 이거 하나만 같이 보자. ${c.signal.analyst} 노트에 ${c.signal.name} 얘기가 올라왔어. 네 생각이 제일 궁금해.`,
  ],seed)};
  return {topic:'chat',short:pick(['있잖아,','왔구나.','여기 좀 봐'],seed),text:pick([
    `${hello(c.hour)} 오늘은 바람이 밭 쪽으로 불었어. 관측 수첩에 적어 뒀어.`,
    `${hello(c.hour)} 아까 연못에서 개구리랑 눈 마주쳤어. …그냥 그랬다고.`,
    c.holdings.length?`${hello(c.hour)} ${c.holdings[0]} 나무 요즘 어때 보여? 네 생각이 제일 궁금해.`:`${hello(c.hour)} 마을 한 바퀴 같이 돌래?`,
  ],seed)};
}
// the quick replies under the opener, and what 보리 answers to each (an action to open, or a line)
export type FriendReply={label:string;answer:string;go?:'grades'|'journal'|'case'|null};
export function friendReplies(topic:FriendTopic,seed:string):FriendReply[]{
  const small=pick(['오늘은 구름이 낮게 깔렸어. 관측 수첩에 적어 뒀어.','루온은 반대만 하는데, 가끔 맞아서 얄미워.','광장 벤치에서 루온이 혼자 체스 두고 있더라.','저녁엔 언덕에서 마을 불빛 세는 게 좋아.'],seed);
  if(topic==='grades')return [
    {label:'응, 보여줘',answer:'응, 같이 보자.',go:'grades'},
    {label:'그냥 수다',answer:small,go:null}];
  if(topic==='signal')return [
    {label:'근거가 뭔데?',answer:'근거는 그 분석가 노트에 있어. 더 따져 보고 싶으면 광장에 루온 있어.',go:null},
    {label:'나중에 답할게',answer:'응, 괜찮아. 생각나면 그때 말해 줘.',go:null},
    {label:'그냥 수다',answer:small,go:null}];
  return [
    {label:'뭐 할까?',answer:'케이스 하나 같이 볼래? 30초면 돼.',go:'case'},
    {label:'수다 떨자',answer:small,go:null}];
}

// Free talk with 보리 through the LLM (db/functions/friend-chat, OpenAI). The prompt is built here so the server and the
// tests share it; whatever comes back passes friendSafe before anyone sees it.
export const FRIEND_TALK={maxIn:200/* characters a player may send */,history:10/* lines of the talk sent along */,perDay:30/* answers a day */};
export type TalkLine={who:'bori'|'me';text:string};
export function friendPrompt(c:FriendCtx,history:TalkLine[],message:string):{role:'system'|'user'|'assistant';content:string}[]{
  const garden=[c.holdings.length?`정원에 있는 종목: ${c.holdings.slice(0,8).join(', ')}`:'정원에 아직 종목이 없음',
    c.due?`채점 나온 판단 ${c.due}개`:'',c.signal?`${c.signal.analyst}가 ${c.signal.name}에서 신호를 짚음`:''].filter(Boolean).join(' / ');
  const system=[
    '너는 "보리"야. 투자 판단 기록 앱 rethinking! 마을 언덕 위 관측소지기. 유저에게 먼저 말을 거는 동반자고, 분석가가 아니야.',
    '말투: 쉬운 반말. 한두 문장, 80자 안쪽, 핵심 먼저, 질문은 한 번에 하나. 시적인 표현·비유·억지 감동 금지. 겁주기·과장·상담원 화법 금지.',
    '유저가 맞장구나 인사만 하거나 더 할 얘기가 없으면 새 화제를 꺼내지 말고 짧게 인사한 뒤 맨 끝에 ⟨끝⟩ 을 붙여.',
    '절대 하지 않는 것: 사라/팔아/매수/매도/손절 같은 매매 권유, "오를 거야" "떨어질 거야" 같은 가격 예측, 목표가, 수익 약속.',
    '종목 판단을 물으면 "그건 네가 정할 일"이라고 하고, 더 따져 보고 싶어 하면 광장의 루온을 알려 줘. 위험 신호 대화는 다른 곳으로 옮기지 마. 퀴즈는 집의 선생님 담당.',
    '모르는 사실은 지어내지 말고 모른다고 해. 개인정보(실명, 계좌, 비밀번호)를 묻지 마.',
    `오늘 정원: ${garden}. 지금 ${c.hour}시.`,
  ].join('\n');
  return [{role:'system',content:system},
    ...history.slice(-FRIEND_TALK.history).map(l=>({role:l.who==='bori'?'assistant' as const:'user' as const,content:l.text})),
    {role:'user',content:message.slice(0,FRIEND_TALK.maxIn)}];
}
// an answer that slips into buy/sell or price calls is replaced, not shown
const UNSAFE=/(^|\s)(사라|사 둬|사둬|사 봐|팔아|팔라|팔 때|살 때|물타기|풀매수|몰빵)|매수|매도|손절|익절|오를\s?거|오른다|오를 것|떨어질\s?거|떨어진다|떨어질 것|목표가|수익\s?보장/;
export const friendSafe=(text:string)=>{const t=text.trim().slice(0,160);
  return !t||UNSAFE.test(t)?'음, 그건 내가 말할 게 아니야. 분석가 노트 보고 네가 정해 봐.':t};
