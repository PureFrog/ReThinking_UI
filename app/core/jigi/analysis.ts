// 지기 J3 분석 (docs/jigi.md, prototype "분석"): what my graded hypotheses say, counted by code — never by the LLM.
// Hit rates come with a 95% Wilson interval and a "추가 관찰 필요" mark under 3 verdicts, so a small sample never
// reads like skill. 유형 (2026-11-19 사용자: "유형은 그 투자자가 어떤 스타일로 판단하는지") is the style of judging, read from
// what the journals say — what is looked at, how far ahead, how much conviction, what is done, whether the other side
// is written down, how often the view moves — never from hits. What the numbers say to work on (up to three) are
// 보완할 점 (findings), each with one study task, shown under 과제.
// Demo pages never mix with mine (they count only while I have none of my own); practice pages never count.
// The explaining sentences here are the rule-based fallback; LLM call C (server) may reword them from these facts.
import {live,type Journal,type Hypo} from './journal';
import {verdict,type Verdict} from './hypothesis';

export type Wilson={p:number;lo:number;hi:number};
export function wilson(k:number,n:number,z=1.96):Wilson|null{if(!n)return null;const p=k/n,z2=z*z,c=p+z2/(2*n),h=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n)),d=1+z2/n;return {p,lo:(c-h)/d,hi:(c+h)/d}}
export const MIN_N=3;
export type Row={j:Journal;h:Hypo;v:Verdict['s'];dec:boolean;hit:boolean};
export type Group={key:string;k:number;n:number;ex:number;journals:number;w:Wilson|null;p:number|null;hitJ:string|null;failJ:string|null};
function group(rows:Row[],key:(r:Row)=>string,order?:readonly string[]):Group[]{
  const g=new Map<string,Group&{js:Set<string>}>();
  for(const r of rows){const k=key(r);if(!k)continue;const o=g.get(k)??{key:k,k:0,n:0,ex:0,journals:0,w:null,p:null,hitJ:null,failJ:null,js:new Set<string>()};
    o.js.add(r.j.id);if(r.dec){o.n++;if(r.hit){o.k++;o.hitJ=r.j.id}else o.failJ=r.j.id}else o.ex++;g.set(k,o)}
  const all=[...g.values()].map(({js,...o})=>({...o,journals:js.size,w:wilson(o.k,o.n),p:o.n?o.k/o.n:null}));
  return order?order.flatMap(k=>all.filter(o=>o.key===k)):all.sort((a,b)=>b.n-a.n);
}
// the best and the worst group with enough verdicts, when they differ
export const ends=(a:Group[])=>{const e=a.filter(o=>o.n>=MIN_N).sort((x,y)=>y.p!-x.p!);return e.length>=2&&e[0].p!>e[e.length-1].p!?[e[0],e[e.length-1]] as const:null};
export const pc=(x:number)=>Math.round(x*100)+'%';
export const observe=(a:Group[],label:string)=>{const e=ends(a);return e?`${label} '${e[0].key}'에서 ${pc(e[0].p!)}, '${e[1].key}'에서 ${pc(e[1].p!)}였어요.`:`${label}별로 비교하기엔 판정된 가설이 아직 적어요.`};
export function explainGroups(a:Group[]){const e=ends(a);if(!e)return '판정이 더 쌓이면 차이를 설명해 드릴게요. 지금은 표본이 적어서 어느 쪽이 낫다고 말하기 어려워요.';
  return `'${e[0].key}'은 ${e[0].k}/${e[0].n}, '${e[1].key}'은 ${e[1].k}/${e[1].n}이에요. ${e[0].w!.lo<=e[1].w!.hi?'두 구간이 겹쳐서 우연일 수 있어요.':'차이가 꽤 뚜렷하지만 원인은 기록만으로 단정할 수 없어요.'} 두 쪽의 대표 일지를 나란히 놓고 근거가 어떻게 달랐는지 비교해 보세요.`}

