import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'ReThink Garden',description:'내 포트폴리오를 정원으로 보고, 판단을 기록하고, 채점받는다 · 시연판'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
