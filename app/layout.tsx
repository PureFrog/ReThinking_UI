import type { Metadata } from 'next';
import './globals.css';
// the app icon (tools/blender/logo.py → brand_export.py → public/brand): RT! with the sprout
export const metadata: Metadata={title:'rethinking!',description:'산 이유, 지금도 유효한가요? 내 종목을 정원으로 보고, 판단을 기록하고, 나중에 맞았는지 확인해요 · 시연판',
  icons:{icon:[{url:'/brand/favicon-32.png',sizes:'32x32',type:'image/png'},{url:'/brand/icon-192.png',sizes:'192x192',type:'image/png'}],apple:'/brand/apple-touch-icon.png'}};
// viewportFit cover: the 3D garden fills the whole phone screen and keeps its own controls clear of notches (rethink.css)
export const viewport={width:"device-width",initialScale:1,viewportFit:"cover" as const};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
