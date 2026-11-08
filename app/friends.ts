// Friend registry (ux-spec 13.7-2). Adding a friend = one entry here + its art in public/assets/characters/.
// Saves and events refer to friends by `id`, never by position in this list.
import type {TaskId} from './visitor-tasks';
export type FriendLines={greet:string;talk:string;bye:string;farewell:string;busy:string;notice:string;
 // opens a reply to the player's memo in a tree talk
 agree:string;
 // congratulates a week that reached the calendar aim (12.2)
 cheer:string};
export type Friend={
 id:string;name:string;tag:string;color:string;
 // the gift this friend brings, and whether it is left without a name
 item:string;anonymous:boolean;
 // persona preset in app/personas.ts
 persona:string;
 lines:FriendLines;
 // optional per-task self-talk; missing tasks fall back to the persona's lines, then the task's default
 taskLines?:Partial<Record<TaskId,string>>;
 // where the standing picture comes from: a frame of the old atlas (with its off-centre anchor in the 512 frame),
 // or, for new friends, friend_<id>_idle.png drawn to the 006 rules (centred, feet 18px up)
 atlas?:{frame:number;cx:number;gap:number};
 // gift wrapping: box and ribbon colours (11.8-①)
 wrap:[number,number];
};
export const FRIENDS:Friend[]=[
 {id:'moa',name:'모아',tag:'다정한 편지 친구',color:'#d4927f',item:'위로 사탕',anonymous:false,persona:'gentle',atlas:{frame:0,cx:327,gap:0},wrap:[0xf1e3c6,0xe3a4ad],
  lines:{greet:'잠깐 놀러 왔어. 오늘도 네 속도로 자라고 있구나.',talk:'잘 자라는 날도, 쉬는 날도 있어. 혼자 서두르지 않았으면 좋겠어.',bye:'차 고마워! 다음에 또 놀러 올게.',farewell:'응, 또 얘기하자.',busy:'바쁜가 보네. 이따 또 올게.',notice:'그 옷 잘 어울린다!',agree:'함께 살펴보자. ',cheer:'이번 주에 네 번이나 들여다봤구나. 달력에 리본 걸린 거 봤어.'},
  taskLines:{sofa:'여기 앉으니까 포근하다.',read:'이 책 재밌어 보여.',window:'밖에 바람이 좋다.',flowers:'꽃 냄새 좋다.',water:'목말랐지? 물 줄게.',look:'이거 새로 놨구나!',nap:'햇볕이 따뜻해서 졸려…',follow:'같이 있을래.',watch:'오늘도 열심이네.',chase:'나비다!',stretch:'으음, 기지개!',tea:'차 한 잔 마시고 갈게.',snack:'맛있는 냄새가 나.'}},
 {id:'tori',name:'토리',tag:'씩씩한 정원 친구',color:'#c49a45',item:'여름 선글라스',anonymous:false,persona:'lively',atlas:{frame:1,cx:241,gap:4},wrap:[0xe6a36a,0x8fae76],
  lines:{greet:'왔데이! 정원 구경 좀 해도 되나? 오늘 햇살 참 좋다!',talk:'급하게 결론 내리지 말고, 근거부터 하나씩 같이 보자. 내도 옆에 있을게!',bye:'내 또 놀러 올게! 나무 잘 보고 있그래이!',farewell:'알겠데이, 또 보자!',busy:'바쁜갑네! 이따 또 올게!',notice:'오, 새 옷이네! 멋지다!',agree:'맞다, 같이 보자. ',cheer:'이번 주 4일 채웠데이! 달력에 리본 걸린 거 봤나?'},
  taskLines:{sofa:'소파 폭신하네!',read:'오, 이 책 뭐꼬?',window:'창밖 구경 좋다!',flowers:'꽃 예쁘다!',water:'물 듬뿍이다!',look:'우와, 이거 새거네!',nap:'쪼매만 잘게…',follow:'같이 가자!',watch:'뭐 하노?',chase:'나비 잡아 보자!',stretch:'으라차!',snack:'이거 쪼매 먹어도 되나?',tea:'차 맛있데이!'}},
 {id:'luon',name:'루온',tag:'조용히 챙겨주는 친구',color:'#7f93b5',item:'작은 별 조명',anonymous:true,persona:'quiet',atlas:{frame:2,cx:229,gap:2},wrap:[0xb9c7de,0x7f93b5],
  lines:{greet:'…근처에 왔다가. 잠깐 들렀어.',talk:'문 앞 상자? …글쎄. 누가 두고 갔나 보지. 따뜻하게 지내.',bye:'가볼게. …문 앞도 한번 보고.',farewell:'…응. 나중에.',busy:'…바쁜가 보네. 이따 올게.',notice:'…그거, 잘 어울려.',agree:'…확인해보자. ',cheer:'…달력에 리본. 이번 주도 잘 챙겼네.'},
  taskLines:{sofa:'…편하네.',read:'…이 책, 좋네.',window:'…구름이 느리네.',flowers:'…향이 은은하네.',water:'…촉촉해졌다.',look:'…새로 들였네.',nap:'…잠깐만.',follow:'…따라가도 되지?',watch:'……',chase:'…나비네.',stretch:'…하암.',study:'…여긴 조용하네.',bed:'…조금만 눕자.'}},
];
// How many friends can be over at the same time (13.7-4). One number to change.
export const MAX_VISITORS=3;
const byId=new Map(FRIENDS.map(f=>[f.id,f]));
export function friendById(id:string|null|undefined):Friend{return (id&&byId.get(id))||FRIENDS[0]}
export const hasFriend=(id:string)=>byId.has(id);
// The old saves stored friends by list position.
export const LEGACY_FRIEND_IDS=['moa','tori','luon'];
export function friendIdOf(v:unknown):string{return typeof v==='number'?LEGACY_FRIEND_IDS[v]??FRIENDS[0].id:typeof v==='string'&&byId.has(v)?v:FRIENDS[0].id}
// Portrait for panels and the mailbox: the atlas frame, or the friend's own idle picture.
export function portraitStyle(f:Friend):Record<string,string>{return f.atlas?{backgroundPosition:`${f.atlas.frame*50}% 0%`}:{backgroundImage:`url(/assets/characters/friend_${f.id}_idle.png)`,backgroundSize:'contain',backgroundPosition:'center'}}
