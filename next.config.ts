import type { NextConfig } from 'next';

/** 앱인토스(.ait) 번들 빌드 여부. scripts/build-ait.mjs에서 설정한다 */
const isAitBuild = process.env.NEXT_PUBLIC_AIT_BUILD === '1';

const nextConfig: NextConfig = isAitBuild
  ? {
      // .ait는 정적 파일 묶음이라 SSR/Route Handler 없이 out/으로 내보낸다
      output: 'export',
      images: { unoptimized: true },
      // /login → /login/index.html로 내보내 정적 호스팅에서 경로가 그대로 열리게 한다
      trailingSlash: true,
    }
  : {};

export default nextConfig;
