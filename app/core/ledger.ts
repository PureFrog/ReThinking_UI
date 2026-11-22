import {WON} from './won';
// The currency (redesign 5장: name to be decided by the team, working name in app/content/analysts.ts CURRENCY).
// Earned only by judging and reflecting, never by returns. All amounts here.
// 지기 (2026-11-16): coins for the work, the same acts as the league's process points (core/jigi/points.ts), never for
// a hit or a return — journal:3 the first save of a journal, confirm:2 a hypothesis confirmed for grading (3 a journal),
// review:3 the review after a verdict
// feedback 11-17 "코인을 좀 더 많이": about three times what it was, so a lot or a building comes within a few days
// the master account (db/migrations/008_master.sql): no invite code, no daily AI cap, coins topped up to this
export const MASTER={coins:10_000_000/* 원 (core/won.ts) */};
const EARN0={journal:10,confirm:5,review:10,judgment:5/* first judgment on a tree each day */,rebuttal:3/* answered luon's counter-argument */,
  caseAnswered:3,caseRight:5,rewind:2/* a paid practice round (core/rewind.ts, first few a day) */,rewindHit:2,grade:8/* opened a graded judgment */,cooldownWaited:5,weekDone:20/* this week's three goals (core/weekly.ts), once a week */,dayDone:10/* finished today's three (core/today.ts), once a day */};
// 원 (core/won.ts): a journal 10,000원, a finished day 10,000원, a week 20,000원
export const EARN=Object.fromEntries(Object.entries(EARN0).map(([k,v])=>[k,v*WON])) as typeof EARN0;
// 튜토리얼 끝: enough to buy a few shares of a virtual stock at real prices
export const START_GRANT=1_000_000;
// Trust per analyst (relationships.ts points and stages, renamed): what each act is worth to whom.
export const TRUST={briefing:3/* recorded a judgment on that analyst's signal */,rebuttal:2/* to luon */,hint:1,signalRight:3};
export const TRUST_LABEL=['신뢰 1','신뢰 2','신뢰 3','신뢰 4','신뢰 5'];
// what a deeper trust opens (redesign 3장: tori at 신뢰 3 opens the F-score items one by one)
export const DEEP_AT=2;
