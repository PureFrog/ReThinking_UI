// LLMProvider, live (design 7: LLM_BASE_URL, LLM_API_KEY, MODEL_*). Any OpenAI-compatible chat.completions endpoint,
// strict JSON schema per task, one model per task so each can be swapped alone:
//   MODEL_EDITOR (editor-cards) · MODEL_EXTRACT (extract, call A) · MODEL_HINT (hint, call B) · MODEL_JUDGE (toulmin)
//   · MODEL_EXPLAIN (explain, call C); unset → LLM_DEFAULT (core/llmModel.ts). A timeout or a malformed reply is retried
// a limited number of times by http.ts; the caller then queues or falls back (llm-tasks.ts). Usage is returned so the
// operations screen can show cost, latency and failure rate per model.
import {ProviderError,type Ctx,type LLMProvider,type LlmTask} from '../ports';
import {chatBody,LLM_DEFAULT} from '../../llmModel';
import {need,request} from './http';
const MODEL_ENV:Record<LlmTask,string>={'editor-cards':'MODEL_EDITOR',extract:'MODEL_EXTRACT',hint:'MODEL_HINT',toulmin:'MODEL_JUDGE',explain:'MODEL_EXPLAIN'};
const OUT:Record<LlmTask,number>={'editor-cards':1200,extract:600,hint:200,toulmin:900,explain:300};
export function openAiCompatible(ctx:Ctx):LLMProvider{const P='llm';return {id:'openai-compatible',
  async run(task,schemaVersion,payload,schema,system){
    const base=(ctx.env('LLM_BASE_URL')??'https://api.openai.com/v1').replace(/\/$/,''),model=ctx.env(MODEL_ENV[task])??LLM_DEFAULT,t0=ctx.now();
    const body={...chatBody(model,[{role:'system',content:system},
      // the payload is data, never instructions: it goes in one user message as JSON
      {role:'user',content:JSON.stringify({task,schemaVersion,payload})}],{out:OUT[task],temperature:0}),
      response_format:{type:'json_schema',json_schema:{name:`${task.replace(/-/g,'_')}_${schemaVersion.replace(/\W/g,'_')}`,strict:true,schema}}};
    const r=await request<{choices?:{message?:{content?:string}}[];usage?:{prompt_tokens?:number;completion_tokens?:number}}>(ctx,
      {provider:P,url:`${base}/chat/completions`,method:'POST',body,headers:{authorization:`Bearer ${need(ctx,P,'LLM_API_KEY')}`},timeoutMs:45000,tries:2});
    const text=r.choices?.[0]?.message?.content;if(!text)throw new ProviderError(P,'shape','empty reply');
    let json:unknown;try{json=JSON.parse(text)}catch{throw new ProviderError(P,'shape','reply is not JSON')}
    return {json:json as never,model,usage:{input:r.usage?.prompt_tokens??0,output:r.usage?.completion_tokens??0},ms:ctx.now()-t0}},
}}
