import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'마음이 자라는 정원',description:'세 친구와 함께 가꾸는 작은 투자 정원 · UI 체험판'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
