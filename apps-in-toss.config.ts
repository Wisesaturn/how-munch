import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔에서 앱을 등록한 뒤 확정한 appName으로 바꾼다 (등록 후 변경 불가)
  appName: 'how-munch',
  brand: {
    primaryColor: '#3182F6',
  },
  permissions: [],
  // scripts/build-ait.mjs의 next build(output: 'export') 결과
  webBundleDir: 'out',
});
