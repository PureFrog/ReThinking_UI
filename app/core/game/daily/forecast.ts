// 예측력 (daily_quest_design 6): only a hypothesis that said, before the fact, what (a price), which way and by when is
// checked against what happened; the rest are not predictions and are counted apart. It never enters the journal
// score or XP — reading the principle well and guessing the price are different things.
//   hit / miss  the judged company's close at the deadline against its close at the scene
//   hold        the deadline is past the evaluation day (the pack has no later prices)
//   void        no target, no direction or no deadline in the player's words (not a prediction)
// A structured hypothesis (feedback F2: a target such as 판매량, an announcement date, 증가·비슷·감소) is checked against
// the value announced then, from the pack's observe list: beyond ±flat % of the base is 증가/감소, inside it 비슷.
// The structure comes from the player's own words: a word rule here, or the server's extract call (A) — which may not
// add a number or a deadline the player did not write (core/content/llm-tasks.ts checkExtract).
import {closeOf,defOf,fval,own,partsOf,splitFactor,targetOf,type DailyPack,type DailyRun,type Dir} from './model';
export type Forecast={direction:'상승'|'하락';horizon:number}|null;
export type ForecastItem={scene:string;status:'hit'|'miss'|'hold'|'void';direction?:'상승'|'하락';horizon?:number;from?:number;to?:number;change?:number;
  // a structured hypothesis: what was watched, the direction picked, what the announced change counts as
  observe?:{label:string;base:string;flat:number;dir:Dir;said?:Dir}};
// the announced change in words: inside ±flat % it is 비슷
export const dirOf=(change:number,flat:number):Dir=>change>flat?'증가':change<-flat?'감소':'비슷';
const PRICE=/(주가|주식|가격|종가|시세)/;
const UP=/(오르|오를|오른|상승|올라|높아|반등)/,DOWN=/(내리|내릴|내린|하락|떨어|낮아|빠질|빠진)/;
// "15거래일", "3주", "한 달", "2개월", "평가일까지": trading days (a week 5, a month 21)
const KO_NUM:Record<string,number>={한:1,두:2,세:3,석:3,네:4,넉:4,다섯:5,여섯:6};
export function horizonOf(text:string,evalIn:number):number|null{
  if(/평가일/.test(text))return evalIn;
  const m=/(\d+|한|두|세|석|네|넉|다섯|여섯)\s*(거래일|일|주|달|개월)/.exec(text);if(!m)return null;
  const n=Number(m[1])||KO_NUM[m[1]]||0;if(!n)return null;
  return m[2]==='거래일'?n:m[2]==='일'?Math.max(1,Math.round(n*5/7)):m[2]==='주'?n*5:n*21;
}
export function forecastOf(text:string,evalIn:number):Forecast{
  if(!PRICE.test(text))return null;
  const up=UP.test(text),down=DOWN.test(text);if(up===down)return null;// none, or both: not one direction
  const h=horizonOf(text,evalIn);if(!h)return null;
  return {direction:up?'상승':'하락',horizon:h};
}
// the server's A reply mapped to the same shape (a price target, a direction, a deadline it quoted from the player)
export function forecastFromExtract(x:{target:string;horizon:string;direction:string},evalIn:number):Forecast{
  if(x.direction!=='상승'&&x.direction!=='하락')return null;if(!PRICE.test(x.target))return null;
  const h=horizonOf(x.horizon,evalIn);return h?{direction:x.direction,horizon:h}:null;
}
export function judgeForecasts(p:DailyPack,run:DailyRun,given?:Record<string,Forecast>):{items:ForecastItem[];n:number;k:number;hold:number;void:number}{
  const q=defOf(run),items:ForecastItem[]=[];
  for(const d of run.decisions){const s=p.scenes.find(x=>x.id===d.scene);if(!s)continue;
    const st=partsOf(q,s,d.fields);
    if(st){if(!st.target||!st.period||!st.dir){items.push({scene:s.id,status:'void'});continue}
      const a=st.o.actual?.[`${st.target.id}@${st.period.id}`],ob={label:`${st.target.label} · ${st.period.label}`,base:st.o.base,flat:st.o.flat,dir:st.dir};
      if(!a){items.push({scene:s.id,status:'hold',observe:ob});continue}
      const said=dirOf(a.change,st.o.flat);items.push({scene:s.id,status:said===st.dir?'hit':'miss',change:a.change,observe:{...ob,said}});continue}
    const f=given&&d.scene in given?given[d.scene]:forecastOf(own(q,d.fields.hypo),p.evalTick-s.tick);
    if(!f){items.push({scene:s.id,status:'void'});continue}
    const end=s.tick+f.horizon;if(end>p.evalTick){items.push({scene:s.id,status:'hold',...f});continue}
    // a split in between is measured per original share (each company carries its own ledger)
    const slot=targetOf(s),from=closeOf(p,slot,s.tick),to=closeOf(p,slot,end)*fval(splitFactor(p,s.tick,end,slot)),change=(to/from-1)*100;
    items.push({scene:s.id,status:(f.direction==='상승'?change>0:change<0)?'hit':'miss',...f,from,to,change});
  }
  const decided=items.filter(i=>i.status==='hit'||i.status==='miss');
  return {items,n:decided.length,k:decided.filter(i=>i.status==='hit').length,hold:items.filter(i=>i.status==='hold').length,void:items.filter(i=>i.status==='void').length};
}
