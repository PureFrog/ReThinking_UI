// SEC EDGAR, live (design 7: FilingsProvider, HoldingsProvider · SEC_USER_AGENT). Public data, no key; the SEC asks
// every automated client to name itself in the User-Agent (SEC_USER_AGENT, set on the content server — never a person's
// address in the code) and to keep under 10 requests a second.
//   submissions  https://data.sec.gov/submissions/CIK##########.json     the filing list (form, filed, accepted, period)
//   companyfacts https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json   every XBRL fact with the filing it came in
//   13F          https://www.sec.gov/Archives/edgar/data/<cik>/<accession>/index.json → primary_doc.xml + information table
// Rules kept here: a fact is taken as filed by asOf (a later restatement never overwrites what was known then); 13F rows
// join by CUSIP only; an amendment is applied by its type (RESTATEMENT replaces, NEW HOLDINGS adds); 13F values before
// 2023-01-03 were reported in thousands of dollars.
import {ProviderError,type Ctx,type Filing,type FilingFact,type FilingsProvider,type Holding13F,type HoldingsProvider} from '../ports';
import {need,request} from './http';
const P='sec';
export const cik10=(cik:string)=>String(Number(String(cik).replace(/\D/g,''))).padStart(10,'0');
const headers=(ctx:Ctx)=>({'user-agent':need(ctx,P,'SEC_USER_AGENT')});
// gentle pacing: one call every 120 ms at most (under the SEC's 10/s)
let lastCall=0;
async function paced<T>(ctx:Ctx,url:string,as:'json'|'text'='json'):Promise<T>{
  const gap=lastCall+120-ctx.now();if(gap>0)await (ctx.sleep??(t=>new Promise(r=>setTimeout(r,t))))(gap);lastCall=ctx.now();
  return request<T>(ctx,{provider:P,url,headers:headers(ctx),as});
}
type Recent={accessionNumber:string[];filingDate:string[];acceptanceDateTime?:string[];form:string[];reportDate?:string[];primaryDocument?:string[]};
const quarterEnd=(q:string)=>{const m=/^(\d{4})Q([1-4])$/.exec(q);if(!m)throw new ProviderError(P,'shape',`quarter ${q}`);return `${m[1]}-${['03-31','06-30','09-30','12-31'][Number(m[2])-1]}`};
const archive=(cik:string,acc:string)=>`https://www.sec.gov/Archives/edgar/data/${Number(cik10(cik))}/${acc.replace(/-/g,'')}`;

export function secFilings(ctx:Ctx):FilingsProvider{return {id:'sec-edgar',
  async filings({cik,forms,asOf}){
    const j=await paced<{filings?:{recent?:Recent}}>(ctx,`https://data.sec.gov/submissions/CIK${cik10(cik)}.json`);
    const r=j.filings?.recent;if(!r||!Array.isArray(r.accessionNumber))throw new ProviderError(P,'shape','submissions without filings.recent');
    const out:Filing[]=[];
    r.accessionNumber.forEach((acc,i)=>{const form=r.form[i],filedAt=r.filingDate[i];
      if(forms&&!forms.includes(form.replace(/\/A$/,''))&&!forms.includes(form))return;if(filedAt>asOf)return;
      out.push({accession:acc,form,filedAt,acceptedAt:r.acceptanceDateTime?.[i]??null,periodEnd:r.reportDate?.[i]||null,issuerCik:cik10(cik),
        url:`${archive(cik,acc)}/${r.primaryDocument?.[i]??''}`,amendment:/\/A$/.test(form)})});
    return out.sort((a,b)=>a.filedAt<b.filedAt?-1:1)},
  async facts({cik,concepts,asOf}){
    type U={start?:string;end:string;val:number;accn:string;fy?:number;fp?:string;form:string;filed:string};
    const j=await paced<{facts?:Record<string,Record<string,{label?:string;units?:Record<string,U[]>}>>}>(ctx,`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10(cik)}.json`);
    if(!j.facts)throw new ProviderError(P,'shape','companyfacts without facts');
    const out:FilingFact[]=[];
    for(const name of concepts){const [ns,concept]=name.includes(':')?name.split(':'):['us-gaap',name];const f=j.facts[ns]?.[concept];if(!f)continue;
      for(const [unit,list] of Object.entries(f.units??{}))for(const u of list){if(u.filed>asOf)continue;// known by asOf only
        out.push({concept:`${ns}:${concept}`,label:f.label??concept,unit,value:u.val,start:u.start??null,end:u.end,fy:u.fy??null,fp:u.fp??null,form:u.form,accession:u.accn,filedAt:u.filed,kind:'actual'})}}
    return out},
}}

