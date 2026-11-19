// Live adapters for the sources whose vendor is not chosen yet (design 7: "나머지 공급사는 계약 전 교체 가능한 후보").
// Each reads ITS_BASE_URL (+ its key) and expects our normalized JSON below; when a vendor is signed, give the adapter
// a `map` that turns that vendor's reply into this shape — nothing downstream changes. Replies are checked field by
// field; a wrong shape is refused, never half-used.
//   prices   GET {MARKET_DATA_URL}/bars?instrument=&exchange=&from=&to=        → PriceSeries        (MARKET_DATA_KEY)
//   actions  GET {CORPORATE_ACTIONS_URL}/actions?instrument=&from=&to=         → CorporateAction[]  (CORPORATE_ACTIONS_KEY)
//   news     GET {NEWS_API_URL}/search?entity=&since=&until=&cursor=           → {items,cursor}     (NEWS_API_KEY)
//   macro    GET {MACRO_API_URL}/series/<id>?asOf=                             → MacroPoint[]       (MACRO_API_KEY)
//   policy   GET {POLICY_SOURCE_URL}?jurisdiction=&from=&to=                   → PolicyEvent[]
//   mentors  GET {SUPABASE_URL}/rest/v1/mentors|principles (the editor's registry, service key on the content server)
import {ProviderError,type ActionsProvider,type CorporateAction,type Ctx,type MacroPoint,type MacroProvider,type Mentor,type NewsItem,type NewsProvider,
  type PhilosophySource,type PolicyEvent,type PolicyProvider,type PriceSeries,type PricesProvider,type Principle} from '../ports';
import {need,request} from './http';
const iso=/^\d{4}-\d{2}-\d{2}/;
const str=(v:unknown)=>typeof v==='string';
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
function check(provider:string,ok:boolean,what:string){if(!ok)throw new ProviderError(provider,'shape',what)}
const q=(o:Record<string,string|null|undefined>)=>Object.entries(o).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>`${k}=${encodeURIComponent(v!)}`).join('&');
const auth=(ctx:Ctx,p:string,key:string)=>({authorization:`Bearer ${need(ctx,p,key)}`});

