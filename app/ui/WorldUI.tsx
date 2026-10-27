'use client';
import type {HTMLAttributes} from 'react';
export function SpeechBubble(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'npc-bubble '+(p.className??'')}/>}
export function SideMenu(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'npc-choices '+(p.className??'')}/>}
export function InfoCard(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'world-info '+(p.className??'')}/>}
export function ObjectPanel(p:HTMLAttributes<HTMLElement>){return <section {...p} role="dialog" aria-modal="true"/>}
export function ConfirmDialog(p:HTMLAttributes<HTMLDivElement>){return <div {...p} role="alertdialog" aria-modal="true" className="confirm-dialog"/>}
