// Builds the 관측소 원정 packs (docs/game.md 6) from the model repo. Node only, no packages (node:sqlite is built in).
//   GAME_SOURCE_DIR=../investment-evidence-system node tools/game/build-packs.mjs [--count 12]
// Writes public/game/packs/<id>.json, public/game/packs/index.json and tools/game/build-report.json.
// News: only title, press, time and link go into a pack. Article bodies are read in memory to count how often the
// company name appears (the same matching rule as sonjeol-game and the crash model) and are never written anywhere.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const SRC=process.env.GAME_SOURCE_DIR;
if(!SRC)throw new Error('GAME_SOURCE_DIR를 모델 저장소(investment-evidence-system) 경로로 지정해');
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const OUT=path.join(ROOT,'public/game/packs');
const REPORT=path.join(ROOT,'tools/game/build-report.json');
const COUNT=+(process.argv[process.argv.indexOf('--count')+1]||12)||12;
const PRE=60,PLAY=60,EPI=20,HORIZON=20,TIE=2,HELD=4,RESERVE=2,CASH=10_000_000;
const src=p=>path.join(SRC,p);
const csv=p=>fs.readFileSync(src(p),'utf8').replace(/^﻿/,'').trim().split(/\r?\n/).map(l=>l.split(','));

// ---- prices (KRX daily, raw prices; a window keeps only stocks with no base-price change, sonjeol SCENARIO_RULES rule-2)
const priceRows=csv('data/ohlson/05_주가_일별_2015-2019.csv').slice(2);
const prices={},baseChange={},halted={};
for(const r of priceRows){const d=`${r[0].slice(0,4)}-${r[0].slice(4,6)}-${r[0].slice(6,8)}`;(prices[r[1]]??=[]).push({d,o:+r[8],h:+r[9],l:+r[10],c:+r[5],v:+r[11],chg:+r[6]})}
for(const [code,s] of Object.entries(prices)){s.sort((a,b)=>a.d<b.d?-1:1);baseChange[code]=new Set();halted[code]=new Set();
  for(let i=1;i<s.length;i++){if(s[i-1].c+s[i].chg!==s[i].c)baseChange[code].add(s[i].d);if(!s[i].o||!s[i].v)halted[code].add(s[i].d)}}
const byDate=Object.fromEntries(Object.entries(prices).map(([c,s])=>[c,new Map(s.map(b=>[b.d,b]))]));
const index=csv('models/sudden/cache/index_daily.csv').slice(1).filter(r=>r[1]==='KOSDAQ').map(r=>[r[0],+r[2]]).sort((a,b)=>a[0]<b[0]?-1:1);
const CAL=index.map(r=>r[0]).filter(d=>d>='2015-01-02'&&d<='2019-12-30');
const idxOf=new Map(index);
const calPos=new Map(CAL.map((d,i)=>[d,i]));

// ---- names as they were on a day
const names=csv('models/sudden/output/stock_names.csv').slice(1).map(r=>({code:r[0],name:r[1],from:r[2],to:r[3]}));
const nameOn=(code,d)=>names.find(n=>n.code===code&&n.from<=d&&n.to>=d)?.name??names.find(n=>n.code===code)?.name;
const CODES=[...new Set(names.map(n=>n.code))].filter(c=>prices[c]);

// ---- crash events + the crash model's verdict and evidence labels (no quotes)
const achDir=src('models/sudden/cache/naver_full/ach');
const crashes=csv('models/sudden/output/drop_events.csv').slice(1).map(r=>{
  const id=r[0];let verdict=null,evidence=[];
  try{const a=JSON.parse(fs.readFileSync(path.join(achDir,id+'.json'),'utf8'));verdict=['가치훼손','비가치','판단보류'].includes(a.verdict)?a.verdict:null;
    const seen=new Set();for(const u of [...(a.units??[])].sort((x,y)=>(y.w??0)-(x.w??0))){const label=String(u.event??'').trim();if(!label||seen.has(label)||/^[A-Z]\d+\s/.test(label))continue;seen.add(label);evidence.push({label,dir:u.direction==='긍정'||u.direction==='부정'?u.direction:'중립'});if(evidence.length>=5)break}}catch{}
  return {kind:'crash',d:r[4],code:r[1],ret:+r[5],idx:+r[6],ar:+r[7],z:+r[9],verdict,evidence};
});

