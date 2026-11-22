// First-time pointers to the places a new player would not find alone (the map, my observer, the house, the
// timelapse). One at a time, only when nothing else is going on, each once (saved). A tip waits until it makes sense:
// the house once there is a judgment to see on the shelf, the timelapse once the garden has a few weeks behind it.
export type TipId='map'|'me'|'house'|'lapse';
export type TipCtx={judgments:number;oldestDays:number};
export const TIPS:{id:TipId;text:string;when:(c:TipCtx)=>boolean}[]=[
  {id:'map',text:'지도에서 서고·광장·과수원으로 바로 갈 수 있어요',when:()=>true},
  {id:'me',text:'내 프로필: 꾸미기, 판단 기록, 업적을 볼 수 있어요',when:()=>true},
  {id:'house',text:'집을 누르면 안으로 들어가요. 책장에 내 판단이 있어요',when:c=>c.judgments>=1},
  {id:'lapse',text:'일지 → 지난 일지에서 1년 돌려보기를 할 수 있어요',when:c=>c.oldestDays>=30},
];
export function nextTip(seen:string[],c:TipCtx):TipId|null{return TIPS.find(t=>!seen.includes(t.id)&&t.when(c))?.id??null}
export const tipText=(id:TipId)=>TIPS.find(t=>t.id===id)!.text;
