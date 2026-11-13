// Whether to keep things still: the phone's "reduce motion", or the game's own setting (ui/Settings.tsx, html[data-still]).
export const still=()=>typeof document!=='undefined'&&(document.documentElement.dataset.still==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches);
