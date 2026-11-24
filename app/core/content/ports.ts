// The content side of 오늘의 관측소 (daily_quest_design v1, 7장): every outside source sits behind one port, and each
// port has a fixture and a live implementation with the same contract. Daily play never calls these — it reads checked,
// version-fixed packs. Only the content tools (tools/content) and the editor call them, on the server, with keys from
// the server's secrets; the browser never sees a provider key or a raw response.
// Times: eventAt (when it happened), publishedAt (when anyone could know it), fetchedAt (when we got it) stay apart;
// a scene may show only what was published by its asOf (pipeline.ts).

export type Ctx={fetch:typeof fetch;env:(key:string)=>string|undefined;now:()=>number;sleep?:(ms:number)=>Promise<void>};
export type License='public'|'licensed'|'metadata-only'|'unknown';
// one piece of evidence as fetched: what it is, where from, when it was knowable, and its hash (original kept by id)
export type SourceRef={sourceId:string;kind:'filing'|'holding'|'price'|'action'|'news'|'macro'|'policy'|'letter';
  title:string;publisher:string|null;url:string|null;eventAt:string|null;publishedAt:string;fetchedAt:string;version:number;license:License;hash:string};

// ── filings (SEC submissions + companyfacts; FilingsProvider · SEC_USER_AGENT) ─────────────────────────────────────
// a fact as reported in one filing: later restatements are other facts with a later filedAt, never overwriting this one
export type FilingFact={concept:string;label:string;unit:string;value:number;start:string|null;end:string;fy:number|null;fp:string|null;
  form:string;accession:string;filedAt:string;kind:'actual'|'estimate'};
export type Filing={accession:string;form:string;filedAt:string;acceptedAt:string|null;periodEnd:string|null;issuerCik:string;url:string;amendment:boolean};
export interface FilingsProvider{readonly id:string;
  filings(q:{cik:string;forms?:string[];asOf:string}):Promise<Filing[]>;
  facts(q:{cik:string;concepts:string[];asOf:string}):Promise<FilingFact[]>}

// ── 13F holdings (HoldingsProvider · SEC_USER_AGENT) ───────────────────────────────────────────────────────────────
// joined to an instrument by CUSIP only (never by issuer name); value in dollars (13F reported thousands before 2023)
export type Holding13F={managerCik:string;quarter:string;accession:string;filedAt:string;amendment:boolean;amendmentType:'RESTATEMENT'|'NEW HOLDINGS'|null;
  issuer:string;securityClass:string;cusip:string;shares:number;shareType:'SH'|'PRN';valueUsd:number;putCall:'PUT'|'CALL'|null};
export interface HoldingsProvider{readonly id:string;holdings(q:{managerCik:string;quarter:string}):Promise<Holding13F[]>}

// ── prices, corporate actions (PricesProvider · MARKET_DATA_KEY, ActionsProvider · CORPORATE_ACTIONS_KEY) ──────────
export type DayBar={d:string;o:number;h:number;l:number;c:number;v:number};
// raw (unadjusted) bars only: splits and dividends come from the actions ledger, applied once (pipeline.ts)
export type PriceSeries={instrumentId:string;exchange:string;currency:string;session:'regular';adjusted:boolean;bars:DayBar[]};
export type CorporateAction={instrumentId:string;kind:'split'|'dividend';exDate:string;payDate:string|null;ratio:number|null;amount:number|null;currency:string|null};
export interface PricesProvider{readonly id:string;series(q:{instrumentId:string;exchange:string;from:string;to:string}):Promise<PriceSeries>}
export interface ActionsProvider{readonly id:string;actions(q:{instrumentId:string;from:string;to:string}):Promise<CorporateAction[]>}

// ── news, macro, policy (NewsProvider · NEWS_API_KEY, MacroProvider · MACRO_API_KEY, PolicyProvider · POLICY_SOURCE_URL)
// news without a body licence keeps title and metadata only; reprints of one story point at it (dupOf)
// summary: the publisher's own excerpt from its feed (RSS <description>, an API's summary field), plain text, cut short
// (core/content/live/rss.ts excerpt). Shown under the headline (사용자 결정 2026-11-22); the body is never kept without
// a licence. null when the feed gives none.
export type NewsItem={id:string;title:string;publisher:string;publishedAt:string;updatedAt:string|null;url:string;usage:'metadata-only'|'full';entities:string[];dupOf:string|null;summary?:string|null};
// a value as first released (vintage): later revisions are other points, never written over it
export type MacroPoint={series:string;period:string;value:number;unit:string;vintage:string;releasedAt:string};
export type PolicyEvent={id:string;jurisdiction:string;title:string;stage:'proposed'|'final';announcedAt:string;effectiveAt:string|null;docUrl:string;sectors:string[]};
export interface NewsProvider{readonly id:string;search(q:{entity:string;since:string;until:string;cursor?:string|null}):Promise<{items:NewsItem[];cursor:string|null}>}
export interface MacroProvider{readonly id:string;series(q:{series:string;asOf:string}):Promise<MacroPoint[]>}
export interface PolicyProvider{readonly id:string;events(q:{jurisdiction:string;from:string;to:string}):Promise<PolicyEvent[]>}

// ── the master and the principle (PhilosophySource / PortraitStore) ────────────────────────────────────────────────
// a portrait whose rights are not checked is never shown: the name's monogram stands in. The master's own words and
// our explanation are kept apart (quote vs explanationKo).
export type Portrait={assetId:string;uri:string;author:string;license:string;rightsChecked:boolean;alt:string};
export type Mentor={mentorId:string;name:string;nameKo:string;real:boolean;bioKo:string;portrait:Portrait|null};
export type Principle={principleId:string;mentorId:string;statementKo:string;problemKo:string;whyKo:string;appliesKo:string;breaksKo:string;
  source:{title:string;locator:string;publishedAt:string;url:string|null;quote:string|null};
  contextKo:string;premises:string[];counterexamples:string[];misuses:string[];terms:{word:string;meaning:string}[];keys:string[];
  demo:{fact:string;line:string;how:string}};
export interface PhilosophySource{readonly id:string;mentor(id:string):Promise<Mentor|null>;principles(mentorId:string):Promise<Principle[]>}

// ── the model (LLMProvider · LLM_BASE_URL, LLM_API_KEY, MODEL_*) ──────────────────────────────────────────────────
// each task has its own model, schema and validator (llm-tasks.ts); a reply that fails its validator is never used
export type LlmTask='editor-cards'|'extract'|'hint'|'toulmin'|'explain';
export type LlmReply<T>={json:T;model:string;usage:{input:number;output:number};ms:number};
export interface LLMProvider{readonly id:string;run<T>(task:LlmTask,schemaVersion:string,payload:unknown,schema:Record<string,unknown>,system:string):Promise<LlmReply<T>>}

export type Providers={filings:FilingsProvider;holdings:HoldingsProvider;prices:PricesProvider;actions:ActionsProvider;news:NewsProvider;
  macro:MacroProvider;policy:PolicyProvider;philosophy:PhilosophySource;llm:LLMProvider};
export class ProviderError extends Error{constructor(readonly provider:string,readonly code:'config'|'http'|'shape'|'rate'|'timeout'|'missing',message:string){super(`${provider}: ${message}`)}}