export type Task={id:string;fix:string;why:string;concepts:string[];src:string;act:string;check:string};
export type Finding={id:string;name:string;one:string;ev:string[];keep:string;fix:string;enough:boolean;journals:string[];task:Task};
// the style: one name and the traits it is made of, each with what it was counted from
export type Trait={key:'basis'|'horizon'|'conf'|'act'|'counter'|'change';label:string;value:string;ev:string};
export type Style={name:string;one:string;traits:Trait[];journals:number;enough:boolean};
export type Analysis={journals:Journal[];rows:Row[];k:number;n:number;w:Wilson|null;wait:number;voided:number;demoOnly:boolean;
  dom:Group[];role:Group[];conf:Group[];ment:Group[];hz:Group[];style:Style|null;findings:Finding[];changes:{name:string;code:string;steps:{id:string;day:number;dir:string;action:string;horizon:string}[];flips:number;why:number}[];
  reviews:{n:number;yes:number}};

export function analyze(all:Journal[],opt:{periodDays?:number;code?:string;horizon?:string;now:number;today:string}):Analysis{
  const saved=live(all).filter(j=>j.status==='saved'&&!j.practice),mine=saved.filter(j=>!j.demo),demoOnly=!mine.length;
  let js=demoOnly?saved:mine;
  const pd=opt.periodDays;if(pd)js=js.filter(j=>j.createdAt>=opt.now-pd*864e5);
  if(opt.code)js=js.filter(j=>j.stock?.code===opt.code);
  if(opt.horizon)js=js.filter(j=>j.f.horizon===opt.horizon);
  const rows:Row[]=js.flatMap(j=>j.hypos.flatMap(h=>{const v=verdict(j,h,opt.today).s;if(v==='rec'||v==='posthoc'||v==='draft')return [];return [{j,h,v,dec:v==='hit'||v==='fail',hit:v==='hit'}]}));
  const dec=rows.filter(r=>r.dec),k=dec.filter(r=>r.hit).length;
  const dom=group(rows,r=>r.h.domain),role=group(rows,r=>r.h.role,['최초 전제','중간 전달 과정','자산가격 결과']),
    conf=group(rows,r=>r.j.f.conf,['매우 낮음','낮음','보통','높음','매우 높음']),ment=group(rows,r=>r.j.f.ment,['상','중','하','판단하기 어려움']),
    hz=group(rows,r=>r.j.f.horizon,['1개월','3개월','6개월','1년','3년']);
  const rate=(a:Row[])=>a.filter(r=>r.hit).length/a.length,types:Finding[]=[];
  // 1. 실적 방향은 읽는데 주가로 잇는 데서 빗나감
  const st=dom.find(o=>o.key==='기업실적'),pr=dom.find(o=>o.key==='주가');
  if(st&&pr&&st.n>=MIN_N&&pr.n>=5&&st.p!-pr.p!>=.15){const fj=[...new Set(dec.filter(r=>r.h.domain==='주가'&&!r.hit).map(r=>r.j))],m=fj.filter(j=>/기대|예상치|컨센/.test(j.f.hypo+j.f.reason)).length;
    types.push({id:'link',name:'실적 전망을 주가로 잇는 단계',one:'실적 방향은 비교적 잘 읽는데, 그게 주가로 이어지는 단계에서 더 자주 빗나가요.',
      ev:[`기업실적 전망 ${st.k}/${st.n} 적중`,`주가 전망 ${pr.k}/${pr.n} 적중`,`주가 전망이 빗나간 일지 ${fj.length}편 중 시장 기대를 적은 일지 ${m}편`],keep:'실적 방향을 먼저 확인하는 습관',fix:'시장 기대와 현재 가격을 함께 적기',
      enough:st.n>=8&&pr.n>=8,journals:[st.hitJ,pr.failJ].filter(Boolean) as string[],
      task:{id:'link',fix:'실적 전망을 주가 전망으로 잇는 과정',why:'',concepts:['실적 수준과 서프라이즈의 차이','밸류에이션','선반영'],src:'그 종목의 실적 발표자료, 발표 전 시장 예상치',act:'다음 일지에 "시장은 이미 무엇을 기대하고 있나?"를 한 문장 적기',check:'이후 일지에 시장 기대가 남는지, 주가 전망 결과가 달라지는지'}})}
  // 2. 확신이 높을 때 더 맞지 않음
  const hi=dec.filter(r=>['높음','매우 높음'].includes(r.j.f.conf)),lo=dec.filter(r=>['매우 낮음','낮음','보통'].includes(r.j.f.conf));
  if(hi.length>=4&&lo.length>=3&&rate(hi)<=rate(lo)){const hj=[...new Set(hi.map(r=>r.j))],noC=hj.filter(j=>!(j.f.opt.counter??'').trim()).length;
    types.push({id:'conf',name:'확신이 높을 때의 근거',one:'확신이 높았던 판단이 그렇지 않은 판단보다 더 정확하지는 않았어요.',
      ev:[`높은 확신 ${hi.filter(r=>r.hit).length}/${hi.length} 적중`,`보통 이하 확신 ${lo.filter(r=>r.hit).length}/${lo.length} 적중`,`높은 확신 일지 ${hj.length}편 중 반대 근거가 빈 일지 ${noC}편`],
      keep:'확신 정도를 미리 적어 두는 습관',fix:'확신이 높을수록 반대 근거 하나 남기기',enough:hi.length>=8&&lo.length>=8,journals:[hi.find(r=>!r.hit)?.j.id,lo.find(r=>r.hit)?.j.id].filter(Boolean) as string[],
      task:{id:'conf',fix:'확신이 높을 때의 근거 점검',why:'',concepts:['반대 시나리오 쓰기','근거의 질과 확신 구분하기'],src:'내 일지 중 높은 확신으로 빗나간 것',act:'확신을 "높음" 이상으로 고르면 가장 강한 반대 근거 하나 적기',check:'높은 확신 일지에 반대 근거가 남는지, 확신별 결과가 달라지는지'}})}
  // 3. 기간에 따라 결과 차이가 큼
  const he=ends(hz.filter(o=>o.n>=4));
  if(he&&he[0].p!-he[1].p!>=.2)types.push({id:'hz',name:`'${he[1].key}' 전망의 시점`,one:`'${he[0].key}' 전망과 '${he[1].key}' 전망의 결과 차이가 커요.`,ev:he.map(o=>`${o.key} 전망 ${o.k}/${o.n} 적중`),
    keep:'기한을 정하고 전망하는 습관',fix:'방향과 시점 중 무엇이 빗나갔는지 나눠 복기하기',enough:he[0].n>=8&&he[1].n>=8,journals:[he[0].hitJ,he[1].failJ].filter(Boolean) as string[],
    task:{id:'hz',fix:`'${he[1].key}' 전망의 시점 판단`,why:'',concepts:['촉매','정보가 가격에 반영되는 시차'],src:'빗나간 일지의 종료일 전후 차트와 그때 공시',act:'다음 일지에 "무엇이 언제 확인되면 움직일까?"를 한 문장 적기',check:`'${he[1].key}' 전망 결과가 달라지는지`}});
  // 4. 한 분야가 반복해서 빗나감
  const wk=dom.find(o=>o.key!=='주가'&&o.n>=4&&o.p!<=.35);
  if(wk)types.push({id:'dom',name:`'${wk.key}' 분야 전망`,one:`'${wk.key}' 분야 전망이 반복해서 빗나갔어요.`,ev:[`${wk.key} 전망 ${wk.k}/${wk.n} 적중`],keep:'분야를 나눠 가설을 적는 습관',fix:`'${wk.key}' 전망에 쓴 자료와 개념 점검`,
    enough:wk.n>=8,journals:[wk.failJ].filter(Boolean) as string[],
    task:{id:'dom',fix:`'${wk.key}' 전망의 근거 점검`,why:'',concepts:[`빗나간 '${wk.key}' 일지에서 쓴 개념 다시 정의하기`],src:`'${wk.key}' 관련 공식 통계와 그때 본 자료`,act:'빗나간 일지 하나를 골라 그때 근거와 실제 결과를 나란히 적기',check:`'${wk.key}' 전망 결과가 달라지는지`}});
  for(const t of types)t.task.why=t.ev.join(', ');
  // how my view of one stock changed across its journals
  const byCode=new Map<string,Journal[]>();for(const j of js)if(j.stock){const a=byCode.get(j.stock.code)??[];a.push(j);byCode.set(j.stock.code,a)}
  const dirOf=(j:Journal)=>j.hypos.find(h=>h.domain==='주가'&&h.dir!=='없음')?.dir??'';
  const changes=[...byCode.values()].filter(a=>a.length>=2).sort((a,b)=>b.length-a.length).slice(0,3).map(a=>{a=[...a].sort((x,y)=>x.createdAt-y.createdAt);let flips=0,why=0;
    a.forEach((j,i)=>{if(i&&dirOf(j)&&dirOf(a[i-1])&&dirOf(j)!==dirOf(a[i-1])){flips++;if(j.f.reason.trim())why++}});
    return {name:a[0].stock!.name,code:a[0].stock!.code,flips,why,steps:a.map(j=>({id:j.id,day:j.createdAt,dir:dirOf(j),action:j.f.action,horizon:j.f.horizon||'미정'}))}});
  const rf=js.filter(j=>j.reflection?.plan&&j.reflection.plan!=='거래 없음');
  return {journals:js,rows,k,n:dec.length,w:wilson(k,dec.length),wait:rows.filter(r=>['wait','data','hold'].includes(r.v)).length,voided:rows.filter(r=>r.v==='void').length,demoOnly,
    dom,role,conf,ment,hz,style:styleOf(js,changes),findings:types.slice(0,3),changes,reviews:{n:rf.length,yes:rf.filter(j=>j.reflection!.plan==='예').length}};
}
// what happened after I took a task: journals since, counter-arguments written, verdicts since
export function afterTask(all:Journal[],at:number,today:string){const aft=live(all).filter(j=>j.status==='saved'&&!j.demo&&!j.practice&&j.createdAt>=at);
  const res=aft.flatMap(j=>j.hypos.map(h=>verdict(j,h,today).s)).filter(s=>s==='hit'||s==='fail'),k=res.filter(s=>s==='hit').length;
  return {journals:aft.length,counters:aft.filter(j=>(j.f.opt.counter??'').trim()).length,n:res.length,k,w:wilson(k,res.length)}}

