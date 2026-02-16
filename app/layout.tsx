import type { Metadata, Viewport } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'How Munch',
  description: 'How Munch',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
      </head>
      <body className="antialiased">
        <div className="relative mx-auto min-h-dvh w-full overflow-hidden bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)] md:max-w-[430px]">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
