// The home screen's one next step (docs/mockups/home.html): of everything waiting today, only the most important shows,
// as one card above the tabs. Grades that came back first (the moment the game is built around), then a signal still
// waiting for a judgment, then last month's letter, then today's case; when all of that is done, the day is done.
export type NextCtx={
  due:number;                                                     // grades come back and not yet opened
  signal:{id:string;name:string;analyst:string;headline:string}|null; // the first signal without today's judgment
  letter:string|null;                                             // the month whose letter waits, as shown ("10월")
  caseOpen:boolean;                                               // today's case not answered yet
};
export type NextStep=
  |{kind:'grades';n:number}
  |{kind:'signal';id:string;name:string;analyst:string;headline:string}
  |{kind:'letter';month:string}
  |{kind:'case'}
  |{kind:'done'};
export function nextStep(c:NextCtx):NextStep{
  if(c.due>0)return {kind:'grades',n:c.due};
  if(c.signal)return {kind:'signal',...c.signal};
  if(c.letter)return {kind:'letter',month:c.letter};
  if(c.caseOpen)return {kind:'case'};
  return {kind:'done'};
}
