// 지기 J3 분석 (docs/jigi.md, prototype "분석"): what my graded hypotheses say, counted by code — never by the LLM.
// Hit rates come with a 95% Wilson interval and a "추가 관찰 필요" mark under 3 verdicts, so a small sample never
// reads like skill. Types (up to three) are named only when the numbers hold them up; each brings one study task.
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
export type Type={id:string;name:string;one:string;ev:string[];keep:string;fix:string;enough:boolean;journals:string[];task:Task};
export type Analysis={journals:Journal[];rows:Row[];k:number;n:number;w:Wilson|null;wait:number;voided:number;demoOnly:boolean;
  dom:Group[];role:Group[];conf:Group[];ment:Group[];hz:Group[];types:Type[];changes:{name:string;code:string;steps:{id:string;day:number;dir:string;action:string;horizon:string}[];flips:number;why:number}[];
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
  const rate=(a:Row[])=>a.filter(r=>r.hit).length/a.length,types:Type[]=[];
  // 1. 실적 방향은 읽는데 주가로 잇는 데서 빗나감
  const st=dom.find(o=>o.key==='기업실적'),pr=dom.find(o=>o.key==='주가');
  if(st&&pr&&st.n>=MIN_N&&pr.n>=5&&st.p!-pr.p!>=.15){const fj=[...new Set(dec.filter(r=>r.h.domain==='주가'&&!r.hit).map(r=>r.j))],m=fj.filter(j=>/기대|예상치|컨센/.test(j.f.hypo+j.f.reason)).length;
    types.push({id:'link',name:'실적은 읽고 주가 연결은 보완할 유형',one:'실적 방향은 비교적 잘 읽는데, 그게 주가로 이어지는 단계에서 더 자주 빗나가요.',
      ev:[`기업실적 전망 ${st.k}/${st.n} 적중`,`주가 전망 ${pr.k}/${pr.n} 적중`,`주가 전망이 빗나간 일지 ${fj.length}편 중 시장 기대를 적은 일지 ${m}편`],keep:'실적 방향을 먼저 확인하는 습관',fix:'시장 기대와 현재 가격을 함께 적기',
      enough:st.n>=8&&pr.n>=8,journals:[st.hitJ,pr.failJ].filter(Boolean) as string[],
      task:{id:'link',fix:'실적 전망을 주가 전망으로 잇는 과정',why:'',concepts:['실적 수준과 서프라이즈의 차이','밸류에이션','선반영'],src:'그 종목의 실적 발표자료, 발표 전 시장 예상치',act:'다음 일지에 "시장은 이미 무엇을 기대하고 있나?"를 한 문장 적기',check:'이후 일지에 시장 기대가 남는지, 주가 전망 결과가 달라지는지'}})}
  // 2. 확신이 높을 때 더 맞지 않음
  const hi=dec.filter(r=>['높음','매우 높음'].includes(r.j.f.conf)),lo=dec.filter(r=>['매우 낮음','낮음','보통'].includes(r.j.f.conf));
  if(hi.length>=4&&lo.length>=3&&rate(hi)<=rate(lo)){const hj=[...new Set(hi.map(r=>r.j))],noC=hj.filter(j=>!(j.f.opt.counter??'').trim()).length;
    types.push({id:'conf',name:'높은 확신을 다시 볼 유형',one:'확신이 높았던 판단이 그렇지 않은 판단보다 더 정확하지는 않았어요.',
      ev:[`높은 확신 ${hi.filter(r=>r.hit).length}/${hi.length} 적중`,`보통 이하 확신 ${lo.filter(r=>r.hit).length}/${lo.length} 적중`,`높은 확신 일지 ${hj.length}편 중 반대 근거가 빈 일지 ${noC}편`],
      keep:'확신 정도를 미리 적어 두는 습관',fix:'확신이 높을수록 반대 근거 하나 남기기',enough:hi.length>=8&&lo.length>=8,journals:[hi.find(r=>!r.hit)?.j.id,lo.find(r=>r.hit)?.j.id].filter(Boolean) as string[],
      task:{id:'conf',fix:'확신이 높을 때의 근거 점검',why:'',concepts:['반대 시나리오 쓰기','근거의 질과 확신 구분하기'],src:'내 일지 중 높은 확신으로 빗나간 것',act:'확신을 "높음" 이상으로 고르면 가장 강한 반대 근거 하나 적기',check:'높은 확신 일지에 반대 근거가 남는지, 확신별 결과가 달라지는지'}})}
  // 3. 기간에 따라 결과 차이가 큼
  const he=ends(hz.filter(o=>o.n>=4));
  if(he&&he[0].p!-he[1].p!>=.2)types.push({id:'hz',name:'기간을 다시 맞출 유형',one:`'${he[0].key}' 전망과 '${he[1].key}' 전망의 결과 차이가 커요.`,ev:he.map(o=>`${o.key} 전망 ${o.k}/${o.n} 적중`),
    keep:'기한을 정하고 전망하는 습관',fix:'방향과 시점 중 무엇이 빗나갔는지 나눠 복기하기',enough:he[0].n>=8&&he[1].n>=8,journals:[he[0].hitJ,he[1].failJ].filter(Boolean) as string[],
    task:{id:'hz',fix:`'${he[1].key}' 전망의 시점 판단`,why:'',concepts:['촉매','정보가 가격에 반영되는 시차'],src:'빗나간 일지의 종료일 전후 차트와 그때 공시',act:'다음 일지에 "무엇이 언제 확인되면 움직일까?"를 한 문장 적기',check:`'${he[1].key}' 전망 결과가 달라지는지`}});
  // 4. 한 분야가 반복해서 빗나감
  const wk=dom.find(o=>o.key!=='주가'&&o.n>=4&&o.p!<=.35);
  if(wk)types.push({id:'dom',name:'한 분야를 더 공부할 유형',one:`'${wk.key}' 분야 전망이 반복해서 빗나갔어요.`,ev:[`${wk.key} 전망 ${wk.k}/${wk.n} 적중`],keep:'분야를 나눠 가설을 적는 습관',fix:`'${wk.key}' 전망에 쓴 자료와 개념 점검`,
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
    dom,role,conf,ment,hz,types:types.slice(0,3),changes,reviews:{n:rf.length,yes:rf.filter(j=>j.reflection!.plan==='예').length}};
}
// what happened after I took a task: journals since, counter-arguments written, verdicts since
export function afterTask(all:Journal[],at:number,today:string){const aft=live(all).filter(j=>j.status==='saved'&&!j.demo&&!j.practice&&j.createdAt>=at);
  const res=aft.flatMap(j=>j.hypos.map(h=>verdict(j,h,today).s)).filter(s=>s==='hit'||s==='fail'),k=res.filter(s=>s==='hit').length;
  return {journals:aft.length,counters:aft.filter(j=>(j.f.opt.counter??'').trim()).length,n:res.length,k,w:wilson(k,res.length)}}