export function vendorPrices(ctx:Ctx,map:(raw:unknown)=>unknown=x=>x):PricesProvider{const P='prices';return {id:'vendor-prices',
  async series({instrumentId,exchange,from,to}){
    const s=map(await request(ctx,{provider:P,url:`${need(ctx,P,'MARKET_DATA_URL')}/bars?${q({instrument:instrumentId,exchange,from,to})}`,headers:auth(ctx,P,'MARKET_DATA_KEY')})) as PriceSeries;
    check(P,!!s&&str(s.currency)&&str(s.exchange)&&Array.isArray(s.bars),'series');
    for(const b of s.bars)check(P,iso.test(b.d)&&[b.o,b.h,b.l,b.c,b.v].every(num)&&b.l<=Math.min(b.o,b.c)&&b.h>=Math.max(b.o,b.c),`bar ${b?.d}`);
    return {...s,instrumentId,session:'regular',bars:[...s.bars].sort((a,b)=>a.d<b.d?-1:1)}},
}}
export function vendorActions(ctx:Ctx,map:(raw:unknown)=>unknown=x=>x):ActionsProvider{const P='actions';return {id:'vendor-actions',
  async actions({instrumentId,from,to}){
    const a=map(await request(ctx,{provider:P,url:`${need(ctx,P,'CORPORATE_ACTIONS_URL')}/actions?${q({instrument:instrumentId,from,to})}`,headers:auth(ctx,P,'CORPORATE_ACTIONS_KEY')})) as CorporateAction[];
    check(P,Array.isArray(a),'actions');
    for(const x of a)check(P,(x.kind==='split'&&num(x.ratio)&&x.ratio!>0)||(x.kind==='dividend'&&num(x.amount)&&str(x.currency)),`action ${x?.exDate}`);
    return a.map(x=>({...x,instrumentId}))},
}}
// reprints of one story (same headline, normalized) point at the first one
export function dedupeNews(items:NewsItem[]):NewsItem[]{
  const first=new Map<string,string>(),norm=(t:string)=>t.replace(/\[[^\]]*\]|\([^)]*\)|[^\p{L}\p{N}]/gu,'').toLowerCase();
  return [...items].sort((a,b)=>a.publishedAt<b.publishedAt?-1:1).map(n=>{const k=norm(n.title),f=first.get(k);if(f&&f!==n.id)return {...n,dupOf:f};first.set(k,n.id);return {...n,dupOf:null}});
}
export function vendorNews(ctx:Ctx,map:(raw:unknown)=>unknown=x=>x):NewsProvider{const P='news';return {id:'vendor-news',
  async search({entity,since,until,cursor}){
    const r=map(await request(ctx,{provider:P,url:`${need(ctx,P,'NEWS_API_URL')}/search?${q({entity,since,until,cursor})}`,headers:auth(ctx,P,'NEWS_API_KEY')})) as {items:NewsItem[];cursor:string|null};
    check(P,!!r&&Array.isArray(r.items),'search');
    for(const n of r.items)check(P,str(n.id)&&str(n.title)&&str(n.publisher)&&iso.test(n.publishedAt)&&str(n.url),`item ${n?.id}`);
    // without a body licence only the headline and its metadata are kept
    return {items:dedupeNews(r.items.map(n=>({...n,usage:n.usage==='full'?'full':'metadata-only',updatedAt:n.updatedAt??null,entities:n.entities??[entity],dupOf:null}))),cursor:r.cursor??null}},
}}
export function vendorMacro(ctx:Ctx,map:(raw:unknown)=>unknown=x=>x):MacroProvider{const P='macro';return {id:'vendor-macro',
  async series({series,asOf}){
    const a=map(await request(ctx,{provider:P,url:`${need(ctx,P,'MACRO_API_URL')}/series/${encodeURIComponent(series)}?${q({asOf})}`,headers:auth(ctx,P,'MACRO_API_KEY')})) as MacroPoint[];
    check(P,Array.isArray(a),'series');
    for(const m of a)check(P,num(m.value)&&str(m.unit)&&iso.test(m.releasedAt)&&str(m.vintage),`point ${m?.period}`);
    // the value as first released by asOf: a revision released later never stands in for it
    return a.filter(m=>m.releasedAt<=asOf)},
}}
export function policyFeed(ctx:Ctx,map:(raw:unknown)=>unknown=x=>x):PolicyProvider{const P='policy';return {id:'policy-feed',
  async events({jurisdiction,from,to}){
    const a=map(await request(ctx,{provider:P,url:`${need(ctx,P,'POLICY_SOURCE_URL')}?${q({jurisdiction,from,to})}`})) as PolicyEvent[];
    check(P,Array.isArray(a),'events');
    for(const e of a)check(P,str(e.title)&&(e.stage==='proposed'||e.stage==='final')&&iso.test(e.announcedAt)&&str(e.docUrl),`event ${e?.id}`);
    return a},
}}
// the editor's registry of masters and principles (db/migrations/009_content.sql), read with the content server's key
export function registryPhilosophy(ctx:Ctx):PhilosophySource{const P='philosophy';
  const get=<T,>(path:string)=>request<T>(ctx,{provider:P,url:`${need(ctx,P,'SUPABASE_URL')}/rest/v1/${path}`,headers:{apikey:need(ctx,P,'SUPABASE_SERVICE_ROLE_KEY'),authorization:`Bearer ${need(ctx,P,'SUPABASE_SERVICE_ROLE_KEY')}`}});
  return {id:'editor-registry',
    async mentor(id){const r=await get<{body:Mentor}[]>(`mentors?mentor_id=eq.${encodeURIComponent(id)}&select=body`);return r[0]?.body??null},
    async principles(mentorId){return (await get<{body:Principle}[]>(`principles?mentor_id=eq.${encodeURIComponent(mentorId)}&select=body`)).map(r=>r.body)}};
}