// ---- F-score (annual, with the real disclosure day)
const fsRows=csv('models/seoseohi/output/fscore_annual.csv').slice(1);
const fscore={};for(const r of fsRows){(fscore[r[0]]??=[]).push({disc:r[5],fy:+r[2],f:+r[16],items:r.slice(7,16).map(Number)})}
for(const s of Object.values(fscore))s.sort((a,b)=>a.disc<b.disc?-1:1);
const firstTradingOnOrAfter=d=>CAL.find(x=>x>=d);
const earnings=[];
for(const [code,s] of Object.entries(fscore))s.forEach((p,i)=>{const d=firstTradingOnOrAfter(p.disc);if(!d)return;const prev=s[i-1]??null;
  earnings.push({kind:'earnings',d,code,fy:p.fy,f:p.f,prevF:prev?.f??null,items:p.items,prevItems:prev?.items??null})});

// ---- Ohlson ω state (only the days it changes)
const ohlsonFile=fs.existsSync(src('models/seoseohi/ohlson/output/ohlson_daily.csv'))?'models/seoseohi/ohlson/output/ohlson_daily.csv':'models/seoseohi/output/ohlson_daily.csv';
const ohlsonAll={};{const rows=csv(ohlsonFile);const h=rows[0],iD=h.indexOf('trade_date'),iC=h.indexOf('stock_code'),iS=h.indexOf('omega_state');
  for(const r of rows.slice(1)){const s=r[iS];if(!s)continue;const list=(ohlsonAll[r[iC]]??=[]);if(!list.length||list[list.length-1][1]!==s)list.push([r[iD],s])}}

// ---- news (sonjeol fetch_feed rules: name in title or body ≥2 times; drop market-wide robot headlines; session by 15:30)
const EXCLUDE=['특징주','[시황]','마감시황','급등락주','장중','상한가','하한가','VI 발동','52주','신고가','신저가','오늘의 주요','이 시각','개장','마감]','[마감','종목 브리핑','증시 요약','로보뉴스','fnRASSI','거래비중','거래량','순매수','순매도','일일회전율','공시현황','주요 공시','기업공시','기업 공시','공시]','[공시','캘린더'];
const EXCLUDE_RE=/\d+(\.\d+)?\s*%\s*(이상\s*)?(상승|하락|급등|급락|오름|내림|오르|내리|↑|↓)|[↑↓▲▼]\s*\d+(\.\d+)?\s*%/;
const sessionOf=at=>{const d=at.slice(0,10),late=at.slice(11,16)>'15:30';return CAL.find(x=>late?x>d:x>=d)};
const newsBy={};const newsDrop={};const drop=r=>newsDrop[r]=(newsDrop[r]??0)+1;
{
  const db=new DatabaseSync(src('models/sudden/cache/naver_full/crawl.sqlite3'),{readOnly:true});
  const want=new Map();// url → Set(code)
  for(const {payload} of db.prepare("select payload from searches where status='complete'").all()){const q=JSON.parse(payload);for(const r of q.results??[]){if(!r.naver_url)continue;(want.get(r.naver_url)??want.set(r.naver_url,new Set()).get(r.naver_url)).add(q.stock_code)}}
  const getA=db.prepare('select payload from articles where url=? and status=\'complete\'');
  for(const [url,codes] of want){
    const row=getA.get(url);if(!row){drop('기사 없음');continue}
    const a=JSON.parse(row.payload);const title=a.title?.trim(),press=a.publisher?.trim(),at=a.published_at;
    if(!title||!press||!at||a.time_unknown){drop('제목·언론사·시각 누락');continue}
    if(EXCLUDE.some(w=>title.includes(w))||EXCLUDE_RE.test(title)){drop('제목 규칙');continue}
    const d=sessionOf(at);if(!d){drop('구간 밖');continue}
    if(a.modified_at&&a.modified_at>`${d}T15:30:00+09:00`){drop('마감 뒤 수정');continue}
    const body=String(a.body??'');
    const matched=[...codes].filter(c=>{const n=nameOn(c,d);if(!n)return false;if(title.includes(n))return true;let k=0,i=0;while((i=body.indexOf(n,i))>=0&&k<2){k++;i+=n.length}return k>=2});
    if(!matched.length){drop('회사 언급 부족');continue}
    for(const c of matched)(newsBy[c]??=[]).push({d,at:at.slice(0,19),t:title,p:press,u:url});
  }
  db.close();
  for(const s of Object.values(newsBy))s.sort((a,b)=>a.at<b.at?-1:1);
}

