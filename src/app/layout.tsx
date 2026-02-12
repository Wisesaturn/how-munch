import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'How Munch',
  description: 'How Munch',
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
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)]">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
