// One line on how the stock has been moving (feedback 11-17: "어제에 비해 30%가 급격하게 떨어지며 많은 투자자들의
// 혼란을 샀어요!"), shown at the top of each journal page. Only what the bars up to today show: the last day against the
// one before, the volume against the 20 days before it, the month. No calls on what comes next, no buy/sell.
import type {Bar} from './stocks';

export const FLOW={bigDay:5/* % in a day that reads as a sharp day */,day:3,volX:2/* volume this many times the usual */,month:10/* % over ~20 days */,days:20};
const pct=(a:number,b:number)=>Math.round((a/b-1)*1000)/10;
const abs=(x:number)=>Math.abs(x).toLocaleString('ko-KR',{maximumFractionDigits:1});

export function flowLine(all:Bar[],today:string):string|null{
  const b=all.filter(x=>x.d<=today);if(b.length<2)return null;
  const last=b.at(-1)!,prev=b.at(-2)!,day=pct(last.c,prev.c);
  const before=b.slice(-FLOW.days-1,-1),vols=before.flatMap(x=>x.v!=null?[x.v]:[]);
  const volX=last.v!=null&&vols.length>=5?Math.round(last.v/(vols.reduce((s,v)=>s+v,0)/vols.length)*10)/10:null;
  const base=b.at(-FLOW.days-1)??b[0],month=pct(last.c,base.c);
  const down=day<0,word=down?'떨어졌어요':'올랐어요';
  if(Math.abs(day)>=FLOW.bigDay&&volX!=null&&volX>=FLOW.volX)
    return `어제보다 ${abs(day)}% ${down?'급하게 떨어지며':'크게 오르며'} 거래가 평소의 ${volX}배로 몰렸어요. 많은 투자자들이 ${down?'흔들린':'들썩인'} 날이에요.`;
  if(Math.abs(day)>=FLOW.bigDay)return `어제보다 ${abs(day)}% ${word}. 평소보다 훨씬 크게 움직인 하루예요.`;
  if(Math.abs(day)>=FLOW.day)return `어제보다 ${abs(day)}% ${word}. 평소보다 큰 하루예요.`;
  if(month<=-FLOW.month)return `최근 한 달 동안 ${abs(month)}% 내려왔어요. 하루하루 조금씩 미끄러진 흐름이에요.`;
  if(month>=FLOW.month)return `최근 한 달 동안 ${abs(month)}% 올라왔어요. 꾸준히 오른 흐름이에요.`;
  return `최근 한 달 ${month>=0?'+':''}${month}%, 어제보다 ${day>=0?'+':''}${day}%. 크게 흔들리지 않은 흐름이에요.`;
}