// ── 유형: the style of judging, from what was written (never from hits) ──────────────────────────────────────────────
// what a journal looks at: its hypotheses' fields and the words of its hypothesis, reason and sources
const BASIS:{key:string;obj:string;re:RegExp;domains:string[]}[]=[
  {key:'실적',obj:'실적을',re:/(실적|영업이익|매출|이익|분기 자료|분기보고서|재고|마진)/,domains:['기업실적']},
  {key:'업황',obj:'업황을',re:/(업황|수요|공급|경쟁사|업계|주문|점유율|고객사)/,domains:[]},
  {key:'가격 흐름',obj:'가격 흐름을',re:/(차트|이동평균|거래량|추세|반등|신고가|저점|고점|주가 흐름|많이 올랐|많이 빠졌)/,domains:['매매행동']},
  {key:'거시 흐름',obj:'거시 흐름을',re:/(금리|환율|경기|물가|고용|정책|유가|원자재)/,domains:['물가','경기','고용','통화정책','국채금리','금리스프레드','환율','원자재','지정학']},
  {key:'공시·뉴스',obj:'공시·뉴스를',re:/(뉴스|공시|발표|보도|기사|소식)/,domains:[]}];
const ACT:{key:string;label:string;of:string[]}[]=[{key:'in',label:'사서 들어가는',of:['매수','추가매수']},{key:'keep',label:'들고 가는',of:['보유']},
  {key:'watch',label:'지켜보는',of:['관찰']},{key:'out',label:'덜어내는',of:['일부매도','전량매도']}];