// the latest value of a fact for a period as known on asOf (the first filing wins until a later one is filed by asOf)
export function asKnown(facts:FilingFact[],concept:string,end:string,asOf:string){
  return facts.filter(f=>f.concept===concept&&f.end===end&&f.filedAt<=asOf).sort((a,b)=>a.filedAt<b.filedAt?1:-1)[0]??null;
}

// the information table, read without an XML library: one <infoTable> block per row, any namespace prefix
export function parseInfoTable(xml:string){
  const tag=(block:string,name:string)=>{const m=new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`,'i').exec(block);return m?m[1].trim():''};
  const rows:{issuer:string;securityClass:string;cusip:string;value:number;shares:number;shareType:'SH'|'PRN';putCall:'PUT'|'CALL'|null}[]=[];
  for(const m of xml.matchAll(/<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi)){const b=m[1];
    const pc=tag(b,'putCall').toUpperCase();
    rows.push({issuer:tag(b,'nameOfIssuer'),securityClass:tag(b,'titleOfClass'),cusip:tag(b,'cusip').toUpperCase(),value:Number(tag(b,'value').replace(/,/g,'')),
      shares:Number(tag(b,'sshPrnamt').replace(/,/g,'')),shareType:tag(b,'sshPrnamtType').toUpperCase()==='PRN'?'PRN':'SH',putCall:pc==='PUT'||pc==='CALL'?pc:null})}
  return rows;
}
export const amendmentTypeOf=(primaryXml:string):'RESTATEMENT'|'NEW HOLDINGS'|null=>{const m=/<(?:\w+:)?amendmentType>\s*([A-Z ]+?)\s*</i.exec(primaryXml);const t=m?.[1].toUpperCase();return t==='RESTATEMENT'||t==='NEW HOLDINGS'?t:null};
// thousands of dollars before the 2023-01-03 rule change, dollars after
export const valueUsdOf=(value:number,filedAt:string)=>filedAt<'2023-01-03'?value*1000:value;
// one quarter's holdings: the original, then each amendment in filing order (RESTATEMENT replaces, NEW HOLDINGS adds)
export function mergeQuarter(filings:{filedAt:string;amendment:boolean;amendmentType:'RESTATEMENT'|'NEW HOLDINGS'|null;rows:Holding13F[]}[]){
  let rows:Holding13F[]=[];
  for(const f of [...filings].sort((a,b)=>a.filedAt<b.filedAt?-1:a.filedAt>b.filedAt?1:Number(a.amendment)-Number(b.amendment))){
    if(!f.amendment||f.amendmentType==='RESTATEMENT')rows=[...f.rows];else rows=[...rows,...f.rows];
  }
  return rows;
}

export function secHoldings(ctx:Ctx):HoldingsProvider{return {id:'sec-13f',
  async holdings({managerCik,quarter}){
    const end=quarterEnd(quarter);
    const j=await paced<{filings?:{recent?:Recent}}>(ctx,`https://data.sec.gov/submissions/CIK${cik10(managerCik)}.json`);
    const r=j.filings?.recent;if(!r)throw new ProviderError(P,'shape','submissions without filings.recent');
    const picks=r.accessionNumber.map((acc,i)=>({acc,form:r.form[i],filedAt:r.filingDate[i],period:r.reportDate?.[i]??''})).filter(x=>/^13F-HR(\/A)?$/.test(x.form)&&x.period===end);
    if(!picks.length)return [];
    const filings=[];
    for(const p of picks){
      const idx=await paced<{directory?:{item?:{name:string}[]}}>(ctx,`${archive(managerCik,p.acc)}/index.json`);
      const names=(idx.directory?.item??[]).map(x=>x.name);
      const table=names.find(n=>/infotable.*\.xml$/i.test(n))??names.find(n=>/\.xml$/i.test(n)&&!/primary_doc/i.test(n));
      if(!table)throw new ProviderError(P,'shape',`no information table in ${p.acc}`);
      const amendment=/\/A$/.test(p.form),primary=amendment&&names.includes('primary_doc.xml')?await paced<string>(ctx,`${archive(managerCik,p.acc)}/primary_doc.xml`,'text'):'';
      const xml=await paced<string>(ctx,`${archive(managerCik,p.acc)}/${table}`,'text');
      const at=amendment?amendmentTypeOf(primary):null;
      filings.push({filedAt:p.filedAt,amendment,amendmentType:at,rows:parseInfoTable(xml).map(x=>({managerCik:cik10(managerCik),quarter,accession:p.acc,filedAt:p.filedAt,amendment,amendmentType:at,
        issuer:x.issuer,securityClass:x.securityClass,cusip:x.cusip,shares:x.shares,shareType:x.shareType,valueUsd:valueUsdOf(x.value,p.filedAt),putCall:x.putCall}))});
    }
    return mergeQuarter(filings)},
}}
