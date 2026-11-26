// 날씨·시간 고르기 (피드백 2026-11-26 "설정에서 날씨랑 시간을 고를 수 있어야"): kept on this device. 'auto' follows the
// market (weather) and the clock (time); the address words ?weather= and ?hour= still win (screens and tests).
export type ViewWeather='auto'|'clear'|'cloudy'|'storm'|'heat';
export type ViewHour='auto'|'8'|'13'|'18'|'22';
const get=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
export const viewWeather=():ViewWeather=>(get('rethink-view-weather') as ViewWeather|null)??'auto';
export const viewHour=():ViewHour=>(get('rethink-view-hour') as ViewHour|null)??'auto';
export function setView(k:'weather'|'hour',v:string){try{if(v==='auto')localStorage.removeItem('rethink-view-'+k);else localStorage.setItem('rethink-view-'+k,v)}catch{/* this visit */}
  window.dispatchEvent(new CustomEvent('rt-view'))}
