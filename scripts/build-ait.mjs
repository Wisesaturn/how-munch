/**
 * 앱인토스(.ait) 번들 빌드
 *
 * 1. 정적 export에 넣을 수 없는 경로를 .ait-stash/로 잠시 옮긴다
 * 2. NEXT_PUBLIC_BUILD_TARGET=ait로 next build(output: 'export') → out/
 *    API는 NEXT_PUBLIC_API_BASE_URL(없으면 운영 Vercel 주소)로 원격 호출한다
 * 3. ait build로 out/을 <appName>.ait로 묶는다
 * 4. 성공/실패와 관계없이 옮긴 경로를 되돌린다
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STASH_DIR = path.join(ROOT_DIR, '.ait-stash');

/** .ait에서 부를 API 서버 기본값. 미리보기 배포 등 다른 서버는 NEXT_PUBLIC_API_BASE_URL로 바꾼다 */
const DEFAULT_API_BASE_URL = 'https://how-munch.vercel.app';

/** 정적 export에서 제외할 경로 (ROOT_DIR 기준) */
const EXCLUDED_PATHS = [
  // 서버 전용: Route Handler, OAuth 콜백, proxy(미들웨어)
  'app/api',
  'app/auth',
  'proxy.ts',
  // 서버 컴포넌트에서 getUser/redirect를 하는 화면. 클라이언트 전환 후 제외 목록에서 뺀다
  'app/(main)', // #65, #66
  'app/invite', // #66
];

function stashPath(relativePath) {
  return path.join(STASH_DIR, relativePath);
}

function stashExcludedPaths() {
  for (const relativePath of EXCLUDED_PATHS) {
    const source = path.join(ROOT_DIR, relativePath);
    if (!fs.existsSync(source)) continue;

    const target = stashPath(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(source, target);
  }
}

function restoreExcludedPaths() {
  for (const relativePath of EXCLUDED_PATHS) {
    const stashed = stashPath(relativePath);
    if (!fs.existsSync(stashed)) continue;

    fs.renameSync(stashed, path.join(ROOT_DIR, relativePath));
  }
  fs.rmSync(STASH_DIR, { recursive: true, force: true });
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

if (fs.existsSync(STASH_DIR)) {
  // 이전 빌드가 강제 종료돼 남은 경우 먼저 되돌린다
  restoreExcludedPaths();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restoreExcludedPaths();
    process.exit(1);
  });
}

let exitCode = 1;
try {
  stashExcludedPaths();
  exitCode = run('next', ['build'], {
    NEXT_PUBLIC_BUILD_TARGET: 'ait',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
  });
  if (exitCode === 0) {
    exitCode = run('ait', ['build']);
  }
} finally {
  restoreExcludedPaths();
}

process.exit(exitCode);
