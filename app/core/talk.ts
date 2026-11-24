// 피드백 2026-11-22 (UI 피드백): a talk bubble holds one or two sentences. A long line is shown as several bubbles in a
// row: sentences end at . ! ? … (followed by a space), and a bubble takes a second sentence only while it stays short.
export const TALK={maxLen:58,perPage:2};
export function sentencesOf(text:string):string[]{
  return text.trim().split(/(?<=[.!?…~])\s+/).map(s=>s.trim()).filter(Boolean);
}
export function pagesOf(text:string,o=TALK):string[]{
  const out:string[]=[];let cur:string[]=[];
  for(const s of sentencesOf(text)){
    const joined=[...cur,s].join(' ');
    if(cur.length&&(cur.length>=o.perPage||joined.length>o.maxLen)){out.push(cur.join(' '));cur=[s]}else cur.push(s);
  }
  if(cur.length)out.push(cur.join(' '));
  return out.length?out:[''];
}
