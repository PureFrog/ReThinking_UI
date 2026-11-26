// What I did today (for 오늘 퀘스트, core/today.ts): a small list kept on this device per day. Things the save already
// knows (the quiz, a journal, a cast) are read from the save; the rest are marked here when they happen.
const key=(day:string)=>'rethink-did-'+day;
export function didList(day:string):string[]{try{return JSON.parse(localStorage.getItem(key(day))??'[]')}catch{return []}}
export function markDid(day:string,id:string){try{const l=didList(day);if(l.includes(id))return;localStorage.setItem(key(day),JSON.stringify([...l,id]));
  window.dispatchEvent(new CustomEvent('rt-did',{detail:id}))}catch{/* no storage: this visit only */}}
