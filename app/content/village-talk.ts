// 9-5 친구 대화: 토리·모아·루온 in the village, each in its own voice. Small talk from their dialogue books (stage-free
// lines), and a line for when I pick one of my holdings (then that tree's notebook opens). No advice, no price calls.
import tori from './dialogue/tori.json';
import moa from './dialogue/moa.json';
import luon from './dialogue/luon.json';
import type {Speaker} from '../proto3d/ui/Friend';
type Book={lines:{greet:{text:string;minStage?:number;maxStage?:number}[];talk:{text:string;minStage?:number;maxStage?:number}[]}};
const plain=(b:Book,k:'greet'|'talk')=>b.lines[k].filter(l=>!l.minStage&&!l.maxStage).map(l=>l.text).concat(b.lines[k].filter(l=>l.minStage===2).map(l=>l.text));
export const VILLAGE_SPEAKERS:Record<'tori'|'moa'|'luon',Speaker&{greet:string[]}>={
  tori:{id:'tori',name:'토리',greet:plain(tori as Book,'greet'),smalls:[...plain(tori as Book,'talk'),'장부는 거짓말 안 한다 카이. 근데 읽는 사람이 서두르면 놓친다!'],
    stockLine:n=>`${n}? 좋다, 장부부터 같이 펴 보재이. 니 수첩 옆에 놓고 보자!`},
  moa:{id:'moa',name:'모아',greet:plain(moa as Book,'greet'),smalls:[...plain(moa as Book,'talk'),'오늘은 망원경으로 구름만 봤어. 그것도 나름 공부야.'],
    stockLine:n=>`${n} 나무로 가 볼까. 요즘 어떻게 움직였는지 네 수첩이랑 같이 보자.`},
  luon:{id:'luon',name:'루온',greet:plain(luon as Book,'greet'),smalls:[...plain(luon as Book,'talk'),'…다들 맞다고 하면, 난 일단 의심부터 해. 버릇이야.'],
    stockLine:n=>`…${n}. 반대로 볼 이유도 하나 적어 봐. 수첩은 저 나무 옆에 있어.`},
};