// ---- windows
const holdRet=(code,d)=>{const i=calPos.get(d);const o=byDate[code].get(CAL[i+1])?.o,c=byDate[code].get(CAL[i+HORIZON])?.c;return o&&c?(c/o-1)*100:null};
const klass=r=>r===null?'tie':r<-TIE?'cut':r>TIE?'keep':'tie';
function eligible(code,a,b){// all bars present, no base change, no halt in [a,b] calendar positions
  for(let i=a;i<=b;i++){const d=CAL[i],bar=byDate[code].get(d);if(!bar||baseChange[code].has(d)||halted[code].has(d))return false}return true}
function eventsIn(code,days){const set=new Set(days.slice(5));// no decision in the first five days (the player needs some context)
  const cr=crashes.filter(e=>e.code===code&&set.has(e.d)),er=earnings.filter(e=>e.code===code&&set.has(e.d)&&!cr.some(c=>c.d===e.d));return [...cr,...er]}
const combos=(arr,k)=>{const out=[];const rec=(s,acc)=>{if(acc.length===k){out.push(acc);return}for(let i=s;i<arr.length;i++)rec(i+1,[...acc,arr[i]])};rec(0,[]);return out};
const candidates=[];
for(let s=PRE;s+PLAY+EPI<=CAL.length;s+=5){
  const days=CAL.slice(s,s+PLAY);const a=s-PRE,b=s+PLAY+EPI-1;
  const ok=CODES.filter(c=>eligible(c,a,b));if(ok.length<HELD+RESERVE)continue;
  const ev=Object.fromEntries(ok.map(c=>[c,eventsIn(c,days)]));
  let best=null;
  for(const held of combos(ok,HELD)){
    const moments=held.flatMap(c=>ev[c]);const n=moments.length,cr=moments.filter(m=>m.kind==='crash').length,er=n-cr;
    if(n<3||n>5||cr<1)continue;
    const classes=moments.map(m=>klass(holdRet(m.code,m.d)));
    const cut=classes.filter(x=>x==='cut').length,keep=classes.filter(x=>x==='keep').length;
    const score=n+(er>=1?2:0)+(cut&&keep?2:0)-Math.abs(cut-keep)*.5+new Set(moments.map(m=>m.verdict).filter(Boolean)).size*.5;
    if(!best||score>best.score)best={held,moments,classes,cut,keep,score};
  }
  if(!best)continue;
  // reserves: companies whose own moments fall in the second half, so a swap can matter
  const rest=ok.filter(c=>!best.held.includes(c)).sort((x,y)=>ev[y].filter(e=>e.d>=days[30]).length-ev[x].filter(e=>e.d>=days[30]).length||x.localeCompare(y));
  candidates.push({s,days,...best,reserve:rest.slice(0,RESERVE)});
}
// pick COUNT windows that don't share play days, keep 정리-better vs 지킴-better near even, spread the years
const chosen=[];let cut=0,keep=0;
const ranked=[...candidates].sort((x,y)=>y.score-x.score||x.s-y.s);
for(const relax of [0,1,2,99]){
  for(const c of ranked){
    if(chosen.length>=COUNT)break;
    if(chosen.includes(c)||chosen.some(o=>Math.abs(o.s-c.s)<PLAY))continue;
    const nc=cut+c.cut,nk=keep+c.keep;if(Math.abs(nc-nk)>Math.max(2,relax*2+Math.round((nc+nk)*.15)))continue;
    if(chosen.filter(o=>CAL[o.s].slice(0,4)===CAL[c.s].slice(0,4)).length>=Math.ceil(COUNT/4)+relax)continue;
    chosen.push(c);cut=nc;keep=nk;
  }
}
chosen.sort((x,y)=>x.s-y.s);

