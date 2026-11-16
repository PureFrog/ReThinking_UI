// The currency (redesign 5장: name to be decided by the team, working name in app/content/analysts.ts CURRENCY).
// Earned only by judging and reflecting, never by returns. All amounts here.
// 지기 (2026-11-16): coins for the work, the same acts as the league's process points (core/jigi/points.ts), never for
// a hit or a return — journal:3 the first save of a journal, confirm:2 a hypothesis confirmed for grading (3 a journal),
// review:3 the review after a verdict
export const EARN={journal:3,confirm:2,review:3,judgment:2/* first judgment on a tree each day */,rebuttal:1/* answered luon's counter-argument */,
  caseAnswered:1,caseRight:2,rewind:1/* a paid practice round (core/rewind.ts, first few a day) */,rewindHit:1,grade:3/* opened a graded judgment */,cooldownWaited:3,weekDone:5/* this week's three goals (core/weekly.ts), once a week */,dayDone:2/* finished today's three (core/today.ts), once a day */};
// Trust per analyst (relationships.ts points and stages, renamed): what each act is worth to whom.
export const TRUST={briefing:3/* recorded a judgment on that analyst's signal */,rebuttal:2/* to luon */,hint:1,signalRight:3};
export const TRUST_LABEL=['신뢰 1','신뢰 2','신뢰 3','신뢰 4','신뢰 5'];
// what a deeper trust opens (redesign 3장: tori at 신뢰 3 opens the F-score items one by one)
export const DEEP_AT=2;
