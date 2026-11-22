// Which OpenAI model the server functions use, and how to ask it (db/functions/*: friend-chat, jigi-llm, portfolio-read).
// Default GPT-6 Luna (2026-11-16, user's pick for fewer token costs): about $0.10 / 1M input and $0.50 / 1M output
// (third-party price lists; check OpenAI's own sheet), against gpt-4.1-mini's $0.40 / $1.60. A reasoning model: it
// takes max_completion_tokens (thinking counts toward it) and reasoning_effort, and may refuse temperature.
// OPENAI_MODEL / OPENAI_VISION_MODEL in the Supabase secrets switch models without a code change.
export const LLM_DEFAULT='gpt-6-luna';
// the picture reader: Luna's image input is not confirmed yet; set OPENAI_VISION_MODEL=gpt-6-luna once it is
export const VISION_DEFAULT='gpt-4.1-mini';
export const isReasoning=(model:string)=>/^(gpt-[5-9]|o\d)/.test(model);
// the request body for chat.completions, right for either kind of model. out: room for the visible answer; a
// reasoning model also needs room to think, so it gets more.
export function chatBody(model:string,messages:unknown[],o:{out:number;temperature?:number;effort?:'minimal'|'low'|'medium'}){
  return isReasoning(model)
    ?{model,messages,max_completion_tokens:o.out*4+400,reasoning_effort:o.effort??'low'}
    :{model,messages,max_tokens:o.out,...(o.temperature!=null?{temperature:o.temperature}:{})};
}
