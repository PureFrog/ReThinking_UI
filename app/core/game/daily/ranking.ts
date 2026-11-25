// The daily ranking (design 6): two tabs, 투자 성과 and 일지 점수, over the ranked first runs of the same day, pack,
// quest and judge version. Until the server ranks real players these are steady example rows, always labelled; a
// practice run is shown beside them but never placed. Ties share a place.
export type DailyRow={name:string;ret:number;journal:number;me?:boolean};
const NAMES=['북극성','새벽창','반사경','망원','천칭','등대','나침반','초점','적도','자오선','은하','극광','삼각점','방위','항성','관측창','측량','성도','궤도','천정'];
export function sampleDailyRanking(dailyId:string,me:{ret:number;journal:number}|null){
  let h=0;for(const ch of dailyId)h=(h*33+ch.charCodeAt(0))>>>0;
  const rnd=()=>{h=(Math.imul(h,1103515245)+12345)>>>0;return h/4294967296};
  const rows:DailyRow[]=NAMES.map(n=>({name:'예시·'+n,ret:Math.round((rnd()*8-4)*100)/100,journal:Math.round(35+rnd()*60)}));
  return {rows:me?[...rows,{name:'나',ret:Math.round(me.ret*100)/100,journal:me.journal,me:true}]:rows,sample:true};
}
// places with ties: equal values share the higher place
export function placed(rows:DailyRow[],key:'ret'|'journal'){
  const s=[...rows].sort((a,b)=>b[key]-a[key]||(a.me?-1:b.me?1:0));
  return s.map(r=>({...r,place:s.findIndex(x=>x[key]===r[key])+1}));
}
