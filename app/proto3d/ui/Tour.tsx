'use client';
// 튜토리얼 (게임 구성 2026-11-20): the first time out of the door, 보리 walks the player round the village. The camera
// goes to each place while 보리 says what it is: the three friends and their models, my real field and the first
// journal (coins), the shop and the start money for virtual stocks, the quest board, the pond, the plaza and the
// wardrobe. A step can wait for the player to do the thing (write the journal, open the shop) or be skipped.
import {ANALYSTS,MODEL_INFO,type AnalystId} from '../../content/analysts';
import {won} from '../../core/won';

export type TourStep={id:string;at:'none'|AnalystId|'farm'|'orchard'|'cart'|'pond'|'plaza'|'player';line:string;
  act?:{label:string;go:'journal'|'shop'|'quests'};next?:string};
export function tourSteps(o:{journal:number;grant:number;firstTree:string|null}):TourStep[]{
  const a=(id:AnalystId)=>{const x=ANALYSTS.find(y=>y.id===id)!,m=MODEL_INFO[x.models[0]];return {x,m}};
  const t=a('tori'),m=a('moa'),l=a('luon');
  return [
    {id:'hello',at:'none',line:'나왔네! 마을 한 바퀴 같이 돌자. 친구들부터 소개할게. 다들 자기 자리를 지키고 있어.'},
    {id:'tori',at:'tori',line:`${t.x.name}야. ${t.m.name} 분석으로 수익성이 어디서 나오는지 쪼개 봐. 장사를 잘해서인지, 빚 덕분인지.`},
    {id:'moa',at:'moa',line:`${m.x.name}는 ${m.m.name} 모델로 회사에 부실 위험이 있는지 봐. 버틸 힘이 있는지부터.`},
    {id:'luon',at:'luon',line:`${l.x.name}은 ${l.m.name}로 재무 체력이 작년보다 나아졌는지 아홉 칸으로 따져.`},
    {id:'farm',at:'farm',line:`여기가 네 실제 종목 밭이야. ${opt(o.firstTree)}나무를 눌러 첫 일지를 써 봐. 일지를 쓰면 코인 ${won(o.journal)}을 받아.`,
      act:{label:'첫 일지 쓰러 가기',go:'journal'},next:'나중에 쓸게'},
    {id:'shop',at:'cart',line:`처음 온 선물로 코인 ${won(o.grant)}을 넣어 뒀어. 상점에서 가상 종목을 실제 가격으로 사 봐. 산 종목은 과수원에 심어지고, 오르면 코인이 늘어.`,
      act:{label:'상점 열어 보기',go:'shop'},next:'다음에 볼게'},
    {id:'orchard',at:'orchard',line:'저기가 가상 종목 밭(과수원)이야. 실제 종목 밭이랑 따로 자라.'},
    {id:'quests',at:'none',line:'오늘 할 일은 왼쪽 위 날씨 밑 "오늘 퀘스트"에 떠. 오늘의 퀴즈, 일지 한 편, 낚시 한 번을 다 하면 코인을 더 줘. 제목을 누르면 접었다 펼 수 있어.'},
    {id:'pond',at:'pond',line:'여기가 낚시터야. 나루랑 낚시할 수 있어. 하루 세 번, 잡은 물고기만큼 코인이 들어와.'},
    {id:'plaza',at:'plaza',line:'광장에 가면 다른 사람들 마을을 구경할 수 있어.'},
    {id:'wear',at:'player',line:'옷이랑 꾸미기는 상점에서 사고, 옷은 집 옷장에서 갈아입어. 물건에 마우스를 올리면 뭔지 알려 줄게.'},
    {id:'end',at:'none',line:'이제 마음대로 다녀. 내일부터는 집에서 오늘의 퀴즈를 풀고 나오면 돼. 레벨이 오르면 서랍 속 사건철도 열려.'},
  ];
}
const opt=(n:string|null)=>n?`${n} `:'';
export function Tour({step,n,total,onNext,onAct,onSkip}:{step:TourStep;n:number;total:number;onNext:()=>void;onAct:(go:'journal'|'shop'|'quests')=>void;onSkip:()=>void}){
  const last=n===total-1;
  return <div className="rt-talk vl-tour" role="dialog" aria-label="보리의 마을 안내" data-step={step.id}>
    <button type="button" className="rt-talk-leave" onClick={onSkip}>안내 건너뛰기</button>
    <div className="rt-talk-choices" role="group" aria-label="대답">
      {step.act&&<button type="button" className="rt-talk-choice first" onClick={()=>onAct(step.act!.go)}>{step.act.label}</button>}
      <button type="button" className={'rt-talk-choice'+(step.act?'':' first')} onClick={onNext}>{last?'시작하기':step.next??'다음'}</button></div>
    <div className="rt-talk-box"><span className="rt-talk-name" data-who="bori">보리</span>
      <p className="rt-talk-line" aria-live="polite">{step.line}</p><span className="vl-tour-n rt-num">{n+1}/{total}</span></div>
  </div>;
}
