// 보리, the guinea pig friend (tools/blender/analysts.py bori.glb): not an analyst. Comes over when the garden opens
// and starts the talk from what is going on in my garden today; sometimes just chats. Free talk with the LLM comes with
// the server (docs/server.md); until then these lines and a few quick replies.
// Voice: quick, warm, a little nosy, 반말. Never tells anyone to buy or sell, never calls a price.
export const FRIEND={id:'bori',name:'보리',role:'말 걸어오는 친구'} as const;
export type FriendCtx={hour:number;due:number;signal:{name:string;analyst:string}|null;holdings:string[]};
export type FriendTopic='grades'|'signal'|'chat';

const pick=(list:string[],seed:string)=>{let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return list[h%list.length]};
const hello=(hour:number)=>hour<11?'좋은 아침!':hour<17?'왔어?':hour<21?'저녁이네!':'아직 안 잤어?';

// what 보리 says first, and what it is about (so the reply buttons fit); short is the bubble over its head
export function friendOpener(c:FriendCtx,seed:string):{text:string;short:string;topic:FriendTopic}{
  if(c.due>0)return {topic:'grades',short:`채점 ${c.due}개 나왔대!`,text:`${hello(c.hour)} 30일 전에 적은 판단 ${c.due}개, 채점 나왔대. 같이 볼래?`};
  if(c.signal)return {topic:'signal',short:`${c.signal.name} 얘기 들었어?`,text:pick([
    `${hello(c.hour)} ${c.signal.name} 얘기 들었어? ${c.signal.analyst}가 뭔가 짚었대.`,
    `${hello(c.hour)} ${c.signal.analyst}가 아까부터 ${c.signal.name} 앞에 서 있더라.`,
  ],seed)};
  return {topic:'chat',short:pick(['심심해, 놀자!','여기 좀 봐!','왔어?'],seed),text:pick([
    `${hello(c.hour)} 오늘은 정원이 조용하네. 나랑 수다나 떨자.`,
    `${hello(c.hour)} 나 방금 연못에서 개구리랑 눈 마주쳤어.`,
    c.holdings.length?`${hello(c.hour)} ${c.holdings[0]} 나무 요즘 잎이 어때 보여?`:`${hello(c.hour)} 정원 한 바퀴 같이 돌래?`,
  ],seed)};
}
// the quick replies under the opener, and what 보리 answers to each (an action to open, or a line)
export type FriendReply={label:string;answer:string;go?:'grades'|'journal'|'case'|null};
export function friendReplies(topic:FriendTopic,seed:string):FriendReply[]{
  const small=pick(['클로버 찾기 대회 하면 내가 이길걸.','토리는 안경 닦을 때 진짜 진지해.','루온은 반대만 하는데, 가끔 맞아서 얄미워.','모아 망원경 한 번만 빌려 보고 싶다.'],seed);
  if(topic==='grades')return [
    {label:'응, 보여줘',answer:'가자! 맞았으면 나 간식 사 줘.',go:'grades'},
    {label:'이따 볼게',answer:'알았어. 일지에 표시해 둘게.',go:null},
    {label:'그냥 수다',answer:small,go:null}];
  if(topic==='signal')return [
    {label:'뭔데?',answer:'자세한 건 분석가 노트에 있어. 일지 열어 줄게.',go:'journal'},
    {label:'나중에',answer:'응, 급한 건 아니래. 생각나면 일지 봐.',go:null},
    {label:'그냥 수다',answer:small,go:null}];
  return [
    {label:'뭐 하고 놀까?',answer:'오늘의 케이스 같이 풀래? 30초면 돼.',go:'case'},
    {label:'수다 떨자',answer:small,go:null},
    {label:'일지 쓸래',answer:'좋아. 오늘 뭐 봤는지 적어 둬.',go:'journal'}];
}

// Free talk with 보리 through the LLM (db/functions/friend-chat, OpenAI). The prompt is built here so the server and the
// tests share it; whatever comes back passes friendSafe before anyone sees it.
export const FRIEND_TALK={maxIn:200/* characters a player may send */,history:10/* lines of the talk sent along */,perDay:30/* answers a day */};
export type TalkLine={who:'bori'|'me';text:string};
export function friendPrompt(c:FriendCtx,history:TalkLine[],message:string):{role:'system'|'user'|'assistant';content:string}[]{
  const garden=[c.holdings.length?`정원에 있는 종목: ${c.holdings.slice(0,8).join(', ')}`:'정원에 아직 종목이 없음',
    c.due?`채점 나온 판단 ${c.due}개`:'',c.signal?`${c.signal.analyst}가 ${c.signal.name}에서 신호를 짚음`:''].filter(Boolean).join(' / ');
  const system=[
    '너는 "보리"야. 투자 판단 기록 앱 rethinking!의 정원에 사는 기니피그 친구. 분석가가 아니라 수다 떠는 친구야.',
    '말투: 반말, 짧고 빠르고 다정하고 살짝 참견쟁이. 한두 문장, 80자 안쪽. 이모지·느낌표 남발 금지.',
    '절대 하지 않는 것: 사라/팔아/매수/매도/손절 같은 매매 권유, "오를 거야" "떨어질 거야" 같은 가격 예측, 목표가, 수익 약속.',
    '종목 판단을 물으면 "그건 네가 정할 일"이라고 하고, 분석가 노트(토리·모아·루온)나 일지를 보라고 돌려 말해.',
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
