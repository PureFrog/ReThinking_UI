'use client';
// 11.9 the decorate tray along the bottom: the furniture (the default palette and the pieces in the drawer) and the
// house surfaces (floors, wallpaper, yard tiles). On a phone it is a sheet folded down to its handle.
import {useState,type ReactNode} from 'react';
import {Leaf,Armchair} from 'lucide-react';
import {FLOOR_STYLES,WALL_STYLES,TILE_STYLES,EXTERIOR_STYLES,type SurfaceKind} from '../core/decorate';
import {SURFACE_ART,surfaceArt,house9,exteriorLayer} from '../scene/assets';

export type Paint={kind:SurfaceKind;style:string};
type Piece={key:string;name:string;icon:ReactNode;choose:()=>void};
const PALETTE_ICONS:Record<string,ReactNode>={'화분':<Leaf size={26}/>,'티 테이블':<Armchair size={26}/>,'러그':<span className="rug-icon"/>,'쿠션':<span className="cushion-icon"/>,'나무 벤치':<span className="bench-icon"/>};
export const paletteIcon=(name:string)=>PALETTE_ICONS[name]??<Armchair size={26}/>;
// a delivered picture shows itself in the swatch; the others show their colours
const swatch=(kind:SurfaceKind,id:string,colors:number[])=>kind!=='tile'&&(SURFACE_ART[kind] as string[]).includes(id)?{backgroundImage:`url(${surfaceArt(kind,id,'back').url})`,backgroundSize:'cover',backgroundPosition:'center'}:colors.length?{background:`repeating-linear-gradient(135deg,#${colors[0].toString(16).padStart(6,'0')} 0 7px,#${colors[1].toString(16).padStart(6,'0')} 7px 14px)`}:undefined;

export function DecorTray({pieces,full,onFull,placing,open,onToggle,onRotate,onCancel,paint,onPaint,exterior,onExterior}:{pieces:Piece[];full:(name:string)=>boolean;onFull:()=>void;placing:boolean;open:boolean;onToggle:()=>void;onRotate:()=>void;onCancel:()=>void;paint:Paint|null;onPaint:(p:Paint|null)=>void;exterior?:string;onExterior:(id:string)=>void}){
 const [tab,setTab]=useState<'furniture'|'surface'>('furniture');
 const group=(kind:SurfaceKind,title:string,styles:{id:string;name:string;colors?:number[]}[])=><div className="tray-group" role="group" aria-label={title}><strong>{title}</strong><div className="tray-row">{styles.map(s=>{const on=paint?.kind===kind&&paint.style===s.id;
  return <button key={s.id} className={'tray-cell surface-cell'+(on?' on':'')} aria-pressed={on} onClick={()=>onPaint(on?null:{kind,style:s.id})}><span className={'swatch swatch-'+kind+'-'+s.id} style={swatch(kind,s.id,s.colors??[])}/><span>{s.name}</span></button>})}</div></div>;
 return <div className={'furniture-tray'+(open?' open':'')} role="toolbar" aria-label="가구 줄">
  <button className="tray-handle" aria-expanded={open} onClick={onToggle}>가구 {open?'접기':'펼치기'}</button>
  <div className="tray-tabs" role="tablist"><button role="tab" aria-selected={tab==='furniture'} onClick={()=>{setTab('furniture');onPaint(null)}}>가구</button><button role="tab" aria-selected={tab==='surface'} onClick={()=>setTab('surface')}>집 표면</button></div>
  {tab==='furniture'?<div className="tray-items">{pieces.map(p=>{const dim=full(p.name);return <button key={p.key} className={'tray-cell'+(dim?' dim':'')} aria-disabled={dim} onClick={()=>dim?onFull():p.choose()}>{p.icon}<span>{p.name}</span></button>})}</div>
  :<div className="tray-items tray-surfaces">{group('floor','바닥',FLOOR_STYLES)}{group('wall','벽지',WALL_STYLES)}{group('tile','길·꽃밭',TILE_STYLES)}
   <div className="tray-group" role="group" aria-label="외벽"><strong>외벽</strong>{SURFACE_ART.exterior.length?<div className="tray-row">{EXTERIOR_STYLES.filter((e,i)=>!i||SURFACE_ART.exterior.includes(e.id)).map((e,i)=>{const on=(exterior??EXTERIOR_STYLES[0].id)===e.id;
    /* the outside is chosen whole: one press, no painting */return <button key={e.id} className={'tray-cell surface-cell'+(on?' on':'')} aria-pressed={on} onClick={()=>onExterior(e.id)}><span className="swatch swatch-exterior" style={{backgroundImage:`url(${house9(exteriorLayer(i?e.id:undefined,false)).url})`}}/><span>{e.name}</span></button>})}</div>:<p className="tray-note">외벽은 그림이 오면 고를 수 있어.</p>}</div></div>}
  {paint&&<div className="tray-actions"><span className="tray-note">{paint.kind==='tile'?'마당을 누르거나 끌어서 깔아.':paint.kind==='wall'?'바꿀 벽을 눌러.':'바꿀 방 바닥을 눌러.'}</span><button onClick={()=>onPaint(null)}>그만 깔기</button></div>}
  {placing&&<div className="tray-actions"><button onClick={onRotate}>돌리기 (R)</button><button onClick={onCancel}>배치 취소</button></div>}
 </div>}
