import type { Metadata, Viewport } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: '얼마먹었니',
  description: '장보기, 냉장고, 식단 올인원 관리 서비스',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-57x57.png', sizes: '57x57' },
      { url: '/apple-icon-60x60.png', sizes: '60x60' },
      { url: '/apple-icon-72x72.png', sizes: '72x72' },
      { url: '/apple-icon-76x76.png', sizes: '76x76' },
      { url: '/apple-icon-114x114.png', sizes: '114x114' },
      { url: '/apple-icon-120x120.png', sizes: '120x120' },
      { url: '/apple-icon-144x144.png', sizes: '144x144' },
      { url: '/apple-icon-152x152.png', sizes: '152x152' },
      { url: '/apple-icon-180x180.png', sizes: '180x180' },
    ],
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': '/ms-icon-144x144.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '얼마먹었니',
    startupImage: [
      // ── iPhone Portrait ──────────────────────────────────────────────
      // iPhone 17 Pro Max, 16 Pro Max
      {
        url: '/splash/apple-splash-1320-2868.png',
        media:
          'screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 17 Pro, 17, 16 Pro
      {
        url: '/splash/apple-splash-1206-2622.png',
        media:
          'screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max
      {
        url: '/splash/apple-splash-1290-2796.png',
        media:
          'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone Air
      {
        url: '/splash/apple-splash-1260-2736.png',
        media:
          'screen and (device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 16, 15 Pro, 15, 14 Pro
      {
        url: '/splash/apple-splash-1179-2556.png',
        media:
          'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
      {
        url: '/splash/apple-splash-1284-2778.png',
        media:
          'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 16e, 14, 13 Pro, 13, 12 Pro, 12
      {
        url: '/splash/apple-splash-1170-2532.png',
        media:
          'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 13 mini, 12 mini, 11 Pro, XS, X
      {
        url: '/splash/apple-splash-1125-2436.png',
        media:
          'screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 11 Pro Max, XS Max
      {
        url: '/splash/apple-splash-1242-2688.png',
        media:
          'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 11, XR
      {
        url: '/splash/apple-splash-828-1792.png',
        media:
          'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
      {
        url: '/splash/apple-splash-1242-2208.png',
        media:
          'screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 8, 7, 6s, 6, 4.7" SE
      {
        url: '/splash/apple-splash-750-1334.png',
        media:
          'screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPhone SE (4"), iPod touch 5th gen+
      {
        url: '/splash/apple-splash-640-1136.png',
        media:
          'screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // ── iPad Portrait ────────────────────────────────────────────────
      // iPad Pro 13" M4
      {
        url: '/splash/apple-splash-2064-2752.png',
        media:
          'screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 12.9"
      {
        url: '/splash/apple-splash-2048-2732.png',
        media:
          'screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 11" M4
      {
        url: '/splash/apple-splash-1668-2420.png',
        media:
          'screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 11", 10.5" iPad Pro
      {
        url: '/splash/apple-splash-1668-2388.png',
        media:
          'screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Air 10.9"
      {
        url: '/splash/apple-splash-1640-2360.png',
        media:
          'screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Air 10.5"
      {
        url: '/splash/apple-splash-1668-2224.png',
        media:
          'screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad 10.2"
      {
        url: '/splash/apple-splash-1620-2160.png',
        media:
          'screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad 9.7", iPad Pro 9.7", iPad mini 7.9", iPad Air 9.7"
      {
        url: '/splash/apple-splash-1536-2048.png',
        media:
          'screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad mini 8.3"
      {
        url: '/splash/apple-splash-1488-2266.png',
        media:
          'screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // ── iPhone Landscape ─────────────────────────────────────────────
      // iPhone 17 Pro Max, 16 Pro Max
      {
        url: '/splash/apple-splash-2868-1320.png',
        media:
          'screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 17 Pro, 17, 16 Pro
      {
        url: '/splash/apple-splash-2622-1206.png',
        media:
          'screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max
      {
        url: '/splash/apple-splash-2796-1290.png',
        media:
          'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone Air
      {
        url: '/splash/apple-splash-2736-1260.png',
        media:
          'screen and (device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 16, 15 Pro, 15, 14 Pro
      {
        url: '/splash/apple-splash-2556-1179.png',
        media:
          'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
      {
        url: '/splash/apple-splash-2778-1284.png',
        media:
          'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 16e, 14, 13 Pro, 13, 12 Pro, 12
      {
        url: '/splash/apple-splash-2532-1170.png',
        media:
          'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 13 mini, 12 mini, 11 Pro, XS, X
      {
        url: '/splash/apple-splash-2436-1125.png',
        media:
          'screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 11 Pro Max, XS Max
      {
        url: '/splash/apple-splash-2688-1242.png',
        media:
          'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 11, XR
      {
        url: '/splash/apple-splash-1792-828.png',
        media:
          'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
      {
        url: '/splash/apple-splash-2208-1242.png',
        media:
          'screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
      // iPhone 8, 7, 6s, 6, 4.7" SE
      {
        url: '/splash/apple-splash-1334-750.png',
        media:
          'screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPhone SE (4"), iPod touch 5th gen+
      {
        url: '/splash/apple-splash-1136-640.png',
        media:
          'screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // ── iPad Landscape ───────────────────────────────────────────────
      // iPad Pro 13" M4
      {
        url: '/splash/apple-splash-2752-2064.png',
        media:
          'screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Pro 12.9"
      {
        url: '/splash/apple-splash-2732-2048.png',
        media:
          'screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Pro 11" M4
      {
        url: '/splash/apple-splash-2420-1668.png',
        media:
          'screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Pro 11", 10.5" iPad Pro
      {
        url: '/splash/apple-splash-2388-1668.png',
        media:
          'screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Air 10.9"
      {
        url: '/splash/apple-splash-2360-1640.png',
        media:
          'screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad Air 10.5"
      {
        url: '/splash/apple-splash-2224-1668.png',
        media:
          'screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad 10.2"
      {
        url: '/splash/apple-splash-2160-1620.png',
        media:
          'screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad 9.7", iPad Pro 9.7", iPad mini 7.9", iPad Air 9.7"
      {
        url: '/splash/apple-splash-2048-1536.png',
        media:
          'screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
      // iPad mini 8.3"
      {
        url: '/splash/apple-splash-2266-1488.png',
        media:
          'screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/toss/tossface/dist/tossface.css"
        />
      </head>
      <body className="antialiased">
        <div className="relative mx-auto min-h-dvh w-full overflow-hidden bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)] md:max-w-[430px]">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
