'use client';
// The one panel shape every feature opens in: right side on desktop, bottom sheet on phones (rethink.css .rt-sheet).
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export function Sheet({kicker,title,onClose,children,foot,label}:{kicker:string;title:string;onClose:()=>void;children:ReactNode;foot?:ReactNode;label?:string}){
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};addEventListener('keydown',k);ref.current?.focus();return()=>removeEventListener('keydown',k)},[onClose]);
  return <section ref={ref} tabIndex={-1} role="dialog" aria-label={label??title} className="rt-sheet" onPointerDown={e=>e.stopPropagation()}>
    <header className="rt-sheet-head">
      <div><div className="rt-kicker">{kicker}</div><h2>{title}</h2></div>
      <button type="button" className="rt-close" aria-label="닫기" onClick={onClose}><X size={20}/></button>
    </header>
    <div className="rt-sheet-body">{children}</div>
    {foot&&<footer className="rt-sheet-foot">{foot}</footer>}
  </section>;
}
export const Face=({id,name,sm}:{id:string;name:string;sm?:boolean})=><span className={`rt-face ${id}${sm?' sm':''}`} aria-hidden>{name[0]}</span>;
export const pct=(n:number)=>`${n>0?'+':''}${n}%`;
