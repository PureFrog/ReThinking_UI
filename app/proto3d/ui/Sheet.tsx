'use client';
// The one panel shape every feature opens in: right side on desktop, bottom sheet on phones (rethink.css .rt-sheet).
import {useEffect,useRef,type ReactNode} from 'react';
import {Cross} from './Icons';
import {cue} from '../../core/sound';
// compact: a short sheet that leaves most of the garden in view (the root cut-away, the capsule)
export function Sheet({kicker,title,onClose,children,foot,label,compact}:{kicker:string;title:string;onClose:()=>void;children:ReactNode;foot?:ReactNode;label?:string;compact?:boolean}){
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{cue('panel-open');return()=>cue('panel-close')},[]);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};addEventListener('keydown',k);ref.current?.focus();return()=>removeEventListener('keydown',k)},[onClose]);
  return <section ref={ref} tabIndex={-1} role="dialog" aria-label={label??title} className={`rt-sheet${compact?" compact":""}`} onPointerDown={e=>e.stopPropagation()}>
    <header className="rt-sheet-head">
      <div><div className="rt-kicker">{kicker}</div><h2>{title}</h2></div>
      <button type="button" className="rt-close" aria-label="닫기" onClick={onClose}><Cross size={20}/></button>
    </header>
    <div className="rt-sheet-body">{children}</div>
    {foot&&<footer className="rt-sheet-foot">{foot}</footer>}
  </section>;
}
export const Face=({id,name,sm}:{id:string;name:string;sm?:boolean})=><span className={`rt-face ${id}${sm?' sm':''}`} aria-hidden>{name[0]}</span>;
export const pct=(n:number)=>`${n>0?'+':''}${n}%`;
// a figure set like a printed table (D3): the digits in full, the sign and the unit small beside them
export const Num=({v,unit='%'}:{v:number;unit?:string})=><><span className="rt-sign">{v>0?'+':v<0?'-':''}</span>{Math.abs(v)}<span className="rt-unit">{unit}</span></>;
// A line one of the analysts says, with their face in front (not a quote: the face says who is talking)
export const Said=({id,name,children,style}:{id:string;name:string;children:ReactNode;style?:React.CSSProperties})=>
  <p className="rt-said" style={style}><span className={`rt-face ${id} sm`} aria-label={name}>{name[0]}</span><span>{children}</span></p>;
