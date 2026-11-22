// 관측소 원정: what each analyst says when time stops (docs/game.md 4-1·4-2). Their voices (redesign 2장): tori counts,
// moa reacts fast, luon asks back. They say what the models saw; none tells the player what to do or where prices go.
import type {CrashEvent,EarningsEvent} from '../core/game/pack';
const pp=(x:number)=>`${x>0?'+':x<0?'−':''}${Math.abs(x).toFixed(2)}%`;
export type Read={who:'tori'|'moa'|'luon';text:string};

// stats: when no F-score was computed for the period (the 2023~ packs), tori counts the tape instead
export function crashReads(e:CrashEvent,f:{now:number;prev:number|null}|null,pinned:number,stats?:{ret20:number;volX:number}):Read[]{
  const pos=e.evidence.filter(x=>x.dir==='긍정').length,neg=e.evidence.filter(x=>x.dir==='부정').length;
  const moa=e.evidence.length?`근거 ${e.evidence.length}개 잡혔어! 긍정 ${pos}, 부정 ${neg}.`:'이번 급락엔 잡힌 근거가 없어.';
  const tori=!f?(stats?`20일 전보다 ${pp(stats.ret20)}. 거래량은 평소의 ${stats.volX.toFixed(1)}배.`:'공시된 F-score가 아직 없어.'):f.prev===null?`F-score ${f.now}. 비교할 전년 숫자는 없어.`:f.now===f.prev?`F-score 작년 ${f.prev}, 올해 ${f.now}. 그대로야.`:`F-score ${f.prev}에서 ${f.now}. ${Math.abs(f.now-f.prev)}점 ${f.now>f.prev?'올랐어':'내려갔어'}.`;
  const sameWay=e.idx<-1;
  const luon=sameWay?`시장도 ${pp(e.idx)}였어. 얼마가 시장 탓이야?`:`시장은 ${pp(e.idx)}였어. 이 회사만 빠진 이유는?`;
  return [{who:'moa',text:pinned?`${moa} 핀 꽂은 뉴스 ${pinned}개.`:moa},{who:'tori',text:tori},{who:'luon',text:luon}];
}

export function earningsReads(e:EarningsEvent,newsNear:number):Read[]{
  const on=e.prevItems?e.items.filter((v,i)=>v&&!e.prevItems![i]).length:0,off=e.prevItems?e.items.filter((v,i)=>!v&&e.prevItems![i]).length:0;
  const tori=e.prevF===null?`F-score ${e.f}. 전년 숫자는 없어.`:`F-score ${e.prevF}에서 ${e.f}. 켜진 ${on}개, 꺼진 ${off}개.`;
  const moa=newsNear?`실적 날이야! 최근 닷새 뉴스 ${newsNear}개.`:'실적 날이야! 근처에 뉴스는 조용해.';
  const luon=e.prevF!==null&&e.f===e.prevF?'숫자가 그대로면 뭘 보고 고를 거야?':'켜진 것과 꺼진 것, 무게가 같을까?';
  return [{who:'tori',text:tori},{who:'moa',text:moa},{who:'luon',text:luon}];
}
// the reveal's line from each, by how the run went
export function revealReads(hits:number,n:number,total:number):Read[]{
  return [{who:'tori',text:`결정 ${n}개 중 적중 ${hits}개. 점수 ${total}.`},
    {who:'moa',text:hits*2>=n?'반 넘게 맞았어! 칩 건 데가 좋았어.':'빗나간 것부터 다시 보자!'},
    {who:'luon',text:'칩을 제일 많이 건 결정, 그 이유는 맞았어?'}];
}
// the first run's coach (game/Coach.tsx): a few lines per part, each pointing at the thing it explains. Shown once
// (until the first run is saved), skippable. Same voices and rules as above.
export type CoachStep={target:string;who:Read['who'];text:string};
export const COACH:Record<'brief'|'flow'|'moment'|'reveal',CoachStep[]>={
  brief:[{target:'.gx-co',who:'moa',text:'회사 이름은 먹줄로 가렸어! 끝에 공개할게.'},
    {target:'.gx-chips',who:'tori',text:'칩은 확신이야. 결정마다 한 개에서 네 개.'},
    {target:'.gx-chips',who:'tori',text:'맞히면 칩×10점, 빗나가면 칩×10점 깎여.'}],
  flow:[{target:'.gx-chart',who:'moa',text:'선 끝이 오늘 가격! 하루 3초씩 흘러.'},
    {target:'.gx-book',who:'tori',text:'주문은 다음 날 아침 시가에 체결돼.'},
    {target:'.gx-feed',who:'moa',text:'뉴스가 떠. 중요해 보이면 핀을 꽂아 둬!'},
    {target:'.gx-speed',who:'luon',text:'급락이나 실적 날엔 시간이 멈춰. 거기가 진짜야.'}],
  moment:[{target:'.gx-reads',who:'luon',text:'셋의 말과 차트 주석을 봐. 눌러도 돼.'},
    {target:'.gx-choices',who:'tori',text:'지킴은 그대로, 절반은 반, 정리는 다 팔기.'},
    {target:'.gx-choices',who:'moa',text:'정리하면 새 회사가 들어와. 누군지는 비밀!'},
    {target:'.gx-stake',who:'tori',text:'확실할수록 칩을 많이. 30초 안에 골라.'}],
  reveal:[{target:'.gx-score',who:'luon',text:'결정마다 반대로 했으면, 20일 뒤를 비교해.'},
    {target:'.gx-score',who:'tori',text:'점수는 수익이 아니라 판단이야.'}],
};
