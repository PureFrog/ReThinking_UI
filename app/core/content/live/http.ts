// The one way live adapters call out (design 7: 지수형 재시도, 요청 한도 준수, 원천·기간별 캐시). Injected fetch, so the
// tests run it against a fake. Keys go in headers built by the adapter from ctx.env, never in a URL that is logged.
import {ProviderError,type Ctx} from '../ports';
export type Req={provider:string;url:string;headers?:Record<string,string>;method?:'GET'|'POST';body?:unknown;timeoutMs?:number;tries?:number;as?:'json'|'text'};
const cache=new Map<string,Promise<unknown>>();
export const clearCache=()=>cache.clear();
const wait=(ctx:Ctx,ms:number)=>(ctx.sleep??(t=>new Promise(r=>setTimeout(r,t))))(ms);
// GET answers are cached per URL for the life of the process (a pack build); POSTs never are
export function request<T=unknown>(ctx:Ctx,r:Req):Promise<T>{
  const key=(r.method??'GET')==='GET'?`${r.as??'json'} ${r.url}`:null;
  if(key&&cache.has(key))return cache.get(key) as Promise<T>;
  const p=send<T>(ctx,r);if(key){cache.set(key,p);p.catch(()=>cache.delete(key))}
  return p;
}
async function send<T>(ctx:Ctx,r:Req):Promise<T>{
  const tries=r.tries??4;let last:unknown=null;
  for(let k=0;k<tries;k++){
    const ac=typeof AbortController!=='undefined'?new AbortController():null,timer=ac?setTimeout(()=>ac.abort(),r.timeoutMs??20000):null;
    try{
      const res=await ctx.fetch(r.url,{method:r.method??'GET',headers:{accept:r.as==='text'?'*/*':'application/json',...(r.body?{'content-type':'application/json'}:{}),...r.headers},
        body:r.body?JSON.stringify(r.body):undefined,signal:ac?.signal});
      if(res.status===429||res.status>=500){
        // the source asked us to slow down, or is having a bad moment: wait (Retry-After when given) and try again
        const ra=Number(res.headers.get('retry-after'));last=new ProviderError(r.provider,res.status===429?'rate':'http',`HTTP ${res.status}`);
        await wait(ctx,Number.isFinite(ra)&&ra>0?ra*1000:500*2**k);continue}
      if(res.status===404)throw new ProviderError(r.provider,'missing',`not found: ${r.url.replace(/[?].*$/,'')}`);
      if(!res.ok)throw new ProviderError(r.provider,'http',`HTTP ${res.status}`);
      return (r.as==='text'?await res.text():await res.json()) as T;
    }catch(e){
      if(e instanceof ProviderError&&e.code!=='rate'&&e.code!=='http')throw e;
      if(e instanceof ProviderError&&e.code==='http'&&!/HTTP 5/.test(e.message))throw e;
      last=e instanceof Error&&e.name==='AbortError'?new ProviderError(r.provider,'timeout','timed out'):e;
      await wait(ctx,500*2**k);
    }finally{if(timer)clearTimeout(timer)}
  }
  throw last instanceof ProviderError?last:new ProviderError(r.provider,'http',String(last));
}
export const need=(ctx:Ctx,provider:string,key:string)=>{const v=ctx.env(key);if(!v)throw new ProviderError(provider,'config',`${key} is not set`);return v};
export const sha=async(s:string)=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};
