// G0 mockup sample: pulls 2017 prices, crash events, F-scores and crash-linked headlines (title/press/time/url only) from the model repo.
// usage: GAME_SOURCE_DIR=../investment-evidence-system node tools/game/mockup-data.cjs > writes data.json in $TMP/g0
const fs=require('fs'),path=require('path'),S=(process.env.GAME_SOURCE_DIR||'').replace(/[\/]?$/,'/');if(!process.env.GAME_SOURCE_DIR)throw new Error('set GAME_SOURCE_DIR');
const A='2017-07-03',B='2017-10-20';const codes=['010170','032620','093190','059090','097800'];
const csv=f=>fs.readFileSync(S+f,'utf8').replace(/^\uFEFF/,'').trim().split('\n').map(l=>l.split(','));
const px=csv('data/ohlson/05_주가_일별_2015-2019.csv').slice(2);
const out={prices:{},index:[],news:[],fscore:{},crash:null,names:{}};
for(const r of px){const d=r[0].slice(0,4)+'-'+r[0].slice(4,6)+'-'+r[0].slice(6);if(d<A||d>B||!codes.includes(r[1]))continue;out.names[r[1]]=r[2];(out.prices[r[1]]??=[]).push([d,+r[8],+r[9],+r[10],+r[5],+r[11]]);}
for(const r of csv('models/sudden/cache/index_daily.csv').slice(1)){if(r[0]>=A&&r[0]<=B)out.index.push([r[0],+r[2]])}
for(const r of csv('models/seoseohi/output/fscore_annual.csv').slice(1)){if(codes.includes(r[0]))(out.fscore[r[0]]??=[]).push({fy:+r[2],disc:r[5],f:+r.at(-1),items:r.slice(7,16).map(Number)})}
const links=codes.flatMap(c=>{try{return fs.readFileSync(S+'models/sudden/cache/naver_full/event_links_'+c+'.jsonl','utf8').trim().split('\n').map(JSON.parse)}catch{return[]}}).filter(l=>{const m=l.drop_id.slice(7,13);return m>='201707'&&m<='201710'});
const want=new Set(links.map(l=>l.url));
for(const line of fs.readFileSync(S+'models/sudden/cache/naver_full/articles.jsonl','utf8').split('\n')){if(!line)continue;let a;try{a=JSON.parse(line)}catch{continue}if(want.has(a.url))out.news.push({t:a.title,p:a.publisher,at:a.published_at,u:a.url,ev:links.find(l=>l.url===a.url).drop_id})}
const s=JSON.parse(fs.readFileSync(S+'contracts/sudden_result.json','utf8'));out.crash=s.cases.find(c=>c.drop_id==='010170_20170817');
if(out.crash){out.crash={verdict:out.crash.verdict,hyp:out.crash.hypothesis,ar:out.crash.ar_pct,ev:out.crash.evidence.map(e=>({l:e.label,dir:e.direction,src:e.source,type:e.type}))}}
const outFile=process.env.OUT||path.join(process.env.TMP||'.','g0','data.json');fs.mkdirSync(path.dirname(outFile),{recursive:true});fs.writeFileSync(outFile,JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out.prices).map(([k,v])=>[k,v.length])),out.index.length,out.names);console.log(JSON.stringify(out.fscore).slice(0,900));console.log(out.news.map(n=>n.at.slice(0,16)+' '+n.p+' | '+n.t+' ['+n.ev+']').join('\n'));console.log(JSON.stringify(out.crash,null,0));
