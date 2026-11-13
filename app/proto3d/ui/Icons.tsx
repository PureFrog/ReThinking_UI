// The garden's own icons (docs/brief-design.md D3, direction A 현장 노트): drawn like a fine pen in a field notebook.
// One 24-unit grid, 1.5 lines with round ends, a little wobble where a hand would make one; things from the garden
// and the desk (a loupe, a specimen box, an hourglass, a ledger, a drawer, a ribbon, a telescope), not app chrome.
// Same props as the lucide icons they replace (size), so they drop in.
import type {SVGProps} from 'react';
type P={size?:number}&Omit<SVGProps<SVGSVGElement>,'children'>;
const Svg=({size=20,children,...r}:P&{children:React.ReactNode})=>
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rt-icon" {...r}>{children}</svg>;

// 브리핑: a loupe over a leaf
export const Loupe=(p:P)=><Svg {...p}><circle cx="10" cy="10" r="6.2"/><path d="M14.6 14.7l5.2 5.1"/><path d="M7.4 12.2c.4-2.6 2-4.4 4.6-4.9-.3 2.7-2 4.5-4.6 4.9z"/><path d="M7.4 12.2l2.2-2.3"/></Svg>;
// 케이스: a specimen box with its label
export const Specimen=(p:P)=><Svg {...p}><path d="M3.6 6.3h16.8v12.4H3.6z"/><path d="M3.6 9.2h16.8"/><path d="M9 13h6.1v3H9z"/><path d="M11.9 4.2l.1 2"/></Svg>;
// 되감기: an hourglass turned over
export const Hourglass=(p:P)=><Svg {...p}><path d="M6.4 3.6h11.2M6.4 20.4h11.2"/><path d="M7.5 3.8c0 4.4 4.4 5.6 4.5 8.2.1-2.6 4.5-3.8 4.5-8.2"/><path d="M7.5 20.2c0-4.4 4.4-5.6 4.5-8.2.1 2.6 4.5 3.8 4.5 8.2"/><path d="M9.6 19.2c.8-1.3 3.9-1.3 4.8 0"/></Svg>;
// 기록: a ledger, open, with a ribbon marker
export const Ledger=(p:P)=><Svg {...p}><path d="M12 6.2c-2.4-1.6-5.6-1.8-8.4-1v13.4c2.8-.8 6-.6 8.4 1 2.4-1.6 5.6-1.8 8.4-1V5.2c-2.8-.8-6-.6-8.4 1z"/><path d="M12 6.2v13.4"/><path d="M6 9.4h3.6M6 12.2h3.6M14.4 9.4H18"/><path d="M16 12.4v4.2l1-1 1 1v-4.2"/></Svg>;
// 서랍: a wooden drawer pulled out a little
export const Drawer=(p:P)=><Svg {...p}><path d="M3.8 5h16.4v6H3.8z"/><path d="M4.6 11.1l-1 7.9h16.8l-1-7.9"/><path d="M10 7.9h4"/><path d="M10 15.1h4"/></Svg>;
// 리그: a rosette ribbon
export const Rosette=(p:P)=><Svg {...p}><circle cx="12" cy="9" r="5.2"/><circle cx="12" cy="9" r="2.2"/><path d="M9.2 13.4l-1.8 7 2.6-1.5 1.5 2.3 1-5.6"/><path d="M14.8 13.4l1.8 7-2.6-1.5-1.5 2.3"/></Svg>;
// 모의투자: the observatory's telescope on its legs
export const Scope=(p:P)=><Svg {...p}><path d="M4.2 11.6l12.6-6.3 1.6 3.4-12.4 6.6z"/><path d="M16.8 5.3l1.6-.8 1.7 3.4-1.7.8"/><path d="M11 12.6l-3.6 8M12.4 12.2l3.8 8.2M11.7 12.4v8.2"/></Svg>;
// 소리 켬·끔: a small horn with the sound, or crossed out
export const Sound=(p:P)=><Svg {...p}><path d="M4 9.6h3.4l5-4v12.8l-5-4H4z"/><path d="M15.6 9.2c1.1 1.6 1.1 4 0 5.6M18 7c2.2 3 2.2 7 0 10"/></Svg>;
export const Mute=(p:P)=><Svg {...p}><path d="M4 9.6h3.4l5-4v12.8l-5-4H4z"/><path d="M15.8 9.6l4.6 4.8M20.4 9.6l-4.6 4.8"/></Svg>;
// 내 위치로: a survey pin
export const Pin=(p:P)=><Svg {...p}><path d="M12 21c-3.6-4.6-5.8-7.8-5.8-10.6a5.8 5.8 0 0111.6 0c0 2.8-2.2 6-5.8 10.6z"/><circle cx="12" cy="10.3" r="2.1"/></Svg>;
// 닫기: two crossed strokes, drawn rather than ruled
export const Cross=(p:P)=><Svg {...p}><path d="M6.4 6.2c3.6 3.7 7.6 7.7 11.2 11.5M17.6 6.3c-3.8 3.6-7.6 7.6-11.2 11.4"/></Svg>;
// small ones in the sheets
export const Lens=(p:P)=><Svg {...p}><path d="M4 8.2h3.2l1.6-2.4h6.4l1.6 2.4H20v10.4H4z"/><circle cx="12" cy="13.1" r="3.4"/></Svg>;
export const Plus=(p:P)=><Svg {...p}><path d="M12 5.4v13.2M5.4 12h13.2"/></Svg>;
export const Strike=(p:P)=><Svg {...p}><path d="M5 7.2h14M9.6 7V4.8h4.8V7"/><path d="M6.6 7.4l.9 12.2h9l.9-12.2"/></Svg>;
export const Bulb=(p:P)=><Svg {...p}><path d="M9 17.4h6M9.8 20.2h4.4"/><path d="M8.9 14.6C7.1 13.3 6 11.4 6 9.3a6 6 0 0112 0c0 2.1-1.1 4-2.9 5.3l-.4 2.8H9.3z"/></Svg>;
export const Lock=(p:P)=><Svg {...p}><path d="M5.6 10.6h12.8v9.6H5.6z"/><path d="M8.4 10.4V7.6a3.6 3.6 0 017.2 0v2.8"/><path d="M12 14.2v2.4"/></Svg>;
// 기울이기: a phone leaning, with the arc it swings through
export const Tilt=(p:P)=><Svg {...p}><path d="M9.2 4.4l6.4 1.6-3.6 14.2-6.4-1.6z"/><path d="M10.6 17.6l1.4.4"/><path d="M18.6 9.4c1.4 1.8 1.6 4.2.6 6.2M4.6 8.2c-1.2 1.6-1.4 3.6-.8 5.4"/></Svg>;
