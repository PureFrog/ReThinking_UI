// Which implementation each port uses on the content server (design 7): live when its settings are present, the
// fixture otherwise — so a pack can be built today with no key, and each source turns live alone once its contract and
// key exist. The report says which were live.
import type {Ctx,Providers} from '../../core/content/ports';
import {secFilings,secHoldings} from '../../core/content/live/sec';
import {policyFeed,registryPhilosophy,vendorActions,vendorMacro,vendorNews,vendorPrices} from '../../core/content/live/vendors';
import {openAiCompatible} from '../../core/content/live/llm';
import {fixtureProviders} from './solbit-sources';
export function providersFor(ctx:Ctx):{providers:Providers;live:Record<keyof Providers,boolean>}{
  const fx=fixtureProviders(),has=(...k:string[])=>k.every(x=>!!ctx.env(x));
  const live={filings:has('SEC_USER_AGENT'),holdings:has('SEC_USER_AGENT'),prices:has('MARKET_DATA_URL','MARKET_DATA_KEY'),actions:has('CORPORATE_ACTIONS_URL','CORPORATE_ACTIONS_KEY'),
    news:has('NEWS_API_URL','NEWS_API_KEY'),macro:has('MACRO_API_URL','MACRO_API_KEY'),policy:has('POLICY_SOURCE_URL'),philosophy:has('SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'),llm:has('LLM_API_KEY')};
  return {live,providers:{
    filings:live.filings?secFilings(ctx):fx.filings,holdings:live.holdings?secHoldings(ctx):fx.holdings,prices:live.prices?vendorPrices(ctx):fx.prices,
    actions:live.actions?vendorActions(ctx):fx.actions,news:live.news?vendorNews(ctx):fx.news,macro:live.macro?vendorMacro(ctx):fx.macro,
    policy:live.policy?policyFeed(ctx):fx.policy,philosophy:live.philosophy?registryPhilosophy(ctx):fx.philosophy,llm:live.llm?openAiCompatible(ctx):fx.llm}};
}