export const STYLE_MIN=3;
export function styleOf(js:Journal[],changes:Analysis['changes']):Style|null{
  if(js.length<STYLE_MIN)return null;
  const n=js.length,traits:Trait[]=[];
  // 1. what is looked at
  const basisCount=BASIS.map(b=>({b,c:js.filter(j=>b.re.test([j.f.hypo,j.f.reason,j.f.opt.sources??''].join(' '))||j.hypos.some(h=>b.domains.includes(h.domain))).length})).filter(x=>x.c).sort((x,y)=>y.c-x.c);
  // a tie at the top is not one basis: the style says the journals look at several together
  const ties=basisCount.filter(x=>x.c===basisCount[0]?.c),top=ties.length===1?ties[0]:null;
  traits.push({key:'basis',label:'무엇을 근거로',value:top?`${top.b.key} 중심`:ties.length?`${ties.map(x=>x.b.key).join('·')}을 함께`:'아직 뚜렷하지 않아요',ev:basisCount.slice(0,3).map(x=>`${x.b.key} ${x.c}편`).join(' · ')||'근거 낱말이 적혀 있지 않아요'});
  // 2. how far ahead
  const hzs=js.map(j=>j.f.horizon).filter((h):h is keyof typeof HZ_M=>!!h&&h in HZ_M),avg=hzs.length?hzs.reduce((s,h)=>s+HZ_M[h],0)/hzs.length:0;
  const hzWord=!hzs.length?'':avg<=3?'짧게':avg<=6?'중간 길이로':'길게';
  const hzCount=Object.entries(hzs.reduce((m,h)=>({...m,[h]:(m[h]??0)+1}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
  traits.push({key:'horizon',label:'얼마나 길게',value:!hzs.length?'기한을 정하지 않는 편':avg<=3?'짧게(석 달 안쪽)':avg<=6?'중간(반년 안팎)':'길게(1년 이상)',ev:hzCount.map(([h,c])=>`${h} ${c}편`).join(' · ')||'기한 없음'});
  // 3. how much conviction
  const cs=js.map(j=>j.f.conf).filter(Boolean),hi=cs.filter(c=>c==='높음'||c==='매우 높음').length,lo=cs.filter(c=>c==='낮음'||c==='매우 낮음').length;
  const confWord=!cs.length?'':hi/cs.length>=.5?'확신형':hi/cs.length<=.2?'신중형':'균형형';
  traits.push({key:'conf',label:'확신을 거는 방식',value:!cs.length?'확신을 적지 않는 편':confWord==='확신형'?'확신을 크게 거는 편':confWord==='신중형'?'확신을 아끼는 편':'확신을 골고루 나누는 편',ev:`높음 이상 ${hi}편 · 보통 ${cs.length-hi-lo}편 · 낮음 이하 ${lo}편`});
  // 4. what is done
  const acts=ACT.map(a=>({a,c:js.filter(j=>a.of.includes(j.f.action)).length})).filter(x=>x.c).sort((x,y)=>y.c-x.c);
  traits.push({key:'act',label:'주로 하는 일',value:acts[0]?`${acts[0].a.label} 편`:'아직 뚜렷하지 않아요',ev:acts.map(x=>`${x.a.of.join('·')} ${x.c}편`).join(' · ')||'한 일 없음'});
  // 5. the other side written down
  const counter=js.filter(j=>(j.f.opt.counter??'').trim()).length,recheck=js.filter(j=>j.f.recheck.trim()&&!j.f.recheckUnknown).length;
  traits.push({key:'counter',label:'반대쪽 생각',value:counter/n>=.5?'반대 근거를 챙기는 편':counter?'반대 근거를 가끔 적는 편':'한쪽 근거로 보는 편',ev:`반대 근거 ${counter}/${n}편 · 다시 볼 조건 ${recheck}/${n}편`});
  // 6. how often the view moves (the same stock written more than once)
  const steps=changes.reduce((s,c)=>s+c.steps.length-1,0),flips=changes.reduce((s,c)=>s+c.flips,0);
  traits.push({key:'change',label:'생각을 바꾸는 정도',value:!steps?'같은 종목 기록이 더 쌓이면 보여요':flips/steps>=.4?'생각을 자주 고쳐 보는 편':'한번 정한 방향을 지키는 편',ev:steps?`같은 종목 다시 쓴 ${steps}번 중 방향을 바꾼 ${flips}번`:'같은 종목을 두 번 이상 쓴 기록 없음'});
  const name=`${top?`${top.b.obj} 근거로 `:ties.length?'여러 근거를 함께 ':''}${hzWord?hzWord+' ':''}보는 ${confWord||'균형형'}`;
  const one=`${top?`${top.b.key} 쪽을 가장 자주 근거로 삼고, `:ties.length>1?`${ties.map(x=>x.b.key).join('·')}을 함께 근거로 삼고, `:''}${hzWord?`${hzWord} 내다보며, `:''}${traits[2].value}이에요.`;
  return {name,one,traits,journals:n,enough:n>=8};
}
const HZ_M={'1개월':1,'3개월':3,'6개월':6,'1년':12,'3년':36} as const;
