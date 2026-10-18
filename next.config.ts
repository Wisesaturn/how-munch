import type { NextConfig } from 'next';

import { API_BASE_URL } from '@/commons/config/api';
import { BUILD_TARGET, BUILD_TARGETS, IS_AIT_BUILD } from '@/commons/config/build';

// 잘못 적은 값이 조용히 web 빌드가 되지 않도록 빌드 시점에 멈춘다
if (!BUILD_TARGETS.includes(BUILD_TARGET)) {
  throw new Error(
    `NEXT_PUBLIC_BUILD_TARGET="${BUILD_TARGET}"은 허용하지 않는 값입니다. 허용: ${BUILD_TARGETS.join(', ')}`,
  );
}

// .ait 화면은 tossmini 도메인에서 열려 상대 경로 /api/*가 닿지 않는다
if (IS_AIT_BUILD && !API_BASE_URL) {
  throw new Error('ait 빌드에는 NEXT_PUBLIC_API_BASE_URL(API 서버 주소)이 필요합니다');
}

const nextConfig: NextConfig = IS_AIT_BUILD
  ? {
      // .ait는 정적 파일 묶음이라 SSR/Route Handler 없이 out/으로 내보낸다
      output: 'export',
      images: { unoptimized: true },
      // /login → /login/index.html로 내보내 정적 호스팅에서 경로가 그대로 열리게 한다
      trailingSlash: true,
    }
  : {};

export default nextConfig;
