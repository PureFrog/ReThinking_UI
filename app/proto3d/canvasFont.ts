// Canvas words in the app's web font (피드백 2026-11-25 "왜 자꾸 글씨 깨져"): Korean web fonts arrive in slices by
// character, so loading the face alone leaves some letters in the fallback font ("가상" round, "종목" plain).
// Ask for exactly the letters drawn, and paint again when they are in (and once more after any later font load).
export function whenFont(font:string,text:string,repaint:()=>void){
  if(typeof document==='undefined'||!document.fonts)return;
  let done=false;const go=()=>{if(!done&&document.fonts.check(font,text)){done=true;repaint()}};
  document.fonts.load(font,text).then(()=>{repaint();done=document.fonts.check(font,text)}).catch(()=>{});
  document.fonts.addEventListener?.('loadingdone',go,{once:false});
  setTimeout(()=>document.fonts.removeEventListener?.('loadingdone',go),15000);
}