// ---- write packs
const season=d=>{const m=+d.slice(5,7);return m<=2||m===12?'겨울':m<=5?'봄':m<=8?'여름':'가을'};
fs.mkdirSync(OUT,{recursive:true});
for(const f of fs.readdirSync(OUT))if(f.endsWith('.json'))fs.rmSync(path.join(OUT,f));
const report={built:new Date().toISOString(),source:path.basename(SRC),rules:{PRE,PLAY,EPI,HORIZON,TIE_PP:TIE,HELD,RESERVE},candidates:candidates.length,newsDropped:newsDrop,packs:[],balance:{}};
const idx={v:1,built:report.built.slice(0,10),packs:[]};
for(const c of chosen){
  const a=c.s-PRE,b=c.s+PLAY+EPI-1,span=CAL.slice(a,b+1),first=c.days[0],last=c.days[c.days.length-1];
  const codes=[...c.held,...c.reserve];const slots='ABCDEFG';
  const companies=codes.map((code,i)=>{const held=i<HELD;const pre=byDate[code].get(CAL[c.s-1]).c;return {code,name:nameOn(code,first),slot:slots[i],start:held?'held':'reserve',qty:held?Math.floor(CASH/HELD/pre):0}});
  const cash=CASH-companies.reduce((s,x)=>s+x.qty*byDate[x.code].get(CAL[c.s-1]).c,0);
  const prices=Object.fromEntries(codes.map(code=>[code,span.map(d=>{const x=byDate[code].get(d);return [d,x.o,x.h,x.l,x.c,x.v]})]));
  const dayset=new Set(c.days);
  const events=codes.flatMap(code=>eventsIn(code,c.days)).sort((x,y)=>x.d<y.d?-1:1);
  const newsMap=new Map();for(const code of codes)for(const n of newsBy[code]??[]){if(!dayset.has(n.d))continue;const e=newsMap.get(n.u)??{...n,codes:[]};e.codes.push(code);newsMap.set(n.u,e)}
  const news=[...newsMap.values()].sort((x,y)=>x.at<y.at?-1:1);
  const i0=idxOf.get(first),i1=idxOf.get(last),ir=(i1/i0-1)*100;
  const regime=ir>5?'상승장':ir<-5?'하락장':'박스권';
  const y0=first.slice(0,4),y1=last.slice(0,4),s0=season(first),s1=season(last);
  const titleRevealed=y0===y1?`${y0}년 ${s0===s1?s0:s0+'~'+s1}`:`${y0}년 ${s0} ~ ${y1}년 ${s1}`;
  const id=crypto.createHash('sha1').update(first+codes.join()).digest('hex').slice(0,8);
  const pack={v:1,id,titleHidden:'사건 파일 · ????년',titleRevealed,
    summaryRevealed:`${first} ~ ${last} · 코스닥 지수 ${i0.toFixed(2)} → ${i1.toFixed(2)} (${ir>=0?'+':''}${ir.toFixed(1)}%)`,regime,
    days:c.days,preDays:PRE,epiDays:EPI,cash,companies,prices,index:span.map(d=>[d,idxOf.get(d)]),news,events,
    fscore:Object.fromEntries(codes.map(code=>[code,(fscore[code]??[]).filter(p=>p.disc<=last)])),
    ohlson:Object.fromEntries(codes.map(code=>{const s=ohlsonAll[code]??[];const before=s.filter(([d])=>d<CAL[a]).slice(-1);return [code,[...before,...s.filter(([d])=>d>=CAL[a]&&d<=last)]]}))};
  const body=JSON.stringify(pack);fs.writeFileSync(path.join(OUT,id+'.json'),body);
  idx.packs.push({id,regime,decisions:c.moments.length,titleHidden:pack.titleHidden});
  report.packs.push({id,from:first,to:last,regime,index:+ir.toFixed(1),held:c.held.map(x=>nameOn(x,first)),reserve:c.reserve.map(x=>nameOn(x,first)),
    decisions:c.moments.map((m,k)=>({d:m.d,kind:m.kind,company:nameOn(m.code,m.d),verdict:m.verdict??undefined,hold20:+(holdRet(m.code,m.d)??0).toFixed(1),better:c.classes[k]})),
    news:news.length,kb:Math.round(body.length/1024)});
}
const all=report.packs.flatMap(p=>p.decisions);
report.balance={decisions:all.length,cutBetter:all.filter(x=>x.better==='cut').length,keepBetter:all.filter(x=>x.better==='keep').length,tie:all.filter(x=>x.better==='tie').length};
fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx,null,1));
fs.writeFileSync(REPORT,JSON.stringify(report,null,1));
console.log(`candidates ${candidates.length}, packs ${chosen.length}`);
for(const p of report.packs)console.log(`${p.id} ${p.from}~${p.to} ${p.regime} 결정 ${p.decisions.length} 뉴스 ${p.news} ${p.kb}KB · ${p.decisions.map(d=>d.better).join(',')}`);
console.log('balance',report.balance);
