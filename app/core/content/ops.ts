// The operations view (design 7: 운영 화면에서 모델별 비용·대기시간·실패율 및 편집자 수정률을 조회한다). Every model call is
// recorded — task, model, ok or why not, time, tokens; never the prompt or the reply — and summed here per task and
// model. The editors' revision rate is how many of the editing model's first drafts a person changed before upload.
import type {LLMProvider,LlmTask} from './ports';
export type OpsRow={at:string;fn:string;task:LlmTask;model:string;ok:boolean;ms:number;input:number;output:number;error:string|null};
// wrap a provider so each call leaves one row (the caller decides where rows go: a table on the server)
export function withOps(llm:LLMProvider,fn:string,record:(r:OpsRow)=>void):LLMProvider{
  return {id:llm.id,async run<T>(task:LlmTask,v:string,payload:unknown,schema:Record<string,unknown>,system:string){const t0=Date.now();
    try{const r=await llm.run<T>(task,v,payload,schema,system);record({at:new Date().toISOString(),fn,task,model:r.model,ok:true,ms:r.ms||Date.now()-t0,input:r.usage.input,output:r.usage.output,error:null});return r}
    catch(e){record({at:new Date().toISOString(),fn,task,model:'?',ok:false,ms:Date.now()-t0,input:0,output:0,error:String((e as Error).message??e).slice(0,120)});throw e}}};
}
// a validator refusing a reply is a failure too, recorded by the caller with this
export const refusedRow=(fn:string,task:LlmTask,model:string,why:string):OpsRow=>({at:new Date().toISOString(),fn,task,model,ok:false,ms:0,input:0,output:0,error:`refused: ${why}`});
export type OpsLine={task:string;model:string;calls:number;failures:number;failRate:number;avgMs:number;p50Ms:number;input:number;output:number};
export function summarizeOps(rows:OpsRow[]):OpsLine[]{
  const by=new Map<string,OpsRow[]>();for(const r of rows){const k=`${r.task}|${r.model}`;by.set(k,[...(by.get(k)??[]),r])}
  return [...by].map(([k,rs])=>{const [task,model]=k.split('|'),ms=rs.filter(r=>r.ok).map(r=>r.ms).sort((a,b)=>a-b),fail=rs.filter(r=>!r.ok).length;
    return {task,model,calls:rs.length,failures:fail,failRate:rs.length?fail/rs.length:0,avgMs:ms.length?Math.round(ms.reduce((s,x)=>s+x,0)/ms.length):0,
      p50Ms:ms.length?ms[Math.floor((ms.length-1)/2)]:0,input:rs.reduce((s,r)=>s+r.input,0),output:rs.reduce((s,r)=>s+r.output,0)}}).sort((a,b)=>a.task<b.task?-1:a.task>b.task?1:b.calls-a.calls);
}
// uploads carry {drafted, edited}: how many cards the model drafted and how many of those a person changed
export function revisionRate(uploads:{drafted:number;edited:number}[]){const d=uploads.reduce((s,u)=>s+u.drafted,0),e=uploads.reduce((s,u)=>s+u.edited,0);return {drafted:d,edited:e,rate:d?e/d:null}}
